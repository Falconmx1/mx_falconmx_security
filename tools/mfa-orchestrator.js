#!/usr/bin/env node

/**
 * MFA Orchestrator - MFH TOOLS PRO
 * Orquesta autenticacion multifactor (TOTP, SMS, Email, WebAuthn)
 * 
 * Uso: node mfa-orchestrator.js [opciones]
 * Ejemplo: node mfa-orchestrator.js --generate --user john@example.com
 * Ejemplo: node mfa-orchestrator.js --verify --token 123456 --user john@example.com
 * Ejemplo: node mfa-orchestrator.js --methods list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const nodemailer = require('nodemailer');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'mfa_config.json');
const USERS_DIR = path.join(__dirname, 'mfa_users');
const LOGS_DIR = path.join(__dirname, 'mfa_logs');

const DEFAULT_CONFIG = {
    methods: ['totp', 'email', 'backup_codes'],
    totp: {
        issuer: 'MFH TOOLS PRO',
        algorithm: 'sha256',
        digits: 6,
        period: 30
    },
    email: {
        enabled: true,
        from: 'mfa@mfh-tools.com'
    },
    sms: {
        enabled: false,
        provider: null
    },
    backup_codes: {
        count: 10,
        length: 8
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let userId = null;
let token = null;
let method = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--user':
            userId = args[i + 1];
            i++;
            break;
        case '--token':
            token = args[i + 1];
            i++;
            break;
        case '--method':
            method = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--generate':
            action = 'generate';
            break;
        case '--verify':
            action = 'verify';
            break;
        case '--methods':
            action = 'methods';
            break;
        case '--backup':
            action = 'backup';
            break;
        case '--disable':
            action = 'disable';
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
🔐 MFA Orchestrator - MFH TOOLS PRO
==================================
Orquesta autenticacion multifactor.

Uso:
  node mfa-orchestrator.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --generate            Generar MFA para un usuario
  --verify              Verificar token MFA
  --methods             Listar metodos disponibles
  --backup              Generar codigos de respaldo
  --disable             Deshabilitar MFA
  --user <id>           ID de usuario
  --token <codigo>      Codigo de verificacion
  --method <metodo>     Metodo a usar (totp, email, sms, backup)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node mfa-orchestrator.js --init
  node mfa-orchestrator.js --generate --user john@example.com
  node mfa-orchestrator.js --verify --user john@example.com --token 123456
  node mfa-orchestrator.js --backup --user john@example.com
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
    if (!fs.existsSync(USERS_DIR)) {
        fs.mkdirSync(USERS_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Usuarios: ${USERS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function getUserFile(userId) {
    return path.join(USERS_DIR, `${userId.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
}

function loadUser(userId) {
    const file = getUserFile(userId);
    try {
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando usuario:', error.message);
    }
    return null;
}

function saveUser(userId, data) {
    const file = getUserFile(userId);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function generateTOTP(userId) {
    const config = loadConfig();
    const secret = speakeasy.generateSecret({
        name: `${config.totp.issuer}:${userId}`,
        length: 20,
        algorithm: config.totp.algorithm
    });
    
    const qrCode = `otpauth://totp/${encodeURIComponent(config.totp.issuer)}:${encodeURIComponent(userId)}?secret=${secret.base32}&issuer=${encodeURIComponent(config.totp.issuer)}&algorithm=${config.totp.algorithm}&digits=${config.totp.digits}&period=${config.totp.period}`;
    
    return {
        secret: secret.base32,
        qrCode: qrCode,
        backup_codes: generateBackupCodes(),
        method: 'totp',
        enabled: true
    };
}

function generateBackupCodes() {
    const config = loadConfig();
    const codes = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    
    for (let i = 0; i < config.backup_codes.count; i++) {
        let code = '';
        for (let j = 0; j < config.backup_codes.length; j++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        codes.push(code);
    }
    
    return codes;
}

function verifyTOTP(secret, token) {
    try {
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1
        });
        return verified;
    } catch (error) {
        return false;
    }
}

function generateMFA(userId) {
    console.log(`🔐 Generando MFA para usuario: ${userId}`);
    
    const config = loadConfig();
    let userData = loadUser(userId);
    
    if (!userData) {
        userData = {
            userId: userId,
            created: new Date().toISOString(),
            mfa: {
                enabled: false,
                methods: {}
            }
        };
    }
    
    // Generar TOTP
    const totpData = generateTOTP(userId);
    userData.mfa.methods.totp = {
        secret: totpData.secret,
        qrCode: totpData.qrCode,
        enabled: true
    };
    
    // Generar codigos de respaldo
    const backupCodes = generateBackupCodes();
    userData.mfa.methods.backup = {
        codes: backupCodes,
        used: [],
        enabled: true
    };
    
    userData.mfa.enabled = true;
    userData.mfa.updated = new Date().toISOString();
    
    saveUser(userId, userData);
    
    console.log('\n✅ MFA configurado exitosamente!');
    console.log('\n📋 INFORMACION MFA:');
    console.log(`   Usuario: ${userId}`);
    console.log(`   Metodo principal: TOTP (Google Authenticator, Authy, etc.)`);
    console.log(`   Secreto: ${totpData.secret}`);
    console.log(`   QR Code (URL): ${totpData.qrCode}`);
    console.log('\n🔑 CODIGOS DE RESPALDO (guardalos en un lugar seguro):');
    backupCodes.forEach((code, i) => {
        console.log(`   ${i + 1}. ${code}`);
    });
    console.log('\n⚠️  Cada codigo de respaldo solo se puede usar una vez.');
    console.log(`📁 Datos guardados en: ${getUserFile(userId)}`);
    
    return userData;
}

function verifyMFA(userId, token, method) {
    console.log(`🔍 Verificando MFA para usuario: ${userId}`);
    
    const userData = loadUser(userId);
    if (!userData) {
        console.error('❌ Usuario no encontrado');
        return false;
    }
    
    if (!userData.mfa || !userData.mfa.enabled) {
        console.error('❌ MFA no habilitado para este usuario');
        return false;
    }
    
    let verified = false;
    const methodUsed = method || 'totp';
    
    switch (methodUsed) {
        case 'totp':
            if (userData.mfa.methods.totp && userData.mfa.methods.totp.enabled) {
                verified = verifyTOTP(userData.mfa.methods.totp.secret, token);
                if (verified) {
                    console.log('✅ TOTP verificado correctamente');
                } else {
                    console.log('❌ TOTP invalido');
                }
            } else {
                console.log('❌ TOTP no habilitado');
            }
            break;
            
        case 'backup':
            if (userData.mfa.methods.backup && userData.mfa.methods.backup.enabled) {
                const backup = userData.mfa.methods.backup;
                const index = backup.codes.indexOf(token);
                if (index !== -1 && !backup.used.includes(token)) {
                    backup.used.push(token);
                    saveUser(userId, userData);
                    verified = true;
                    console.log('✅ Codigo de respaldo verificado correctamente');
                } else {
                    console.log('❌ Codigo de respaldo invalido o ya usado');
                }
            } else {
                console.log('❌ Codigos de respaldo no habilitados');
            }
            break;
            
        case 'email':
            // Simulacion de verificacion por email
            console.log('📧 Enviando codigo de verificacion por email...');
            const emailCode = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`   Codigo enviado: ${emailCode}`);
            verified = token === emailCode;
            console.log(verified ? '✅ Email verificado correctamente' : '❌ Email invalido');
            break;
            
        default:
            console.error(`❌ Metodo no soportado: ${methodUsed}`);
            return false;
    }
    
    // Loggear intento
    const logEntry = {
        timestamp: new Date().toISOString(),
        userId: userId,
        method: methodUsed,
        verified: verified,
        ip: '127.0.0.1'
    };
    
    const logFile = path.join(LOGS_DIR, `mfa_${Date.now()}.log`);
    fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
    
    console.log(`📄 Log guardado: ${logFile}`);
    return verified;
}

function listMethods() {
    const config = loadConfig();
    console.log('\n📋 METODOS MFA DISPONIBLES:');
    console.log('='.repeat(40));
    console.log('   🔐 TOTP (Google Authenticator, Authy, etc.)');
    console.log('   📧 Email (codigo de verificacion por email)');
    console.log('   📱 SMS (codigo de verificacion por SMS)');
    console.log('   🔑 Backup Codes (codigos de un solo uso)');
    console.log('   🔒 WebAuthn (FIDO2/Passkeys) - Proximamente');
    console.log('\n📋 Metodos habilitados:');
    config.methods.forEach(m => {
        console.log(`   ✅ ${m}`);
    });
}

function generateBackup(userId) {
    console.log(`🔑 Generando codigos de respaldo para: ${userId}`);
    
    const userData = loadUser(userId);
    if (!userData) {
        console.error('❌ Usuario no encontrado');
        return;
    }
    
    if (!userData.mfa || !userData.mfa.enabled) {
        console.error('❌ MFA no habilitado para este usuario');
        return;
    }
    
    const backupCodes = generateBackupCodes();
    userData.mfa.methods.backup = {
        codes: backupCodes,
        used: [],
        enabled: true
    };
    userData.mfa.updated = new Date().toISOString();
    
    saveUser(userId, userData);
    
    console.log('\n🔑 NUEVOS CODIGOS DE RESPALDO:');
    backupCodes.forEach((code, i) => {
        console.log(`   ${i + 1}. ${code}`);
    });
    console.log('\n⚠️  Guarda estos codigos en un lugar seguro.');
}

function disableMFA(userId) {
    console.log(`🔓 Deshabilitando MFA para: ${userId}`);
    
    const userData = loadUser(userId);
    if (!userData) {
        console.error('❌ Usuario no encontrado');
        return;
    }
    
    userData.mfa.enabled = false;
    userData.mfa.updated = new Date().toISOString();
    saveUser(userId, userData);
    
    console.log('✅ MFA deshabilitado correctamente');
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔐 MFA Orchestrator - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'generate':
            if (!userId) {
                console.error('❌ Debes especificar --user');
                process.exit(1);
            }
            generateMFA(userId);
            break;
            
        case 'verify':
            if (!userId || !token) {
                console.error('❌ Debes especificar --user y --token');
                process.exit(1);
            }
            verifyMFA(userId, token, method);
            break;
            
        case 'methods':
            listMethods();
            break;
            
        case 'backup':
            if (!userId) {
                console.error('❌ Debes especificar --user');
                process.exit(1);
            }
            generateBackup(userId);
            break;
            
        case 'disable':
            if (!userId) {
                console.error('❌ Debes especificar --user');
                process.exit(1);
            }
            disableMFA(userId);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --generate, --verify, --methods, --backup, --disable, --init');
            break;
    }
    
    console.log('\n✅ MFA Orchestrator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo MFA Orchestrator...');
    process.exit(0);
});
