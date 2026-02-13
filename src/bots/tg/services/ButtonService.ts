/**
 * Заглушка для сервиса кнопок
 */

import { ExtendedContext, InlineKeyboardButton, ReplyKeyboardMarkup } from '../types';

export class ButtonService {
  createInlineKeyboard(buttons: InlineKeyboardButton[][]): any {
    return {
      inline_keyboard: buttons.map(row => 
        row.map(btn => ({
          text: btn.text,
          callback_data: btn.callbackData,
          url: btn.url,
        }))
      )
    };
  }

  createReplyKeyboard(buttons: string[][], options: Partial<ReplyKeyboardMarkup> = {}): any {
    return {
      keyboard: buttons,
      resize_keyboard: options.resizeKeyboard || false,
      one_time_keyboard: options.oneTimeKeyboard || false,
      selective: options.selective || false,
    };
  }

  async sendInlineKeyboard(ctx: ExtendedContext, text: string, buttons: InlineKeyboardButton[][]): Promise<void> {
    const keyboard = this.createInlineKeyboard(buttons);
    await ctx.reply(text, { reply_markup: keyboard });
  }

  async sendReplyKeyboard(ctx: ExtendedContext, text: string, buttons: string[][], options?: Partial<ReplyKeyboardMarkup>): Promise<void> {
    const keyboard = this.createReplyKeyboard(buttons, options);
    await ctx.reply(text, { reply_markup: keyboard });
  }

  async removeKeyboard(ctx: ExtendedContext, text: string): Promise<void> {
    await ctx.reply(text, { reply_markup: { remove_keyboard: true } });
  }
}

export default new ButtonService();
