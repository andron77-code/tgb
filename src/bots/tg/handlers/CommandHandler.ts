/**
 * Обработчик команд бота
 */

import { ExtendedContext } from '../types';

export class CommandHandler {
  async handleStart(ctx: ExtendedContext): Promise<void> {
    const welcomeMessage = `
� Добро пожаловать в бот для расчета стоимости доставки!

Я помогу вам рассчитать стоимость и сроки доставки по России через 5 основных служб:
• СДЭК
• Почта России  
• Деловые Линии
• ПЭК
• Байкал Сервис

Выберите действие в меню ниже:
    `;

    await ctx.reply(welcomeMessage);
    
    // Устанавливаем состояние только если есть chat и stateManager
    if (ctx.chat && ctx.stateManager) {
      await ctx.stateManager.setState(ctx.chat.id, 'main');
    }
  }

  async handleHelp(ctx: ExtendedContext): Promise<void> {
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

  async handleStatus(ctx: ExtendedContext): Promise<void> {
    try {
      if (!ctx.db) {
        await ctx.reply('❌ База данных недоступна');
        return;
      }

      const health = await ctx.db.healthCheck();
      const stats = await ctx.db.getStatistics();

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
      console.error('Status command error:', error);
      await ctx.reply('❌ Не удалось получить статус');
    }
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
