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

const MIN_VIDEO_BYTES = 100 * 1024;

if (!TOKEN) {
    console.error('❌ Falta la variable TELEGRAM_BOT_TOKEN.');
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
// NORMALIZAR URL
// =====================================================

function normalizarUrl(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }

    return url
        .trim()
        .split('?')[0]
        .split('#')[0]
        .replace(/\/+$/, '');
}

// =====================================================
// HISTORIAL
// =====================================================

function obtenerVideosGuardados() {

    const guardados = new Set();

    if (!fs.existsSync(CSV_FILE)) {
        return guardados;
    }

    const data = fs.readFileSync(
        CSV_FILE,
        'utf8'
    );

    const lineas = data
        .split(/\r?\n/)
        .slice(1);

    for (const linea of lineas) {

        if (!linea.trim()) {
            continue;
        }

        const separador = linea.indexOf(',');

        if (separador === -1) {
            continue;
        }

        const url = normalizarUrl(
            linea.slice(separador + 1)
        );

        if (url) {
            guardados.add(url);
        }
    }

    return guardados;
}

// =====================================================
// LIMPIAR TÍTULO
// =====================================================

function limpiarTitulo(titulo) {

    if (!titulo || typeof titulo !== 'string') {
        return 'Vídeo viral';
    }

    let resultado = titulo.trim();

    resultado = resultado.replace(
        /\s+/g,
        ' '
    );

    resultado = resultado.replace(
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

    return resultado || 'Vídeo viral';
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

        await bot.sendVideo(
            CHANNEL_ID,
            archivo,
            {
                caption:
                    `🎬 ${limpiarTitulo(titulo)}`,

                supports_streaming: true
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
// GUARDAR RESPUESTA INMEDIATAMENTE
// =====================================================

async function guardarRespuestaVideo(
    response,
    archivo
) {

    try {

        if (!response.ok()) {
            return false;
        }

        const headers = response.headers();

        const contentType =
            (
                headers['content-type'] ||
                ''
            ).toLowerCase();

        if (!contentType.includes('video/')) {
            return false;
        }

        const contentLength =
            Number(
                headers['content-length'] || 0
            );

        console.log(
            `🎥 Respuesta de vídeo detectada: ${contentType}`
        );

        if (
            contentLength > 0 &&
            contentLength < MIN_VIDEO_BYTES
        ) {

            console.log(
                `⏭️ Respuesta de vídeo pequeña descartada: ${contentLength} bytes`
            );

            return false;
        }

        const buffer =
            await response.body();

        if (
            !buffer ||
            buffer.length < MIN_VIDEO_BYTES
        ) {

            console.log(
                `⏭️ Vídeo demasiado pequeño: ${buffer?.length || 0} bytes`
            );

            return false;
        }

        const cabecera =
            buffer
                .subarray(0, 64)
                .toString('ascii');

        if (!cabecera.includes('ftyp')) {

            console.log(
                '⚠️ El archivo no parece un MP4 válido.'
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
// OBTENER SIGUIENTE NÚMERO
// =====================================================

function obtenerNumeroSiguiente() {

    if (!fs.existsSync(CSV_FILE)) {
        return 1;
    }

    const data = fs.readFileSync(
        CSV_FILE,
        'utf8'
    );

    const lineas = data
        .split(/\r?\n/)
        .slice(1);

    let maximo = 0;

    for (const linea of lineas) {

        const separador = linea.indexOf(',');

        if (separador === -1) {
            continue;
        }

        const numero =
            Number(
                linea
                    .slice(0, separador)
                    .trim()
            );

        if (
            Number.isFinite(numero) &&
            numero > maximo
        ) {
            maximo = numero;
        }
    }

    return maximo + 1;
}

// =====================================================
// REGISTRAR EN CSV
// =====================================================

function registrarVideo(
    numero,
    url
) {

    if (!fs.existsSync(CSV_FILE)) {

        fs.writeFileSync(
            CSV_FILE,
            'Numero,URL\n',
            'utf8'
        );
    }

    const linea =
        `${numero},${normalizarUrl(url)}\n`;

    fs.appendFileSync(
        CSV_FILE,
        linea,
        'utf8'
    );

    console.log(
        '💾 Vídeo registrado en CSV.'
    );
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
        // HISTORIAL
        // =================================================

        const videosGuardados =
            obtenerVideosGuardados();

        console.log(
            `💾 Vídeos guardados en CSV: ${videosGuardados.size}`
        );

        // =================================================
        // VÍDEOS DETECTADOS
        // =================================================

        const videos = new Map();

        // =================================================
        // RESPUESTAS API DE TIKTOK
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

                        const urlNormalizada =
                            normalizarUrl(videoUrl);

                        if (
                            videos.has(
                                urlNormalizada
                            )
                        ) {
                            continue;
                        }

                        videos.set(
                            urlNormalizada,
                            {
                                url:
                                    urlNormalizada,

                                title:
                                    limpiarTitulo(
                                        titulo
                                    ),

                                videoResponse:
                                    null,

                                videoSize:
                                    0
                            }
                        );

                        console.log(
                            `📝 Vídeo detectado: ` +
                            `${limpiarTitulo(titulo)}`
                        );
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
                        (
                            headers[
                                'content-type'
                            ] || ''
                        ).toLowerCase();

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

                    const contentLength =
                        Number(
                            headers[
                                'content-length'
                            ] || 0
                        );

                    if (
                        contentLength > 0 &&
                        contentLength <
                        MIN_VIDEO_BYTES
                    ) {

                        console.log(
                            `⏭️ Respuesta de vídeo pequeña descartada: ` +
                            `${contentLength} bytes`
                        );

                        return;
                    }

                    /*
                     * IMPORTANTE:
                     *
                     * Leemos response.body() AQUÍ,
                     * inmediatamente después de recibir
                     * la respuesta.
                     *
                     * Así evitamos:
                     *
                     * Network.getResponseBody
                     * No data found for resource
                     */

                    let buffer;

                    try {

                        buffer =
                            await response.body();

                    } catch (error) {

                        console.log(
                            '⚠️ No se pudo leer inmediatamente la respuesta de vídeo:',
                            error.message
                        );

                        return;
                    }

                    if (
                        !buffer ||
                        buffer.length <
                        MIN_VIDEO_BYTES
                    ) {

                        console.log(
                            `⏭️ Vídeo pequeño descartado: ` +
                            `${buffer?.length || 0} bytes`
                        );

                        return;
                    }

                    const cabecera =
                        buffer
                            .subarray(0, 64)
                            .toString('ascii');

                    if (
                        !cabecera.includes('ftyp')
                    ) {

                        console.log(
                            '⚠️ Respuesta de vídeo sin firma MP4. Se ignora.'
                        );

                        return;
                    }

                    /*
                     * Guardamos el BUFFER, no el objeto
                     * response.
                     *
                     * Esto evita que falle posteriormente
                     * cuando TikTok navegue a otro vídeo.
                     */

                    for (
                        const video
                        of videos.values()
                    ) {

                        if (
                            !video.videoBuffer
                        ) {

                            video.videoBuffer =
                                buffer;

                            video.videoSize =
                                buffer.length;

                            console.log(
                                `🎥 Vídeo de red capturado: ` +
                                `${(
                                    buffer.length /
                                    1024 /
                                    1024
                                ).toFixed(2)} MB`
                            );

                            break;
                        }
                    }

                } catch (error) {

                    console.log(
                        '⚠️ Error procesando respuesta de vídeo:',
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
            let i = 0;
            i < 8;
            i++
        ) {

            console.log(
                `📜 Scroll ${i + 1}/8`
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
            6000
        );

        // =================================================
        // VÍDEOS NUEVOS
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
                .filter(
                    video =>
                        video.videoBuffer
                )
                .slice(
                    0,
                    MAX_VIDEOS
                );

        console.log(
            `🎯 Nuevos vídeos encontrados: ${lista.length}`
        );

        // =================================================
        // MOSTRAR INFORMACIÓN
        // =================================================

        for (
            const video
            of lista
        ) {

            console.log('');

            console.log(
                `📝 ${video.title}`
            );

            console.log(
                `🔗 ${video.url}`
            );

            console.log(
                `📦 Tamaño capturado: ` +
                `${video.videoSize} bytes`
            );
        }

        // =================================================
        // PROCESAR
        // =================================================

        let contador =
            obtenerNumeroSiguiente();

        let publicados = 0;

        for (
            let i = 0;
            i < lista.length;
            i++
        ) {

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
                !video.videoBuffer
            ) {

                console.log(
                    '⚠️ No hay vídeo capturado.'
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

            // =================================================
            // GUARDAR BUFFER
            // =================================================

            try {

                fs.writeFileSync(
                    archivo,
                    video.videoBuffer
                );

                console.log(
                    `💾 Archivo escrito: ` +
                    `${(
                        video.videoBuffer.length /
                        1024 /
                        1024
                    ).toFixed(2)} MB`
                );

            } catch (error) {

                console.error(
                    '❌ Error escribiendo archivo:',
                    error.message
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
            // CSV
            // =================================================

            if (enviado) {

                registrarVideo(
                    contador,
                    video.url
                );

                videosGuardados.add(
                    video.url
                );

                contador++;
                publicados++;

                console.log(
                    `✅ Publicados: ` +
                    `${publicados}/${MAX_VIDEOS}`
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
            `\n✅ Ciclo terminado. ` +
            `Publicados: ${publicados}/${MAX_VIDEOS}`
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

main().catch(error => {

    console.error(
        '\n❌ ERROR FATAL:'
    );

    console.error(error);

    process.exit(1);
});