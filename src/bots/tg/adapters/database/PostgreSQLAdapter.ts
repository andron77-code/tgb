/**
 * Адаптер для работы с PostgreSQL
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { DatabaseConfig } from '../../config/database';
import { logger } from '../../../../helpers';

export interface DatabaseConnection {
  query: (text: string, params?: any[]) => Promise<QueryResult>;
  transaction: (callback: (client: PoolClient) => Promise<void>) => Promise<void>;
  close: () => Promise<void>;
}

export class PostgreSQLAdapter implements DatabaseConnection {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Обработка ошибок пула
    this.pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err);
    });

    logger.info('PostgreSQL adapter initialized');
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('PostgreSQL query executed', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('PostgreSQL query error', { text, duration, error });
      throw error;
    }
  }

  async transaction(callback: (client: PoolClient) => Promise<void>): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await callback(client);
      await client.query('COMMIT');
      logger.debug('PostgreSQL transaction committed');
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('PostgreSQL transaction rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('PostgreSQL connection pool closed');
  }

  // Методы для работы с пользователями
  async createUser(userData: {
    telegramId: number;
    username?: string;
    firstName: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<QueryResult> {
    const query = `
      INSERT INTO users (telegram_id, username, first_name, last_name, language_code, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = $2,
        first_name = $3,
        last_name = $4,
        language_code = $5,
        updated_at = NOW()
      RETURNING *
    `;
    return this.query(query, [
      userData.telegramId,
      userData.username,
      userData.firstName,
      userData.lastName,
      userData.languageCode,
    ]);
  }

  async getUser(telegramId: number): Promise<QueryResult> {
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    return this.query(query, [telegramId]);
  }

  // Методы для работы с ролями
  async assignRole(telegramId: number, roleName: string, assignedBy: number): Promise<QueryResult> {
    const query = `
      INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by)
      VALUES ((SELECT id FROM users WHERE telegram_id = $1), (SELECT id FROM roles WHERE name = $2), NOW(), $3)
      ON CONFLICT (user_id, role_id) DO UPDATE SET
        assigned_at = NOW(),
        assigned_by = $3
      RETURNING *
    `;
    return this.query(query, [telegramId, roleName, assignedBy]);
  }

  async getUserRoles(telegramId: number): Promise<QueryResult> {
    const query = `
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      JOIN users u ON ur.user_id = u.id
      WHERE u.telegram_id = $1
    `;
    return this.query(query, [telegramId]);
  }

  // Методы для работы с расчетами доставки
  async saveDeliveryCalculation(calculation: {
    userId: number;
    service: string;
    fromCity: string;
    toCity: string;
    cost: number;
    deliveryTime: string;
    requestData: any;
    responseData: any;
  }): Promise<QueryResult> {
    const query = `
      INSERT INTO delivery_calculations (
        user_id, service, from_city, to_city, cost, delivery_time,
        request_data, response_data, created_at
      )
      VALUES ((SELECT id FROM users WHERE telegram_id = $1), $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;
    return this.query(query, [
      calculation.userId,
      calculation.service,
      calculation.fromCity,
      calculation.toCity,
      calculation.cost,
      calculation.deliveryTime,
      JSON.stringify(calculation.requestData),
      JSON.stringify(calculation.responseData),
    ]);
  }

  async getDeliveryHistory(telegramId: number, limit: number = 10): Promise<QueryResult> {
    const query = `
      SELECT * FROM delivery_calculations
      WHERE user_id = (SELECT id FROM users WHERE telegram_id = $1)
      ORDER BY created_at DESC
      LIMIT $2
    `;
    return this.query(query, [telegramId, limit]);
  }

  // Метод для инициализации схемы БД
  async initializeSchema(): Promise<void> {
    const schema = `
      -- Таблица пользователей
      CREATE TABLE IF NOT EXISTS users (
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

      -- Таблица ролей
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Таблица разрешений
      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Связь ролей и разрешений
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
        permission_id VARCHAR(50) REFERENCES permissions(id) ON DELETE CASCADE,
        PRIMARY KEY (role_id, permission_id)
      );

      -- Связь пользователей и ролей
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        assigned_by BIGINT REFERENCES users(telegram_id),
        PRIMARY KEY (user_id, role_id)
      );

      -- Таблица расчетов доставки
      CREATE TABLE IF NOT EXISTS delivery_calculations (
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

      -- Таблица настроек бота
      CREATE TABLE IF NOT EXISTS bot_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Индексы
      CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_calculations_user_id ON delivery_calculations(user_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_calculations_created_at ON delivery_calculations(created_at);
    `;

    await this.transaction(async (client) => {
      const statements = schema.split(';').filter(stmt => stmt.trim());
      for (const statement of statements) {
        if (statement.trim()) {
          await client.query(statement);
        }
      }
    });

    // Вставка базовых ролей и разрешений
    await this.insertDefaultRolesAndPermissions();

    logger.info('PostgreSQL schema initialized');
  }

  private async insertDefaultRolesAndPermissions(): Promise<void> {
    const roles = [
      { name: 'admin', description: 'Администратор', is_system: true },
      { name: 'user', description: 'Обычный пользователь', is_system: true },
      { name: 'moderator', description: 'Модератор', is_system: true },
    ];

    const permissions = [
      { name: 'admin.access', description: 'Доступ к административным функциям', resource: 'admin', action: 'access' },
      { name: 'delivery.calculate', description: 'Расчет стоимости доставки', resource: 'delivery', action: 'calculate' },
      { name: 'delivery.history', description: 'Просмотр истории расчетов', resource: 'delivery', action: 'history' },
      { name: 'user.manage', description: 'Управление пользователями', resource: 'user', action: 'manage' },
      { name: 'system.stats', description: 'Просмотр статистики системы', resource: 'system', action: 'stats' },
    ];

    const rolePermissions = {
      admin: ['admin.access', 'delivery.calculate', 'delivery.history', 'user.manage', 'system.stats'],
      user: ['delivery.calculate', 'delivery.history'],
      moderator: ['delivery.calculate', 'delivery.history', 'system.stats'],
    };

    // Вставка ролей
    for (const role of roles) {
      await this.query(
        'INSERT INTO roles (name, description, is_system) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
        [role.name, role.description, role.is_system]
      );
    }

    // Вставка разрешений
    for (const permission of permissions) {
      await this.query(
        'INSERT INTO permissions (name, description, resource, action) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
        [permission.name, permission.description, permission.resource, permission.action]
      );
    }

    // Вставка связей ролей и разрешений
    for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
      for (const permissionName of permissionNames) {
        await this.query(
          `INSERT INTO role_permissions (role_id, permission_id)
           SELECT r.id, p.id 
           FROM roles r, permissions p 
           WHERE r.name = $1 AND p.name = $2
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [roleName, permissionName]
        );
      }
    }
  }

  async hasPermission(telegramId: number, permission: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as count
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = (SELECT id FROM users WHERE telegram_id = $1)
      AND p.name = $2
    `;
    
    const result = await this.query(query, [telegramId, permission]);
    return parseInt(result.rows[0].count) > 0;
  }
}

export default PostgreSQLAdapter;
