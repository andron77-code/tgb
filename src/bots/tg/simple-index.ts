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

    // Расширение функциональности бота с заглушками
    await setupBotFunctionality(bot, authService);

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
 * Настройка функциональности бота
 */
async function setupBotFunctionality(bot: Bot, authService: AuthService) {
  const telegraf = bot.getTelegrafInstance();

  // Команда /start
  telegraf.command('start', async (ctx) => {
    await ctx.reply(`
🚀 Добро пожаловать в Telegram бот!

📋 Основные команды:
/start - Главное меню
/help - Справка
/delivery - Расчет доставки
/admin - Админ-панель
/test - Тестовый режим

📦 Для расчета доставки напишите "Рассчитать доставку из [город] в [город]"
    `);
  });

  // Команда /help
  telegraf.command('help', async (ctx) => {
    await ctx.reply(`
❓ Справка по боту

🔧 Бот поддерживает:
• Расчет стоимости доставки
• Историю расчетов
• Управление пользователями (для админов)

📦 Службы доставки:
• СДЭК
• Почта России  
• Деловые Линии
• ПЭК
• Байкал Сервис

⚙️ Административные функции:
/admin - Админ-панель
/users - Управление пользователями
/stats - Статистика

🚀 Версия: 1.0.0 (заглушки)
    `);
  });

  // Команда /delivery
  telegraf.command('delivery', async (ctx) => {
    await ctx.reply(`
📦 Расчет доставки

Для расчета стоимости доставки пожалуйста предоставьте:
• Город отправления
• Город назначения  
• Вес груза (кг)
• Габариты (длина×ширина×высота, см)

Пример:
Москва, Санкт-Петербург, 5кг, 30×20×10см

🚀 Сравню цены 5 служб доставки!
    `);
  });

  // Команда /admin
  telegraf.command('admin', async (ctx) => {
    try {
      const isAdmin = await authService.isUserAdmin(ctx.from!.id);
      
      if (!isAdmin) {
        await ctx.reply('🚫 Доступ запрещен. Эта команда только для администраторов.');
        return;
      }

      await ctx.reply(`
🔧 Админ-панель

📊 Статистика:
• Пользователей: 0 (заглушка)
• Активных сессий: 0 (заглушка)
• Расчетов доставки: 0 (заглушка)

🔗 Базы данных:
• PostgreSQL: 🔄 (заглушка)
• Redis: 🔄 (заглушка)

⚙️ Управление:
/users - Управление пользователями
/roles - Управление ролями
/stats - Детальная статистика
      `);
    } catch (error) {
      logger.error('Admin command error:', error);
      await ctx.reply('❌ Ошибка выполнения команды');
    }
  });

  // Команда /test
  telegraf.command('test', async (ctx) => {
    await ctx.reply(`
🧪 Тестовый режим

✅ Компоненты работают:
• Core: Bot, DatabaseManager, SessionManager, StateManager
• Services: AuthService, MessageService, ButtonService
• Handlers: MessageHandler, CallbackHandler, CommandHandler
• Adapters: PostgreSQL, Redis, Delivery Services
• Middleware: AuthMiddleware

📦 Заглушки активированы для:
• Базы данных (PostgreSQL, Redis)
• Службы доставки (СДЭК, Почта России, и др.)
• Внешние API

🚀 Бот готов к разработке!
    `);
  });

  // Обработка текстовых сообщений
  telegraf.on('text', async (ctx) => {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    
    if (!text) return;

    // Интеллектуальная обработка сообщений
    if (text.toLowerCase().includes('доставк')) {
      await ctx.reply(`
📦 Запрос на расчет доставки получен!

🔍 Анализирую ваш запрос...

🚀 Сравню цены 5 служб доставки:
• СДЭК: ~500₽, 2-3 дня
• Почта России: ~350₽, 5-7 дней  
• Деловые Линии: ~450₽, 3-4 дня
• ПЭК: ~400₽, 4-5 дней
• Байкал Сервис: ~380₽, 4-6 дней

(Заглушки - реальные цены будут рассчитываться через API)
      `);
    } else if (text.toLowerCase().includes('помощ') || text.toLowerCase().includes('help')) {
      await ctx.reply('🆘 Напишите /help для получения справки');
    } else if (text.toLowerCase().includes('статист') && await authService.isUserAdmin(ctx.from!.id)) {
      await ctx.reply('📊 Статистика (заглушка):\n• Пользователей: 0\n• Сообщений: 0\n• Расчетов: 0');
    } else {
      await ctx.reply('👍 Сообщение получено! Выберите действие в меню или напишите "Помощь" 🚀');
    }
  });

  // Обработка callback запросов (кнопки)
  telegraf.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    if (data) {
      try {
        await ctx.answerCbQuery();
        
        switch (data) {
          case 'delivery_menu':
            await ctx.reply('📦 Меню доставки (заглушка)');
            break;
            
          case 'admin_panel':
            if (await authService.isUserAdmin(ctx.from!.id)) {
              await ctx.reply('🔧 Админ-панель (заглушка)');
            } else {
              await ctx.reply('🚫 Доступ запрещен');
            }
            break;
            
          default:
            await ctx.reply(`🔄 Нажата кнопка: ${data} (заглушка)`);
        }
      } catch (error) {
        logger.error('Callback handling error:', error);
      }
    }
  });

  // Обработка всех типов сообщений с заглушками
  telegraf.on('photo', async (ctx) => {
    await ctx.reply('📷 Фото получено (заглушка)');
  });

  telegraf.on('video', async (ctx) => {
    await ctx.reply('🎥 Видео получено (заглушка)');
  });

  telegraf.on('document', async (ctx) => {
    await ctx.reply('📄 Документ получен (заглушка)');
  });

  telegraf.on('audio', async (ctx) => {
    await ctx.reply('🎵 Аудио получено (заглушка)');
  });

  telegraf.on('voice', async (ctx) => {
    await ctx.reply('🎤 Голосовое сообщение получено (заглушка)');
  });

  telegraf.on('sticker', async (ctx) => {
    await ctx.reply('😄 Стикер получен! Прикольный! 😊');
  });

  telegraf.on('location', async (ctx) => {
    const location = ctx.message && 'location' in ctx.message ? ctx.message.location : undefined;
    if (location) {
      await ctx.reply(`📍 Геолокация получена:\nШирота: ${location.latitude}\nДолгота: ${location.longitude}\n(заглушка)`);
    }
  });

  telegraf.on('contact', async (ctx) => {
    const contact = ctx.message && 'contact' in ctx.message ? ctx.message.contact : undefined;
    if (contact) {
      await ctx.reply(`📞 Контакт получен:\nИмя: ${contact.first_name}\nТелефон: ${contact.phone_number}\n(заглушка)`);
    }
  });

  telegraf.on('poll', async (ctx) => {
    await ctx.reply('📊 Опрос получен. Спасибо за участие! (заглушка)');
  });

  logger.info('Bot functionality setup completed');
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
