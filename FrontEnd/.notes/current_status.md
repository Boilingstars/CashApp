# current_status.md

## Последнее обновление
31 мая 2026

## Что сделано недавно

### Docker
- [x] **Продакшен-образ** — `Dockerfile` (node build + nginx:alpine)
- [x] **nginx.conf** — SPA + прокси `/api` на `cashapps.ru` (аналог Vite proxy)
- [x] **docker-compose.yml** — `web` на порту 8080; профиль `dev` для HMR (5173)
- [x] **.dockerignore** — `nginx.conf` в контексте сборки (не исключать)

### Backend-интеграция
- [x] **Products GET** — `fetchProducts()` + `mapApiProductToClient.js`; Home/Accounts/ProductEdit из API; fallback `bankProducts`
- [x] **Operations GET** — `fetchOperations()` + `mapApiOperationToClient.js`; Stats/Category/Filter из API (~525 ops, пагинация); fallback `MOCK_TRANSACTIONS`
- [x] **Services / Categories GET** — `useReferenceStore` (TEMP) → ActionMenu «Новая трата»; fallback mock helpers; TEMP exclude income categories
- [x] **Chat POST** — `lib/api/chat.js` → `POST /api/chat/message/` (`content`); `/chat` UI: send, quick questions, loading; proxy `/api/chat` → `/chat`
- [x] **Profile** — debug-блок API-разведки (`/profile`): products, services, categories, operations

### Action Menu — «Новая трата» (Figma `814:1013`, `1083:*`)
- [x] Шаг 1–2, date-picker, success, submit (TEMP локально в zustand)
- [x] Категории/магазины из API справочников (не из MOCK_TRANSACTIONS)

### TransactionFilter и date-picker
- [x] `useFilterStore`, UI фильтров, date-picker, Stats/Category с фильтрами

### Ранее (UI)
- [x] GlassSelect, Home, ProductEdit, Accounts, dashboard `814:1087`, auth bootstrap

## В процессе
- [ ] **Action menu** — остальные пункты + handlers
- [ ] **Новое поступление** — запись `income` в store / API
- [ ] **submitNewExpense** — POST operations вместо локального prepend
- [ ] **TransactionCategory** — логика TEMP-чипов vs `useFilterStore`
- [ ] **Backend CRUD products** — save/delete пока TEMP на фронте

## Осталось (до хакатона)
- [ ] Dashboard `/transactions` — читать store / monthlySpending (debt donut)
- [ ] Кешбэк в submit / модели транзакции
- [ ] ChatHistory — API истории сессий
- [ ] Оптимизация загрузки operations (35 запросов при старте)
- [ ] **TransactionTag** — заглушка
- [ ] Иконки сервисов в PaymentCard и TransactionItem

## Известные проблемы
- ESLint warning в `ChipCarousel`, `AppShell` (exhaustive-deps)
- Chat: локальный `useState` (не zustand); ответ AI 15–25 сек
- `transfer` → `expense` в mapper operations (TEMP)
- `useReferenceStore` — TEMP; income categories — hardcoded exclude-list
- Action menu submit — локально; F5 сбрасывает новые траты до API POST
- Operations: 35 параллельных page-запросов при bootstrap
- TransactionCategory: чипы — визуальные TEMP

## Стек
React + Vite | JavaScript | CSS Modules | zustand | recharts | axios | react-router-dom | Docker (nginx)

## Запуск

| Режим | Команда | URL |
|-------|---------|-----|
| Dev (локально) | `npm run dev` | http://localhost:5173 |
| Docker prod | `docker compose up --build web` | http://localhost:8080 |
| Docker dev | `docker compose --profile dev up dev` | http://localhost:5173 |

## Бэкенд
- **Base URL:** `https://cashapps.ru`
- **Auth:** `POST /auth/access/` | **Products:** `GET /api/products/`
- **Operations:** `GET /api/operations/` (paginated `{ count, results, next }`)
- **Services:** `GET /api/services/` | **Categories:** `GET /api/categories/`
- **Chat:** `POST /chat/message/` body `{ content }` — через proxy `/api/chat/message/`
- **Products CRUD / Operations POST:** пока TEMP на фронте

## Роутинг
- С BottomNav: `/`, `/transactions`
- Без BottomNav: `/settings`, `/accounts`, `/products/:id`, `/transactions/stats`, `/transactions/categories/:categoryKey`, `/transactions/filter`, `/transactions/filter/date-picker`, `/transactions/tags/:tagId`, `/chat`, `/chat/history`, `/profile`

## Состояние страниц
| Страница | Роут | Статус |
|----------|------|--------|
| Home | `/` | ✅ + API products |
| Transactions | `/transactions` | ✅ dashboard (debt donut — мок на странице) |
| TransactionStats | `/transactions/stats` | ✅ + API operations + фильтры |
| TransactionCategory | `/transactions/categories/:categoryKey` | ✅ + API + фильтры |
| TransactionFilter | `/transactions/filter` | ✅ |
| DatePickerPlaceholder | `/transactions/filter/date-picker` | ✅ |
| Settings | `/settings` | 🔶 заглушка |
| Accounts | `/accounts` | ✅ API products |
| ProductEdit | `/products/:id` | ✅ + TEMP save/delete |
| Chat | `/chat` | ✅ API send (`/chat/message/`) |
| ChatHistory | `/chat/history` | ✅ UI, моки |
| TransactionTag | `/transactions/tags/:tagId` | 🔶 заглушка |
| Profile | `/profile` | 🔶 + debug API |

## Следующий этап
1. POST operations из action menu; persist после F5
2. Dashboard `/transactions` ← store
3. ChatHistory + session API
4. Backend CRUD products; оптимизация pagination operations
