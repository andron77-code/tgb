/**
 * Конфигурация баз данных
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
}

export const postgresConfig: DatabaseConfig = {
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5433', 10),
  database: process.env.PG_DATABASE || 't_db',
  username: process.env.PG_USERNAME || 'freeb',
  password: process.env.PG_PASSWORD || 'freeb',
  ssl: process.env.PG_SSL === 'true',
  maxConnections: parseInt(process.env.PG_MAX_CONNECTIONS || '20', 10),
};

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

// Флаг включения Redis
export const redisEnabled = process.env.REDIS_ENABLED !== 'false';

// Строка подключения для PostgreSQL
export const postgresConnectionString = `postgresql://${postgresConfig.username}:${postgresConfig.password}@${postgresConfig.host}:${postgresConfig.port}/${postgresConfig.database}${postgresConfig.ssl ? '?sslmode=require' : ''}`;

// Строка подключения для Redis
export const redisConnectionString = `redis://${redisConfig.password ? `${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`;

export default {
  postgres: postgresConfig,
  redis: redisConfig,
  postgresConnectionString,
  redisConnectionString,
};
