#!/usr/bin/env node

/**
 * Port Forwarding Checker - MFH TOOLS PRO
 * Verifica puertos abiertos y redireccionamientos en routers
 * 
 * Uso: node port-forwarding-checker.js <ip> <puerto>
 * Ejemplo: node port-forwarding-checker.js 192.168.1.1 8080
 * Ejemplo: node port-forwarding-checker.js google.com 80
 */

const net = require('net');
const dns = require('dns').promises;

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    maxRetries: 2,
    commonPorts: {
        21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
        80: 'HTTP', 110: 'POP3', 111: 'RPC', 135: 'MSRPC', 139: 'NetBIOS',
        143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
        1723: 'PPTP', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
        5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Proxy', 27017: 'MongoDB'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

if (args.length < 2) {
    console.error(`
🔍 Port Forwarding Checker - MFH TOOLS PRO
===========================================
Verifica puertos abiertos y redireccionamientos en routers.

Uso:
  node port-forwarding-checker.js <ip> <puerto> [opciones]
  node port-forwarding-checker.js <ip> --range <inicio>-<fin>

Opciones:
  --range <rango>      Escanear rango de puertos (ej: 1-1000)
  --timeout <ms>       Timeout en milisegundos (default: 5000)
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node port-forwarding-checker.js 192.168.1.1 8080
  node port-forwarding-checker.js google.com 80
  node port-forwarding-checker.js 192.168.1.1 --range 1-100
`);
    process.exit(1);
}

let target = args[0];
let port = null;
let portRange = null;
let timeout = CONFIG.timeout;
let verbose = false;

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--range' && args[i + 1]) {
        const rangeParts = args[i + 1].split('-');
        if (rangeParts.length === 2) {
            portRange = { start: parseInt(rangeParts[0]), end: parseInt(rangeParts[1]) };
        }
        i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
        timeout = parseInt(args[i + 1]) || CONFIG.timeout;
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    } else if (!args[i].startsWith('--')) {
        port = parseInt(args[i]);
    }
}

// ==================== FUNCIONES ====================
async function resolveTarget(target) {
    try {
        const resolved = await dns.lookup(target);
        return resolved.address;
    } catch (error) {
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(target)) {
            return target;
        }
        throw new Error(`No se pudo resolver el dominio: ${target}`);
    }
}

function checkPort(host, port, timeout) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = 'closed';
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            status = 'open';
            socket.destroy();
            resolve({ port, status, service: CONFIG.commonPorts[port] || 'unknown' });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, status: 'filtered', service: CONFIG.commonPorts[port] || 'unknown' });
        });
        
        socket.on('error', () => {
            resolve({ port, status: 'closed', service: CONFIG.commonPorts[port] || 'unknown' });
        });
        
        socket.connect(port, host);
    });
}

async function scanRange(host, start, end, timeout) {
    console.log(`🔍 Escaneando puertos ${start}-${end} en ${host}`);
    console.log('='.repeat(60));
    
    const results = [];
    let openCount = 0;
    let filteredCount = 0;
    const total = end - start + 1;
    let completed = 0;
    
    for (let p = start; p <= end; p++) {
        const result = await checkPort(host, p, timeout);
        results.push(result);
        completed++;
        
        if (result.status === 'open') openCount++;
        if (result.status === 'filtered') filteredCount++;
        
        const progress = Math.round((completed / total) * 100);
        process.stdout.write(`\r📊 Progreso: ${progress}% (${completed}/${total}) - Abiertos: ${openCount}`);
    }
    
    process.stdout.write('\n');
    return { results, openCount, filteredCount, total };
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Port Forwarding Checker - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        const host = await resolveTarget(target);
        console.log(`🎯 Objetivo: ${target} (${host})`);
        
        if (portRange) {
            // Escaneo de rango
            const result = await scanRange(host, portRange.start, portRange.end, timeout);
            
            console.log('\n📊 RESULTADOS:');
            console.log(`   🔓 Puertos abiertos: ${result.openCount}`);
            console.log(`   🔒 Puertos cerrados: ${result.total - result.openCount - result.filteredCount}`);
            console.log(`   🛡️ Puertos filtrados: ${result.filteredCount}`);
            
            if (result.openCount > 0) {
                console.log('\n📋 PUERTOS ABIERTOS:');
                result.results.filter(r => r.status === 'open').forEach(r => {
                    console.log(`   ✅ ${r.port} (${r.service})`);
                });
            }
            
        } else if (port) {
            // Verificación de puerto individual
            console.log(`📡 Verificando puerto: ${port} (${CONFIG.commonPorts[port] || 'Desconocido'})`);
            console.log('');
            
            const result = await checkPort(host, port, timeout);
            
            console.log('📊 RESULTADO:');
            const statusEmoji = result.status === 'open' ? '✅' : result.status === 'filtered' ? '⚠️' : '❌';
            console.log(`   ${statusEmoji} Puerto ${result.port}: ${result.status.toUpperCase()}`);
            console.log(`   Servicio: ${result.service}`);
            
            if (result.status === 'open') {
                console.log('\n💡 El puerto está abierto y aceptando conexiones.');
            } else if (result.status === 'filtered') {
                console.log('\n💡 El puerto está filtrado (firewall).');
            } else {
                console.log('\n💡 El puerto está cerrado o no hay servicio escuchando.');
            }
        } else {
            console.error('❌ No se especificó puerto o rango');
            process.exit(1);
        }
        
        console.log('\n✅ Port Forwarding Checker completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
