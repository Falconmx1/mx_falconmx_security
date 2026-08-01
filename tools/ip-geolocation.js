#!/usr/bin/env node

/**
 * IP Geolocation - MFH TOOLS PRO
 * Obtiene ubicación geográfica de una IP usando APIs
 * 
 * Uso: node ip-geolocation.js <ip>
 * Ejemplo: node ip-geolocation.js 8.8.8.8
 * Ejemplo: node ip-geolocation.js google.com
 */

const https = require('https');
const dns = require('dns').promises;

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    apis: {
        ipapi: 'https://ipapi.co/{ip}/json/',
        ipinfo: 'https://ipinfo.io/{ip}/json',
        ipwhois: 'https://ipwhois.io/json/{ip}'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error(`
🔍 IP Geolocation - MFH TOOLS PRO
==================================
Obtiene ubicación geográfica de una IP usando APIs.

Uso:
  node ip-geolocation.js <ip|dominio> [opciones]

Opciones:
  --api <ipapi|ipinfo|ipwhois>  API a utilizar (default: ipapi)
  --verbose                     Mostrar más detalles
  --help                        Mostrar esta ayuda

Ejemplos:
  node ip-geolocation.js 8.8.8.8
  node ip-geolocation.js google.com
  node ip-geolocation.js 8.8.8.8 --api ipinfo
`);
    process.exit(1);
}

let target = args[0];
let api = 'ipapi';
let verbose = false;

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--api' && args[i + 1]) {
        api = args[i + 1].toLowerCase();
        if (!CONFIG.apis[api]) {
            console.error(`❌ API no soportada: ${api}`);
            console.error(`   APIs disponibles: ${Object.keys(CONFIG.apis).join(', ')}`);
            process.exit(1);
        }
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
async function resolveTarget(target) {
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(target)) {
        return target;
    }
    try {
        const resolved = await dns.lookup(target);
        return resolved.address;
    } catch (error) {
        throw new Error(`No se pudo resolver el dominio: ${target}`);
    }
}

function fetchIPInfo(ip, apiType) {
    return new Promise((resolve, reject) => {
        const apiUrl = CONFIG.apis[apiType].replace('{ip}', ip);
        const parsedUrl = new URL(apiUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const client = isHttps ? https : require('http');
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            timeout: CONFIG.timeout,
            headers: {
                'User-Agent': 'MFH-IP-Geolocation/1.0'
            }
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    reject(new Error('Error al parsear respuesta JSON'));
                }
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        
        req.end();
    });
}

function formatLocation(data, apiType) {
    let info = {};
    
    if (apiType === 'ipapi') {
        info = {
            ip: data.ip,
            country: data.country_name || data.country,
            region: data.region || data.region_code,
            city: data.city,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone || 'N/A',
            isp: data.org || data.isp || 'N/A',
            org: data.org || 'N/A',
            asn: data.asn || 'N/A',
            postal: data.postal || 'N/A'
        };
    } else if (apiType === 'ipinfo') {
        info = {
            ip: data.ip,
            country: data.country,
            region: data.region || data.region_code,
            city: data.city,
            latitude: data.loc ? data.loc.split(',')[0] : 'N/A',
            longitude: data.loc ? data.loc.split(',')[1] : 'N/A',
            timezone: data.timezone || 'N/A',
            isp: data.org || 'N/A',
            org: data.org || 'N/A',
            asn: data.asn || 'N/A',
            postal: data.postal || 'N/A'
        };
    } else if (apiType === 'ipwhois') {
        info = {
            ip: data.ip,
            country: data.country || data.country_name,
            region: data.region || data.region_code,
            city: data.city,
            latitude: data.latitude || data.lat,
            longitude: data.longitude || data.lng,
            timezone: data.timezone || 'N/A',
            isp: data.isp || 'N/A',
            org: data.org || 'N/A',
            asn: data.asn || 'N/A',
            postal: data.postal || 'N/A'
        };
    }
    
    return info;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 IP Geolocation - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        // Resolver IP
        console.log(`🔍 Resolviendo: ${target}`);
        const ip = await resolveTarget(target);
        console.log(`✅ IP: ${ip}`);
        console.log(`📡 Usando API: ${api}`);
        console.log('');
        
        // Obtener información
        console.log('📡 Obteniendo información de geolocalización...');
        const data = await fetchIPInfo(ip, api);
        
        if (data.error) {
            console.error(`❌ Error de API: ${data.error}`);
            process.exit(1);
        }
        
        const info = formatLocation(data, api);
        
        // Mostrar resultados
        console.log('\n📊 RESULTADOS:');
        console.log(`   🌐 IP: ${info.ip}`);
        console.log(`   🌍 País: ${info.country || 'N/A'}`);
        console.log(`   🏙️ Región: ${info.region || 'N/A'}`);
        console.log(`   🏙️ Ciudad: ${info.city || 'N/A'}`);
        console.log(`   📍 Coordenadas: ${info.latitude || 'N/A'}, ${info.longitude || 'N/A'}`);
        console.log(`   🕐 Zona horaria: ${info.timezone || 'N/A'}`);
        console.log(`   📬 Código postal: ${info.postal || 'N/A'}`);
        console.log(`   🔗 ISP: ${info.isp || 'N/A'}`);
        console.log(`   🏢 Organización: ${info.org || 'N/A'}`);
        console.log(`   🔢 ASN: ${info.asn || 'N/A'}`);
        
        // Recomendaciones
        console.log('\n🔹 RECOMENDACIONES:');
        if (info.country && info.city) {
            console.log(`   📍 La IP ${info.ip} está geolocalizada en ${info.city}, ${info.country}`);
        }
        
        console.log('\n✅ IP Geolocation completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
