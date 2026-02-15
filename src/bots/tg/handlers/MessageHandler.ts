/**
 * Обработчик сообщений бота
 */

import { message } from 'telegraf/filters';
import { ExtendedContext } from '../types';


export class MessageHandler {
  async handleText(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('text' in ctx.message)) return;
    
    const text = ctx.message.text;
    
    console.log('Text message received', { 
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

  async handlePhoto(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('photo' in ctx.message)) return;
    
    console.log('Photo message received', { userId: ctx.from?.id });
    await ctx.reply('📷 Получено фото. В настоящее время обработка фото не поддерживается.');
  }

  async handleVideo(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('video' in ctx.message)) return;
    
    console.log('Video message received', { userId: ctx.from?.id });
    await ctx.reply('🎥 Получено видео. В настоящее время обработка видео не поддерживается.');
  }

  async handleDocument(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('document' in ctx.message)) return;
    
    console.log('Document message received', { userId: ctx.from?.id });
    await ctx.reply('📄 Получен документ. В настоящее время обработка документов не поддерживается.');
  }

  async handleAudio(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('audio' in ctx.message)) return;
    
    await ctx.reply('🎵 Аудио получено (заглушка)');
  }

  async handleVoice(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('voice' in ctx.message)) return;
    
    await ctx.reply('🎤 Голосовое сообщение получено (заглушка)');
  }

  async handleSticker(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('sticker' in ctx.message)) return;
    
    await ctx.reply('😄 Стикер получен (заглушка)');
  }

  async handleLocation(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('location' in ctx.message)) return;
    
    const location = ctx.message.location;
    await ctx.reply(`📍 Получена геолокация:
Широта: ${location.latitude}
Долгота: ${location.longitude}

Эту локацию можно использовать для расчета доставки 🚚`);
  }

  async handleContact(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('contact' in ctx.message)) return;
    
    const contact = ctx.message.contact;
    await ctx.reply(`📞 Получен контакт:
Имя: ${contact.first_name} ${contact.last_name || ''}
Телефон: ${contact.phone_number}

Контакт сохранен ✅`);
  }

  async handlePoll(ctx: ExtendedContext): Promise<void> {
    if (!ctx.message || !('poll' in ctx.message)) return;
    
    await ctx.reply('📊 Опрос получен. Спасибо за участие!');
  }
}

export default new MessageHandler();
