#!/usr/bin/env node

/**
 * Secrets Scanner - MFH TOOLS PRO
 * Escanea codigo en busca de secretos, API keys, tokens y credenciales expuestas
 * 
 * Uso: node secrets-scanner.js [opciones]
 * Ejemplo: node secrets-scanner.js --scan --path ./project
 * Ejemplo: node secrets-scanner.js --scan --path ./project --report
 * Ejemplo: node secrets-scanner.js --patterns --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'secrets_config.json');
const REPORTS_DIR = path.join(__dirname, 'secrets_reports');

const DEFAULT_CONFIG = {
    patterns: {
        api_key: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{16,64})['"]?/gi,
        aws_key: /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
        github_token: /github[_-]?token\s*[:=]\s*['"]?(ghp_[a-zA-Z0-9]{36})['"]?/gi,
        jwt_token: /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
        password: /(?:password|pass|pwd)\s*[:=]\s*['"]?([^'"\s]{4,})['"]?/gi,
        secret_key: /(?:secret|private[_-]?key)\s*[:=]\s*['"]?([^'"\s]+)['"]?/gi,
        slack_token: /xox[baprs]-[a-zA-Z0-9-]+/g,
        stripe_key: /(?:sk_live|pk_live)_[a-zA-Z0-9]+/g,
        database_url: /(?:db_|database_)?url\s*[:=]\s*['"]?(postgres|mysql|mongodb):\/\/[^'"\s]+['"]?/gi,
        telegram_token: /[0-9]{9,10}:[a-zA-Z0-9_\-]{35}/g
    },
    exclude_patterns: ['node_modules', '.git', 'dist', 'build', 'coverage', '*.log', '*.tmp'],
    max_file_size: 1000000
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let scanPath = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                scanPath = args[i + 1];
                i++;
            }
            break;
        case '--patterns':
            action = 'patterns';
            break;
        case '--report':
            action = 'report';
            break;
        case '--path':
            scanPath = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--init':
            init = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔑 Secrets Scanner - MFH TOOLS PRO
=================================
Escanea codigo en busca de secretos, API keys, tokens y credenciales expuestas.

Uso:
  node secrets-scanner.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [directorio]   Escanear en busca de secretos
  --patterns            Listar patrones de busqueda
  --report              Generar reporte de hallazgos
  --path <directorio>   Directorio a escanear
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node secrets-scanner.js --init
  node secrets-scanner.js --scan --path ./project
  node secrets-scanner.js --patterns
  node secrets-scanner.js --scan --path ./project --report
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando configuracion:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuracion:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function listPatterns() {
    const config = loadConfig();
    console.log('\n📋 PATRONES DE BUSQUEDA:');
    console.log('='.repeat(60));
    
    for (const [name, pattern] of Object.entries(config.patterns)) {
        console.log(`\n📌 ${name.toUpperCase()}:`);
        console.log(`   ${pattern}`);
    }
}

function shouldExclude(filePath) {
    const config = loadConfig();
    const excludePatterns = config.exclude_patterns || [];
    for (const pattern of excludePatterns) {
        if (filePath.includes(pattern)) return true;
        if (pattern.startsWith('*') && filePath.endsWith(pattern.slice(1))) return true;
    }
    return false;
}

function scanFileForSecrets(filePath) {
    const config = loadConfig();
    const findings = [];
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.length > config.max_file_size) {
            return findings;
        }
        
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;
            
            for (const [type, pattern] of Object.entries(config.patterns)) {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const secret = match[1] || match[0];
                    // Redactar el secreto para mostrar solo parte
                    const redacted = secret.length > 10 ? 
                        secret.substring(0, 4) + '...' + secret.substring(secret.length - 4) : 
                        '***';
                    
                    findings.push({
                        file: filePath,
                        line: lineNum,
                        type: type,
                        secret: redacted,
                        full_match: secret.substring(0, 20) + (secret.length > 20 ? '...' : ''),
                        snippet: line.trim().substring(0, 100) + (line.length > 100 ? '...' : '')
                    });
                }
            }
        }
    } catch (error) {
        if (verbose) {
            console.error(`❌ Error escaneando ${filePath}:`, error.message);
        }
    }
    
    return findings;
}

function scanSecrets(scanPath) {
    console.log(`🔍 Escaneando secretos en: ${scanPath || 'directorio actual'}`);
    
    const targetPath = scanPath || '.';
    if (!fs.existsSync(targetPath)) {
        console.error(`❌ Directorio no encontrado: ${targetPath}`);
        return;
    }
    
    const allFindings = [];
    const stats = {
        files_scanned: 0,
        findings: 0,
        by_type: {}
    };
    
    function walkDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                if (!shouldExclude(fullPath)) {
                    walkDir(fullPath);
                }
            } else {
                if (!shouldExclude(fullPath)) {
                    stats.files_scanned++;
                    const findings = scanFileForSecrets(fullPath);
                    if (findings.length > 0) {
                        allFindings.push(...findings);
                        stats.findings += findings.length;
                        for (const f of findings) {
                            stats.by_type[f.type] = (stats.by_type[f.type] || 0) + 1;
                        }
                    }
                }
            }
        }
    }
    
    walkDir(targetPath);
    
    console.log(`\n📊 Resultados del escaneo:`);
    console.log(`   Archivos escaneados: ${stats.files_scanned}`);
    console.log(`   🔑 Secretos encontrados: ${stats.findings}`);
    
    if (stats.findings > 0) {
        console.log(`\n📊 Por tipo:`);
        for (const [type, count] of Object.entries(stats.by_type)) {
            console.log(`   • ${type}: ${count}`);
        }
        
        console.log(`\n🚨 Hallazgos:`);
        allFindings.slice(0, 10).forEach(f => {
            console.log(`   • ${f.file}:${f.line} - ${f.type} - ${f.secret}`);
        });
        if (allFindings.length > 10) {
            console.log(`   ... y ${allFindings.length - 10} mas`);
        }
    } else {
        console.log('\n✅ No se encontraron secretos expuestos');
    }
    
    // Generar reporte
    const report = {
        timestamp: new Date().toISOString(),
        target: targetPath,
        stats: stats,
        findings: allFindings,
        summary: {
            total: stats.findings,
            files_scanned: stats.files_scanned,
            by_type: stats.by_type
        }
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `secrets_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

function generateSecretsReport() {
    console.log('📊 Generando reporte de secretos...');
    
    const reportFiles = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('secrets_'));
    if (reportFiles.length === 0) {
        console.log('ℹ️ No hay reportes disponibles. Ejecuta --scan primero.');
        return;
    }
    
    const latest = reportFiles[reportFiles.length - 1];
    const data = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, latest), 'utf8'));
    
    console.log(`\n📊 Resumen:`);
    console.log(`   Archivos escaneados: ${data.stats.files_scanned}`);
    console.log(`   Secretos encontrados: ${data.stats.findings}`);
    console.log(`   Fecha: ${data.timestamp}`);
    
    if (data.stats.findings > 0) {
        console.log(`\n📋 Hallazgos:`);
        data.findings.slice(0, 10).forEach(f => {
            console.log(`   • ${f.file}:${f.line} - ${f.type}`);
        });
        if (data.findings.length > 10) {
            console.log(`   ... y ${data.findings.length - 10} mas`);
        }
    }
    
    return data;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔑 Secrets Scanner - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'scan':
            scanSecrets(scanPath);
            break;
            
        case 'patterns':
            listPatterns();
            break;
            
        case 'report':
            generateSecretsReport();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --patterns, --report, --init');
            break;
    }
    
    console.log('\n✅ Secrets Scanner completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Secrets Scanner...');
    process.exit(0);
});
