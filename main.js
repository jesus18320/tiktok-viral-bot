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

const HTML_FILE = 'tiktok_diagnostico.html';
const PNG_FILE = 'tiktok_diagnostico.png';
const JSON_FILE = 'tiktok_datos_diagnostico.json';

// =====================================================
// ARRANQUE
// =====================================================

console.log('');
console.log('==========================================');
console.log('🤖 TIKTOK VIRAL BOT - DIAGNÓSTICO AVANZADO');
console.log('==========================================');
console.log('');
console.log('⚠️ ESTA PRUEBA NO USA TELEGRAM');
console.log('⚠️ ESTA PRUEBA NO MODIFICA EL CSV');
console.log('⚠️ ESTA PRUEBA NO DESCARGA VÍDEOS');
console.log('');

// =====================================================
// UTILIDADES
// =====================================================

function esObjeto(valor) {
    return valor !== null && typeof valor === 'object';
}

function buscarClavesRecursivamente(
    objeto,
    clavesBuscadas,
    resultados = [],
    ruta = ''
) {
    if (!esObjeto(objeto)) {
        return resultados;
    }

    if (resultados.length > 500) {
        return resultados;
    }

    if (Array.isArray(objeto)) {

        for (let i = 0; i < objeto.length; i++) {

            buscarClavesRecursivamente(
                objeto[i],
                clavesBuscadas,
                resultados,
                `${ruta}[${i}]`
            );
        }

        return resultados;
    }

    for (const [clave, valor] of Object.entries(objeto)) {

        const rutaActual =
            ruta
                ? `${ruta}.${clave}`
                : clave;

        if (
            clavesBuscadas.has(
                clave.toLowerCase()
            )
        ) {

            resultados.push({
                clave,
                valor,
                ruta: rutaActual
            });
        }

        if (esObjeto(valor)) {

            buscarClavesRecursivamente(
                valor,
                clavesBuscadas,
                resultados,
                rutaActual
            );
        }
    }

    return resultados;
}

// =====================================================
// EXTRAER IDs
// =====================================================

function extraerIds(objeto) {

    const claves = new Set([
        'aweme_id',
        'awemeid',
        'item_id',
        'itemid',
        'video_id',
        'videoid'
    ]);

    const encontrados =
        buscarClavesRecursivamente(
            objeto,
            claves
        );

    const ids = new Set();

    for (const encontrado of encontrados) {

        const valor =
            encontrado.valor;

        if (
            typeof valor === 'string' &&
            /^\d{10,}$/.test(valor)
        ) {

            ids.add(valor);
        }

        if (
            typeof valor === 'number' &&
            Number.isSafeInteger(valor)
        ) {

            ids.add(
                String(valor)
            );
        }
    }

    return Array.from(ids);
}

// =====================================================
// EXTRAER URLS DE VÍDEO
// =====================================================

function extraerUrlsVideo(objeto) {

    const claves = new Set([
        'play_addr',
        'download_addr',
        'playurl',
        'play_url',
        'download_url',
        'url_list'
    ]);

    const encontrados =
        buscarClavesRecursivamente(
            objeto,
            claves
        );

    const urls = new Set();

    function procesarValor(valor) {

        if (typeof valor === 'string') {

            if (
                valor.startsWith('http') &&
                (
                    valor.includes('.mp4') ||
                    valor.includes('/video/') ||
                    valor.includes('video/tos/')
                )
            ) {

                urls.add(valor);
            }

            return;
        }

        if (Array.isArray(valor)) {

            for (const elemento of valor) {
                procesarValor(elemento);
            }

            return;
        }

        if (esObjeto(valor)) {

            for (const elemento of Object.values(valor)) {
                procesarValor(elemento);
            }
        }
    }

    for (const encontrado of encontrados) {

        procesarValor(
            encontrado.valor
        );
    }

    return Array.from(urls);
}

// =====================================================
// EXTRAER TÍTULOS / DESCRIPCIONES
// =====================================================

function extraerTextos(objeto) {

    const claves = new Set([
        'desc',
        'description',
        'title',
        'text'
    ]);

    const encontrados =
        buscarClavesRecursivamente(
            objeto,
            claves
        );

    const textos = new Set();

    for (const encontrado of encontrados) {

        if (
            typeof encontrado.valor !== 'string'
        ) {
            continue;
        }

        const texto =
            encontrado.valor.trim();

        if (
            texto.length === 0 ||
            texto.length > 1000
        ) {
            continue;
        }

        textos.add(texto);
    }

    return Array.from(textos);
}

// =====================================================
// NORMALIZAR DATOS
// =====================================================

function registrarDatos(
    datos,
    idsGlobales,
    urlsGlobales,
    textosGlobales,
    respuesta
) {

    const ids =
        extraerIds(datos);

    const urls =
        extraerUrlsVideo(datos);

    const textos =
        extraerTextos(datos);

    for (const id of ids) {
        idsGlobales.add(id);
    }

    for (const url of urls) {
        urlsGlobales.add(url);
    }

    for (const texto of textos) {
        textosGlobales.add(texto);
    }

    if (ids.length > 0) {

        console.log('');
        console.log(
            '🎯 IDs encontrados en respuesta:'
        );

        for (const id of ids) {

            console.log(
                `   🆔 ${id}`
            );
        }
    }

    if (urls.length > 0) {

        console.log('');
        console.log(
            '🎥 URLs de vídeo encontradas:'
        );

        for (const url of urls.slice(0, 10)) {

            console.log(
                `   🎬 ${url.substring(0, 220)}`
            );
        }

        if (urls.length > 10) {

            console.log(
                `   ... y ${urls.length - 10} más`
            );
        }
    }
}

// =====================================================
// MAIN
// =====================================================

async function main() {

    let browser = null;

    const idsGlobales =
        new Set();

    const urlsGlobales =
        new Set();

    const textosGlobales =
        new Set();

    const respuestasJSON = [];

    try {

        // =================================================
        // CHROMIUM
        // =================================================

        console.log(
            '🌐 Iniciando Chromium...'
        );

        browser =
            await chromium.launch({
                headless: true
            });

        console.log(
            '✅ Chromium iniciado.'
        );

        // =================================================
        // CONTEXTO
        // =================================================

        const context =
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

                extraHTTPHeaders: {
                    'Accept-Language':
                        'es-ES,es;q=0.9,en;q=0.8'
                }
            });

        const page =
            await context.newPage();

        // =================================================
        // ERRORES JAVASCRIPT
        // =================================================

        page.on(
            'console',
            mensaje => {

                const tipo =
                    mensaje.type();

                if (
                    tipo === 'error'
                ) {

                    console.log(
                        `⚠️ CONSOLA TIKTOK: ${mensaje.text()}`
                    );
                }
            }
        );

        page.on(
            'pageerror',
            error => {

                console.log(
                    `⚠️ ERROR JAVASCRIPT: ${error.message}`
                );
            }
        );

        // =================================================
        // RESPUESTAS HTTP
        // =================================================

        page.on(
            'response',
            async response => {

                try {

                    const url =
                        response.url();

                    if (
                        !url.includes('tiktok.com')
                    ) {
                        return;
                    }

                    const contentType =
                        response.headers()[
                            'content-type'
                        ] || '';

                    // Solo nos interesan JSON
                    if (
                        !contentType.includes('json')
                    ) {
                        return;
                    }

                    const texto =
                        await response.text();

                    if (
                        !texto ||
                        texto.length < 2
                    ) {
                        return;
                    }

                    let datos;

                    try {

                        datos =
                            JSON.parse(texto);

                    } catch {

                        return;
                    }

                    const idsAntes =
                        idsGlobales.size;

                    const urlsAntes =
                        urlsGlobales.size;

                    registrarDatos(
                        datos,
                        idsGlobales,
                        urlsGlobales,
                        textosGlobales,
                        response
                    );

                    if (
                        idsGlobales.size > idsAntes ||
                        urlsGlobales.size > urlsAntes
                    ) {

                        respuestasJSON.push({
                            url,
                            status:
                                response.status(),
                            contentType,
                            data:
                                datos
                        });
                    }

                } catch {
                    // Ignorar respuestas individuales
                }
            }
        );

        // =================================================
        // ABRIR TIKTOK
        // =================================================

        console.log('');
        console.log(
            '🌐 Abriendo TikTok...'
        );

        console.log(
            `🔗 URL: ${TIKTOK_URL}`
        );

        const respuesta =
            await page.goto(
                TIKTOK_URL,
                {
                    waitUntil:
                        'domcontentloaded',

                    timeout:
                        60000
                }
            );

        if (respuesta) {

            console.log(
                `🌐 RESPUESTA ${respuesta.status()}: ${respuesta.url()}`
            );

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
        // ESPERA
        // =================================================

        console.log('');
        console.log(
            '⏳ Esperando carga de TikTok...'
        );

        await page.waitForTimeout(
            10000
        );

        console.log(
            '✅ Primera espera terminada.'
        );

        // =================================================
        // INFORMACIÓN INICIAL
        // =================================================

        console.log('');
        console.log(
            '=========================================='
        );
        console.log(
            '🔎 INFORMACIÓN INICIAL'
        );
        console.log(
            '=========================================='
        );

        console.log(
            `📍 URL: ${page.url()}`
        );

        console.log(
            `📄 Título: ${await page.title()}`
        );

        // =================================================
        // INSPECCIONAR HTML
        // =================================================

        const informacionInicial =
            await page.evaluate(
                () => {

                    const videos =
                        Array.from(
                            document.querySelectorAll(
                                'video'
                            )
                        );

                    return {

                        enlaces:
                            Array.from(
                                document.querySelectorAll(
                                    'a'
                                )
                            ).map(
                                a => ({
                                    href:
                                        a.href || '',
                                    texto:
                                        (
                                            a.innerText ||
                                            ''
                                        ).trim()
                                })
                            ),

                        videos:
                            videos.map(
                                video => ({
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
                                })
                            ),

                        imagenes:
                            document.querySelectorAll(
                                'img'
                            ).length,

                        texto:
                            document.body?.innerText ||
                            ''
                    };
                }
            );

        console.log(
            `📝 Texto visible: ${informacionInicial.texto.length} caracteres`
        );

        console.log(
            `🔗 Enlaces: ${informacionInicial.enlaces.length}`
        );

        console.log(
            `🎥 Elementos <video>: ${informacionInicial.videos.length}`
        );

        console.log(
            `🖼️ Imágenes: ${informacionInicial.imagenes}`
        );

        // =================================================
        // MOSTRAR VIDEOS
        // =================================================

        console.log('');
        console.log(
            '🎥 ELEMENTOS VIDEO'
        );

        for (
            const video
            of informacionInicial.videos
        ) {

            console.log(
                `🎥 src: ${video.src || '(vacío)'}`
            );

            console.log(
                `📐 tamaño: ${video.width}x${video.height}`
            );
        }

        // =================================================
        // SCROLL
        // =================================================

        console.log('');
        console.log(
            '=========================================='
        );
        console.log(
            '📜 HACIENDO SCROLL'
        );
        console.log(
            '=========================================='
        );

        for (
            let i = 0;
            i < 10;
            i++
        ) {

            console.log(
                `📜 Scroll ${i + 1}/10`
            );

            await page.mouse.wheel(
                0,
                4500
            );

            await page.waitForTimeout(
                2500
            );

            console.log(
                `   🆔 IDs acumulados: ${idsGlobales.size}`
            );

            console.log(
                `   🎥 URLs vídeo acumuladas: ${urlsGlobales.size}`
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
        // INSPECCIÓN FINAL DEL DOM
        // =================================================

        const informacionFinal =
            await page.evaluate(
                () => {

                    const enlaces =
                        Array.from(
                            document.querySelectorAll(
                                'a'
                            )
                        );

                    const videos =
                        Array.from(
                            document.querySelectorAll(
                                'video'
                            )
                        );

                    const imagenes =
                        Array.from(
                            document.querySelectorAll(
                                'img'
                            )
                        );

                    return {

                        enlaces:
                            enlaces.map(
                                a => ({
                                    href:
                                        a.href || '',
                                    texto:
                                        (
                                            a.innerText ||
                                            ''
                                        ).trim()
                                })
                            ),

                        videos:
                            videos.map(
                                video => ({
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
                                })
                            ),

                        imagenes:
                            imagenes.map(
                                img => ({
                                    src:
                                        img.src || '',
                                    alt:
                                        img.alt || ''
                                })
                            ),

                        texto:
                            document.body?.innerText ||
                            ''
                    };
                }
            );

        // =================================================
        // BUSCAR ENLACES /VIDEO/
        // =================================================

        const enlacesVideo =
            informacionFinal.enlaces.filter(
                enlace =>
                    enlace.href.includes(
                        '/video/'
                    )
            );

        // =================================================
        // RESULTADO FINAL
        // =================================================

        console.log('');
        console.log(
            '=========================================='
        );

        console.log(
            '📊 RESULTADO FINAL'
        );

        console.log(
            '=========================================='
        );

        console.log(
            `🆔 IDs de vídeo encontrados: ${idsGlobales.size}`
        );

        console.log(
            `🎥 URLs de vídeo encontradas: ${urlsGlobales.size}`
        );

        console.log(
            `🔗 Enlaces /video/: ${enlacesVideo.length}`
        );

        console.log(
            `🎥 Elementos <video>: ${informacionFinal.videos.length}`
        );

        console.log(
            `🖼️ Imágenes: ${informacionFinal.imagenes.length}`
        );

        console.log(
            `📡 Respuestas JSON útiles: ${respuestasJSON.length}`
        );

        // =================================================
        // MOSTRAR IDs
        // =================================================

        if (
            idsGlobales.size > 0
        ) {

            console.log('');
            console.log(
                '🎯🎯🎯 IDs DE TIKTOK ENCONTRADOS'
            );

            console.log(
                '=========================================='
            );

            for (
                const id
                of idsGlobales
            ) {

                console.log(
                    `🆔 VIDEO ID: ${id}`
                );

                console.log(
                    `🔗 POSIBLE URL: https://www.tiktok.com/video/${id}`
                );

                console.log(
                    '------------------------------------------'
                );
            }

        } else {

            console.log('');
            console.log(
                '❌ NO SE ENCONTRARON IDs DE VÍDEO'
            );
        }

        // =================================================
        // MOSTRAR URLS
        // =================================================

        if (
            urlsGlobales.size > 0
        ) {

            console.log('');
            console.log(
                '🎥🎥🎥 FUENTES DE VÍDEO ENCONTRADAS'
            );

            console.log(
                '=========================================='
            );

            let contador =
                0;

            for (
                const url
                of urlsGlobales
            ) {

                contador++;

                console.log(
                    `${contador}. ${url}`
                );
            }
        }

        // =================================================
        // MOSTRAR TEXTOS
        // =================================================

        if (
            textosGlobales.size > 0
        ) {

            console.log('');
            console.log(
                '📝 TEXTOS ENCONTRADOS'
            );

            console.log(
                '=========================================='
            );

            let contador =
                0;

            for (
                const texto
                of textosGlobales
            ) {

                contador++;

                if (
                    contador > 30
                ) {
                    break;
                }

                console.log(
                    `${contador}. ${texto.substring(0, 300)}`
                );
            }
        }

        // =================================================
        // GUARDAR DATOS JSON
        // =================================================

        const diagnostico = {

            fecha:
                new Date().toISOString(),

            url:
                page.url(),

            titulo:
                await page.title(),

            ids:
                Array.from(
                    idsGlobales
                ),

            urlsVideo:
                Array.from(
                    urlsGlobales
                ),

            textos:
                Array.from(
                    textosGlobales
                ),

            enlacesVideo,

            videos:
                informacionFinal.videos,

            respuestasJSON
        };

        fs.writeFileSync(
            JSON_FILE,
            JSON.stringify(
                diagnostico,
                null,
                2
            ),
            'utf8'
        );

        console.log('');
        console.log(
            `💾 JSON guardado: ${JSON_FILE}`
        );

        // =================================================
        // GUARDAR HTML
        // =================================================

        const html =
            await page.content();

        fs.writeFileSync(
            HTML_FILE,
            html,
            'utf8'
        );

        console.log(
            `💾 HTML guardado: ${HTML_FILE}`
        );

        // =================================================
        // SCREENSHOT
        // =================================================

        await page.screenshot({
            path:
                PNG_FILE,
            fullPage:
                true
        });

        console.log(
            `📸 Captura guardada: ${PNG_FILE}`
        );

        // =================================================
        // CONCLUSIÓN
        // =================================================

        console.log('');
        console.log(
            '=========================================='
        );

        if (
            idsGlobales.size > 0 &&
            urlsGlobales.size > 0
        ) {

            console.log(
                '🎉 DIAGNÓSTICO POSITIVO'
            );

            console.log(
                '✅ TikTok está entregando IDs de vídeo.'
            );

            console.log(
                '✅ TikTok está entregando fuentes de vídeo.'
            );

            console.log(
                '➡️ Ya podemos pasar a relacionar ID + URL + descarga.'
            );

        } else if (
            idsGlobales.size > 0
        ) {

            console.log(
                '🟡 IDS ENCONTRADOS, PERO SIN FUENTES'
            );

            console.log(
                '➡️ El siguiente paso será obtener la fuente MP4.'
            );

        } else if (
            urlsGlobales.size > 0
        ) {

            console.log(
                '🟡 FUENTES ENCONTRADAS, PERO SIN IDS'
            );

            console.log(
                '➡️ El siguiente paso será relacionar las fuentes con los vídeos.'
            );

        } else {

            console.log(
                '🔴 NO SE ENCONTRARON IDS NI FUENTES EN JSON'
            );

            console.log(
                '➡️ TikTok está cargando los vídeos de otra manera.'
            );
        }

        console.log(
            '=========================================='
        );

        console.log('');
        console.log(
            '📺 Telegram: NO utilizado'
        );

        console.log(
            '💾 CSV: NO modificado'
        );

        console.log(
            '⬇️ Descargas: NO realizadas'
        );

        console.log('');

        await context.close();

        return 0;

    } catch (error) {

        console.error('');
        console.error(
            '=========================================='
        );

        console.error(
            '❌ ERROR FATAL DEL DIAGNÓSTICO'
        );

        console.error(
            '=========================================='
        );

        console.error(
            error.message
        );

        console.error('');

        if (
            browser
        ) {

            await browser
                .close()
                .catch(() => {});
        }

        return 1;

    } finally {

        if (
            browser
        ) {

            await browser
                .close()
                .catch(() => {});
        }
    }
}

// =====================================================
// EJECUTAR
// =====================================================

main()
    .then(
        codigo => {
            process.exit(codigo);
        }
    )
    .catch(
        error => {

            console.error(
                '❌ ERROR FATAL:',
                error
            );

            process.exit(1);
        }
    );