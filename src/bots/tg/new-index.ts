/**
 * Новый главный файл Telegram бота с улучшенной архитектурой
 * Поддержка всех типов сообщений, кнопок, сессий и прав доступа
 */

// Загрузка переменных окружения
import 'dotenv/config';

// Импорт основных компонентов
import Bot from './core/Bot';
import AuthService from './services/AuthService';
import DatabaseManager from './core/DatabaseManager';
import { requireAuth, requireAdmin, auditLog, rateLimit } from './middleware/AuthMiddleware';
import { logger } from '../../helpers';

// Импорт существующих сервисов для обратной совместимости
import GoogleSheetsClient from '../../apis/google-sheets/index';
import googleSheetsKey from '../../apis/google-sheets/silent-bird-774-72ddcbe6a273.json';
import MasterChat from '../../apis/m-chat';

/**
 * Инициализация и запуск бота
 */
async function main() {
  try {
    logger.info('Starting Telegram bot with new architecture...');

    // Инициализация менеджера баз данных
    const db = new DatabaseManager();
    await db.initialize();

    // Инициализация сервиса авторизации
    const authService = new AuthService(db);

    // Создание экземпляра бота с middleware
    const bot = new Bot({
      databaseManager: db,
      middleware: [
        // Ограничение частоты запросов
        rateLimit(30, 60000), // 30 запросов в минуту
        
        // Аудит логирование для всех действий
        auditLog(authService, 'bot_action'),
        
        // Базовая аутентификация для всех пользователей
        requireAuth(authService),
      ],
      handlers: [
        // Дополнительные обработчики сообщений
        async (ctx) => {
          // Обработка специальных команд
          if (ctx.message?.text?.startsWith('/admin')) {
            // Админские команды
            return;
          }
        },
      ],
    });

    // Регистрация дополнительных middleware для админ-функций
    bot.addMiddleware(requireAdmin(authService));

    // Интеграция с существующими сервисами
    const googleSheetsClient = new GoogleSheetsClient(googleSheetsKey);
    const sheetManager = googleSheetsClient.createTableSheetManager(
      '1Qxcls8-DksCuCAqTq4egEm4Dy9ohhqdiEBYlG4uurMM',
    );
    const mChat = new MasterChat();

    // Расширение функциональности бота
    extendBotFunctionality(bot, authService, sheetManager, mChat);

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
 * Расширение функциональности бота
 */
function extendBotFunctionality(
  bot: Bot, 
  authService: AuthService, 
  sheetManager: any, 
  mChat: MasterChat
) {
  const telegraf = bot.getTelegrafInstance();

  // Команда /admin - только для администраторов
  telegraf.command('admin', async (ctx) => {
    try {
      const isAdmin = await authService.isUserAdmin(ctx.from!.id);
      
      if (!isAdmin) {
        await ctx.reply('Доступ запрещен. Эта команда только для администраторов.');
        return;
      }

      const stats = await bot.getDatabaseManager().getStatistics();
      
      const adminMessage = `
🔧 Админ-панель

📊 Статистика:
• Пользователей: ${stats.totalUsers}
• Активных сессий: ${stats.activeSessions}
• Расчетов доставки: ${stats.totalCalculations}
• Расчетов сегодня: ${stats.calculationsToday}

🔗 Базы данных:
• PostgreSQL: ✅
• Redis: ✅

⚙️ Управление:
/users - Управление пользователями
/roles - Управление ролями
/stats - Детальная статистика
/backup - Резервное копирование
      `;

      await ctx.reply(adminMessage);
    } catch (error) {
      logger.error('Admin command error:', error);
      await ctx.reply('Ошибка выполнения команды');
    }
  });

  // Команда /users - управление пользователями
  telegraf.command('users', async (ctx) => {
    try {
      const isAdmin = await authService.isUserAdmin(ctx.from!.id);
      
      if (!isAdmin) {
        await ctx.reply('Доступ запрещен');
        return;
      }

      const accessStats = await authService.getAccessStatistics();
      
      const usersMessage = `
👥 Управление пользователями

📈 Статистика доступа:
• Всего пользователей: ${accessStats.totalUsers}
• В белом списке: ${accessStats.allowedUsers}
• Администраторов: ${accessStats.adminUsers}

📋 Распределение по ролям:
${Object.entries(accessStats.usersByRole)
  .map(([role, count]) => `• ${role}: ${count}`)
  .join('\n')}

🔧 Действия:
/assign_role [user_id] [role] - Назначить роль
/remove_role [user_id] [role] - Удалить роль
/add_allowed [user_id] - Добавить в белый список
/remove_allowed [user_id] - Удалить из белого списка
      `;

      await ctx.reply(usersMessage);
    } catch (error) {
      logger.error('Users command error:', error);
      await ctx.reply('Ошибка выполнения команды');
    }
  });

  // Команда /delivery - расчет доставки (интеграция с Google Sheets)
  telegraf.command('delivery', async (ctx) => {
    try {
      const hasPermission = await authService.hasPermission(ctx.from!.id, 'calculate_delivery');
      
      if (!hasPermission) {
        await ctx.reply('Доступ запрещен. У вас нет прав для расчета доставки.');
        return;
      }

      // Сохранение запроса в Google Sheets
      const values = [
        ['Дата', 'Пользователь', 'Запрос'],
        [new Date().toISOString(), ctx.from!.username || ctx.from!.first_name, 'Запрос на расчет доставки'],
      ];

      await sheetManager?.setListData('Лист1', values);
      
      const deliveryMessage = `
📦 Расчет доставки

Для расчета стоимости доставки пожалуйста предоставьте:
• Город отправления
• Город назначения  
• Вес груза (кг)
• Габариты (длина×ширина×высота, см)

Пример:
Москва, Санкт-Петербург, 5кг, 30×20×10см
      `;

      await ctx.reply(deliveryMessage);
    } catch (error) {
      logger.error('Delivery command error:', error);
      await ctx.reply('Ошибка при обработке запроса на доставку');
    }
  });

  // Команда /chat - интеграция с чат-системой
  telegraf.command('chat', async (ctx) => {
    try {
      const message = ctx.message?.text?.replace('/chat', '').trim();
      
      if (!message) {
        await ctx.reply('Использование: /chat ваше сообщение');
        return;
      }

      // Интеграция с m-chat
      const response = await mChat.query(message);
      
      await ctx.reply(`🤖 Ответ от чат-системы:\n\n${response}`);
    } catch (error) {
      logger.error('Chat command error:', error);
      await ctx.reply('Ошибка чат-системы. Попробуйте позже.');
    }
  });

  // Обработка текстовых сообщений с улучшенной логикой
  telegraf.on('text', async (ctx) => {
    const text = ctx.message?.text;
    if (!text) return;

    // Проверка прав доступа
    const hasDeliveryPermission = await authService.hasPermission(ctx.from!.id, 'calculate_delivery');
    
    // Интеллектуальная обработка сообщений
    if (text.toLowerCase().includes('доставк') && hasDeliveryPermission) {
      await handleDeliveryRequest(ctx, authService, sheetManager);
    } else if (text.toLowerCase().includes('помощ') || text.toLowerCase().includes('help')) {
      await ctx.reply(`
🆘 Помощь

📋 Основные команды:
/start - Главное меню
/help - Эта справка
/delivery - Расчет доставки
/admin - Админ-панель (только для админов)
/chat - Чат с AI

📦 Для расчета доставки напишите "Рассчитать доставку из [город] в [город]"
      `);
    } else if (text.toLowerCase().includes('статист') && await authService.isUserAdmin(ctx.from!.id)) {
      const stats = await bot.getDatabaseManager().getStatistics();
      await ctx.reply(`📊 Статистика бота:\n${JSON.stringify(stats, null, 2)}`);
    } else {
      // Базовый ответ
      await ctx.reply('Выберите действие в меню или напишите "Помощь" для получения списка команд 🚀');
    }
  });

  // Обработка callback запросов (кнопки)
  telegraf.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    try {
      await ctx.answerCbQuery();
      
      switch (data) {
        case 'delivery_menu':
          await ctx.reply('📦 Меню доставки:\n\n1. Рассчитать стоимость\n2. История расчетов\n3. Пункты выдачи');
          break;
          
        case 'admin_panel':
          if (await authService.isUserAdmin(ctx.from!.id)) {
            await ctx.reply('🔧 Админ-панель открыта');
          } else {
            await ctx.reply('Доступ запрещен');
          }
          break;
          
        default:
          await ctx.reply(`Нажата кнопка: ${data}`);
      }
    } catch (error) {
      logger.error('Callback handling error:', error);
    }
  });
}

/**
 * Обработка запросов на доставку
 */
async function handleDeliveryRequest(ctx: any, authService: AuthService, sheetManager: any) {
  try {
    // Сохранение запроса в Google Sheets
    const values = [
      ['Дата', 'Пользователь', 'Тип запроса', 'Сообщение'],
      [new Date().toISOString(), ctx.from!.username || ctx.from!.first_name, 'Доставка', ctx.message?.text],
    ];

    await sheetManager?.setListData('Лист1', values);

    await ctx.reply(`
📦 Запрос на расчет доставки получен!

🔍 Анализирую ваш запрос...

Для точного расчета пожалуйста уточните:
• Точные адреса отправления и назначения
• Вес и габариты груза
• Желаемую скорость доставки

🚀 Сравню цены 5 служб доставки:
• СДЭК
• Почта России
• Деловые Линии
• ПЭК
• Байкал Сервис
    `);
  } catch (error) {
    logger.error('Delivery request handling error:', error);
    await ctx.reply('Ошибка при обработке запроса на доставку');
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
