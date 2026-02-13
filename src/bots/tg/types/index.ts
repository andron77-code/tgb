/**
 * Основные типы для Telegram бота
 */

export interface BotConfig {
  token: string;
  webhookUrl?: string;
  polling?: boolean;
}

export interface User {
  id: number;
  isBot: boolean;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export interface Chat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface Message {
  messageId: number;
  from?: User;
  chat: Chat;
  date: number;
  text?: string;
  photo?: any[];
  video?: any;
  document?: any;
  audio?: any;
  voice?: any;
  sticker?: any;
  animation?: any;
  location?: Location;
  contact?: Contact;
  poll?: Poll;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Contact {
  userId?: number;
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  vcard?: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVoterCount: number;
  isClosed: boolean;
  isAnonymous: boolean;
  type: string;
  allowsMultipleAnswers: boolean;
}

export interface PollOption {
  text: string;
  voterCount: number;
}

export interface InlineKeyboardButton {
  text: string;
  callbackData?: string;
  url?: string;
  callbackGame?: any;
  switchInlineQuery?: string;
  switchInlineQueryCurrentChat?: string;
  pay?: boolean;
}

export interface ReplyKeyboardMarkup {
  keyboard: string[][];
  resizeKeyboard?: boolean;
  oneTimeKeyboard?: boolean;
  selective?: boolean;
  inputFieldPlaceholder?: string;
}

export interface SessionData {
  userId: number;
  chatId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  state?: string;
  data?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface DeliveryRequest {
  from: {
    city: string;
    address?: string;
    postalCode?: string;
  };
  to: {
    city: string;
    address?: string;
    postalCode?: string;
  };
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  declaredValue?: number;
}

export interface DeliveryResponse {
  service: string;
  cost: number;
  deliveryTime: string;
  trackingUrl?: string;
  pickupPoints?: PickupPoint[];
}

export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  workHours: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface UserRole {
  userId: number;
  roleId: string;
  assignedAt: Date;
  assignedBy: number;
}

export type HandlerFunction = (ctx: any) => Promise<void>;
export type MiddlewareFunction = (ctx: any, next: () => Promise<void>) => Promise<void>;

// Экспорт ExtendedContext
export { ExtendedContext } from './context';
