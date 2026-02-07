/**
 * Маршруты API для работы с элементами
 * Определяют эндпоинты REST API и связывают их с контроллерами
 */

// Импорт роутера Express для определения маршрутов
import { Router } from 'express';
// Импорт всех контроллеров для обработки запросов
import {
  createItem, // Создание элемента
  getItems, // Получение всех элементов
  getItemById, // Получение элемента по ID
  updateItem, // Обновление элемента
  deleteItem, // Удаление элемента
} from '../constrollers/index';

// Создание экземпляра роутера
const router = Router();

// Определение маршрутов REST API

// GET /api/items - Получение всех элементов
router.get('/', getItems);

// GET /api/items/:id - Получение элемента по ID
router.get('/:id', getItemById);

// POST /api/items - Создание нового элемента
router.post('/', createItem);

// PUT /api/items/:id - Обновление существующего элемента
router.put('/:id', updateItem);

// DELETE /api/items/:id - Удаление элемента
router.delete('/:id', deleteItem);

// Экспорт роутера для подключения в основном приложении
export default router;
