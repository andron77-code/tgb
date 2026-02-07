/**
 * Контроллеры для обработки HTTP запросов к API элементов
 * Реализуют CRUD операции (Create, Read, Update, Delete)
 */

// Импорт типов Express для работы с запросами и ответами
import { Request, Response, NextFunction } from 'express';
// Импорт моделей данных и начальных значений
import { items, Item } from '../models/item';

/**
 * Создание нового элемента
 * POST /api/items
 * @param req - Express запрос с телом содержащим name
 * @param res - Express ответ для возврата созданного элемента
 * @param next - Функция для передачи ошибки следующему middleware
 */
export const createItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Извлечение названия элемента из тела запроса
    const { name } = req.body;
    // Создание нового элемента с уникальным ID на основе времени
    const newItem: Item = { id: Date.now(), name };
    // Добавление элемента в массив
    items.push(newItem);
    // Отправка созданного элемента со статусом 201 (Created)
    res.status(201).json(newItem);
  } catch (error) {
    // Передача ошибки в глобальный обработчик
    next(error);
  }
};

/**
 * Получение всех элементов
 * GET /api/items
 * @param req - Express запрос
 * @param res - Express ответ с массивом всех элементов
 * @param next - Функция для передачи ошибки следующему middleware
 */
export const getItems = (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Отправка всех элементов в формате JSON
    res.json(items);
  } catch (error) {
    // Передача ошибки в глобальный обработчик
    next(error);
  }
};

/**
 * Получение элемента по ID
 * GET /api/items/:id
 * @param req - Express запрос с параметром id
 * @param res - Express ответ с найденным элементом или ошибкой
 * @param next - Функция для передачи ошибки следующему middleware
 */
export const getItemById = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Парсинг ID из параметров URL
    const id = parseInt(req.params.id as string, 10);
    // Поиск элемента по ID
    const item = items.find((i) => i.id === id);

    // Проверка наличия элемента
    if (!item) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    // Отправка найденного элемента
    res.json(item);
  } catch (error) {
    // Передача ошибки в глобальный обработчик
    next(error);
  }
};

/**
 * Обновление существующего элемента
 * PUT /api/items/:id
 * @param req - Express запрос с параметром id и телом содержащим name
 * @param res - Express ответ с обновленным элементом
 * @param next - Функция для передачи ошибки следующему middleware
 */
export const updateItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Парсинг ID из параметров URL
    const id = parseInt(req.params.id as string, 10);
    // Извлечение нового названия из тела запроса
    const { name } = req.body;

    // Поиск индекса элемента для обновления
    const itemIndex = items.findIndex((i) => i.id === id);

    // Проверка наличия элемента
    if (itemIndex === -1) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    // Обновление названия элемента
    items[itemIndex].name = name;
    // Отправка обновленного элемента
    res.json(items[itemIndex]);
  } catch (error) {
    // Передача ошибки в глобальный обработчик
    next(error);
  }
};

/**
 * Удаление элемента по ID
 * DELETE /api/items/:id
 * @param req - Express запрос с параметром id
 * @param res - Express ответ с удаленным элементом
 * @param next - Функция для передачи ошибки следующему middleware
 */
export const deleteItem = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Парсинг ID из параметров URL
    const id = parseInt(req.params.id as string, 10);

    // Поиск индекса элемента для удаления
    const itemIndex = items.findIndex((i) => i.id === id);

    // Проверка наличия элемента
    if (itemIndex === -1) {
      res.status(404).json({ message: 'Item not found' });
      return;
    }

    // Удаление элемента и сохранение удаленного объекта для ответа
    const deletedItem = items.splice(itemIndex, 1)[0];
    // Отправка удаленного элемента
    res.json(deletedItem);
  } catch (error) {
    // Передача ошибки в глобальный обработчик
    next(error);
  }
};
