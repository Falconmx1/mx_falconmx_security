#!/usr/bin/env node

/**
 * VirusTotal Scanner - MFH TOOLS PRO
 * Escanea archivos y URLs con VirusTotal API
 * 
 * Uso: node virustotal-scanner.js [opciones]
 * Ejemplo: node virustotal-scanner.js --url https://example.com --token VT_API_KEY
 * Ejemplo: node virustotal-scanner.js --file malware.exe --token VT_API_KEY
 * Ejemplo: node virustotal-scanner.js --hash 44d88612fea8a8f36de82e1278abb02f --token VT_API_KEY
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    baseUrl: 'https://www.virustotal.com/api/v3',
    timeout: 60000,
    maxFileSize: 32 * 1024 * 1024 // 32MB
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let url = null;
let file = null;
let hash = null;
let apiToken = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--url':
        case '-u':
            url = args[i + 1];
            i++;
            break;
        case '--file':
        case '-f':
            file = args[i + 1];
            i++;
            break;
        case '--hash':
        case '-h':
            hash = args[i + 1];
            i++;
            break;
        case '--token':
        case '-t':
            apiToken = args[i + 1];
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
            console.log(`
🔍 VirusTotal Scanner - MFH TOOLS PRO
======================================
Escanea archivos y URLs con VirusTotal API.

Uso:
  node virustotal-scanner.js [opciones]

Opciones:
  --url, -u <url>          URL a escanear
  --file, -f <archivo>     Archivo a escanear
  --hash, -h <hash>        Hash a verificar (MD5, SHA1, SHA256)
  --token, -t <token>      API Token de VirusTotal
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help                   Mostrar esta ayuda

Ejemplos:
  node virustotal-scanner.js --url https://example.com --token VT_API_KEY
  node virustotal-scanner.js --file malware.exe --token VT_API_KEY
  node virustotal-scanner.js --hash 44d88612fea8a8f36de82e1278abb02f --token VT_API_KEY
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeVTRequest(endpoint, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${CONFIG.baseUrl}${endpoint}`);
        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                'x-apikey': apiToken,
                'User-Agent': 'MFH-VirusTotal-Scanner/1.0'
            },
            timeout: CONFIG.timeout
        };

        if (verbose) {
            console.log(`📡 Request: ${method} ${url.pathname}`);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`Error parsing JSON: ${error.message}`));
                    }
                } else {
                    try {
                        const errorData = JSON.parse(data);
                        reject(new Error(`VirusTotal API Error (${res.statusCode}): ${errorData.error?.message || data}`));
                    } catch (error) {
                        reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
                    }
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

function uploadFile(filePath) {
    return new Promise((resolve, reject) => {
        const stats = fs.statSync(filePath);
        if (stats.size > CONFIG.maxFileSize) {
            reject(new Error(`Archivo demasiado grande (${stats.size} bytes). Máximo: ${CONFIG.maxFileSize} bytes`));
            return;
        }

        const fileBuffer = fs.readFileSync(filePath);
        const hashMD5 = crypto.createHash('md5').update(fileBuffer).digest('hex');

        // Verificar si el archivo ya fue escaneado
        checkHash(hashMD5).then(result => {
            if (result) {
                resolve(result);
                return;
            }

            // Si no existe, subir archivo
            const boundary = '----MFH-VT-UPLOAD-' + Date.now();
            const content = Buffer.concat([
                Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
                fileBuffer,
                Buffer.from(`\r\n--${boundary}--\r\n`)
            ]);

            const url = new URL(`${CONFIG.baseUrl}/files`);
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'x-apikey': apiToken,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Content-Length': content.length,
                    'User-Agent': 'MFH-VirusTotal-Scanner/1.0'
                },
                timeout: CONFIG.timeout
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(new Error(`Error parsing JSON: ${error.message}`));
                        }
                    } else {
                        try {
                            const errorData = JSON.parse(data);
                            reject(new Error(`VirusTotal API Error (${res.statusCode}): ${errorData.error?.message || data}`));
                        } catch (error) {
                            reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
                        }
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(content);
            req.end();
        }).catch(reject);
    });
}

function checkHash(hash) {
    return new Promise((resolve, reject) => {
        makeVTRequest(`/files/${hash}`).then(data => {
            resolve(data);
        }).catch(error => {
            if (error.message.includes('404')) {
                resolve(null);
            } else {
                reject(error);
            }
        });
    });
}

function scanURL(url) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ url });
        const urlObj = new URL(`${CONFIG.baseUrl}/urls`);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'x-apikey': apiToken,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'User-Agent': 'MFH-VirusTotal-Scanner/1.0'
            },
            timeout: CONFIG.timeout
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`Error parsing JSON: ${error.message}`));
                    }
                } else {
                    try {
                        const errorData = JSON.parse(data);
                        reject(new Error(`VirusTotal API Error (${res.statusCode}): ${errorData.error?.message || data}`));
                    } catch (error) {
                        reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
                    }
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

function analyzeURL(url) {
    return new Promise((resolve, reject) => {
        // Primero intentar obtener análisis existente
        const encodedUrl = Buffer.from(url).toString('base64').replace(/=+$/, '');
        makeVTRequest(`/urls/${encodedUrl}`).then(data => {
            resolve(data);
        }).catch(error => {
            if (error.message.includes('404')) {
                // Si no existe, escanear
                scanURL(url).then(scanData => {
                    // Esperar resultados (simulado)
                    setTimeout(() => {
                        makeVTRequest(`/urls/${encodedUrl}`).then(result => {
                            resolve(result);
                        }).catch(reject);
                    }, 5000);
                }).catch(reject);
            } else {
                reject(error);
            }
        });
    });
}

function formatResults(data, type) {
    let output = '';
    output += `🔍 VirusTotal Scanner - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';

    if (type === 'file' || type === 'hash') {
        const attributes = data.data?.attributes || {};
        output += `📋 Hash MD5: ${attributes.md5 || 'N/A'}\n`;
        output += `📋 SHA1: ${attributes.sha1 || 'N/A'}\n`;
        output += `📋 SHA256: ${attributes.sha256 || 'N/A'}\n`;
        output += `📋 Tamaño: ${attributes.size ? (attributes.size / 1024).toFixed(2) + ' KB' : 'N/A'}\n`;
        output += `📋 Nombre: ${data.meta?.file_info?.name || 'N/A'}\n\n`;

        const stats = attributes.last_analysis_stats || {};
        const total = Object.values(stats).reduce((a, b) => a + b, 0);
        output += `📊 RESULTADOS DE ANÁLISIS:\n`;
        output += `   🟢 Inofensivo: ${stats.undetected || 0}\n`;
        output += `   🟡 Sospechoso: ${stats.suspicious || 0}\n`;
        output += `   🔴 Malicioso: ${stats.malicious || 0}\n`;
        output += `   ⚪ Sin resultado: ${stats['timeout'] || 0}\n`;
        output += `   📊 Total: ${total} motores\n\n`;

        if (stats.malicious > 0 || stats.suspicious > 0) {
            output += `🔴 DETECCIONES:\n`;
            for (const [engine, result] of Object.entries(attributes.last_analysis_results || {})) {
                if (result.category === 'malicious' || result.category === 'suspicious') {
                    output += `   ${result.category === 'malicious' ? '🔴' : '🟡'} ${engine}: ${result.result || 'Detectado'}\n`;
                }
            }
        }

    } else if (type === 'url') {
        const attributes = data.data?.attributes || {};
        output += `📋 URL: ${attributes.url || 'N/A'}\n`;
        output += `📋 Título: ${attributes.title || 'N/A'}\n\n`;

        const stats = attributes.last_analysis_stats || {};
        const total = Object.values(stats).reduce((a, b) => a + b, 0);
        output += `📊 RESULTADOS DE ANÁLISIS:\n`;
        output += `   🟢 Inofensivo: ${stats.undetected || 0}\n`;
        output += `   🟡 Sospechoso: ${stats.suspicious || 0}\n`;
        output += `   🔴 Malicioso: ${stats.malicious || 0}\n`;
        output += `   📊 Total: ${total} motores\n\n`;

        if (stats.malicious > 0 || stats.suspicious > 0) {
            output += `🔴 DETECCIONES:\n`;
            for (const [engine, result] of Object.entries(attributes.last_analysis_results || {})) {
                if (result.category === 'malicious' || result.category === 'suspicious') {
                    output += `   ${result.category === 'malicious' ? '🔴' : '🟡'} ${engine}: ${result.result || 'Detectado'}\n`;
                }
            }
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 VirusTotal Scanner - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!apiToken) {
        apiToken = process.env.VT_API_KEY;
        if (!apiToken) {
            console.error('❌ Debes especificar un token con --token o configurar VT_API_KEY');
            console.log('   Obtén tu API key en: https://www.virustotal.com/gui/join-us');
            process.exit(1);
        }
    }

    try {
        let result = null;
        let type = null;

        if (hash) {
            console.log(`🔍 Verificando hash: ${hash}`);
            result = await checkHash(hash);
            if (!result) {
                console.log('⚠️ Hash no encontrado en VirusTotal');
                process.exit(0);
            }
            type = 'hash';
        } else if (file) {
            if (!fs.existsSync(file)) {
                console.error(`❌ Archivo no encontrado: ${file}`);
                process.exit(1);
            }
            console.log(`📤 Subiendo archivo: ${file}`);
            result = await uploadFile(file);
            type = 'file';
        } else if (url) {
            console.log(`🔍 Escaneando URL: ${url}`);
            result = await analyzeURL(url);
            type = 'url';
        } else {
            console.error('❌ Debes especificar --url, --file o --hash');
            process.exit(1);
        }

        // Mostrar resultados
        console.log(formatResults(result, type));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                type,
                data: result
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

        console.log('\n✅ Escaneo completado');

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
