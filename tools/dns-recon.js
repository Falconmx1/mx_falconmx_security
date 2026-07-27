#!/usr/bin/env node

/**
 * DNS Recon - MFH TOOLS PRO
 * Consulta registros DNS: A, AAAA, MX, NS, TXT, CNAME, SOA, SRV, CAA, SPF, DMARC
 * 
 * Uso: node dns-recon.js <dominio> [opciones]
 * Ejemplo: node dns-recon.js google.com
 * Ejemplo: node dns-recon.js ejemplo.com --type MX
 * Ejemplo: node dns-recon.js ejemplo.com --types A,MX,NS --output reporte.json
 */

const dns = require('dns').promises;
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    maxRetries: 2,
    types: {
        A: 'IPv4 Address',
        AAAA: 'IPv6 Address',
        MX: 'Mail Exchange',
        NS: 'Name Servers',
        TXT: 'Text Records',
        CNAME: 'Canonical Name',
        SOA: 'Start of Authority',
        SRV: 'Service Records',
        CAA: 'Certification Authority',
        SPF: 'Sender Policy Framework',
        DMARC: 'Domain-based Message Authentication'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let requestedTypes = null;
let outputFile = null;
let verbose = false;

function showHelp() {
    console.error(`
🔍 DNS Recon - MFH TOOLS PRO
=============================
Consulta registros DNS: A, AAAA, MX, NS, TXT, CNAME, SOA, SRV, CAA, SPF, DMARC

Uso:
  node dns-recon.js <dominio> [opciones]

Opciones:
  --types <tipos>      Tipos de registros separados por coma (ej: A,MX,NS)
  --output <archivo>   Guardar resultados en archivo JSON
  --verbose            Mostrar más detalles en la salida
  --help               Mostrar esta ayuda

Tipos disponibles:
  A, AAAA, MX, NS, TXT, CNAME, SOA, SRV, CAA, SPF, DMARC

Ejemplos:
  node dns-recon.js google.com
  node dns-recon.js google.com --types A,MX,NS
  node dns-recon.js ejemplo.com --types MX,TXT --output dns.json
  node dns-recon.js google.com --verbose
`);
    process.exit(0);
}

// Parsear argumentos
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--types' && args[i + 1]) {
        requestedTypes = args[i + 1].split(',').map(t => t.trim().toUpperCase());
        i++;
    } else if (arg === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (arg === '--verbose') {
        verbose = true;
    } else if (arg === '--help') {
        showHelp();
    } else if (!arg.startsWith('--')) {
        domain = arg;
    }
}

if (!domain) {
    showHelp();
}

// ==================== FUNCIONES DNS ====================
async function resolveWithRetry(resolver, domain, type) {
    for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
        try {
            const result = await resolver(domain);
            return result;
        } catch (error) {
            if (attempt === CONFIG.maxRetries || error.code === 'ENOTFOUND' || error.code === 'NXDOMAIN') {
                return null;
            }
            await new Promise(r => setTimeout(r, 200));
        }
    }
    return null;
}

async function queryDNS(domain, type) {
    const resolverMap = {
        'A': dns.resolve4,
        'AAAA': dns.resolve6,
        'MX': dns.resolveMx,
        'NS': dns.resolveNs,
        'TXT': dns.resolveTxt,
        'CNAME': dns.resolveCname,
        'SOA': dns.resolveSoa,
        'SRV': dns.resolveSrv,
        'CAA': dns.resolveCaa,
        'SPF': dns.resolveTxt, // SPF se consulta como TXT
        'DMARC': dns.resolveTxt // DMARC se consulta como TXT
    };
    
    const resolver = resolverMap[type];
    if (!resolver) {
        return { error: `Tipo de registro no soportado: ${type}` };
    }
    
    try {
        // Para SPF y DMARC, ajustamos el dominio
        let queryDomain = domain;
        if (type === 'SPF') {
            // SPF suele estar en el dominio principal o en _spf
            queryDomain = domain;
        } else if (type === 'DMARC') {
            queryDomain = `_dmarc.${domain}`;
        }
        
        const result = await resolveWithRetry(resolver, queryDomain);
        
        if (result === null) {
            return { type, records: [], error: 'No se encontraron registros' };
        }
        
        // Formatear resultados según tipo
        let formatted = [];
        if (type === 'MX') {
            formatted = result.map(r => ({ priority: r.priority, exchange: r.exchange }));
        } else if (type === 'SOA') {
            formatted = [{
                nsname: result.nsname,
                hostmaster: result.hostmaster,
                serial: result.serial,
                refresh: result.refresh,
                retry: result.retry,
                expire: result.expire,
                minttl: result.minttl
            }];
        } else if (type === 'SRV') {
            formatted = result.map(r => ({ priority: r.priority, weight: r.weight, port: r.port, name: r.name }));
        } else if (type === 'CAA') {
            formatted = result.map(r => ({ flags: r.flags, tag: r.tag, value: r.value }));
        } else if (type === 'TXT' || type === 'SPF' || type === 'DMARC') {
            formatted = result.map(r => r.join(''));
        } else {
            formatted = result;
        }
        
        return { type, records: formatted };
    } catch (error) {
        return { type, records: [], error: error.message };
    }
}

// ==================== DETECTAR SERVICIOS COMUNES ====================
function detectCommonServices(records) {
    const services = [];
    
    // HTTP/HTTPS
    if (records.A && records.A.some(r => r.includes('.'))) {
        services.push({ service: 'Web Server', port: '80/443', protocol: 'HTTP/HTTPS' });
    }
    
    // Mail
    if (records.MX && records.MX.length > 0) {
        services.push({ service: 'Mail Server', port: '25/587/993', protocol: 'SMTP/POP3/IMAP' });
    }
    
    // DNS
    if (records.NS && records.NS.length > 0) {
        services.push({ service: 'DNS Server', port: '53', protocol: 'DNS' });
    }
    
    // SPF
    if (records.SPF && records.SPF.length > 0) {
        services.push({ service: 'SPF Record', port: '-', protocol: 'Email Authentication' });
    }
    
    // DMARC
    if (records.DMARC && records.DMARC.length > 0) {
        services.push({ service: 'DMARC Record', port: '-', protocol: 'Email Authentication' });
    }
    
    return services;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 DNS Recon - ${domain}`);
        console.log('='.repeat(60));
        
        // Determinar tipos a consultar
        const allTypes = Object.keys(CONFIG.types);
        const types = requestedTypes || allTypes;
        
        console.log(`📡 Consultando registros DNS para: ${domain}`);
        console.log(`📋 Tipos solicitados: ${types.join(', ')}`);
        console.log('');
        
        // Consultar cada tipo
        const results = {};
        const errors = [];
        
        for (const type of types) {
            if (!CONFIG.types[type]) {
                console.warn(`⚠️ Tipo de registro no soportado: ${type}`);
                continue;
            }
            
            if (verbose) {
                console.log(`🔎 Consultando ${type}...`);
            }
            
            const result = await queryDNS(domain, type);
            
            if (result.error && result.error !== 'No se encontraron registros') {
                errors.push({ type, error: result.error });
            }
            
            // Para SPF, buscar también en el dominio principal si no se encuentra
            if (type === 'SPF' && (!result.records || result.records.length === 0)) {
                const fallback = await queryDNS(domain, 'TXT');
                const spfRecords = fallback.records.filter(r => typeof r === 'string' && r.includes('v=spf1'));
                if (spfRecords.length > 0) {
                    result.records = spfRecords;
                    result.type = 'SPF';
                }
            }
            
            results[type] = result;
        }
        
        // ==================== MOSTRAR RESULTADOS ====================
        console.log('📊 RESULTADOS DNS');
        console.log('='.repeat(60));
        
        // Información del dominio
        console.log(`\n📋 Dominio: ${domain}`);
        
        // Mostrar cada tipo
        let hasRecords = false;
        for (const type of types) {
            const result = results[type];
            if (!result) continue;
            
            const typeName = CONFIG.types[type] || type;
            console.log(`\n🔹 ${type} (${typeName}):`);
            
            if (result.error && result.error !== 'No se encontraron registros') {
                console.log(`   ❌ Error: ${result.error}`);
                continue;
            }
            
            if (!result.records || result.records.length === 0) {
                console.log(`   ⚠️ No se encontraron registros`);
                continue;
            }
            
            hasRecords = true;
            
            // Formatear salida según tipo
            if (type === 'MX') {
                result.records.sort((a, b) => a.priority - b.priority);
                console.log(`   Priority  Exchange`);
                console.log(`   ${'-'.repeat(30)}`);
                result.records.forEach(r => {
                    console.log(`   ${String(r.priority).padEnd(9)} ${r.exchange}`);
                });
            } else if (type === 'SOA') {
                const r = result.records[0];
                console.log(`   Primary NS: ${r.nsname}`);
                console.log(`   Hostmaster: ${r.hostmaster}`);
                console.log(`   Serial: ${r.serial}`);
                console.log(`   Refresh: ${r.refresh}s`);
                console.log(`   Retry: ${r.retry}s`);
                console.log(`   Expire: ${r.expire}s`);
                console.log(`   Min TTL: ${r.minttl}s`);
            } else if (type === 'SRV') {
                console.log(`   Priority  Weight   Port    Service`);
                console.log(`   ${'-'.repeat(40)}`);
                result.records.forEach(r => {
                    console.log(`   ${String(r.priority).padEnd(9)} ${String(r.weight).padEnd(8)} ${String(r.port).padEnd(7)} ${r.name}`);
                });
            } else if (type === 'CAA') {
                console.log(`   Flags  Tag    Value`);
                console.log(`   ${'-'.repeat(30)}`);
                result.records.forEach(r => {
                    console.log(`   ${String(r.flags).padEnd(6)} ${r.tag.padEnd(7)} ${r.value}`);
                });
            } else if (type === 'TXT' || type === 'SPF' || type === 'DMARC') {
                result.records.forEach(r => {
                    console.log(`   ${r}`);
                });
            } else if (type === 'A' || type === 'AAAA') {
                result.records.forEach(r => {
                    console.log(`   ${r}`);
                });
            } else {
                result.records.forEach(r => {
                    console.log(`   ${r}`);
                });
            }
        }
        
        // ==================== ANÁLISIS DE SERVICIOS ====================
        console.log('\n' + '='.repeat(60));
        console.log('🔍 ANÁLISIS DE SERVICIOS DETECTADOS');
        console.log('='.repeat(60));
        
        const services = detectCommonServices(results);
        if (services.length > 0) {
            console.log(`\n✅ Servicios detectados:`);
            services.forEach(s => {
                console.log(`   • ${s.service} (${s.port}) - ${s.protocol}`);
            });
        } else {
            console.log('\n⚠️ No se detectaron servicios comunes');
        }
        
        // ==================== RECOMENDACIONES DE SEGURIDAD ====================
        console.log('\n' + '='.repeat(60));
        console.log('🛡️ RECOMENDACIONES DE SEGURIDAD');
        console.log('='.repeat(60));
        
        const recommendations = [];
        
        // SPF
        if (!results.SPF || !results.SPF.records || results.SPF.records.length === 0) {
            recommendations.push('⚡ No se encontró registro SPF - Considera agregar uno para prevenir spoofing de email');
        }
        
        // DMARC
        if (!results.DMARC || !results.DMARC.records || results.DMARC.records.length === 0) {
            recommendations.push('⚡ No se encontró registro DMARC - Ayuda a prevenir phishing y spoofing');
        }
        
        // DNSSEC (no lo consultamos directamente, pero podemos sugerir)
        recommendations.push('💡 Considera implementar DNSSEC para proteger contra ataques de envenenamiento DNS');
        
        // TLS/SSL (sugerencia general)
        recommendations.push('💡 Asegura que todos los servicios expuestos usen TLS/SSL (HTTPS, SMTPS, etc.)');
        
        recommendations.forEach(r => {
            console.log(`   ${r}`);
        });
        
        // ==================== GUARDAR RESULTADOS ====================
        if (outputFile) {
            const exportData = {
                domain,
                timestamp: new Date().toISOString(),
                records: results,
                services: detectCommonServices(results),
                recommendations
            };
            fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
            console.log(`\n📁 Resultados guardados en: ${outputFile}`);
        }
        
        if (hasRecords) {
            console.log('\n✅ DNS Recon completado exitosamente');
        } else {
            console.log('\n⚠️ No se encontraron registros DNS para este dominio');
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
