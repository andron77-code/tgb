# Telegram Bot - Новая архитектура

## 📋 Обзор

Переработанная архитектура Telegram бота с поддержкой:
- ✅ Всех типов сообщений и кнопок
- ✅ Системы сессий и состояний
- ✅ PostgreSQL + Redis для хранения данных
- ✅ Системы прав доступа и ролей
- ✅ Интеграции со службами доставки
- ✅ Модульной и масштабируемой структуры

## 🏗️ Архитектура

### Структура директорий

```
src/bots/tg/
├── new-index.ts                # Новая версия бота
├── README.md                   # Документация
├── config/                     # Конфигурация
│   ├── index.ts               # Основная конфигурация
│   ├── database.ts            # Настройки БД
│   └── delivery.ts        # 🤖 Telegram Bot - Модульная архитектура

## 📁 Структура проекта

```
src/bots/tg/
├── core/                    # Основные компоненты
│   ├── Bot.ts             # Главный класс бота
│   ├── DatabaseManager.ts   # Управление базами данных
│   ├── SessionManager.ts   # Управление сессиями
│   └── StateManager.ts     # Управление состояниями
├── services/                # Сервисы бизнес-логики
│   ├── AuthService.ts      # Авторизация и роли
│   ├── MessageService.ts   # Работа с сообщениями
│   ├── ButtonService.ts    # Работа с кнопками
│   ├── UserService.ts      # Управление пользователями
│   └── DeliveryService.ts  # Расчеты доставки
├── handlers/                # Обработчики событий
│   ├── MessageHandler.ts   # Текстовые сообщения
│   ├── CallbackHandler.ts  # Callback кнопок
│   ├── CommandHandler.ts   # Команды бота
│   └── DeliveryHandler.ts # Расчеты доставки
├── adapters/                # Адаптеры внешних систем
│   ├── database/          # Адаптеры баз данных
│   │   ├── PostgreSQLAdapter.ts
│   │   └── RedisAdapter.ts
│   └── delivery/          # Адаптеры служб доставки
│       ├── CdekAdapter.ts
│       ├── RussianPostAdapter.ts
│       ├── BusinessLinesAdapter.ts
│       ├── PekAdapter.ts
│       └── BaikalAdapter.ts
├── database/                # Работа с базой данных
│   ├── migrations/        # Миграции
│   │   ├── migrate.ts
│   │   └── 001_initial_schema.sql
│   └── README.md          # Документация БД
├── middleware/              # Middleware
│   └── AuthMiddleware.ts  # Авторизация
├── types/                   # Типы TypeScript
│   ├── index.ts          # Основные типы
│   └── context.ts        # Расширенный контекст
├── config/                  # Конфигурация
│   ├── index.ts          # Основная конфигурация
│   └── database.ts       # Настройки БД
├── simple-index.ts          # Упрощенная версия (готова к запуску)
├── new-index.ts            # Полная версия (требует настройки)
├── README.md               # Этот файл
├── SIMPLE-README.md        # Инструкция по быстрому запуску
└── SETUP.md               # Инструкция по настройке
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
npm install pg redis ioredis uuid winston joi
```

### 2. Настройка переменных окружения

Создайте файл `.env`:

```env
# Telegram Bot
TG_BOT_TOKEN=your_telegram_bot_token
TG_POLLING=true
TG_WEBHOOK_URL=

# PostgreSQL
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=telegram_bot
PG_USERNAME=postgres
PG_PASSWORD=your_password
PG_SSL=false
PG_MAX_CONNECTIONS=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Безопасность
ALLOWED_USERS=123456789,987654321
ADMIN_USERS=123456789
MAX_REQUESTS_PER_MINUTE=30

# Службы доставки
CDEK_API_KEY=your_cdek_key
CDEK_ACCOUNT=your_cdek_account
RUSSIAN_POST_TOKEN=your_russian_post_token
BUSINESS_LINES_API_KEY=your_business_lines_key
PEK_LOGIN=your_pek_login
PEK_PASSWORD=your_pek_password
BAIKAL_TOKEN=your_baikal_token

# Логирование
LOG_LEVEL=info
LOG_FORMAT=json
```

### 3. Запуск бота

```bash
# Новая архитектура
ts-node src/bots/tg/new-index.ts

# Старая архитектура (для совместимости)
ts-node src/bots/tg/index.ts
```

## 🔧 Основные компоненты

### Bot.ts - Главный класс бота

Центральный компонент, который:
- Инициализирует все подсистемы
- Регистрирует обработчики и middleware
- Управляет жизненным циклом бота

```typescript
import Bot from './core/Bot';

const bot = new Bot({
  middleware: [authMiddleware, loggingMiddleware],
  handlers: [customMessageHandler],
});

await bot.start();
```

### DatabaseManager.ts - Управление БД

Унифицированный интерфейс для работы с PostgreSQL и Redis:

```typescript
const db = new DatabaseManager();
await db.initialize();

// Работа с пользователями
await db.createUser({ telegramId: 123, firstName: 'John' });
const user = await db.getUser(123);

// Работа с сессиями
await db.setSession(chatId, sessionData);
const session = await db.getSession(chatId);
```

### SessionManager.ts - Управление сессиями

Хранение состояния пользователя, истории сообщений, временных данных:

```typescript
const sessionManager = new SessionManager(db);

// Создание/обновление сессии
await sessionManager.createOrUpdateSession(user, chat);

// Управление состоянием
await sessionManager.setState(chatId, 'delivery_calculation');
const state = await sessionManager.getState(chatId);
```

### StateManager.ts - Машина состояний

Управление переходами между состояниями диалога:

```typescript
const stateManager = new StateManager(sessionManager);

// Регистрация состояний
stateManager.registerState({
  name: 'delivery_calculation',
  entry: async (session) => { /* логика входа */ },
  transitions: [
    { from: 'delivery_calculation', to: 'results' }
  ]
});

// Переключение состояния
await stateManager.setState(chatId, 'delivery_calculation');
```

### AuthService.ts - Авторизация и права

Система ролей и разрешений:

```typescript
const authService = new AuthService(db);

// Проверка прав
const hasPermission = await authService.hasPermission(userId, 'calculate_delivery');

// Назначение ролей
await authService.assignRole(userId, 'manager', assignedBy);
```

## 🔐 Система прав доступа

### Роли

- **admin** - Полный доступ ко всем функциям
- **manager** - Расчеты доставки, история, экспорт
- **user** - Базовые функции, расчет доставки
- **guest** - Только просмотр публичной информации

### Разрешения

- `calculate_delivery` - Расчет стоимости доставки
- `view_history` - Просмотр истории расчетов
- `view_own_history` - Просмотр своей истории
- `manage_users` - Управление пользователями
- `access_admin_functions` - Административные функции
- `view_statistics` - Просмотр статистики
- `export_data` - Экспорт данных
- `view_public_info` - Просмотр публичной информации

### Middleware

```typescript
import { requireAdmin, requirePermission } from './middleware/AuthMiddleware';

// Только для администраторов
bot.addMiddleware(requireAdmin(authService));

// Требуется конкретное разрешение
bot.addMiddleware(requirePermission(authService, 'calculate_delivery'));
```

## 📦 Интеграция со службами доставки

### Поддерживаемые службы

- СДЭК (CDEK)
- Почта России
- Деловые Линии
- ПЭК (PEK)
- Байкал Сервис

### Пример использования

```typescript
// В планах - создание адаптеров для каждой службы
const deliveryService = new DeliveryService();

const results = await deliveryService.calculateDelivery({
  from: { city: 'Москва' },
  to: { city: 'Санкт-Петербург' },
  weight: 5,
  dimensions: { length: 30, width: 20, height: 10 }
});
```

## 📱 Типы сообщений

Бот поддерживает все типы сообщений Telegram:

- ✅ Текстовые сообщения
- ✅ Фото и изображения
- ✅ Видео и аудио
- ✅ Документы
- ✅ Стикеры и GIF
- ✅ Голосовые сообщения
- ✅ Геолокация
- ✅ Контакты
- ✅ Опросы

### Пример обработчика

```typescript
bot.getTelegrafInstance().on('photo', async (ctx) => {
  await ctx.reply('📷 Получено фото!');
});

bot.getTelegrafInstance().on('location', async (ctx) => {
  const { latitude, longitude } = ctx.message.location;
  await ctx.reply(`📍 Координаты: ${latitude}, ${longitude}`);
});
```

## 🔘 Система кнопок

### Inline кнопки

```typescript
await ctx.reply('Выберите действие:', {
  reply_markup: {
    inline_keyboard: [
      [{ text: '📦 Рассчитать доставку', callback_data: 'delivery_calc' }],
      [{ text: '📋 История', callback_data: 'history' }],
      [{ text: '⚙️ Настройки', callback_data: 'settings' }]
    ]
  }
});
```

### Reply кнопки

```typescript
await ctx.reply('Главное меню:', {
  reply_markup: {
    keyboard: [
      ['📦 Доставка', '📋 История'],
      ['⚙️ Настройки', '❓ Помощь']
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  }
});
```

## 🗄️ База данных

### PostgreSQL схема

```sql
-- Пользователи
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  language_code VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Роли
CREATE TABLE roles (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Разрешения
CREATE TABLE permissions (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Расчеты доставки
CREATE TABLE delivery_calculations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(50) NOT NULL,
  from_city VARCHAR(255) NOT NULL,
  to_city VARCHAR(255) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  delivery_time VARCHAR(100),
  request_data JSONB,
  response_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Redis - сессии и кэш

- `session:{chatId}` - Данные сессии пользователя
- `cache:delivery:{hash}` - Кэш расчетов доставки
- `queue:{name}` - Очереди сообщений

## 📊 Команды бота

### Основные команды

- `/start` - Главное меню
- `/help` - Справка
- `/delivery` - Расчет доставки
- `/chat [message]` - Чат с AI

### Административные команды

- `/admin` - Админ-панель
- `/users` - Управление пользователями
- `/stats` - Статистика
- `/assign_role [user_id] [role] - Назначить роль
- `/remove_role [user_id] [role] - Удалить роль

## 🔧 Конфигурация

### Основные настройки

```typescript
// config/index.ts
export const botConfig = {
  token: process.env.TG_BOT_TOKEN,
  polling: process.env.TG_POLLING !== 'false',
};

export const sessionConfig = {
  ttl: 3600, // 1 час
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
};
```

### Настройки безопасности

```typescript
export const securityConfig = {
  maxRequestsPerMinute: 30,
  maxFileSize: 20971520, // 20MB
  allowedUsers: [123456789],
  adminUsers: [123456789],
};
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Запуск с покрытием
npm run test:coverage

# Запуск конкретного теста
npm test -- --grep "AuthService"
```

## 📝 Логирование

Бот использует структурированное логирование:

```typescript
import { logger } from '../helpers';

logger.info('User authenticated', { 
  telegramId, 
  username, 
  rolesCount: roles.length 
});

logger.error('Database error', { 
  error: error.message, 
  query: sql 
});
```

## 🚀 Развертывание

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### PM2

```json
{
  "name": "telegram-bot",
  "script": "dist/new-index.js",
  "instances": 1,
  "autorestart": true,
  "watch": false,
  "max_memory_restart": "1G",
  "env": {
    "NODE_ENV": "production"
  }
}
```

## 🔄 Миграция со старой версии

1. **Сохраните текущую версию**: `cp index.ts old-index.ts`
2. **Настройте БД**: Создайте PostgreSQL базу данных
3. **Установите зависимости**: `npm install pg redis`
4. **Настройте .env**: Добавьте переменные окружения
5. **Запустите новую версию**: `ts-node new-index.ts`
6. **Проверьте функциональность**: Убедитесь, что все работает корректно

## 🐛 Устранение проблем

### Частые проблемы

1. **Ошибка подключения к PostgreSQL**
   - Проверьте параметры подключения в .env
   - Убедитесь, что БД создана и доступна

2. **Ошибка подключения к Redis**
   - Проверьте, что Redis сервер запущен
   - Проверьте хост и порт в конфигурации

3. **Ошибка токена бота**
   - Убедитесь, что токен правильный и активен
   - Проверьте, что бот не заблокирован

4. **Проблемы с правами доступа**
   - Проверьте настройки ALLOWED_USERS и ADMIN_USERS
   - Убедитесь, что пользователи существуют в БД

## 📚 Дополнительные ресурсы

- [Telegraf Documentation](https://telegraf.js.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## 🤝 Contributing

1. Fork проекта
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Отправьте Pull Request

## 📄 Лицензия

ISC License
