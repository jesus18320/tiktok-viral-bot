// import { chromium } from 'playwright';
// import fs from 'fs';
// import path from 'path';
// import TelegramBot from 'node-telegram-bot-api';

// // ================= CONFIGURACIÓN =================
// const TOKEN = '7969601392:AAFTysJIGxGOhlxh_Nt-jApCM09TQSsjvzM'; // Token de tu bot
// const CHANNEL_ID = '@videos_risas'; // Canal público
// const REFRESH_INTERVAL = 40000; // 40 segundos
// const MAX_VIDEOS = 2; // vídeos por ciclo
// const CSV_FILE = "videos_virales.csv";

// const bot = new TelegramBot(TOKEN, { polling: false });

// // ================= SET PARA EVITAR DUPLICADOS =================
// let videosGuardados = new Set();
// if (fs.existsSync(CSV_FILE)) {
//     const data = fs.readFileSync(CSV_FILE, 'utf-8');
//     data.split("\n").slice(1).forEach(line => {
//         const url = line.split(",")[1];
//         if (url) videosGuardados.add(url);
//     });
// }

// // ================= FUNCION PARA ENVIAR VIDEO/ENLACE A TELEGRAM =================
// async function enviarTelegram(url, index) {
//     try {
//         await bot.sendMessage(CHANNEL_ID, `🎬 Nuevo vídeo viral:\n${url}`);
//         console.log(`✅ Publicado en Telegram: ${url}`);
//     } catch (err) {
//         console.error("❌ Error al enviar a Telegram:", err.message);
//     }
// }

// // ================= FUNCION PRINCIPAL =================
// async function capturarVirales() {
//     console.log("🚀 Buscando vídeos virales...");

//     const browser = await chromium.launch({ headless: true });
//     const context = await browser.newContext({
//         userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
//                    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
//     });

//     const page = await context.newPage();
//     let videoUrls = new Set();

//     page.on('response', async (response) => {
//         const url = response.url();
//         if (url.includes('/api/recommend/item_list')) {
//             try {
//                 const json = await response.json();
//                 if (json?.itemList) {
//                     json.itemList.forEach(v => {
//                         if (v.author?.uniqueId && v.id) {
//                             const videoUrl = `https://www.tiktok.com/@${v.author.uniqueId}/video/${v.id}`;
//                             videoUrls.add(videoUrl);
//                         }
//                     });
//                 }
//             } catch {}
//         }
//     });

//     await page.goto('https://www.tiktok.com/foryou', { waitUntil: 'domcontentloaded' });

//     for (let i = 0; i < 4; i++) {
//         await page.mouse.wheel(0, 5000);
//         await page.waitForTimeout(1000);
//     }

//     const lista = Array.from(videoUrls).slice(0, MAX_VIDEOS);
//     const nuevos = lista.filter(url => !videosGuardados.has(url));
//     console.log(`🎯 Nuevos vídeos encontrados: ${nuevos.length}`);

//     let csv = fs.existsSync(CSV_FILE) ? fs.readFileSync(CSV_FILE, 'utf-8') : "Numero,URL\n";
//     let contador = csv.split("\n").length;

//     for (let url of nuevos) {
//         await enviarTelegram(url, contador); // 📲 Enviar a Telegram
//         csv += `${contador},${url}\n`;
//         videosGuardados.add(url);
//         contador++;
//     }

//     fs.writeFileSync(CSV_FILE, csv, 'utf-8');
//     console.log("✅ CSV actualizado con vídeos nuevos");

//     await browser.close();
// }

// // ================= LOOP CONTINUO =================
// async function loop() {
//     while (true) {
//         try {
//             await capturarVirales();
//         } catch (err) {
//             console.error("❌ Error capturando vídeos:", err.message);
//         }
//         console.log(`⏳ Esperando ${REFRESH_INTERVAL / 1000}s para la siguiente captura...\n`);
//         await new Promise(r => setTimeout(r, REFRESH_INTERVAL));
//     }
// }
import TelegramBot from 'node-telegram-bot-api';

// =====================================================
// CONFIGURACIÓN
// =====================================================

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const CHANNEL_ID = '@videos_risas';

// =====================================================
// COMPROBAR TOKEN
// =====================================================

if (!TOKEN) {
    console.error('❌ No existe TELEGRAM_BOT_TOKEN.');
    console.error(
        'Añade TELEGRAM_BOT_TOKEN en GitHub Secrets.'
    );

    process.exit(1);
}

// =====================================================
// CREAR BOT
// =====================================================

const bot = new TelegramBot(TOKEN, {
    polling: false
});

// =====================================================
// ENVIAR MENSAJE DE PRUEBA
// =====================================================

async function enviarMensajePrueba() {

    try {

        console.log(
            '🧪 Enviando mensaje de prueba a Telegram...'
        );

        const ahora =
            new Date().toISOString();

        const mensaje =
            await bot.sendMessage(
                CHANNEL_ID,
                '🧪 PRUEBA DEL TIKTOK VIRAL BOT\n\n' +
                '✅ Telegram funciona correctamente.\n' +
                '🤖 El bot puede enviar mensajes al canal.\n\n' +
                `📅 Fecha: ${ahora}`
            );

        console.log(
            '=========================================='
        );

        console.log(
            '✅ MENSAJE ENVIADO CORRECTAMENTE A TELEGRAM'
        );

        console.log(
            `📨 Message ID: ${mensaje.message_id}`
        );

        console.log(
            `📺 Canal: ${CHANNEL_ID}`
        );

        console.log(
            '=========================================='
        );

        return true;

    } catch (error) {

        console.error(
            '=========================================='
        );

        console.error(
            '❌ ERROR ENVIANDO MENSAJE A TELEGRAM'
        );

        console.error(
            '❌ Mensaje:',
            error.message
        );

        console.error(
            '=========================================='
        );

        return false;
    }
}

// =====================================================
// MAIN
// =====================================================

async function main() {

    console.log(
        '🤖 TikTok Viral Bot - PRUEBA DE TELEGRAM'
    );

    console.log(
        `📺 Canal: ${CHANNEL_ID}`
    );

    console.log(
        '🚀 Iniciando prueba...'
    );

    const enviado =
        await enviarMensajePrueba();

    if (enviado) {

        console.log(
            '🎉 PRUEBA TERMINADA: TELEGRAM FUNCIONA.'
        );

        process.exit(0);

    } else {

        console.error(
            '❌ PRUEBA FALLIDA: TELEGRAM NO FUNCIONA.'
        );

        process.exit(1);
    }
}

// =====================================================
// EJECUTAR
// =====================================================

main().catch(error => {

    console.error(
        '❌ ERROR FATAL:'
    );

    console.error(
        error
    );

    process.exit(1);
});