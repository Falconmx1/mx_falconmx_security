#!/usr/bin/env node

/**
 * Threat Intelligence Integrator - MFH TOOLS PRO
 * Integra múltiples fuentes de inteligencia de amenazas
 * 
 * Uso: node threat-intel-integrator.js [opciones]
 * Ejemplo: node threat-intel-integrator.js --ioc 8.8.8.8
 * Ejemplo: node threat-intel-integrator.js --ioc malware.exe --type file
 * Ejemplo: node threat-intel-integrator.js --ioc evil.com --type domain --output report.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 30000,
    userAgent: 'MFH-Threat-Intel/1.0',
    sources: {
        abuseipdb: 'https://api.abuseipdb.com/api/v2',
        virustotal: 'https://www.virustotal.com/api/v3',
        alienvault: 'https://otx.alienvault.com/api/v1',
        shodan: 'https://api.shodan.io',
        ibm_xforce: 'https://api.xforce.ibmcloud.com'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let ioc = null;
let type = 'ip';
let outputFile = null;
let verbose = false;
let apiKeys = {};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--ioc':
            ioc = args[i + 1];
            i++;
            break;
        case '--type':
            type = args[i + 1];
            i++;
            break;
        case '--api-keys':
            try {
                apiKeys = JSON.parse(args[i + 1]);
            } catch (error) {
                console.error('❌ Formato de API keys inválido');
                process.exit(1);
            }
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
        case '--list-sources':
            console.log('\n📋 FUENTES DE INTELIGENCIA:\n');
            console.log('   🔍 AbuseIPDB - Reportes de IPs maliciosas');
            console.log('   🔍 VirusTotal - Escaneo de archivos y URLs');
            console.log('   🔍 AlienVault OTX - Open Threat Exchange');
            console.log('   🔍 Shodan - Dispositivos expuestos');
            console.log('   🔍 IBM X-Force - Inteligencia de amenazas');
            process.exit(0);
        case '--help':
        case '-h':
            console.log(`
🔍 Threat Intelligence Integrator - MFH TOOLS PRO
===================================================
Integra múltiples fuentes de inteligencia de amenazas.

Uso:
  node threat-intel-integrator.js [opciones]

Opciones:
  --ioc <valor>            Indicador de compromiso (IP, dominio, hash, URL)
  --type <tipo>            Tipo de IOC (ip, domain, file, url)
  --api-keys <json>        API keys en formato JSON
  --output, -o <archivo>   Guardar resultados en JSON
  --list-sources           Listar fuentes disponibles
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node threat-intel-integrator.js --ioc 8.8.8.8
  node threat-intel-integrator.js --ioc malware.exe --type file
  node threat-intel-integrator.js --ioc evil.com --type domain --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'application/json',
                ...headers
            },
            timeout: CONFIG.timeout
        };

        if (verbose) {
            console.log(`📡 Request: ${url}`);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        resolve({ error: 'Error parsing JSON', raw: data });
                    }
                } else {
                    resolve({ error: `HTTP ${res.statusCode}`, data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function checkAbuseIPDB(ioc, apiKey) {
    if (!apiKey) return { source: 'abuseipdb', error: 'No API key provided' };
    
    try {
        const url = `${CONFIG.sources.abuseipdb}/check?ipAddress=${ioc}&maxAgeInDays=90`;
        const headers = { 'Key': apiKey };
        const data = await makeRequest(url, headers);
        
        return {
            source: 'abuseipdb',
            data: data.data || data,
            success: !data.error
        };
    } catch (error) {
        return { source: 'abuseipdb', error: error.message };
    }
}

async function checkVirusTotal(ioc, type, apiKey) {
    if (!apiKey) return { source: 'virustotal', error: 'No API key provided' };
    
    try {
        let endpoint = '';
        if (type === 'ip') endpoint = `ip_addresses/${ioc}`;
        else if (type === 'domain') endpoint = `domains/${ioc}`;
        else if (type === 'file') endpoint = `files/${ioc}`;
        else if (type === 'url') endpoint = `urls/${Buffer.from(ioc).toString('base64').replace(/=+$/, '')}`;
        else return { source: 'virustotal', error: 'Unsupported type' };
        
        const url = `${CONFIG.sources.virustotal}/${endpoint}`;
        const headers = { 'x-apikey': apiKey };
        const data = await makeRequest(url, headers);
        
        return {
            source: 'virustotal',
            data: data.data || data,
            success: !data.error
        };
    } catch (error) {
        return { source: 'virustotal', error: error.message };
    }
}

async function checkAlienVault(ioc, type) {
    try {
        let endpoint = '';
        if (type === 'ip') endpoint = `indicators/IPv4/${ioc}/general`;
        else if (type === 'domain') endpoint = `indicators/domain/${ioc}/general`;
        else if (type === 'file') endpoint = `indicators/file/${ioc}/general`;
        else if (type === 'url') endpoint = `indicators/url/${ioc}/general`;
        else return { source: 'alienvault', error: 'Unsupported type' };
        
        const url = `${CONFIG.sources.alienvault}/${endpoint}`;
        const data = await makeRequest(url);
        
        return {
            source: 'alienvault',
            data: data,
            success: !data.error
        };
    } catch (error) {
        return { source: 'alienvault', error: error.message };
    }
}

async function checkShodan(ioc, apiKey) {
    if (!apiKey) return { source: 'shodan', error: 'No API key provided' };
    
    try {
        const url = `${CONFIG.sources.shodan}/shodan/host/${ioc}?key=${apiKey}`;
        const data = await makeRequest(url);
        
        return {
            source: 'shodan',
            data: data,
            success: !data.error
        };
    } catch (error) {
        return { source: 'shodan', error: error.message };
    }
}

async function integrateThreatIntelligence(ioc, type, apiKeys) {
    const results = {
        ioc,
        type,
        timestamp: new Date().toISOString(),
        sources: {}
    };

    // AbuseIPDB (solo para IPs)
    if (type === 'ip') {
        results.sources.abuseipdb = await checkAbuseIPDB(ioc, apiKeys.abuseipdb);
    }

    // VirusTotal
    if (apiKeys.virustotal) {
        results.sources.virustotal = await checkVirusTotal(ioc, type, apiKeys.virustotal);
    }

    // AlienVault OTX (gratuito, sin API key necesaria)
    results.sources.alienvault = await checkAlienVault(ioc, type);

    // Shodan (solo para IPs)
    if (type === 'ip' && apiKeys.shodan) {
        results.sources.shodan = await checkShodan(ioc, apiKeys.shodan);
    }

    // Resumen
    const successful = Object.values(results.sources).filter(s => s.success !== false && !s.error);
    results.summary = {
        totalSources: Object.keys(results.sources).length,
        successful: successful.length,
        failed: Object.keys(results.sources).length - successful.length
    };

    return results;
}

function formatResults(results) {
    let output = '';
    output += `🔍 Threat Intelligence Integrator - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    output += `📋 IOC: ${results.ioc}\n`;
    output += `📋 Tipo: ${results.type}\n`;
    output += `📅 Fecha: ${new Date(results.timestamp).toLocaleString()}\n\n`;

    output += `📊 RESUMEN:\n`;
    output += `   📡 Fuentes consultadas: ${results.summary.totalSources}\n`;
    output += `   ✅ Éxitos: ${results.summary.successful}\n`;
    output += `   ❌ Fallos: ${results.summary.failed}\n\n`;

    // Detalle por fuente
    for (const [source, result] of Object.entries(results.sources)) {
        const icon = result.success !== false && !result.error ? '✅' : '❌';
        output += `${icon} ${source.toUpperCase()}\n`;
        
        if (result.error) {
            output += `   ⚠️ ${result.error}\n`;
        } else if (result.data) {
            // Mostrar información relevante
            if (source === 'abuseipdb' && result.data) {
                const data = result.data;
                output += `   📊 Reportes: ${data.totalReports || 0}\n`;
                output += `   📋 Categorías: ${data.categories ? data.categories.join(', ') : 'N/A'}\n`;
                if (data.abuseConfidenceScore) {
                    output += `   🎯 Confianza: ${data.abuseConfidenceScore}%\n`;
                }
            } else if (source === 'virustotal' && result.data) {
                const data = result.data.attributes || {};
                const stats = data.last_analysis_stats || {};
                output += `   📊 Total análisis: ${Object.values(stats).reduce((a,b) => a+b, 0)}\n`;
                output += `   🔴 Malicioso: ${stats.malicious || 0}\n`;
                output += `   🟡 Sospechoso: ${stats.suspicious || 0}\n`;
            } else if (source === 'alienvault' && result.data) {
                const data = result.data;
                output += `   📊 Pulse count: ${data.pulse_info?.count || 0}\n`;
            } else if (source === 'shodan' && result.data) {
                const data = result.data;
                output += `   📊 País: ${data.country_name || 'N/A'}\n`;
                output += `   📊 Org: ${data.org || 'N/A'}\n`;
                output += `   🔌 Puertos: ${data.ports ? data.ports.length : 0}\n`;
            }
        }
        output += '\n';
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Threat Intelligence Integrator - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (!ioc) {
        console.error('❌ Debes especificar un IOC con --ioc');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        console.log(`📡 Consultando inteligencia para: ${ioc} (${type})`);
        
        const results = await integrateThreatIntelligence(ioc, type, apiKeys);
        
        // Mostrar resultados
        console.log(formatResults(results));
        
        // Guardar resultados
        if (outputFile) {
            fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Integración completada');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
