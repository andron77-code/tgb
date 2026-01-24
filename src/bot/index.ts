const { Telegraf } = require('telegraf');
const dayjs = require('../helpers/index');
require('dotenv').config();

import GoogleSheetsClient from "../apis/google-sheets";
import google_sheets_key from '../apis/google-sheets/silent-bird-774-72ddcbe6a273.json'

// import MasterChat from "../apis/m-chat";

const bot = new Telegraf(process.env.TG_BOT_TOKEN);

// const mChat = new MasterChat();

const googleSheetsClient = new GoogleSheetsClient(google_sheets_key);
const sheetManager = googleSheetsClient.createTableSheetManager('1Qxcls8-DksCuCAqTq4egEm4Dy9ohhqdiEBYlG4uurMM')

bot.start((ctx: any) => ctx.reply('hello Man'))

bot.on('message', async (ctx: any) => {
    
    try {
        const values = [
            ["Имя","баллы"],
            ["Саша","10"],
            ["Ваня","7"],
            ["Костя","29"],
            [ctx.message?.text,"1299"]
        ]
        
        await sheetManager?.setListData('Лист1', values)

        const result = await sheetManager.getListData('Лист1')
        console.log('getSheetData result: ', result)

        
        
        return ctx.reply(`Получены данные листа "${JSON.stringify(result, null, 4)}". Сегодня ${dayjs().format('D MMM YYYY')} г.`)
        

        // await mChat.query(ctx.message.text).then((text: string) => {
        //     return ctx.reply(`Ответ на "${ctx.message.text}".
        //     ${text}
        //     `)
        // })
    } catch(err: unknown) {
        console.log('submitGoogleSpreadsheet err: ', err)
        return ctx.reply(`Ошибка получения данных "${JSON.stringify(err)}"`)
    }

    
})

bot.help(async (ctx: any) => await ctx.reply(`Help in dev`))

bot.launch()
console.log('Бот запущен!');

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
