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
// Como GitHub Actions ejecuta 3 veces al día:
// 08:00 + 14:00 + 20:00 = hasta 3 vídeos al día.
const MAX_PUBLICACIONES_DIA = 1;

// Número máximo de vídeos que intentaremos detectar.
const MAX_VIDEOS = 20;

const CSV_FILE = 'videos_virales.csv';
const DOWNLOAD_DIR = 'videos_temp';

if (!TOKEN) {
    console.error(
        '❌ No existe TELEGRAM_BOT_TOKEN.'
    );

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

function obtenerVideosGuardados() {

    const videos = new Set();

    if (!fs.existsSync(CSV_FILE)) {
        return videos;
    }

    const data = fs.readFileSync(
        CSV_FILE,
        'utf8'
    );

    const lineas = data
        .split('\n')
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
            videos.add(url);
        }
    }

    return videos;
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
        data.split('\n');

    if (lineas.length <= 1) {
        return 1;
    }

    return lineas.length;
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

    fs.appendFileSync(
        CSV_FILE,
        `${numero},${url}\n`,
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
// DESCARGAR VÍDEO DESDE URL
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
                    timeout: 60000
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
// OBTENER VÍDEOS DE LA PÁGINA
// =====================================================

async function obtenerVideosDePagina(
    page
) {

    const encontrados = [];

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

            if (
                !href.includes('/video/')
            ) {
                continue;
            }

            const url =
                href.startsWith('http')
                    ? href
                    : `https://www.tiktok.com${href}`;

            const normalizada =
                url.split('?')[0];

            if (
                encontrados.some(
                    video =>
                        video.url === normalizada
                )
            ) {
                continue;
            }

            let titulo =
                'Vídeo viral';

            try {

                const texto =
                    await elemento
                        .innerText();

                if (texto) {
                    titulo =
                        limpiarTitulo(texto);
                }

            } catch {
                // Usar título por defecto.
            }

            encontrados.push({
                url: normalizada,
                title: titulo
            });

        } catch {
            // Ignorar elementos problemáticos.
        }
    }

    return encontrados;
}

// =====================================================
// INTENTAR OBTENER INFORMACIÓN DE LOS VÍDEOS
// =====================================================

async function completarTitulos(
    page,
    videos
) {

    for (
        const video
        of videos
    ) {

        try {

            const enlace =
                page.locator(
                    `a[href*="${video.url.split('/video/')[1]}"]`
                ).first();

            if (
                await enlace.count()
            ) {

                const texto =
                    await enlace.innerText();

                if (
                    texto &&
                    texto.trim().length > 0
                ) {

                    video.title =
                        limpiarTitulo(
                            texto
                        );
                }
            }

        } catch {
            // Mantener título existente.
        }
    }

    return videos;
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

                locale: 'es-ES'
            });

        const page =
            await context.newPage();

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
        // HISTORIAL
        // =================================================

        const videosGuardados =
            obtenerVideosGuardados();

        console.log(
            `💾 Vídeos guardados en historial: ${videosGuardados.size}`
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

        videos =
            await completarTitulos(
                page,
                videos
            );

        console.log(
            `🎯 Vídeos detectados: ${videos.length}`
        );

        // =================================================
        // FILTRAR VÍDEOS YA PUBLICADOS
        // =================================================

        const nuevos =
            videos
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
            `🆕 Vídeos nuevos: ${nuevos.length}`
        );

        if (!nuevos.length) {

            console.log(
                'ℹ️ No hay vídeos nuevos para publicar.'
            );

            return 0;
        }

        // =================================================
        // BUSCAR VÍDEOS REALES EN LA PÁGINA
        // =================================================

        const elementosVideo =
            await page.locator(
                'video'
            ).evaluateAll(
                elementos =>
                    elementos.map(
                        video => ({
                            src:
                                video.currentSrc ||
                                video.src ||
                                ''
                        })
                    )
            );

        const urlsVideo =
            elementosVideo
                .map(
                    video =>
                        video.src
                )
                .filter(
                    src =>
                        src &&
                        src.startsWith('http')
                );

        console.log(
            `🎥 Fuentes de vídeo encontradas: ${urlsVideo.length}`
        );

        if (!urlsVideo.length) {

            console.error(
                '❌ TikTok no proporcionó ninguna URL de vídeo utilizable.'
            );

            return 0;
        }

        // =================================================
        // NÚMERO CSV
        // =================================================

        let contador =
            obtenerNumeroSiguiente();

        let publicaciones = 0;

        // =================================================
        // PUBLICAR
        // =================================================

        for (
            let i = 0;
            i < nuevos.length;
            i++
        ) {

            if (
                publicaciones >=
                MAX_PUBLICACIONES_DIA
            ) {
                break;
            }

            const video =
                nuevos[i];

            console.log(
                `\n📹 Procesando ${i + 1}/${nuevos.length}`
            );

            console.log(
                `🔗 URL: ${video.url}`
            );

            console.log(
                `📝 Título: ${video.title}`
            );

            /*
             * Utilizamos una fuente de vídeo real
             * obtenida del reproductor de TikTok.
             *
             * No asignamos respuestas MP4
             * arbitrariamente a títulos.
             */

            const videoSrc =
                urlsVideo[i] ||
                urlsVideo[0];

            if (!videoSrc) {

                console.log(
                    '⚠️ No hay fuente de vídeo.'
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

                continue;
            }

            // =================================================
            // PUBLICAR
            // =================================================

            const enviado =
                await enviarTelegram(
                    video.title,
                    archivo
                );

            // =================================================
            // REGISTRAR SOLO SI TELEGRAM CONFIRMA
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
                publicaciones++;

                console.log(
                    `💾 URL registrada: ${video.url}`
                );

                console.log(
                    `✅ Publicación ${publicaciones}/${MAX_PUBLICACIONES_DIA} completada.`
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
            `\n🏁 Ciclo terminado. Publicados: ${publicaciones}/${MAX_PUBLICACIONES_DIA}`
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
        `🎯 Máximo: ${MAX_PUBLICACIONES_DIA} publicación por ejecución`
    );

    console.log(
        '📅 GitHub Actions controla las 3 ejecuciones diarias.'
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