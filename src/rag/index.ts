/**
 * RAG (Retrieval-Augmented Generation) система для семантического поиска по коду проекта
 * Позволяет находить релевантные участки кода по запросам на русском языке
 */

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Интерфейс для представления фрагмента кода
interface CodeFragment {
  id: string;
  filePath: string;
  content: string;
  functionName?: string;
  className?: string;
  lineNumber: number;
  type: 'function' | 'class' | 'interface' | 'variable' | 'comment' | 'import';
  embedding?: number[];
}

// Интерфейс для результата поиска
interface SearchResult {
  fragment: CodeFragment;
  score: number;
  relevance: string;
}

/**
 * Основной класс RAG системы
 */
export class RAGSystem {
  private fragments: CodeFragment[] = [];
  private embeddingDimension: number = 384; // Стандартный размер для небольших моделей

  constructor() {
    console.log('🔍 Инициализация RAG системы для поиска по коду...');
  }

  /**
   * Простая векторизация текста на основе TF-IDF и хэшей
   В реальном проекте здесь должна быть интеграция с моделью embeddings
   */
  private generateEmbedding(text: string): number[] {
    // Нормализация текста
    const normalized = text.toLowerCase().replace(/[^а-яёa-z0-9\s]/g, ' ');
    const words = normalized.split(/\s+/).filter((word) => word.length > 2);

    // Создаем простое векторное представление на основе хэшей слов
    const embedding = new Array(this.embeddingDimension).fill(0);

    words.forEach((word) => {
      const hash = crypto.createHash('md5').update(word).digest('hex');
      const index =
        parseInt(hash.substring(0, 8), 16) % this.embeddingDimension;
      embedding[index] += 1;
    });

    // Нормализация вектора
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0),
    );
    return magnitude > 0 ? embedding.map((val) => val / magnitude) : embedding;
  }

  /**
   * Извлечение фрагментов кода из TypeScript файла
   */
  private async extractFragments(filePath: string): Promise<CodeFragment[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    const fragments: CodeFragment[] = [];

    let currentFunction: { name: string; startLine: number } | null = null;
    let currentClass: { name: string; startLine: number } | null = null;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const lineNumber = index + 1;

      // Поиск функций
      const functionMatch = trimmed.match(
        /(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      );
      if (functionMatch) {
        currentFunction = { name: functionMatch[1], startLine: lineNumber };
      }

      // Поиск методов классов
      const methodMatch = trimmed.match(/(?:async\s+)?(\w+)\s*\(/);
      if (methodMatch && currentClass && !trimmed.includes('//')) {
        fragments.push({
          id: `${filePath}-${lineNumber}`,
          filePath,
          content: line,
          functionName: methodMatch[1],
          className: currentClass.name,
          lineNumber,
          type: 'function',
        });
      }

      // Поиск классов
      const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
      if (classMatch) {
        currentClass = { name: classMatch[1], startLine: lineNumber };
        fragments.push({
          id: `${filePath}-${lineNumber}`,
          filePath,
          content: line,
          className: classMatch[1],
          lineNumber,
          type: 'class',
        });
      }

      // Поиск интерфейсов
      const interfaceMatch = trimmed.match(/(?:export\s+)?interface\s+(\w+)/);
      if (interfaceMatch) {
        fragments.push({
          id: `${filePath}-${lineNumber}`,
          filePath,
          content: line,
          functionName: interfaceMatch[1],
          lineNumber,
          type: 'interface',
        });
      }

      // Поиск импортов
      if (trimmed.startsWith('import ')) {
        fragments.push({
          id: `${filePath}-${lineNumber}`,
          filePath,
          content: line,
          lineNumber,
          type: 'import',
        });
      }

      // Поиск комментариев
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
        fragments.push({
          id: `${filePath}-${lineNumber}`,
          filePath,
          content: line,
          lineNumber,
          type: 'comment',
        });
      }

      // Завершение функции
      if (currentFunction && trimmed.includes('}')) {
        const functionContent = lines
          .slice(currentFunction.startLine - 1, lineNumber)
          .join('\n');

        fragments.push({
          id: `${filePath}-${currentFunction.startLine}`,
          filePath,
          content: functionContent,
          functionName: currentFunction.name,
          lineNumber: currentFunction.startLine,
          type: 'function',
        });

        currentFunction = null;
      }
    });

    return fragments;
  }

  /**
   * Индексация всех TypeScript файлов в проекте
   */
  async indexProject(): Promise<void> {
    console.log('📚 Начало индексации проекта...');

    const srcDir = path.join(process.cwd(), 'src');
    const files = await this.getAllTsFiles(srcDir);

    console.log(`🔍 Найдено ${files.length} TypeScript файлов`);

    for (const filePath of files) {
      try {
        const fragments = await this.extractFragments(filePath);
        this.fragments.push(...fragments);
        console.log(
          `✅ Обработан файл: ${path.relative(process.cwd(), filePath)}`,
        );
      } catch (error) {
        console.error(`❌ Ошибка при обработке файла ${filePath}:`, error);
      }
    }

    // Генерация embeddings для всех фрагментов
    console.log('🧠 Генерация векторных представлений...');
    this.fragments.forEach((fragment) => {
      fragment.embedding = this.generateEmbedding(fragment.content);
    });

    console.log(
      `✅ Индексация завершена. Проиндексировано ${this.fragments.length} фрагментов кода`,
    );
  }

  /**
   * Рекурсивный поиск всех TypeScript файлов
   */
  private async getAllTsFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await this.getAllTsFiles(fullPath)));
      } else if (entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Семантический поиск по коду
   */
  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    if (this.fragments.length === 0) {
      await this.indexProject();
    }

    console.log(`🔍 Поиск по запросу: "${query}"`);

    const queryEmbedding = this.generateEmbedding(query);
    const results: SearchResult[] = [];

    // Расчет схожести для каждого фрагмента
    this.fragments.forEach((fragment) => {
      if (!fragment.embedding) return;

      const similarity = this.cosineSimilarity(
        queryEmbedding,
        fragment.embedding,
      );

      if (similarity > 0.1) {
        // Порог схожести
        results.push({
          fragment,
          score: similarity,
          relevance: this.getRelevanceDescription(similarity),
        });
      }
    });

    // Сортировка по релевантности
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  /**
   * Расчет косинусного сходства между векторами
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    return normA === 0 || normB === 0 ? 0 : dotProduct / (normA * normB);
  }

  /**
   * Описание уровня релевантности
   */
  private getRelevanceDescription(score: number): string {
    if (score > 0.8) return 'Высокая релевантность';
    if (score > 0.6) return 'Средняя релевантность';
    if (score > 0.4) return 'Низкая релевантность';
    return 'Минимальная релевантность';
  }

  /**
   * Получение статистики индексации
   */
  getStats(): { totalFragments: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};

    this.fragments.forEach((fragment) => {
      byType[fragment.type] = (byType[fragment.type] || 0) + 1;
    });

    return {
      totalFragments: this.fragments.length,
      byType,
    };
  }
}

// Экспорт экземпляра RAG системы для использования в проекте
export const ragSystem = new RAGSystem();
