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

// Импорт всех handlers
import MessageHandler from './handlers/MessageHandler';
import CallbackHandler from './handlers/CallbackHandler';
import CommandHandler from './handlers/CommandHandler';


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

    // Создание экземпляра бота с полным набором handlers
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
        // Обработка команд
        { type: 'command-help', handler: CommandHandler.handleHelp.bind(CommandHandler)},
        { type: 'command-start', handler: CommandHandler.handleStart.bind(CommandHandler)},
        
        { type: 'command-status', handler: CommandHandler.handleStatus.bind(CommandHandler)},
        // { type: 'command', handler: CommandHandler.handleAdmin.bind(CommandHandler)},
        // { type: 'command', handler: CommandHandler.handleDelivery.bind(CommandHandler)},
        { type: 'command-users', handler: CommandHandler.handleUsers.bind(CommandHandler)},
        
        // Обработка сообщений с правильными фильтрами
        { type: 'message-text', handler: MessageHandler.handleText.bind(MessageHandler)},
        { type: 'message-photo', handler: MessageHandler.handlePhoto.bind(MessageHandler)},
        { type: 'message-video', handler: MessageHandler.handleVideo.bind(MessageHandler)},
        { type: 'message-document', handler: MessageHandler.handleDocument.bind(MessageHandler)},
        { type: 'message-audio', handler: MessageHandler.handleAudio.bind(MessageHandler)},
        { type: 'message-voice', handler: MessageHandler.handleVoice.bind(MessageHandler)},
        { type: 'message-sticker', handler: MessageHandler.handleSticker.bind(MessageHandler)},
        { type: 'message-location', handler: MessageHandler.handleLocation.bind(MessageHandler)},
        { type: 'message-contact', handler: MessageHandler.handleContact.bind(MessageHandler)},
        { type: 'message-poll', handler: MessageHandler.handlePoll.bind(MessageHandler)},
        
        // Обработка callback запросов
        { type: 'callback', handler: CallbackHandler.handleCallback.bind(CallbackHandler)},
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
