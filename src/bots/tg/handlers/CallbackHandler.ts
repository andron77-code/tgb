/**
 * Обработчик callback запросов (кнопки)
 */

import { ExtendedContext } from '../types';

export class CallbackHandler {
  async handleCallback(ctx: ExtendedContext): Promise<void> {
    const data = ctx.callbackQuery.data || '';
    
    if (!data) return;
    
    try {
      await ctx.answerCbQuery();
      
      console.log('Callback received', { 
        userId: ctx.from?.id, 
        data: data 
      });
      
      // Базовая обработка callback
      if (data === 'main_menu') {
        if (ctx.chat && ctx.stateManager) {
          await ctx.stateManager.setState(ctx.chat.id, 'main');
          await ctx.reply('🏠 Главное меню');
        }
      } else if (data === 'delivery_calculation') {
        if (ctx.chat && ctx.stateManager) {
          await ctx.stateManager.setState(ctx.chat.id, 'delivery_calculation');
          await ctx.reply('📦 Введите город отправления');
        }
      } else {
        await ctx.reply(`Получена команда: ${data}`);
      }
    } catch (error) {
      console.error('Callback handling error:', error);
    }
  }
}

export default new CallbackHandler();
