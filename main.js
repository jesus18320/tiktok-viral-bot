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

// 1 vídeo por ejecución
const MAX_PUBLICACIONES = 1;

// Número máximo de candidatos que buscamos
const MAX_VIDEOS = 20;

const CSV_FILE = 'videos_virales.csv';
const DOWNLOAD_DIR = 'videos_temp';

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
// HISTORIAL
// =====================================================

function normalizarUrlTikTok(url) {

    if (!url || typeof url !== 'string') {
        return '';
    }

    let resultado = url.trim();

    if (!resultado) {
        return '';
    }

    // Eliminar parámetros
    resultado = resultado.split('?')[0];

    // Eliminar fragmentos
    resultado = resultado.split('#')[0];

    // Quitar slash final
    resultado = resultado.replace(/\/+$/, '');

    // Normalizar dominio
    resultado = resultado.replace(
        /^https?:\/\/(www\.)?tiktok\.com/i,
        'https://www.tiktok.com'
    );

    return resultado;
}

// -----------------------------------------------------
// Obtener ID del vídeo
// -----------------------------------------------------

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

// -----------------------------------------------------
// Leer historial
// -----------------------------------------------------

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

        /*
         * Formato:
         *
         * Numero,URL
         *
         * Buscamos la URL después
         * de la primera coma.
         */

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
            obtenerIdTikTok(url);

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

    /*
     * El número se obtiene de la primera columna.
     * Así no dependemos simplemente del número
     * de líneas si alguna línea está vacía.
     */

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

    // Eliminar hashtags finales
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
// OBTENER INFORMACIÓN DEL VÍDEO
// =====================================================

async function obtenerInformacionVideo(
    page,
    enlace
) {

    try {

        const href =
            await enlace.getAttribute(
                'href'
            );

        if (!href) {
            return null;
        }

        if (!href.includes('/video/')) {
            return null;
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
            return null;
        }

        let titulo =
            'Vídeo viral';

        try {

            const texto =
                await enlace.innerText();

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
            // Mantener título por defecto
        }

        return {
            id,
            url: urlNormalizada,
            title: titulo,
            videoSrc: null
        };

    } catch {
        return null;
    }
}

// =====================================================
// OBTENER VÍDEOS DETECTADOS
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

        const video =
            await obtenerInformacionVideo(
                page,
                elemento
            );

        if (!video) {
            continue;
        }

        /*
         * El ID es la clave principal.
         * Esto evita duplicados aunque TikTok
         * nos entregue la misma URL varias veces.
         */

        if (!mapa.has(video.id)) {

            mapa.set(
                video.id,
                video
            );

            console.log(
                `📝 Detectado: ${video.title}`
            );

            console.log(
                `   🆔 ID: ${video.id}`
            );
        }
    }

    return Array.from(
        mapa.values()
    );
}

// =====================================================
// CAPTURAR VÍDEOS DEL REPRODUCTOR
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
                            '',
                        poster:
                            video.poster ||
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
// INTENTAR RELACIONAR VÍDEOS CON EL REPRODUCTOR
// =====================================================

async function asociarFuentesVideo(
    page,
    videos
) {

    /*
     * Intentamos obtener el enlace y el <video>
     * correspondiente dentro del mismo bloque.
     */

    for (
        const video
        of videos
    ) {

        try {

            const enlace =
                page.locator(
                    `a[href*="/video/${video.id}"]`
                ).first();

            if (
                await enlace.count() === 0
            ) {
                continue;
            }

            const fuente =
                await enlace.evaluate(
                    elemento => {

                        let actual =
                            elemento;

                        for (
                            let i = 0;
                            i < 8 && actual;
                            i++
                        ) {

                            const reproductor =
                                actual.querySelector?.(
                                    'video'
                                );

                            if (
                                reproductor
                            ) {

                                return (
                                    reproductor.currentSrc ||
                                    reproductor.src ||
                                    ''
                                );
                            }

                            actual =
                                actual.parentElement;
                        }

                        return '';
                    }
                );

            if (
                fuente &&
                fuente.startsWith('http')
            ) {

                video.videoSrc =
                    fuente;

                console.log(
                    `🎥 Fuente asociada al ID ${video.id}`
                );
            }

        } catch {
            // Continuar con el siguiente
        }
    }

    return videos;
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
            !contentType.includes('video')
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
// CAPTURAR VÍDEOS DE TIKTOK
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
        // DETECTAR VÍDEOS
        // =================================================

        let videos =
            await obtenerVideosDePagina(
                page
            );

        console.log(
            `🎯 Vídeos detectados: ${videos.length}`
        );

        // =================================================
        // ASOCIAR FUENTES
        // =================================================

        videos =
            await asociarFuentesVideo(
                page,
                videos
            );

        // =================================================
        // FILTRAR HISTORIAL
        // =================================================

        const nuevos =
            videos
                .filter(
                    video => {

                        const mismoId =
                            historial.ids.has(
                                video.id
                            );

                        const mismaUrl =
                            historial.urls.has(
                                video.url
                            );

                        if (
                            mismoId ||
                            mismaUrl
                        ) {

                            console.log(
                                `⏭️ Ya publicado: ${video.id}`
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
        // FUENTES GENERALES
        // =================================================

        const fuentes =
            await obtenerFuentesVideo(
                page
            );

        console.log(
            `🎥 Fuentes de vídeo encontradas: ${fuentes.length}`
        );

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

            /*
             * Primero utilizamos la fuente asociada
             * específicamente a este vídeo.
             */

            let videoSrc =
                video.videoSrc;

            /*
             * Si no conseguimos asociarla,
             * usamos las fuentes disponibles
             * como alternativa.
             */

            if (!videoSrc) {

                videoSrc =
                    fuentes[0] || '';
            }

            if (!videoSrc) {

                console.error(
                    '❌ No se encontró una fuente de vídeo.'
                );

                continue;
            }

            console.log(
                '🎬 Fuente seleccionada correctamente.'
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

                console.log(
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
            // REGISTRAR
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

                console.log(
                    `💾 ID registrado: ${video.id}`
                );

                console.log(
                    `💾 URL registrada: ${video.url}`
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
        '📅 GitHub Actions controla cuándo se ejecuta.'
    );

    const publicaciones =
        await capturarVirales();

    console.log(
        `\n🏁 Bot terminado. Publicaciones realizadas: ${publicaciones}`
    );

    process.exit(0);
}

main().catch(error => {

    console.error(
        '❌ Error fatal:',
        error
    );

    process.exit(1);
});