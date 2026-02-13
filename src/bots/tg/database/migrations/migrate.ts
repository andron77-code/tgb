#!/usr/bin/env ts-node

/**
 * Скрипт для применения миграций базы данных
 */

import { Pool } from 'pg';
import { postgresConfig } from '../../config/database';
import { logger } from '../../../../helpers';
import * as fs from 'fs';
import * as path from 'path';

class MigrationRunner {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: postgresConfig.host,
      port: postgresConfig.port,
      user: postgresConfig.username,
      password: postgresConfig.password,
      database: 'postgres', // Подключаемся к системной БД для создания
      max: 1,
    });
  }

  async run(): Promise<void> {
    try {
      logger.info('Starting database migration...');

      // 1. Создаем базу данных если не существует
      await this.createDatabase();

      // 2. Подключаемся к целевой базе данных
      await this.connectToTargetDatabase();

      // 3. Создаем таблицу миграций если не существует
      await this.createMigrationsTable();

      // 4. Применяем миграции
      await this.applyMigrations();

      logger.info('Migration completed successfully!');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async createDatabase(): Promise<void> {
    const client = await this.pool.connect();
    try {
      // Проверяем существует ли база данных
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [postgresConfig.database]
      );

      if (result.rows.length === 0) {
        logger.info(`Creating database: ${postgresConfig.database}`);
        await client.query(`CREATE DATABASE ${postgresConfig.database}`);
        logger.info(`Database ${postgresConfig.database} created successfully`);
      } else {
        logger.info(`Database ${postgresConfig.database} already exists`);
      }
    } finally {
      client.release();
    }
  }

  private async connectToTargetDatabase(): Promise<void> {
    // Закрываем текущее подключение
    await this.pool.end();

    // Создаем новое подключение к целевой базе данных
    this.pool = new Pool({
      host: postgresConfig.host,
      port: postgresConfig.port,
      user: postgresConfig.username,
      password: postgresConfig.password,
      database: postgresConfig.database,
      max: 1,
    });

    // Проверяем подключение
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info(`Connected to database: ${postgresConfig.database}`);
    } finally {
      client.release();
    }
  }

  private async createMigrationsTable(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info('Migration table created or already exists');
    } finally {
      client.release();
    }
  }

  private async applyMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, '..', 'schemas');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const client = await this.pool.connect();
    try {
      for (const file of migrationFiles) {
        // Проверяем применена ли миграция
        const result = await client.query(
          'SELECT 1 FROM schema_migrations WHERE filename = $1',
          [file]
        );

        if (result.rows.length > 0) {
          logger.info(`Migration ${file} already applied, skipping`);
          continue;
        }

        // Применяем миграцию
        logger.info(`Applying migration: ${file}`);
        
        const migrationSQL = fs.readFileSync(
          path.join(migrationsDir, file),
          'utf8'
        );

        await client.query('BEGIN');
        try {
          await client.query(migrationSQL);
          await client.query(
            'INSERT INTO schema_migrations (filename) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          logger.info(`Migration ${file} applied successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
    } finally {
      client.release();
    }
  }
}

// Запуск миграций
if (require.main === module) {
  const runner = new MigrationRunner();
  runner.run().catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  });
}

export default MigrationRunner;
