/**
 * Основной файл приложения Express сервера
 * Конфигурирует middleware, маршруты и обработчики ошибок
 */

// Импорт фреймворка Express для создания веб-сервера
import express from 'express';
// Импорт маршрутов для работы с элементами API
import itemRoutes from './routes/index';
// Импорт глобального обработчика ошибок
import { errorHandler } from './middlewares/errorHandler';

// Создание экземпляра приложения Express
const app = express();

// Middleware для парсинга JSON тела запросов
app.use(express.json());

// Подключение маршрутов API для работы с элементами
app.use('/api/items', itemRoutes);

// Глобальный обработчик ошибок (должен быть после всех маршрутов)
app.use(errorHandler);

// Экспорт приложения для использования в других модулях
export default app;
