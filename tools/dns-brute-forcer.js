#!/usr/bin/env node

/**
 * DNS Brute Forcer - MFH TOOLS PRO
 * Encuentra subdominios usando fuerza bruta con wordlists
 * 
 * Uso: node dns-brute-forcer.js <dominio> [opciones]
 * Ejemplo: node dns-brute-forcer.js google.com
 * Ejemplo: node dns-brute-forcer.js ejemplo.com --wordlist wordlist.txt
 * Ejemplo: node dns-brute-forcer.js ejemplo.com --threads 50 --output subs.txt
 */

const dns = require('dns').promises;
const fs = require('fs');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 3000,
    concurrency: 20,
    maxRetries: 2,
    defaultWordlist: [
        'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'webdisk',
        'ns2', 'cpanel', 'whm', 'autodiscover', 'autoconfig', 'm', 'imap', 'test', 'ns',
        'blog', 'pop3', 'dev', 'www2', 'admin', 'forum', 'news', 'vpn', 'ns3', 'mail2',
        'new', 'mysql', 'old', 'lists', 'support', 'mobile', 'mx', 'static', 'docs',
        'beta', 'shop', 'sql', 'secure', 'demo', 'cp', 'calendar', 'wiki', 'web',
        'media', 'email', 'images', 'img', 'video', 'downloads', 'dns', 'api',
        'app', 'apps', 'stage', 'staging', 'backup', 'files', 'cache', 'cdn',
        'cloud', 'monitor', 'monitoring', 'log', 'logs', 'info', 'portal', 'help',
        'remote', 'server', 'test2', 'test3', 'web1', 'web2', 'mail1', 'mail3',
        'ns4', 'ns5', 'mx1', 'mx2', 'pop3', 'imap', 'smtp', 'webmail', 'exchange',
        'owa', 'vpn', 'remote', 'rdp', 'ssh', 'sftp', 'ftp', 'sip', 'voip',
        'asterisk', 'pbx', 'phone', 'fax', 'print', 'printer', 'scanner', 'scan',
        'backup', 'storage', 'nas', 'san', 'iscsi', 'nfs', 'cifs', 'smb'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let domain = null;
let wordlist = CONFIG.defaultWordlist;
let threads = CONFIG.concurrency;
let outputFile = null;
let timeout = CONFIG.timeout;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 DNS Brute Forcer - MFH TOOLS PRO
====================================
Encuentra subdominios usando fuerza bruta con wordlists.

Uso:
  node dns-brute-forcer.js <dominio> [opciones]

Opciones:
  --wordlist <archivo>  Usar lista personalizada de subdominios
  --threads <n>         Número de hilos concurrentes (default: 20)
  --output <archivo>    Guardar resultados en archivo
  --timeout <ms>        Timeout en milisegundos (default: 3000)
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node dns-brute-forcer.js google.com
  node dns-brute-forcer.js ejemplo.com --wordlist mylist.txt
  node dns-brute-forcer.js ejemplo.com --threads 50 --output subs.txt
`);
    process.exit(1);
}

domain = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--wordlist' && args[i + 1]) {
        try {
            const content = fs.readFileSync(args[i + 1], 'utf8');
            wordlist = content.split('\n').filter(w => w.trim());
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
async function resolveSubdomain(subdomain, domain, retries = 0) {
    const hostname = `${subdomain}.${domain}`;
    try {
        const addresses = await dns.resolve4(hostname);
        return {
            subdomain: hostname,
            ips: addresses,
            resolved: true,
            type: 'A'
        };
    } catch (error) {
        if (error.code === 'ENOTFOUND' || error.code === 'NXDOMAIN') {
            return { subdomain: hostname, resolved: false };
        }
        if (retries < CONFIG.maxRetries) {
            await new Promise(r => setTimeout(r, 200));
            return resolveSubdomain(subdomain, domain, retries + 1);
        }
        return { subdomain: hostname, resolved: false };
    }
}

async function bruteForce(domain, wordlist, threads) {
    console.log(`🔍 DNS Brute Forcer - ${domain}`);
    console.log('='.repeat(60));
    console.log(`📋 Wordlist: ${wordlist.length} subdominios`);
    console.log(`🔄 Hilos: ${threads}`);
    console.log('');
    
    const results = [];
    let completed = 0;
    const total = wordlist.length;
    let found = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < wordlist.length; i += threads) {
        const batch = wordlist.slice(i, i + threads);
        const batchPromises = batch.map(sub => resolveSubdomain(sub, domain));
        const batchResults = await Promise.all(batchPromises);
        
        const resolved = batchResults.filter(r => r.resolved);
        results.push(...resolved);
        found += resolved.length;
        
        completed += batch.length;
        const progress = Math.round((completed / total) * 100);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        process.stdout.write(`\r📊 Progreso: ${progress}% (${completed}/${total}) - Encontrados: ${found} - Tiempo: ${elapsed}s`);
        
        if (verbose && resolved.length > 0) {
            resolved.forEach(r => {
                console.log(`\n   ✅ ${r.subdomain} → ${r.ips.join(', ')}`);
            });
        }
    }
    
    process.stdout.write('\n');
    return results;
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
            const ip = await dns.resolve4(domain);
            console.log(`✅ Dominio principal resuelto: ${domain} → ${ip[0]}`);
        } catch (error) {
            console.warn(`⚠️ No se pudo resolver el dominio principal: ${domain}`);
        }
        
        const results = await bruteForce(domain, wordlist, threads);
        const found = results.filter(r => r.resolved);
        const subdomains = found.map(r => r.subdomain);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESULTADOS');
        console.log('='.repeat(60));
        console.log(`🎯 Dominio: ${domain}`);
        console.log(`✅ Subdominios encontrados: ${subdomains.length}`);
        console.log(`⏱️ Tiempo: ${((Date.now() - startTime) / 1000).toFixed(2)} segundos`);
        
        if (subdomains.length > 0) {
            console.log('\n📋 LISTA DE SUBDOMINIOS:');
            subdomains.forEach((s, i) => {
                const ip = found.find(r => r.subdomain === s);
                console.log(`   ${String(i + 1).padStart(3)}. ${s}${ip ? ` → ${ip.ips.join(', ')}` : ''}`);
            });
        } else {
            console.log('\n❌ No se encontraron subdominios');
        }
        
        // Guardar resultados
        if (outputFile) {
            const output = outputFile || `dns_brute_${domain}_${Date.now()}.txt`;
            fs.writeFileSync(output, subdomains.join('\n'));
            console.log(`\n📁 Resultados guardados en: ${output}`);
        }
        
        console.log('\n✅ DNS Brute Forcer completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
