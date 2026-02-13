"use strict";
/**
 * Вспомогательные утилиты проекта
 * Предоставляют функции для работы с датами, логированием и другими общими задачами
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.console = exports.objectUtils = exports.stringUtils = exports.dateUtils = exports.logger = void 0;
exports.removeTags = removeTags;
var dayjs_1 = require("dayjs");
var ru_1 = require("dayjs/locale/ru");
// Установка русской локали для dayjs по умолчанию
dayjs_1.default.locale(ru_1.default);
// Экспорт настроенного экземпляра dayjs
exports.default = dayjs_1.default;
/**
 * Логгер на основе console
 * Использует стандартные методы console для вывода сообщений
 */
exports.logger = {
    /**
     * Вывод информационного сообщения
     * @param message - Текст сообщения
     * @param args - Дополнительные аргументы для вывода
     */
    log: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.log.apply(console, __spreadArray(["[LOG] ".concat(new Date().toISOString(), " - ").concat(message)], args, false));
    },
    /**
     * Вывод сообщения об ошибке
     * @param message - Текст ошибки
     * @param args - Дополнительные аргументы для вывода
     */
    error: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.error.apply(console, __spreadArray(["[ERROR] ".concat(new Date().toISOString(), " - ").concat(message)], args, false));
    },
    /**
     * Вывод предупреждения
     * @param message - Текст предупреждения
     * @param args - Дополнительные аргументы для вывода
     */
    warn: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.warn.apply(console, __spreadArray(["[WARN] ".concat(new Date().toISOString(), " - ").concat(message)], args, false));
    },
    /**
     * Вывод информационного сообщения
     * @param message - Текст сообщения
     * @param args - Дополнительные аргументы для вывода
     */
    info: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.info.apply(console, __spreadArray(["[INFO] ".concat(new Date().toISOString(), " - ").concat(message)], args, false));
    },
    /**
     * Вывод отладочной информации
     * @param message - Текст отладочного сообщения
     * @param args - Дополнительные аргументы для вывода
     */
    debug: function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.debug.apply(console, __spreadArray(["[DEBUG] ".concat(new Date().toISOString(), " - ").concat(message)], args, false));
    },
};
exports.console = exports.logger;
/**
 * Утилиты для работы с датами
 */
exports.dateUtils = {
    /**
     * Форматирование даты в российский формат
     * @param date - Дата для форматирования
     * @param format - Формат даты (по умолчанию 'D MMM YYYY')
     * @returns Отформатированная строка даты
     */
    formatDate: function (date, format) {
        if (date === void 0) { date = new Date(); }
        if (format === void 0) { format = 'D MMM YYYY'; }
        return (0, dayjs_1.default)(date).format(format);
    },
    /**
     * Получение текущей даты в формате ISO
     * @returns Текущая дата в формате ISO string
     */
    now: function () {
        return (0, dayjs_1.default)().toISOString();
    },
    /**
     * Проверка, является ли дата валидной
     * @param date - Дата для проверки
     * @returns true если дата валидна, иначе false
     */
    isValid: function (date) {
        return (0, dayjs_1.default)(date).isValid();
    },
    /**
     * Добавление времени к дате
     * @param date - Исходная дата
     * @param amount - Количество единиц времени
     * @param unit - Единица времени (day, month, year, hour, minute, second)
     * @returns Новая дата с добавленным временем
     */
    addTime: function (date, amount, unit) {
        return (0, dayjs_1.default)(date).add(amount, unit).toDate();
    },
};
/**
 * Утилиты для работы со строками
 */
exports.stringUtils = {
    /**
     * Преобразование строки в camelCase
     * @param str - Исходная строка
     * @returns Строка в camelCase
     */
    toCamelCase: function (str) {
        return str.replace(/([-_][a-z])/g, function (group) {
            return group.toUpperCase().replace('-', '').replace('_', '');
        });
    },
    /**
     * Преобразование строки в snake_case
     * @param str - Исходная строка
     * @returns Строка в snake_case
     */
    toSnakeCase: function (str) {
        return str.replace(/[A-Z]/g, function (letter) { return "_".concat(letter.toLowerCase()); });
    },
    /**
     * Генерация случайной строки
     * @param length - Длина строки
     * @returns Случайная строка указанной длины
     */
    random: function (length) {
        if (length === void 0) { length = 10; }
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var result = '';
        for (var i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
};
/**
 * Утилиты для работы с объектами
 */
exports.objectUtils = {
    /**
     * Глубокое слияние объектов
     * @param target - Целевой объект
     * @param sources - Исходные объекты для слияния
     * @returns Объединенный объект
     */
    deepMerge: function (target) {
        var _a, _b;
        var sources = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            sources[_i - 1] = arguments[_i];
        }
        if (!sources.length)
            return target;
        var source = sources.shift();
        if (this.isObject(target) && this.isObject(source)) {
            for (var key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key])
                        Object.assign(target, (_a = {}, _a[key] = {}, _a));
                    this.deepMerge(target[key], source[key]);
                }
                else {
                    Object.assign(target, (_b = {}, _b[key] = source[key], _b));
                }
            }
        }
        return this.deepMerge.apply(this, __spreadArray([target], sources, false));
    },
    /**
     * Проверка, является ли значение объектом
     * @param item - Значение для проверки
     * @returns true если значение является объектом
     */
    isObject: function (item) {
        return item !== null && typeof item === 'object' && !Array.isArray(item);
    },
};
function removeTags(input, tags) {
    if (!input)
        return input;
    // Если аргумент не передан — удаляем все HTML-теги
    if (!tags) {
        return input.replace(/<\/?[^>]+>/gi, "");
    }
    // Приводим к массиву
    var tagList = Array.isArray(tags) ? tags : [tags];
    var result = input;
    for (var _i = 0, tagList_1 = tagList; _i < tagList_1.length; _i++) {
        var tag = tagList_1[_i];
        var tagName = tag.trim();
        // Удаление открывающих и закрывающих тегов
        var regex = new RegExp("<\\/?".concat(tagName, "\\b[^>]*>"), "gi");
        result = result.replace(regex, "");
    }
    return result;
}
