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

// Buscamos más candidatos para tener margen
const MAX_CANDIDATOS = 20;

const CSV_FILE = 'videos_virales.csv';
const DOWNLOAD_DIR = 'videos_temp';

// Tamaño mínimo aceptado
const MIN_VIDEO_BYTES = 100 * 1024;

// Tiempo máximo para encontrar el vídeo de una página
const VIDEO_TIMEOUT = 30000;

if (!TOKEN) {

    console.error(
        '❌ Falta la variable TELEGRAM_BOT_TOKEN.'
    );

    process.exit(1);
}

const bot = new TelegramBot(
    TOKEN,
    {
        polling: false
    }
);

// =====================================================
// CARPETA TEMPORAL
// =====================================================

if (!fs.existsSync(DOWNLOAD_DIR)) {

    fs.mkdirSync(
        DOWNLOAD_DIR,
        {
            recursive: true
        }
    );
}

// =====================================================
// NORMALIZAR URL
// =====================================================

function normalizarUrl(url) {

    if (
        !url ||
        typeof url !== 'string'
    ) {
        return '';
    }

    let resultado =
        url.trim();

    if (!resultado) {
        return '';
    }

    resultado =
        resultado.split('?')[0];

    resultado =
        resultado.split('#')[0];

    resultado =
        resultado.replace(
            /\/+$/,
            ''
        );

    return resultado;
}

// =====================================================
// HISTORIAL
// =====================================================

const videosGuardados =
    new Set();

if (
    fs.existsSync(
        CSV_FILE
    )
) {

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

        if (
            separador === -1
        ) {
            continue;
        }

        const url =
            linea
                .slice(
                    separador + 1
                )
                .trim();

        if (url) {

            videosGuardados.add(
                normalizarUrl(url)
            );
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

    if (
        resultado.length > 900
    ) {

        resultado =
            resultado
                .substring(
                    0,
                    897
                )
                .trim() +
            '...';
    }

    return (
        resultado ||
        'Vídeo viral'
    );
}

// =====================================================
// ENVIAR TELEGRAM
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
// OBTENER SIGUIENTE NÚMERO DEL CSV
// =====================================================

function obtenerNumeroSiguiente() {

    if (
        !fs.existsSync(
            CSV_FILE
        )
    ) {

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

    let maximo = 0;

    for (
        const linea
        of lineas.slice(1)
    ) {

        const separador =
            linea.indexOf(',');

        if (
            separador === -1
        ) {
            continue;
        }

        const numero =
            Number(
                linea
                    .slice(
                        0,
                        separador
                    )
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
// GUARDAR EN CSV
// =====================================================

function registrarVideo(
    numero,
    url
) {

    if (
        !fs.existsSync(
            CSV_FILE
        )
    ) {

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

    console.log(
        '💾 Vídeo registrado en CSV.'
    );
}

// =====================================================
// OBTENER CANDIDATOS DEL FOR YOU
// =====================================================

async function obtenerCandidatos(
    page
) {

    const videos =
        new Map();

    // =================================================
    // RESPUESTAS DE LA API DE TIKTOK
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

                    const urlNormalizada =
                        normalizarUrl(
                            videoUrl
                        );

                    const titulo =
                        item.desc ||
                        item.description ||
                        item.title ||
                        'Vídeo viral';

                    if (
                        videos.has(
                            urlNormalizada
                        )
                    ) {
                        continue;
                    }

                    if (
                        videosGuardados.has(
                            urlNormalizada
                        )
                    ) {

                        console.log(
                            `⏭️ Ya publicado: ${urlNormalizada}`
                        );

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
                                )
                        }
                    );

                    console.log(
                        `📝 Vídeo detectado: ` +
                        `${limpiarTitulo(titulo)}`
                    );
                }

            } catch {
                // Algunas respuestas no son JSON válido
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

    console.log(
        '⏳ Esperando respuestas finales...'
    );

    await page.waitForTimeout(
        6000
    );

    return Array
        .from(
            videos.values()
        )
        .slice(
            0,
            MAX_CANDIDATOS
        );
}

// =====================================================
// CAPTURAR EL VÍDEO DE UNA URL
// =====================================================
//
// IMPORTANTE:
//
// Aquí está el cambio principal.
//
// Antes guardábamos:
//     response
//
// y muchos segundos después intentábamos:
//     response.body()
//
// Chromium podía eliminar esa respuesta.
//
// Ahora:
//
//     respuesta llega
//          ↓
//     response.body() INMEDIATAMENTE
//          ↓
//     guardamos el Buffer
//
// Así evitamos:
//
// "No data found for resource with given identifier"
// =====================================================

async function capturarVideoDePagina(
    context,
    videoUrl
) {

    let page = null;

    try {

        page =
            await context.newPage();

        console.log(
            `🌐 Abriendo vídeo: ${videoUrl}`
        );

        let resultado = null;

        let resolver;
        let rechazar;

        const promesa =
            new Promise(
                (resolve, reject) => {

                    resolver = resolve;
                    rechazar = reject;
                }
            );

        // =================================================
        // ESCUCHAR RESPUESTAS DE VÍDEO
        // =================================================

        page.on(
            'response',
            async response => {

                if (resultado) {
                    return;
                }

                try {

                    if (
                        !response.ok()
                    ) {
                        return;
                    }

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

                    const contentLength =
                        Number(
                            headers[
                                'content-length'
                            ] || 0
                        );

                    // Ignorar respuestas diminutas
                    if (
                        contentLength > 0 &&
                        contentLength <
                        MIN_VIDEO_BYTES
                    ) {

                        console.log(
                            `⏭️ Respuesta de vídeo pequeña ` +
                            `descartada: ${contentLength} bytes`
                        );

                        return;
                    }

                    console.log(
                        `🎥 Respuesta de vídeo detectada: ${contentType}`
                    );

                    if (
                        contentLength > 0
                    ) {

                        console.log(
                            `📦 Tamaño anunciado: ` +
                            `${(
                                contentLength /
                                1024 /
                                1024
                            ).toFixed(2)} MB`
                        );
                    }

                    /*
                     * LEER EL BODY INMEDIATAMENTE.
                     *
                     * No lo dejamos para después.
                     */

                    const buffer =
                        await response.body();

                    if (
                        !buffer ||
                        buffer.length <
                        MIN_VIDEO_BYTES
                    ) {

                        console.log(
                            `⏭️ Vídeo demasiado pequeño: ` +
                            `${buffer?.length || 0} bytes`
                        );

                        return;
                    }

                    /*
                     * Comprobar firma MP4.
                     *
                     * Algunas respuestas pueden tener
                     * cabeceras raras, por eso solamente
                     * usamos esta comprobación como filtro.
                     */

                    const cabecera =
                        buffer
                            .subarray(
                                0,
                                Math.min(
                                    64,
                                    buffer.length
                                )
                            )
                            .toString(
                                'latin1'
                            );

                    if (
                        !cabecera.includes(
                            'ftyp'
                        )
                    ) {

                        console.log(
                            '⚠️ Respuesta de vídeo sin firma MP4. Se ignora.'
                        );

                        return;
                    }

                    resultado = {
                        buffer,
                        contentType,
                        contentLength
                    };

                    console.log(
                        `✅ Vídeo capturado inmediatamente: ` +
                        `${(
                            buffer.length /
                            1024 /
                            1024
                        ).toFixed(2)} MB`
                    );

                    resolver(
                        resultado
                    );

                } catch (error) {

                    console.log(
                        `⚠️ Error leyendo respuesta de vídeo: ` +
                        `${error.message}`
                    );
                }
            }
        );

        // =================================================
        // ABRIR PÁGINA DEL VÍDEO
        // =================================================

        const navegacion =
            page.goto(
                videoUrl,
                {
                    waitUntil:
                        'domcontentloaded',

                    timeout:
                        60000
                }
            ).catch(
                error => {

                    console.log(
                        `⚠️ Error navegando al vídeo: ` +
                        `${error.message}`
                    );

                    return null;
                }
            );

        // =================================================
        // TIMEOUT
        // =================================================

        const timeout =
            new Promise(
                resolve => {

                    setTimeout(
                        () => {

                            if (!resultado) {

                                resolve(
                                    null
                                );
                            }

                        },
                        VIDEO_TIMEOUT
                    );
                }
            );

        const captura =
            await Promise.race([
                promesa,
                timeout
            ]);

        await navegacion
            .catch(
                () => {}
            );

        if (
            captura
        ) {

            return captura;
        }

        // =================================================
        // DAR TIEMPO AL REPRODUCTOR
        // =================================================

        await page.waitForTimeout(
            3000
        );

        return resultado;

    } catch (error) {

        console.error(
            '❌ Error capturando vídeo:',
            error.message
        );

        return null;

    } finally {

        if (page) {

            await page
                .close()
                .catch(
                    () => {}
                );
        }
    }
}

// =====================================================
// CAPTURAR Y GUARDAR VÍDEOS
// =====================================================

async function capturarVirales() {

    console.log(
        '\n🚀 Buscando vídeos virales...'
    );

    let browser = null;
    let context = null;

    try {

        // =================================================
        // NAVEGADOR
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

                locale:
                    'es-ES',

                timezoneId:
                    'Europe/Madrid'
            });

        const page =
            await context.newPage();

        // =================================================
        // OBTENER CANDIDATOS
        // =================================================

        const candidatos =
            await obtenerCandidatos(
                page
            );

        console.log(
            `🎯 Nuevos vídeos encontrados: ${candidatos.length}`
        );

        if (
            !candidatos.length
        ) {

            console.log(
                'ℹ️ No hay vídeos nuevos.'
            );

            return;
        }

        // =================================================
        // MOSTRAR CANDIDATOS
        // =================================================

        for (
            const video
            of candidatos
        ) {

            console.log('');
            console.log(
                `📝 ${video.title}`
            );

            console.log(
                `🔗 ${video.url}`
            );
        }

        // =================================================
        // CSV / CONTADOR
        // =================================================

        let contador =
            obtenerNumeroSiguiente();

        let publicados = 0;

        // =================================================
        // PROCESAR CANDIDATOS
        // =================================================

        for (
            const video
            of candidatos
        ) {

            if (
                publicados >=
                MAX_VIDEOS
            ) {
                break;
            }

            console.log(
                `\n📹 Procesando vídeo ` +
                `${publicados + 1}/${MAX_VIDEOS}`
            );

            console.log(
                `📝 Título: ${video.title}`
            );

            console.log(
                `🔗 URL: ${video.url}`
            );

            // =================================================
            // CAPTURAR VÍDEO
            // =================================================

            const captura =
                await capturarVideoDePagina(
                    context,
                    video.url
                );

            if (
                !captura ||
                !captura.buffer
            ) {

                console.log(
                    '❌ No se pudo capturar este vídeo.'
                );

                console.log(
                    '⏭️ Pasando al siguiente candidato...'
                );

                continue;
            }

            // =================================================
            // CREAR ARCHIVO
            // =================================================

            const nombreArchivo =
                `video_${Date.now()}_${contador}.mp4`;

            const archivo =
                path.join(
                    DOWNLOAD_DIR,
                    nombreArchivo
                );

            try {

                fs.writeFileSync(
                    archivo,
                    captura.buffer
                );

                console.log(
                    `💾 Archivo creado: ${archivo}`
                );

                console.log(
                    `📦 Tamaño final: ` +
                    `${(
                        captura.buffer.length /
                        1024 /
                        1024
                    ).toFixed(2)} MB`
                );

                // =================================================
                // TELEGRAM
                // =================================================

                const enviado =
                    await enviarTelegram(
                        video.title,
                        archivo
                    );

                // =================================================
                // SOLO REGISTRAR SI TELEGRAM FUNCIONÓ
                // =================================================

                if (
                    enviado
                ) {

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

            } catch (error) {

                console.error(
                    '❌ Error procesando archivo:',
                    error.message
                );

            } finally {

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
        }

        console.log(
            `\n🏁 Ciclo terminado. ` +
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
                .catch(
                    () => {}
                );
        }

        if (browser) {

            await browser
                .close()
                .catch(
                    () => {}
                );
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

main().catch(
    error => {

        console.error(
            '\n❌ ERROR FATAL:'
        );

        console.error(
            error
        );

        process.exit(1);
    }
);