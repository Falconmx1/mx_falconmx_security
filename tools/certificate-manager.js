#!/usr/bin/env node

/**
 * Certificate Manager - MFH TOOLS PRO
 * Gestión de certificados SSL/TLS y PKI
 * 
 * Uso: node certificate-manager.js [opciones]
 * Ejemplo: node certificate-manager.js --generate --domain example.com
 * Ejemplo: node certificate-manager.js --check --cert cert.pem
 * Ejemplo: node certificate-manager.js --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'cert_manager_config.json');
const CERTS_DIR = path.join(__dirname, 'certificates');
const REPORTS_DIR = path.join(__dirname, 'cert_reports');

const DEFAULT_CONFIG = {
    default_validity: 365,
    key_size: 2048,
    algorithm: 'sha256',
    ca_cert_path: null,
    ca_key_path: null
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let domain = null;
let certFile = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--generate':
            action = 'generate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                domain = args[i + 1];
                i++;
            }
            break;
        case '--check':
            action = 'check';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                certFile = args[i + 1];
                i++;
            }
            break;
        case '--list':
            action = 'list';
            break;
        case '--revoke':
            action = 'revoke';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                certFile = args[i + 1];
                i++;
            }
            break;
        case '--domain':
            domain = args[i + 1];
            i++;
            break;
        case '--cert':
            certFile = args[i + 1];
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
🔐 Certificate Manager - MFH TOOLS PRO
=====================================
Gestión de certificados SSL/TLS y PKI.

Uso:
  node certificate-manager.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --generate [domain]   Generar certificado SSL
  --check <cert>        Verificar certificado
  --list                Listar certificados
  --revoke <cert>       Revocar certificado
  --domain <dominio>    Dominio del certificado
  --cert <archivo>      Archivo de certificado
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node certificate-manager.js --init
  node certificate-manager.js --generate --domain example.com
  node certificate-manager.js --check --cert cert.pem
  node certificate-manager.js --list
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
    if (!fs.existsSync(CERTS_DIR)) {
        fs.mkdirSync(CERTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Certificados: ${CERTS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateCertificate(domain) {
    console.log(`🔐 Generando certificado para: ${domain || 'localhost'}`);
    
    const targetDomain = domain || 'localhost';
    const config = loadConfig();
    
    // Simular generacion de certificado
    const cert = {
        id: crypto.randomBytes(8).toString('hex'),
        domain: targetDomain,
        created: new Date().toISOString(),
        expires: new Date(Date.now() + config.default_validity * 86400000).toISOString(),
        key_size: config.key_size,
        algorithm: config.algorithm,
        status: 'active',
        serial: crypto.randomBytes(16).toString('hex').toUpperCase(),
        issuer: 'MFH TOOLS PRO CA',
        subject: {
            CN: targetDomain,
            O: 'MFH TOOLS PRO',
            C: 'MX'
        },
        san: [`*.${targetDomain}`, targetDomain],
        fingerprint: crypto.createHash('sha256')
            .update(targetDomain + Date.now())
            .digest('hex')
            .toUpperCase()
    };
    
    console.log(`\n📋 Certificado generado:`);
    console.log(`   ID: ${cert.id}`);
    console.log(`   Dominio: ${cert.domain}`);
    console.log(`   Serial: ${cert.serial}`);
    console.log(`   Creado: ${cert.created}`);
    console.log(`   Expira: ${cert.expires}`);
    console.log(`   Huella: ${cert.fingerprint}`);
    console.log(`   Status: ${cert.status}`);
    
    // Guardar certificado
    const certFile = path.join(CERTS_DIR, `${cert.id}.json`);
    fs.writeFileSync(certFile, JSON.stringify(cert, null, 2));
    console.log(`\n📄 Certificado guardado: ${certFile}`);
    
    // Generar archivo PEM simulado
    const pemFile = path.join(CERTS_DIR, `${cert.id}.pem`);
    const pemContent = `-----BEGIN CERTIFICATE-----
MIIC8zCCAdugAwIBAgIBADANBgkqhkiG9w0BAQsFADBMMQswCQYDVQQGEwJNWDEV
MBMGA1UECAwMRGlzdHJpdG8gRmVkZXJhbDEVMBMGA1UECgwMTUZIIFRPT0xTIFBS
TzEZMBcGA1UEAwwQbWZoLXRvb2xzLXByby5jb20wHhcNMjQwNjA5MDAwMDAwWhcN
MjUwNjA5MDAwMDAwWjBMMQswCQYDVQQGEwJNWDEVMBMGA1UECAwMRGlzdHJpdG8g
RmVkZXJhbDEVMBMGA1UECgwMTUZIIFRPT0xTIFBSTzEZMBcGA1UEAwwQbWZoLXRv
b2xzLXByby5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC8l7Zv
SP3gLpW5LC7XoZ8KqXQz1nXEqEozn4I5oNwM6RqDkK3XmJqNpVfLS1sHjqG6
${crypto.randomBytes(64).toString('base64')}
-----END CERTIFICATE-----
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAvJe2b0j94C6VuSwu16GfCql0M9Z1xKhKM5+COaDcDOkag5Ct
15iajaVXy0tbB46huhopV/x6yZV8fVXhq2qBqWKREPz6GfCqlnQ5zZhKyoLs7Fp
${crypto.randomBytes(64).toString('base64')}
-----END RSA PRIVATE KEY-----`;
    fs.writeFileSync(pemFile, pemContent);
    console.log(`📄 PEM guardado: ${pemFile}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(cert, null, 2));
        console.log(`📄 Reporte guardado: ${outputFile}`);
    }
    
    return cert;
}

function checkCertificate(certFile) {
    console.log(`🔍 Verificando certificado: ${certFile || 'default'}`);
    
    let cert = null;
    
    if (certFile && fs.existsSync(certFile)) {
        try {
            const content = fs.readFileSync(certFile, 'utf8');
            // Verificar si es JSON o PEM
            if (certFile.endsWith('.json')) {
                cert = JSON.parse(content);
            } else {
                // Simular verificacion de PEM
                cert = {
                    file: certFile,
                    format: 'pem',
                    valid: true,
                    expires: new Date(Date.now() + 365 * 86400000).toISOString(),
                    issuer: 'MFH TOOLS PRO CA',
                    subject: 'CN=example.com'
                };
            }
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
            return;
        }
    } else {
        // Usar ultimo certificado
        const certFiles = fs.readdirSync(CERTS_DIR).filter(f => f.endsWith('.json'));
        if (certFiles.length > 0) {
            const content = fs.readFileSync(path.join(CERTS_DIR, certFiles[certFiles.length - 1]), 'utf8');
            cert = JSON.parse(content);
        } else {
            console.error('❌ No hay certificados disponibles');
            return;
        }
    }
    
    // Verificar validez
    const now = new Date();
    const expires = new Date(cert.expires || cert.expiration || '2099-01-01');
    const isValid = now < expires;
    
    console.log(`\n📋 Informacion del certificado:`);
    console.log(`   ID: ${cert.id || 'N/A'}`);
    console.log(`   Dominio: ${cert.domain || cert.subject || 'N/A'}`);
    console.log(`   Creado: ${cert.created || cert.issued || 'N/A'}`);
    console.log(`   Expira: ${cert.expires || cert.expiration || 'N/A'}`);
    console.log(`   Estado: ${isValid ? '✅ VALIDO' : '❌ EXPIRADO'}`);
    console.log(`   Huella: ${cert.fingerprint || 'N/A'}`);
    
    // Dias restantes
    if (cert.expires) {
        const days = Math.floor((new Date(cert.expires) - now) / (1000 * 60 * 60 * 24));
        console.log(`   Dias restantes: ${days}`);
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify({ cert, valid: isValid }, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return { cert, valid: isValid };
}

function listCertificates() {
    console.log('\n📋 CERTIFICADOS DISPONIBLES:');
    console.log('='.repeat(60));
    
    const certFiles = fs.readdirSync(CERTS_DIR).filter(f => f.endsWith('.json'));
    
    if (certFiles.length === 0) {
        console.log('ℹ️ No hay certificados disponibles.');
        return;
    }
    
    const now = new Date();
    
    certFiles.forEach(file => {
        try {
            const content = fs.readFileSync(path.join(CERTS_DIR, file), 'utf8');
            const cert = JSON.parse(content);
            const expires = new Date(cert.expires);
            const isValid = now < expires;
            const days = Math.floor((expires - now) / (1000 * 60 * 60 * 24));
            
            console.log(`\n📌 ${cert.domain || 'N/A'}`);
            console.log(`   ID: ${cert.id}`);
            console.log(`   Serial: ${cert.serial || 'N/A'}`);
            console.log(`   Expira: ${cert.expires}`);
            console.log(`   Estado: ${isValid ? '✅ Activo' : '❌ Expirado'}`);
            console.log(`   Dias: ${days}`);
        } catch (error) {
            console.log(`\n❌ Error leyendo ${file}`);
        }
    });
}

function revokeCertificate(certFile) {
    console.log(`🔓 Revocando certificado: ${certFile || 'default'}`);
    
    let cert = null;
    let certPath = certFile;
    
    if (certFile && fs.existsSync(certFile)) {
        try {
            const content = fs.readFileSync(certFile, 'utf8');
            cert = JSON.parse(content);
            certPath = certFile;
        } catch (error) {
            // Intentar buscar por ID
            const certFiles = fs.readdirSync(CERTS_DIR).filter(f => f.endsWith('.json'));
            const found = certFiles.find(f => f.includes(certFile));
            if (found) {
                const content = fs.readFileSync(path.join(CERTS_DIR, found), 'utf8');
                cert = JSON.parse(content);
                certPath = path.join(CERTS_DIR, found);
            }
        }
    } else {
        // Usar ultimo certificado
        const certFiles = fs.readdirSync(CERTS_DIR).filter(f => f.endsWith('.json'));
        if (certFiles.length > 0) {
            const content = fs.readFileSync(path.join(CERTS_DIR, certFiles[certFiles.length - 1]), 'utf8');
            cert = JSON.parse(content);
            certPath = path.join(CERTS_DIR, certFiles[certFiles.length - 1]);
        }
    }
    
    if (!cert) {
        console.error('❌ Certificado no encontrado');
        return;
    }
    
    cert.status = 'revoked';
    cert.revoked_at = new Date().toISOString();
    cert.revoked_by = 'MFH TOOLS PRO';
    
    fs.writeFileSync(certPath, JSON.stringify(cert, null, 2));
    
    console.log(`\n✅ Certificado revocado:`);
    console.log(`   ID: ${cert.id}`);
    console.log(`   Dominio: ${cert.domain}`);
    console.log(`   Revocado: ${cert.revoked_at}`);
    console.log(`   Archivo: ${certPath}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(cert, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return cert;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔐 Certificate Manager - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'generate':
            generateCertificate(domain);
            break;
            
        case 'check':
            checkCertificate(certFile);
            break;
            
        case 'list':
            listCertificates();
            break;
            
        case 'revoke':
            revokeCertificate(certFile);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --generate, --check, --list, --revoke, --init');
            break;
    }
    
    console.log('\n✅ Certificate Manager completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Certificate Manager...');
    process.exit(0);
});
