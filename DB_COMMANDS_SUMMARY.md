# 🗄️ Команды управления PostgreSQL

## ✅ Добавлено в package.json

### 🚀 Управление сервисом
- `npm run db:start` - Запуск PostgreSQL
- `npm run db:stop` - Остановка PostgreSQL  
- `npm run db:restart` - Перезапуск PostgreSQL
- `npm run db:status` - Проверка статуса

### 🔗 Подключение
- `npm run db:connect` - Подключение к проектной БД (t_db)
- `npm run db:shell` - Подключение под postgres

### 💾 Резервное копирование
- `npm run db:backup` - Создание бэкапа с датой
- `npm run db:restore -- file.sql` - Восстановление из бэкапа

### 📝 Логирование
- `npm run db:logs` - Просмотр логов в реальном времени

## 🎯 Проверено

### ✅ Статус PostgreSQL
```bash
npm run db:status
# ● postgresql@14-main.service - PostgreSQL Cluster 14-main
# Active: active (running) since Fri 2026-02-13 17:55:29 MSK
```

### ✅ Подключение к БД
```bash
npm run db:connect
# psql -h localhost -p 5433 -U freeb -d t_db
```

### ✅ Миграции работают
```bash
npm run migrate
# Migration completed successfully!
```

## 📁 Структура файлов

```
src/bots/tg/database/
├── migrations/
│   └── migrate.ts              # Скрипт миграций
├── schemas/
│   ├── 001_initial_schema.sql   # Схема БД
│   └── index.ts               # Экспорт схем
├── README.md                   # Документация БД
├── DB_COMMANDS.md              # Подробная документация команд
├── MIGRATION_SUMMARY.md       # Сводка по миграциям
└── index.ts                   # Общий экспорт
```

## 🚀 Использование

### Базовый рабочий процесс:
```bash
# 1. Проверить статус БД
npm run db:status

# 2. Применить миграции
npm run migrate

# 3. Подключиться к БД для проверки
npm run db:connect

# 4. Запустить бота
npm run bot
```

### Резервное копирование:
```bash
# Создать бэкап
npm run db:backup

# Восстановить из бэкапа
npm run db:restore -- backup_20260213_195000.sql
```

## 📊 Конфигурация

### Настройки подключения:
- **Хост:** localhost
- **Порт:** 5433
- **База:** t_db
- **Пользователь:** freeb
- **Пароль:** freeb

### Файлы конфигурации:
- **PostgreSQL:** `/etc/postgresql/14/main/postgresql.conf`
- **Доступ:** `/etc/postgresql/14/main/pg_hba.conf`
- **Логи:** `/var/log/postgresql/postgresql-14-main.log`

## 🔧 Дополнительные команды

### Просмотр таблиц:
```sql
\dt  -- список таблиц
\d users  -- структура таблицы
\l  -- список баз данных
```

### Мониторинг:
```sql
-- Размер БД
SELECT pg_size_pretty(pg_database_size('t_db'));

-- Активные подключения
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

-- Размер таблиц
SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::text)) 
FROM pg_tables WHERE schemaname = 'public';
```

---

**🎉 Все команды управления PostgreSQL готовы к использованию!**

Теперь у вас есть полный набор команд для управления базой данных через npm scripts.
