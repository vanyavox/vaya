# Vaya — пространство для пары

Веб-приложение для пары: списки желаний, общий календарь, бытовые дела.

## Стек

| Слой | Технология |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | NestJS + Prisma |
| БД | PostgreSQL 16 |
| Auth | JWT (access + refresh) |

## Быстрый старт

### 1. Поднимите БД

```bash
docker compose up -d
```

### 2. Установите зависимости

```bash
npm install
```

### 3. Примените миграции и seed

```bash
cp .env.example .env
npm run prisma:migrate -w @vaya/api
npm run prisma:seed -w @vaya/api
```

### 4. Запустите

```bash
npm run dev
```

- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Web: http://localhost:5173

### Тестовые аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| yana@example.com | password123 | Владелец пары |
| vanya@example.com | password123 | Партнёр |

Invite-код: `VAYA2026`

## Структура проекта

```
vaya/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # React frontend
├── packages/
│   └── shared/       # Общие типы и константы
├── docs/
│   ├── TZ.txt        # Техническое задание
│   └── mockups/      # SVG-макеты (17 шт.)
└── docker-compose.yml
```

## Документация

- **Техническое задание**: [`docs/TZ.txt`](docs/TZ.txt)
- **Макеты (wireframes)**: [`docs/mockups/`](docs/mockups/)

## Возможности MVP

- ✅ Регистрация / вход (JWT)
- ✅ Профиль: имя, email, аватар
- ✅ Связка пары по invite-коду
- ✅ Виш-листы: личные и общие, резервирование, статусы
- ✅ Календарь: личные/общие события, фильтры
- ✅ Бытовые задачи с фильтрами
- ✅ ICS-подписка для Apple Calendar

## API

Все эндпоинты под `/api/v1`. Документация Swagger: `/api/docs`

## Apple Calendar

Настройки → Подписка на календарь → скопируйте ссылку → добавьте в Apple Calendar.
