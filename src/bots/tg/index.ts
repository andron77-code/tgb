/**
 * Основной файл Telegram бота для взаимодействия с пользователями
 * Обрабатывает команды и сообщения, интегрируется с Google Sheets
 */

// Импорт библиотеки Telegraf для создания Telegram бота
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
// Импорт хелперов для работы с датами и логирования
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
// Загрузка переменных окружения из .env файла
import 'dotenv/config';

// Импорт клиента для работы с Google Sheets API
import GoogleSheetsClient from 'src/apis/google-sheets/index';
// Импорт ключей сервисного аккаунта Google для аутентификации
import googleSheetsKey from 'src/apis/google-sheets/silent-bird-774-72ddcbe6a273.json';

// Импорт чат-системы (закомментирован, используется для будущего расширения)
import MasterChat from 'src/apis/m-chat';

// Создание экземпляра Telegram бота с токеном из переменных окружения
const bot = new Telegraf(process.env.TG_BOT_TOKEN as string);

// Создание экземпляра чат-системы (закомментировано для будущего использования)
const mChat = new MasterChat();

// Инициализация клиента Google Sheets с ключами сервисного аккаунта
const googleSheetsClient = new GoogleSheetsClient(googleSheetsKey);
// Создание менеджера для работы с конкретной таблицей Google Sheets
const sheetManager = googleSheetsClient.createTableSheetManager(
  '1Qxcls8-DksCuCAqTq4egEm4Dy9ohhqdiEBYlG4uurMM',
);

// Обработчик команды /start - приветствие нового пользователя
bot.start((ctx) => ctx.reply('Умные Машины приветствуют вас!'));

// Основной обработчик всех текстовых сообщений от пользователей
bot.on('message', async (ctx) => {
  try {
    // Подготовка тестовых данных для записи в Google Sheets
    const values = [
      ['Имя', 'баллы'], // Заголовки таблицы
      ['Саша', '10'], // Тестовые данные
      ['Ваня', '7'], // Тестовые данные
      ['Костя', '29'], // Тестовые данные
      [message('text'), '1299'], // Сообщение пользователя с баллами
    ];

    // Запись данных в таблицу Google Sheets
    await sheetManager?.setListData('Лист1', values);

    // Чтение обновленных данных из таблицы
    const result = await sheetManager.getListData('Лист1');
    console.log('getSheetData result: ', result);

    // Отправка ответа пользователю с данными из таблицы и текущей датой
    ctx.reply(
      `Получены данные листа "${JSON.stringify(result, null, 4)}". Сегодня ${dayjs().format('D MMM YYYY')} г.`,
    );

    // Закомментированный код для интеграции с чат-системой (будущее расширение)
    return await mChat.query(ctx.message && 'text' in ctx.message ? ctx.message.text : '').then((text: string) => {
        return ctx.reply(`Ответ на "${ctx.message && 'text' in ctx.message ? ctx.message.text : ''}".
        ${text}
        `)
    })
  } catch (err: unknown) {
    // Обработка ошибок при работе с Google Sheets
    console.log('submitGoogleSpreadsheet err: ', err);
    return ctx.reply(`Ошибка получения данных "${JSON.stringify(err)}"`);
  }
});

// Обработчик команды /help - отображение справочной информации
bot.help(async (ctx) => await ctx.reply('Help in dev'));

// Запуск бота - начало прослушивания сообщений от Telegram
bot.launch();
console.log('Бот запущен!');

// Обработка сигналов для корректного завершения работы бота
process.once('SIGINT', () => bot.stop('SIGINT')); // Прерывание процесса (Ctrl+C)
process.once('SIGTERM', () => bot.stop('SIGTERM')); // Сигнал завершения от системы
