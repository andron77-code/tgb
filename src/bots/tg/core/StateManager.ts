/**
 * Менеджер состояний - управление состояниями диалога с пользователем
 */

import { SessionData } from '../types';
import SessionManager from './SessionManager';
import { logger } from '../../../helpers';

export interface StateTransition {
  from: string;
  to: string;
  condition?: (session: SessionData) => boolean;
  action?: (session: SessionData) => Promise<void>;
}

export interface StateConfig {
  name: string;
  description?: string;
  entry?: (session: SessionData) => Promise<void>;
  exit?: (session: SessionData) => Promise<void>;
  timeout?: number; // TTL в секундах
  transitions?: StateTransition[];
}

export class StateManager {
  private sessionManager: SessionManager;
  private states: Map<string, StateConfig> = new Map();
  private defaultState: string = 'main';

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
    this.initializeDefaultStates();
  }

  // === Регистрация состояний ===

  registerState(config: StateConfig): void {
    this.states.set(config.name, config);
    logger.debug('State registered', { state: config.name });
  }

  registerStates(configs: StateConfig[]): void {
    for (const config of configs) {
      this.registerState(config);
    }
  }

  // === Управление состояниями ===

  async setState(chatId: number, stateName: string, data?: Record<string, any>): Promise<void> {
    try {
      const currentState = await this.sessionManager.getState(chatId);
      const targetState = this.states.get(stateName);

      if (!targetState) {
        throw new Error(`State '${stateName}' not found`);
      }

      // Проверяем возможность перехода
      if (currentState && !this.canTransition(currentState, stateName)) {
        throw new Error(`Cannot transition from '${currentState}' to '${stateName}'`);
      }

      // Выполняем выход из текущего состояния
      if (currentState) {
        const currentConfig = this.states.get(currentState);
        if (currentConfig?.exit) {
          const session = await this.sessionManager.getSession(chatId);
          if (session) {
            await currentConfig.exit(session);
          }
        }
      }

      // Устанавливаем новое состояние
      await this.sessionManager.setState(chatId, stateName, data);

      // Выполняем вход в новое состояние
      if (targetState.entry) {
        const session = await this.sessionManager.getSession(chatId);
        if (session) {
          await targetState.entry(session);
        }
      }

      // Устанавливаем TTL для состояния
      if (targetState.timeout) {
        // Временная реализация - в реальной системе нужно использовать setTimeout
        logger.debug('State timeout set', { 
          chatId, 
          state: stateName, 
          timeout: targetState.timeout 
        });
      }

      logger.info('State changed', { 
        chatId, 
        from: currentState, 
        to: stateName 
      });
    } catch (error) {
      logger.error('Error setting state:', error);
      throw error;
    }
  }

  async getState(chatId: number): Promise<string | null> {
    return await this.sessionManager.getState(chatId);
  }

  async resetState(chatId: number): Promise<void> {
    await this.setState(chatId, this.defaultState);
  }

  // === Проверка переходов ===

  private canTransition(fromState: string, toState: string): boolean {
    const fromConfig = this.states.get(fromState);
    
    if (!fromConfig?.transitions) {
      // Если переходы не определены, разрешаем любой переход
      return true;
    }

    return fromConfig.transitions.some(transition => 
      transition.to === toState && 
      (!transition.condition || true) // Временная реализация
    );
  }

  async canTransitionTo(chatId: number, toState: string): Promise<boolean> {
    const currentState = await this.sessionManager.getState(chatId);
    
    if (!currentState) {
      return true; // Из начального состояния можно перейти куда угодно
    }

    return this.canTransition(currentState, toState);
  }

  // === Работа с данными состояний ===

  async setStateData(chatId: number, key: string, value: any): Promise<void> {
    await this.sessionManager.setSessionData(chatId, key, value);
  }

  async getStateData(chatId: number, key?: string): Promise<any> {
    return await this.sessionManager.getSessionData(chatId, key);
  }

  async clearStateData(chatId: number, keys?: string[]): Promise<void> {
    await this.sessionManager.clearSessionData(chatId, keys);
  }

  // === Обработка таймаутов ===

  async handleStateTimeout(chatId: number): Promise<void> {
    try {
      const currentState = await this.sessionManager.getState(chatId);
      
      if (!currentState) {
        return;
      }

      const stateConfig = this.states.get(currentState);
      
      if (stateConfig?.exit) {
        const session = await this.sessionManager.getSession(chatId);
        if (session) {
          await stateConfig.exit(session);
        }
      }

      // Возвращаем в состояние по умолчанию
      await this.setState(chatId, this.defaultState, {
        timeoutReason: 'state_timeout',
        previousState: currentState,
      });

      logger.info('State timeout handled', { chatId, previousState: currentState });
    } catch (error) {
      logger.error('Error handling state timeout:', error);
    }
  }

  // === Получение информации о состояниях ===

  getStateInfo(stateName: string): StateConfig | undefined {
    return this.states.get(stateName);
  }

  getAllStates(): StateConfig[] {
    return Array.from(this.states.values());
  }

  getAvailableTransitions(stateName: string): string[] {
    const stateConfig = this.states.get(stateName);
    
    if (!stateConfig?.transitions) {
      return [];
    }

    return stateConfig.transitions
      .filter(transition => !transition.condition) // Временная реализация
      .map(transition => transition.to);
  }

  // === Инициализация состояний по умолчанию ===

  private initializeDefaultStates(): void {
    const defaultStates: StateConfig[] = [
      {
        name: 'main',
        description: 'Главное меню',
        entry: async (session) => {
          await this.sessionManager.setSessionData(session.chatId, 'lastMenuAccess', new Date().toISOString());
        },
        transitions: [
          { from: 'main', to: 'delivery_calculation' },
          { from: 'main', to: 'history' },
          { from: 'main', to: 'settings' },
          { from: 'main', to: 'help' },
        ],
      },
      {
        name: 'delivery_calculation',
        description: 'Расчет стоимости доставки',
        entry: async (session) => {
          await this.sessionManager.setSessionData(session.chatId, 'deliveryStep', 'origin');
        },
        transitions: [
          { from: 'delivery_calculation', to: 'main' },
          { from: 'delivery_calculation', to: 'delivery_results' },
        ],
      },
      {
        name: 'delivery_results',
        description: 'Результаты расчета доставки',
        timeout: 300, // 5 минут
        transitions: [
          { from: 'delivery_results', to: 'main' },
          { from: 'delivery_results', to: 'delivery_calculation' },
        ],
      },
      {
        name: 'history',
        description: 'История расчетов',
        transitions: [
          { from: 'history', to: 'main' },
        ],
      },
      {
        name: 'settings',
        description: 'Настройки',
        transitions: [
          { from: 'settings', to: 'main' },
        ],
      },
      {
        name: 'help',
        description: 'Справка',
        transitions: [
          { from: 'help', to: 'main' },
        ],
      },
    ];

    this.registerStates(defaultStates);
    logger.debug('Default states initialized');
  }

  // === Валидация состояний ===

  validateState(stateName: string): boolean {
    return this.states.has(stateName);
  }

  validateTransition(fromState: string, toState: string): boolean {
    return this.canTransition(fromState, toState);
  }

  // === Статистика состояний ===

  async getStateStatistics(): Promise<{
    totalStates: number;
    statesWithTimeout: number;
    averageTransitions: number;
    stateDistribution: Record<string, number>;
  }> {
    const states = this.getAllStates();
    const statesWithTimeout = states.filter(state => state.timeout).length;
    const totalTransitions = states.reduce((sum, state) => 
      sum + (state.transitions?.length || 0), 0);
    const averageTransitions = states.length > 0 ? totalTransitions / states.length : 0;

    // Временная реализация для распределения состояний
    const stateDistribution: Record<string, number> = {};
    for (const state of states) {
      stateDistribution[state.name] = 0;
    }

    return {
      totalStates: states.length,
      statesWithTimeout,
      averageTransitions,
      stateDistribution,
    };
  }

  // === Экспорт и импорт конфигурации ===

  exportStates(): Record<string, StateConfig> {
    const exported: Record<string, StateConfig> = {};
    
    this.states.forEach((config, name) => {
      exported[name] = { ...config };
    });

    return exported;
  }

  importStates(states: Record<string, StateConfig>): void {
    for (const [name, config] of Object.entries(states)) {
      this.registerState(config);
    }
    
    logger.info('States imported', { count: Object.keys(states).length });
  }

  // === Очистка ===

  clearStates(): void {
    this.states.clear();
    this.initializeDefaultStates();
    logger.info('States cleared and reinitialized');
  }

  removeState(stateName: string): boolean {
    if (stateName === this.defaultState) {
      throw new Error('Cannot remove default state');
    }

    const removed = this.states.delete(stateName);
    
    if (removed) {
      logger.info('State removed', { state: stateName });
    }

    return removed;
  }

  setDefaultState(stateName: string): void {
    if (!this.states.has(stateName)) {
      throw new Error(`State '${stateName}' not found`);
    }

    this.defaultState = stateName;
    logger.info('Default state changed', { state: stateName });
  }

  getDefaultState(): string {
    return this.defaultState;
  }
}

export default StateManager;
