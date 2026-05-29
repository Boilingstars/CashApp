import random
import datetime

templates = [
    "Покупка {amount} руб в {service} {card_type} **{card_suffix}",
    "Перевод {amount} руб на счет {account}",
    "Зачисление {amount} руб от {service}",
    "Оплата {amount} руб {service} счет {account}",
    "Списание {amount} руб {service} карта **{card_suffix}",
]

services = {
    "Пятёрочка": ["Pyaterochka", "пятерочка", "5a.group", "Пятёрочка"],
    "Яндекс.Такси": ["Яндекс.Такси", "Yandex.Taxi", "Яндекс Такси"],
    "Макдоналдс": ["Макдоналдс", "McDonald's", "Мак"],
}

card_types = ["МИР", "VISA", "MasterCard"]

# --- Генератор случайных дат/времени в разных форматах с разметкой ---
def generate_datetime_tokens():
    """Возвращает список кортежей (токен, BIO-метка) для даты и времени."""
    # случайная дата и время в диапазоне
    start_date = datetime.date(2024, 1, 1)
    end_date = datetime.date(2026, 12, 31)
    delta = (end_date - start_date).days
    random_date = start_date + datetime.timedelta(days=random.randint(0, delta))
    random_time = datetime.time(random.randint(0, 23), random.randint(0, 59), random.randint(0, 59))

    # словарь форматов: ключ — функция, возвращающая (строка, список меток для токенов)
    formats = [
        # День.Месяц.Год Часы:Минуты
        lambda: (
            f"{random_date:%d.%m.%Y} {random_time:%H:%M}",
            ["B-DATE", "B-TIME"]  # токены после split: ["DD.MM.YYYY", "HH:MM"]
        ),
        # День.Месяц.Год (только дата)
        lambda: (
            f"{random_date:%d.%m.%Y}",
            ["B-DATE"]
        ),
        # Год-Месяц-День Часы:Минуты:Секунды
        lambda: (
            f"{random_date:%Y-%m-%d} {random_time:%H:%M:%S}",
            ["B-DATE", "B-TIME"]
        ),
        # Сегодня в ЧЧ:ММ
        lambda: (
            f"Сегодня в {random_time:%H:%M}",
            ["B-DATE", "O", "B-TIME"]   # токены: ["Сегодня", "в", "ЧЧ:ММ"]
        ),
        # Вчера в ЧЧ:ММ
        lambda: (
            f"Вчера в {random_time:%H:%M}",
            ["B-DATE", "O", "B-TIME"]
        ),
        # Только время ЧЧ:ММ
        lambda: (
            f"{random_time:%H:%M}",
            ["B-TIME"]
        ),
        # День.Месяц.Год Часы:Минуты (другой разделитель даты)
        lambda: (
            f"{random_date:%d/%m/%Y} {random_time:%H:%M}",
            ["B-DATE", "B-TIME"]
        ),
    ]

    # Выбираем случайный формат и генерируем строку с метками
    format_func = random.choice(formats)
    dt_string, tag_list = format_func()
    tokens = dt_string.split()  # разбиваем по пробелам
    # объединяем токены с метками (длины должны совпадать)
    assert len(tokens) == len(tag_list), f"Несовпадение токенов и меток: {tokens} vs {tag_list}"
    return list(zip(tokens, tag_list))


# --- Обновлённый генератор примера ---
def generate_ner_example():
    # 1. Основной текст транзакции (без даты)
    template = random.choice(templates)
    service_canonical = random.choice(list(services.keys()))
    service_synonym = random.choice(services[service_canonical])
    amount = random.randint(50, 10000)
    card_suffix = str(random.randint(1000, 9999))
    account = f"**{card_suffix}"
    card_type = random.choice(card_types)

    text_main = template.format(
        amount=amount,
        service=service_synonym,
        card_type=card_type,
        card_suffix=card_suffix,
        account=account
    )

    # 2. Генерируем дату/время (всегда в конце)
    dt_tokens_tags = generate_datetime_tokens()  # список (token, tag)

    # 3. Склеиваем полный текст и разбиваем на слова
    full_text = text_main + " " + " ".join([t for t, _ in dt_tokens_tags])
    words = full_text.split()

    # 4. BIO-разметка для основной части
    labels = []
    for word in words[:len(words) - len(dt_tokens_tags)]:  # часть до даты
        if word == str(amount):
            labels.append("B-AMOUNT")
        elif word in service_synonym.split():
            labels.append("B-SERVICE")
        elif word == account or word == f"**{card_suffix}":
            labels.append("B-ACCOUNT")
        elif word in ["Покупка", "Перевод", "Зачисление", "Списание", "Оплата"]:
            labels.append("B-TYPE")
        else:
            labels.append("O")

    # 5. Добавляем метки для даты/времени (из dt_tokens_tags)
    for _, tag in dt_tokens_tags:
        labels.append(tag)

    # Проверка длин
    assert len(words) == len(labels), f"words: {len(words)}, labels: {len(labels)}"
    return {"tokens": words, "ner_tags": labels, "text": full_text}


# Генерация датасета
dataset = [generate_ner_example() for _ in range(2000)]  # чуть больше для разнообразия
df = pd.DataFrame(dataset)
df.to_csv("ner_synthetic.csv", index=False, encoding="utf-8")
print("Датасет сохранён в ner_synthetic.csv")