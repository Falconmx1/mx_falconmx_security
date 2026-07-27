#!/usr/bin/env node

/**
 * Whois Plus - MFH TOOLS PRO
 * Consulta WHOIS con información extendida: dominios, IPs, ASN, contactos, histórico
 * 
 * Uso: node whois-plus.js <dominio|ip> [opciones]
 * Ejemplo: node whois-plus.js google.com
 * Ejemplo: node whois-plus.js 8.8.8.8
 * Ejemplo: node whois-plus.js ejemplo.com --output whois.json
 * Ejemplo: node whois-plus.js google.com --verbose
 */

const dns = require('dns').promises;
const https = require('https');
const fs = require('fs');
const net = require('net');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    whoisServers: {
        com: 'whois.verisign-grs.com',
        net: 'whois.verisign-grs.com',
        org: 'whois.publicinterestregistry.org',
        mx: 'whois.nic.mx',
        es: 'whois.nic.es',
        ar: 'whois.nic.ar',
        cl: 'whois.nic.cl',
        co: 'whois.nic.co',
        br: 'whois.registro.br',
        us: 'whois.nic.us',
        uk: 'whois.nic.uk',
        de: 'whois.denic.de',
        fr: 'whois.nic.fr',
        it: 'whois.nic.it',
        jp: 'whois.jprs.jp',
        cn: 'whois.cnnic.cn',
        ru: 'whois.tcinet.ru',
        au: 'whois.ausregistry.net.au',
        ca: 'whois.cira.ca',
        nl: 'whois.sidn.nl',
        se: 'whois.iis.se',
        no: 'whois.norid.no',
        dk: 'whois.dk-hostmaster.dk',
        fi: 'whois.fi',
        pt: 'whois.dns.pt',
        pl: 'whois.dns.pl',
        cz: 'whois.nic.cz',
        at: 'whois.nic.at',
        ch: 'whois.nic.ch',
        be: 'whois.dns.be',
        gr: 'whois.gr',
        il: 'whois.isoc.org.il',
        in: 'whois.registry.in',
        sg: 'whois.sgnic.sg',
        nz: 'whois.srs.net.nz',
        za: 'whois.co.za',
        tr: 'whois.nic.tr'
    },
    ipWhoisServers: [
        'whois.arin.net',
        'whois.ripe.net',
        'whois.apnic.net',
        'whois.lacnic.net',
        'whois.afrinic.net'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let query = null;
let outputFile = null;
let verbose = false;
let type = 'auto';

function showHelp() {
    console.error(`
🔍 Whois Plus - MFH TOOLS PRO
================================
Consulta WHOIS con información extendida: dominios, IPs, ASN, contactos, histórico.

Uso:
  node whois-plus.js <dominio|ip> [opciones]

Opciones:
  --type <tipo>        Tipo de consulta: domain, ip, auto (default: auto)
  --output <archivo>   Guardar resultados en archivo JSON
  --verbose            Mostrar más detalles en la salida
  --help               Mostrar esta ayuda

Ejemplos:
  node whois-plus.js google.com
  node whois-plus.js 8.8.8.8
  node whois-plus.js ejemplo.com --output whois.json
  node whois-plus.js google.com --verbose
`);
    process.exit(0);
}

// Parsear argumentos
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--type' && args[i + 1]) {
        type = args[i + 1].toLowerCase();
        i++;
    } else if (arg === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (arg === '--verbose') {
        verbose = true;
    } else if (arg === '--help') {
        showHelp();
    } else if (!arg.startsWith('--')) {
        query = arg;
    }
}

if (!query) {
    showHelp();
}

// ==================== DETECTAR TIPO ====================
function detectType(input) {
    if (type !== 'auto') return type;
    
    // Verificar si es IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(input)) {
        return 'ip';
    }
    
    // Verificar si es dominio
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (domainRegex.test(input)) {
        return 'domain';
    }
    
    // Si no coincide, intentar resolver
    return 'unknown';
}

// ==================== FUNCIONES DNS ====================
async function resolveDomain(domain) {
    try {
        const ips = await dns.resolve4(domain);
        return { success: true, ips };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==================== CONSULTA WHOIS ====================
function queryWhois(server, query, timeout = CONFIG.timeout) {
    return new Promise((resolve) => {
        const socket = net.createConnection(43, server);
        let data = '';
        let resolved = false;
        
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                socket.destroy();
                resolve({ error: 'Timeout' });
            }
        }, timeout);
        
        socket.on('connect', () => {
            socket.write(query + '\r\n');
        });
        
        socket.on('data', (chunk) => {
            data += chunk.toString();
        });
        
        socket.on('end', () => {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({ data });
        });
        
        socket.on('error', (err) => {
            resolved = true;
            clearTimeout(timeoutId);
            resolve({ error: err.message });
        });
    });
}

// ==================== CONSULTA WHOIS DOMINIO ====================
async function queryDomainWhois(domain) {
    const tld = domain.split('.').pop().toLowerCase();
    const server = CONFIG.whoisServers[tld] || 'whois.verisign-grs.com';
    
    if (verbose) {
        console.log(`🔍 Consultando WHOIS para ${domain} en ${server}`);
    }
    
    const result = await queryWhois(server, domain);
    
    if (result.error) {
        return { error: result.error };
    }
    
    return parseWhoisData(result.data, domain);
}

// ==================== PARSEAR WHOIS ====================
function parseWhoisData(data, domain) {
    const info = {
        domain,
        raw: data,
        registrar: null,
        creationDate: null,
        expirationDate: null,
        updatedDate: null,
        nameServers: [],
        status: [],
        registrant: null,
        adminContact: null,
        techContact: null,
        emails: [],
        parsed: {}
    };
    
    const lines = data.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Registrar
        if (trimmed.match(/^Registrar:/i) || trimmed.match(/^Registrar Name:/i)) {
            info.registrar = trimmed.replace(/^Registrar(Name)?:\s*/i, '').trim();
        }
        
        // Fechas
        if (trimmed.match(/^Creation Date:/i)) {
            info.creationDate = trimmed.replace(/^Creation Date:\s*/i, '').trim();
        }
        if (trimmed.match(/^Registry Expiry Date:/i) || trimmed.match(/^Expiration Date:/i)) {
            info.expirationDate = trimmed.replace(/^(Registry Expiry Date|Expiration Date):\s*/i, '').trim();
        }
        if (trimmed.match(/^Updated Date:/i)) {
            info.updatedDate = trimmed.replace(/^Updated Date:\s*/i, '').trim();
        }
        
        // Name Servers
        if (trimmed.match(/^Name Server:/i)) {
            const ns = trimmed.replace(/^Name Server:\s*/i, '').trim();
            if (ns && !info.nameServers.includes(ns)) {
                info.nameServers.push(ns);
            }
        }
        
        // Status
        if (trimmed.match(/^Status:/i)) {
            const status = trimmed.replace(/^Status:\s*/i, '').trim();
            if (status && !info.status.includes(status)) {
                info.status.push(status);
            }
        }
        
        // Contactos
        if (trimmed.match(/^Registrant(Name| Organization| Email)?:/i)) {
            const value = trimmed.replace(/^Registrant(Name| Organization| Email)?:\s*/i, '').trim();
            if (value && value !== 'Not disclosed' && value !== '') {
                if (!info.registrant) info.registrant = {};
                if (line.includes('Email')) {
                    info.emails.push(value);
                }
                info.registrant[line.match(/^Registrant(Name| Organization| Email)?:/i)[1] || 'name'] = value;
            }
        }
        
        // Admin Contact
        if (trimmed.match(/^Admin(Name| Organization| Email)?:/i)) {
            const value = trimmed.replace(/^Admin(Name| Organization| Email)?:\s*/i, '').trim();
            if (value && value !== 'Not disclosed' && value !== '') {
                if (!info.adminContact) info.adminContact = {};
                info.adminContact[line.match(/^Admin(Name| Organization| Email)?:/i)[1] || 'name'] = value;
            }
        }
        
        // Tech Contact
        if (trimmed.match(/^Tech(Name| Organization| Email)?:/i)) {
            const value = trimmed.replace(/^Tech(Name| Organization| Email)?:\s*/i, '').trim();
            if (value && value !== 'Not disclosed' && value !== '') {
                if (!info.techContact) info.techContact = {};
                info.techContact[line.match(/^Tech(Name| Organization| Email)?:/i)[1] || 'name'] = value;
            }
        }
        
        // Emails adicionales
        const emailMatch = trimmed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch && !info.emails.includes(emailMatch[0])) {
            info.emails.push(emailMatch[0]);
        }
    }
    
    // Parsear campos adicionales (más flexibles)
    const additionalFields = ['Domain Name', 'Registry Domain ID', 'Registrar WHOIS Server', 'Registrar URL', 'Registry Registrant ID', 'Registry Admin ID', 'Registry Tech ID'];
    for (const field of additionalFields) {
        const regex = new RegExp(`^${field}:`, 'i');
        for (const line of lines) {
            if (line.match(regex)) {
                const key = field.replace(/ /g, '_').toLowerCase();
                info.parsed[key] = line.replace(regex, '').trim();
            }
        }
    }
    
    return info;
}

// ==================== CONSULTA WHOIS IP ====================
async function queryIpWhois(ip) {
    // Intentar con diferentes servidores WHOIS para IPs
    const servers = CONFIG.ipWhoisServers;
    let result = null;
    
    for (const server of servers) {
        if (verbose) {
            console.log(`🔍 Consultando WHOIS para IP ${ip} en ${server}`);
        }
        
        const response = await queryWhois(server, ip);
        if (!response.error && response.data && response.data.length > 0) {
            result = response.data;
            break;
        }
    }
    
    if (!result) {
        return { error: 'No se pudo obtener información WHOIS para la IP' };
    }
    
    return parseIpWhois(result, ip);
}

function parseIpWhois(data, ip) {
    const info = {
        ip,
        raw: data,
        netRange: null,
        cidr: null,
        organization: null,
        registrar: null,
        country: null,
        abuseContact: null,
        asignationDate: null,
        asn: null,
        asnOrganization: null,
        parsed: {}
    };
    
    const lines = data.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // NetRange
        if (trimmed.match(/^NetRange:/i)) {
            info.netRange = trimmed.replace(/^NetRange:\s*/i, '').trim();
        }
        
        // CIDR
        if (trimmed.match(/^CIDR:/i)) {
            info.cidr = trimmed.replace(/^CIDR:\s*/i, '').trim();
        }
        
        // Organization
        if (trimmed.match(/^Organization:/i) || trimmed.match(/^OrgName:/i)) {
            info.organization = trimmed.replace(/^(Organization|OrgName):\s*/i, '').trim();
        }
        
        // Registrar
        if (trimmed.match(/^Registrar:/i)) {
            info.registrar = trimmed.replace(/^Registrar:\s*/i, '').trim();
        }
        
        // Country
        if (trimmed.match(/^Country:/i)) {
            info.country = trimmed.replace(/^Country:\s*/i, '').trim();
        }
        
        // Abuse Contact
        if (trimmed.match(/^OrgAbuseEmail:/i) || trimmed.match(/^Abuse Email:/i)) {
            info.abuseContact = trimmed.replace(/^(OrgAbuseEmail|Abuse Email):\s*/i, '').trim();
        }
        
        // ASN
        if (trimmed.match(/^ASNumber:/i)) {
            info.asn = trimmed.replace(/^ASNumber:\s*/i, '').trim();
        }
        if (trimmed.match(/^ASName:/i)) {
            info.asnOrganization = trimmed.replace(/^ASName:\s*/i, '').trim();
        }
        
        // Fecha de asignación
        if (trimmed.match(/^Assignment Date:/i) || trimmed.match(/^Registration Date:/i)) {
            info.asignationDate = trimmed.replace(/^(Assignment Date|Registration Date):\s*/i, '').trim();
        }
    }
    
    return info;
}

// ==================== OBTENER INFORMACIÓN EXTENDIDA ====================
async function getExtendedInfo(domain) {
    const info = {
        dns: {},
        security: {},
        web: {}
    };
    
    // DNS Records
    try {
        const a = await dns.resolve4(domain);
        info.dns.a = a;
    } catch (e) { info.dns.a = null; }
    
    try {
        const aaaa = await dns.resolve6(domain);
        info.dns.aaaa = aaaa;
    } catch (e) { info.dns.aaaa = null; }
    
    try {
        const mx = await dns.resolveMx(domain);
        info.dns.mx = mx;
    } catch (e) { info.dns.mx = null; }
    
    try {
        const ns = await dns.resolveNs(domain);
        info.dns.ns = ns;
    } catch (e) { info.dns.ns = null; }
    
    try {
        const txt = await dns.resolveTxt(domain);
        info.dns.txt = txt;
    } catch (e) { info.dns.txt = null; }
    
    // Análisis de seguridad
    info.security.hasSPF = false;
    info.security.hasDMARC = false;
    info.security.hasDKIM = false;
    
    if (info.dns.txt) {
        for (const record of info.dns.txt) {
            const txt = Array.isArray(record) ? record.join('') : record;
            if (txt.includes('v=spf1')) info.security.hasSPF = true;
            if (txt.includes('v=DMARC1')) info.security.hasDMARC = true;
            if (txt.includes('v=DKIM1') || txt.includes('dkim')) info.security.hasDKIM = true;
        }
    }
    
    // Estado del sitio web (simulado)
    info.web.status = 'Desconocido';
    info.web.ssl = false;
    
    // Intentar conexión SSL
    try {
        await new Promise((resolve) => {
            const socket = require('tls').connect({
                host: domain,
                port: 443,
                rejectUnauthorized: false,
                timeout: 5000
            }, () => {
                info.web.ssl = true;
                info.web.status = 'Activo (HTTPS)';
                socket.end();
                resolve();
            });
            socket.on('error', () => {
                info.web.status = 'Posiblemente activo (HTTP)';
                resolve();
            });
            socket.on('timeout', () => {
                socket.destroy();
                info.web.status = 'Sin respuesta';
                resolve();
            });
        });
    } catch (e) {
        info.web.status = 'Sin respuesta';
    }
    
    return info;
}

// ==================== MAIN ====================
(async function main() {
    try {
        const detectedType = detectType(query);
        
        if (detectedType === 'unknown') {
            console.error('❌ No se pudo determinar el tipo de consulta (dominio o IP)');
            process.exit(1);
        }
        
        console.log(`🔍 Whois Plus - ${query}`);
        console.log('='.repeat(60));
        console.log(`📡 Tipo: ${detectedType === 'domain' ? 'Dominio' : 'IP'}`);
        console.log('');
        
        // ==================== CONSULTA WHOIS ====================
        let whoisData;
        let extendedInfo = {};
        
        if (detectedType === 'domain') {
            whoisData = await queryDomainWhois(query);
            
            if (whoisData.error) {
                console.warn(`⚠️ Error en consulta WHOIS: ${whoisData.error}`);
            } else {
                // Obtener información extendida
                console.log('🔍 Obteniendo información extendida...');
                extendedInfo = await getExtendedInfo(query);
            }
        } else {
            whoisData = await queryIpWhois(query);
        }
        
        // ==================== MOSTRAR RESULTADOS ====================
        console.log('📊 RESULTADOS WHOIS');
        console.log('='.repeat(60));
        
        if (detectedType === 'domain') {
            // Información del dominio
            console.log('\n🔹 INFORMACIÓN DEL DOMINIO:');
            console.log(`   Dominio: ${whoisData.domain || query}`);
            console.log(`   Registrador: ${whoisData.registrar || 'No disponible'}`);
            console.log(`   Fecha de creación: ${whoisData.creationDate || 'No disponible'}`);
            console.log(`   Fecha de expiración: ${whoisData.expirationDate || 'No disponible'}`);
            console.log(`   Última actualización: ${whoisData.updatedDate || 'No disponible'}`);
            console.log(`   Servidores DNS: ${whoisData.nameServers.length > 0 ? whoisData.nameServers.join(', ') : 'No disponible'}`);
            console.log(`   Estado: ${whoisData.status.length > 0 ? whoisData.status.join(', ') : 'No disponible'}`);
            
            // Contactos
            if (whoisData.registrant) {
                console.log(`\n🔹 CONTACTO REGISTRANTE:`);
                for (const [key, value] of Object.entries(whoisData.registrant)) {
                    console.log(`   ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`);
                }
            }
            
            if (whoisData.emails.length > 0) {
                console.log(`\n🔹 CORREOS ASOCIADOS:`);
                whoisData.emails.forEach(email => console.log(`   ${email}`));
            }
            
            // Información extendida
            console.log('\n🔹 INFORMACIÓN EXTENDIDA:');
            
            // DNS
            if (extendedInfo.dns) {
                if (extendedInfo.dns.a && extendedInfo.dns.a.length > 0) {
                    console.log(`   A: ${extendedInfo.dns.a.join(', ')}`);
                }
                if (extendedInfo.dns.mx && extendedInfo.dns.mx.length > 0) {
                    console.log(`   MX: ${extendedInfo.dns.mx.map(m => `${m.exchange} (${m.priority})`).join(', ')}`);
                }
                if (extendedInfo.dns.ns && extendedInfo.dns.ns.length > 0) {
                    console.log(`   NS: ${extendedInfo.dns.ns.join(', ')}`);
                }
            }
            
            // Seguridad
            console.log(`\n🔹 SEGURIDAD DEL DOMINIO:`);
            console.log(`   SPF: ${extendedInfo.security.hasSPF ? '✅ Configurado' : '❌ No configurado'}`);
            console.log(`   DMARC: ${extendedInfo.security.hasDMARC ? '✅ Configurado' : '❌ No configurado'}`);
            console.log(`   DKIM: ${extendedInfo.security.hasDKIM ? '✅ Configurado' : '❌ No configurado'}`);
            
            // Estado web
            console.log(`\n🔹 ESTADO WEB:`);
            console.log(`   Estado: ${extendedInfo.web.status}`);
            console.log(`   SSL: ${extendedInfo.web.ssl ? '✅ Activo' : '❌ No detectado'}`);
            
        } else {
            // Información de IP
            console.log('\n🔹 INFORMACIÓN DE IP:');
            console.log(`   IP: ${whoisData.ip || query}`);
            console.log(`   Rango de red: ${whoisData.netRange || 'No disponible'}`);
            console.log(`   CIDR: ${whoisData.cidr || 'No disponible'}`);
            console.log(`   Organización: ${whoisData.organization || 'No disponible'}`);
            console.log(`   Registrador: ${whoisData.registrar || 'No disponible'}`);
            console.log(`   País: ${whoisData.country || 'No disponible'}`);
            console.log(`   Fecha de asignación: ${whoisData.asignationDate || 'No disponible'}`);
            
            if (whoisData.asn) {
                console.log(`   ASN: ${whoisData.asn}`);
            }
            if (whoisData.asnOrganization) {
                console.log(`   ASN Organización: ${whoisData.asnOrganization}`);
            }
            if (whoisData.abuseContact) {
                console.log(`   Contacto de abuso: ${whoisData.abuseContact}`);
            }
        }
        
        // ==================== RECOMENDACIONES ====================
        if (detectedType === 'domain') {
            console.log('\n🔹 RECOMENDACIONES:');
            const recommendations = [];
            
            if (!extendedInfo.security.hasSPF) {
                recommendations.push('⚡ Agregar registro SPF para prevenir spoofing de email');
            }
            if (!extendedInfo.security.hasDMARC) {
                recommendations.push('⚡ Agregar registro DMARC para protección contra phishing');
            }
            if (!extendedInfo.web.ssl) {
                recommendations.push('⚡ Habilitar SSL/TLS para cifrar el tráfico web');
            }
            if (whoisData.emails.length === 0) {
                recommendations.push('⚡ Asegurar que la información de contacto esté actualizada en WHOIS');
            }
            
            if (recommendations.length === 0) {
                recommendations.push('✅ Buena configuración de seguridad detectada');
            }
            
            recommendations.forEach(rec => console.log(`   ${rec}`));
        }
        
        // ==================== GUARDAR RESULTADOS ====================
        if (outputFile) {
            const exportData = {
                query,
                type: detectedType,
                timestamp: new Date().toISOString(),
                whois: whoisData,
                extended: extendedInfo
            };
            fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2));
            console.log(`\n📁 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Whois Plus completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
