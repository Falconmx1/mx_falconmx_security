#!/usr/bin/env node
/**
 * MFH TOOLS - Host Information
 * Fase 1: Reconocimiento
 * 
 * Uso: node host-information.js --target <dominio.com|IP>
 * 
 * Autor: FalconMX Security
 * GitHub: https://github.com/Falconmx1/mx_falconmx_security
 */

'use strict';

const CONFIG = {
    version: '2.0.0',
    author: 'FalconMX Security',
    github: 'https://github.com/Falconmx1/mx_falconmx_security'
};

// ============================================================
// VALIDACIONES
// ============================================================
function isValidDomain(d) {
    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(d);
}

function isValidIP(ip) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
    return ip.split('.').every(n => {
        const x = parseInt(n, 10);
        return x >= 0 && x <= 255;
    });
}

// ============================================================
// ANÁLISIS
// ============================================================
/**
 * Lo que es: un validador de formato + un checklist heurístico de 5 regex +
 * un contador de puntos + un bloque de tips estático. No hace reconocimiento real.
 * No resuelve DNS, no hace WHOIS, no hace ping, no consulta APIs, no lee headers,
 * no obtiene certificados, no geolocaliza, no hace ASN. El nombre "Host Information"
 * promete mucho más de lo que entrega.
 */
function analyzeHost(target) {
    const clean = target.replace(/^https?:\/\//, '').split('/')[0];
    const isIP = isValidIP(clean);
    const isDomain = isValidDomain(clean);

    if (!isIP && !isDomain) {
        return { error: 'Target inválido. Debe ser un dominio o IP válida.' };
    }

    const analysis = [];
    analysis.push({
        check: 'Formato del target',
        result: isIP ? 'Dirección IP detectada' : 'Nombre de dominio detectado',
        status: 'success'
    });

    // Análisis de amenazas
    const suspicious = [];
    if (/\d{4,}/.test(clean)) suspicious.push('Contiene secuencia numérica larga (posible DGA)');
    if (/\.(xyz|top|club|work|click|loan|bid|tk|ml|ga|cf)$/.test(clean)) suspicious.push('TLD frecuentemente abusado');
    if (clean.length > 50) suspicious.push('Dominio excesivamente largo (posible phishing)');
    if (clean.includes('--')) suspicious.push('Contiene doble guion (posible IDN homograph)');
    if (/^[0-9]/.test(clean.split('.')[0])) suspicious.push('Empieza con número (posible DGA)');

    if (suspicious.length === 0) {
        analysis.push({
            check: 'Análisis de amenazas',
            result: '✅ Sin patrones sospechosos detectados',
            status: 'success'
        });
    } else {
        suspicious.forEach(s => {
            analysis.push({
                check: 'Análisis de amenazas',
                result: '⚠️ ' + s,
                status: 'warning'
            });
        });
    }

    // Longitud
    analysis.push({
        check: 'Longitud',
        result: clean.length + ' caracteres',
        status: clean.length > 50 ? 'warning' : 'success'
    });

    // Subdominios
    const parts = clean.split('.');
    if (parts.length > 3) {
        analysis.push({
            check: 'Subdominios',
            result: parts.length - 2 + ' niveles detectados',
            status: 'info'
        });
    }

    return {
        target: clean,
        type: isIP ? 'IP Address' : 'Domain/Hostname',
        timestamp: new Date().toISOString(),
        analysis
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
    console.log('  📋 HOST INFORMATION REPORT');
    console.log('  Target: ' + data.target);
    console.log('  Tipo: ' + data.type);
    console.log('  Fecha: ' + data.timestamp);
    console.log('═'.repeat(60));
    console.log('');

    data.analysis.forEach(item => {
        const icon = item.status === 'success' ? '✅' :
                     item.status === 'warning' ? '⚠️' : 'ℹ️';
        console.log('  ' + icon + ' ' + item.check + ': ' + item.result);
    });

    console.log('');
    console.log('─'.repeat(60));
    console.log('  🔧 HERRAMIENTAS AVANZADAS (requieren terminal)');
    console.log('─'.repeat(60));
    console.log('');
    console.log('  📦 SpiderFoot - Framework OSINT con 200+ módulos');
    console.log('     Instalación:');
    console.log('       pip install spiderfoot');
    console.log('     O con Docker (recomendado):');
    console.log('       docker pull spiderfoot/spiderfoot');
    console.log('       docker run -p 5001:5001 spiderfoot/spiderfoot');
    console.log('     Uso:');
    console.log('       spiderfoot -s ' + data.target + ' -t INTERNET_NAME,IP_ADDRESS -o json');
    console.log('');
    console.log('  📦 Metagoofil - Metadata de documentos públicos');
    console.log('     Instalación:');
    console.log('       pip install metagoofil');
    console.log('     Uso:');
    console.log('       metagoofil -d ' + data.target + ' -t pdf,doc,xls -l 100 -n 25 -o ./output');
    console.log('');
    console.log('  📦 theHarvester - Emails, subdominios, hosts');
    console.log('     Instalación:');
    console.log('       pip install theHarvester');
    console.log('     Uso:');
    console.log('       theHarvester -d ' + data.target + ' -b all');
    console.log('');
    console.log('─'.repeat(60));
    console.log('  💡 Consejo: Usa Docker para SpiderFoot y evita problemas');
    console.log('     de dependencias en Python.');
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
        console.log('║  MFH TOOLS — Host Information v' + CONFIG.version + '              ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node host-information.js --target <dominio.com|IP>');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node host-information.js --target google.com');
        console.log('    node host-information.js --target 8.8.8.8');
        console.log('');
        console.log('  GitHub: ' + CONFIG.github);
        console.log('');
        process.exit(0);
    }

    const target = args[targetIdx + 1];
    console.log('\n🔍 Analizando: ' + target + '\n');

    const data = analyzeHost(target);
    printReport(data);
}

main();
