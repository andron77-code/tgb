# 🗄️ Команды управления PostgreSQL

## 🚀 Управление сервисом

### Запуск PostgreSQL
```bash
npm run db:start
```

### Остановка PostgreSQL
```bash
npm run db:stop
```

### Перезапуск PostgreSQL
```bash
npm run db:restart
```

### Проверка статуса
```bash
npm run db:status
```

## 🔗 Подключение к базе данных

### Подключение к проектной БД
```bash
npm run db:connect
```

### Подключение под postgres
```bash
npm run db:shell
```

## 💾 Резервное копирование

### Создание бэкапа
```bash
npm run db:backup
```
Создает файл: `backup_YYYYMMDD_HHMMSS.sql`

### Восстановление из бэкапа
```bash
npm run db:restore -- backup_file.sql
```

## 📝 Просмотр логов

### Логи в реальном времени
```bash
npm run db:logs
```

### Фильтрация логов
```bash
# Просмотр ошибок
npm run db:logs | grep ERROR

# Просмотр подключений
npm run db:logs | grep "connection"
```

## 📊 Полезные запросы

### Статистика таблиц
```sql
-- Размер таблиц
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Количество записей
SELECT 
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE schemaname = 'public';
```

### Активные пользователи
```sql
SELECT 
    u.first_name,
    u.username,
    u.created_at,
    s.expires_at
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id
WHERE s.expires_at > NOW()
ORDER BY s.created_at DESC;
```

### История миграций
```sql
SELECT filename, applied_at 
FROM schema_migrations 
ORDER BY applied_at DESC;
```

### Очистка истекших сессий
```sql
SELECT cleanup_expired_sessions();
```

## 🔧 Конфигурация

### Файл конфигурации PostgreSQL
```bash
# Основной конфиг
sudo nano /etc/postgresql/14/main/postgresql.conf

# Контроль доступа
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Перезапуск после изменений
sudo systemctl restart postgresql@14-main
```

### Переменные окружения
```bash
# Просмотр текущих настроек
npm run db:shell -c "\l"

# Информация о БД
npm run db:shell -c "\dt+"

# Настройки подключения
npm run db:shell -c "\conninfo"
```

## 🚨 Частые проблемы

### 1. Ошибка "FATAL: role does not exist"
**Решение:** Создайте пользователя:
```bash
sudo -u postgres createuser freeb
```

### 2. Ошибка "FATAL: database does not exist"
**Решение:** Создайте базу данных:
```bash
sudo -u postgres createdb -O freeb t_db
```

### 3. Ошибка "connection refused"
**Решение:** Проверьте статус сервиса:
```bash
npm run db:status
```

### 4. Ошибка "permission denied"
**Решение:** Проверьте права доступа:
```bash
sudo chmod 755 /var/lib/postgresql/14/main
```

## 📈 Мониторинг

### Производительность
```sql
-- Медленные запросы
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC 
LIMIT 10;

-- Активные подключения
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;
```

### Размер базы данных
```sql
SELECT pg_size_pretty(pg_database_size('t_db')) as database_size;
```

## 🔄 Автоматизация

### Крон для бэкапов
```bash
# Добавить в crontab
crontab -e

# Ежедневный бэкап в 3:00
0 3 * * * /usr/bin/pg_dump -h localhost -p 5433 -U freeb -d t_db > /backup/db_backup_$(date +\%Y\%m\%d).sql
```

### Скрипт мониторинга
```bash
#!/bin/bash
# Проверка статуса PostgreSQL
if ! systemctl is-active --quiet postgresql@14-main; then
    echo "PostgreSQL не запущен, перезапускаю..."
    systemctl restart postgresql@14-main
    echo "PostgreSQL перезапущен в $(date)" >> /var/log/postgresql_restart.log
fi
```

---

**🎉 Все команды готовы к использованию!**

Используйте `npm run` для доступа ко всем функциям управления PostgreSQL.
