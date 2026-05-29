import random
import datetime
import pandas as pd
from datasets import Dataset, DatasetDict
from transformers import (
    AutoTokenizer,
    BertForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification,
)
import torch
import numpy as np
from sklearn.metrics import accuracy_score
import re

# ---------- Синонимы заголовков ----------
HEADER_SYNONYMS = {
    "operation_date": ["Дата операции", "Дата транзакции", "Дата", "Дата совершения"],
    "posting_date": ["Дата платежа", "Дата обработки"],
    "time": ["Время", "Время операции"],
    "account": ["Номер карты", "Счет", "Карта", "Номер счёта", "Счёт"],
    "amount": ["Сумма операции", "Сумма", "Сумма платежа", "Сумма в валюте операции"],
    "currency": ["Валюта операции", "Валюта платежа", "Валюта"],
    "cashback": ["Кэшбэк", "Бонусы", "Бонусы (включая кэшбэк)", "Спасибо", "Бонусы Спасибо"],
    "category": ["Категория", "Тип операции", "МСС", "MCC"],
    "description": ["Описание", "Назначение", "Детали"],
    "status": ["Статус", "Состояние"],
}

CATEGORIES = [
    "Супермаркеты", "Рестораны", "Транспорт", "Связь", "Медицина",
    "Аптеки", "Кафе", "Развлечения", "Шопинг", "Красота",
    "Образование", "Домашние животные", "Дети", "Подарки", "Штрафы"
]
MCC_CODES = ["5411", "5812", "6011", "4814", "5912", "5944", "7997"]
DESCRIPTIONS = [
    "Пятёрочка", "Перекрёсток", "АЗС Лукойл", "Макдоналдс",
    "Яндекс.Такси", "МТС", "Аптека Апрель", "Кофе Хауз",
    "Хлебница", "Wildberries", "Ozon", "Золотое Яблоко",
    "Skillbox", "Четыре Лапы", "Детский Мир", "Flowwow",
    "Штраф ГИБДД", "Магнит 3", "Перевод на карту"
]


# ---------- Генерация одного примера ----------
def generate_example():
    use_fields = {
        "operation_date": True,
        "posting_date": random.random() < 0.5,
        "time": random.random() < 0.6,
        "account": True,
        "amount": True,
        "currency": random.random() < 0.8,
        "cashback": random.random() < 0.4,
        "category": random.random() < 0.9,
        "description": random.random() < 0.85,
        "status": False,  # не извлекаем, но может быть для реалистичности
    }

    base_date = datetime.date(2026, 1, 1) + datetime.timedelta(days=random.randint(0, 365))
    op_date_str = base_date.strftime(random.choice(["%d.%m.%Y", "%d/%m/%Y", "%Y-%m-%d"]))
    posting_date_str = (base_date + datetime.timedelta(days=random.randint(0, 3))).strftime(
        random.choice(["%d.%m.%Y", "%d/%m/%Y", "%Y-%m-%d"])
    )
    time_str = f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}:{random.randint(0, 59):02d}" if random.random() < 0.5 else f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}"

    # Сумма
    if random.random() < 0.8:
        amount = round(random.uniform(10, 15000), 2)
    else:
        amount = -round(random.uniform(10, 5000), 2)
    amount_str = f"{amount:,.2f}".replace(",", " ") if random.random() < 0.3 else f"{amount:.2f}"
    amount_str = amount_str.replace(".", random.choice([".", ","]))

    currency = "RUB" if random.random() < 0.9 else random.choice(["USD", "EUR"])
    account = f"*{random.randint(1000, 9999)}"

    category_text = random.choice(CATEGORIES) if random.random() < 0.7 else ""
    mcc = random.choice(MCC_CODES) if random.random() < 0.6 else ""
    description = random.choice(DESCRIPTIONS) if use_fields["description"] else ""
    cashback_str = ""
    if use_fields["cashback"]:
        cashback_val = round(random.uniform(1, 500), 2)
        cashback_str = f"{cashback_val:.2f}".replace(".", random.choice([".", ","]))

    # Собираем пары ключ-значение (только те, что используются)
    pairs = []
    if use_fields["operation_date"]:
        pairs.append(("operation_date", op_date_str))
    if use_fields["posting_date"]:
        pairs.append(("posting_date", posting_date_str))
    if use_fields["time"]:
        pairs.append(("time", time_str))
    if use_fields["account"]:
        pairs.append(("account", account))
    if use_fields["amount"]:
        pairs.append(("amount", amount_str))
    if use_fields["currency"]:
        pairs.append(("currency", currency))
    if use_fields["cashback"] and cashback_str:
        pairs.append(("cashback", cashback_str))
    if category_text:
        pairs.append(("category", category_text))
    if mcc:
        pairs.append(("mcc", mcc))
    if use_fields["description"] and description:
        pairs.append(("description", description))
    if use_fields["status"]:
        pairs.append(("status", random.choice(["Обработано", "В обработке", ""])))

    # Перемешиваем столбцы
    random.shuffle(pairs)

    # Формируем заголовки и значения
    headers = []
    values = []
    for key, val in pairs:
        header = random.choice(HEADER_SYNONYMS.get(key, [key]))
        headers.append(header)
        values.append(val)

    separator = "\t"
    header_line = separator.join(headers)
    value_line = separator.join(values)
    text = header_line + "\n" + value_line

    # Вычисляем позиции сущностей
    entities = []
    search_start = 0
    for idx, val in enumerate(values):
        pos = value_line.find(val, search_start)
        if pos == -1:
            continue
        start = len(header_line) + 1 + pos
        end = start + len(val)
        key = pairs[idx][0]
        if key == "mcc":
            label = "MCC"
        else:
            label = key.upper()
        entities.append({"start": start, "end": end, "label": label})
        search_start = pos + len(val)

    return {"text": text, "entities": entities}


# Генерация датасета
dataset = [generate_example() for _ in range(5000)]
df = pd.DataFrame(dataset)
df.to_csv("receipts_synthetic.csv", index=False)

# ---------- Подготовка меток ----------
all_labels = set()
for ex in dataset:
    for ent in ex["entities"]:
        all_labels.add(ent["label"])
# Добавляем I- версии для всех не-О меток
final_labels = set(all_labels)
for label in all_labels:
    if label != "O":
        final_labels.add(f"I-{label}")
label_list = sorted(list(final_labels))
label2id = {l: i for i, l in enumerate(label_list)}
id2label = {i: l for l, i in label2id.items()}
print("Метки:", label_list)

# ---------- Токенизация ----------
model_name = "cointegrated/rubert-tiny"
tokenizer = AutoTokenizer.from_pretrained(model_name)


def tokenize_and_align_offsets(examples):
    tokenized = tokenizer(
        examples["text"],
        truncation=True,
        padding=False,
        return_offsets_mapping=True,
    )
    labels = []
    for i, entities in enumerate(examples["entities"]):
        offsets = tokenized["offset_mapping"][i]  # список кортежей для i-го примера
        label_ids = [-100] * len(offsets)
        for idx, (start, end) in enumerate(offsets):
            if start == end:
                continue
            for ent in entities:
                if start >= ent["start"] and end <= ent["end"]:
                    if start == ent["start"]:
                        label_ids[idx] = label2id[ent["label"]]
                    else:
                        i_label = f"I-{ent['label']}"
                        label_ids[idx] = label2id.get(i_label, label2id[ent["label"]])
                    break
        labels.append(label_ids)
    tokenized["labels"] = labels
    del tokenized["offset_mapping"]
    return tokenized


dataset_hf = Dataset.from_list(dataset)
tokenized_dataset = dataset_hf.map(tokenize_and_align_offsets, batched=True, remove_columns=dataset_hf.column_names)
tokenized_dataset = tokenized_dataset.train_test_split(test_size=0.1, seed=42)

model = BertForTokenClassification.from_pretrained(
    model_name,
    num_labels=len(label_list),
    id2label=id2label,
    label2id=label2id,
)

data_collator = DataCollatorForTokenClassification(tokenizer=tokenizer, padding=True, label_pad_token_id=-100)

training_args = TrainingArguments(
    output_dir="./ner_receipts",
    num_train_epochs=10,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    eval_strategy="epoch",
    save_strategy="epoch",
    logging_dir="./logs",
    logging_steps=50,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    greater_is_better=False,
    seed=42,
)

def compute_metrics(p):
    predictions, labels = p
    predictions = np.argmax(predictions, axis=2)
    true_predictions = [
        [id2label[p] for p, l in zip(pred, lab) if l != -100]
        for pred, lab in zip(predictions, labels)
    ]
    true_labels = [
        [id2label[l] for _, l in zip(pred, lab) if l != -100]
        for pred, lab in zip(predictions, labels)
    ]
    flat_true = [item for sublist in true_labels for item in sublist]
    flat_pred = [item for sublist in true_predictions for item in sublist]
    return {"accuracy": accuracy_score(flat_true, flat_pred)}

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
    eval_dataset=tokenized_dataset["test"],
    data_collator=data_collator,
    compute_metrics=compute_metrics,
)

trainer.train()
trainer.save_model("./ner_receipts_final")
tokenizer.save_pretrained("./ner_receipts_final")
print("Модель обучена и сохранена.")


def parse_receipt(text):
    tokenizer_inf = AutoTokenizer.from_pretrained("./ner_receipts_final")
    model_inf = AutoModelForTokenClassification.from_pretrained("./ner_receipts_final")
    model_inf.eval()

    inputs = tokenizer_inf(text, return_offsets_mapping=True, return_tensors="pt", truncation=True)
    offsets = inputs.pop("offset_mapping").squeeze(0).tolist()
    with torch.no_grad():
        outputs = model_inf(**inputs)
    predictions = torch.argmax(outputs.logits, dim=2).squeeze(0).tolist()

    entities = []
    current_entity = None
    for idx, (pred_id, (start, end)) in enumerate(zip(predictions, offsets)):
        if start == end:
            continue
        label = model_inf.config.id2label[pred_id] if pred_id != -100 else "O"
        if label.startswith("B-") or (label.startswith("I-") and current_entity is None):
            if current_entity:
                entities.append(current_entity)
            etype = label.split("-", 1)[1]
            current_entity = {"label": etype, "start": start, "end": end}
        elif label.startswith("I-") and current_entity and current_entity["label"] == label.split("-", 1)[1]:
            current_entity["end"] = end
        else:
            if current_entity:
                entities.append(current_entity)
                current_entity = None
    if current_entity:
        entities.append(current_entity)

    result = {}
    for ent in entities:
        substring = text[ent["start"]:ent["end"]]
        label = ent["label"].lower()
        if label in ["date", "time", "amount", "currency", "account", "category", "description", "cashback", "mcc"]:
            result[label] = substring

    # Постобработка
    date_str = result.get("date", "")
    time_str = result.get("time", "")
    op_date = None
    if date_str:
        for df in ["%d.%m.%Y", "%d/%m/%Y", "%Y-%m-%d"]:
            try:
                op_date = datetime.strptime(date_str, df)
                break
            except:
                continue
    if op_date and time_str:
        for tf in ["%H:%M:%S", "%H:%M"]:
            try:
                t = datetime.strptime(time_str, tf).time()
                op_date = datetime.combine(op_date.date(), t)
                break
            except:
                continue
    result["operation_date"] = op_date.isoformat() if op_date else None

    amount_raw = result.get("amount", "0")
    amount_clean = re.sub(r"[^\d,.\-]", "", amount_raw).replace(",", ".")
    try:
        amount = float(amount_clean)
    except:
        amount = 0.0
    result["amount"] = abs(amount)
    result["operation_type"] = "расход" if amount < 0 else "доход"
    result["currency"] = result.get("currency", "RUB")
    result["account"] = result.get("account", "").replace("*", "")
    result["category"] = result.get("category", result.get("mcc", ""))
    result["description"] = result.get("description", "")
    result["cashback"] = result.get("cashback", None)

    final_keys = ["operation_date", "amount", "currency", "operation_type", "account", "category", "description",
                  "cashback"]
    return {k: result.get(k) for k in final_keys}


# Проверка
test_text = "Дата операции\tВремя\tСумма\tВалюта\tКарта\tКатегория\tОписание\tКэшбэк\n26.05.2026\t20:50:54\t-329,97\tRUB\t*0367\tСупермаркеты\tМагнит 3\t12.50"
print(parse_receipt(test_text))