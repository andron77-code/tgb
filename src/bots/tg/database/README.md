# 🗄️ База данных Telegram бота

## 📁 Структура директории

```
database/
├── migrations/           # Миграции базы данных
│   ├── migrate.ts      # Скрипт применения миграций
│   └── 001_initial_schema.sql  # Начальная схема
├── index.ts           # Экспорт компонентов
└── README.md          # Этот файл
```

## 🚀 Использование

### 1. Применение миграций

```bash
npm run migrate
```

### 2. Структура базы данных

После применения миграций создаются следующие таблицы:

#### Основные таблицы:
- **users** - Пользователи Telegram бота
- **roles** - Роли пользователей (admin, user, moderator)
- **permissions** - Разрешения системы
- **user_roles** - Связь пользователей и ролей
- **role_permissions** - Связь ролей и разрешений

#### Функциональные таблицы:
- **sessions** - Активные сессии пользователей
- **delivery_calculations** - История расчетов доставки
- **request_history** - История всех запросов
- **pickup_points** - Пункты выдачи заказов

#### Системные таблицы:
- **schema_migrations** - История примененных миграций

## 📊 Схема данных

### Users (Пользователи)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'ru',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Roles (Роли)
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Permissions (Разрешения)
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Базовые данные

### Роли по умолчанию:
- **admin** - Администратор системы (все права)
- **user** - Обычный пользователь (расчет доставки, история)
- **moderator** - Модератор (расчет доставки, история, статистика)

### Разрешения по умолчанию:
- **admin.access** - Доступ к административным функциям
- **delivery.calculate** - Расчет стоимости доставки
- **delivery.history** - Просмотр истории расчетов
- **user.manage** - Управление пользователями
- **system.stats** - Просмотр статистики системы

## 📝 Создание новых миграций

### 1. Имя файла
Используйте числовой префикс:
```
002_add_new_feature.sql
003_update_table.sql
```

### 2. Структура миграции
```sql
-- Описание миграции
-- Автор: ваше_имя
-- Дата: YYYY-MM-DD

-- Изменения схемы
ALTER TABLE table_name ADD COLUMN new_column VARCHAR(255);

-- Добавление индексов
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_new_column ON table_name(new_column);

-- Вставка данных
INSERT INTO table_name (column1, column2) VALUES ('value1', 'value2');
```

### 3. Применение миграции
```bash
npm run migrate
```

## 🔍 Запросы для проверки

### Проверка пользователей
```sql
SELECT COUNT(*) as total_users FROM users;
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;
```

### Проверка ролей и разрешений
```sql
SELECT r.name as role_name, p.name as permission_name
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.name;
```

### Проверка сессий
```sql
SELECT COUNT(*) as active_sessions 
FROM sessions 
WHERE expires_at > NOW();
```

### Статистика расчетов
```sql
SELECT 
    service_name,
    COUNT(*) as calculations_count,
    AVG(cost) as avg_cost,
    MAX(created_at) as last_calculation
FROM delivery_calculations 
GROUP BY service_name
ORDER BY calculations_count DESC;
```

## 🛠️ Управление базой данных

### Подключение через psql
```bash
psql -h localhost -p 5433 -U freeb -d t_db
```

### Резервное копирование
```bash
# Полный бэкап
pg_dump -h localhost -p 5433 -U freeb -d t_db > backup.sql

# Только схема
pg_dump -h localhost -p 5433 -U freeb -d t_db --schema-only > schema.sql

# Только данные
pg_dump -h localhost -p 5433 -U freeb -d t_db --data-only > data.sql
```

### Восстановление
```bash
# Из бэкапа
psql -h localhost -p 5433 -U freeb -d t_db < backup.sql

# Создание новой БД из бэкапа
createdb -h localhost -p 5433 -U freeb t_db_new
psql -h localhost -p 5433 -U freeb -d t_db_new < backup.sql
```

## 📈 Мониторинг

### Размер таблиц
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Активные сессии по времени
```sql
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as sessions_count
FROM sessions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour;
```

### Популярные сервисы доставки
```sql
SELECT 
    service_name,
    COUNT(*) as usage_count,
    AVG(cost) as avg_cost
FROM delivery_calculations 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY service_name
ORDER BY usage_count DESC;
```

## 🚨 Ошибки и решения

### 1. Ошибка "database does not exist"
**Решение:** Создайте базу данных:
```bash
sudo -u postgres createdb -O freeb t_db
```

### 2. Ошибка "role does not exist"
**Решение:** Создайте пользователя:
```bash
sudo -u postgres createuser freeb
```

### 3. Ошибка "permission denied"
**Решение:** Проверьте права доступа:
```sql
\l  -- список баз данных
\dp  -- права на таблицы
```

### 4. Ошибка миграций
**Решение:** Проверьте логи и запустите повторно:
```bash
npm run migrate
```

---

**✅ База данных готова к использованию!**
