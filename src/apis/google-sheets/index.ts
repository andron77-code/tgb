/**
 * Клиент для работы с Google Sheets API
 * Предоставляет функционал для аутентификации через JWT и манипуляции данными в таблицах
 */

import { logger } from '../../helpers';
import crypto from 'crypto';
import { httpQuery } from '../http';

// Тип для представления JSON ключа сервисного аккаунта Google
export type GoogleServiceAccountJsonObjectKey = {
  type: string; // Тип аккаунта (service_account)
  project_id: string; // ID проекта Google Cloud
  private_key_id: string; // ID приватного ключа
  private_key: string; // Приватный ключ в формате PEM
  client_email: string; // Email сервисного аккаунта
  client_id: string; // ID клиента
  auth_uri: string; // URI для аутентификации
  token_uri: string; // URI для получения токена
  auth_provider_x509_cert_url: string; // URL сертификата провайдера
  client_x509_cert_url: string; // URL сертификата клиента
  universe_domain: string; // Домен вселенной Google Cloud
};

// Интерфейс для менеджера работы с таблицами
interface ITableSheetManager {
  // Получение данных из указанного листа таблицы
  getListData: (listName: string) => Promise<unknown[][]>;
  // Установка данных в указанный лист таблицы
  setListData: (
    listName: string,
    data: unknown[][],
    range?: string,
  ) => Promise<unknown>;
}

/**
 * Основной класс для работы с Google Sheets API
 * Реализует аутентификацию через JWT 2.0 и выполнение запросов к API
 */
export default class GoogleSheetsClient {
  // Приватный ключ сервисного аккаунта Google
  private googleServiceAccountJsonObjectKey: GoogleServiceAccountJsonObjectKey;
  // Кэшированный токен доступа для оптимизации запросов
  private cachedAccessToken: string | null = null;
  // Время истечения действия токена
  private tokenExpiresAt: number = 0;

  // Базовый URI для Google Sheets API v4
  private sheetsApiUri: string = `https://sheets.googleapis.com/v4/spreadsheets`;

  // Кэш для хранения метаданных таблиц
  private sheetsData: Record<string, unknown> = {};

  /**
   * Конструктор класса
   * @param googleServiceAccountJsonObjectKey - JSON ключ сервисного аккаунта Google
   */
  constructor(
    googleServiceAccountJsonObjectKey: GoogleServiceAccountJsonObjectKey,
  ) {
    this.googleServiceAccountJsonObjectKey = googleServiceAccountJsonObjectKey;
  }

  /**
   * Генерация JWT токена для аутентификации в Google APIs
   * Использует RSA-SHA256 подпись с приватным ключом сервисного аккаунта
   * @returns JWT токен в формате string
   */
  private generateGoogleApiJWT(): string {
    // Извлечение необходимых данных из ключа сервисного аккаунта
    const {
      client_email: clientEmail = '',
      private_key: privateKey,
      private_key_id: kid,
    } = this.googleServiceAccountJsonObjectKey;

    // Заголовок JWT токена
    const header = {
      alg: 'RS256', // Алгоритм подписи
      typ: 'JWT', // Тип токена
      kid, // ID ключа для идентификации
    };

    // Текущее время в секундах для установки сроков действия токена
    const now = Math.floor(Date.now() / 1000);

    // Полезная нагрузка JWT с правами доступа и сроком действия
    const payload = {
      iss: clientEmail, // Эмитент (email сервисного аккаунта)
      scope: 'https://www.googleapis.com/auth/spreadsheets', // Область доступа к Google Sheets
      aud: 'https://oauth2.googleapis.com/token', // Аудитория (endpoint для обмена токена)
      iat: now, // Время выпуска токена
      exp: now + 3600, // Время истечения (1 час)
    };

    // Кодирование заголовка и полезной нагрузки в Base64
    const encodedHeader = globalThis.btoa(JSON.stringify(header));
    const encodedPayload = globalThis.btoa(JSON.stringify(payload));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    let sign;

    try {
      // Создание цифровой подписи с использованием RSA-SHA256
      sign = crypto.createSign('RSA-SHA256');
      sign.update(unsignedToken);
      sign.end();
    } catch (error) {
      // Обработка ошибок при создании подписи
      logger.error('Error in signing token', error);
      throw error;
    }

    // Генерация подписи и сборка финального JWT токена
    const signature = sign.sign(privateKey, 'base64');
    return `${unsignedToken}.${signature}`;
  }

  /**
   * Получение токена доступа Google API с кэшированием
   * Использует JWT для обмена на bearer токен
   * @returns Токен доступа для API запросов
   */
  private async getAccessToken(): Promise<string> {
    // Текущее время для проверки срока действия кэшированного токена
    const now = Math.floor(Date.now() / 1000);

    // Проверка валидности кэшированного токена (с буфером в 5 минут)
    if (this.cachedAccessToken && this.tokenExpiresAt > now + 300) {
      // logger.log('Using cached google api access token');
      return this.cachedAccessToken;
    }

    // Запрос нового токена если кэш истек или отсутствует
    logger.log('Getting google api access token');
    const jwt = this.generateGoogleApiJWT();

    // Подготовка параметров для обмена JWT на access token
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    });

    // Выполнение запроса к Google OAuth 2.0 endpoint
    const response = await httpQuery.post('https://oauth2.googleapis.com/token', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(JSON.stringify(response.data));
    }

    const data = response.data as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) throw new Error('No access_token in response');

    // Кэширование токена с установкой времени истечения
    this.cachedAccessToken = data.access_token;
    this.tokenExpiresAt = now + (data.expires_in || 3600);

    return data.access_token;
  }

  /**
   * Создание менеджера для работы с конкретной таблицей Google Sheets
   * @param spreadSheetId - ID таблицы Google Sheets
   * @returns Объект менеджера с методами для работы с данными таблицы
   */
  public createTableSheetManager(spreadSheetId: string): ITableSheetManager {
    // Асинхронная загрузка метаданных таблицы для кэширования
    this.loadSheetMetadata(spreadSheetId)
      .then((res) => {
        this.sheetsData[spreadSheetId] = res;
        console.log('result data sheets: ', JSON.stringify(res, null, 4));
      })
      .catch((error) => {
        console.error('Error loading sheet metadata:', error);
      });

    // Возврат объекта с методами для манипуляции данными
    return {
      /**
       * Получение данных из указанного листа таблицы
       * @param listName - Название листа в таблице
       * @returns Двумерный массив с данными листа
       */
      getListData: async (listName: string): Promise<unknown[][]> => {
        // Проверка наличия ID таблицы
        if (!spreadSheetId) throw new Error('No spreadSheetId provided');

        // Формирование URL для запроса данных листа
        const urlGet = `${this.sheetsApiUri}/${spreadSheetId}/values/${listName}`;
        const accessToken = await this.getAccessToken();
        
        const response = await httpQuery.get(urlGet, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data as unknown[][];
      },

      /**
       * Запись данных в указанный лист таблицы
       * @param listName - Название листа для записи данных
       * @param data - Двумерный массив с данными для записи
       * @param range - Опциональный диапазон ячеек (например, "A1:C10")
       * @returns Результат операции записи
       */
      setListData: async (
        listName: string,
        data: unknown[][],
        range?: string,
      ): Promise<unknown> => {
        // Проверка наличия ID таблицы
        if (!spreadSheetId) throw new Error('No spreadSheetId provided');

        // Формирование полного диапазона для записи данных
        const fullRange = range ? `${listName}!${range}` : listName;
        // URL для запроса обновления данных с опцией RAW для вставки как есть
        const urlPut = `${this.sheetsApiUri}/${spreadSheetId}/values/${fullRange}?valueInputOption=RAW`;
        
        const accessToken = await this.getAccessToken();
        
        const response = await httpQuery.put(urlPut, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: { values: data },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.data;
      },
    };
  }

  /**
   * Загрузка метаданных таблицы для кэширования
   * @param spreadSheetId - ID таблицы
   * @returns Метаданные таблицы
   */
  private async loadSheetMetadata(spreadSheetId: string): Promise<unknown> {
    const accessToken = await this.getAccessToken();
    
    const response = await httpQuery.get(`${this.sheetsApiUri}/${spreadSheetId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.data;
  }
}
