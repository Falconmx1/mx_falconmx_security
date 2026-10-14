#!/usr/bin/env node
/**
 * MFH TOOLS - DNS Information
 * Fase 1: Reconocimiento
 * 
 * Uso: node dns-information.js --target <dominio.com> [--type A|AAAA|MX|NS|TXT|CNAME|SOA|ALL]
 * 
 * Autor: FalconMX Security
 * GitHub: https://github.com/Falconmx1/mx_falconmx_security
 */

'use strict';

const dns = require('dns').promises;
const CONFIG = {
    version: '2.0.0',
    author: 'FalconMX Security'
};

// ============================================================
// VALIDACIONES
// ============================================================
function isValidDomain(d) {
    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(d);
}

// ============================================================
// CONSULTAS DNS
// ============================================================
async function queryDNS(domain, type) {
    const results = {};
    const errors = [];

    const queries = {
        A: () => dns.resolve4(domain),
        AAAA: () => dns.resolve6(domain),
        MX: () => dns.resolveMx(domain),
        NS: () => dns.resolveNs(domain),
        TXT: () => dns.resolveTxt(domain),
        CNAME: () => dns.resolveCname(domain),
        SOA: () => dns.resolveSoa(domain),
        PTR: () => dns.reverse(domain),
        SRV: () => dns.resolveSrv(domain),
        CAA: () => dns.resolveCaa(domain),
        NAPTR: () => dns.resolveNaptr(domain)
    };

    const typesToQuery = type === 'ALL' ? Object.keys(queries) : [type];

    for (const t of typesToQuery) {
        if (!queries[t]) {
            errors.push('Tipo desconocido: ' + t);
            continue;
        }
        try {
            const result = await queries[t]();
            if (result && (Array.isArray(result) ? result.length : true)) {
                results[t] = result;
            }
        } catch (e) {
            // Silencioso: muchos registros no existen, es normal
        }
    }

    return { results, errors };
}

// ============================================================
// REPORTE
// ============================================================
function printReport(domain, type, data) {
    console.log('');
    console.log('═'.repeat(60));
    console.log('  📡 DNS INFORMATION REPORT');
    console.log('  Dominio: ' + domain);
    console.log('  Tipo: ' + type);
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('═'.repeat(60));
    console.log('');

    if (Object.keys(data.results).length === 0) {
        console.log('  ⚠️ No se encontraron registros DNS para este tipo.');
        console.log('');
    } else {
        for (const [t, values] of Object.entries(data.results)) {
            console.log('  📋 Registros ' + t + ':');
            if (Array.isArray(values)) {
                values.forEach(v => {
                    if (Array.isArray(v)) {
                        console.log('     • ' + v.join(' '));
                    } else if (typeof v === 'object') {
                        console.log('     • ' + JSON.stringify(v));
                    } else {
                        console.log('     • ' + v);
                    }
                });
            } else if (typeof values === 'object') {
                console.log('     • ' + JSON.stringify(values, null, 2));
            } else {
                console.log('     • ' + values);
            }
            console.log('');
        }
    }

    if (data.errors.length) {
        console.log('  ⚠️ Advertencias:');
        data.errors.forEach(e => console.log('     • ' + e));
        console.log('');
    }

    console.log('─'.repeat(60));
    console.log('  🔧 HERRAMIENTAS AVANZADAS (requieren terminal)');
    console.log('─'.repeat(60));
    console.log('');
    console.log('  📦 dnsrecon - Enumeración DNS completa');
    console.log('     Instalación:');
    console.log('       pip install dnsrecon');
    console.log('     Uso:');
    console.log('       dnsrecon -d ' + domain + ' -t std');
    console.log('');
    console.log('  📦 dnsenum - Enumeración de subdominios');
    console.log('     Instalación:');
    console.log('       apt install dnsenum');
    console.log('     Uso:');
    console.log('       dnsenum ' + domain);
    console.log('');
    console.log('  📦 fierce - DNS recon agresivo');
    console.log('     Instalación:');
    console.log('       pip install fierce');
    console.log('     Uso:');
    console.log('       fierce --domain ' + domain);
    console.log('');
    console.log('  📦 dig - Consultas DNS manuales');
    console.log('     Uso:');
    console.log('       dig ' + domain + ' ANY');
    console.log('       dig ' + domain + ' MX');
    console.log('');
    console.log('  📦 nslookup - Consultas DNS cross-platform');
    console.log('     Uso:');
    console.log('       nslookup -type=MX ' + domain);
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
async function main() {
    const args = process.argv.slice(2);
    const targetIdx = args.indexOf('--target');
    const typeIdx = args.indexOf('--type');

    if (targetIdx === -1 || !args[targetIdx + 1]) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — DNS Information v' + CONFIG.version + '               ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node dns-information.js --target <dominio> [--type <tipo>]');
        console.log('');
        console.log('  Tipos: A, AAAA, MX, NS, TXT, CNAME, SOA, PTR, SRV, CAA, ALL');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node dns-information.js --target google.com');
        console.log('    node dns-information.js --target google.com --type MX');
        console.log('    node dns-information.js --target google.com --type ALL');
        console.log('');
        process.exit(0);
    }

    const target = args[targetIdx + 1].replace(/^https?:\/\//, '').split('/')[0];
    const type = typeIdx !== -1 ? args[typeIdx + 1].toUpperCase() : 'ALL';

    if (!isValidDomain(target)) {
        console.log('\n❌ Dominio inválido: ' + target + '\n');
        process.exit(1);
    }

    console.log('\n🔍 Consultando registros ' + type + ' para ' + target + '...\n');

    const data = await queryDNS(target, type);
    printReport(target, type, data);
}

main().catch(err => {
    console.error('\n❌ Error:', err.message, '\n');
    process.exit(1);
});
