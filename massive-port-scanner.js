#!/usr/bin/env node

/**
 * Massive Port Scanner - MFH TOOLS PRO
 * Escanea hasta 10,000 puertos en paralelo usando workers
 * 
 * Uso: node massive-port-scanner.js <target> [puertos]
 * Ejemplo: node massive-port-scanner.js scanme.nmap.org 1-1000
 * Ejemplo: node massive-port-scanner.js 192.168.1.1 22,80,443,8080
 */

const net = require('net');
const dns = require('dns').promises;

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 2000,
    maxPorts: 10000,
    concurrency: 50,
    services: {
        21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
        80: 'HTTP', 110: 'POP3', 111: 'RPC', 135: 'MSRPC', 139: 'NetBIOS',
        143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 993: 'IMAPS', 995: 'POP3S',
        1723: 'PPTP', 3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
        5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Proxy', 27017: 'MongoDB'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error(`
🔍 Massive Port Scanner - MFH TOOLS PRO

Uso: node massive-port-scanner.js <target> [puertos]

Ejemplos:
  node massive-port-scanner.js scanme.nmap.org 1-1000
  node massive-port-scanner.js 192.168.1.1 22,80,443,8080
  node massive-port-scanner.js google.com 1-10000
`);
    process.exit(1);
}

const target = args[0];
const portStr = args[1] || '1-1000';

// ==================== PARSEAR PUERTOS ====================
function parsePorts(portStr) {
    const ports = new Set();
    const parts = portStr.split(',');
    
    for (const part of parts) {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            const maxPorts = Math.min(end - start + 1, CONFIG.maxPorts);
            for (let i = start; i < start + maxPorts; i++) {
                if (i <= 65535) ports.add(i);
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

// ==================== ESCANEAR PUERTO ====================
function scanPort(host, port, timeout = CONFIG.timeout) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let status = 'closed';
        let service = null;
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            status = 'open';
            service = CONFIG.services[port] || 'unknown';
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

// ==================== ESCANEAR CON WORKERS ====================
async function scanPorts(host, ports, concurrency = CONFIG.concurrency) {
    const results = [];
    let completed = 0;
    const total = ports.length;
    
    console.log(`🔍 Escaneando ${host} - ${total} puertos (concurrencia: ${concurrency})`);
    console.log('='.repeat(50));
    
    // Escaneo por lotes
    for (let i = 0; i < ports.length; i += concurrency) {
        const batch = ports.slice(i, i + concurrency);
        const batchPromises = batch.map(port => scanPort(host, port));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        completed += batch.length;
        const progress = Math.round((completed / total) * 100);
        process.stdout.write(`\r📊 Progreso: ${progress}% (${completed}/${total} puertos)`);
    }
    
    process.stdout.write('\n');
    return results;
}

// ==================== RESOLVER DOMINIO ====================
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

// ==================== MOSTRAR RESULTADOS ====================
function showResults(host, results) {
    const openPorts = results.filter(r => r.status === 'open');
    const filteredPorts = results.filter(r => r.status === 'filtered');
    
    console.log('\n' + '='.repeat(50));
    console.log(`📊 RESULTADOS PARA ${host}`);
    console.log('='.repeat(50));
    console.log(`✅ Puertos abiertos: ${openPorts.length}`);
    console.log(`🛡️ Puertos filtrados: ${filteredPorts.length}`);
    console.log(`🔒 Puertos cerrados: ${results.length - openPorts.length - filteredPorts.length}`);
    console.log('='.repeat(50));
    
    if (openPorts.length > 0) {
        console.log('\n📋 PUERTOS ABIERTOS:');
        console.log('   PORT     SERVICIO');
        console.log('   ' + '-'.repeat(25));
        openPorts.forEach(p => {
            console.log(`   ${String(p.port).padEnd(6)}  ${p.service || 'unknown'}`);
        });
    } else {
        console.log('\n❌ No se encontraron puertos abiertos');
    }
    
    // Guardar en archivo
    const fs = require('fs');
    const outputFile = `scan_${host}_${Date.now()}.json`;
    fs.writeFileSync(outputFile, JSON.stringify({ host, results }, null, 2));
    console.log(`\n📁 Resultados guardados en: ${outputFile}`);
}

// ==================== MAIN ====================
(async function main() {
    try {
        const startTime = Date.now();
        const host = await resolveTarget(target);
        const ports = parsePorts(portStr);
        
        if (ports.length === 0) {
            console.error('❌ No se especificaron puertos válidos');
            process.exit(1);
        }
        
        if (ports.length > CONFIG.maxPorts) {
            console.warn(`⚠️ Limitando a ${CONFIG.maxPorts} puertos (máximo permitido)`);
        }
        
        console.log(`🎯 Objetivo: ${target} (${host})`);
        console.log(`📡 Puertos a escanear: ${ports.length}`);
        console.log('');
        
        const results = await scanPorts(host, ports.slice(0, CONFIG.maxPorts));
        showResults(target, results);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️ Tiempo total: ${elapsed} segundos`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
