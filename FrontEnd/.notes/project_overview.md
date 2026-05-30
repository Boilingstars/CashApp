# FinHelper — обзор проекта

## Суть
Мобильный финансовый помощник (MVP, mobile-first). Баланс и продукты банка, траты, аналитика, AI-чат Cash Ask, action-menu «+». Подключены auth, products, operations, справочники services/categories, отправка чата.

## Ключевые экраны (MVP)
| Экран | Роут | Статус |
|-------|------|--------|
| Home / меню | `/` | ✅ + API products |
| Банковские продукты | `/accounts` | ✅ API |
| Редактирование продукта | `/products/:id` | ✅ TEMP save/delete |
| Транзакции (dashboard) | `/transactions` | ✅ Figma 814:1087 (debt donut — мок) |
| Аналитика | `/transactions/stats` | ✅ API operations + фильтры |
| Категория транзакций | `/transactions/categories/:categoryKey` | ✅ API + фильтры |
| Фильтры операций | `/transactions/filter` | ✅ |
| Выбор дат | `/transactions/filter/date-picker` | ✅ |
| Чат Cash Ask | `/chat` | ✅ POST `/chat/message/` |
| История чатов | `/chat/history` | ✅ UI, моки |
| Settings / tag | … | 🔶 заглушки |
| Profile | `/profile` | 🔶 debug API |

## Action Menu — «Новая трата»
Категории и магазины — `GET /api/categories/` + `/api/services/` через `useReferenceStore` (TEMP).  
Сохранение — TEMP локально: `submitNewExpense.js` → zustand (без API POST).

## Стек
React + Vite, JavaScript, CSS Modules, zustand, react-router-dom, recharts, axios.

## Развёртывание
- **Локально:** `npm run dev` (Vite proxy → cashapps.ru)
- **Docker:** `docker compose up --build web` → http://localhost:8080  
  Статика из `dist/`, API через nginx (`Dockerfile`, `nginx.conf`, `docker-compose.yml`)

## Бэкенд
- **URL:** `https://cashapps.ru`
- **Auth:** `POST /auth/access/` — токены в памяти
- **Products:** `GET /api/products/` → `mapApiProductToClient`; CRUD — TEMP на фронте
- **Operations:** `GET /api/operations/` → `mapApiOperationToClient`; Stats/Category/Filter
- **Services / Categories:** справочники для ActionMenu
- **Chat:** `POST /chat/message/` body `{ content }`

## Структура кода
- `src/lib/api/` — auth, products, operations, services, categories, chat
- `src/lib/products/` — `mapApiProductToClient.js`, `clientProductCrud.js`
- `src/lib/operations/` — `mapApiOperationToClient.js`
- `src/stores/` — auth, accounts, transactions, useFilterStore, useActionMenuStore, **useReferenceStore** (TEMP)
- `src/lib/actionMenu/` — presets, handlers, `submitNewExpense.js`
- `src/lib/utils/calcTransactionStats.js` — stats, фильтры, категории

## Поток данных (транзакции + фильтры)
```
AppShell bootstrap → fetchProducts + fetchOperations
useTransactionsStore.transactions (API + prepend из action menu TEMP)
  + useFilterStore
  → applyTransactionFilters (useMemo)
  → calcTransactionStats / filterTransactionsByCategory
```

Подробный статус — `.notes/current_status.md`.
