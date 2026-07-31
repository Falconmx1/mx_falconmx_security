#!/usr/bin/env node

/**
 * Network Scanner - MFH TOOLS PRO
 * Escaneo de redes locales (ARP, ping sweep)
 * 
 * Uso: node network-scanner.js <red>
 * Ejemplo: node network-scanner.js 192.168.1.0/24
 * Ejemplo: node network-scanner.js 192.168.1.1-254
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    concurrency: 20,
    pingCount: 1,
    pingTimeout: 2000
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error(`
🔍 Network Scanner - MFH TOOLS PRO
====================================
Escanea redes locales (ARP, ping sweep).

Uso:
  node network-scanner.js <red>

Ejemplos:
  node network-scanner.js 192.168.1.0/24
  node network-scanner.js 192.168.1.1-254
  node network-scanner.js 10.0.0.1-50
`);
    process.exit(1);
}

const network = args[0];

// ==================== FUNCIONES ====================
function parseCIDR(cidr) {
    const [ip, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix);
    if (isNaN(prefixNum) || prefixNum < 1 || prefixNum > 32) {
        return null;
    }
    const ipParts = ip.split('.').map(Number);
    if (ipParts.length !== 4 || ipParts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return null;
    }
    const ipInt = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const mask = ~0 << (32 - prefixNum);
    const networkInt = ipInt & mask;
    const broadcastInt = networkInt | ~mask;
    const startInt = networkInt + 1;
    const endInt = broadcastInt - 1;
    const hosts = endInt - startInt + 1;
    
    if (hosts < 1 || hosts > 65535) {
        return null;
    }
    
    return {
        network: cidr,
        ipInt,
        networkInt,
        broadcastInt,
        startInt,
        endInt,
        hosts
    };
}

function ipIntToString(ipInt) {
    return [
        (ipInt >>> 24) & 255,
        (ipInt >>> 16) & 255,
        (ipInt >>> 8) & 255,
        ipInt & 255
    ].join('.');
}

function parseRange(range) {
    const parts = range.split('-');
    if (parts.length !== 2) return null;
    const startParts = parts[0].split('.');
    const endParts = parts[1].split('.');
    
    if (startParts.length !== 4 || endParts.length !== 4) return null;
    
    const start = startParts.map(Number);
    const end = endParts.map(Number);
    
    if (start.some(p => isNaN(p) || p < 0 || p > 255) || end.some(p => isNaN(p) || p < 0 || p > 255)) {
        return null;
    }
    
    const startInt = (start[0] << 24) + (start[1] << 16) + (start[2] << 8) + start[3];
    const endInt = (end[0] << 24) + (end[1] << 16) + (end[2] << 8) + end[3];
    
    return {
        startInt,
        endInt,
        hosts: endInt - startInt + 1
    };
}

async function pingHost(ip) {
    try {
        const { stdout } = await execPromise(`ping -c ${CONFIG.pingCount} -W ${CONFIG.pingTimeout / 1000} ${ip}`, { timeout: CONFIG.timeout });
        if (stdout.includes('1 received') || stdout.includes('0% packet loss') || stdout.includes('icmp_seq=')) {
            return { ip, status: 'online', response: stdout };
        }
        return { ip, status: 'offline' };
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Si ping no está disponible en Windows
            try {
                const { stdout } = await execPromise(`ping -n ${CONFIG.pingCount} ${ip}`, { timeout: CONFIG.timeout });
                if (stdout.includes('Received = 1') || stdout.includes('0% loss')) {
                    return { ip, status: 'online', response: stdout };
                }
                return { ip, status: 'offline' };
            } catch (e2) {
                return { ip, status: 'offline' };
            }
        }
        return { ip, status: 'offline' };
    }
}

async function scanRange(startInt, endInt, concurrency = CONFIG.concurrency) {
    const ips = [];
    for (let i = startInt; i <= endInt; i++) {
        ips.push(ipIntToString(i));
    }
    
    console.log(`🔍 Escaneando ${ips.length} IPs...`);
    console.log('='.repeat(60));
    
    const results = [];
    let completed = 0;
    const total = ips.length;
    
    for (let i = 0; i < ips.length; i += concurrency) {
        const batch = ips.slice(i, i + concurrency);
        const batchPromises = batch.map(ip => pingHost(ip));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        completed += batch.length;
        const progress = Math.round((completed / total) * 100);
        process.stdout.write(`\r📊 Progreso: ${progress}% (${completed}/${total}) - Encontrados: ${results.filter(r => r.status === 'online').length}`);
    }
    
    process.stdout.write('\n');
    return results;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Network Scanner - ${network}`);
        console.log('='.repeat(60));
        
        let startInt, endInt, hosts;
        
        // Detectar tipo de red
        if (network.includes('/')) {
            const parsed = parseCIDR(network);
            if (!parsed) {
                console.error('❌ Formato CIDR inválido');
                process.exit(1);
            }
            startInt = parsed.startInt;
            endInt = parsed.endInt;
            hosts = parsed.hosts;
        } else if (network.includes('-')) {
            const parsed = parseRange(network);
            if (!parsed) {
                console.error('❌ Formato de rango inválido');
                process.exit(1);
            }
            startInt = parsed.startInt;
            endInt = parsed.endInt;
            hosts = parsed.hosts;
        } else {
            console.error('❌ Formato de red inválido. Usa CIDR (192.168.1.0/24) o rango (192.168.1.1-254)');
            process.exit(1);
        }
        
        if (hosts < 1 || hosts > 65535) {
            console.error('❌ Número de hosts demasiado grande o inválido');
            process.exit(1);
        }
        
        console.log(`📡 Hosts a escanear: ${hosts}`);
        console.log(`🔄 Concurrencia: ${CONFIG.concurrency}`);
        console.log('');
        
        const results = await scanRange(startInt, endInt);
        
        const online = results.filter(r => r.status === 'online');
        const offline = results.filter(r => r.status === 'offline');
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTADOS');
        console.log('='.repeat(60));
        console.log(`✅ Hosts en línea: ${online.length}`);
        console.log(`❌ Hosts fuera de línea: ${offline.length}`);
        console.log(`📡 Total escaneados: ${results.length}`);
        
        if (online.length > 0) {
            console.log('\n📋 HOSTS EN LÍNEA:');
            online.forEach((r, i) => {
                console.log(`   ${String(i + 1).padStart(3)}. ${r.ip}`);
            });
        } else {
            console.log('\n⚠️ No se encontraron hosts en línea');
        }
        
        console.log('\n✅ Network Scanner completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
