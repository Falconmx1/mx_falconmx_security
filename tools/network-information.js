#!/usr/bin/env node
/**
 * MFH TOOLS - Network Information
 * Fase 1: Reconocimiento
 * 
 * Uso: node network-information.js --target <IP>
 * 
 * Autor: FalconMX Security
 * GitHub: https://github.com/Falconmx1/mx_falconmx_security
 */

'use strict';

const CONFIG = {
    version: '2.0.0',
    author: 'FalconMX Security'
};

// ============================================================
// VALIDACIONES
// ============================================================
function isValidIP(ip) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
    return ip.split('.').every(n => {
        const x = parseInt(n, 10);
        return x >= 0 && x <= 255;
    });
}

function isValidCIDR(cidr) {
    const parts = cidr.split('/');
    if (parts.length !== 2) return false;
    if (!isValidIP(parts[0])) return false;
    const mask = parseInt(parts[1], 10);
    return mask >= 0 && mask <= 32;
}

// ============================================================
// ANÁLISIS
// ============================================================
/**
 * No hace ping.
 * No hace traceroute.
 * No resuelve PTR (DNS inverso).
 * No consulta ASN (8.8.8.8 es Google, no lo dice).
 * No geolocaliza.
 * No escanea puertos.
 * No consulta whois.
 * No valida si la IP está en los rangos que lista — solo imprime la lista fija.
 * No acepta dominios (a diferencia de Host Info).
 * No hace ninguna consulta de red.
 */
function analyzeNetwork(target) {
    let ip = target;
    let cidr = null;

    if (target.includes('/')) {
        if (!isValidCIDR(target)) {
            return { error: 'CIDR inválido. Formato: 192.168.1.0/24' };
        }
        cidr = parseInt(target.split('/')[1], 10);
        ip = target.split('/')[0];
    }

    if (!isValidIP(ip)) {
        return { error: 'IP inválida. Formato: 192.168.1.1' };
    }

    const parts = ip.split('.').map(n => parseInt(n, 10));

    // Clasificación
    const isPrivate = (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
        ip.startsWith('127.')
    );

    const isLoopback = ip.startsWith('127.');
    const isMulticast = parts[0] >= 224 && parts[0] <= 239;
    const isReserved = parts[0] >= 240;
    const isAPIPA = ip.startsWith('169.254.');

    let clase = 'Desconocida';
    if (parts[0] >= 1 && parts[0] <= 126) clase = 'A';
    else if (parts[0] === 127) clase = 'A (Loopback)';
    else if (parts[0] >= 128 && parts[0] <= 191) clase = 'B';
    else if (parts[0] >= 192 && parts[0] <= 223) clase = 'C';
    else if (parts[0] >= 224 && parts[0] <= 239) clase = 'D (Multicast)';
    else if (parts[0] >= 240) clase = 'E (Reservada)';

    // Cálculos
    const binary = parts.map(n => n.toString(2).padStart(8, '0')).join('.');
    const hex = parts.map(n => n.toString(16).padStart(2, '0')).join(':');
    const decimal = parts.reduce((acc, n, i) => acc + n * Math.pow(256, 3 - i), 0);

    // Máscara por defecto
    let defaultMask = '255.0.0.0';
    if (clase.startsWith('B')) defaultMask = '255.255.0.0';
    if (clase.startsWith('C')) defaultMask = '255.255.255.0';

    // Info CIDR
    let networkInfo = null;
    if (cidr !== null) {
        const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
        const maskParts = [
            (mask >>> 24) & 255,
            (mask >>> 16) & 255,
            (mask >>> 8) & 255,
            mask & 255
        ];
        const networkAddr = parts.map((p, i) => p & maskParts[i]);
        const broadcastAddr = parts.map((p, i) => p | (~maskParts[i] & 255));
        const totalHosts = Math.pow(2, 32 - cidr);
        const usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts;

        networkInfo = {
            cidr,
            mask: maskParts.join('.'),
            network: networkAddr.join('.'),
            broadcast: broadcastAddr.join('.'),
            totalHosts,
            usableHosts
        };
    }

    return {
        target,
        ip,
        cidr,
        parts,
        isPrivate,
        isLoopback,
        isMulticast,
        isReserved,
        isAPIPA,
        clase,
        binary,
        hex,
        decimal,
        defaultMask,
        networkInfo,
        timestamp: new Date().toISOString()
    };
}

// ============================================================
// REPORTE
// ============================================================
function printReport(data) {
    if (data.error) {
        console.log('\n❌ ' + data.error + '\n');
        return;
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('  🌐 NETWORK INFORMATION REPORT');
    console.log('  Target: ' + data.target);
    console.log('  Fecha: ' + data.timestamp);
    console.log('═'.repeat(60));
    console.log('');
    console.log('  🔢 Clasificación:');
    console.log('     • IP: ' + data.ip);
    console.log('     • Clase: ' + data.clase);
    console.log('     • Tipo: ' + (data.isPrivate ? '🔒 Privada (RFC 1918)' : '🌍 Pública'));
    if (data.isLoopback) console.log('     • ⚠️ Loopback (localhost)');
    if (data.isMulticast) console.log('     • ⚠️ Multicast');
    if (data.isReserved) console.log('     • ⚠️ Reservada (no asignable)');
    if (data.isAPIPA) console.log('     • ⚠️ APIPA (169.254.x.x)');
    console.log('');

    console.log('  💻 Representaciones:');
    console.log('     • Binario: ' + data.binary);
    console.log('     • Hex: ' + data.hex);
    console.log('     • Decimal: ' + data.decimal);
    console.log('     • Máscara por defecto: ' + data.defaultMask);
    console.log('');

    if (data.networkInfo) {
        console.log('  📡 Información de subred (CIDR /' + data.networkInfo.cidr + '):');
        console.log('     • Máscara: ' + data.networkInfo.mask);
        console.log('     • Dirección de red: ' + data.networkInfo.network);
        console.log('     • Broadcast: ' + data.networkInfo.broadcast);
        console.log('     • Total hosts: ' + data.networkInfo.totalHosts.toLocaleString());
        console.log('     • Hosts usables: ' + data.networkInfo.usableHosts.toLocaleString());
        console.log('');
    }

    console.log('  🔍 Rangos privados (RFC 1918):');
    console.log('     • 10.0.0.0/8       (16.7M hosts)');
    console.log('     • 172.16.0.0/12    (1M hosts)');
    console.log('     • 192.168.0.0/16   (65K hosts)');
    console.log('     • 127.0.0.0/8      (loopback)');
    console.log('');

    console.log('─'.repeat(60));
    console.log('  🔧 HERRAMIENTAS AVANZADAS (requieren terminal)');
    console.log('─'.repeat(60));
    console.log('');
    console.log('  📦 nmap - Escaneo de puertos y servicios');
    console.log('     Instalación:');
    console.log('       apt install nmap        (Linux)');
    console.log('       brew install nmap       (macOS)');
    console.log('     Uso:');
    console.log('       nmap -sV -p 1-1000 ' + data.ip);
    console.log('       nmap -sS -A ' + data.ip);
    console.log('');
    console.log('  📦 whois - Información del propietario');
    console.log('     Uso:');
    console.log('       whois ' + data.ip);
    console.log('');
    console.log('  📦 traceroute - Ruta de red');
    console.log('     Uso:');
    console.log('       traceroute ' + data.ip);
    console.log('');
    console.log('  📦 ping - Verificar conectividad');
    console.log('     Uso:');
    console.log('       ping ' + data.ip);
    console.log('');
    console.log('  📦 masscan - Escaneo masivo rápido');
    console.log('     Uso:');
    console.log('       masscan ' + data.ip + ' -p1-65535 --rate=1000');
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    const args = process.argv.slice(2);
    const targetIdx = args.indexOf('--target');

    if (targetIdx === -1 || !args[targetIdx + 1]) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Network Information v' + CONFIG.version + '           ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node network-information.js --target <IP|CIDR>');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node network-information.js --target 8.8.8.8');
        console.log('    node network-information.js --target 192.168.1.0/24');
        console.log('');
        process.exit(0);
    }

    const target = args[targetIdx + 1];
    console.log('\n🔍 Analizando red: ' + target + '\n');

    const data = analyzeNetwork(target);
    printReport(data);
}

main();
