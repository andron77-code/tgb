import { UmRag } from './UmRag';
// import path from 'path';
// ----------------------------
// Пример использования класса UmRag
// ----------------------------
async function example() {
  try {
    // Пример с локальным файлом
    const catalogPath = "../data/um-catalog.xml";
    console.log("Путь к файлу каталога:", catalogPath);
    const ragLocal = new UmRag(catalogPath, {
      topK: 3, // количество извлекаемых документов
      maxTokens: 200, // максимальное количество токенов в ответе
      temperature: 0.2, // температура для генерации
    });

    // Инициализация системы
    await ragLocal.initialize();
    console.log(`Загружено продуктов (локально): ${ragLocal.getProductsCount()}`);

    // Пример с удаленным XML файлом
    // const ragRemote = new UmRag("https://example.com/catalog.xml", {
    //   topK: 2,
    //   maxTokens: 150,
    //   temperature: 0.3,
    // });

    // Раскомментируйте для тестирования удаленного загрузки
    // await ragRemote.initialize();
    // console.log(`Загружено продуктов (удаленно): ${ragRemote.getProductsCount()}`);

    // Примеры запросов
    const questions = [
      "Какие алюминиевые профили подходят для станков с ЧПУ?",
      "Найдите профили с размером 90x90",
      "Какие профили имеют анодированное покрытие?",
      "Цена на алюминиевые профили для столов",
      "Посоветуйте профиль для рабочего стола",
      "Что такое Т-паз 8 мм?",
    ];

    // Обработка запросов
    for (const question of questions) {
      console.log(`\nВопрос: ${question}`);
      console.log("-".repeat(50));
      
      try {
        const answer = await ragLocal.ask(question);
        console.log(`Ответ: ${answer}`);
      } catch (error) {
        console.error(`Ошибка при обработке запроса: ${error}`);
      }
      
      console.log("=".repeat(50));
    }

  } catch (error) {
    console.error("Ошибка при инициализации UmRag:", error);
  }
}

// Запуск примера
example().catch(console.error);
