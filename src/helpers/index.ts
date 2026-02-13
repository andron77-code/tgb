/**
 * Вспомогательные утилиты проекта
 * Предоставляют функции для работы с датами, логированием и другими общими задачами
 */

import dayjs from 'dayjs';
import ruLocale from 'dayjs/locale/ru';

// Установка русской локали для dayjs по умолчанию
dayjs.locale(ruLocale);

// Экспорт настроенного экземпляра dayjs
export default dayjs;

/**
 * Интерфейс для логгера
 * Предоставляет методы для вывода сообщений разных уровней
 */
export interface Logger {
  log(message: string, ...args: unknown[]): void; // Информационное сообщение
  error(message: string, ...args: unknown[]): void; // Сообщение об ошибке
  warn(message: string, ...args: unknown[]): void; // Предупреждение
  info(message: string, ...args: unknown[]): void; // Информация
  debug(message: string, ...args: unknown[]): void; // Отладочная информация
}

/**
 * Логгер на основе console
 * Использует стандартные методы console для вывода сообщений
 */
export const logger: Logger = {
  /**
   * Вывод информационного сообщения
   * @param message - Текст сообщения
   * @param args - Дополнительные аргументы для вывода
   */
  log(message: string, ...args: unknown[]): void {
    console.log(`[LOG] ${new Date().toISOString()} - ${message}`, ...args);
  },

  /**
   * Вывод сообщения об ошибке
   * @param message - Текст ошибки
   * @param args - Дополнительные аргументы для вывода
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },

  /**
   * Вывод предупреждения
   * @param message - Текст предупреждения
   * @param args - Дополнительные аргументы для вывода
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },

  /**
   * Вывод информационного сообщения
   * @param message - Текст сообщения
   * @param args - Дополнительные аргументы для вывода
   */
  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },

  /**
   * Вывод отладочной информации
   * @param message - Текст отладочного сообщения
   * @param args - Дополнительные аргументы для вывода
   */
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
  },
};

/**
 * Утилиты для работы с датами
 */
export const dateUtils = {
  /**
   * Форматирование даты в российский формат
   * @param date - Дата для форматирования
   * @param format - Формат даты (по умолчанию 'D MMM YYYY')
   * @returns Отформатированная строка даты
   */
  formatDate(
    date: Date | string = new Date(),
    format: string = 'D MMM YYYY',
  ): string {
    return dayjs(date).format(format);
  },

  /**
   * Получение текущей даты в формате ISO
   * @returns Текущая дата в формате ISO string
   */
  now(): string {
    return dayjs().toISOString();
  },

  /**
   * Проверка, является ли дата валидной
   * @param date - Дата для проверки
   * @returns true если дата валидна, иначе false
   */
  isValid(date: Date | string | number): boolean {
    return dayjs(date).isValid();
  },

  /**
   * Добавление времени к дате
   * @param date - Исходная дата
   * @param amount - Количество единиц времени
   * @param unit - Единица времени (day, month, year, hour, minute, second)
   * @returns Новая дата с добавленным временем
   */
  addTime(
    date: Date | string,
    amount: number,
    unit: dayjs.ManipulateType,
  ): Date {
    return dayjs(date).add(amount, unit).toDate();
  },
};

/**
 * Утилиты для работы со строками
 */
export const stringUtils = {
  /**
   * Преобразование строки в camelCase
   * @param str - Исходная строка
   * @returns Строка в camelCase
   */
  toCamelCase(str: string): string {
    return str.replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace('-', '').replace('_', ''),
    );
  },

  /**
   * Преобразование строки в snake_case
   * @param str - Исходная строка
   * @returns Строка в snake_case
   */
  toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  },

  /**
   * Генерация случайной строки
   * @param length - Длина строки
   * @returns Случайная строка указанной длины
   */
  random(length: number = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};

/**
 * Утилиты для работы с объектами
 */
export const objectUtils = {
  /**
   * Глубокое слияние объектов
   * @param target - Целевой объект
   * @param sources - Исходные объекты для слияния
   * @returns Объединенный объект
   */
  deepMerge<T extends Record<string, unknown>>(
    target: T,
    ...sources: Partial<T>[]
  ): T {
    if (!sources.length) return target;
    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>,
          );
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  },

  /**
   * Проверка, является ли значение объектом
   * @param item - Значение для проверки
   * @returns true если значение является объектом
   */
  isObject(item: unknown): item is Record<string, unknown> {
    return item !== null && typeof item === 'object' && !Array.isArray(item);
  },
};

// Экспорт утилит по умолчанию для обратной совместимости
export { logger as console };



export function removeTags(
  input: string,
  tags?: string | string[]
): string {
  if (!input) return input;

  // Если аргумент не передан — удаляем все HTML-теги
  if (!tags) {
    return input.replace(/<\/?[^>]+>/gi, "");
  }

  // Приводим к массиву
  const tagList = Array.isArray(tags) ? tags : [tags];

  let result = input;

  for (const tag of tagList) {
    const tagName = tag.trim();

    // Удаление открывающих и закрывающих тегов
    const regex = new RegExp(
      `<\\/?${tagName}\\b[^>]*>`,
      "gi"
    );

    result = result.replace(regex, "");
  }

  return result;
}

