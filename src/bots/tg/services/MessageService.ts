/**
 * Заглушка для сервиса сообщений
 */

import { ExtendedContext } from '../types';

export class MessageService {
  async sendMessage(ctx: ExtendedContext, text: string, options?: any): Promise<void> {
    await ctx.reply(text, options);
  }

  async sendPhoto(ctx: ExtendedContext, photo: string, caption?: string): Promise<void> {
    await ctx.replyWithPhoto(photo, { caption });
  }

  async sendDocument(ctx: ExtendedContext, document: string, caption?: string): Promise<void> {
    await ctx.replyWithDocument(document, { caption });
  }

  async sendLocation(ctx: ExtendedContext, latitude: number, longitude: number): Promise<void> {
    await ctx.replyWithLocation(latitude, longitude);
  }

  async sendContact(ctx: ExtendedContext, phoneNumber: string, firstName: string, lastName?: string): Promise<void> {
    await ctx.replyWithContact(phoneNumber, firstName, lastName);
  }

  async editMessage(ctx: ExtendedContext, text: string, options?: any): Promise<void> {
    await ctx.editMessageText(text, options);
  }

  async deleteMessage(ctx: ExtendedContext): Promise<void> {
    await ctx.deleteMessage();
  }
}

export default new MessageService();
