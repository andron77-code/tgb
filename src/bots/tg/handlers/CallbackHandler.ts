/**
 * Заглушка для обработчика callback запросов
 */

import { ExtendedContext } from '../types';

export class CallbackHandler {
  async handleCallback(ctx: ExtendedContext): Promise<void> {
    const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
    
    try {
      await ctx.answerCbQuery();
      await ctx.reply(`🔄 Callback получен: ${data} (заглушка)`);
    } catch (error) {
      console.error('Callback handler error:', error);
    }
  }
}

export default new CallbackHandler();
