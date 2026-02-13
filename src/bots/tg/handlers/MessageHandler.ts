/**
 * Заглушка для обработчика сообщений
 */

import { ExtendedContext } from '../types';

export class MessageHandler {
  async handleText(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📝 Текстовое сообщение получено (заглушка)');
  }

  async handlePhoto(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📷 Фото получено (заглушка)');
  }

  async handleVideo(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('🎥 Видео получено (заглушка)');
  }

  async handleDocument(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📄 Документ получен (заглушка)');
  }

  async handleAudio(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('🎵 Аудио получено (заглушка)');
  }

  async handleVoice(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('🎤 Голосовое сообщение получено (заглушка)');
  }

  async handleSticker(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('😄 Стикер получен (заглушка)');
  }

  async handleLocation(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📍 Геолокация получена (заглушка)');
  }

  async handleContact(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📞 Контакт получен (заглушка)');
  }

  async handlePoll(ctx: ExtendedContext): Promise<void> {
    await ctx.reply('📊 Опрос получен (заглушка)');
  }
}

export default new MessageHandler();
