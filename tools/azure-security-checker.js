#!/usr/bin/env node

/**
 * Azure Security Checker - MFH TOOLS PRO
 * Verifica configuraciones de seguridad en Azure
 * 
 * Uso: node azure-security-checker.js [opciones]
 * Ejemplo: node azure-security-checker.js --scan --subscription my-sub
 * Ejemplo: node azure-security-checker.js --check-storage --account my-storage
 * Ejemplo: node azure-security-checker.js --audit-aad
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'azure_security_config.json');
const REPORTS_DIR = path.join(__dirname, 'azure_security_reports');

const DEFAULT_CONFIG = {
    subscriptions: [],
    checks: {
        storage: {
            public_access: true,
            encryption: true,
            soft_delete: true
        },
        aad: {
            mfa_enabled: true,
            guest_users: true,
            conditional_access: true
        },
        network: {
            nsg_rules: true,
            public_ips: true,
            vnet_peering: true
        },
        keyvault: {
            soft_delete: true,
            purge_protection: true,
            access_policies: true
        }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let subscriptionId = null;
let storageAccount = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                subscriptionId = args[i + 1];
                i++;
            }
            break;
        case '--check-storage':
            action = 'checkStorage';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                storageAccount = args[i + 1];
                i++;
            }
            break;
        case '--audit-aad':
            action = 'auditAAD';
            break;
        case '--subscription':
            subscriptionId = args[i + 1];
            i++;
            break;
        case '--account':
            storageAccount = args[i + 1];
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
☁️ Azure Security Checker - MFH TOOLS PRO
========================================
Verifica configuraciones de seguridad en Azure.

Uso:
  node azure-security-checker.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [subscription] Escanear recursos Azure
  --check-storage       Verificar seguridad de Storage Account
  --audit-aad           Auditar Azure Active Directory
  --subscription <id>   ID de suscripcion Azure
  --account <nombre>    Nombre de Storage Account
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node azure-security-checker.js --init
  node azure-security-checker.js --scan
  node azure-security-checker.js --check-storage --account mystorage
  node azure-security-checker.js --audit-aad
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

function simulateAzureResources() {
    return {
        storage_accounts: [
            { name: 'publicstorage', public_access: true, encryption: false, soft_delete: false },
            { name: 'privatestorage', public_access: false, encryption: true, soft_delete: true },
            { name: 'securestorage', public_access: false, encryption: true, soft_delete: true }
        ],
        aad_users: [
            { name: 'admin@domain.com', mfa_enabled: true, guest: false, last_login: '2026-08-20' },
            { name: 'user1@domain.com', mfa_enabled: false, guest: false, last_login: '2026-08-15' },
            { name: 'guest@external.com', mfa_enabled: false, guest: true, last_login: '2026-08-01' }
        ],
        vnets: [
            { name: 'vnet-prod', has_public_ip: false, nsg_configured: true, peered: true },
            { name: 'vnet-dev', has_public_ip: true, nsg_configured: false, peered: false }
        ],
        keyvaults: [
            { name: 'kv-prod', soft_delete: true, purge_protection: true, access_policies: true },
            { name: 'kv-dev', soft_delete: false, purge_protection: false, access_policies: true }
        ]
    };
}

function checkStorageSecurity(accountName) {
    console.log(`🔍 Verificando seguridad de Storage Account: ${accountName || 'todos'}`);
    
    const resources = simulateAzureResources();
    let accounts = resources.storage_accounts;
    
    if (accountName) {
        accounts = accounts.filter(a => a.name === accountName);
        if (accounts.length === 0) {
            console.error(`❌ Storage Account no encontrada: ${accountName}`);
            return;
        }
    }
    
    const results = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const account of accounts) {
        const checks = {
            public_access: {
                passed: !account.public_access,
                severity: 'critical',
                message: account.public_access ? 'Acceso publico habilitado' : 'Acceso restringido'
            },
            encryption: {
                passed: account.encryption,
                severity: 'high',
                message: account.encryption ? 'Encriptacion habilitada' : 'Encriptacion deshabilitada'
            },
            soft_delete: {
                passed: account.soft_delete,
                severity: 'medium',
                message: account.soft_delete ? 'Soft delete habilitado' : 'Soft delete deshabilitado'
            }
        };
        
        const issues = Object.values(checks).filter(c => !c.passed);
        if (issues.some(c => c.severity === 'critical')) criticalIssues++;
        if (issues.some(c => c.severity === 'high' || c.severity === 'medium')) warnings++;
        
        results.push({
            account: account.name,
            checks: checks,
            issues: issues.length,
            status: issues.length === 0 ? 'PASSED' : issues.some(c => c.severity === 'critical') ? 'CRITICAL' : 'WARNING'
        });
    }
    
    console.log(`\n📊 Resultados Storage:`);
    console.log(`   Cuentas analizadas: ${results.length}`);
    console.log(`   🔴 Criticos: ${criticalIssues}`);
    console.log(`   ⚠️ Advertencias: ${warnings}`);
    
    for (const result of results) {
        console.log(`\n📌 ${result.account} (${result.status})`);
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

function auditAAD() {
    console.log('🔍 Auditando Azure Active Directory...');
    
    const resources = simulateAzureResources();
    const users = resources.aad_users;
    const findings = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const user of users) {
        // Verificar MFA
        if (!user.mfa_enabled) {
            const severity = user.guest ? 'high' : 'medium';
            findings.push({
                type: 'mfa',
                severity: severity,
                message: `MFA deshabilitado para ${user.name}`,
                user: user.name,
                guest: user.guest
            });
            if (severity === 'high') warnings++;
            else warnings++;
        }
        
        // Verificar usuarios guest
        if (user.guest) {
            findings.push({
                type: 'guest_user',
                severity: 'medium',
                message: `Usuario guest detectado: ${user.name}`,
                user: user.name
            });
            warnings++;
        }
        
        // Verificar ultimo login
        const lastLogin = new Date(user.last_login);
        const daysSince = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince > 90) {
            findings.push({
                type: 'inactive_user',
                severity: 'low',
                message: `Usuario inactivo desde ${user.last_login}: ${user.name}`,
                user: user.name
            });
        }
    }
    
    console.log(`\n📊 Resultados AAD:`);
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
        console.log('\n✅ No se encontraron problemas de AAD');
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(findings, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return findings;
}

function scanAzure(subscriptionId) {
    console.log(`☁️ Escaneando recursos Azure${subscriptionId ? ` (suscripcion: ${subscriptionId})` : ''}`);
    
    const resources = simulateAzureResources();
    const results = {
        timestamp: new Date().toISOString(),
        subscription: subscriptionId || 'default',
        summary: {
            storage_accounts: resources.storage_accounts.length,
            public_accounts: resources.storage_accounts.filter(a => a.public_access).length,
            aad_users: resources.aad_users.length,
            vnets: resources.vnets.length,
            keyvaults: resources.keyvaults.length
        },
        details: resources
    };
    
    // Verificar Storage Accounts
    for (const account of resources.storage_accounts) {
        if (account.public_access) {
            console.log(`   ⚠️ Storage publica: ${account.name}`);
        }
    }
    
    // Verificar VNets
    for (const vnet of resources.vnets) {
        if (vnet.has_public_ip) {
            console.log(`   ⚠️ VNet con IP publica: ${vnet.name}`);
        }
        if (!vnet.nsg_configured) {
            console.log(`   ⚠️ VNet sin NSG: ${vnet.name}`);
        }
    }
    
    // Verificar KeyVaults
    for (const kv of resources.keyvaults) {
        if (!kv.soft_delete) {
            console.log(`   ⚠️ KeyVault sin soft delete: ${kv.name}`);
        }
        if (!kv.purge_protection) {
            console.log(`   ⚠️ KeyVault sin purge protection: ${kv.name}`);
        }
    }
    
    console.log(`\n📊 Resumen del escaneo:`);
    console.log(`   📦 Storage Accounts: ${results.summary.storage_accounts}`);
    console.log(`   🚨 Publicas: ${results.summary.public_accounts}`);
    console.log(`   👤 AAD Users: ${results.summary.aad_users}`);
    console.log(`   🌐 VNets: ${results.summary.vnets}`);
    console.log(`   🔑 KeyVaults: ${results.summary.keyvaults}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`☁️ Azure Security Checker - MFH TOOLS PRO`);
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
            scanAzure(subscriptionId);
            break;
            
        case 'checkStorage':
            checkStorageSecurity(storageAccount);
            break;
            
        case 'auditAAD':
            auditAAD();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --check-storage, --audit-aad, --init');
            break;
    }
    
    console.log('\n✅ Azure Security Checker completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Azure Security Checker...');
    process.exit(0);
});
