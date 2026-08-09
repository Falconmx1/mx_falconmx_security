#!/usr/bin/env node

/**
 * GitHub Secrets Scanner - MFH TOOLS PRO
 * Busca secretos expuestos en repositorios públicos de GitHub
 * 
 * Uso: node github-secrets-scanner.js [opciones]
 * Ejemplo: node github-secrets-scanner.js --repo usuario/repo
 * Ejemplo: node github-secrets-scanner.js --user usuario
 * Ejemplo: node github-secrets-scanner.js --repo usuario/repo --token GITHUB_TOKEN
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    githubApiBase: 'https://api.github.com',
    userAgent: 'MFH-GitHub-Secrets-Scanner/1.0',
    timeout: 30000,
    maxResults: 100
};

// ==================== PATRONES PARA SECRETOS ====================
const SECRET_PATTERNS = [
    // AWS
    { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key ID', severity: 'HIGH' },
    { pattern: /[0-9a-zA-Z/+]{40}/, name: 'AWS Secret Access Key', severity: 'HIGH' },
    // GitHub
    { pattern: /ghp_[0-9a-zA-Z]{36}/, name: 'GitHub Personal Access Token', severity: 'HIGH' },
    { pattern: /gho_[0-9a-zA-Z]{36}/, name: 'GitHub OAuth Token', severity: 'HIGH' },
    { pattern: /ghu_[0-9a-zA-Z]{36}/, name: 'GitHub User Token', severity: 'HIGH' },
    { pattern: /ghs_[0-9a-zA-Z]{36}/, name: 'GitHub Server Token', severity: 'HIGH' },
    // Google
    { pattern: /AIza[0-9A-Za-z\-_]{35}/, name: 'Google API Key', severity: 'HIGH' },
    // Slack
    { pattern: /xox[baprs]-[0-9a-zA-Z]{10,}/, name: 'Slack Token', severity: 'MEDIUM' },
    // Stripe
    { pattern: /sk_live_[0-9a-zA-Z]{24}/, name: 'Stripe Secret Key', severity: 'HIGH' },
    { pattern: /pk_live_[0-9a-zA-Z]{24}/, name: 'Stripe Publishable Key', severity: 'MEDIUM' },
    // JWT
    { pattern: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[0-9a-zA-Z\-_]+\.[0-9a-zA-Z\-_]+/, name: 'JWT Token', severity: 'MEDIUM' },
    // Private keys
    { pattern: /-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----/, name: 'Private Key', severity: 'CRITICAL' },
    // Database
    { pattern: /(mongodb|mysql|postgresql):\/\/[^\s]+/, name: 'Database Connection String', severity: 'HIGH' },
    // API Keys
    { pattern: /api[-_]?key['"]?\s*[:=]\s*['"][0-9a-zA-Z\-_]+['"]/, name: 'API Key', severity: 'MEDIUM' },
    // Password
    { pattern: /password['"]?\s*[:=]\s*['"][^'"]+['"]/, name: 'Password in Code', severity: 'HIGH' },
    // Token
    { pattern: /token['"]?\s*[:=]\s*['"][0-9a-zA-Z\-_]+['"]/, name: 'Token in Code', severity: 'HIGH' },
    // Secret
    { pattern: /secret['"]?\s*[:=]\s*['"][0-9a-zA-Z\-_]+['"]/, name: 'Secret in Code', severity: 'HIGH' },
    // Bearer token
    { pattern: /Authorization['"]?\s*[:=]\s*['"]Bearer [0-9a-zA-Z\-_]+['"]/, name: 'Bearer Token', severity: 'HIGH' }
];

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let repo = null;
let user = null;
let token = null;
let outputFile = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--repo':
        case '-r':
            repo = args[i + 1];
            i++;
            break;
        case '--user':
        case '-u':
            user = args[i + 1];
            i++;
            break;
        case '--token':
        case '-t':
            token = args[i + 1];
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
        case '--help':
        case '-h':
            console.log(`
🔍 GitHub Secrets Scanner - MFH TOOLS PRO
==========================================
Busca secretos expuestos en repositorios públicos de GitHub.

Uso:
  node github-secrets-scanner.js [opciones]

Opciones:
  --repo, -r <repo>        Repositorio (usuario/repo)
  --user, -u <usuario>     Usuario de GitHub
  --token, -t <token>      Token de GitHub (para más requests)
  --output, -o <archivo>   Guardar resultados en JSON
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node github-secrets-scanner.js --repo usuario/repo
  node github-secrets-scanner.js --user usuario
  node github-secrets-scanner.js --repo usuario/repo --token GITHUB_TOKEN
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function makeRequest(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': CONFIG.userAgent,
                'Accept': 'application/vnd.github.v3+json',
                ...headers
            },
            timeout: CONFIG.timeout
        };

        if (token) {
            options.headers['Authorization'] = `token ${token}`;
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

async function getRepositories(user) {
    const repos = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
        const url = `${CONFIG.githubApiBase}/users/${user}/repos?page=${page}&per_page=100`;
        const data = await makeRequest(url);
        
        if (Array.isArray(data)) {
            repos.push(...data);
            hasMore = data.length === 100;
            page++;
        } else {
            hasMore = false;
        }
    }

    return repos;
}

async function getRepoFiles(repo) {
    const files = [];
    const url = `${CONFIG.githubApiBase}/repos/${repo}/contents`;
    const data = await makeRequest(url);

    if (Array.isArray(data)) {
        for (const item of data) {
            if (item.type === 'file') {
                files.push(item);
            }
        }
    }

    return files;
}

async function getFileContent(repo, path) {
    try {
        const url = `${CONFIG.githubApiBase}/repos/${repo}/contents/${path}`;
        const data = await makeRequest(url);
        if (data.content) {
            return Buffer.from(data.content, 'base64').toString('utf8');
        }
    } catch (error) {
        // Ignorar errores de archivos
    }
    return null;
}

function scanContent(content, filename) {
    const findings = [];

    for (const rule of SECRET_PATTERNS) {
        const matches = content.matchAll(rule.pattern);
        for (const match of matches) {
            findings.push({
                file: filename,
                pattern: rule.name,
                severity: rule.severity,
                match: match[0].substring(0, 50) + (match[0].length > 50 ? '...' : ''),
                line: getLineNumber(content, match.index)
            });
        }
    }

    return findings;
}

function getLineNumber(content, index) {
    if (!content) return 'unknown';
    const lines = content.substring(0, index).split('\n');
    return lines.length;
}

async function scanRepository(repo) {
    console.log(`🔍 Escaneando repositorio: ${repo}`);
    
    try {
        const files = await getRepoFiles(repo);
        console.log(`📋 Archivos encontrados: ${files.length}`);

        const allFindings = [];
        let processed = 0;

        for (const file of files) {
            processed++;
            if (verbose) {
                console.log(`   Procesando: ${file.path} (${processed}/${files.length})`);
            }

            // Solo procesar archivos de texto
            const textExtensions = ['.js', '.json', '.txt', '.md', '.yml', '.yaml', '.xml', '.html', '.css', '.py', '.rb', '.go', '.java', '.c', '.cpp', '.h', '.sh', '.bash'];
            const ext = path.extname(file.path).toLowerCase();
            if (!textExtensions.includes(ext)) continue;

            const content = await getFileContent(repo, file.path);
            if (content) {
                const findings = scanContent(content, file.path);
                allFindings.push(...findings);
            }
        }

        return {
            repo,
            findings: allFindings,
            totalFiles: files.length
        };

    } catch (error) {
        return {
            repo,
            error: error.message,
            findings: []
        };
    }
}

function formatResults(results) {
    let output = '';
    output += `🔍 GitHub Secrets Scanner - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';

    const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);
    const reposWithErrors = results.filter(r => r.error).length;

    output += `📊 RESUMEN:\n`;
    output += `   📦 Repositorios escaneados: ${results.length}\n`;
    output += `   🔴 Secretos encontrados: ${totalFindings}\n`;
    output += `   ❌ Errores: ${reposWithErrors}\n\n`;

    // Agrupar por severidad
    const severityCount = {};
    for (const result of results) {
        for (const finding of result.findings) {
            severityCount[finding.severity] = (severityCount[finding.severity] || 0) + 1;
        }
    }

    if (Object.keys(severityCount).length > 0) {
        output += `📊 POR SEVERIDAD:\n`;
        for (const [severity, count] of Object.entries(severityCount)) {
            const emoji = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : severity === 'MEDIUM' ? '🟡' : '🟢';
            output += `   ${emoji} ${severity}: ${count}\n`;
        }
        output += '\n';
    }

    // Mostrar hallazgos
    if (totalFindings > 0) {
        output += `🔴 SECRETOS ENCONTRADOS:\n`;
        for (const result of results) {
            if (result.findings.length === 0) continue;
            output += `\n📁 ${result.repo}:\n`;
            for (const finding of result.findings) {
                const emoji = finding.severity === 'CRITICAL' ? '🔴' : finding.severity === 'HIGH' ? '🟠' : '🟡';
                output += `   ${emoji} [${finding.severity}] ${finding.pattern}\n`;
                output += `      📄 Archivo: ${finding.file}\n`;
                output += `      📍 Línea: ${finding.line}\n`;
                output += `      🔑 Coincidencia: ${finding.match}\n`;
            }
        }
        output += '\n';
    }

    // Recomendaciones
    if (totalFindings > 0) {
        output += `💡 RECOMENDACIONES:\n`;
        output += `   • Revocar los secretos encontrados inmediatamente\n`;
        output += `   • Eliminar los secretos del historial del repositorio\n`;
        output += `   • Usar GitHub Secrets o variables de entorno\n`;
        output += `   • Implementar un pre-commit hook para detectar secretos\n`;
    }

    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 GitHub Secrets Scanner - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    const reposToScan = [];

    if (repo) {
        reposToScan.push(repo);
    } else if (user) {
        console.log(`📋 Obteniendo repositorios de: ${user}`);
        const repos = await getRepositories(user);
        reposToScan.push(...repos.map(r => r.full_name));
        console.log(`✅ ${reposToScan.length} repositorios encontrados`);
    } else {
        console.error('❌ Debes especificar --repo o --user');
        console.log('   Usa --help para ver las opciones');
        process.exit(1);
    }

    if (token) {
        console.log(`🔑 Token de GitHub configurado`);
    }

    console.log(`\n🚀 Iniciando escaneo de ${reposToScan.length} repositorios...\n`);

    const results = [];
    let processed = 0;

    for (const repo of reposToScan) {
        const result = await scanRepository(repo);
        results.push(result);
        processed++;

        if (result.findings.length > 0) {
            console.log(`⚠️ ${result.findings.length} secretos encontrados en ${repo}`);
        } else if (verbose) {
            console.log(`✅ No se encontraron secretos en ${repo}`);
        }
    }

    // Mostrar resumen
    console.log(formatResults(results));

    // Guardar resultados
    if (outputFile) {
        const output = {
            timestamp: new Date().toISOString(),
            reposScanned: results.length,
            totalFindings: results.reduce((sum, r) => sum + r.findings.length, 0),
            results
        };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`\n💾 Resultados guardados en: ${outputFile}`);
    }

    console.log('\n✅ Escaneo completado');
})();
