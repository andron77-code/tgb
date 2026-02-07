/**
 * Универсальный HTTP клиент для выполнения запросов к различным API
 * Поддерживает основные HTTP методы и гибкую настройку заголовков
 */

export interface HTTPQueryOptions {
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
}

export interface HTTPResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
  headers: Headers;
}

/**
 * Класс для выполнения HTTP запросов с поддержкой основных методов
 */
class HTTPQuery {
  private baseURL?: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL?: string, defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
  }

  /**
   * Выполнение HTTP запроса
   * @param method - HTTP метод
   * @param url - URL эндпоинта
   * @param options - Опции запроса (заголовки, тело, параметры)
   * @returns Ответ от API
   */
  private async request<T = unknown>(
    method: string,
    url: string,
    options: HTTPQueryOptions = {}
  ): Promise<HTTPResponse<T>> {
    const { headers = {}, body, params } = options;

    // Формирование полного URL
    let fullUrl = url;
    if (this.baseURL && !url.startsWith('http')) {
      fullUrl = `${this.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }

    // Добавление query параметров
    if (params) {
      const searchParams = new URLSearchParams(params);
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl += `${separator}${searchParams.toString()}`;
    }

    // Подготовка заголовков
    const requestHeaders = new Headers({
      ...this.defaultHeaders,
      ...headers,
    });

    // Подготовка опций запроса
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // Добавление тела запроса для методов, которые его поддерживают
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      if (typeof body === 'string') {
        fetchOptions.body = body;
      } else {
        fetchOptions.body = JSON.stringify(body);
        if (!requestHeaders.has('Content-Type')) {
          requestHeaders.set('Content-Type', 'application/json');
        }
      }
    }

    // Выполнение запроса
    const response = await fetch(fullUrl, fetchOptions);

    // Определение типа ответа
    let data: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      data = (await response.json()) as T;
    } else {
      data = (await response.text()) as T;
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers,
    };
  }

  /**
   * Выполнение GET запроса
   * @param url - URL эндпоинта
   * @param options - Опции запроса
   * @returns Ответ от API
   */
  async get<T = unknown>(url: string, options?: HTTPQueryOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('GET', url, options);
  }

  /**
   * Выполнение POST запроса
   * @param url - URL эндпоинта
   * @param options - Опции запроса
   * @returns Ответ от API
   */
  async post<T = unknown>(url: string, options?: HTTPQueryOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('POST', url, options);
  }

  /**
   * Выполнение PUT запроса
   * @param url - URL эндпоинта
   * @param options - Опции запроса
   * @returns Ответ от API
   */
  async put<T = unknown>(url: string, options?: HTTPQueryOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('PUT', url, options);
  }

  /**
   * Выполнение DELETE запроса
   * @param url - URL эндпоинта
   * @param options - Опции запроса
   * @returns Ответ от API
   */
  async delete<T = unknown>(url: string, options?: HTTPQueryOptions): Promise<HTTPResponse<T>> {
    return this.request<T>('DELETE', url, options);
  }

  /**
   * Выполнение HEAD запроса
   * @param url - URL эндпоинта
   * @param options - Опции запроса
   * @returns Ответ от API
   */
  async head(url: string, options?: HTTPQueryOptions): Promise<HTTPResponse<void>> {
    return this.request<void>('HEAD', url, options);
  }

  /**
   * Установка базового URL для всех запросов
   * @param url - Базовый URL
   */
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  /**
   * Установка заголовков по умолчанию
   * @param headers - Заголовки
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Получение текущих заголовков по умолчанию
   * @returns Заголовки по умолчанию
   */
  getDefaultHeaders(): Record<string, string> {
    return { ...this.defaultHeaders };
  }
}

// Экспорт экземпляра класса для использования в приложении
export const httpQuery = new HTTPQuery();

// Экспорт класса для возможности создания экземпляров с кастомными настройками
export default HTTPQuery;
