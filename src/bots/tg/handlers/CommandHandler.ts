/**
 * Заглушка для обработчика команд
 */

import { ExtendedContext } from '../types';

export class CommandHandler {
  async handleStart(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('🚀 Добро пожаловать! (заглушка команды /start)');
  }

  async handleHelp(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('❓ Справка (заглушка команды /help)');
  }

  async handleStatus(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📊 Статус бота (заглушка команды /status)');
  }

  async handleAdmin(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('⚙️ Админ-панель (заглушка команды /admin)');
  }

  async handleDelivery(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📦 Расчет доставки (заглушка команды /delivery)');
  }

  async handleUsers(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('👥 Управление пользователями (заглушка команды /users)');
  }
}

export default new CommandHandler();
