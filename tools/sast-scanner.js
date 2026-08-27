#!/usr/bin/env node

/**
 * SAST Scanner - MFH TOOLS PRO
 * Static Application Security Testing - Escanea codigo fuente en busca de vulnerabilidades
 * 
 * Uso: node sast-scanner.js [opciones]
 * Ejemplo: node sast-scanner.js --scan --path ./src
 * Ejemplo: node sast-scanner.js --scan --language javascript
 * Ejemplo: node sast-scanner.js --rules --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'sast_config.json');
const REPORTS_DIR = path.join(__dirname, 'sast_reports');

const DEFAULT_CONFIG = {
    languages: ['javascript', 'typescript', 'python', 'java', 'go'],
    rules: {
        javascript: ['eval', 'innerHTML', 'document.write', 'SQL injection', 'hardcoded secrets'],
        python: ['eval', 'exec', 'pickle', 'SQL injection', 'hardcoded secrets'],
        java: ['Runtime.exec', 'ProcessBuilder', 'SQL injection', 'hardcoded secrets']
    },
    severity_threshold: 'medium',
    max_file_size: 1000000
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let scanPath = null;
let language = null;
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
        case '--rules':
            action = 'rules';
            break;
        case '--language':
            language = args[i + 1];
            i++;
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
🔍 SAST Scanner - MFH TOOLS PRO
===============================
Static Application Security Testing - Escanea codigo fuente en busca de vulnerabilidades.

Uso:
  node sast-scanner.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [directorio]   Escanear codigo fuente
  --rules               Listar reglas disponibles
  --language <lang>     Lenguaje a escanear (javascript, python, java, go)
  --path <directorio>   Directorio a escanear
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node sast-scanner.js --init
  node sast-scanner.js --scan --path ./src
  node sast-scanner.js --scan --language javascript
  node sast-scanner.js --rules
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

function listRules() {
    const config = loadConfig();
    console.log('\n📋 REGLAS SAST DISPONIBLES:');
    console.log('='.repeat(60));
    
    for (const [lang, rules] of Object.entries(config.rules)) {
        console.log(`\n📌 ${lang.toUpperCase()}:`);
        rules.forEach(rule => {
            console.log(`   • ${rule}`);
        });
    }
}

function detectLanguage(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mapping = {
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.py': 'python',
        '.java': 'java',
        '.go': 'go',
        '.rb': 'ruby',
        '.php': 'php',
        '.c': 'c',
        '.cpp': 'cpp'
    };
    return mapping[ext] || null;
}

function scanFile(filePath, language) {
    const findings = [];
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const config = loadConfig();
        const rules = config.rules[language] || [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;
            
            // Reglas especificas por lenguaje
            const patterns = {
                javascript: [
                    { pattern: /eval\s*\(/g, severity: 'critical', message: 'Uso de eval() - puede ejecutar codigo arbitrario' },
                    { pattern: /innerHTML\s*=/g, severity: 'high', message: 'Uso de innerHTML - posible XSS' },
                    { pattern: /document\.write/g, severity: 'medium', message: 'Uso de document.write - posible XSS' },
                    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, severity: 'high', message: 'Posible hardcoded password' },
                    { pattern: /secret\s*=\s*['"][^'"]+['"]/gi, severity: 'high', message: 'Posible hardcoded secret' },
                    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/gi, severity: 'high', message: 'Posible API key hardcoded' }
                ],
                python: [
                    { pattern: /eval\s*\(/g, severity: 'critical', message: 'Uso de eval() - puede ejecutar codigo arbitrario' },
                    { pattern: /exec\s*\(/g, severity: 'critical', message: 'Uso de exec() - puede ejecutar codigo arbitrario' },
                    { pattern: /pickle\.loads/g, severity: 'high', message: 'Uso de pickle - posible deserializacion insegura' },
                    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, severity: 'high', message: 'Posible hardcoded password' }
                ],
                java: [
                    { pattern: /Runtime\.exec/g, severity: 'high', message: 'Uso de Runtime.exec() - posible inyeccion de comandos' },
                    { pattern: /ProcessBuilder/g, severity: 'medium', message: 'Uso de ProcessBuilder - posible inyeccion de comandos' },
                    { pattern: /password\s*=\s*['"][^'"]+['"]/gi, severity: 'high', message: 'Posible hardcoded password' }
                ]
            };
            
            const langPatterns = patterns[language] || [];
            for (const rule of langPatterns) {
                if (rule.pattern.test(line)) {
                    findings.push({
                        file: filePath,
                        line: lineNum,
                        severity: rule.severity,
                        message: rule.message,
                        snippet: line.trim()
                    });
                }
            }
            
            // Reglas genericas para todos los lenguajes
            if (/TODO|FIXME|HACK/.test(line)) {
                findings.push({
                    file: filePath,
                    line: lineNum,
                    severity: 'low',
                    message: `Encontrado: ${line.trim().match(/TODO|FIXME|HACK/)[0]}`,
                    snippet: line.trim()
                });
            }
        }
    } catch (error) {
        if (verbose) {
            console.error(`❌ Error escaneando ${filePath}:`, error.message);
        }
    }
    
    return findings;
}

function scanProject(scanPath, language) {
    console.log(`🔍 Escaneando codigo en: ${scanPath || 'directorio actual'}`);
    
    const targetPath = scanPath || '.';
    if (!fs.existsSync(targetPath)) {
        console.error(`❌ Directorio no encontrado: ${targetPath}`);
        return;
    }
    
    const allFindings = [];
    const stats = {
        files: 0,
        lines: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
    };
    
    function walkDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                if (!['node_modules', '.git', 'dist', 'build', 'coverage', 'venv', '__pycache__'].includes(file)) {
                    walkDir(fullPath);
                }
            } else {
                const ext = path.extname(file);
                const fileLanguage = language || detectLanguage(fullPath);
                if (fileLanguage && ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go'].includes(ext)) {
                    stats.files++;
                    const content = fs.readFileSync(fullPath, 'utf8');
                    stats.lines += content.split('\n').length;
                    
                    const findings = scanFile(fullPath, fileLanguage);
                    for (const finding of findings) {
                        allFindings.push(finding);
                        stats[finding.severity] = (stats[finding.severity] || 0) + 1;
                    }
                }
            }
        }
    }
    
    walkDir(targetPath);
    
    console.log(`\n📊 Resultados del SAST:`);
    console.log(`   Archivos analizados: ${stats.files}`);
    console.log(`   Lineas de codigo: ${stats.lines}`);
    console.log(`   🔴 Criticos: ${stats.critical}`);
    console.log(`   🔴 Altos: ${stats.high}`);
    console.log(`   🟡 Medios: ${stats.medium}`);
    console.log(`   🟢 Bajos: ${stats.low}`);
    console.log(`   Total hallazgos: ${allFindings.length}`);
    
    // Mostrar hallazgos criticos y altos
    const criticalFindings = allFindings.filter(f => f.severity === 'critical');
    const highFindings = allFindings.filter(f => f.severity === 'high');
    
    if (criticalFindings.length > 0) {
        console.log(`\n🚨 Hallazgos CRITICOS:`);
        criticalFindings.slice(0, 5).forEach(f => {
            console.log(`   • ${f.file}:${f.line} - ${f.message}`);
        });
        if (criticalFindings.length > 5) {
            console.log(`   ... y ${criticalFindings.length - 5} mas`);
        }
    }
    
    if (highFindings.length > 0) {
        console.log(`\n⚠️ Hallazgos ALTOS:`);
        highFindings.slice(0, 5).forEach(f => {
            console.log(`   • ${f.file}:${f.line} - ${f.message}`);
        });
        if (highFindings.length > 5) {
            console.log(`   ... y ${highFindings.length - 5} mas`);
        }
    }
    
    // Generar reporte
    const report = {
        timestamp: new Date().toISOString(),
        target: targetPath,
        language: language || 'auto',
        stats: stats,
        findings: allFindings,
        summary: {
            total: allFindings.length,
            critical: stats.critical,
            high: stats.high,
            medium: stats.medium,
            low: stats.low
        }
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `sast_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return report;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 SAST Scanner - MFH TOOLS PRO`);
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
            scanProject(scanPath, language);
            break;
            
        case 'rules':
            listRules();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --rules, --init');
            break;
    }
    
    console.log('\n✅ SAST Scanner completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo SAST Scanner...');
    process.exit(0);
});
