#!/usr/bin/env node

/**
 * Shodan Query Builder - MFH TOOLS PRO
 * Construye y ejecuta consultas Shodan para encontrar dispositivos expuestos
 * 
 * Uso: node shodan-query-builder.js [opciones]
 * Ejemplo: node shodan-query-builder.js --query "port:22 country:MX" --token SHODAN_API_KEY
 * Ejemplo: node shodan-query-builder.js --query "port:80" --limit 50 --output results.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    baseUrl: 'https://api.shodan.io',
    timeout: 30000,
    defaultLimit: 100,
    maxLimit: 1000
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let query = null;
let apiToken = null;
let limit = CONFIG.defaultLimit;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--query':
        case '-q':
            query = args[i + 1];
            i++;
            break;
        case '--token':
        case '-t':
            apiToken = args[i + 1];
            i++;
            break;
        case '--limit':
        case '-l':
            limit = parseInt(args[i + 1]);
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
        case '--examples':
            console.log(`
📋 EJEMPLOS DE CONSULTAS SHODAN:

🔍 Búsquedas básicas:
  --query "port:22"                    # Puertos SSH
  --query "port:80 country:MX"         # HTTP en México
  --query "os:Linux"                   # Dispositivos Linux
  --query "city:Madrid"                # Ciudad específica

🔍 Búsquedas avanzadas:
  --query "product:Apache"             # Producto específico
  --query "vuln:CVE-2021-44228"        # Vulnerabilidad específica
  --query "org:Google"                 # Organización
  --query "hostname:example.com"       # Hostname específico

🔍 Búsquedas combinadas:
  --query "port:443 has_ssl:true country:US"
  --query "port:22 -os:Linux"          # No Linux
  --query "product:MongoDB port:27017"

🔍 Filtros disponibles:
  city, country, state, postal, latitude, longitude
  hostname, ip, net, org, isp, domain
  os, port, product, version, vuln
  has_ssl, has_vuln, before, after
`);
            process.exit(0);
        case '--help':
        case '-h':
            console.log(`
🔍 Shodan Query Builder - MFH TOOLS PRO
========================================
Construye y ejecuta consultas Shodan.

Uso:
  node shodan-query-builder.js [opciones]

Opciones:
  --query, -q <consulta>   Consulta Shodan
  --token, -t <token>      API Token de Shodan
  --limit, -l <n>          Límite de resultados (default: 100)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --examples               Mostrar ejemplos de consultas
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node shodan-query-builder.js --query "port:22 country:MX" --token SHODAN_API_KEY
  node shodan-query-builder.js --query "port:80" --limit 50 --output results.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeShodanRequest(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${CONFIG.baseUrl}${endpoint}`);
        url.searchParams.append('key', apiToken);
        for (const [key, value] of Object.entries(params)) {
            url.searchParams.append(key, value);
        }

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'GET',
            headers: {
                'User-Agent': 'MFH-Shodan-Query-Builder/1.0'
            },
            timeout: CONFIG.timeout
        };

        if (verbose) {
            console.log(`📡 Request: ${url.href}`);
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
                        reject(new Error(`Shodan API Error (${res.statusCode}): ${errorData.error || data}`));
                    } catch (error) {
                        reject(new Error(`HTTP Error ${res.statusCode}: ${data}`));
                    }
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function searchShodan(query, limit) {
    console.log(`🔍 Ejecutando consulta Shodan: "${query}"`);
    console.log(`📊 Límite: ${limit}`);

    try {
        // 1. Obtener conteo
        const countData = await makeShodanRequest('/shodan/host/count', { query });
        console.log(`📊 Total de resultados: ${countData.total}`);

        if (countData.total === 0) {
            console.log('⚠️ No se encontraron resultados');
            return { total: 0, matches: [], facets: countData.facets };
        }

        // 2. Obtener resultados (paginado)
        const allMatches = [];
        let currentPage = 1;
        const pageSize = Math.min(limit, 100);

        while (allMatches.length < Math.min(limit, countData.total)) {
            const remaining = Math.min(limit, countData.total) - allMatches.length;
            const size = Math.min(pageSize, remaining);

            if (verbose) {
                console.log(`📄 Página ${currentPage}, obteniendo ${size} resultados...`);
            }

            const searchData = await makeShodanRequest('/shodan/host/search', {
                query,
                page: currentPage,
                size
            });

            if (searchData.matches && searchData.matches.length > 0) {
                allMatches.push(...searchData.matches);
            }

            if (searchData.matches.length < size) {
                break;
            }

            currentPage++;
            
            // Pequeña pausa para no saturar la API
            await new Promise(r => setTimeout(r, 200));
        }

        console.log(`✅ Encontrados ${allMatches.length} resultados`);

        return {
            total: countData.total,
            matches: allMatches,
            facets: countData.facets,
            query,
            limit
        };

    } catch (error) {
        console.error(`❌ Error en la consulta: ${error.message}`);
        throw error;
    }
}

function formatResults(results) {
    let output = '';
    output += `🔍 Shodan Query Builder - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    output += `📋 Consulta: "${results.query}"\n`;
    output += `📊 Resultados: ${results.total}\n`;
    output += `📋 Mostrando: ${results.matches.length}\n\n`;

    if (results.facets) {
        output += `📊 FACETAS:\n`;
        for (const [facetName, facetData] of Object.entries(results.facets)) {
            output += `   ${facetName}:\n`;
            for (const item of facetData) {
                output += `      ${item.value}: ${item.count}\n`;
            }
        }
        output += '\n';
    }

    if (results.matches.length > 0) {
        output += `📋 RESULTADOS (${results.matches.length}):\n`;
        for (let i = 0; i < Math.min(results.matches.length, 20); i++) {
            const host = results.matches[i];
            output += `\n${i + 1}. ${host.ip_str}${host.hostnames && host.hostnames.length > 0 ? ` (${host.hostnames[0]})` : ''}\n`;
            output += `   📍 País: ${host.location?.country_name || 'Unknown'}\n`;
            output += `   🖥️ Org: ${host.org || 'Unknown'}\n`;
            output += `   🔌 Puertos: ${host.ports ? host.ports.slice(0, 5).join(', ') + (host.ports.length > 5 ? `... (+${host.ports.length - 5})` : '') : 'N/A'}\n`;
            if (host.product) {
                output += `   📦 Producto: ${host.product}${host.version ? ` v${host.version}` : ''}\n`;
            }
            if (host.vulns && host.vulns.length > 0) {
                output += `   ⚠️ Vulnerabilidades: ${host.vulns.join(', ')}\n`;
            }
            output += `   🔗 https://www.shodan.io/host/${host.ip_str}\n`;
        }

        if (results.matches.length > 20) {
            output += `\n... y ${results.matches.length - 20} resultados más\n`;
        }
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Shodan Query Builder - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!query) {
        console.error('❌ Debes especificar una consulta con --query');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    if (!apiToken) {
        // Intentar cargar token desde variable de entorno o archivo
        apiToken = process.env.SHODAN_API_KEY;
        if (!apiToken) {
            console.error('❌ Debes especificar un token con --token o configurar SHODAN_API_KEY');
            console.log('   Obtén tu API key en: https://account.shodan.io/');
            process.exit(1);
        }
    }

    try {
        const results = await searchShodan(query, Math.min(limit, CONFIG.maxLimit));

        // Mostrar resultados
        console.log(formatResults(results));

        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                query,
                total: results.total,
                matches: results.matches,
                facets: results.facets
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }

        console.log('\n✅ Consulta completada');

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
