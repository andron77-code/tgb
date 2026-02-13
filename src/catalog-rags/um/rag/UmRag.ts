import * as fs from "fs";
import { XMLParser } from "fast-xml-parser";
import { pipeline } from "@xenova/transformers";
import HTTPQuery, { type THttpQuery } from "@/apis/http/index";
import * as path from 'path';
import { removeTags } from "src/utils/removeTags";
// ----------------------------
// Тип продукта
// ----------------------------
interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: string;
  description: string;
  vendorCode?: string;
}

// ----------------------------
// Конфигурация класса
// ----------------------------
interface UmRagConfig {
  embeddingModel?: string;
  generationModel?: string;
  maxTokens?: number;
  temperature?: number;
  topK?: number;
}

// ----------------------------
// Класс UmRag для RAG системы
// ----------------------------
export class UmRag {

  private _httpQuery: THttpQuery;

  private catalogPath: string;
  private config: Required<UmRagConfig>;

  private products: Product[] = [];
  private documents: string[] = [];
  private embeddings: number[][] = [];
  private embedder: any = null;
  private generator: any = null;
  private initialized = false;

  constructor(catalogPath: string, config: UmRagConfig = {}) {

    this._httpQuery = HTTPQuery

    this.catalogPath = catalogPath;
    this.config = {
      embeddingModel: config.embeddingModel || "Xenova/distiluse-base-multilingual-cased-v2",
      generationModel: config.generationModel || "Xenova/distilgpt2",
      maxTokens: config.maxTokens || 1000,
      temperature: config.temperature || 0.3,
      topK: config.topK || 3,
    };
  }

  // ----------------------------
  // Cosine similarity
  // ----------------------------
  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dot / (normA * normB);
  }

  // ----------------------------
  // 1. Парсинг XML
  // ----------------------------
  private async loadCatalog(): Promise<Product[]> {
    let xml: string;

    // Проверяем, является ли путь URL
    if (this.catalogPath.startsWith('http://') || this.catalogPath.startsWith('https://')) {
      // Загрузка XML по HTTP
      try {
        const response = await this._httpQuery.get<string>(this.catalogPath, {
          headers: {
            'Accept': 'application/xml, text/xml, */*',
            'User-Agent': 'UmRag/1.0'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ошибка ${response.status}: ${response.statusText}`);
        }

        xml = response.data as string;
      } catch (error) {
        throw new Error(`Ошибка при загрузке XML по HTTP: ${error}`);
      }
    } else {
      const catalogPath = path.resolve(__dirname, this.catalogPath);
      // Загрузка XML из файла
      if (!fs.existsSync(catalogPath)) {
        throw new Error(`Файл каталога не найден: ${catalogPath}`);
      }

    
      xml = fs.readFileSync(catalogPath, "utf-8");
    }

    // Парсинг XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });

    const json = parser.parse(xml);

    // Поддержка разных структур XML
    if (json.yml_catalog?.shop?.offers?.offer) {
      // YML формат
      const offers = Array.isArray(json.yml_catalog.shop.offers.offer)
        ? json.yml_catalog.shop.offers.offer
        : [json.yml_catalog.shop.offers.offer];

      return offers.map((offer: any) => ({
        id: offer.id?.toString() || "",
        name: offer.name || "",
        category: offer.categoryId?.toString() || "",
        categoryId: offer.categoryId?.toString() || "",
        price: offer.price?.toString() || "",
        vendorCode: offer.vendorCode || "",
        description: removeTags(offer.description || "")  || "",
      }));
    } else if (json.catalog?.product) {
      // Простой формат catalog.product
      return Array.isArray(json.catalog.product)
        ? json.catalog.product
        : [json.catalog.product];
    } else {
      throw new Error("Неизвестный формат XML каталога");
    }
  }

  // ----------------------------
  // 2. Подготовка документов
  // ----------------------------
  private buildDocuments(products: Product[]): string[] {
    return products.map((p) => `
Товар: ${p.name}
Артикул: ${p.vendorCode || 'Не указан'}
Категория: ${p.categoryId}
Цена: ${p.price} руб.
Описание: ${p.description}
`);
  }

  // ----------------------------
  // 3. Инициализация моделей
  // ----------------------------
  private async initializeModels(): Promise<void> {
    try {
      this.embedder = await pipeline(
        "feature-extraction",
        this.config.embeddingModel
      );

      this.generator = await pipeline(
        "text-generation",
        this.config.generationModel
      );
    } catch (error) {
      throw new Error(`Ошибка при инициализации моделей: ${error}`);
    }
  }

  // ----------------------------
  // 4. Создание эмбеддингов
  // ----------------------------
  private async createEmbeddings(): Promise<void> {
    if (!this.embedder) {
      throw new Error("Модель эмбеддингов не инициализирована");
    }

    this.embeddings = [];

    // Создаем эмбеддинги параллельно для ускорения
    const batchSize = 10; // Обрабатываем по 10 документов за раз
    for (let i = 0; i < this.documents.length; i += batchSize) {
      const batch = this.documents.slice(i, i + batchSize);
      
      try {
        const batchPromises = batch.map(async (doc) => {
          const output = await this.embedder(doc, { pooling: "mean", normalize: true });
          return Array.from(output.data) as number[];
        });
        
        const batchEmbeddings = await Promise.all(batchPromises);
        this.embeddings.push(...batchEmbeddings);
        
        console.log(`Обработано ${Math.min(i + batchSize, this.documents.length)}/${this.documents.length} документов`);
      } catch (error) {
        console.warn(`Ошибка при создании эмбеддингов для батча: ${error}`);
        // Добавляем пустые векторы чтобы сохранить соответствие индексов
        const emptyVectors = Array(Math.min(batchSize, this.documents.length - i))
          .fill(null)
          .map(() => new Array(512).fill(0)); // размерность для distiluse-base-multilingual
        this.embeddings.push(...emptyVectors);
      }
    }
  }

  // ----------------------------
  // Основная функция инициализации
  // ----------------------------
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Загрузка и подготовка данных
      this.products = await this.loadCatalog();
      console.log(`UmRag загрузил список offres из каталога. Загружено ${this.products.length} продуктов.`);
      console.log('Пример offres:');
      console.log(this.products);
      
      this.documents = this.buildDocuments(this.products);

      // Инициализация моделей
      await this.initializeModels();

      // Создание эмбеддингов
      await this.createEmbeddings();

      this.initialized = true;
      console.log(`UmRag инициализирован. Загружено ${this.products.length} продуктов.`);
    } catch (error) {
      throw new Error(`Ошибка при инициализации UmRag: ${error}`);
    }
  }

  // ----------------------------
  // RAG функция запроса
  // ----------------------------
  async ask(question: string, topK?: number): Promise<string> {
    if (!this.initialized) {
      throw new Error("UmRag не инициализирован. Вызовите метод initialize() сначала.");
    }

    const k = topK ?? this.config.topK;

    try {
      // Создание эмбеддинга для запроса
      const queryEmbeddingOutput = await this.embedder(question, {
        pooling: "mean",
        normalize: true,
      });

      const queryEmbedding = Array.from(queryEmbeddingOutput.data) as number[];

      // Поиск похожих документов
      const scores = this.embeddings.map((emb, index) => ({
        index,
        score: this.cosineSimilarity(queryEmbedding, emb),
      }));

      // Фильтрация по порогу схожести (только релевантные результаты)
      const minSimilarity = 0.1; // Снижаем порог для лучших результатов
      const filteredScores = scores.filter(s => s.score > minSimilarity);

      // Сортировка по релевантности
      filteredScores.sort((a, b) => b.score - a.score);

      const topDocs = filteredScores.slice(0, k).map(s => this.documents[s.index]);
      
      if (topDocs.length === 0) {
        // Если ничего не найдено, попробуем без порога
        const fallbackScores = scores.sort((a, b) => b.score - a.score).slice(0, k);
        const fallbackDocs = fallbackScores.map(s => this.documents[s.index]);
        const context = fallbackDocs.join("\n");
        
        // Формирование промпта для случая без точных совпадений
        const prompt = `
Ты профессиональный ассистент по каталогу алюминиевых профилей и комплектующих компании "Умные машины".

ВНИМАНИЕ: Точные совпадения не найдены. Попробуй найти похожие товары в контексте.

Контекст (похожие товары):
${context}

Вопрос клиента: ${question}

Ответ:
`;
        
        // Генерация ответа
        const result = await this.generator(prompt, {
          max_new_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        });

        let answer = result[0].generated_text;
        answer = answer.replace(/Ответ:\s*$/, '').trim();
        
        return answer || "К сожалению, по вашему запросу ничего не найдено в каталоге.";
      }

      const context = topDocs.join("\n");

      // Формирование промпта
      const prompt = `
Ты профессиональный ассистент по каталогу алюминиевых профилей и комплектующих компании "Умные машины".

АНАЛИЗ ЗАПРОСА:
${question}

ДОСТУПНЫЕ ТОВАРЫ (из каталога):
${context}

ИНСТРУКЦИИ:
1. Проанализируй товары в контексте
2. Найди прямые соответствия запросу
3. Если точных совпадений нет, предложи похожие варианты
4. Укажи артикулы, цены и характеристики
5. Отвечай на русском языке
6. Будь краток, но исчерпывающ

ОТВЕТ:
`;

      // Генерация ответа
      const result = await this.generator(prompt, {
        max_new_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      let answer = result[0].generated_text;
      
      // Постобработка ответа
      answer = answer.replace(/ОТВЕТ:\s*$/, '').trim(); // Удаляем "ОТВЕТ:" в конце
      answer = answer.replace(/Ответ:\s*$/, '').trim(); // Удаляем "Ответ:" в конце
      
      // Если ответ пустой или слишком короткий, возвращаем заглушку
      if (!answer || answer.length < 10) {
        return "К сожалению, не удалось найти точную информацию по вашему запросу. Попробуйте переформулировать вопрос или свяжитесь с нашими специалистами.";
      }
      
      return answer;
    } catch (error) {
      throw new Error(`Ошибка при обработке запроса: ${error}`);
    }
  }

  // ----------------------------
  // Получение информации
  // ----------------------------
  getProductsCount(): number {
    return this.products.length;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getConfig(): Readonly<Required<UmRagConfig>> {
    return this.config;
  }
}
