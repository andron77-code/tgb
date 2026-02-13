/**
 * Основной класс Telegram бота
 */

import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import DatabaseManager from './DatabaseManager';
import SessionManager from './SessionManager';
import StateManager from './StateManager';
import { botConfig } from '../config';
import { logger } from '../../../helpers';
import { HandlerFunction, MiddlewareFunction, ExtendedContext } from '../types';

export interface BotOptions {
  databaseManager?: DatabaseManager;
  sessionManager?: SessionManager;
  stateManager?: StateManager;
  handlers?: HandlerFunction[];
  middleware?: MiddlewareFunction[];
}

export class Bot {
  private telegraf: Telegraf;
  private db: DatabaseManager;
  private sessionManager: SessionManager;
  private stateManager: StateManager;
  private handlers: HandlerFunction[] = [];
  private middleware: MiddlewareFunction[] = [];
  private isStarted: boolean = false;

  constructor(options: BotOptions = {}) {
    // Инициализация Telegraf
    this.telegraf = new Telegraf(botConfig.token);

    // Инициализация менеджеров
    this.db = options.databaseManager || new DatabaseManager();
    this.sessionManager = options.sessionManager || new SessionManager(this.db);
    this.stateManager = options.stateManager || new StateManager(this.sessionManager);

    // Сохраняем обработчики и middleware
    this.handlers = options.handlers || [];
    this.middleware = options.middleware || [];

    logger.info('Bot instance created');
  }

  // === Инициализация и запуск ===

  async initialize(): Promise<void> {
    try {
      // Инициализация базы данных
      await this.db.initialize();

      // Регистрация middleware
      this.registerMiddleware();

      // Регистрация обработчиков
      this.registerHandlers();

      // Регистрация базовых команд
      this.registerBasicCommands();

      logger.info('Bot initialized successfully');
    } catch (error) {
      logger.error('Bot initialization failed:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      logger.warn('Bot is already started');
      return;
    }

    try {
      await this.initialize();

      if (botConfig.polling) {
        // Запуск в режиме polling
        this.telegraf.launch();
        logger.info('Bot started with polling');
      } else if (botConfig.webhookUrl) {
        // Запуск в режиме webhook
        await this.telegraf.launch({
          webhook: {
            domain: botConfig.webhookUrl,
          },
        });
        logger.info('Bot started with webhook', { url: botConfig.webhookUrl });
      } else {
        throw new Error('Neither polling nor webhook configuration provided');
      }

      this.isStarted = true;
      logger.info('Bot started successfully');
    } catch (error) {
      logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted) {
      logger.warn('Bot is not started');
      return;
    }

    try {
      // Остановка Telegraf
      this.telegraf.stop('SIGTERM');

      // Закрытие менеджеров
      await this.sessionManager.close();
      await this.db.close();

      this.isStarted = false;
      logger.info('Bot stopped successfully');
    } catch (error) {
      logger.error('Error stopping bot:', error);
      throw error;
    }
  }

  // === Регистрация middleware ===

  private registerMiddleware(): void {
    // Глобальное middleware для логирования
    this.telegraf.use(async (ctx, next) => {
      const start = Date.now();
      
      try {
        logger.debug('Incoming update', {
          updateId: ctx.update.update_id,
          from: ctx.from?.id,
          chat: ctx.chat?.id,
          type: ctx.updateType,
        });

        await next();

        const duration = Date.now() - start;
        logger.debug('Update processed', { duration });
      } catch (error) {
        const duration = Date.now() - start;
        logger.error('Update processing error', { duration, error });
        throw error;
      }
    });

    // Middleware для работы с сессиями
    this.telegraf.use(async (ctx: ExtendedContext, next) => {
      if (ctx.from && ctx.chat) {
        try {
          // Создаем или обновляем сессию с конвертацией типов
          const user = {
            id: ctx.from.id,
            isBot: ctx.from.is_bot,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name,
            username: ctx.from.username,
            languageCode: ctx.from.language_code,
          };
          
          const chat = {
            id: ctx.chat.id,
            type: ctx.chat.type,
            title: 'title' in ctx.chat ? ctx.chat.title : undefined,
            username: 'username' in ctx.chat ? ctx.chat.username : undefined,
            firstName: 'first_name' in ctx.chat ? ctx.chat.first_name : undefined,
            lastName: 'last_name' in ctx.chat ? ctx.chat.last_name : undefined,
          };
          
          await this.sessionManager.createOrUpdateSession(user, chat);
          
          // Добавляем менеджеры в контекст
          ctx.sessionManager = this.sessionManager;
          ctx.stateManager = this.stateManager;
          ctx.db = this.db;
        } catch (error) {
          logger.error('Session middleware error:', error);
        }
      }

      await next();
    });

    // Регистрация пользовательского middleware
    for (const middleware of this.middleware) {
      this.telegraf.use(async (ctx, next) => {
        await middleware(ctx, next);
      });
    }
  }

  // === Регистрация обработчиков ===

  private registerHandlers(): void {
    // Регистрация пользовательских обработчиков
    for (const handler of this.handlers) {
      this.telegraf.on('message', handler);
    }

    // Обработка всех текстовых сообщений
    this.telegraf.on(message('text'), this.handleTextMessage.bind(this));

    // Обработка других типов сообщений
    this.telegraf.on(message('photo'), this.handlePhoto.bind(this));
    this.telegraf.on(message('video'), this.handleVideo.bind(this));
    this.telegraf.on(message('document'), this.handleDocument.bind(this));
    this.telegraf.on(message('audio'), this.handleAudio.bind(this));
    this.telegraf.on(message('voice'), this.handleVoice.bind(this));
    this.telegraf.on(message('sticker'), this.handleSticker.bind(this));
    this.telegraf.on(message('location'), this.handleLocation.bind(this));
    this.telegraf.on(message('contact'), this.handleContact.bind(this));
    this.telegraf.on(message('poll'), this.handlePoll.bind(this));

    // Обработка callback запросов (кнопки)
    this.telegraf.on('callback_query', this.handleCallback.bind(this));

    // Обработка inline запросов
    this.telegraf.on('inline_query', this.handleInline.bind(this));

    // Обработка ошибок
    this.telegraf.catch((error, ctx) => {
      logger.error('Telegraf error:', { error, update: ctx.update });
    });
  }

  // === Базовые команды ===

  private registerBasicCommands(): void {
    // Команда /start
    this.telegraf.command('start', async (ctx) => {
      try {
        await this.handleStartCommand(ctx);
      } catch (error) {
        logger.error('Start command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      }
    });

    // Команда /help
    this.telegraf.command('help', async (ctx) => {
      try {
        await this.handleHelpCommand(ctx);
      } catch (error) {
        logger.error('Help command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      }
    });

    // Команда /status
    this.telegraf.command('status', async (ctx) => {
      try {
        await this.handleStatusCommand(ctx);
      } catch (error) {
        logger.error('Status command error:', error);
        await ctx.reply('Произошла ошибка. Попробуйте позже.');
      }
    });
  }

  // === Обработчики команд ===

  private async handleStartCommand(ctx: Context): Promise<void> {
    const welcomeMessage = `
👋 Добро пожаловать в бот для расчета стоимости доставки!

Я помогу вам рассчитать стоимость и сроки доставки по России через 5 основных служб:
• СДЭК
• Почта России  
• Деловые Линии
• ПЭК
• Байкал Сервис

Выберите действие в меню ниже:
    `;

    await ctx.reply(welcomeMessage);
    await this.stateManager.setState(ctx.chat!.id, 'main');
  }

  private async handleHelpCommand(ctx: Context): Promise<void> {
    const helpMessage = `
📖 Справка по боту

🚀 Основные функции:
• Расчет стоимости доставки
• Сравнение служб доставки
• История расчетов
• Настройки

📝 Команды:
/start - Начать работу
/help - Показать справку
/status - Статус бота

💡 Для расчета доставки просто напишите "Рассчитать доставку" или выберите в меню
    `;

    await ctx.reply(helpMessage);
  }

  private async handleStatusCommand(ctx: Context): Promise<void> {
    try {
      const health = await this.db.healthCheck();
      const stats = await this.db.getStatistics();

      const statusMessage = `
📊 Статус бота

🔗 Базы данных:
• PostgreSQL: ${health.postgres ? '✅' : '❌'}
• Redis: ${health.redis ? '✅' : '❌'}

📈 Статистика:
• Всего пользователей: ${stats.totalUsers}
• Активных сессий: ${stats.activeSessions}
• Расчетов всего: ${stats.totalCalculations}
• Расчетов сегодня: ${stats.calculationsToday}

⏰ Время: ${new Date().toLocaleString('ru-RU')}
      `;

      await ctx.reply(statusMessage);
    } catch (error) {
      logger.error('Status command error:', error);
      await ctx.reply('❌ Не удалось получить статус');
    }
  }

  // === Обработчики сообщений ===

  private async handleTextMessage(ctx: Context): Promise<void> {
    const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    
    if (!text) return;

    logger.debug('Text message received', { 
      userId: ctx.from?.id, 
      chatId: ctx.chat?.id, 
      text: text.substring(0, 50) 
    });

    // Базовая обработка текстовых сообщений
    if (text.toLowerCase().includes('доставк')) {
      await ctx.reply('Для расчета доставки выберите соответствующий пункт в меню 📦');
    } else if (text.toLowerCase().includes('истор')) {
      await ctx.reply('История расчетов будет доступна в ближайшее время 📋');
    } else {
      await ctx.reply('Выберите действие в меню или напишите "Рассчитать доставку" 🚀');
    }
  }

  private async handlePhoto(ctx: Context): Promise<void> {
    logger.debug('Photo message received', { userId: ctx.from?.id });
    await ctx.reply('📷 Получено фото. В настоящее время обработка фото не поддерживается.');
  }

  private async handleVideo(ctx: Context): Promise<void> {
    logger.debug('Video message received', { userId: ctx.from?.id });
    await ctx.reply('🎥 Получено видео. В настоящее время обработка видео не поддерживается.');
  }

  private async handleDocument(ctx: Context): Promise<void> {
    logger.debug('Document message received', { userId: ctx.from?.id });
    await ctx.reply('📄 Получен документ. В настоящее время обработка документов не поддерживается.');
  }

  private async handleAudio(ctx: Context): Promise<void> {
    logger.debug('Audio message received', { userId: ctx.from?.id });
    await ctx.reply('🎵 Получено аудио. В настоящее время обработка аудио не поддерживается.');
  }

  private async handleVoice(ctx: Context): Promise<void> {
    logger.debug('Voice message received', { userId: ctx.from?.id });
    await ctx.reply('🎤 Получено голосовое сообщение. В настоящее время обработка голоса не поддерживается.');
  }

  private async handleSticker(ctx: Context): Promise<void> {
    logger.debug('Sticker message received', { userId: ctx.from?.id });
    await ctx.reply('😄 Получен стикер! Прикольный! 😊');
  }

  private async handleLocation(ctx: Context): Promise<void> {
    const location = ctx.message && 'location' in ctx.message ? ctx.message.location : undefined;
    
    if (location) {
      logger.debug('Location received', { 
        userId: ctx.from?.id, 
        latitude: location.latitude, 
        longitude: location.longitude 
      });
      
      await ctx.reply(`📍 Получена геолокация:
Широта: ${location.latitude}
Долгота: ${location.longitude}

Эту локацию можно использовать для расчета доставки 🚚`);
    }
  }

  private async handleContact(ctx: Context): Promise<void> {
    const contact = ctx.message && 'contact' in ctx.message ? ctx.message.contact : undefined;
    
    if (contact) {
      logger.debug('Contact received', { 
        userId: ctx.from?.id, 
        contactUserId: contact.user_id,
        phone: contact.phone_number 
      });
      
      await ctx.reply(`📞 Получен контакт:
Имя: ${contact.first_name} ${contact.last_name || ''}
Телефон: ${contact.phone_number}

Контакт сохранен ✅`);
    }
  }

  private async handlePoll(ctx: Context): Promise<void> {
    logger.debug('Poll message received', { userId: ctx.from?.id });
    await ctx.reply('📊 Получен опрос. Спасибо за участие!');
  }

  private async handleCallback(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
    
    if (callbackData) {
      logger.debug('Callback received', { 
        userId: ctx.from?.id, 
        data: callbackData 
      });

      try {
        // Базовая обработка callback
        await ctx.answerCbQuery();
        
        if (callbackData === 'main_menu') {
          await this.stateManager.setState(ctx.chat!.id, 'main');
          await ctx.reply('🏠 Главное меню');
        } else if (callbackData === 'delivery_calculation') {
          await this.stateManager.setState(ctx.chat!.id, 'delivery_calculation');
          await ctx.reply('📦 Введите город отправления');
        } else {
          await ctx.reply(`Получена команда: ${callbackData}`);
        }
      } catch (error) {
        logger.error('Callback handling error:', error);
      }
    }
  }

  private async handleInline(ctx: Context): Promise<void> {
    logger.debug('Inline query received', { 
      userId: ctx.from?.id, 
      query: ctx.inlineQuery?.query 
    });
    
    // Базовая обработка inline запросов
    await ctx.answerInlineQuery([]);
  }

  // === Управление обработчиками ===

  addHandler(handler: HandlerFunction): void {
    this.handlers.push(handler);
    
    if (this.isStarted) {
      this.telegraf.on('message', handler);
    }
  }

  addMiddleware(middleware: MiddlewareFunction): void {
    this.middleware.push(middleware);
    
    if (this.isStarted) {
      this.telegraf.use(async (ctx, next) => {
        await middleware(ctx, next);
      });
    }
  }

  // === Утилиты ===

  getTelegrafInstance(): Telegraf {
    return this.telegraf;
  }

  getDatabaseManager(): DatabaseManager {
    return this.db;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getStateManager(): StateManager {
    return this.stateManager;
  }

  isRunning(): boolean {
    return this.isStarted;
  }
}

export default Bot;
