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
import fs from 'fs';
import path from 'path';

// =====================================================
// CONFIGURACIÓN
// =====================================================

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL_ID = '@videos_risas';
const VIDEO_DIR = 'videos_temp';

// =====================================================
// COMPROBAR TOKEN
// =====================================================

if (!TOKEN) {
    console.error('❌ No existe TELEGRAM_BOT_TOKEN.');
    console.error('Añade TELEGRAM_BOT_TOKEN en GitHub Secrets.');
    process.exit(1);
}

// =====================================================
// CREAR BOT
// =====================================================

const bot = new TelegramBot(TOKEN, {
    polling: false
});

// =====================================================
// BUSCAR VÍDEO MP4
// =====================================================

function buscarVideo() {

    if (!fs.existsSync(VIDEO_DIR)) {
        fs.mkdirSync(VIDEO_DIR, {
            recursive: true
        });

        console.error(
            `❌ La carpeta ${VIDEO_DIR} no existía.`
        );

        console.error(
            `📁 Se ha creado automáticamente.`
        );

        return null;
    }

    const archivos =
        fs.readdirSync(VIDEO_DIR);

    const videos =
        archivos.filter(
            archivo =>
                archivo.toLowerCase().endsWith('.mp4')
        );

    if (videos.length === 0) {

        console.error(
            '❌ No se encontró ningún vídeo .mp4.'
        );

        console.error(
            `📁 Coloca un vídeo dentro de ${VIDEO_DIR}/`
        );

        return null;
    }

    const archivo =
        path.join(
            VIDEO_DIR,
            videos[0]
        );

    return archivo;
}

// =====================================================
// ENVIAR VÍDEO
// =====================================================

async function enviarVideo(archivo) {

    try {

        console.log(
            '📤 Enviando vídeo a Telegram...'
        );

        console.log(
            `📁 Archivo: ${archivo}`
        );

        const estadisticas =
            fs.statSync(archivo);

        console.log(
            `💾 Tamaño: ${(estadisticas.size / 1024 / 1024).toFixed(2)} MB`
        );

        const mensaje =
            await bot.sendVideo(
                CHANNEL_ID,
                archivo,
                {
                    caption:
                        '🎬 Vídeo de prueba\n\n' +
                        '✅ El bot puede enviar vídeos correctamente.'
                },
                {
                    filename:
                        path.basename(archivo),

                    contentType:
                        'video/mp4'
                }
            );

        console.log('');
        console.log('==========================================');
        console.log('✅ VIDEO ENVIADO CORRECTAMENTE');
        console.log('==========================================');

        console.log(
            `📨 Message ID: ${mensaje.message_id}`
        );

        console.log(
            `📺 Canal: ${CHANNEL_ID}`
        );

        console.log(
            `📁 Archivo: ${path.basename(archivo)}`
        );

        console.log('==========================================');

        return true;

    } catch (error) {

        console.error('');
        console.error('==========================================');
        console.error('❌ ERROR ENVIANDO EL VÍDEO');
        console.error('==========================================');

        console.error(
            '❌ Mensaje:',
            error.message
        );

        if (error.response) {

            console.error(
                '❌ Respuesta de Telegram:',
                error.response.body
            );
        }

        console.error('==========================================');

        return false;
    }
}

// =====================================================
// MAIN
// =====================================================

async function main() {

    console.log('');
    console.log('🤖 TIKTOK VIRAL BOT - PRUEBA DE VÍDEO');
    console.log('');

    console.log(
        `📺 Canal: ${CHANNEL_ID}`
    );

    console.log(
        `📁 Carpeta: ${VIDEO_DIR}`
    );

    console.log('');
    console.log('🔎 Buscando vídeo...');

    const archivo =
        buscarVideo();

    if (!archivo) {

        console.error('');
        console.error(
            '❌ No se puede realizar la prueba.'
        );

        process.exit(1);
    }

    console.log(
        `✅ Vídeo encontrado: ${archivo}`
    );

    console.log('');
    console.log('🚀 Iniciando envío...');

    const enviado =
        await enviarVideo(archivo);

    console.log('');

    if (enviado) {

        console.log(
            '🎉 PRUEBA TERMINADA CORRECTAMENTE.'
        );

        console.log(
            '📺 Comprueba ahora el canal de Telegram.'
        );

        process.exit(0);

    } else {

        console.error(
            '❌ PRUEBA FALLIDA.'
        );

        process.exit(1);
    }
}

// =====================================================
// EJECUTAR
// =====================================================

main().catch(error => {

    console.error('');
    console.error('❌ ERROR FATAL:');
    console.error(error);

    process.exit(1);
});