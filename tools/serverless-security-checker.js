#!/usr/bin/env node

/**
 * Serverless Security Checker - MFH TOOLS PRO
 * Verifica configuraciones de seguridad en entornos serverless
 * 
 * Uso: node serverless-security-checker.js [opciones]
 * Ejemplo: node serverless-security-checker.js --scan --provider aws
 * Ejemplo: node serverless-security-checker.js --check-function --name my-function
 * Ejemplo: node serverless-security-checker.js --audit-permissions
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'serverless_security_config.json');
const REPORTS_DIR = path.join(__dirname, 'serverless_security_reports');

const DEFAULT_CONFIG = {
    providers: ['aws', 'azure', 'gcp'],
    checks: {
        functions: {
            public_access: true,
            environment_vars: true,
            timeout: true,
            memory: true
        },
        permissions: {
            over_privileged: true,
            service_accounts: true,
            api_keys: true
        },
        triggers: {
            public_triggers: true,
            unauthenticated: true,
            rate_limiting: true
        },
        monitoring: {
            logging: true,
            tracing: true,
            alarms: true
        }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let provider = null;
let functionName = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                provider = args[i + 1];
                i++;
            }
            break;
        case '--check-function':
            action = 'checkFunction';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                functionName = args[i + 1];
                i++;
            }
            break;
        case '--audit-permissions':
            action = 'auditPermissions';
            break;
        case '--provider':
            provider = args[i + 1];
            i++;
            break;
        case '--name':
            functionName = args[i + 1];
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
☁️ Serverless Security Checker - MFH TOOLS PRO
============================================
Verifica configuraciones de seguridad en entornos serverless.

Uso:
  node serverless-security-checker.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [provider]     Escanear funciones serverless
  --check-function      Verificar seguridad de una funcion
  --audit-permissions   Auditar permisos IAM
  --provider <nombre>   Proveedor cloud (aws, azure, gcp)
  --name <nombre>       Nombre de la funcion
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node serverless-security-checker.js --init
  node serverless-security-checker.js --scan --provider aws
  node serverless-security-checker.js --check-function --name my-function
  node serverless-security-checker.js --audit-permissions
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

function simulateServerlessResources() {
    return {
        functions: [
            { name: 'api-public', provider: 'aws', public_access: true, env_vars: ['DB_PASSWORD'], timeout: 30, memory: 128 },
            { name: 'api-private', provider: 'aws', public_access: false, env_vars: ['DB_PASSWORD'], timeout: 300, memory: 1024 },
            { name: 'cron-job', provider: 'azure', public_access: false, env_vars: ['API_KEY'], timeout: 60, memory: 256 }
        ],
        permissions: [
            { function: 'api-public', role: 'arn:aws:iam::123456789:role/lambda-exec', policies: ['AWSLambdaBasicExecutionRole', 'AmazonS3FullAccess'] },
            { function: 'api-private', role: 'arn:aws:iam::123456789:role/lambda-exec', policies: ['AWSLambdaBasicExecutionRole', 'AmazonDynamoDBReadOnlyAccess'] },
            { function: 'cron-job', role: 'arn:azure:iam::123456789:role/function-exec', policies: ['AzureFunctionsService', 'StorageAccountContributor'] }
        ],
        triggers: [
            { function: 'api-public', type: 'http', public: true, rate_limiting: false },
            { function: 'api-private', type: 'http', public: false, rate_limiting: true },
            { function: 'cron-job', type: 'schedule', public: false, rate_limiting: false }
        ],
        monitoring: {
            logging: true,
            tracing: true,
            alarms: ['cpu', 'memory', 'errors']
        }
    };
}

function checkFunctionSecurity(functionName) {
    console.log(`🔍 Verificando seguridad de la funcion: ${functionName || 'todos'}`);
    
    const resources = simulateServerlessResources();
    let functions = resources.functions;
    
    if (functionName) {
        functions = functions.filter(f => f.name === functionName);
        if (functions.length === 0) {
            console.error(`❌ Funcion no encontrada: ${functionName}`);
            return;
        }
    }
    
    const results = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const func of functions) {
        const checks = {
            public_access: {
                passed: !func.public_access,
                severity: 'critical',
                message: func.public_access ? 'Funcion publicamente accesible' : 'Acceso restringido'
            },
            environment_vars: {
                passed: !func.env_vars || func.env_vars.length === 0,
                severity: 'high',
                message: func.env_vars && func.env_vars.length > 0 ? `Variables sensibles: ${func.env_vars.join(', ')}` : 'Sin variables sensibles'
            },
            timeout: {
                passed: func.timeout <= 60,
                severity: 'medium',
                message: `Timeout: ${func.timeout}s${func.timeout > 60 ? ' (recomendado <= 60s)' : ''}`
            },
            memory: {
                passed: func.memory <= 512,
                severity: 'low',
                message: `Memoria: ${func.memory}MB${func.memory > 512 ? ' (recomendado <= 512MB)' : ''}`
            }
        };
        
        const issues = Object.values(checks).filter(c => !c.passed);
        if (issues.some(c => c.severity === 'critical')) criticalIssues++;
        if (issues.some(c => c.severity === 'high' || c.severity === 'medium')) warnings++;
        
        results.push({
            function: func.name,
            provider: func.provider,
            checks: checks,
            issues: issues.length,
            status: issues.length === 0 ? 'PASSED' : issues.some(c => c.severity === 'critical') ? 'CRITICAL' : 'WARNING'
        });
    }
    
    console.log(`\n📊 Resultados Funciones:`);
    console.log(`   Funciones analizadas: ${results.length}`);
    console.log(`   🔴 Criticos: ${criticalIssues}`);
    console.log(`   ⚠️ Advertencias: ${warnings}`);
    
    for (const result of results) {
        console.log(`\n📌 ${result.provider}/${result.function} (${result.status})`);
        for (const [check, data] of Object.entries(result.checks)) {
            const icon = data.passed ? '✅' : '❌';
            console.log(`   ${icon} ${check}: ${data.message}`);
        }
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return results;
}

function auditServerlessPermissions() {
    console.log('🔍 Auditando permisos IAM...');
    
    const resources = simulateServerlessResources();
    const permissions = resources.permissions;
    const findings = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const perm of permissions) {
        // Verificar permisos excesivos
        const adminPolicies = perm.policies.filter(p => p.includes('FullAccess') || p.includes('Admin'));
        if (adminPolicies.length > 0) {
            findings.push({
                type: 'excessive_permissions',
                severity: 'high',
                message: `Funcion ${perm.function} tiene permisos administrativos: ${adminPolicies.join(', ')}`,
                function: perm.function
            });
            warnings++;
        }
    }
    
    console.log(`\n📊 Resultados Permisos:`);
    console.log(`   🔴 Criticos: ${criticalIssues}`);
    console.log(`   ⚠️ Advertencias: ${warnings}`);
    
    if (findings.length > 0) {
        console.log(`\n🔍 Hallazgos:`);
        for (const finding of findings) {
            const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${finding.message}`);
        }
    } else {
        console.log('\n✅ No se encontraron problemas de permisos');
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(findings, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return findings;
}

function scanServerless(provider) {
    console.log(`☁️ Escaneando funciones serverless${provider ? ` (provider: ${provider})` : ''}`);
    
    const resources = simulateServerlessResources();
    let functions = resources.functions;
    
    if (provider) {
        functions = functions.filter(f => f.provider === provider);
    }
    
    const results = {
        timestamp: new Date().toISOString(),
        provider: provider || 'all',
        summary: {
            functions: functions.length,
            public_functions: functions.filter(f => f.public_access).length,
            sensitive_vars: functions.filter(f => f.env_vars && f.env_vars.length > 0).length,
            high_timeout: functions.filter(f => f.timeout > 60).length
        },
        details: resources
    };
    
    // Verificar funciones publicas
    for (const func of functions) {
        if (func.public_access) {
            console.log(`   ⚠️ Funcion publica: ${func.name}`);
        }
        if (func.env_vars && func.env_vars.length > 0) {
            console.log(`   ⚠️ Variables sensibles en ${func.name}: ${func.env_vars.join(', ')}`);
        }
        if (func.timeout > 60) {
            console.log(`   ⚠️ Timeout alto (${func.timeout}s) en ${func.name}`);
        }
    }
    
    console.log(`\n📊 Resumen del escaneo:`);
    console.log(`   📦 Funciones: ${results.summary.functions}`);
    console.log(`   🚨 Publicas: ${results.summary.public_functions}`);
    console.log(`   🔑 Variables sensibles: ${results.summary.sensitive_vars}`);
    console.log(`   ⏱️ Timeout alto: ${results.summary.high_timeout}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`☁️ Serverless Security Checker - MFH TOOLS PRO`);
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
            scanServerless(provider);
            break;
            
        case 'checkFunction':
            checkFunctionSecurity(functionName);
            break;
            
        case 'auditPermissions':
            auditServerlessPermissions();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --check-function, --audit-permissions, --init');
            break;
    }
    
    console.log('\n✅ Serverless Security Checker completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Serverless Security Checker...');
    process.exit(0);
});
