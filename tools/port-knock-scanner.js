#!/usr/bin/env node

/**
 * Port Knock Scanner - MFH TOOLS PRO
 * Escaneo de puertos con técnicas de "knock"
 * 
 * Uso: node port-knock-scanner.js <host> [opciones]
 * Ejemplo: node port-knock-scanner.js scanme.nmap.org
 * Ejemplo: node port-knock-scanner.js 192.168.1.1 --ports 1-1000
 * Ejemplo: node port-knock-scanner.js google.com --knock 22,80,443
 */

const net = require('net');
const dns = require('dns').promises;

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 2000,
    defaultPorts: [22, 80, 443, 8080, 3306, 5432, 6379],
    knockDelay: 100,
    commonPorts: {
        21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
        80: 'HTTP', 110: 'POP3', 111: 'RPC', 135: 'MSRPC', 139: 'NetBIOS',
        143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
        1723: 'PPTP', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
        5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Proxy', 27017: 'MongoDB'
    },
    knockPatterns: {
        'ssh': [22, 80, 443],
        'http': [80, 443, 8080],
        'mysql': [3306, 80, 443],
        'redis': [6379, 80, 443],
        'postgres': [5432, 80, 443]
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let host = null;
let ports = null;
let knockSequence = null;
let timeout = CONFIG.timeout;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Port Knock Scanner - MFH TOOLS PRO
=====================================
Escaneo de puertos con técnicas de "knock".

Uso:
  node port-knock-scanner.js <host> [opciones]

Opciones:
  --ports <rango>      Rango de puertos (ej: 1-1000, 22,80,443)
  --knock <puertos>    Secuencia de knock (ej: 22,80,443)
  --timeout <ms>       Timeout en milisegundos (default: 2000)
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node port-knock-scanner.js scanme.nmap.org
  node port-knock-scanner.js 192.168.1.1 --ports 1-1000
  node port-knock-scanner.js google.com --knock 22,80,443
`);
    process.exit(1);
}

host = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--ports' && args[i + 1]) {
        ports = args[i + 1];
        i++;
    } else if (args[i] === '--knock' && args[i + 1]) {
        knockSequence = args[i + 1].split(',').map(p => parseInt(p.trim()));
        i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
        timeout = parseInt(args[i + 1]) || CONFIG.timeout;
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
async function resolveHost(target) {
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

function parsePortRange(portStr) {
    const ports = new Set();
    const parts = portStr.split(',');
    
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                if (i > 0 && i <= 65535) ports.add(i);
            }
        } else {
            const port = Number(part);
            if (!isNaN(port) && port > 0 && port <= 65535) {
                ports.add(port);
            }
        }
    }
    
    return Array.from(ports).sort((a, b) => a - b);
}

function scanPort(host, port, timeout) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = 'closed';
        let service = null;
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            status = 'open';
            service = CONFIG.commonPorts[port] || 'unknown';
            socket.destroy();
            resolve({ port, status, service });
        });
        
        socket.on('timeout', () => {
            socket.destroy();
            resolve({ port, status: 'filtered', service: null });
        });
        
        socket.on('error', () => {
            resolve({ port, status: 'closed', service: null });
        });
        
        socket.connect(port, host);
    });
}

// ==================== FUNCION DE KNOCK (CORREGIDA) ====================
async function performKnock(host, sequence, timeout) {
    console.log(`🔑 Ejecutando secuencia de knock: ${sequence.join(', ')}`);
    console.log('='.repeat(60));
    
    const results = [];
    let consecutive = 0;
    
    for (const port of sequence) {
        const result = await scanPort(host, port, timeout);
        results.push(result);
        
        if (result.status === 'open') {
            consecutive++;
            console.log(`   ✅ Puerto ${port}: ${result.service || 'open'}`);
        } else {
            consecutive = 0;
            console.log(`   ❌ Puerto ${port}: ${result.status}`);
        }
        
        // Verificar si completó la secuencia
        if (consecutive === sequence.length) {
            console.log(`\n🎯 ¡Secuencia de knock completada! Todos los puertos abiertos.`);
        }
        
        // Pequeña pausa entre knocks
        await new Promise(r => setTimeout(r, CONFIG.knockDelay));
    }
    
    return results;
}

async function scanPortsList(host, portList, timeout) {
    console.log(`🔍 Escaneando ${host} - ${portList.length} puertos`);
    console.log('='.repeat(60));
    
    const results = [];
    let openCount = 0;
    let filteredCount = 0;
    let completed = 0;
    const total = portList.length;
    
    for (const port of portList) {
        const result = await scanPort(host, port, timeout);
        results.push(result);
        completed++;
        
        if (result.status === 'open') openCount++;
        if (result.status === 'filtered') filteredCount++;
        
        const progress = Math.round((completed / total) * 100);
        process.stdout.write(`\r📊 Progreso: ${progress}% (${completed}/${total}) - Abiertos: ${openCount}`);
        
        if (verbose && result.status === 'open') {
            console.log(`\n   ✅ Puerto ${port}: ${result.service || 'open'}`);
        }
    }
    
    process.stdout.write('\n');
    return { results, openCount, filteredCount, total };
}

function detectKnockPatterns(results) {
    const patterns = [];
    
    // Verificar patrones conocidos
    for (const [name, pattern] of Object.entries(CONFIG.knockPatterns)) {
        const patternResult = pattern.every(p => {
            const found = results.find(r => r.port === p && r.status === 'open');
            return found !== undefined;
        });
        if (patternResult) {
            patterns.push({ name, pattern });
        }
    }
    
    return patterns;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Port Knock Scanner - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        const ip = await resolveHost(host);
        console.log(`🎯 Objetivo: ${host} (${ip})`);
        console.log('');
        
        // Escaneo normal o knock
        if (knockSequence) {
            // Modo knock - CORREGIDO
            await performKnock(ip, knockSequence, timeout);
        } else {
            // Modo escaneo normal
            let portList;
            if (ports) {
                portList = parsePortRange(ports);
            } else {
                portList = CONFIG.defaultPorts;
            }
            
            const result = await scanPortsList(ip, portList, timeout);
            
            console.log('\n📊 RESULTADOS:');
            console.log(`   ✅ Puertos abiertos: ${result.openCount}`);
            console.log(`   🔒 Puertos cerrados: ${result.total - result.openCount - result.filteredCount}`);
            console.log(`   🛡️ Puertos filtrados: ${result.filteredCount}`);
            
            if (result.openCount > 0) {
                console.log('\n📋 PUERTOS ABIERTOS:');
                result.results.filter(r => r.status === 'open').forEach(r => {
                    console.log(`   ✅ ${r.port} (${r.service})`);
                });
                
                // Detectar patrones de knock
                const patterns = detectKnockPatterns(result.results.filter(r => r.status === 'open'));
                if (patterns.length > 0) {
                    console.log('\n🔑 PATRONES DE KNOCK DETECTADOS:');
                    patterns.forEach(p => {
                        console.log(`   🔹 ${p.name}: ${p.pattern.join(', ')}`);
                    });
                }
            }
            
            console.log('\n💡 Sugerencia: Usa --knock para probar una secuencia específica');
        }
        
        console.log('\n✅ Port Knock Scanner completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
