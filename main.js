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
import TelegramBot from 'node-telegram-bot-api';

// =====================================================
// CONFIGURACIÓN
// =====================================================

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const CHANNEL_ID = '@videos_risas';

const MAX_VIDEOS = 2;

const CSV_FILE = 'videos_virales.csv';
const DOWNLOAD_DIR = 'videos_temp';

const MIN_VIDEO_BYTES = 10000;

if (!TOKEN) {
    console.error(
        '❌ Falta la variable TELEGRAM_BOT_TOKEN.'
    );

    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
    polling: false
});

// =====================================================
// CARPETA TEMPORAL
// =====================================================

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, {
        recursive: true
    });
}

// =====================================================
// VÍDEOS YA PUBLICADOS
// =====================================================

const videosGuardados = new Set();

if (fs.existsSync(CSV_FILE)) {

    const data =
        fs.readFileSync(
            CSV_FILE,
            'utf8'
        );

    const lineas =
        data
            .split(/\r?\n/)
            .slice(1);

    for (const linea of lineas) {

        const separador =
            linea.indexOf(',');

        if (separador === -1) {
            continue;
        }

        const url =
            linea
                .slice(separador + 1)
                .trim();

        if (url) {
            videosGuardados.add(url);
        }
    }
}

// =====================================================
// LIMPIAR TÍTULO
// =====================================================

function limpiarTitulo(titulo) {

    if (
        !titulo ||
        typeof titulo !== 'string'
    ) {
        return 'Vídeo viral';
    }

    let resultado =
        titulo.trim();

    resultado =
        resultado.replace(
            /\s+/g,
            ' '
        );

    resultado =
        resultado.replace(
            /(\s*#[\wáéíóúñÁÉÍÓÚÑ]+)+\s*$/g,
            ''
        ).trim();

    if (resultado.length > 900) {

        resultado =
            resultado
                .substring(0, 897)
                .trim() +
            '...';
    }

    return (
        resultado ||
        'Vídeo viral'
    );
}

// =====================================================
// ENVIAR A TELEGRAM
// =====================================================

async function enviarTelegram(
    titulo,
    archivo
) {

    try {

        console.log(
            '📤 Enviando vídeo a Telegram...'
        );

        const tituloLimpio =
            limpiarTitulo(titulo);

        await bot.sendVideo(
            CHANNEL_ID,
            archivo,
            {
                caption:
                    `🎬 ${tituloLimpio}`,

                supports_streaming:
                    true
            }
        );

        console.log(
            '✅ Vídeo publicado correctamente'
        );

        return true;

    } catch (error) {

        console.error(
            '❌ Error al enviar a Telegram:',
            error.message
        );

        return false;
    }
}

// =====================================================
// GUARDAR BUFFER DE VÍDEO
// =====================================================

function guardarBufferVideo(
    buffer,
    archivo
) {

    try {

        if (
            !buffer ||
            !Buffer.isBuffer(buffer)
        ) {

            console.log(
                '❌ El contenido recibido no es un Buffer válido.'
            );

            return false;
        }

        if (
            buffer.length <
            MIN_VIDEO_BYTES
        ) {

            console.log(
                `⏭️ Vídeo demasiado pequeño: ${buffer.length} bytes`
            );

            return false;
        }

        fs.writeFileSync(
            archivo,
            buffer
        );

        console.log(
            `💾 Vídeo guardado: ` +
            `${(
                buffer.length /
                1024 /
                1024
            ).toFixed(2)} MB`
        );

        return true;

    } catch (error) {

        console.error(
            '❌ Error guardando vídeo:',
            error.message
        );

        return false;
    }
}

// =====================================================
// CAPTURAR RESPUESTA DE VÍDEO INMEDIATAMENTE
// =====================================================

async function capturarRespuestaVideo(
    response
) {

    try {

        if (!response.ok()) {
            return null;
        }

        const headers =
            response.headers();

        const contentType =
            (
                headers['content-type'] ||
                ''
            ).toLowerCase();

        if (
            !contentType.includes('video/')
        ) {
            return null;
        }

        const contentLength =
            Number(
                headers['content-length'] ||
                0
            );

        /*
         * MUY IMPORTANTE:
         *
         * Leemos response.body() AQUÍ,
         * inmediatamente cuando llega la respuesta.
         *
         * No guardamos el objeto response
         * para utilizarlo después.
         */

        let buffer;

        try {

            buffer =
                await response.body();

        } catch (error) {

            console.log(
                '⚠️ No se pudo leer el cuerpo de la respuesta: ' +
                error.message
            );

            return null;
        }

        if (
            !buffer ||
            buffer.length <
            MIN_VIDEO_BYTES
        ) {

            console.log(
                `⏭️ Respuesta de vídeo pequeña descartada: ` +
                `${buffer?.length || 0} bytes`
            );

            return null;
        }

        console.log(
            `🎥 Vídeo de red capturado: ${contentType}`
        );

        console.log(
            `📦 Tamaño capturado: ${buffer.length} bytes`
        );

        if (contentLength > 0) {

            console.log(
                `📦 Tamaño anunciado: ` +
                `${(
                    contentLength /
                    1024 /
                    1024
                ).toFixed(2)} MB`
            );
        }

        return {
            buffer,
            contentType,
            contentLength
        };

    } catch (error) {

        console.log(
            '⚠️ Error capturando respuesta de vídeo:',
            error.message
        );

        return null;
    }
}

// =====================================================
// CAPTURAR VÍDEOS
// =====================================================

async function capturarVirales() {

    console.log(
        '\n🚀 Buscando vídeos virales...'
    );

    let browser = null;
    let context = null;

    try {

        browser =
            await chromium.launch({
                headless: true
            });

        context =
            await browser.newContext({

                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',

                viewport: {
                    width: 1280,
                    height: 900
                },

                locale: 'es-ES',

                timezoneId:
                    'Europe/Madrid'
            });

        const page =
            await context.newPage();

        // =================================================
        // VÍDEOS DETECTADOS
        // =================================================

        const videos =
            new Map();

        // =================================================
        // COLA DE VÍDEOS CAPTURADOS
        // =================================================

        const videosCapturados =
            [];

        // =================================================
        // RESPUESTAS DE API DE TIKTOK
        // =================================================

        page.on(
            'response',
            async response => {

                const url =
                    response.url();

                /*
                 * TikTok puede cambiar ligeramente
                 * sus endpoints. Buscamos item_list
                 * en lugar de depender únicamente
                 * de una URL exacta.
                 */

                if (
                    !url.includes(
                        'item_list'
                    )
                ) {
                    return;
                }

                try {

                    const json =
                        await response.json();

                    if (
                        !Array.isArray(
                            json?.itemList
                        )
                    ) {
                        return;
                    }

                    for (
                        const item
                        of json.itemList
                    ) {

                        if (
                            !item?.author?.uniqueId ||
                            !item?.id
                        ) {
                            continue;
                        }

                        const videoUrl =
                            `https://www.tiktok.com/@` +
                            `${item.author.uniqueId}` +
                            `/video/${item.id}`;

                        const titulo =
                            item.desc ||
                            item.description ||
                            item.title ||
                            'Vídeo viral';

                        if (
                            !videos.has(
                                videoUrl
                            )
                        ) {

                            videos.set(
                                videoUrl,
                                {
                                    url:
                                        videoUrl,

                                    title:
                                        limpiarTitulo(
                                            titulo
                                        )
                                }
                            );

                            console.log(
                                `📝 Vídeo detectado: ` +
                                `${limpiarTitulo(titulo)}`
                            );
                        }
                    }

                } catch {
                    // Algunas respuestas no son JSON.
                }
            }
        );

        // =================================================
        // RESPUESTAS DE VÍDEO
        // =================================================

        page.on(
            'response',
            async response => {

                try {

                    const resultado =
                        await capturarRespuestaVideo(
                            response
                        );

                    if (!resultado) {
                        return;
                    }

                    /*
                     * MUY IMPORTANTE:
                     *
                     * El Buffer ya está completamente
                     * leído aquí.
                     *
                     * Por tanto no dependemos de
                     * response.body() más adelante.
                     */

                    videosCapturados.push({
                        buffer:
                            resultado.buffer,

                        contentType:
                            resultado.contentType,

                        contentLength:
                            resultado.contentLength,

                        url:
                            response.url()
                    });

                } catch (error) {

                    console.log(
                        '⚠️ Error procesando vídeo de red:',
                        error.message
                    );
                }
            }
        );

        // =================================================
        // ABRIR TIKTOK
        // =================================================

        console.log(
            '🌐 Abriendo TikTok...'
        );

        await page.goto(
            'https://www.tiktok.com/foryou',
            {
                waitUntil:
                    'domcontentloaded',

                timeout:
                    60000
            }
        );

        await page.waitForTimeout(
            7000
        );

        // =================================================
        // SCROLL
        // =================================================

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
                5000
            );

            await page.waitForTimeout(
                1800
            );
        }

        // =================================================
        // ESPERA FINAL
        // =================================================

        console.log(
            '⏳ Esperando respuestas finales...'
        );

        await page.waitForTimeout(
            5000
        );

        // =================================================
        // RESULTADOS
        // =================================================

        console.log(
            `🎯 Vídeos detectados en TikTok: ${videos.size}`
        );

        console.log(
            `🎥 Vídeos MP4 completos capturados: ${videosCapturados.length}`
        );

        // =================================================
        // FILTRAR VÍDEOS NUEVOS
        // =================================================

        const lista =
            Array
                .from(
                    videos.values()
                )
                .filter(
                    video =>
                        !videosGuardados.has(
                            video.url
                        )
                )
                .slice(
                    0,
                    MAX_VIDEOS
                );

        console.log(
            `🎯 Nuevos vídeos encontrados: ${lista.length}`
        );

        if (!lista.length) {

            console.log(
                'ℹ️ No hay vídeos nuevos para publicar.'
            );

            return;
        }

        // =================================================
        // PREPARAR CSV
        // =================================================

        let csv;

        if (
            fs.existsSync(
                CSV_FILE
            )
        ) {

            csv =
                fs.readFileSync(
                    CSV_FILE,
                    'utf8'
                );

        } else {

            csv =
                'Numero,URL\n';
        }

        const lineasCSV =
            csv
                .trim()
                .split(/\r?\n/);

        let contador =
            Math.max(
                0,
                lineasCSV.length - 1
            ) + 1;

        // =================================================
        // PROCESAR
        // =================================================

        let indiceCaptura = 0;

        for (
            let i = 0;
            i < lista.length;
            i++
        ) {

            const video =
                lista[i];

            console.log(
                `\n📹 Procesando vídeo ${i + 1}/${lista.length}`
            );

            console.log(
                `📝 Título: ${video.title}`
            );

            console.log(
                `🔗 URL: ${video.url}`
            );

            // =================================================
            // BUSCAR UN BUFFER VÁLIDO
            // =================================================

            if (
                indiceCaptura >=
                videosCapturados.length
            ) {

                console.log(
                    '⚠️ No quedan vídeos MP4 capturados.'
                );

                continue;
            }

            const captura =
                videosCapturados[
                    indiceCaptura
                ];

            indiceCaptura++;

            if (
                !captura ||
                !captura.buffer
            ) {

                console.log(
                    '❌ La captura no contiene datos.'
                );

                continue;
            }

            console.log(
                '⬇️ Guardando vídeo capturado...'
            );

            const nombreArchivo =
                `video_${Date.now()}_${contador}.mp4`;

            const archivo =
                path.join(
                    DOWNLOAD_DIR,
                    nombreArchivo
                );

            const guardado =
                guardarBufferVideo(
                    captura.buffer,
                    archivo
                );

            if (!guardado) {

                console.log(
                    '❌ No se pudo guardar el vídeo.'
                );

                continue;
            }

            // =================================================
            // TELEGRAM
            // =================================================

            const enviado =
                await enviarTelegram(
                    video.title,
                    archivo
                );

            // =================================================
            // CSV SOLO SI TELEGRAM FUNCIONÓ
            // =================================================

            if (enviado) {

                csv +=
                    `${contador},${video.url}\n`;

                videosGuardados.add(
                    video.url
                );

                contador++;

                fs.writeFileSync(
                    CSV_FILE,
                    csv,
                    'utf8'
                );

                console.log(
                    '💾 Vídeo registrado en CSV.'
                );

            } else {

                console.log(
                    '⚠️ Telegram no confirmó el envío. ' +
                    'No se modifica el CSV.'
                );
            }

            // =================================================
            // BORRAR TEMPORAL
            // =================================================

            if (
                fs.existsSync(
                    archivo
                )
            ) {

                fs.unlinkSync(
                    archivo
                );

                console.log(
                    '🗑️ Archivo temporal eliminado.'
                );
            }
        }

        console.log(
            '\n✅ Ciclo terminado.'
        );

    } catch (error) {

        console.error(
            '❌ Error capturando vídeos:',
            error.message
        );

        throw error;

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
// MAIN
// =====================================================

async function main() {

    console.log(
        '🤖 Bot iniciado'
    );

    console.log(
        `📺 Canal: ${CHANNEL_ID}`
    );

    console.log(
        `🎬 Máximo de vídeos: ${MAX_VIDEOS}`
    );

    await capturarVirales();

    console.log(
        '\n✅ Ejecución terminada.'
    );
}

// =====================================================
// ARRANCAR
// =====================================================

main().catch(error => {

    console.error(
        '\n❌ ERROR FATAL:'
    );

    console.error(
        error
    );

    process.exit(1);
});