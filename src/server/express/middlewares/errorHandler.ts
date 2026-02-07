/**
 * Middleware для глобальной обработки ошибок Express приложения
 * Перехватывает все ошибки и формирует стандартизированные ответы
 */

// Импорт типов Express для работы с запросами и ответами
import { Request, Response, NextFunction } from 'express';

// Расширение интерфейса Error для поддержки статуса HTTP
export interface AppError extends Error {
  status?: number; // HTTP статус код ошибки
}

/**
 * Глобальный обработчик ошибок для Express приложения
 * Логирует ошибки и возвращает стандартизированный JSON ответ
 * @param err - Объект ошибки с опциональным статусом
 * @param req - Express запрос (для логирования)
 * @param res - Express ответ для отправки ошибки клиенту
 */
export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) => {
  // Логирование ошибки в консоль для отладки
  console.error(err);

  // Отправка ответа с ошибкой клиенту
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error', // Сообщение об ошибке
  });
};
