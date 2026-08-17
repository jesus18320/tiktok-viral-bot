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

// 1 vídeo por ejecución.
const MAX_PUBLICACIONES = 1;

// Máximo de candidatos que buscamos.
const MAX_VIDEOS = 20;

const CSV_FILE = 'videos_virales.csv';
const DOWNLOAD_DIR = 'videos_temp';

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
// EXTRAER ID DE TIKTOK
// =====================================================

function obtenerIdTikTok(url) {

    if (!url) {
        return null;
    }

    const coincidencia =
        String(url).match(
            /\/video\/(\d+)/
        );

    if (!coincidencia) {
        return null;
    }

    return coincidencia[1];
}

// =====================================================
// NORMALIZAR URL
// =====================================================

function normalizarUrl(url) {

    if (!url) {
        return '';
    }

    return String(url)
        .trim()
        .split('?')[0]
        .replace(/\/+$/, '');
}

// =====================================================
// HISTORIAL
// =====================================================

function obtenerVideosGuardados() {

    const ids = new Set();
    const urls = new Set();

    if (!fs.existsSync(CSV_FILE)) {
        return {
            ids,
            urls
        };
    }

    try {

        const data =
            fs.readFileSync(
                CSV_FILE,
                'utf8'
            );

        const lineas =
            data.split('\n');

        for (const lineaOriginal of lineas) {

            const linea =
                lineaOriginal.trim();

            if (!linea) {
                continue;
            }

            // Ignorar cabecera.
            if (
                linea.toLowerCase()
                    .startsWith('numero')
            ) {
                continue;
            }

            /*
             * Buscamos directamente una URL de TikTok.
             *
             * Esto permite leer tanto el CSV antiguo:
             *
             * 1,https://www.tiktok.com/...
             *
             * como el nuevo formato.
             */

            const coincidencia =
                linea.match(
                    /https?:\/\/(?:www\.)?tiktok\.com\/[^\s,]+/
                );

            if (!coincidencia) {
                continue;
            }

            const url =
                normalizarUrl(
                    coincidencia[0]
                );

            if (!url) {
                continue;
            }

            urls.add(url);

            const id =
                obtenerIdTikTok(url);

            if (id) {
                ids.add(id);
            }
        }

    } catch (error) {

        console.error(
            '❌ Error leyendo historial:',
            error.message
        );
    }

    return {
        ids,
        urls
    };
}

// =====================================================
// SIGUIENTE NÚMERO
// =====================================================

function obtenerNumeroSiguiente() {

    if (!fs.existsSync(CSV_FILE)) {
        return 1;
    }

    try {

        const data =
            fs.readFileSync(
                CSV_FILE,
                'utf8'
            );

        let mayor = 0;

        const lineas =
            data.split('\n');

        for (const linea of lineas) {

            const coincidencia =
                linea.match(
                    /^\s*(\d+)\s*,/
                );

            if (!coincidencia) {
                continue;
            }

            const numero =
                Number(
                    coincidencia[1]
                );

            if (
                Number.isFinite(numero) &&
                numero > mayor
            ) {
                mayor = numero;
            }
        }

        return mayor + 1;

    } catch {
        return 1;
    }
}

// =====================================================
// REGISTRAR VÍDEO
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

    const urlNormalizada =
        normalizarUrl(url);

    fs.appendFileSync(
        CSV_FILE,
        `${numero},${urlNormalizada}\n`,
        'utf8'
    );
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
// DESCARGAR VÍDEO DESDE URL
// =====================================================

async function descargarVideo(
    context,
    videoUrl,
    archivo
) {

    try {

        if (!videoUrl) {
            return false;
        }

        console.log(
            '⬇️ Descargando vídeo...'
        );

        const response =
            await context.request.get(
                videoUrl,
                {
                    timeout: 60000,

                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                            'AppleWebKit/537.36 ' +
                            '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',

                        'Referer':
                            'https://www.tiktok.com/'
                    }
                }
            );

        if (!response.ok()) {

            console.error(
                `❌ Error HTTP ${response.status()}`
            );

            return false;
        }

        const contentType =
            response.headers()[
                'content-type'
            ] || '';

        console.log(
            `🎥 Tipo recibido: ${contentType}`
        );

        if (
            !contentType
                .toLowerCase()
                .includes('video')
        ) {

            console.error(
                '❌ La respuesta no es un vídeo.'
            );

            return false;
        }

        const buffer =
            await response.body();

        if (
            !buffer ||
            buffer.length < 10000
        ) {

            console.error(
                '❌ El vídeo recibido es demasiado pequeño.'
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
            '❌ Error descargando vídeo:',
            error.message
        );

        return false;
    }
}

// =====================================================
// PROCESAR ITEM DE TIKTOK
// =====================================================

function procesarItemTikTok(
    item,
    videos,
    historial
) {

    try {

        if (
            !item ||
            !item.id ||
            !item.author?.uniqueId
        ) {
            return;
        }

        const id =
            String(item.id);

        const username =
            item.author.uniqueId;

        const url =
            normalizarUrl(
                `https://www.tiktok.com/@${username}/video/${id}`
            );

        // =================================================
        // COMPROBAR HISTORIAL POR ID
        // =================================================

        if (
            historial.ids.has(id)
        ) {
            return;
        }

        // También comprobamos URL.
        if (
            historial.urls.has(url)
        ) {
            return;
        }

        // =================================================
        // TÍTULO
        // =================================================

        const titulo =
            limpiarTitulo(
                item.desc ||
                item.description ||
                'Vídeo viral'
            );

        // =================================================
        // URL REAL DEL VÍDEO
        // =================================================

        const videoUrl =
            item.video?.playAddr ||
            item.video?.downloadAddr ||
            null;

        if (!videoUrl) {

            console.log(
                `⚠️ Vídeo ${id} detectado pero TikTok no proporcionó playAddr.`
            );

            return;
        }

        // =================================================
        // GUARDAR CANDIDATO
        // =================================================

        if (!videos.has(id)) {

            videos.set(
                id,
                {
                    id,
                    url,
                    title: titulo,
                    videoUrl
                }
            );

            console.log(
                `📝 Detectado: ${titulo}`
            );

            console.log(
                `   🆔 ID: ${id}`
            );
        }

    } catch {
        // Ignorar elementos problemáticos.
    }
}

// =====================================================
// BUSCAR VÍDEOS
// =====================================================

async function capturarVirales() {

    console.log(
        '\n🚀 Buscando vídeos virales...'
    );

    let browser = null;
    let context = null;

    try {

        // =================================================
        // HISTORIAL
        // =================================================

        const historial =
            obtenerVideosGuardados();

        console.log(
            `💾 Vídeos guardados en historial: ${historial.ids.size}`
        );

        // =================================================
        // CHROMIUM
        // =================================================

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
        // VÍDEOS
        // =================================================

        const videos =
            new Map();

        // =================================================
        // CAPTURAR RESPUESTAS JSON
        // =================================================

        page.on(
            'response',
            async response => {

                try {

                    const url =
                        response.url();

                    if (
                        !url.includes(
                            'tiktok.com'
                        )
                    ) {
                        return;
                    }

                    const contentType =
                        response.headers()[
                            'content-type'
                        ] || '';

                    if (
                        !contentType
                            .toLowerCase()
                            .includes('json')
                    ) {
                        return;
                    }

                    const json =
                        await response.json();

                    // -----------------------------------------
                    // itemList
                    // -----------------------------------------

                    if (
                        Array.isArray(
                            json?.itemList
                        )
                    ) {

                        for (
                            const item
                            of json.itemList
                        ) {

                            procesarItemTikTok(
                                item,
                                videos,
                                historial
                            );
                        }
                    }

                    // -----------------------------------------
                    // data.itemList
                    // -----------------------------------------

                    if (
                        Array.isArray(
                            json?.data?.itemList
                        )
                    ) {

                        for (
                            const item
                            of json.data.itemList
                        ) {

                            procesarItemTikTok(
                                item,
                                videos,
                                historial
                            );
                        }
                    }

                } catch {
                    // Ignorar respuestas no procesables.
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

                timeout: 60000
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

            await page.mouse.wheel(
                0,
                4500
            );

            await page.waitForTimeout(
                1800
            );
        }

        await page.waitForTimeout(
            5000
        );

        // =================================================
        // RESULTADO
        // =================================================

        console.log(
            `🎯 Vídeos detectados: ${videos.size}`
        );

        const nuevos =
            Array
                .from(
                    videos.values()
                )
                .filter(
                    video =>
                        !historial.ids.has(
                            video.id
                        )
                )
                .filter(
                    video =>
                        !historial.urls.has(
                            video.url
                        )
                )
                .slice(
                    0,
                    MAX_VIDEOS
                );

        console.log(
            `🆕 Vídeos nuevos disponibles: ${nuevos.length}`
        );

        if (!nuevos.length) {

            console.log(
                'ℹ️ No hay vídeos nuevos para publicar.'
            );

            return 0;
        }

        // =================================================
        // NÚMERO
        // =================================================

        let contador =
            obtenerNumeroSiguiente();

        let publicaciones = 0;

        // =================================================
        // PUBLICAR
        // =================================================

        for (
            const video
            of nuevos
        ) {

            if (
                publicaciones >=
                MAX_PUBLICACIONES
            ) {
                break;
            }

            console.log(
                `\n📹 Procesando vídeo ${publicaciones + 1}/${MAX_PUBLICACIONES}`
            );

            console.log(
                `🆔 ID: ${video.id}`
            );

            console.log(
                `🔗 URL: ${video.url}`
            );

            console.log(
                `📝 Título: ${video.title}`
            );

            // =================================================
            // ARCHIVO
            // =================================================

            const nombreArchivo =
                `video_${Date.now()}_${video.id}.mp4`;

            const archivo =
                path.join(
                    DOWNLOAD_DIR,
                    nombreArchivo
                );

            // =================================================
            // DESCARGAR
            // =================================================

            const descargado =
                await descargarVideo(
                    context,
                    video.videoUrl,
                    archivo
                );

            if (!descargado) {

                console.log(
                    '❌ No se pudo descargar el vídeo.'
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
            // REGISTRAR SOLO DESPUÉS DE TELEGRAM
            // =================================================

            if (enviado) {

                registrarVideo(
                    contador,
                    video.url
                );

                historial.ids.add(
                    video.id
                );

                historial.urls.add(
                    video.url
                );

                contador++;
                publicaciones++;

                console.log(
                    `💾 Vídeo registrado en historial: ${video.id}`
                );

                console.log(
                    `✅ Publicación ${publicaciones}/${MAX_PUBLICACIONES} completada.`
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
            `\n🏁 Ciclo terminado. Publicados: ${publicaciones}/${MAX_PUBLICACIONES}`
        );

        return publicaciones;

    } catch (error) {

        console.error(
            '❌ Error capturando vídeos:',
            error.message
        );

        return 0;

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
        '🤖 TikTok Viral Bot iniciado'
    );

    console.log(
        `📺 Canal: ${CHANNEL_ID}`
    );

    console.log(
        `🎯 Máximo: ${MAX_PUBLICACIONES} publicación por ejecución`
    );

    console.log(
        '📅 GitHub Actions controla las ejecuciones.'
    );

    const publicaciones =
        await capturarVirales();

    console.log(
        `\n🏁 Bot terminado. Publicaciones realizadas: ${publicaciones}`
    );

    process.exit(0);
}

// =====================================================
// ERROR FATAL
// =====================================================

main().catch(error => {

    console.error(
        '❌ Error fatal:',
        error
    );

    process.exit(1);
});