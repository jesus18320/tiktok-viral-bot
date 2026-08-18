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

const MAX_PUBLICACIONES = 1;

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

// =====================================================
// BOT TELEGRAM
// =====================================================

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
// NORMALIZAR URL TIKTOK
// =====================================================

function normalizarUrlTikTok(url) {

    if (!url || typeof url !== 'string') {
        return '';
    }

    let resultado = url.trim();

    if (!resultado) {
        return '';
    }

    resultado = resultado.split('?')[0];

    resultado = resultado.split('#')[0];

    resultado = resultado.replace(/\/+$/, '');

    resultado = resultado.replace(
        /^https?:\/\/(www\.)?tiktok\.com/i,
        'https://www.tiktok.com'
    );

    return resultado;
}

// =====================================================
// OBTENER ID TIKTOK
// =====================================================

function obtenerIdTikTok(url) {

    if (!url || typeof url !== 'string') {
        return '';
    }

    const limpia =
        normalizarUrlTikTok(url);

    const coincidencia =
        limpia.match(
            /\/video\/(\d+)/i
        );

    if (!coincidencia) {
        return '';
    }

    return coincidencia[1];
}

// =====================================================
// HISTORIAL
// =====================================================

function obtenerHistorial() {

    const urls = new Set();

    const ids = new Set();

    if (!fs.existsSync(CSV_FILE)) {

        return {
            urls,
            ids
        };
    }

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

        if (!linea.trim()) {
            continue;
        }

        const separador =
            linea.indexOf(',');

        if (separador === -1) {
            continue;
        }

        const url =
            linea
                .slice(separador + 1)
                .trim();

        if (!url) {
            continue;
        }

        const urlNormalizada =
            normalizarUrlTikTok(url);

        if (urlNormalizada) {
            urls.add(urlNormalizada);
        }

        const id =
            obtenerIdTikTok(
                urlNormalizada
            );

        if (id) {
            ids.add(id);
        }
    }

    return {
        urls,
        ids
    };
}

// =====================================================
// NÚMERO SIGUIENTE
// =====================================================

function obtenerNumeroSiguiente() {

    if (!fs.existsSync(CSV_FILE)) {
        return 1;
    }

    const data =
        fs.readFileSync(
            CSV_FILE,
            'utf8'
        ).trim();

    if (!data) {
        return 1;
    }

    const lineas =
        data.split(/\r?\n/);

    if (lineas.length <= 1) {
        return 1;
    }

    let maximo = 0;

    for (
        const linea
        of lineas.slice(1)
    ) {

        const separador =
            linea.indexOf(',');

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
        normalizarUrlTikTok(url);

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
// ENVIAR VÍDEO A TELEGRAM
// =====================================================

async function enviarTelegram(
    titulo,
    archivo
) {

    try {

        console.log('');
        console.log(
            '📤 ENVIANDO VÍDEO A TELEGRAM...'
        );

        console.log(
            `📁 Archivo: ${archivo}`
        );

        const estadisticas =
            fs.statSync(
                archivo
            );

        const tamañoMB =
            (
                estadisticas.size /
                1024 /
                1024
            ).toFixed(2);

        console.log(
            `💾 Tamaño: ${tamañoMB} MB`
        );

        const tituloLimpio =
            limpiarTitulo(titulo);

        console.log(
            `📝 Caption: ${tituloLimpio}`
        );

        const mensaje =
            await bot.sendVideo(
                CHANNEL_ID,
                archivo,
                {
                    caption:
                        `🎬 ${tituloLimpio}`,

                    supports_streaming: true
                },
                {
                    filename:
                        path.basename(
                            archivo
                        ),

                    contentType:
                        'video/mp4'
                }
            );

        console.log('');
        console.log(
            '=========================================='
        );

        console.log(
            '✅ VIDEO ENVIADO CORRECTAMENTE'
        );

        console.log(
            '=========================================='
        );

        console.log(
            `📨 Message ID: ${mensaje.message_id}`
        );

        console.log(
            `📺 Canal: ${CHANNEL_ID}`
        );

        console.log(
            `🎥 Archivo: ${path.basename(archivo)}`
        );

        console.log(
            `💾 Tamaño: ${tamañoMB} MB`
        );

        console.log(
            '=========================================='
        );

        return true;

    } catch (error) {

        console.error('');
        console.error(
            '=========================================='
        );

        console.error(
            '❌ ERROR ENVIANDO EL VÍDEO A TELEGRAM'
        );

        console.error(
            '=========================================='
        );

        console.error(
            '❌ Mensaje:',
            error.message
        );

        if (
            error.response &&
            error.response.body
        ) {

            console.error(
                '❌ Respuesta de Telegram:',
                error.response.body
            );
        }

        console.error(
            '=========================================='
        );

        return false;
    }
}

// =====================================================
// DETECTAR VÍDEOS
// =====================================================

async function obtenerVideosDePagina(
    page
) {

    const mapa =
        new Map();

    const elementos =
        await page.locator(
            'a[href*="/video/"]'
        ).all();

    console.log(
        `🔎 Enlaces de vídeos encontrados: ${elementos.length}`
    );

    for (
        const elemento
        of elementos
    ) {

        try {

            const href =
                await elemento.getAttribute(
                    'href'
                );

            if (!href) {
                continue;
            }

            if (!href.includes('/video/')) {
                continue;
            }

            const url =
                href.startsWith('http')
                    ? href
                    : `https://www.tiktok.com${href}`;

            const urlNormalizada =
                normalizarUrlTikTok(url);

            const id =
                obtenerIdTikTok(
                    urlNormalizada
                );

            if (!id) {
                continue;
            }

            if (mapa.has(id)) {
                continue;
            }

            let titulo =
                'Vídeo viral';

            try {

                const texto =
                    await elemento.innerText();

                if (
                    texto &&
                    texto.trim()
                ) {

                    titulo =
                        limpiarTitulo(
                            texto
                        );
                }

            } catch {
                // Título por defecto
            }

            mapa.set(
                id,
                {
                    id,
                    url: urlNormalizada,
                    title: titulo
                }
            );

            console.log(
                `📝 Detectado: ${titulo}`
            );

            console.log(
                `   🆔 ID: ${id}`
            );

        } catch {
            // Ignorar elemento
        }
    }

    return Array.from(
        mapa.values()
    );
}

// =====================================================
// OBTENER FUENTES DE LOS REPRODUCTORES
// =====================================================

async function obtenerFuentesVideo(
    page
) {

    const fuentes = [];

    const elementos =
        await page.locator(
            'video'
        ).evaluateAll(
            videos =>
                videos.map(
                    video => ({
                        src:
                            video.currentSrc ||
                            video.src ||
                            ''
                    })
                )
        );

    for (
        const video
        of elementos
    ) {

        const src =
            video.src;

        if (!src) {
            continue;
        }

        if (
            !src.startsWith('http')
        ) {
            continue;
        }

        if (
            fuentes.includes(src)
        ) {
            continue;
        }

        fuentes.push(src);
    }

    return fuentes;
}

// =====================================================
// DESCARGAR VÍDEO
// =====================================================

async function descargarVideo(
    context,
    videoUrl,
    archivo
) {

    try {

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
                            '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
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
            !contentType.toLowerCase().includes('video')
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
            `✅ Vídeo guardado: ${(
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
// CAPTURAR VIRALES
// =====================================================

async function capturarVirales() {

    console.log('');
    console.log(
        '🚀 Buscando vídeos virales...'
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

                locale: 'es-ES'
            });

        const page =
            await context.newPage();

        // =================================================
        // HISTORIAL
        // =================================================

        const historial =
            obtenerHistorial();

        console.log(
            `💾 URLs guardadas: ${historial.urls.size}`
        );

        console.log(
            `🆔 IDs guardados: ${historial.ids.size}`
        );

        // =================================================
        // TIKTOK
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
            4000
        );

        // =================================================
        // DETECTAR
        // =================================================

        const videos =
            await obtenerVideosDePagina(
                page
            );

        console.log(
            `🎯 Vídeos detectados: ${videos.length}`
        );

        // =================================================
        // FILTRAR HISTORIAL
        // =================================================

        const nuevos =
            videos
                .filter(
                    video => {

                        if (
                            historial.ids.has(
                                video.id
                            )
                        ) {

                            console.log(
                                `⏭️ Ya publicado por ID: ${video.id}`
                            );

                            return false;
                        }

                        if (
                            historial.urls.has(
                                video.url
                            )
                        ) {

                            console.log(
                                `⏭️ Ya publicado por URL: ${video.url}`
                            );

                            return false;
                        }

                        return true;
                    }
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
        // FUENTES
        // =================================================

        const fuentes =
            await obtenerFuentesVideo(
                page
            );

        console.log(
            `🎥 Fuentes de vídeo encontradas: ${fuentes.length}`
        );

        if (!fuentes.length) {

            console.error(
                '❌ TikTok no proporcionó ninguna fuente de vídeo.'
            );

            return 0;
        }

        // =================================================
        // PUBLICAR
        // =================================================

        let contador =
            obtenerNumeroSiguiente();

        let publicaciones = 0;

        for (
            let i = 0;
            i < nuevos.length;
            i++
        ) {

            if (
                publicaciones >=
                MAX_PUBLICACIONES
            ) {
                break;
            }

            const video =
                nuevos[i];

            console.log('');
            console.log(
                `📹 Procesando candidato ${i + 1}/${nuevos.length}`
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

            /*
             * IMPORTANTE:
             *
             * En esta fase de prueba usamos la fuente
             * que TikTok proporciona al reproductor.
             *
             * Como todavía no tenemos una relación
             * fiable entre cada enlace y cada elemento
             * <video>, usamos la primera fuente disponible.
             *
             * El siguiente paso será mejorar esa relación
             * si comprobamos que esta descarga funciona.
             */

            const videoSrc =
                fuentes[0];

            if (!videoSrc) {

                console.error(
                    '❌ No hay fuente disponible.'
                );

                continue;
            }

            console.log(
                '🎬 Fuente de vídeo encontrada.'
            );

            const nombreArchivo =
                `video_${Date.now()}_${contador}.mp4`;

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
                    videoSrc,
                    archivo
                );

            if (!descargado) {

                console.error(
                    '❌ No se pudo descargar el vídeo.'
                );

                if (
                    fs.existsSync(
                        archivo
                    )
                ) {

                    fs.unlinkSync(
                        archivo
                    );
                }

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

                historial.urls.add(
                    video.url
                );

                historial.ids.add(
                    video.id
                );

                contador++;

                publicaciones++;

                console.log('');
                console.log(
                    '💾 Vídeo registrado en el historial.'
                );

                console.log(
                    `💾 ID registrado: ${video.id}`
                );

                console.log(
                    `💾 URL registrada: ${video.url}`
                );

                console.log(
                    `✅ Publicación ${publicaciones}/${MAX_PUBLICACIONES} completada.`
                );

            } else {

                console.error(
                    '❌ Telegram no confirmó el envío.'
                );

                console.error(
                    '⚠️ El vídeo NO se registrará en el historial.'
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

        console.log('');
        console.log(
            `🏁 Ciclo terminado. Publicados: ${publicaciones}/${MAX_PUBLICACIONES}`
        );

        return publicaciones;

    } catch (error) {

        console.error('');
        console.error(
            '❌ ERROR CAPTURANDO VÍDEOS:'
        );

        console.error(
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

    console.log('');
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
        '📅 GitHub Actions controla cuándo se ejecuta.'
    );

    const publicaciones =
        await capturarVirales();

    console.log('');
    console.log(
        `🏁 Bot terminado. Publicaciones realizadas: ${publicaciones}`
    );

    process.exit(0);
}

// =====================================================
// EJECUTAR
// =====================================================

main().catch(
    error => {

        console.error('');
        console.error(
            '❌ ERROR FATAL:'
        );

        console.error(
            error
        );

        process.exit(1);
    }
);