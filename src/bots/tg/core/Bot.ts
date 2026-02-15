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
import { IExtendedHandlerFunction, MiddlewareFunction, ExtendedContext } from '../types';

export interface BotOptions {
  databaseManager?: DatabaseManager;
  sessionManager?: SessionManager;
  stateManager?: StateManager;
  handlers?: IExtendedHandlerFunction[];
  middleware?: MiddlewareFunction[];
}

export class Bot {
  private telegraf: Telegraf;
  private db: DatabaseManager;
  private sessionManager: SessionManager;
  private stateManager: StateManager;
  private handlers: IExtendedHandlerFunction[] = [];
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

      // Регистрация обработчиков
      this.registerHandlers();

      // Регистрация middleware
      this.registerMiddleware();

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
    // Разделяем handlers по типам
    const commands: IExtendedHandlerFunction[] = [];
    const messages: IExtendedHandlerFunction[] = [];
    const callbacks: IExtendedHandlerFunction[] = [];

    for (const handler of this.handlers) {
      if (handler.type.includes('message-')) {
        // Handler с фильтром - сообщения
        messages.push(handler);
      } else if (handler.type === 'callback') {
        // Callback handlers
        callbacks.push(handler);
      } else if (handler.type.includes('command')) {
        // Command handlers
        commands.push(handler);
      }
    }

    // Регистрируем команды через text с проверкой на команду
    for (const handler of commands) {
      const command = handler.type.split('-')[1];
      this.telegraf.command(command, async (ctx, next) => handler.handler(this.getExtendedContext(ctx)));
    }

    // Регистрируем сообщения с фильтрами
    for (const handler of messages) {
      const filter = message(handler.type.split('-')[1] as any)
      this.telegraf.on(filter, (ctx) => handler.handler(this.getExtendedContext(ctx)));
    }

    // Регистрируем callbacks
    for (const handler of callbacks) {
      this.telegraf.on('callback_query', (ctx) => handler.handler(this.getExtendedContext(ctx)));
    }

    // Обработка ошибок
    this.telegraf.catch((error, ctx) => {
      logger.error('Telegraf error:', { error, update: ctx.update });
    });
  }


  // === Утилиты ===

  getExtendedContext(ctx: any): ExtendedContext {
    const _ctx: ExtendedContext = ctx as unknown as ExtendedContext;
    _ctx.stateManager = this.stateManager
    _ctx.sessionManager = this.sessionManager
    _ctx.db = this.db
    return _ctx
  }

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
