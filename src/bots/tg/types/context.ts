/**
 * Расширенные типы для контекста Telegraf
 */

import { Context } from 'telegraf';
import { Update } from 'telegraf/types';
import DatabaseManager from '../core/DatabaseManager';
import SessionManager from '../core/SessionManager';
import StateManager from '../core/StateManager';
import { AuthResult } from '../services/AuthService';

export interface ExtendedContext extends Context<Update> {
  sessionManager?: SessionManager;
  stateManager?: StateManager;
  db?: DatabaseManager;
  auth?: AuthResult;
  callbackQuery: any;
}
