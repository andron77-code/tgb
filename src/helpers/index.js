const dayjs = require('dayjs')
const ruLocale = require('dayjs/locale/ru.js')

dayjs.locale(ruLocale)

module.exports = dayjs

module.exports.logger = console