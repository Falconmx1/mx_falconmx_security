#!/usr/bin/env node

/**
 * Subdomain Takeover Checker - MFH TOOLS PRO
 * Detecta subdominios vulnerables a takeover
 * 
 * Uso: node subdomain-takeover-checker.js [opciones]
 * Ejemplo: node subdomain-takeover-checker.js --domain ejemplo.com
 * Ejemplo: node subdomain-takeover-checker.js --list subdominios.txt
 * Ejemplo: node subdomain-takeover-checker.js --domain ejemplo.com --output report.json
 */

const dns = require('dns');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 5000,
    maxRedirects: 5,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

// ==================== FIRMAS DE TAKEOVER ====================
const TAKEOVER_SIGNATURES = [
    // GitHub Pages
    {
        service: 'GitHub Pages',
        cname: ['.github.io', '.github.com'],
        fingerprints: [
            'There isn\'t a GitHub Pages site here',
            'For root repositories',
            'Sorry, the page you are looking for does not exist'
        ]
    },
    // Heroku
    {
        service: 'Heroku',
        cname: ['.herokuapp.com'],
        fingerprints: [
            'No such app',
            'Heroku | No such app',
            'There\'s nothing here, yet'
        ]
    },
    // AWS S3
    {
        service: 'AWS S3',
        cname: ['.s3.amazonaws.com', '.s3-website'],
        fingerprints: [
            'The specified bucket does not exist',
            'NoSuchBucket',
            'AccessDenied'
        ]
    },
    // Azure
    {
        service: 'Azure',
        cname: ['.azurewebsites.net', '.cloudapp.net'],
        fingerprints: [
            '404 Web Site not found',
            'The resource you are looking for has been removed'
        ]
    },
    // Shopify
    {
        service: 'Shopify',
        cname: ['.myshopify.com'],
        fingerprints: [
            'Sorry, this shop is currently unavailable',
            'This store is unavailable'
        ]
    },
    // WordPress
    {
        service: 'WordPress',
        cname: ['.wordpress.com'],
        fingerprints: [
            'Do you want to register',
            'This site is no longer available'
        ]
    },
    // Netlify
    {
        service: 'Netlify',
        cname: ['.netlify.app', '.netlify.com'],
        fingerprints: [
            'Not Found',
            'Page not found',
            'The requested page was not found'
        ]
    },
    // Vercel
    {
        service: 'Vercel',
        cname: ['.vercel.app'],
        fingerprints: [
            'The deployment could not be found',
            '404: Not Found'
        ]
    },
    // Cloudflare
    {
        service: 'Cloudflare',
        cname: ['.cloudflare.com'],
        fingerprints: [
            'Cloudflare',
            'The page you are looking for does not exist'
        ]
    },
    // Fastly
    {
        service: 'Fastly',
        cname: ['.fastly.net'],
        fingerprints: [
            'Fastly error: unknown domain',
            'Please check that this domain has been configured'
        ]
    }
];

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let listFile = null;
let outputFile = null;
let verbose = false;
let showAll = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--domain':
        case '-d':
            domain = args[i + 1];
            i++;
            break;
        case '--list':
        case '-l':
            listFile = args[i + 1];
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--all':
        case '-a':
            showAll = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Subdomain Takeover Checker - MFH TOOLS PRO
==============================================
Detecta subdominios vulnerables a takeover.

Uso:
  node subdomain-takeover-checker.js [opciones]

Opciones:
  --domain, -d <dominio>   Dominio a escanear
  --list, -l <archivo>     Archivo con lista de subdominios
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --all, -a                Mostrar todos los resultados (incluyendo seguros)
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node subdomain-takeover-checker.js --domain ejemplo.com
  node subdomain-takeover-checker.js --list subdominios.txt
  node subdomain-takeover-checker.js --domain ejemplo.com --output report.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function resolveDNS(hostname, type = 'A') {
    return new Promise((resolve) => {
        const resolver = type === 'CNAME' ? dns.resolveCname : dns.resolve4;
        resolver(hostname, (err, addresses) => {
            if (err) {
                resolve([]);
            } else {
                resolve(addresses);
            }
        });
    });
}

function checkHttp(hostname, path = '/') {
    return new Promise((resolve) => {
        const options = {
            hostname,
            path,
            method: 'HEAD',
            timeout: CONFIG.timeout,
            headers: {
                'User-Agent': CONFIG.userAgent
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', () => {
            // Fallback a HTTP
            const httpOptions = { ...options, port: 80 };
            const httpReq = http.request(httpOptions, (res) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });
            httpReq.on('error', () => {
                resolve(null);
            });
            httpReq.end();
        });

        req.end();
    });
}

function checkTakeover(hostname, response) {
    if (!response) return null;

    const results = [];

    for (const signature of TAKEOVER_SIGNATURES) {
        // Verificar si el dominio apunta a este servicio
        let matches = false;
        for (const cname of signature.cname) {
            // Verificar en respuesta HTTP
            if (response.body && response.body.includes(cname.replace('.', ''))) {
                matches = true;
                break;
            }
            // Verificar en headers
            if (response.headers && response.headers.server) {
                if (response.headers.server.includes(cname.replace('.', ''))) {
                    matches = true;
                    break;
                }
            }
        }

        if (matches) {
            results.push({
                service: signature.service,
                confidence: 'high',
                fingerprint: 'HTTP response matched'
            });
            continue;
        }

        // Verificar por fingerprints
        for (const fingerprint of signature.fingerprints) {
            if (response.body && response.body.includes(fingerprint)) {
                results.push({
                    service: signature.service,
                    confidence: 'high',
                    fingerprint: fingerprint
                });
                break;
            }
        }
    }

    // Si no hay coincidencias pero el dominio no responde o da 404
    if (results.length === 0 && response.statusCode === 404) {
        results.push({
            service: 'Unknown',
            confidence: 'low',
            fingerprint: '404 Not Found - Possible takeover'
        });
    }

    return results;
}

async function scanSubdomain(subdomain, baseDomain = null) {
    const fullDomain = baseDomain ? `${subdomain}.${baseDomain}` : subdomain;

    if (verbose) {
        console.log(`🔍 Escaneando: ${fullDomain}`);
    }

    try {
        // 1. Resolver DNS
        const ipv4 = await resolveDNS(fullDomain, 'A');
        const cname = await resolveDNS(fullDomain, 'CNAME');

        if (ipv4.length === 0 && cname.length === 0) {
            return {
                domain: fullDomain,
                status: 'no_dns',
                message: 'No DNS records found',
                vulnerable: false
            };
        }

        // 2. Verificar HTTP/HTTPS
        const httpResponse = await checkHttp(fullDomain);

        if (!httpResponse) {
            return {
                domain: fullDomain,
                status: 'no_http',
                message: 'No HTTP response',
                dns: { ipv4, cname },
                vulnerable: false
            };
        }

        // 3. Verificar takeover
        const takeoverResults = checkTakeover(fullDomain, httpResponse);

        const vulnerable = takeoverResults && takeoverResults.length > 0;
        const result = {
            domain: fullDomain,
            status: vulnerable ? 'vulnerable' : 'safe',
            dns: { ipv4, cname },
            http: {
                statusCode: httpResponse.statusCode,
                headers: httpResponse.headers
            },
            takeover: takeoverResults || [],
            vulnerable
        };

        if (vulnerable) {
            result.message = `⚠️ POTENCIAL TAKEOVER: ${takeoverResults.map(t => t.service).join(', ')}`;
        } else {
            result.message = '✅ No vulnerable';
        }

        return result;

    } catch (error) {
        return {
            domain: fullDomain,
            status: 'error',
            message: error.message,
            vulnerable: false
        };
    }
}

async function scanDomains(domains) {
    const results = [];
    let processed = 0;
    const total = domains.length;

    for (const domain of domains) {
        const result = await scanSubdomain(domain);
        results.push(result);
        processed++;

        if (verbose || result.vulnerable) {
            console.log(`[${processed}/${total}] ${result.domain}: ${result.message}`);
        }

        // Pequeña pausa para no saturar
        await new Promise(r => setTimeout(r, 100));
    }

    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Subdomain Takeover Checker - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    let subdomains = [];

    // Cargar lista
    if (listFile) {
        try {
            const content = fs.readFileSync(listFile, 'utf8');
            subdomains = content.split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#'));
            console.log(`📋 Cargados ${subdomains.length} subdominios desde ${listFile}`);
        } catch (error) {
            console.error(`❌ Error cargando lista: ${error.message}`);
            process.exit(1);
        }
    } else if (domain) {
        // Lista común de subdominios
        const commonSubs = [
            'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'webdisk',
            'ns2', 'cpanel', 'whm', 'autodiscover', 'autoconfig', 'm', 'imap', 'test',
            'ns', 'blog', 'pop3', 'dev', 'www2', 'admin', 'forum', 'news', 'vpn', 'ns3',
            'mail2', 'new', 'mysql', 'old', 'lists', 'support', 'mobile', 'mx', 'static',
            'docs', 'beta', 'shop', 'sql', 'secure', 'demo', 'cp', 'calendar', 'wiki',
            'web', 'media', 'email', 'images', 'img', 'download', 'dns', 'piwik', 'stats',
            'dashboard', 'portal', 'manage', 'start', 'info', 'app', 'apps', 'api',
            'stage', 'staging', 'prod', 'production', 'qa', 'test', 'testing'
        ];
        subdomains = commonSubs;
        console.log(`📋 Usando lista común de ${subdomains.length} subdominios para: ${domain}`);
        console.log('💡 Para usar una lista personalizada: --list archivo.txt');
    } else {
        console.error('❌ Debes especificar --domain o --list');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    // Escanear
    console.log(`\n🚀 Iniciando escaneo de ${subdomains.length} subdominios...\n`);

    const results = await scanDomains(subdomains);

    // Resumen
    const vulnerable = results.filter(r => r.vulnerable);
    const errors = results.filter(r => r.status === 'error');
    const safe = results.filter(r => r.status === 'safe' || r.status === 'no_dns' || r.status === 'no_http');

    console.log('\n📊 RESUMEN:');
    console.log(`   ⚠️ Vulnerables: ${vulnerable.length}`);
    console.log(`   ✅ Seguros: ${safe.length}`);
    console.log(`   ❌ Errores: ${errors.length}`);
    console.log(`   📊 Total: ${results.length}`);

    // Mostrar vulnerables
    if (vulnerable.length > 0) {
        console.log('\n🔴 SUBDOMINIOS VULNERABLES A TAKEOVER:');
        for (const v of vulnerable) {
            console.log(`   ⚠️ ${v.domain}`);
            if (v.takeover) {
                for (const t of v.takeover) {
                    console.log(`      → ${t.service} (${t.confidence})`);
                }
            }
            if (v.http) {
                console.log(`      → Status: ${v.http.statusCode}`);
            }
        }
    } else {
        console.log('\n✅ No se encontraron subdominios vulnerables a takeover');
    }

    // Guardar resultados
    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            total: results.length,
            vulnerable: vulnerable.length,
            safe: safe.length,
            errors: errors.length,
            results: results
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Escaneo completado');
})();
