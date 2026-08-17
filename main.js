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

// MÁXIMO DE PUBLICACIONES AL DÍA
const MAX_PUBLICACIONES_DIA = 3;

// Vídeos que intentará buscar en cada ejecución
const MAX_VIDEOS = 3;

const CSV_FILE = 'videos_virales.csv';
const DOWNLOAD_DIR = 'videos_temp';

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
// CREAR CARPETA TEMPORAL
// =====================================================

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, {
        recursive: true
    });
}

// =====================================================
// FECHA ACTUAL
// =====================================================

function obtenerFechaActual() {

    const ahora = new Date();

    const year =
        ahora.getFullYear();

    const month =
        String(
            ahora.getMonth() + 1
        ).padStart(2, '0');

    const day =
        String(
            ahora.getDate()
        ).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// =====================================================
// LEER VÍDEOS YA PUBLICADOS
// =====================================================

const videosGuardados = new Set();

let csvContenido = '';

if (fs.existsSync(CSV_FILE)) {

    csvContenido =
        fs.readFileSync(
            CSV_FILE,
            'utf8'
        );

    const lineas =
        csvContenido
            .split('\n')
            .slice(1);

    for (const linea of lineas) {

        const separador =
            linea.indexOf(',');

        if (separador !== -1) {

            const url =
                linea
                    .slice(separador + 1)
                    .trim();

            if (url) {
                videosGuardados.add(url);
            }
        }
    }
}

// =====================================================
// CONTAR PUBLICACIONES DEL DÍA
// =====================================================

function contarPublicacionesHoy() {

    if (!fs.existsSync(CSV_FILE)) {
        return 0;
    }

    const fechaHoy =
        obtenerFechaActual();

    const data =
        fs.readFileSync(
            CSV_FILE,
            'utf8'
        );

    const lineas =
        data
            .split('\n')
            .slice(1);

    let contador = 0;

    for (const linea of lineas) {

        if (!linea.trim()) {
            continue;
        }

        const partes =
            linea.split(',');

        /*
         * Formato:
         *
         * Numero,Fecha,URL
         */

        if (
            partes.length >= 3 &&
            partes[1] === fechaHoy
        ) {
            contador++;
        }
    }

    return contador;
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

    // Quitar espacios repetidos
    resultado =
        resultado.replace(
            /\s+/g,
            ' '
        );

    // Quitar hashtags del final
    resultado =
        resultado.replace(
            /(\s*#[\wáéíóúñÁÉÍÓÚÑ]+)+\s*$/g,
            ''
        ).trim();

    // Limitar longitud
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
// ENVIAR VÍDEO A TELEGRAM
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
// GUARDAR RESPUESTA DE VÍDEO
// =====================================================

async function guardarRespuestaVideo(
    response,
    archivo
) {

    try {

        if (!response.ok()) {
            return false;
        }

        const headers =
            response.headers();

        const contentType =
            headers['content-type'] || '';

        const contentLength =
            Number(
                headers['content-length'] || 0
            );

        // Solo aceptar vídeos
        if (
            !contentType.includes(
                'video/'
            )
        ) {
            return false;
        }

        console.log(
            `🎥 Vídeo detectado: ${contentType}`
        );

        const buffer =
            await response.body();

        if (
            !buffer ||
            buffer.length < 10000
        ) {

            console.log(
                '⚠️ Respuesta demasiado pequeña.'
            );

            return false;
        }

        fs.writeFileSync(
            archivo,
            buffer
        );

        console.log(
            `✅ Vídeo guardado: ` +
            `${(
                buffer.length /
                1024 /
                1024
            ).toFixed(2)} MB`
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

        return true;

    } catch (error) {

        console.error(
            '❌ Error guardando respuesta:',
            error.message
        );

        return false;
    }
}

// =====================================================
// CAPTURAR VÍDEOS
// =====================================================

async function capturarVirales() {

    console.log(
        '\n🚀 Buscando vídeos virales...'
    );

    let browser;
    let context;

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

                locale: 'es-ES'
            });

        const page =
            await context.newPage();

        // =================================================
        // VÍDEOS DETECTADOS
        // =================================================

        const videos =
            new Map();

        // =================================================
        // API DE TIKTOK
        // =================================================

        page.on(
            'response',
            async response => {

                const url =
                    response.url();

                if (
                    !url.includes(
                        '/api/recommend/item_list'
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
                            item?.author?.uniqueId &&
                            item?.id
                        ) {

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
                                            ),

                                        videoResponse:
                                            null
                                    }
                                );
                            }
                        }
                    }

                } catch {
                    // Ignorar respuestas no JSON
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

                    const headers =
                        response.headers();

                    const contentType =
                        headers[
                            'content-type'
                        ] || '';

                    if (
                        !contentType.includes(
                            'video/'
                        )
                    ) {
                        return;
                    }

                    if (!response.ok()) {
                        return;
                    }

                    for (
                        const video
                        of videos.values()
                    ) {

                        if (
                            !video.videoResponse
                        ) {

                            video.videoResponse =
                                response;

                            console.log(
                                '🎥 Vídeo de red capturado'
                            );

                            break;
                        }
                    }

                } catch {
                    // Ignorar errores
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
            5000
        );

        // =================================================
        // SCROLL
        // =================================================

        for (
            let i = 0;
            i < 6;
            i++
        ) {

            await page.mouse.wheel(
                0,
                5000
            );

            await page.waitForTimeout(
                1500
            );
        }

        // Esperar peticiones
        await page.waitForTimeout(
            5000
        );

        // =================================================
        // LISTA
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
            `🎯 Vídeos nuevos encontrados: ${lista.length}`
        );

        // =================================================
        // CSV
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
                'Numero,Fecha,URL\n';
        }

        let contador =
            Math.max(
                0,
                csv
                    .trim()
                    .split('\n')
                    .length - 1
            ) + 1;

        // =================================================
        // PUBLICAR
        // =================================================

        for (
            let i = 0;
            i < lista.length;
            i++
        ) {

            // Comprobar límite nuevamente
            const publicacionesHoy =
                contarPublicacionesHoy();

            if (
                publicacionesHoy >=
                MAX_PUBLICACIONES_DIA
            ) {

                console.log(
                    `🛑 Límite diario alcanzado: ` +
                    `${MAX_PUBLICACIONES_DIA}/${MAX_PUBLICACIONES_DIA}`
                );

                break;
            }

            const video =
                lista[i];

            console.log(
                `\n📹 Procesando vídeo ` +
                `${i + 1}/${lista.length}`
            );

            console.log(
                `📝 Título: ${video.title}`
            );

            if (
                !video.videoResponse
            ) {

                console.log(
                    '⚠️ No se capturó la respuesta de vídeo.'
                );

                continue;
            }

            const nombreArchivo =
                `video_${Date.now()}_${contador}.mp4`;

            const archivo =
                path.join(
                    DOWNLOAD_DIR,
                    nombreArchivo
                );

            console.log(
                '⬇️ Guardando vídeo...'
            );

            const descargado =
                await guardarRespuestaVideo(
                    video.videoResponse,
                    archivo
                );

            if (!descargado) {

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
            // GUARDAR EN CSV
            // =================================================

            if (enviado) {

                const fecha =
                    obtenerFechaActual();

                csv +=
                    `${contador},${fecha},${video.url}\n`;

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
                    `💾 Guardado en CSV.`
                );

                console.log(
                    `📅 Publicaciones hoy: ` +
                    `${contarPublicacionesHoy()}/` +
                    `${MAX_PUBLICACIONES_DIA}`
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
// EJECUCIÓN ÚNICA
// =====================================================

async function main() {

    console.log(
        '🤖 Bot iniciado correctamente'
    );

    console.log(
        `📺 Canal: ${CHANNEL_ID}`
    );

    console.log(
        `🎬 Máximo de publicaciones al día: ` +
        `${MAX_PUBLICACIONES_DIA}`
    );

    const publicacionesHoy =
        contarPublicacionesHoy();

    console.log(
        `📅 Publicaciones realizadas hoy: ` +
        `${publicacionesHoy}/${MAX_PUBLICACIONES_DIA}`
    );

    // Si ya hay 3 hoy, no hacemos nada
    if (
        publicacionesHoy >=
        MAX_PUBLICACIONES_DIA
    ) {

        console.log(
            '🛑 Ya se alcanzó el límite diario.'
        );

        console.log(
            '🌙 No se publicará nada más hoy.'
        );

        return;
    }

    await capturarVirales();

    console.log(
        '\n🏁 Ejecución terminada.'
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