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

// =====================================================
// CONFIGURACIÓN
// =====================================================

const TIKTOK_URL = 'https://www.tiktok.com/foryou';

const DIAGNOSTICO_HTML = 'tiktok_diagnostico.html';

// =====================================================
// MAIN
// =====================================================

async function main() {

    console.log('');
    console.log('==========================================');
    console.log('🤖 TIKTOK VIRAL BOT - DIAGNÓSTICO');
    console.log('==========================================');
    console.log('');

    let browser = null;
    let context = null;

    try {

        // =================================================
        // ABRIR CHROMIUM
        // =================================================

        console.log('🌐 Iniciando Chromium...');

        browser = await chromium.launch({
            headless: true
        });

        console.log('✅ Chromium iniciado.');

        // =================================================
        // CREAR CONTEXTO
        // =================================================

        context = await browser.newContext({

            userAgent:
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                'AppleWebKit/537.36 ' +
                '(KHTML, like Gecko) ' +
                'Chrome/131.0.0.0 Safari/537.36',

            viewport: {
                width: 1280,
                height: 900
            },

            locale: 'es-ES',

            timezoneId: 'Europe/Madrid',

            extraHTTPHeaders: {
                'Accept-Language':
                    'es-ES,es;q=0.9,en;q=0.8'
            }
        });

        const page = await context.newPage();

        // =================================================
        // LOG DE RESPUESTAS IMPORTANTES
        // =================================================

        page.on('response', response => {

            const url = response.url();

            if (
                url.includes('tiktok.com') &&
                (
                    url.includes('/api/') ||
                    url.includes('/foryou') ||
                    url.includes('/video/')
                )
            ) {

                console.log(
                    `🌐 RESPUESTA ${response.status()}: ${url.substring(0, 250)}`
                );
            }
        });

        // =================================================
        // LOG DE ERRORES DE PÁGINA
        // =================================================

        page.on('console', mensaje => {

            const texto = mensaje.text();

            if (
                texto &&
                (
                    texto.includes('error') ||
                    texto.includes('Error') ||
                    texto.includes('blocked') ||
                    texto.includes('captcha')
                )
            ) {

                console.log(
                    `⚠️ CONSOLA TIKTOK: ${texto.substring(0, 500)}`
                );
            }
        });

        page.on('pageerror', error => {

            console.log(
                `⚠️ ERROR JAVASCRIPT: ${error.message}`
            );
        });

        // =================================================
        // ABRIR TIKTOK
        // =================================================

        console.log('');
        console.log('🌐 Abriendo TikTok...');
        console.log(`🔗 URL: ${TIKTOK_URL}`);

        const respuesta = await page.goto(
            TIKTOK_URL,
            {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            }
        );

        console.log('');

        if (respuesta) {

            console.log(
                `📡 HTTP inicial: ${respuesta.status()}`
            );
        }

        console.log(
            `📍 URL actual: ${page.url()}`
        );

        console.log(
            `📄 Título de página: ${await page.title()}`
        );

        // =================================================
        // ESPERAR
        // =================================================

        console.log('');
        console.log('⏳ Esperando carga de TikTok...');

        await page.waitForTimeout(10000);

        console.log('✅ Primera espera terminada.');

        // =================================================
        // INFORMACIÓN INICIAL
        // =================================================

        console.log('');
        console.log('==========================================');
        console.log('🔎 INFORMACIÓN INICIAL');
        console.log('==========================================');

        console.log(
            `📍 URL: ${page.url()}`
        );

        console.log(
            `📄 Título: ${await page.title()}`
        );

        // =================================================
        // TEXTO VISIBLE
        // =================================================

        const textoVisible =
            await page.locator('body').innerText()
                .catch(() => '');

        console.log('');
        console.log(
            `📝 Texto visible: ${textoVisible.length} caracteres`
        );

        if (textoVisible) {

            console.log('');
            console.log('----- TEXTO VISIBLE -----');

            console.log(
                textoVisible
                    .substring(0, 3000)
            );

            console.log('----- FIN TEXTO -----');
        }

        // =================================================
        // PRIMERA BÚSQUEDA DE ENLACES
        // =================================================

        console.log('');
        console.log('==========================================');
        console.log('🔎 BUSCANDO ENLACES');
        console.log('==========================================');

        const todosLosEnlaces =
            await page.locator('a').count();

        console.log(
            `🔗 Enlaces <a> encontrados: ${todosLosEnlaces}`
        );

        const enlacesTikTok =
            await page.locator(
                'a[href*="tiktok.com"]'
            ).count();

        console.log(
            `🔗 Enlaces TikTok: ${enlacesTikTok}`
        );

        const enlacesVideo =
            await page.locator(
                'a[href*="/video/"]'
            ).count();

        console.log(
            `🎬 Enlaces /video/: ${enlacesVideo}`
        );

        // =================================================
        // MOSTRAR ALGUNOS ENLACES
        // =================================================

        const hrefs =
            await page.locator('a').evaluateAll(
                elementos =>
                    elementos
                        .map(elemento =>
                            elemento.href || ''
                        )
                        .filter(Boolean)
                        .slice(0, 50)
            );

        console.log('');

        console.log(
            `🔗 Mostrando ${hrefs.length} enlaces encontrados:`
        );

        for (
            const href of hrefs
        ) {

            console.log(
                `   ${href.substring(0, 300)}`
            );
        }

        // =================================================
        // BUSCAR VIDEOS HTML
        // =================================================

        console.log('');
        console.log('==========================================');
        console.log('🎥 BUSCANDO ELEMENTOS VIDEO');
        console.log('==========================================');

        const elementosVideo =
            await page.locator('video').count();

        console.log(
            `🎥 Elementos <video>: ${elementosVideo}`
        );

        if (elementosVideo > 0) {

            const videos =
                await page.locator('video').evaluateAll(
                    elementos =>
                        elementos.map(video => ({
                            src:
                                video.currentSrc ||
                                video.src ||
                                '',
                            poster:
                                video.poster ||
                                '',
                            width:
                                video.videoWidth,
                            height:
                                video.videoHeight
                        }))
                );

            for (
                const video of videos
            ) {

                console.log(
                    `🎥 src: ${video.src || '(vacío)'}`
                );

                console.log(
                    `🖼️ poster: ${video.poster || '(vacío)'}`
                );

                console.log(
                    `📐 tamaño: ${video.width}x${video.height}`
                );
            }
        }

        // =================================================
        // SCROLL 1
        // =================================================

        console.log('');
        console.log('==========================================');
        console.log('📜 HACIENDO SCROLL');
        console.log('==========================================');

        for (
            let i = 1;
            i <= 8;
            i++
        ) {

            console.log(
                `📜 Scroll ${i}/8`
            );

            await page.mouse.wheel(
                0,
                4500
            );

            await page.waitForTimeout(
                2500
            );

            const cantidadEnlaces =
                await page.locator('a').count();

            const cantidadVideos =
                await page.locator(
                    'a[href*="/video/"]'
                ).count();

            const cantidadVideoElements =
                await page.locator(
                    'video'
                ).count();

            console.log(
                `   🔗 enlaces: ${cantidadEnlaces}`
            );

            console.log(
                `   🎬 /video/: ${cantidadVideos}`
            );

            console.log(
                `   🎥 <video>: ${cantidadVideoElements}`
            );
        }

        // =================================================
        // ESPERA FINAL
        // =================================================

        console.log('');
        console.log(
            '⏳ Esperando 5 segundos adicionales...'
        );

        await page.waitForTimeout(
            5000
        );

        // =================================================
        // RESULTADO FINAL
        // =================================================

        console.log('');
        console.log('==========================================');
        console.log('📊 RESULTADO FINAL');
        console.log('==========================================');

        const totalEnlaces =
            await page.locator('a').count();

        const totalVideosTikTok =
            await page.locator(
                'a[href*="/video/"]'
            ).count();

        const totalElementosVideo =
            await page.locator(
                'video'
            ).count();

        const totalIframes =
            await page.locator(
                'iframe'
            ).count();

        const totalImages =
            await page.locator(
                'img'
            ).count();

        console.log(
            `🔗 Total enlaces: ${totalEnlaces}`
        );

        console.log(
            `🎬 Enlaces /video/: ${totalVideosTikTok}`
        );

        console.log(
            `🎥 Elementos <video>: ${totalElementosVideo}`
        );

        console.log(
            `🖼️ Imágenes: ${totalImages}`
        );

        console.log(
            `🪟 Iframes: ${totalIframes}`
        );

        console.log(
            `📍 URL final: ${page.url()}`
        );

        console.log(
            `📄 Título final: ${await page.title()}`
        );

        // =================================================
        // EXTRAER ENLACES DE VIDEO
        // =================================================

        const videosEncontrados =
            await page.locator(
                'a[href*="/video/"]'
            ).evaluateAll(
                elementos =>
                    elementos.map(
                        elemento => ({
                            href:
                                elemento.href || '',
                            texto:
                                (elemento.innerText || '')
                                    .trim()
                        })
                    )
            );

        console.log('');
        console.log(
            `🎯 Vídeos encontrados finalmente: ${videosEncontrados.length}`
        );

        for (
            const video of videosEncontrados.slice(0, 20)
        ) {

            console.log('');
            console.log(
                `🔗 ${video.href}`
            );

            if (video.texto) {

                console.log(
                    `📝 ${video.texto.substring(0, 300)}`
                );
            }
        }

        // =================================================
        // GUARDAR HTML
        // =================================================

        console.log('');
        console.log(
            '💾 Guardando HTML de diagnóstico...'
        );

        const html =
            await page.content();

        fs.writeFileSync(
            DIAGNOSTICO_HTML,
            html,
            'utf8'
        );

        console.log(
            `✅ HTML guardado: ${DIAGNOSTICO_HTML}`
        );

        console.log(
            `📦 Tamaño HTML: ${(
                Buffer.byteLength(html, 'utf8') /
                1024
            ).toFixed(2)} KB`
        );

        // =================================================
        // CAPTURA DE PANTALLA
        // =================================================

        console.log('');
        console.log(
            '📸 Guardando captura de pantalla...'
        );

        await page.screenshot({
            path: 'tiktok_diagnostico.png',
            fullPage: true
        });

        console.log(
            '✅ Captura guardada: tiktok_diagnostico.png'
        );

        // =================================================
        // RESULTADO
        // =================================================

        console.log('');
        console.log('==========================================');

        if (
            totalVideosTikTok > 0
        ) {

            console.log(
                '🎉 TIKTOK ESTÁ MOSTRANDO ENLACES DE VÍDEO'
            );

            console.log(
                `🎬 Vídeos encontrados: ${totalVideosTikTok}`
            );

        } else {

            console.log(
                '⚠️ TIKTOK NO ESTÁ MOSTRANDO ENLACES /video/'
            );

            console.log(
                '🔎 Hay que analizar el diagnóstico.'
            );
        }

        console.log('==========================================');
        console.log('');

        // =================================================
        // IMPORTANTE:
        // ESTE SCRIPT NO ENVÍA NADA A TELEGRAM
        // =================================================

        console.log(
            '📺 Telegram: NO utilizado en esta prueba.'
        );

        console.log(
            '💾 CSV: NO modificado en esta prueba.'
        );

        console.log(
            '⬇️ Descargas: NO realizadas en esta prueba.'
        );

        console.log('');

        process.exit(0);

    } catch (error) {

        console.error('');
        console.error('==========================================');
        console.error('❌ ERROR EN EL DIAGNÓSTICO');
        console.error('==========================================');

        console.error(
            '❌ Mensaje:',
            error.message
        );

        if (error.stack) {

            console.error('');
            console.error(
                error.stack
            );
        }

        process.exit(1);

    } finally {

        if (context) {

            await context
                .close()
                .catch(() => {});
        }

        if (browser) {

            await browser
                .close()
                .catch(() => {});
        }
    }
}

// =====================================================
// EJECUTAR
// =====================================================

main().catch(error => {

    console.error(
        '❌ ERROR FATAL:',
        error
    );

    process.exit(1);
});