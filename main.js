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

const TIKTOK_URL = 'https://www.tiktok.com/foryou';

// =====================================================
// COMPROBAR TELEGRAM
// =====================================================

if (!TOKEN) {
    console.error('');
    console.error('❌ No existe TELEGRAM_BOT_TOKEN.');
    console.error('');
    console.error(
        'Añade TELEGRAM_BOT_TOKEN en GitHub Secrets.'
    );
    console.error('');

    process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
    polling: false
});

// =====================================================
// CARPETA TEMPORAL
// =====================================================

fs.mkdirSync(DOWNLOAD_DIR, {
    recursive: true
});

// =====================================================
// NORMALIZAR URL
// =====================================================

function normalizarUrlTikTok(url) {

    if (!url || typeof url !== 'string') {
        return '';
    }

    let resultado = url.trim();

    if (!resultado) {
        return '';
    }

    resultado =
        resultado.split('?')[0];

    resultado =
        resultado.split('#')[0];

    resultado =
        resultado.replace(/\/+$/, '');

    resultado =
        resultado.replace(
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

    try {

        const data =
            fs.readFileSync(
                CSV_FILE,
                'utf8'
            );

        const lineas =
            data
                .split(/\r?\n/)
                .slice(1);

        for (
            const linea
            of lineas
        ) {

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
                urls.add(
                    urlNormalizada
                );
            }

            const id =
                obtenerIdTikTok(url);

            if (id) {
                ids.add(id);
            }
        }

    } catch (error) {

        console.error(
            '⚠️ No se pudo leer el historial:',
            error.message
        );
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
// OBTENER TÍTULO DE LA PÁGINA
// =====================================================

async function obtenerTitulo(page) {

    try {

        const titulo =
            await page.title();

        if (
            titulo &&
            titulo.trim()
        ) {

            return limpiarTitulo(
                titulo
            );
        }

    } catch {
        // Continuar
    }

    return 'Vídeo viral';
}

// =====================================================
// ENVIAR TELEGRAM
// =====================================================

async function enviarTelegram(
    titulo,
    archivo
) {

    try {

        console.log('');
        console.log(
            '📤 Enviando vídeo a Telegram...'
        );

        console.log(
            `📺 Canal: ${CHANNEL_ID}`
        );

        if (!fs.existsSync(archivo)) {

            console.error(
                '❌ El archivo no existe.'
            );

            return false;
        }

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
            '✅ Vídeo publicado correctamente en Telegram.'
        );

        return true;

    } catch (error) {

        console.error('');
        console.error(
            '❌ Error al enviar a Telegram:'
        );

        console.error(
            error.message
        );

        return false;
    }
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

        console.log('');
        console.log(
            '⬇️ Descargando vídeo...'
        );

        console.log(
            `🔗 Fuente: ${videoUrl.substring(0, 200)}`
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
                            '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
                    }
                }
            );

        console.log(
            `📡 HTTP descarga: ${response.status()}`
        );

        if (!response.ok()) {

            console.error(
                `❌ Error HTTP ${response.status()}`
            );

            return false;
        }

        const contentType =
            (
                response.headers()[
                    'content-type'
                ] || ''
            ).toLowerCase();

        console.log(
            `📦 Content-Type: ${contentType}`
        );

        if (
            !contentType.includes('video') &&
            !videoUrl.includes('mime_type=video')
        ) {

            console.error(
                '❌ La respuesta no parece ser un vídeo.'
            );

            return false;
        }

        const buffer =
            await response.body();

        console.log(
            `💾 Bytes recibidos: ${buffer.length}`
        );

        if (
            !buffer ||
            buffer.length < 10000
        ) {

            console.error(
                '❌ El vídeo recibido es demasiado pequeño.'
            );

            return false;
        }

        const primerosBytes =
            buffer
                .subarray(0, 32)
                .toString('ascii');

        console.log(
            `🔍 Cabecera: ${primerosBytes}`
        );

        if (
            !primerosBytes.includes('ftyp')
        ) {

            console.warn(
                '⚠️ La cabecera no contiene "ftyp".'
            );

            console.warn(
                '⚠️ Se comprobará igualmente el archivo.'
            );
        } else {

            console.log(
                '✅ Cabecera MP4 detectada.'
            );
        }

        fs.writeFileSync(
            archivo,
            buffer
        );

        const stats =
            fs.statSync(
                archivo
            );

        console.log(
            `✅ Vídeo guardado: ${(
                stats.size /
                1024 /
                1024
            ).toFixed(2)} MB`
        );

        console.log(
            `📁 Archivo: ${archivo}`
        );

        return true;

    } catch (error) {

        console.error('');
        console.error(
            '❌ Error descargando vídeo:'
        );

        console.error(
            error.message
        );

        return false;
    }
}

// =====================================================
// CAPTURAR VÍDEOS DE TIKTOK
// =====================================================

async function capturarVirales() {

    console.log('');
    console.log(
        '🚀 Buscando vídeos en TikTok...'
    );

    console.log(
        `🔗 ${TIKTOK_URL}`
    );

    let browser = null;
    let context = null;

    try {

        // =================================================
        // HISTORIAL
        // =================================================

        const historial =
            obtenerHistorial();

        console.log('');
        console.log(
            `💾 URLs guardadas: ${historial.urls.size}`
        );

        console.log(
            `🆔 IDs guardados: ${historial.ids.size}`
        );

        // =================================================
        // CHROMIUM
        // =================================================

        console.log('');
        console.log(
            '🌐 Iniciando Chromium...'
        );

        browser =
            await chromium.launch({
                headless: true
            });

        context =
            await browser.newContext({

                viewport: {
                    width: 1280,
                    height: 900
                },

                locale: 'es-ES',

                timezoneId:
                    'Europe/Madrid',

                userAgent:
                    'Mozilla/5.0 (X11; Linux x86_64) ' +
                    'AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            });

        const page =
            await context.newPage();

        // =================================================
        // CAPTURAR RESPUESTAS DE RED
        // =================================================

        const videoUrls =
            new Set();

        page.on(
            'response',
            async response => {

                try {

                    const url =
                        response.url();

                    const headers =
                        response.headers();

                    const contentType =
                        (
                            headers[
                                'content-type'
                            ] || ''
                        ).toLowerCase();

                    const isTikTok =
                        url.includes(
                            'tiktokcdn'
                        ) ||
                        url.includes(
                            'tiktok.com'
                        ) ||
                        url.includes(
                            'tiktokv.com'
                        );

                    const pareceVideo =
                        contentType.includes(
                            'video/mp4'
                        ) ||
                        contentType.includes(
                            'video/'
                        ) ||
                        url.includes(
                            'mime_type=video'
                        );

                    const noEsAudio =
                        !contentType.includes(
                            'audio/'
                        ) &&
                        !url.includes(
                            'mime_type=audio'
                        );

                    if (
                        isTikTok &&
                        pareceVideo &&
                        noEsAudio
                    ) {

                        if (
                            !videoUrls.has(url)
                        ) {

                            videoUrls.add(
                                url
                            );

                            console.log('');
                            console.log(
                                '🎥 URL DE VÍDEO ENCONTRADA:'
                            );

                            console.log(
                                url.substring(
                                    0,
                                    250
                                )
                            );

                            console.log(
                                `📊 Total URLs válidas: ${videoUrls.size}`
                            );
                        }
                    }

                } catch {
                    // No detener el bot
                }
            }
        );

        // =================================================
        // CONSOLA TIKTOK
        // =================================================

        page.on(
            'console',
            msg => {

                if (
                    msg.type() === 'error'
                ) {

                    console.log(
                        `⚠️ TikTok: ${msg.text().substring(0, 300)}`
                    );
                }
            }
        );

        // =================================================
        // ERRORES DE PÁGINA
        // =================================================

        page.on(
            'pageerror',
            error => {

                console.log(
                    `⚠️ Error JavaScript: ${error.message}`
                );
            }
        );

        // =================================================
        // ABRIR TIKTOK
        // =================================================

        console.log('');
        console.log(
            '🌐 Abriendo TikTok...'
        );

        const response =
            await page.goto(
                TIKTOK_URL,
                {
                    waitUntil:
                        'domcontentloaded',

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

        // =================================================
        // ESPERA INICIAL
        // =================================================

        console.log('');
        console.log(
            '⏳ Esperando vídeos de TikTok...'
        );

        await page.waitForTimeout(
            10000
        );

        console.log(
            '✅ Primera espera terminada.'
        );

        // =================================================
        // SCROLL
        // =================================================

        console.log('');
        console.log(
            '📜 Haciendo scroll...'
        );

        for (
            let i = 1;
            i <= 8;
            i++
        ) {

            console.log(
                `📜 Scroll ${i}/8`
            );

            await page.evaluate(
                () => {

                    window.scrollBy({
                        top:
                            window.innerHeight *
                            0.9,

                        behavior:
                            'smooth'
                    });
                }
            );

            await page.waitForTimeout(
                3000
            );

            console.log(
                `   🎥 URLs capturadas: ${videoUrls.size}`
            );

            const cantidadVideos =
                await page.locator(
                    'video'
                ).count();

            console.log(
                `   🎥 Elementos <video>: ${cantidadVideos}`
            );
        }

        // =================================================
        // ESPERA FINAL
        // =================================================

        console.log('');
        console.log(
            '⏳ Esperando respuestas finales...'
        );

        await page.waitForTimeout(
            5000
        );

        // =================================================
        // RESULTADO
        // =================================================

        console.log('');
        console.log(
            '=========================================='
        );
        console.log(
            '📊 RESULTADO DE CAPTURA'
        );
        console.log(
            '=========================================='
        );

        console.log(
            `🎥 URLs de vídeo válidas: ${videoUrls.size}`
        );

        if (
            videoUrls.size === 0
        ) {

            console.error('');
            console.error(
                '❌ NO SE ENCONTRÓ NINGÚN VÍDEO.'
            );

            await page.screenshot({
                path:
                    'tiktok_diagnostico.png',

                fullPage: true
            });

            console.log(
                '📸 Diagnóstico guardado: tiktok_diagnostico.png'
            );

            return 0;
        }

        // =================================================
        // CONVERTIR A ARRAY
        // =================================================

        const urls =
            Array.from(
                videoUrls
            ).slice(
                0,
                MAX_VIDEOS
            );

        console.log('');
        console.log(
            `🎯 Candidatos disponibles: ${urls.length}`
        );

        // =================================================
        // NÚMERO
        // =================================================

        let contador =
            obtenerNumeroSiguiente();

        let publicaciones = 0;

        // =================================================
        // TÍTULO
        // =================================================

        const titulo =
            await obtenerTitulo(
                page
            );

        console.log(
            `📝 Título: ${titulo}`
        );

        // =================================================
        // PROCESAR CANDIDATOS
        // =================================================

        for (
            const videoUrl
            of urls
        ) {

            if (
                publicaciones >=
                MAX_PUBLICACIONES
            ) {

                break;
            }

            console.log('');
            console.log(
                '=========================================='
            );

            console.log(
                `🎬 Procesando candidato ${publicaciones + 1}/${MAX_PUBLICACIONES}`
            );

            console.log(
                `🔗 ${videoUrl.substring(0, 250)}`
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
                    videoUrl,
                    archivo
                );

            if (!descargado) {

                console.log(
                    '⏭️ Candidato descartado.'
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
                    titulo,
                    archivo
                );

            if (!enviado) {

                console.error(
                    '❌ No se registrará el vídeo porque Telegram no confirmó el envío.'
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
            // REGISTRAR
            // =================================================

            /*
             * Como las URLs de vídeo de la CDN no son
             * las URLs normales /video/ID de TikTok,
             * registramos la URL de la página actual
             * como referencia del historial.
             */

            const urlReferencia =
                page.url();

            registrarVideo(
                contador,
                urlReferencia
            );

            console.log('');
            console.log(
                `💾 Vídeo registrado como publicación ${contador}`
            );

            contador++;
            publicaciones++;

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

            console.log('');
            console.log(
                `✅ Publicación ${publicaciones}/${MAX_PUBLICACIONES} completada.`
            );
        }

        console.log('');
        console.log(
            '=========================================='
        );

        console.log(
            `🏁 Ciclo terminado. Publicados: ${publicaciones}/${MAX_PUBLICACIONES}`
        );

        console.log(
            '=========================================='
        );

        return publicaciones;

    } catch (error) {

        console.error('');
        console.error(
            '❌ Error capturando vídeos:'
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
        '🤖 TIKTOK VIRAL BOT INICIADO'
    );

    console.log(
        `📺 Canal: ${CHANNEL_ID}`
    );

    console.log(
        `🎯 Máximo: ${MAX_PUBLICACIONES} vídeo por ejecución`
    );

    console.log(
        '📡 TikTok: captura de vídeos mediante respuestas de red'
    );

    console.log(
        '📅 GitHub Actions controla cuándo se ejecuta.'
    );

    const publicaciones =
        await capturarVirales();

    console.log('');
    console.log(
        `🏁 BOT TERMINADO. Publicaciones realizadas: ${publicaciones}`
    );

    process.exit(0);
}

main().catch(error => {

    console.error('');
    console.error(
        '=========================================='
    );

    console.error(
        '❌ ERROR FATAL'
    );

    console.error(
        '=========================================='
    );

    console.error(error);

    process.exit(1);
});