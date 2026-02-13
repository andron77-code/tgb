/**
 * Основной файл запуска Telegram бота с полной интеграцией PostgreSQL
 */

// Загрузка переменных окружения
import 'dotenv/config';

// Импорт основных компонентов
import Bot from './core/Bot';
import AuthService from './services/AuthService';
import DatabaseManager from './core/DatabaseManager';
import { logger } from '../../helpers';

/**
 * Инициализация и запуск бота
 */
async function main() {
  try {
    logger.info('Starting Telegram bot with PostgreSQL integration...');

    // Инициализация менеджера баз данных
    const db = new DatabaseManager();
    logger.info('Database manager created');

    // Инициализация сервиса авторизации
    const authService = new AuthService(db);

    // Создание экземпляра бота с базовым middleware
    const bot = new Bot({
      databaseManager: db,
      middleware: [
        // Базовый middleware для логирования
        async (ctx, next) => {
          logger.info('Update received', {
            updateId: ctx.update.update_id,
            from: ctx.from?.id,
            chat: ctx.chat?.id,
            type: ctx.updateType,
          });
          await next();
        },
      ],
      handlers: [
        // Дополнительные обработчики
        async (ctx) => {
          // Обработка специальных команд
          if (ctx.message?.text?.startsWith('/test')) {
            await ctx.reply('🧪 Тестовый режим работает!');
          }
        },
      ],
    });

    // Запуск бота
    await bot.start();

    // Обработка сигналов для корректного завершения
    setupGracefulShutdown(bot);

  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

/**
 * Настройка корректного завершения работы
 */
function setupGracefulShutdown(bot: Bot) {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    try {
      await bot.stop();
      logger.info('Bot stopped successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  
  // Обработка необработанных ошибок
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('unhandledRejection');
  });
}

// Запуск бота
if (require.main === module) {
  main().catch((error) => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  });
}

export default main;
