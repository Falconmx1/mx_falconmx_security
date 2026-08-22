#!/usr/bin/env node

/**
 * Data Enrichment Pipeline - MFH TOOLS PRO
 * Enriquece datos con múltiples fuentes (Shodan, VT, etc.)
 * 
 * Uso: node data-enrichment-pipeline.js [opciones]
 * Ejemplo: node data-enrichment-pipeline.js --input data.json --enrich ip,domain
 * Ejemplo: node data-enrichment-pipeline.js --ip 8.8.8.8
 * Ejemplo: node data-enrichment-pipeline.js --domain google.com
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'enrichment_config.json');

const DEFAULT_CONFIG = {
    sources: {
        ipinfo: { enabled: true, apiKey: '' },
        virustotal: { enabled: false, apiKey: '' },
        shodan: { enabled: false, apiKey: '' },
        abuseipdb: { enabled: false, apiKey: '' },
        whois: { enabled: true }
    },
    cache: {
        enabled: true,
        ttl: 3600,
        dir: path.join(__dirname, 'enrichment_cache')
    },
    rateLimit: {
        enabled: true,
        delay: 1000
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let inputFile = null;
let outputFile = null;
let ip = null;
let domain = null;
let hash = null;
let enrichTypes = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--input':
            inputFile = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--ip':
            ip = args[i + 1];
            i++;
            break;
        case '--domain':
            domain = args[i + 1];
            i++;
            break;
        case '--hash':
            hash = args[i + 1];
            i++;
            break;
        case '--enrich':
            enrichTypes = args[i + 1].split(',');
            i++;
            break;
        case '--init':
            init = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Data Enrichment Pipeline - MFH TOOLS PRO
============================================
Enriquece datos con múltiples fuentes.

Uso:
  node data-enrichment-pipeline.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --input <archivo>        Archivo de entrada (JSON)
  --output <archivo>       Archivo de salida (JSON)
  --ip <dirección>         IP a enriquecer
  --domain <dominio>       Dominio a enriquecer
  --hash <hash>            Hash a enriquecer
  --enrich <tipos>         Tipos de enriquecimiento (ip,domain,hash,whois)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node data-enrichment-pipeline.js --init
  node data-enrichment-pipeline.js --ip 8.8.8.8
  node data-enrichment-pipeline.js --domain google.com
  node data-enrichment-pipeline.js --input data.json --enrich ip,domain
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${CONFIG_FILE}`);
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    const config = { ...DEFAULT_CONFIG };
    if (!fs.existsSync(config.cache.dir)) {
        fs.mkdirSync(config.cache.dir, { recursive: true });
    }
    saveConfig(config);
    console.log('✅ Configuración por defecto creada.');
    console.log(`📁 Caché: ${config.cache.dir}`);
    console.log('📝 Edita el archivo para configurar API keys.');
}

function getCacheKey(type, value) {
    return `${type}:${value}`;
}

function getFromCache(config, key) {
    if (!config.cache || !config.cache.enabled) return null;
    
    const cacheFile = path.join(config.cache.dir, `${key}.json`);
    if (!fs.existsSync(cacheFile)) return null;
    
    try {
        const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        const ttl = config.cache.ttl || 3600;
        if (Date.now() - data.timestamp > ttl * 1000) {
            return null;
        }
        return data.value;
    } catch (error) {
        return null;
    }
}

function saveToCache(config, key, value) {
    if (!config.cache || !config.cache.enabled) return;
    
    const cacheFile = path.join(config.cache.dir, `${key}.json`);
    try {
        fs.writeFileSync(cacheFile, JSON.stringify({
            timestamp: Date.now(),
            value
        }));
    } catch (error) {
        // Ignorar errores de caché
    }
}

function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'MFH-Data-Enrichment/1.0',
                'Accept': 'application/json',
                ...headers
            },
            timeout: 10000
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        resolve({ raw: data });
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// ==================== FUENTES DE ENRIQUECIMIENTO ====================
async function enrichIP(ip, config) {
    const enriched = { ip, sources: {} };
    
    // IPInfo (gratuito, sin API key)
    try {
        const cacheKey = getCacheKey('ipinfo', ip);
        let data = getFromCache(config, cacheKey);
        if (!data) {
            data = await makeRequest(`https://ipinfo.io/${ip}/json`);
            saveToCache(config, cacheKey, data);
        }
        enriched.sources.ipinfo = data;
        if (verbose) console.log(`✅ IPInfo enriquecido: ${ip}`);
    } catch (error) {
        if (verbose) console.log(`⚠️ IPInfo falló: ${error.message}`);
        enriched.sources.ipinfo = { error: error.message };
    }
    
    await sleep(500);
    
    // AbuseIPDB (requiere API key)
    if (config.sources?.abuseipdb?.enabled && config.sources?.abuseipdb?.apiKey) {
        try {
            const cacheKey = getCacheKey('abuseipdb', ip);
            let data = getFromCache(config, cacheKey);
            if (!data) {
                data = await makeRequest(
                    `https://api.abuseipdb.com/api/v2/check?ipAddress=${ip}&maxAgeInDays=90`,
                    { 'Key': config.sources.abuseipdb.apiKey }
                );
                saveToCache(config, cacheKey, data);
            }
            enriched.sources.abuseipdb = data;
            if (verbose) console.log(`✅ AbuseIPDB enriquecido: ${ip}`);
        } catch (error) {
            if (verbose) console.log(`⚠️ AbuseIPDB falló: ${error.message}`);
            enriched.sources.abuseipdb = { error: error.message };
        }
    }
    
    return enriched;
}

async function enrichDomain(domain, config) {
    const enriched = { domain, sources: {} };
    
    // WHOIS (gratuito)
    try {
        const cacheKey = getCacheKey('whois', domain);
        let data = getFromCache(config, cacheKey);
        if (!data) {
            data = await makeRequest(`https://whois.verisign-grs.com/?domain=${domain}`);
            saveToCache(config, cacheKey, data);
        }
        enriched.sources.whois = data;
        if (verbose) console.log(`✅ WHOIS enriquecido: ${domain}`);
    } catch (error) {
        if (verbose) console.log(`⚠️ WHOIS falló: ${error.message}`);
        enriched.sources.whois = { error: error.message };
    }
    
    await sleep(500);
    
    // VirusTotal (requiere API key)
    if (config.sources?.virustotal?.enabled && config.sources?.virustotal?.apiKey) {
        try {
            const cacheKey = getCacheKey('virustotal_domain', domain);
            let data = getFromCache(config, cacheKey);
            if (!data) {
                data = await makeRequest(
                    `https://www.virustotal.com/api/v3/domains/${domain}`,
                    { 'x-apikey': config.sources.virustotal.apiKey }
                );
                saveToCache(config, cacheKey, data);
            }
            enriched.sources.virustotal = data;
            if (verbose) console.log(`✅ VirusTotal enriquecido: ${domain}`);
        } catch (error) {
            if (verbose) console.log(`⚠️ VirusTotal falló: ${error.message}`);
            enriched.sources.virustotal = { error: error.message };
        }
    }
    
    return enriched;
}

async function enrichHash(hash, config) {
    const enriched = { hash, sources: {} };
    
    // VirusTotal (requiere API key)
    if (config.sources?.virustotal?.enabled && config.sources?.virustotal?.apiKey) {
        try {
            const cacheKey = getCacheKey('virustotal_hash', hash);
            let data = getFromCache(config, cacheKey);
            if (!data) {
                data = await makeRequest(
                    `https://www.virustotal.com/api/v3/files/${hash}`,
                    { 'x-apikey': config.sources.virustotal.apiKey }
                );
                saveToCache(config, cacheKey, data);
            }
            enriched.sources.virustotal = data;
            if (verbose) console.log(`✅ VirusTotal enriquecido: ${hash}`);
        } catch (error) {
            if (verbose) console.log(`⚠️ VirusTotal falló: ${error.message}`);
            enriched.sources.virustotal = { error: error.message };
        }
    }
    
    return enriched;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function processItem(item, types, config) {
    const result = { original: item, enriched: {} };
    
    if (types.includes('ip') && item.ip) {
        result.enriched.ip = await enrichIP(item.ip, config);
    }
    
    if (types.includes('domain') && item.domain) {
        result.enriched.domain = await enrichDomain(item.domain, config);
    }
    
    if (types.includes('hash') && item.hash) {
        result.enriched.hash = await enrichHash(item.hash, config);
    }
    
    return result;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Data Enrichment Pipeline - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (init) {
        initConfig();
        process.exit(0);
    }

    const config = loadConfig();

    // Caso 1: IP única
    if (ip) {
        const result = await enrichIP(ip, config);
        console.log('\n📊 RESULTADO:');
        console.log(JSON.stringify(result, null, 2));
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            console.log(`💾 Guardado en: ${outputFile}`);
        }
        process.exit(0);
    }

    // Caso 2: Dominio único
    if (domain) {
        const result = await enrichDomain(domain, config);
        console.log('\n📊 RESULTADO:');
        console.log(JSON.stringify(result, null, 2));
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            console.log(`💾 Guardado en: ${outputFile}`);
        }
        process.exit(0);
    }

    // Caso 3: Hash único
    if (hash) {
        const result = await enrichHash(hash, config);
        console.log('\n📊 RESULTADO:');
        console.log(JSON.stringify(result, null, 2));
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
            console.log(`💾 Guardado en: ${outputFile}`);
        }
        process.exit(0);
    }

    // Caso 4: Archivo de entrada
    if (inputFile) {
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Archivo no encontrado: ${inputFile}`);
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        const items = Array.isArray(data) ? data : [data];
        const types = enrichTypes || ['ip', 'domain', 'hash'];
        
        console.log(`📋 Procesando ${items.length} items...`);
        
        const results = [];
        let processed = 0;
        
        for (const item of items) {
            processed++;
            if (verbose) {
                console.log(`📊 Procesando [${processed}/${items.length}]`);
            }
            const result = await processItem(item, types, config);
            results.push(result);
            
            // Rate limiting
            if (config.rateLimit?.enabled) {
                await sleep(config.rateLimit.delay || 1000);
            }
        }
        
        const output = {
            timestamp: new Date().toISOString(),
            total: results.length,
            results
        };
        
        console.log('\n📊 RESULTADOS:');
        console.log(JSON.stringify(output, null, 2));
        
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`💾 Guardado en: ${outputFile}`);
        }
        
        process.exit(0);
    }

    // Sin argumentos
    console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
    console.log('💡 Ejemplos:');
    console.log('  --ip 8.8.8.8');
    console.log('  --domain google.com');
    console.log('  --input data.json --enrich ip,domain');
})();
