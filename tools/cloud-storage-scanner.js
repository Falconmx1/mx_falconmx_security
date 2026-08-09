#!/usr/bin/env node

/**
 * Cloud Storage Scanner - MFH TOOLS PRO
 * Detecta buckets S3/Azure/Google Cloud expuestos
 * 
 * Uso: node cloud-storage-scanner.js [opciones]
 * Ejemplo: node cloud-storage-scanner.js --bucket mi-bucket
 * Ejemplo: node cloud-storage-scanner.js --provider aws --bucket mi-bucket
 * Ejemplo: node cloud-storage-scanner.js --list buckets.txt
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    userAgent: 'MFH-Cloud-Storage-Scanner/1.0'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let bucket = null;
let provider = null;
let listFile = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--bucket':
        case '-b':
            bucket = args[i + 1];
            i++;
            break;
        case '--provider':
        case '-p':
            provider = args[i + 1].toLowerCase();
            i++;
            break;
        case '--list':
        case '-l':
            listFile = args[i + 1];
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
        case '-h':
            console.log(`
🔍 Cloud Storage Scanner - MFH TOOLS PRO
=========================================
Detecta buckets S3/Azure/Google Cloud expuestos.

Uso:
  node cloud-storage-scanner.js [opciones]

Opciones:
  --bucket, -b <nombre>    Nombre del bucket
  --provider, -p <proveedor> Proveedor (aws, azure, gcp)
  --list, -l <archivo>     Archivo con lista de buckets
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node cloud-storage-scanner.js --bucket mi-bucket
  node cloud-storage-scanner.js --provider aws --bucket mi-bucket
  node cloud-storage-scanner.js --list buckets.txt
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function checkAWSS3(bucket) {
    return new Promise((resolve) => {
        const urls = [
            `https://${bucket}.s3.amazonaws.com`,
            `http://${bucket}.s3.amazonaws.com`,
            `https://${bucket}.s3.amazonaws.com/?list-type=2`,
            `https://s3.amazonaws.com/${bucket}/`
        ];

        const results = {
            provider: 'AWS S3',
            bucket,
            accessible: false,
            public: false,
            files: [],
            error: null,
            details: {}
        };

        const promises = urls.map(url => {
            return new Promise((resolveUrl) => {
                const parsedUrl = new URL(url);
                const httpModule = parsedUrl.protocol === 'https:' ? https : http;

                const options = {
                    hostname: parsedUrl.hostname,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'HEAD',
                    timeout: CONFIG.timeout,
                    headers: {
                        'User-Agent': CONFIG.userAgent
                    }
                };

                const req = httpModule.request(options, (res) => {
                    resolveUrl({
                        url,
                        statusCode: res.statusCode,
                        headers: res.headers
                    });
                });

                req.on('error', (error) => {
                    resolveUrl({
                        url,
                        error: error.message
                    });
                });

                req.end();
            });
        });

        Promise.all(promises).then((responses) => {
            for (const response of responses) {
                if (response.statusCode && response.statusCode < 400) {
                    results.accessible = true;
                    results.details[response.url] = {
                        status: response.statusCode,
                        headers: response.headers
                    };

                    // Verificar si es público
                    if (response.headers['x-amz-acl'] === 'public-read' || 
                        response.headers['x-amz-acl'] === 'public-read-write') {
                        results.public = true;
                    }
                }
            }

            // Intentar listar archivos
            if (results.accessible) {
                const listUrl = `https://${bucket}.s3.amazonaws.com/?list-type=2`;
                const parsedUrl = new URL(listUrl);
                const req = https.request({
                    hostname: parsedUrl.hostname,
                    path: parsedUrl.pathname + parsedUrl.search,
                    timeout: CONFIG.timeout,
                    headers: {
                        'User-Agent': CONFIG.userAgent
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        // Parsear XML simple
                        const files = data.match(/<Key>([^<]+)<\/Key>/g);
                        if (files) {
                            results.files = files.map(f => f.replace(/<Key>|<\/Key>/g, ''));
                        }
                        resolve(results);
                    });
                });

                req.on('error', () => {
                    resolve(results);
                });
                req.end();
            } else {
                resolve(results);
            }
        });
    });
}

function checkAzureBlob(bucket) {
    return new Promise((resolve) => {
        const urls = [
            `https://${bucket}.blob.core.windows.net`,
            `https://${bucket}.blob.core.windows.net/?restype=container&comp=list`
        ];

        const results = {
            provider: 'Azure Blob',
            bucket,
            accessible: false,
            public: false,
            files: [],
            error: null,
            details: {}
        };

        const promises = urls.map(url => {
            return new Promise((resolveUrl) => {
                const parsedUrl = new URL(url);
                const options = {
                    hostname: parsedUrl.hostname,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'HEAD',
                    timeout: CONFIG.timeout,
                    headers: {
                        'User-Agent': CONFIG.userAgent
                    }
                };

                const req = https.request(options, (res) => {
                    resolveUrl({
                        url,
                        statusCode: res.statusCode,
                        headers: res.headers
                    });
                });

                req.on('error', (error) => {
                    resolveUrl({
                        url,
                        error: error.message
                    });
                });

                req.end();
            });
        });

        Promise.all(promises).then((responses) => {
            for (const response of responses) {
                if (response.statusCode && response.statusCode < 400) {
                    results.accessible = true;
                    results.details[response.url] = {
                        status: response.statusCode,
                        headers: response.headers
                    };

                    // Verificar permisos públicos
                    if (response.headers['x-ms-blob-public-access']) {
                        results.public = true;
                    }
                }
            }
            resolve(results);
        });
    });
}

function checkGCPBucket(bucket) {
    return new Promise((resolve) => {
        const urls = [
            `https://storage.googleapis.com/${bucket}`,
            `https://storage.googleapis.com/storage/v1/b/${bucket}/o`
        ];

        const results = {
            provider: 'Google Cloud Storage',
            bucket,
            accessible: false,
            public: false,
            files: [],
            error: null,
            details: {}
        };

        const promises = urls.map(url => {
            return new Promise((resolveUrl) => {
                const parsedUrl = new URL(url);
                const options = {
                    hostname: parsedUrl.hostname,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'HEAD',
                    timeout: CONFIG.timeout,
                    headers: {
                        'User-Agent': CONFIG.userAgent
                    }
                };

                const req = https.request(options, (res) => {
                    resolveUrl({
                        url,
                        statusCode: res.statusCode,
                        headers: res.headers
                    });
                });

                req.on('error', (error) => {
                    resolveUrl({
                        url,
                        error: error.message
                    });
                });

                req.end();
            });
        });

        Promise.all(promises).then((responses) => {
            for (const response of responses) {
                if (response.statusCode && response.statusCode < 400) {
                    results.accessible = true;
                    results.details[response.url] = {
                        status: response.statusCode,
                        headers: response.headers
                    };
                }
            }

            // Intentar listar archivos
            if (results.accessible) {
                const listUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o`;
                const parsedUrl = new URL(listUrl);
                const req = https.request({
                    hostname: parsedUrl.hostname,
                    path: parsedUrl.pathname + parsedUrl.search,
                    timeout: CONFIG.timeout,
                    headers: {
                        'User-Agent': CONFIG.userAgent
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', (chunk) => { data += chunk; });
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(data);
                            if (json.items) {
                                results.files = json.items.map(item => item.name);
                            }
                        } catch (error) {
                            // Ignorar
                        }
                        resolve(results);
                    });
                });

                req.on('error', () => {
                    resolve(results);
                });
                req.end();
            } else {
                resolve(results);
            }
        });
    });
}

async function scanBucket(bucket, provider) {
    let result = null;

    if (provider === 'aws') {
        result = await checkAWSS3(bucket);
    } else if (provider === 'azure') {
        result = await checkAzureBlob(bucket);
    } else if (provider === 'gcp') {
        result = await checkGCPBucket(bucket);
    } else {
        // Intentar todos los proveedores
        const results = await Promise.all([
            checkAWSS3(bucket),
            checkAzureBlob(bucket),
            checkGCPBucket(bucket)
        ]);
        result = results.find(r => r.accessible) || results[0];
    }

    return result;
}

function formatResults(results) {
    let output = '';
    output += `🔍 Cloud Storage Scanner - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';

    const accessible = results.filter(r => r.accessible);
    const exposed = results.filter(r => r.public);

    output += `📊 RESUMEN:\n`;
    output += `   📦 Buckets escaneados: ${results.length}\n`;
    output += `   🔓 Accesibles: ${accessible.length}\n`;
    output += `   🌍 Públicos: ${exposed.length}\n\n`;

    for (const result of results) {
        const statusIcon = result.accessible ? '✅' : '❌';
        const publicIcon = result.public ? '🌍' : '🔒';
        
        output += `${statusIcon} ${publicIcon} ${result.provider}: ${result.bucket}\n`;
        output += `   Accesible: ${result.accessible ? 'Sí' : 'No'}\n`;
        output += `   Público: ${result.public ? 'Sí' : 'No'}\n`;
        
        if (result.files && result.files.length > 0) {
            output += `   Archivos: ${result.files.length}\n`;
            if (verbose && result.files.length <= 10) {
                for (const file of result.files) {
                    output += `      📄 ${file}\n`;
                }
            }
        }
        
        if (result.error) {
            output += `   ❌ Error: ${result.error}\n`;
        }
        output += '\n';
    }

    if (exposed.length > 0) {
        output += `\n🔴 BUCKETS PÚBLICOS ENCONTRADOS:\n`;
        for (const result of exposed) {
            output += `   • ${result.provider}: ${result.bucket}\n`;
        }
        output += `\n💡 RECOMENDACIONES:\n`;
        output += `   • Hacer privados los buckets públicos\n`;
        output += `   • Revisar políticas de acceso\n`;
        output += `   • Implementar logging de accesos\n`;
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Cloud Storage Scanner - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let buckets = [];

    if (listFile) {
        try {
            const content = fs.readFileSync(listFile, 'utf8');
            buckets = content.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#'));
            console.log(`📋 Cargados ${buckets.length} buckets desde ${listFile}`);
        } catch (error) {
            console.error(`❌ Error cargando lista: ${error.message}`);
            process.exit(1);
        }
    } else if (bucket) {
        buckets.push(bucket);
    } else {
        console.error('❌ Debes especificar --bucket o --list');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    const results = [];
    let processed = 0;

    for (const b of buckets) {
        processed++;
        console.log(`\n🔍 Escaneando [${processed}/${buckets.length}]: ${b}`);
        const result = await scanBucket(b, provider);
        results.push(result);
        
        if (result.accessible) {
            console.log(`   ✅ Accesible ${result.public ? '(PÚBLICO)' : ''}`);
        } else {
            console.log(`   ❌ No accesible`);
        }
    }

    // Mostrar resultados
    console.log(formatResults(results));

    // Guardar resultados
    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            totalBuckets: buckets.length,
            accessible: results.filter(r => r.accessible).length,
            public: results.filter(r => r.public).length,
            results
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Escaneo completado');
})();
