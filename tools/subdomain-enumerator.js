#!/usr/bin/env node

/**
 * Subdomain Enumerator - MFH TOOLS PRO
 * Encuentra subdominios usando DNS brute-force + fuentes OSINT
 * 
 * Uso: node subdomain-enumerator.js <dominio> [opciones]
 * Ejemplo: node subdomain-enumerator.js google.com
 * Ejemplo: node subdomain-enumerator.js ejemplo.com --wordlist wordlist.txt
 * Ejemplo: node subdomain-enumerator.js ejemplo.com --threads 50 --output subs.txt
 */

const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const fs = require('fs');
const url = require('url');

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
        'backup', 'storage', 'nas', 'san', 'iscsi', 'nfs', 'cifs', 'smb',
        'ldap', 'radius', 'dns', 'ntp', 'syslog', 'snmp', 'mrtg', 'cacti',
        'nagios', 'zabbix', 'munin', 'ganglia', 'graylog', 'elk', 'kibana',
        'elasticsearch', 'logstash', 'jenkins', 'gitlab', 'github', 'bitbucket',
        'jira', 'confluence', 'wiki', 'redmine', 'trac', 'mantis', 'bugzilla',
        'wordpress', 'joomla', 'drupal', 'magento', 'prestashop', 'opencart',
        'oscommerce', 'zen-cart', 'woocommerce', 'shopify', 'bigcommerce',
        'moodle', 'blackboard', 'canvas', 'schoology', 'edmodo', 'lms',
        'webex', 'zoom', 'meet', 'teams', 'slack', 'discord', 'mattermost',
        'rocket', 'chat', 'talk', 'messenger', 'wire', 'signal', 'telegram',
        'api', 'rest', 'graphql', 'websocket', 'mqtt', 'amqp', 'kafka',
        'zookeeper', 'hadoop', 'spark', 'kafka', 'flink', 'storm', 'samza',
        'docker', 'k8s', 'kubernetes', 'openshift', 'rancher', 'nomad',
        'mesos', 'marathon', 'chronos', 'aurora', 'singularity', 'dcos',
        'mongodb', 'mysql', 'postgres', 'redis', 'elasticsearch', 'cassandra',
        'couchbase', 'couchdb', 'neo4j', 'arangodb', 'orientdb', 'influxdb',
        'prometheus', 'grafana', 'alertmanager', 'victoriametrics', 'thanos',
        'cortex', 'loki', 'tempo', 'phlare', 'pyroscope', 'parca', 'signoz',
        'uptime', 'status', 'health', 'ping', 'monitor', 'watchdog', 'heartbeat',
        'metrics', 'stats', 'statistics', 'analytics', 'reports', 'dashboard'
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
  --timeout <ms>        Timeout en milisegundos (default: 3000)
  --osint               Habilitar búsqueda OSINT adicional
  --verbose             Mostrar más detalles

Ejemplos:
  node subdomain-enumerator.js google.com
  node subdomain-enumerator.js ejemplo.com --wordlist mylist.txt
  node subdomain-enumerator.js ejemplo.com --threads 50 --output subs.txt
  node subdomain-enumerator.js ejemplo.com --osint
`);
    process.exit(1);
}

const domain = args[0];
let wordlist = CONFIG.defaultWordlist;
let threads = CONFIG.concurrency;
let outputFile = null;
let timeout = CONFIG.timeout;
let useOSINT = false;
let verbose = false;

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
    } else if (args[i] === '--osint') {
        useOSINT = true;
    } else if (args[i] === '--verbose') {
        verbose = true;
    }
}

// ==================== FUNCIONES DNS ====================
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
        // Error de servidor DNS, intentar de nuevo
        if (retries < CONFIG.maxRetries) {
            await new Promise(r => setTimeout(r, 200));
            return resolveSubdomain(subdomain, domain, retries + 1);
        }
        return { subdomain: hostname, resolved: false };
    }
}

// ==================== FUNCIONES OSINT ====================
async function fetchFromCRTSH(domain) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'crt.sh',
            path: `/3?q=%.${domain}&output=json`,
            timeout: 10000,
            headers: { 'User-Agent': 'MFH-Subdomain-Enumerator/1.0' }
        };
        
        const req = https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const subdomains = new Set();
                    if (Array.isArray(json)) {
                        json.forEach(item => {
                            const name = item.name_value || item.name || '';
                            if (name && name.includes(`.${domain}`)) {
                                // Limpiar wildcards
                                const clean = name.replace(/^\*\./, '');
                                if (clean.endsWith(`.${domain}`)) {
                                    subdomains.add(clean);
                                }
                            }
                        });
                    }
                    resolve(Array.from(subdomains));
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.on('timeout', () => {
            req.destroy();
            resolve([]);
        });
        req.end();
    });
}

async function fetchFromHackerTarget(domain) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.hackertarget.com',
            path: `/hostsearch/?q=${domain}`,
            timeout: 10000,
            headers: { 'User-Agent': 'MFH-Subdomain-Enumerator/1.0' }
        };
        
        const req = https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const subdomains = [];
                    const lines = data.split('\n');
                    for (const line of lines) {
                        const parts = line.split(',');
                        if (parts.length >= 1 && parts[0] && parts[0].includes(`.${domain}`)) {
                            subdomains.push(parts[0]);
                        }
                    }
                    resolve(subdomains);
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.on('timeout', () => {
            req.destroy();
            resolve([]);
        });
        req.end();
    });
}

async function fetchFromSecurityTrails(domain) {
    // SecurityTrails API requiere API key, pero intentamos con la API pública
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.securitytrails.com',
            path: `/v1/domain/${domain}/subdomains?children_only=false`,
            timeout: 8000,
            headers: {
                'User-Agent': 'MFH-Subdomain-Enumerator/1.0',
                'APIKEY': 'demo' // API key demo limitada
            }
        };
        
        const req = https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.subdomains && Array.isArray(json.subdomains)) {
                        resolve(json.subdomains.map(s => `${s}.${domain}`));
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    resolve([]);
                }
            });
        });
        req.on('error', () => resolve([]));
        req.on('timeout', () => {
            req.destroy();
            resolve([]);
        });
        req.end();
    });
}

// ==================== ENUMERAR ====================
async function enumerateSubdomains(domain, wordlist, threads) {
    console.log(`🔍 Enumerando subdominios para: ${domain}`);
    console.log(`📋 Wordlist: ${wordlist.length} subdominios`);
    console.log(`🔄 Hilos: ${threads}`);
    console.log('='.repeat(60));
    
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
            if (r.ips && r.ips.length > 0) {
                console.log(`\n   ✅ ${r.subdomain} → ${r.ips.join(', ')}`);
            }
        }
    }
    
    process.stdout.write('\n');
    return results;
}

// ==================== BUSCAR FUENTES OSINT ====================
async function searchOSINTSources(domain) {
    console.log('\n🌐 Buscando en fuentes OSINT...');
    const sources = [
        { name: 'crt.sh', func: fetchFromCRTSH },
        { name: 'HackerTarget', func: fetchFromHackerTarget },
        { name: 'SecurityTrails', func: fetchFromSecurityTrails }
    ];
    
    const allFound = [];
    
    for (const source of sources) {
        process.stdout.write(`   Consultando ${source.name}... `);
        try {
            const results = await source.func(domain);
            if (results.length > 0) {
                console.log(`✅ ${results.length} encontrados`);
                allFound.push(...results);
            } else {
                console.log(`❌ Ninguno encontrado`);
            }
        } catch (e) {
            console.log(`❌ Error`);
        }
    }
    
    return [...new Set(allFound)];
}

// ==================== MAIN ====================
(async function main() {
    try {
        // Validar dominio
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-.]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        if (!domainRegex.test(domain)) {
            console.error('❌ Dominio inválido');
            console.error('   Ejemplo: google.com');
            process.exit(1);
        }
        
        // Verificar dominio principal
        try {
            const ip = await dns.resolve4(domain);
            console.log(`✅ Dominio principal resuelto: ${domain} → ${ip[0]}`);
        } catch (error) {
            console.warn(`⚠️ No se pudo resolver el dominio principal: ${domain}`);
        }
        
        const startTime = Date.now();
        
        // Enumeración principal
        const results = await enumerateSubdomains(domain, wordlist, threads);
        
        // Resultados de DNS
        const dnsResults = results.filter(r => r.resolved);
        const dnsSubdomains = dnsResults.map(r => r.subdomain);
        
        // Buscar en fuentes OSINT
        let osintSubdomains = [];
        if (useOSINT) {
            osintSubdomains = await searchOSINTSources(domain);
        }
        
        // Combinar resultados
        const allResults = [...new Set([...dnsSubdomains, ...osintSubdomains])].sort();
        
        // Resumen
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE ENUMERACIÓN');
        console.log('='.repeat(60));
        console.log(`🎯 Dominio: ${domain}`);
        console.log(`✅ Subdominios encontrados: ${allResults.length}`);
        console.log(`   - DNS brute-force: ${dnsSubdomains.length}`);
        if (useOSINT) {
            console.log(`   - OSINT: ${osintSubdomains.length}`);
        }
        console.log(`⏱️ Tiempo: ${((Date.now() - startTime) / 1000).toFixed(2)} segundos`);
        
        if (allResults.length > 0) {
            console.log('\n📋 LISTA DE SUBDOMINIOS:');
            allResults.forEach((s, i) => {
                // Verificar si tiene IP
                const hasIP = results.find(r => r.subdomain === s && r.resolved);
                const indicator = hasIP ? '✅' : '❌';
                console.log(`   ${String(i + 1).padStart(3)}. ${indicator} ${s}`);
            });
        }
        
        // Guardar resultados
        const output = outputFile || `subdomains_${domain}_${Date.now()}.txt`;
        fs.writeFileSync(output, allResults.join('\n'));
        console.log(`\n📁 Resultados guardados en: ${output}`);
        
        // Guardar también en formato JSON con detalles
        const jsonOutput = output.replace('.txt', '.json');
        const jsonData = {
            domain,
            timestamp: new Date().toISOString(),
            total: allResults.length,
            subdomains: allResults,
            dnsResults: dnsResults.map(r => ({ subdomain: r.subdomain, ips: r.ips })),
            osintResults: osintSubdomains
        };
        fs.writeFileSync(jsonOutput, JSON.stringify(jsonData, null, 2));
        console.log(`📁 Resultados detallados guardados en: ${jsonOutput}`);
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
