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
  price: string;
  description: string;
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
      embeddingModel: config.embeddingModel || "Xenova/all-MiniLM-L6-v2",
      generationModel: config.generationModel || "Xenova/distilgpt2",
      maxTokens: config.maxTokens || 550,
      temperature: config.temperature || 0.7,
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
        price: offer.price?.toString() || "",
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
ID: ${p.id}
Название: ${p.name}
Категория: ${p.category}
Цена: ${p.price}
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

    for (const doc of this.documents) {
      try {
        const output = await this.embedder(doc, { pooling: "mean", normalize: true });
        this.embeddings.push(Array.from(output.data) as number[]);
      } catch (error) {
        console.warn(`Ошибка при создании эмбеддинга для документа: ${error}`);
        // Добавляем пустой вектор чтобы сохранить соответствие индексов
        this.embeddings.push(new Array(384).fill(0)); // размерность для all-MiniLM-L6-v2
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
      // await this.initializeModels();

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

      // Сортировка по релевантности
      scores.sort((a, b) => b.score - a.score);

      const topDocs = scores.slice(0, k).map(s => this.documents[s.index]);
      const context = topDocs.join("\n");
      
      return context

      // Формирование промпта
      const prompt = `
Ты ассистент по каталогу.
Отвечай только на основе контекста.
Если данных нет — скажи, что товара нет.

Контекст:
${context}

Вопрос:
${question}

Ответ:
`;

      // Генерация ответа
      const result = await this.generator(prompt, {
        max_new_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });

      return result[0].generated_text;
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
