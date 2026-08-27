#!/usr/bin/env node

/**
 * GCP Security Inspector - MFH TOOLS PRO
 * Inspecciona configuraciones de seguridad en Google Cloud Platform
 * 
 * Uso: node gcp-security-inspector.js [opciones]
 * Ejemplo: node gcp-security-inspector.js --scan --project my-project
 * Ejemplo: node gcp-security-inspector.js --check-bucket --bucket my-bucket
 * Ejemplo: node gcp-security-inspector.js --audit-iam
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'gcp_security_config.json');
const REPORTS_DIR = path.join(__dirname, 'gcp_security_reports');

const DEFAULT_CONFIG = {
    projects: [],
    checks: {
        storage: {
            public_buckets: true,
            encryption: true,
            retention: true
        },
        iam: {
            service_accounts: true,
            permissions: true,
            api_keys: true
        },
        compute: {
            public_ips: true,
            firewall_rules: true,
            ssh_access: true
        },
        sql: {
            public_access: true,
            encryption: true,
            backup: true
        }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let projectId = null;
let bucketName = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                projectId = args[i + 1];
                i++;
            }
            break;
        case '--check-bucket':
            action = 'checkBucket';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                bucketName = args[i + 1];
                i++;
            }
            break;
        case '--audit-iam':
            action = 'auditIAM';
            break;
        case '--project':
            projectId = args[i + 1];
            i++;
            break;
        case '--bucket':
            bucketName = args[i + 1];
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
☁️ GCP Security Inspector - MFH TOOLS PRO
========================================
Inspecciona configuraciones de seguridad en Google Cloud Platform.

Uso:
  node gcp-security-inspector.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [project]      Escanear recursos GCP
  --check-bucket        Verificar seguridad de bucket
  --audit-iam           Auditar IAM y service accounts
  --project <id>        ID del proyecto GCP
  --bucket <nombre>     Nombre del bucket
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node gcp-security-inspector.js --init
  node gcp-security-inspector.js --scan --project my-project
  node gcp-security-inspector.js --check-bucket --bucket my-bucket
  node gcp-security-inspector.js --audit-iam
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

function simulateGCPResources() {
    return {
        buckets: [
            { name: 'public-bucket', public: true, encryption: false, retention: false },
            { name: 'private-bucket', public: false, encryption: true, retention: true },
            { name: 'logs-bucket', public: false, encryption: true, retention: false }
        ],
        service_accounts: [
            { name: 'sa-prod@project.iam.gserviceaccount.com', key_rotation: 30, permissions: ['storage.admin', 'compute.admin'] },
            { name: 'sa-dev@project.iam.gserviceaccount.com', key_rotation: 90, permissions: ['storage.viewer'] },
            { name: 'sa-test@project.iam.gserviceaccount.com', key_rotation: null, permissions: ['compute.viewer'] }
        ],
        compute_instances: [
            { name: 'web-prod', public_ip: true, firewall_allow_ssh: false },
            { name: 'web-dev', public_ip: false, firewall_allow_ssh: true },
            { name: 'db-prod', public_ip: false, firewall_allow_ssh: false }
        ],
        sql_instances: [
            { name: 'sql-prod', public_access: false, encryption: true, backup: true },
            { name: 'sql-dev', public_access: true, encryption: false, backup: false }
        ]
    };
}

function checkBucketSecurity(bucketName) {
    console.log(`🔍 Verificando seguridad del bucket: ${bucketName || 'todos'}`);
    
    const resources = simulateGCPResources();
    let buckets = resources.buckets;
    
    if (bucketName) {
        buckets = buckets.filter(b => b.name === bucketName);
        if (buckets.length === 0) {
            console.error(`❌ Bucket no encontrado: ${bucketName}`);
            return;
        }
    }
    
    const results = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const bucket of buckets) {
        const checks = {
            public: {
                passed: !bucket.public,
                severity: 'critical',
                message: bucket.public ? 'Bucket publicamente accesible' : 'Bucket privado'
            },
            encryption: {
                passed: bucket.encryption,
                severity: 'high',
                message: bucket.encryption ? 'Encriptacion habilitada' : 'Encriptacion deshabilitada'
            },
            retention: {
                passed: bucket.retention,
                severity: 'medium',
                message: bucket.retention ? 'Retention policy configurada' : 'Sin retention policy'
            }
        };
        
        const issues = Object.values(checks).filter(c => !c.passed);
        if (issues.some(c => c.severity === 'critical')) criticalIssues++;
        if (issues.some(c => c.severity === 'high' || c.severity === 'medium')) warnings++;
        
        results.push({
            bucket: bucket.name,
            checks: checks,
            issues: issues.length,
            status: issues.length === 0 ? 'PASSED' : issues.some(c => c.severity === 'critical') ? 'CRITICAL' : 'WARNING'
        });
    }
    
    console.log(`\n📊 Resultados Buckets:`);
    console.log(`   Buckets analizados: ${results.length}`);
    console.log(`   🔴 Criticos: ${criticalIssues}`);
    console.log(`   ⚠️ Advertencias: ${warnings}`);
    
    for (const result of results) {
        console.log(`\n📌 ${result.bucket} (${result.status})`);
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

function auditGCPIAM() {
    console.log('🔍 Auditando IAM y Service Accounts...');
    
    const resources = simulateGCPResources();
    const accounts = resources.service_accounts;
    const findings = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const account of accounts) {
        // Verificar rotacion de keys
        if (!account.key_rotation) {
            findings.push({
                type: 'key_rotation',
                severity: 'high',
                message: `Service account ${account.name} sin rotacion de keys configurada`,
                account: account.name
            });
            warnings++;
        } else if (account.key_rotation > 60) {
            findings.push({
                type: 'key_rotation',
                severity: 'medium',
                message: `Rotacion de keys cada ${account.key_rotation} dias (recomendado < 60) para ${account.name}`,
                account: account.name
            });
            warnings++;
        }
        
        // Verificar permisos excesivos
        const adminPermissions = account.permissions.filter(p => p.includes('admin'));
        if (adminPermissions.length > 0) {
            findings.push({
                type: 'excessive_permissions',
                severity: 'medium',
                message: `Service account ${account.name} tiene permisos administrativos: ${adminPermissions.join(', ')}`,
                account: account.name
            });
            warnings++;
        }
    }
    
    console.log(`\n📊 Resultados IAM:`);
    console.log(`   Service Accounts analizadas: ${accounts.length}`);
    console.log(`   🔴 Criticos: ${criticalIssues}`);
    console.log(`   ⚠️ Advertencias: ${warnings}`);
    
    if (findings.length > 0) {
        console.log(`\n🔍 Hallazgos:`);
        for (const finding of findings) {
            const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${finding.message}`);
        }
    } else {
        console.log('\n✅ No se encontraron problemas de IAM');
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(findings, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return findings;
}

function scanGCP(projectId) {
    console.log(`☁️ Escaneando recursos GCP${projectId ? ` (proyecto: ${projectId})` : ''}`);
    
    const resources = simulateGCPResources();
    const results = {
        timestamp: new Date().toISOString(),
        project: projectId || 'default',
        summary: {
            buckets: resources.buckets.length,
            public_buckets: resources.buckets.filter(b => b.public).length,
            service_accounts: resources.service_accounts.length,
            compute_instances: resources.compute_instances.length,
            sql_instances: resources.sql_instances.length
        },
        details: resources
    };
    
    // Verificar buckets
    for (const bucket of resources.buckets) {
        if (bucket.public) {
            console.log(`   ⚠️ Bucket publico: ${bucket.name}`);
        }
    }
    
    // Verificar instancias
    for (const instance of resources.compute_instances) {
        if (instance.public_ip) {
            console.log(`   ⚠️ Instancia con IP publica: ${instance.name}`);
        }
        if (instance.firewall_allow_ssh) {
            console.log(`   ⚠️ Firewall permite SSH: ${instance.name}`);
        }
    }
    
    // Verificar SQL
    for (const sql of resources.sql_instances) {
        if (sql.public_access) {
            console.log(`   ⚠️ SQL publicamente accesible: ${sql.name}`);
        }
        if (!sql.backup) {
            console.log(`   ⚠️ SQL sin backup: ${sql.name}`);
        }
    }
    
    console.log(`\n📊 Resumen del escaneo:`);
    console.log(`   📦 Buckets: ${results.summary.buckets}`);
    console.log(`   🚨 Publicos: ${results.summary.public_buckets}`);
    console.log(`   👤 Service Accounts: ${results.summary.service_accounts}`);
    console.log(`   💻 Compute Instances: ${results.summary.compute_instances}`);
    console.log(`   🗄️ SQL Instances: ${results.summary.sql_instances}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`☁️ GCP Security Inspector - MFH TOOLS PRO`);
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
            scanGCP(projectId);
            break;
            
        case 'checkBucket':
            checkBucketSecurity(bucketName);
            break;
            
        case 'auditIAM':
            auditGCPIAM();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --check-bucket, --audit-iam, --init');
            break;
    }
    
    console.log('\n✅ GCP Security Inspector completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo GCP Security Inspector...');
    process.exit(0);
});
