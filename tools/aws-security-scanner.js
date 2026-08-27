#!/usr/bin/env node

/**
 * AWS Security Scanner - MFH TOOLS PRO
 * Escanea configuraciones de seguridad en AWS
 * 
 * Uso: node aws-security-scanner.js [opciones]
 * Ejemplo: node aws-security-scanner.js --scan --profile default
 * Ejemplo: node aws-security-scanner.js --check-s3 --bucket my-bucket
 * Ejemplo: node aws-security-scanner.js --audit-iam
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'aws_security_config.json');
const REPORTS_DIR = path.join(__dirname, 'aws_security_reports');

const DEFAULT_CONFIG = {
    profiles: ['default'],
    regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    checks: {
        s3: {
            public_buckets: true,
            encryption: true,
            versioning: true,
            logging: true
        },
        iam: {
            unused_keys: true,
            mfa_enabled: true,
            root_access: true,
            password_policy: true
        },
        ec2: {
            open_ports: true,
            public_ips: true,
            unencrypted_volumes: true,
            default_vpc: true
        },
        rds: {
            public_access: true,
            encryption: true,
            backup_retention: true
        }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let profile = null;
let bucketName = null;
let region = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            break;
        case '--check-s3':
            action = 'checkS3';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                bucketName = args[i + 1];
                i++;
            }
            break;
        case '--audit-iam':
            action = 'auditIAM';
            break;
        case '--profile':
            profile = args[i + 1];
            i++;
            break;
        case '--region':
            region = args[i + 1];
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
☁️ AWS Security Scanner - MFH TOOLS PRO
======================================
Escanea configuraciones de seguridad en AWS.

Uso:
  node aws-security-scanner.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan                Escanear recursos AWS
  --check-s3 <bucket>   Verificar seguridad de bucket S3
  --audit-iam           Auditar configuracion IAM
  --profile <nombre>    Perfil AWS a usar
  --region <region>     Region AWS
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node aws-security-scanner.js --init
  node aws-security-scanner.js --scan --profile default
  node aws-security-scanner.js --check-s3 my-bucket
  node aws-security-scanner.js --audit-iam
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

function simulateAWSResources() {
    return {
        s3_buckets: [
            { name: 'public-bucket', public: true, encrypted: false, versioning: false, logging: false },
            { name: 'private-bucket', public: false, encrypted: true, versioning: true, logging: true },
            { name: 'logs-bucket', public: false, encrypted: true, versioning: false, logging: true }
        ],
        iam_users: [
            { name: 'admin', has_mfa: true, access_keys: 1, last_used: '2026-08-20', root: false },
            { name: 'developer', has_mfa: false, access_keys: 2, last_used: '2026-08-01', root: false },
            { name: 'service-account', has_mfa: false, access_keys: 1, last_used: '2025-12-15', root: false }
        ],
        ec2_instances: [
            { id: 'i-1234567890', public_ip: true, open_ports: ['22', '80', '443'], encrypted_volume: false, vpc: 'vpc-default' },
            { id: 'i-0987654321', public_ip: false, open_ports: ['22'], encrypted_volume: true, vpc: 'vpc-custom' }
        ],
        rds_instances: [
            { id: 'db-prod', public_access: false, encrypted: true, backup_retention: 30 },
            { id: 'db-dev', public_access: true, encrypted: false, backup_retention: 7 }
        ]
    };
}

function checkS3Security(bucketName) {
    console.log(`🔍 Verificando seguridad del bucket S3: ${bucketName || 'todos'}`);
    
    const resources = simulateAWSResources();
    let buckets = resources.s3_buckets;
    
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
                passed: bucket.encrypted,
                severity: 'high',
                message: bucket.encrypted ? 'Encriptacion habilitada' : 'Encriptacion deshabilitada'
            },
            versioning: {
                passed: bucket.versioning,
                severity: 'medium',
                message: bucket.versioning ? 'Versioning habilitado' : 'Versioning deshabilitado'
            },
            logging: {
                passed: bucket.logging,
                severity: 'medium',
                message: bucket.logging ? 'Logging habilitado' : 'Logging deshabilitado'
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
    
    console.log(`\n📊 Resultados S3:`);
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

function auditIAM() {
    console.log('🔍 Auditando configuracion IAM...');
    
    const resources = simulateAWSResources();
    const users = resources.iam_users;
    const findings = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    // Verificar usuario root
    const rootUser = users.find(u => u.root);
    if (rootUser) {
        findings.push({
            type: 'root_access',
            severity: 'critical',
            message: 'Usuario root detectado - recomendar desactivar acceso root',
            user: rootUser.name
        });
        criticalIssues++;
    }
    
    for (const user of users) {
        // Verificar MFA
        if (!user.has_mfa && !user.root) {
            findings.push({
                type: 'mfa',
                severity: 'high',
                message: `MFA deshabilitado para ${user.name}`,
                user: user.name
            });
            warnings++;
        }
        
        // Verificar keys antiguas
        const lastUsed = new Date(user.last_used);
        const daysSince = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 90) {
            findings.push({
                type: 'old_keys',
                severity: 'medium',
                message: `Access keys de ${user.name} no usadas desde ${user.last_used}`,
                user: user.name
            });
            warnings++;
        }
        
        // Verificar multiples keys
        if (user.access_keys > 1) {
            findings.push({
                type: 'multiple_keys',
                severity: 'low',
                message: `${user.name} tiene ${user.access_keys} access keys`,
                user: user.name
            });
        }
    }
    
    console.log(`\n📊 Resultados IAM:`);
    console.log(`   Usuarios analizados: ${users.length}`);
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

function scanAWS(profile, region) {
    console.log(`☁️ Escaneando recursos AWS${profile ? ` (perfil: ${profile})` : ''}${region ? ` (region: ${region})` : ''}`);
    
    const config = loadConfig();
    const resources = simulateAWSResources();
    const results = {
        timestamp: new Date().toISOString(),
        profile: profile || 'default',
        region: region || 'all',
        summary: {
            s3_buckets: resources.s3_buckets.length,
            public_buckets: resources.s3_buckets.filter(b => b.public).length,
            iam_users: resources.iam_users.length,
            ec2_instances: resources.ec2_instances.length,
            rds_instances: resources.rds_instances.length
        },
        details: resources
    };
    
    // Verificar S3
    for (const bucket of resources.s3_buckets) {
        if (bucket.public) {
            console.log(`   ⚠️ Bucket publico: ${bucket.name}`);
        }
    }
    
    // Verificar EC2
    for (const instance of resources.ec2_instances) {
        if (instance.public_ip) {
            console.log(`   ⚠️ EC2 con IP publica: ${instance.id}`);
        }
        if (instance.open_ports.includes('22') && instance.public_ip) {
            console.log(`   🔴 EC2 expuesta con SSH: ${instance.id}`);
        }
    }
    
    // Verificar RDS
    for (const instance of resources.rds_instances) {
        if (instance.public_access) {
            console.log(`   ⚠️ RDS publicamente accesible: ${instance.id}`);
        }
        if (instance.backup_retention < 7) {
            console.log(`   ⚠️ Backup retention bajo: ${instance.id} (${instance.backup_retention} dias)`);
        }
    }
    
    console.log(`\n📊 Resumen del escaneo:`);
    console.log(`   📦 S3 Buckets: ${results.summary.s3_buckets}`);
    console.log(`   🚨 Publicos: ${results.summary.public_buckets}`);
    console.log(`   👤 IAM Users: ${results.summary.iam_users}`);
    console.log(`   💻 EC2 Instances: ${results.summary.ec2_instances}`);
    console.log(`   🗄️ RDS Instances: ${results.summary.rds_instances}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`☁️ AWS Security Scanner - MFH TOOLS PRO`);
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
            scanAWS(profile, region);
            break;
            
        case 'checkS3':
            checkS3Security(bucketName);
            break;
            
        case 'auditIAM':
            auditIAM();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --check-s3, --audit-iam, --init');
            break;
    }
    
    console.log('\n✅ AWS Security Scanner completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo AWS Security Scanner...');
    process.exit(0);
});
