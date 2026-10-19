#!/usr/bin/env node
/**
 * MFH TOOLS - DNS Information
 * Fase 1: Reconocimiento
 * 
 * Uso: node dns-information.js --target <dominio> [--type <tipo>]
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

const TIPOS_VALIDOS = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA', 'PTR', 'SRV', 'CAA', 'ALL'];

// ============================================================
// VALIDACIONES
// ============================================================
function isValidDomain(d) {
    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(d);
}

// ============================================================
// ANÁLISIS
// ============================================================
/**
 * No valida DNSSEC.
 * No hace WHOIS.
 * No hace AXFR.
 * No hace reverse DNS de las IPs obtenidas.
 * No hace enumeración de subdominios.
 * No hace ping/traceroute.
 * Tips estáticos.
 *
 * Bugs funcionales conocidos:
 * - PTR listado pero inutilizable (validador rechaza IPs).
 * - SRV listado pero inutilizable (validador rechaza etiquetas con _).
 * - Exit code 0 en error.
 */
async function analyzeDNS(domain, tipo) {
    if (!isValidDomain(domain)) {
        return { error: 'Dominio inválido: ' + domain };
    }

    const type = (tipo || 'ALL').toUpperCase();
    const typeDisplay = type === '' ? '(vacío)' : type;
    const results = {};
    const warnings = [];

    if (!TIPOS_VALIDOS.includes(type)) {
        warnings.push('Tipo desconocido: ' + typeDisplay);
    }

    const queries = type === 'ALL'
        ? ['A', 'AAAA', 'MX', 'NS', 'TXT', 'SOA', 'CAA']
        : [type];

    for (const q of queries) {
        if (!TIPOS_VALIDOS.includes(q)) continue;
        try {
            if (q === 'A') results.A = await dns.resolve4(domain);
            else if (q === 'AAAA') results.AAAA = await dns.resolve6(domain);
            else if (q === 'MX') results.MX = await dns.resolveMx(domain);
            else if (q === 'NS') results.NS = await dns.resolveNs(domain);
            else if (q === 'TXT') results.TXT = await dns.resolveTxt(domain);
            else if (q === 'SOA') results.SOA = await dns.resolveSoa(domain);
            else if (q === 'CAA') results.CAA = await dns.resolveCaa(domain);
            else if (q === 'CNAME') results.CNAME = await dns.resolveCname(domain);
            else if (q === 'PTR') results.PTR = await dns.resolvePtr(domain);
            else if (q === 'SRV') results.SRV = await dns.resolveSrv(domain);
        } catch (e) {
            // Ignorar errores de registros inexistentes
        }
    }

    return {
        domain,
        type: typeDisplay,
        results,
        warnings,
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
    console.log('  📡 DNS INFORMATION REPORT');
    console.log('  Dominio: ' + data.domain);
    console.log('  Tipo: ' + data.type);
    console.log('  Fecha: ' + data.timestamp);
    console.log('═'.repeat(60));
    console.log('');

    const labels = {
        A: 'Registros A',
        AAAA: 'Registros AAAA',
        MX: 'Registros MX',
        NS: 'Registros NS',
        TXT: 'Registros TXT',
        SOA: 'Registros SOA',
        CAA: 'Registros CAA',
        CNAME: 'Registros CNAME',
        PTR: 'Registros PTR',
        SRV: 'Registros SRV'
    };

    let hayRegistros = false;
    for (const [key, val] of Object.entries(data.results)) {
        if (!val || (Array.isArray(val) && val.length === 0)) continue;
        hayRegistros = true;
        console.log('  📋 ' + (labels[key] || key) + ':');
        if (Array.isArray(val)) {
            val.forEach(v => {
                if (typeof v === 'object') console.log('     • ' + JSON.stringify(v));
                else console.log('     • ' + v);
            });
        } else if (typeof val === 'object') {
            console.log('     • ' + JSON.stringify(val, null, 2));
        } else {
            console.log('     • ' + val);
        }
        console.log('');
    }

    if (!hayRegistros) {
        console.log('  ⚠️ No se encontraron registros DNS para este tipo.');
        console.log('');
    }

    if (data.warnings.length) {
        console.log('  ⚠️ Advertencias:');
        data.warnings.forEach(w => console.log('     • ' + w));
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
    console.log('       dnsrecon -d ' + data.domain + ' -t std');
    console.log('');
    console.log('  📦 dnsenum - Enumeración de subdominios');
    console.log('     Instalación:');
    console.log('       apt install dnsenum');
    console.log('     Uso:');
    console.log('       dnsenum ' + data.domain);
    console.log('');
    console.log('  📦 fierce - DNS recon agresivo');
    console.log('     Instalación:');
    console.log('       pip install fierce');
    console.log('     Uso:');
    console.log('       fierce --domain ' + data.domain);
    console.log('');
    console.log('  📦 dig - Consultas DNS manuales');
    console.log('     Uso:');
    console.log('       dig ' + data.domain + ' ANY');
    console.log('       dig ' + data.domain + ' MX');
    console.log('');
    console.log('  📦 nslookup - Consultas DNS cross-platform');
    console.log('     Uso:');
    console.log('       nslookup -type=MX ' + data.domain);
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

    const domain = args[targetIdx + 1];
    const tipo = typeIdx !== -1 ? (args[typeIdx + 1] || '') : 'ALL';

    console.log('\n🔍 Consultando registros ' + (tipo || 'ALL').toUpperCase() + ' para ' + domain + '...\n');

    const data = await analyzeDNS(domain, tipo);
    printReport(data);
}

main().catch(e => {
    console.error('\n❌ Error: ' + e.message + '\n');
    process.exit(1);
});
