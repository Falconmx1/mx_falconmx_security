#!/usr/bin/env node

/**
 * Asset Discovery - MFH TOOLS PRO
 * Descubre activos en la red (IPs, dominios, servicios)
 * 
 * Uso: node asset-discovery.js [opciones]
 * Ejemplo: node asset-discovery.js --network 192.168.1.0/24
 * Ejemplo: node asset-discovery.js --domain example.com
 * Ejemplo: node asset-discovery.js --network 10.0.0.0/24 --output assets.json
 */

const dns = require('dns');
const net = require('net');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 3000,
    maxThreads: 100,
    userAgent: 'MFH-Asset-Discovery/1.0',
    commonPorts: [22, 80, 443, 21, 25, 53, 110, 143, 3306, 5432, 6379, 27017]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let network = null;
let domain = null;
let outputFile = null;
let verbose = false;
let scanPorts = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--network':
        case '-n':
            network = args[i + 1];
            i++;
            break;
        case '--domain':
        case '-d':
            domain = args[i + 1];
            i++;
            break;
        case '--ports':
        case '-p':
            scanPorts = true;
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
🔍 Asset Discovery - MFH TOOLS PRO
===================================
Descubre activos en la red (IPs, dominios, servicios).

Uso:
  node asset-discovery.js [opciones]

Opciones:
  --network, -n <red>      Red a escanear (ej: 192.168.1.0/24)
  --domain, -d <dominio>   Dominio a descubrir
  --ports, -p              Escanear puertos comunes
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node asset-discovery.js --network 192.168.1.0/24
  node asset-discovery.js --domain example.com
  node asset-discovery.js --network 10.0.0.0/24 --output assets.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getNetworkRange(cidr) {
    const [ip, mask] = cidr.split('/');
    const parts = ip.split('.').map(Number);
    const maskBits = parseInt(mask);
    
    if (maskBits < 0 || maskBits > 32) {
        throw new Error('Máscara inválida');
    }
    
    // Calcular dirección de red y broadcast
    const ipInt = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    const maskInt = maskBits === 0 ? 0 : (~0 << (32 - maskBits));
    const networkInt = ipInt & maskInt;
    const broadcastInt = networkInt | ~maskInt;
    
    // Calcular número de hosts
    const hostCount = maskBits < 31 ? Math.pow(2, 32 - maskBits) - 2 : 0;
    if (hostCount > 65536) {
        console.warn(`⚠️ Rango muy grande (${hostCount} hosts). Limitando a 65536.`);
    }
    const maxHosts = Math.min(hostCount, 65536);
    
    // Generar IPs
    const ips = [];
    const start = networkInt + 1;
    const end = networkInt + maxHosts;
    
    for (let i = start; i < end; i++) {
        const octet1 = (i >> 24) & 0xFF;
        const octet2 = (i >> 16) & 0xFF;
        const octet3 = (i >> 8) & 0xFF;
        const octet4 = i & 0xFF;
        ips.push(`${octet1}.${octet2}.${octet3}.${octet4}`);
    }
    
    return ips;
}

function pingHost(ip) {
    return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        
        socket.setTimeout(CONFIG.timeout);
        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({ ip, alive: true, latency });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ ip, alive: false });
        });
        
        socket.on('error', () => {
            resolve({ ip, alive: false });
        });
        
        socket.connect(80, ip);
    });
}

function resolveDomain(domain) {
    return new Promise((resolve) => {
        dns.resolve4(domain, (err, addresses) => {
            if (err) {
                resolve({ domain, ip: null, error: err.message });
            } else {
                resolve({ domain, ip: addresses[0] || null });
            }
        });
    });
}

function getSubdomains(domain) {
    return new Promise((resolve) => {
        const subdomains = ['www', 'mail', 'ftp', 'webmail', 'smtp', 'pop', 'ns1', 'ns2', 
            'cpanel', 'whm', 'autodiscover', 'autoconfig', 'm', 'imap', 'test', 'blog',
            'dev', 'api', 'admin', 'forum', 'news', 'vpn', 'mx', 'static', 'docs',
            'beta', 'shop', 'sql', 'secure', 'demo', 'cp', 'calendar', 'wiki', 'media',
            'email', 'images', 'download', 'dns', 'stats', 'dashboard', 'portal', 'manage',
            'start', 'info', 'app', 'apps', 'stage', 'staging', 'prod', 'qa'
        ];
        
        const promises = subdomains.map(sub => resolveDomain(`${sub}.${domain}`));
        Promise.all(promises).then(results => {
            const found = results.filter(r => r.ip !== null);
            resolve(found);
        });
    });
}

function scanPort(ip, port) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(CONFIG.timeout);
        
        socket.on('connect', () => {
            socket.destroy();
            resolve({ port, open: true });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, open: false });
        });
        
        socket.on('error', () => {
            resolve({ port, open: false });
        });
        
        socket.connect(port, ip);
    });
}

async function scanPorts(ip, ports = CONFIG.commonPorts) {
    const results = [];
    for (const port of ports) {
        const result = await scanPort(ip, port);
        if (result.open) {
            results.push(result.port);
        }
    }
    return results;
}

async function discoverNetwork(network) {
    console.log(`🚀 Descubriendo activos en ${network}`);
    const ips = getNetworkRange(network);
    console.log(`📋 ${ips.length} IPs a escanear`);
    
    const assets = [];
    let processed = 0;
    
    // Ping en batches
    const batchSize = 50;
    for (let i = 0; i < ips.length; i += batchSize) {
        const batch = ips.slice(i, i + batchSize);
        const promises = batch.map(ip => pingHost(ip));
        const results = await Promise.all(promises);
        
        for (const result of results) {
            if (result.alive) {
                const asset = {
                    ip: result.ip,
                    latency: result.latency,
                    hostname: null,
                    ports: []
                };
                
                // Resolver hostname
                try {
                    const hostname = await new Promise((resolve) => {
                        dns.reverse(result.ip, (err, names) => {
                            if (err) resolve(null);
                            else resolve(names[0] || null);
                        });
                    });
                    asset.hostname = hostname;
                } catch (error) {
                    // Ignorar
                }
                
                // Escanear puertos
                if (scanPorts) {
                    asset.ports = await scanPorts(result.ip);
                }
                
                assets.push(asset);
            }
        }
        
        processed += batch.length;
        console.log(`📊 Progreso: ${processed}/${ips.length} (${Math.round(processed/ips.length*100)}%)`);
    }
    
    return assets;
}

async function discoverDomain(domain) {
    console.log(`🚀 Descubriendo activos para ${domain}`);
    
    const assets = [];
    
    // Resolver dominio principal
    const main = await resolveDomain(domain);
    if (main.ip) {
        assets.push({
            domain: main.domain,
            ip: main.ip,
            type: 'main'
        });
    }
    
    // Buscar subdominios
    console.log(`🔍 Buscando subdominios...`);
    const subdomains = await getSubdomains(domain);
    for (const sub of subdomains) {
        assets.push({
            domain: sub.domain,
            ip: sub.ip,
            type: 'subdomain'
        });
    }
    
    return assets;
}

function formatResults(results, type) {
    let output = '';
    output += `🔍 Asset Discovery - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    output += `📊 RESULTADOS:\n`;
    output += `   📋 Total activos: ${results.length}\n\n`;
    
    if (type === 'network') {
        const online = results.filter(a => a.alive !== undefined ? a.alive : true);
        output += `   🟢 Hosts activos: ${online.length}\n`;
        output += `   🔴 Hosts inactivos: ${results.length - online.length}\n`;
        
        output += `\n📋 ACTIVOS DETECTADOS:\n`;
        for (const asset of results) {
            output += `   🌐 ${asset.ip}`;
            if (asset.hostname) {
                output += ` (${asset.hostname})`;
            }
            output += ` - ⏱️ ${asset.latency || 'N/A'}ms`;
            if (asset.ports && asset.ports.length > 0) {
                output += ` - 🔌 Puertos: ${asset.ports.join(', ')}`;
            }
            output += '\n';
        }
    } else if (type === 'domain') {
        output += `\n📋 DOMINIOS ENCONTRADOS:\n`;
        for (const asset of results) {
            const icon = asset.type === 'main' ? '🏠' : '🔸';
            output += `   ${icon} ${asset.domain} → ${asset.ip}\n`;
        }
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Asset Discovery - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (!network && !domain) {
        console.error('❌ Debes especificar --network o --domain');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    try {
        let results = [];
        let type = '';
        
        if (network) {
            results = await discoverNetwork(network);
            type = 'network';
        } else if (domain) {
            results = await discoverDomain(domain);
            type = 'domain';
        }
        
        // Mostrar resultados
        console.log(formatResults(results, type));
        
        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                query: { network, domain },
                total: results.length,
                assets: results
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Descubrimiento completado');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
