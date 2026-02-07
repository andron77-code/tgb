/**
 * Демонстрация работы RAG системы
 * Показывает примеры семантического поиска по коду проекта
 */

import { ragSystem } from './index';

/**
 * Основная функция демонстрации RAG системы
 */
async function demonstrateRAG() {
  console.log('🚀 Демонстрация RAG системы для поиска по коду проекта\n');

  try {
    // Индексация проекта
    console.log('📚 Индексация проекта...');
    await ragSystem.indexProject();

    // Получение статистики
    const stats = ragSystem.getStats();
    console.log('\n📊 Статистика индексации:');
    console.log(`Всего фрагментов: ${stats.totalFragments}`);
    console.log('По типам:', stats.byType);

    // Примеры поисковых запросов
    const searchQueries = [
      'Telegram бот обработка сообщений',
      'Google Sheets API аутентификация',
      'Express сервер маршруты API',
      'создание элемента CRUD',
      'обработка ошибок middleware',
      'JWT токен генерация',
      'TypeScript интерфейсы',
      'дата форматирование',
    ];

    console.log('\n🔍 Примеры семантического поиска:\n');

    for (const query of searchQueries) {
      console.log(`\n📝 Запрос: "${query}"`);
      console.log('─'.repeat(50));

      try {
        const results = await ragSystem.search(query, 3);

        if (results.length === 0) {
          console.log('❌ Результаты не найдены');
          continue;
        }

        results.forEach((result, index) => {
          console.log(
            `\n${index + 1}. 🎯 ${result.relevance} (схожесть: ${(result.score * 100).toFixed(1)}%)`,
          );
          console.log(`📁 Файл: ${result.fragment.filePath}`);
          console.log(`📍 Строка: ${result.fragment.lineNumber}`);
          console.log(`🏷️  Тип: ${result.fragment.type}`);

          if (result.fragment.functionName) {
            console.log(`⚡ Функция: ${result.fragment.functionName}`);
          }

          if (result.fragment.className) {
            console.log(`🏛️  Класс: ${result.fragment.className}`);
          }

          // Показываем первые 100 символов контента
          const preview = result.fragment.content
            .substring(0, 100)
            .replace(/\s+/g, ' ')
            .trim();
          console.log(
            `📄 Предпросмотр: "${preview}${result.fragment.content.length > 100 ? '...' : ''}"`,
          );
        });
      } catch (error) {
        console.error(`❌ Ошибка при поиске:`, error);
      }
    }

    // Интерактивный режим
    console.log('\n\n🎮 Интерактивный режим поиска');
    console.log('Введите "exit" для выхода\n');

    // В реальном приложении здесь был бы readline для интерактивного ввода
    console.log(
      '💡 Для использования интерактивного режима интегрируйте этот код с readline или подобной библиотекой',
    );
  } catch (error) {
    console.error('❌ Ошибка при демонстрации RAG системы:', error);
  }
}

/**
 * Пример использования RAG системы в коде
 */
export async function searchCodeExample(query: string) {
  try {
    const results = await ragSystem.search(query, 5);

    return {
      query,
      results: results.map((result) => ({
        file: result.fragment.filePath,
        line: result.fragment.lineNumber,
        type: result.fragment.type,
        function: result.fragment.functionName,
        class: result.fragment.className,
        relevance: result.relevance,
        score: result.score,
        content: result.fragment.content,
      })),
    };
  } catch (error) {
    console.error('Ошибка поиска:', error);
    return {
      query,
      results: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Интеграция с Telegram ботом для поиска по коду
 */
export async function handleCodeSearchQuery(
  userQuery: string,
): Promise<string> {
  const searchResults = await searchCodeExample(userQuery);

  if (searchResults.results.length === 0) {
    return `❌ По запросу "${userQuery}" ничего не найдено. Попробуйте переформулировать запрос.`;
  }

  let response = `🔍 Результаты поиска по запросу "${userQuery}":\n\n`;

  searchResults.results.forEach((result, index) => {
    response += `${index + 1}. 📁 ${result.file}:${result.line}\n`;
    response += `   🏷️ ${result.type}`;

    if (result.function) {
      response += ` | ⚡ ${result.function}`;
    }

    if (result.class) {
      response += ` | 🏛️ ${result.class}`;
    }

    response += `\n   📊 ${result.relevance} (${(result.score * 100).toFixed(1)}%)\n`;

    // Добавляем предпросмотр кода
    const preview = result.content.substring(0, 80).replace(/\s+/g, ' ').trim();
    response += `   💡 "${preview}${result.content.length > 80 ? '...' : ''}"\n\n`;
  });

  return response;
}

// Запуск демонстрации если файл выполняется напрямую
if (require.main === module) {
  demonstrateRAG().catch(console.error);
}
