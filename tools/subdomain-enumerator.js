#!/usr/bin/env node

/**
 * Subdomain Enumerator - MFH TOOLS PRO
 * Encuentra subdominios usando DNS brute-force y fuentes OSINT
 * 
 * Uso: node subdomain-enumerator.js <dominio>
 * Ejemplo: node subdomain-enumerator.js google.com
 * Ejemplo: node subdomain-enumerator.js ejemplo.com --wordlist wordlist.txt
 */

const dns = require('dns').promises;
const https = require('https');
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 3000,
    concurrency: 20,
    defaultWordlist: [
        'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'webdisk',
        'ns2', 'cpanel', 'whm', 'autodiscover', 'autoconfig', 'm', 'imap', 'test', 'ns',
        'blog', 'pop3', 'dev', 'www2', 'admin', 'forum', 'news', 'vpn', 'ns3', 'mail2',
        'new', 'mysql', 'old', 'lists', 'support', 'mobile', 'mx', 'static', 'docs',
        'beta', 'shop', 'sql', 'secure', 'demo', 'cp', 'calendar', 'wiki', 'web',
        'media', 'email', 'images', 'img', 'video', 'downloads', 'dns', 'api',
        'app', 'apps', 'stage', 'staging', 'backup', 'files', 'cache', 'cdn',
        'cloud', 'monitor', 'monitoring', 'log', 'logs', 'info', 'portal', 'help',
        'remote', 'server', 'test2', 'test3', 'web1', 'web2', 'mail1', 'mail3'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error(`
🔍 Subdomain Enumerator - MFH TOOLS PRO

Uso: node subdomain-enumerator.js <dominio> [opciones]

Opciones:
  --wordlist <archivo>  Usar lista personalizada de subdominios
  --threads <n>         Número de hilos concurrentes (default: 20)
  --output <archivo>    Guardar resultados en archivo

Ejemplos:
  node subdomain-enumerator.js google.com
  node subdomain-enumerator.js ejemplo.com --wordlist mylist.txt
  node subdomain-enumerator.js ejemplo.com --threads 50 --output subs.txt
`);
    process.exit(1);
}

const domain = args[0];
let wordlist = CONFIG.defaultWordlist;
let threads = CONFIG.concurrency;
let outputFile = null;

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--wordlist' && args[i + 1]) {
        try {
            wordlist = fs.readFileSync(args[i + 1], 'utf8').split('\n').filter(w => w.trim());
            i++;
        } catch (e) {
            console.error(`⚠️ No se pudo leer wordlist: ${args[i + 1]}`);
        }
    } else if (args[i] === '--threads' && args[i + 1]) {
        threads = parseInt(args[i + 1]) || CONFIG.concurrency;
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    }
}

// ==================== FUNCIONES DNS ====================
async function resolveSubdomain(subdomain, domain) {
    const hostname = `${subdomain}.${domain}`;
    try {
        const addresses = await dns.resolve4(hostname);
        return {
            subdomain: hostname,
            ips: addresses,
            resolved: true
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'NXDOMAIN') {
            return { subdomain: hostname, resolved: false };
        }
        // Error de servidor DNS, intentar de nuevo
        try {
            const addresses = await dns.resolve4(hostname);
            return {
                subdomain: hostname,
                ips: addresses,
                resolved: true
            };
        } catch (e2) {
            return { subdomain: hostname, resolved: false };
        }
    }
}

// ==================== ENUMERAR ====================
async function enumerateSubdomains(domain, wordlist, threads) {
    console.log(`🔍 Enumerando subdominios para: ${domain}`);
    console.log(`📋 Wordlist: ${wordlist.length} subdominios`);
    console.log(`🔄 Hilos: ${threads}`);
    console.log('='.repeat(50));
    
    const results = [];
    let completed = 0;
    const total = wordlist.length;
    
    // Procesar en lotes
    for (let i = 0; i < wordlist.length; i += threads) {
        const batch = wordlist.slice(i, i + threads);
        const batchPromises = batch.map(sub => resolveSubdomain(sub, domain));
        const batchResults = await Promise.all(batchPromises);
        
        const resolved = batchResults.filter(r => r.resolved);
        results.push(...resolved);
        
        completed += batch.length;
        const progress = Math.round((completed / total) * 100);
        process.stdout.write(`\r📊 Progreso: ${progress}% (${completed}/${total}) - Encontrados: ${results.length}`);
        
        // Mostrar resultados en tiempo real
        for (const r of resolved) {
            console.log(`\n   ✅ ${r.subdomain} → ${r.ips.join(', ')}`);
        }
    }
    
    process.stdout.write('\n');
    return results;
}

// ==================== BUSCAR FUENTES OSINT ====================
async function searchOSINTSources(domain) {
    console.log('\n🌐 Buscando en fuentes OSINT...');
    const sources = [
        `https://crt.sh/?q=%.${domain}&output=json`,
        `https://api.hackertarget.com/hostsearch/?q=${domain}`
    ];
    
    const found = [];
    
    for (const source of sources) {
        try {
            const response = await new Promise((resolve) => {
                https.get(source, { timeout: 5000 }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve(data));
                }).on('error', () => resolve(null));
            });
            
            if (response) {
                try {
                    const json = JSON.parse(response);
                    if (Array.isArray(json)) {
                        json.forEach(item => {
                            const name = item.name_value || item.name || '';
                            if (name.includes(`.${domain}`)) {
                                found.push(name);
                            }
                        });
                    }
                } catch (e) {
                    // No es JSON, buscar texto plano
                    const matches = response.match(/[a-zA-Z0-9_-]+\.${domain}/g);
                    if (matches) found.push(...matches);
                }
            }
        } catch (e) {
            // Silencioso
        }
    }
    
    return [...new Set(found)];
}

// ==================== MAIN ====================
(async function main() {
    try {
        // Validar dominio
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domain)) {
            console.error('❌ Dominio inválido');
            process.exit(1);
        }
        
        // Verificar dominio principal
        try {
            await dns.resolve4(domain);
            console.log(`✅ Dominio principal resuelto: ${domain}`);
        } catch (error) {
            console.warn(`⚠️ No se pudo resolver el dominio principal: ${domain}`);
        }
        
        const startTime = Date.now();
        
        // Enumeración principal
        const results = await enumerateSubdomains(domain, wordlist, threads);
        
        // Buscar en fuentes OSINT
        const osintResults = await searchOSINTSources(domain);
        if (osintResults.length > 0) {
            console.log('\n🌐 Subdominios encontrados en OSINT:');
            osintResults.forEach(s => console.log(`   ✅ ${s}`));
        }
        
        // Combinar resultados
        const allResults = [...new Set([
            ...results.map(r => r.subdomain),
            ...osintResults
        ])];
        
        // Resumen
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN DE ENUMERACIÓN');
        console.log('='.repeat(50));
        console.log(`🎯 Dominio: ${domain}`);
        console.log(`✅ Subdominios encontrados: ${allResults.length}`);
        console.log(`   - DNS brute-force: ${results.length}`);
        console.log(`   - OSINT: ${osintResults.length}`);
        console.log(`⏱️ Tiempo: ${((Date.now() - startTime) / 1000).toFixed(2)} segundos`);
        
        if (allResults.length > 0) {
            console.log('\n📋 LISTA DE SUBDOMINIOS:');
            allResults.sort().forEach((s, i) => {
                console.log(`   ${String(i + 1).padStart(3)}. ${s}`);
            });
        }
        
        // Guardar resultados
        const output = outputFile || `subdomains_${domain}_${Date.now()}.txt`;
        fs.writeFileSync(output, allResults.join('\n'));
        console.log(`\n📁 Resultados guardados en: ${output}`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
