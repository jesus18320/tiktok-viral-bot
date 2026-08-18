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

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const VIDEO_DIR = 'videos_temp';
const OUTPUT_FILE = path.join(VIDEO_DIR, 'prueba.mp4');
const TIKTOK_URL = 'https://www.tiktok.com/foryou';

async function main() {
    console.log('');
    console.log('==========================================');
    console.log('🤖 TIKTOK VIRAL BOT - PRUEBA DE DESCARGA');
    console.log('==========================================');
    console.log('⚠️ Telegram: NO utilizado');
    console.log('⚠️ CSV: NO modificado');
    console.log('');

    fs.mkdirSync(VIDEO_DIR, { recursive: true });

    // Eliminar una prueba anterior para evitar confusiones
    if (fs.existsSync(OUTPUT_FILE)) {
        fs.unlinkSync(OUTPUT_FILE);
        console.log('🗑️ Vídeo de prueba anterior eliminado.');
    }

    console.log('🌐 Iniciando Chromium...');

    const browser = await chromium.launch({
        headless: true
    });

    const context = await browser.newContext({
        viewport: {
            width: 1280,
            height: 900
        },
        locale: 'es-ES',
        timezoneId: 'Europe/Madrid',
        userAgent:
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
            '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    const videoUrls = new Set();

    // =====================================================
    // CAPTURAR RESPUESTAS DE RED
    // =====================================================

    page.on('response', async (response) => {
        try {
            const url = response.url();
            const headers = response.headers();

            const contentType =
                (headers['content-type'] || '').toLowerCase();

            const isTikTok =
                url.includes('tiktokcdn') ||
                url.includes('tiktok.com') ||
                url.includes('tiktokv.com');

            const pareceVideo =
                contentType.includes('video/mp4') ||
                contentType.includes('video/') ||
                url.includes('mime_type=video');

            const noEsAudio =
                !contentType.includes('audio/') &&
                !url.includes('mime_type=audio');

            if (
                isTikTok &&
                pareceVideo &&
                noEsAudio
            ) {
                if (!videoUrls.has(url)) {
                    videoUrls.add(url);

                    console.log('');
                    console.log('🎥 URL DE VÍDEO ENCONTRADA:');
                    console.log(url.substring(0, 250));
                    console.log(`📊 Total URLs válidas: ${videoUrls.size}`);
                }
            }

        } catch (error) {
            // No detener el diagnóstico por errores de una respuesta
        }
    });

    // =====================================================
    // CONSOLA
    // =====================================================

    page.on('console', msg => {
        const texto = msg.text();

        if (
            msg.type() === 'error' ||
            msg.type() === 'warning'
        ) {
            console.log(
                `⚠️ CONSOLA TIKTOK: ${texto.substring(0, 500)}`
            );
        }
    });

    // =====================================================
    // ERRORES DE PÁGINA
    // =====================================================

    page.on('pageerror', error => {
        console.log(
            `⚠️ ERROR JAVASCRIPT: ${error.message}`
        );
    });

    // =====================================================
    // ABRIR TIKTOK
    // =====================================================

    console.log('');
    console.log('🌐 Abriendo TikTok...');
    console.log(`🔗 URL: ${TIKTOK_URL}`);

    const response = await page.goto(
        TIKTOK_URL,
        {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        }
    );

    if (response) {
        console.log(
            `📡 HTTP inicial: ${response.status()}`
        );
    }

    console.log(
        `📍 URL actual: ${page.url()}`
    );

    console.log(
        `📄 Título: ${await page.title()}`
    );

    // =====================================================
    // ESPERA INICIAL
    // =====================================================

    console.log('');
    console.log('⏳ Esperando vídeos de TikTok...');

    await page.waitForTimeout(10000);

    console.log('✅ Primera espera terminada.');

    // =====================================================
    // INFORMACIÓN DE VIDEOS
    // =====================================================

    async function mostrarVideos() {
        const datos = await page.evaluate(() => {
            return Array.from(
                document.querySelectorAll('video')
            ).map(video => ({
                src: video.currentSrc || video.src || '',
                width: video.videoWidth,
                height: video.videoHeight,
                duration: video.duration
            }));
        });

        console.log('');
        console.log('🎥 ELEMENTOS <VIDEO>:');
        console.log(`🎥 Total: ${datos.length}`);

        datos.forEach((video, index) => {
            console.log('');
            console.log(`--- VIDEO ${index + 1} ---`);
            console.log(`src: ${video.src}`);
            console.log(`tamaño: ${video.width}x${video.height}`);
            console.log(`duración: ${video.duration}`);
        });
    }

    await mostrarVideos();

    // =====================================================
    // SCROLL
    // =====================================================

    console.log('');
    console.log('📜 Haciendo scroll para provocar carga de más vídeos...');

    for (let i = 1; i <= 8; i++) {

        console.log(`📜 Scroll ${i}/8`);

        await page.evaluate(() => {
            window.scrollBy({
                top: window.innerHeight * 0.9,
                behavior: 'smooth'
            });
        });

        await page.waitForTimeout(3000);

        console.log(
            `   🎥 URLs de vídeo capturadas: ${videoUrls.size}`
        );

        const cantidadVideos = await page.locator('video').count();

        console.log(
            `   🎥 Elementos <video>: ${cantidadVideos}`
        );
    }

    // =====================================================
    // ESPERA FINAL
    // =====================================================

    console.log('');
    console.log('⏳ Esperando respuestas finales...');

    await page.waitForTimeout(5000);

    await mostrarVideos();

    // =====================================================
    // RESULTADO
    // =====================================================

    console.log('');
    console.log('==========================================');
    console.log('📊 RESULTADO DE CAPTURA');
    console.log('==========================================');

    console.log(
        `🎥 URLs de vídeo válidas: ${videoUrls.size}`
    );

    if (videoUrls.size === 0) {

        console.error('');
        console.error('❌ NO SE ENCONTRÓ NINGUNA URL DE VÍDEO MP4.');
        console.error('');
        console.error('TikTok cargó la página, pero no hemos');
        console.error('podido capturar una respuesta de vídeo.');
        console.error('');

        await page.screenshot({
            path: 'tiktok_descarga_diagnostico.png',
            fullPage: true
        });

        console.log(
            '📸 Captura guardada: tiktok_descarga_diagnostico.png'
        );

        await browser.close();

        process.exit(1);
    }

    // =====================================================
    // ELEGIR PRIMERA URL
    // =====================================================

    const urls = Array.from(videoUrls);

    const videoUrl = urls[0];

    console.log('');
    console.log('✅ SELECCIONANDO PRIMER VÍDEO');
    console.log('');
    console.log(videoUrl);

    // =====================================================
    // DESCARGAR CON CONTEXTO DEL NAVEGADOR
    // =====================================================

    console.log('');
    console.log('⬇️ Descargando vídeo...');

    const downloadResponse = await context.request.get(
        videoUrl,
        {
            timeout: 60000
        }
    );

    console.log(
        `📡 HTTP descarga: ${downloadResponse.status()}`
    );

    const contentType =
        downloadResponse.headers()['content-type'] || '';

    console.log(
        `📦 Content-Type: ${contentType}`
    );

    if (!downloadResponse.ok()) {

        console.error('');
        console.error(
            '❌ LA DESCARGA FALLÓ.'
        );

        console.error(
            `HTTP: ${downloadResponse.status()}`
        );

        await browser.close();

        process.exit(1);
    }

    const buffer =
        await downloadResponse.body();

    console.log(
        `💾 Bytes recibidos: ${buffer.length}`
    );

    // =====================================================
    // COMPROBAR TAMAÑO
    // =====================================================

    if (buffer.length === 0) {

        console.error(
            '❌ El vídeo descargado está vacío.'
        );

        await browser.close();

        process.exit(1);
    }

    // =====================================================
    // GUARDAR MP4
    // =====================================================

    fs.writeFileSync(
        OUTPUT_FILE,
        buffer
    );

    const stats =
        fs.statSync(OUTPUT_FILE);

    const tamañoMB =
        (
            stats.size /
            1024 /
            1024
        ).toFixed(2);

    console.log('');
    console.log('==========================================');
    console.log('✅ VÍDEO DESCARGADO CORRECTAMENTE');
    console.log('==========================================');

    console.log(
        `📁 Archivo: ${OUTPUT_FILE}`
    );

    console.log(
        `💾 Tamaño: ${tamañoMB} MB`
    );

    console.log(
        `📦 Bytes: ${stats.size}`
    );

    console.log(
        `📦 Content-Type: ${contentType}`
    );

    // =====================================================
    // COMPROBAR FIRMA MP4
    // =====================================================

    const primerosBytes =
        buffer.subarray(0, 32).toString('ascii');

    console.log('');
    console.log(
        `🔍 Cabecera archivo: ${primerosBytes}`
    );

    if (
        primerosBytes.includes('ftyp')
    ) {
        console.log(
            '✅ La cabecera parece corresponder a un MP4.'
        );
    } else {

        console.log(
            '⚠️ La cabecera no contiene "ftyp".'
        );

        console.log(
            '⚠️ Puede que TikTok haya devuelto otro formato.'
        );
    }

    // =====================================================
    // CERRAR
    // =====================================================

    await browser.close();

    console.log('');
    console.log('==========================================');
    console.log('🏁 PRUEBA TERMINADA');
    console.log('==========================================');
    console.log('');
    console.log('👉 NO se utilizó Telegram.');
    console.log('👉 NO se modificó el CSV.');
    console.log('👉 El vídeo se creó dentro de videos_temp/.');
    console.log('');

    process.exit(0);
}

main().catch(error => {

    console.error('');
    console.error('==========================================');
    console.error('❌ ERROR FATAL');
    console.error('==========================================');

    console.error(error);

    process.exit(1);
});