-- Начальная схема базы данных для Telegram бота
-- Версия: 1.0.0

-- Создаем расширение для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
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

-- Таблица ролей
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица разрешений
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связи пользователей и ролей
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by BIGINT NOT NULL, -- Telegram ID того, кто назначил роль
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Таблица связи ролей и разрешений
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- Таблица сессий
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id BIGINT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    state VARCHAR(100) DEFAULT 'main',
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Таблица расчетов доставки
CREATE TABLE IF NOT EXISTS delivery_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_data JSONB NOT NULL,
    response_data JSONB NOT NULL,
    calculation_id VARCHAR(255) UNIQUE NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    cost DECIMAL(10,2),
    delivery_time VARCHAR(255),
    tracking_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица истории запросов
CREATE TABLE IF NOT EXISTS request_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'delivery_calculation', 'command', 'message'
    request_data JSONB,
    response_data JSONB,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пунктов выдачи заказов
CREATE TABLE IF NOT EXISTS pickup_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    external_id VARCHAR(255) NOT NULL, -- ID из внешней системы
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    work_hours VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(service_name, external_id)
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_chat_id ON sessions(chat_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_delivery_calculations_user_id ON delivery_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_calculations_created_at ON delivery_calculations(created_at);
CREATE INDEX IF NOT EXISTS idx_request_history_user_id ON request_history(user_id);
CREATE INDEX IF NOT EXISTS idx_request_history_created_at ON request_history(created_at);
CREATE INDEX IF NOT EXISTS idx_pickup_points_service_name ON pickup_points(service_name);
CREATE INDEX IF NOT EXISTS idx_pickup_points_is_active ON pickup_points(is_active);

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pickup_points_updated_at 
    BEFORE UPDATE ON pickup_points 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Вставляем базовые роли
INSERT INTO roles (name, description, is_system) VALUES 
    ('admin', 'Администратор системы', true),
    ('user', 'Обычный пользователь', true),
    ('moderator', 'Модератор', true)
ON CONFLICT (name) DO NOTHING;

-- Вставляем базовые разрешения
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('admin.access', 'Доступ к административным функциям', 'admin', 'access'),
    ('delivery.calculate', 'Расчет стоимости доставки', 'delivery', 'calculate'),
    ('delivery.history', 'Просмотр истории расчетов', 'delivery', 'history'),
    ('user.manage', 'Управление пользователями', 'user', 'manage'),
    ('system.stats', 'Просмотр статистики системы', 'system', 'stats')
ON CONFLICT (name) DO NOTHING;

-- Связываем роли с разрешениями
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' 
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'user' AND p.name IN ('delivery.calculate', 'delivery.history')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'moderator' AND p.name IN ('delivery.calculate', 'delivery.history', 'system.stats')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Создаем функцию для очистки истекших сессий
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Комментарии к таблицам
COMMENT ON TABLE users IS 'Пользователи Telegram бота';
COMMENT ON TABLE roles IS 'Роли пользователей';
COMMENT ON TABLE permissions IS 'Разрешения системы';
COMMENT ON TABLE user_roles IS 'Связь пользователей и ролей';
COMMENT ON TABLE role_permissions IS 'Связь ролей и разрешений';
COMMENT ON TABLE sessions IS 'Активные сессии пользователей';
COMMENT ON TABLE delivery_calculations IS 'История расчетов доставки';
COMMENT ON TABLE request_history IS 'История всех запросов к боту';
COMMENT ON TABLE pickup_points IS 'Пункты выдачи заказов';
