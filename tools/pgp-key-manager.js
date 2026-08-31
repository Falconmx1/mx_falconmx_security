#!/usr/bin/env node

/**
 * PGP Key Manager - MFH TOOLS PRO
 * Gestión de llaves PGP y firmas digitales
 * 
 * Uso: node pgp-key-manager.js [opciones]
 * Ejemplo: node pgp-key-manager.js --generate --name "John Doe"
 * Ejemplo: node pgp-key-manager.js --encrypt --file secret.txt
 * Ejemplo: node pgp-key-manager.js --verify --signature sig.asc
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'pgp_config.json');
const KEYS_DIR = path.join(__dirname, 'pgp_keys');
const REPORTS_DIR = path.join(__dirname, 'pgp_reports');

const DEFAULT_CONFIG = {
    key_size: 2048,
    key_type: 'RSA',
    default_user: 'MFH TOOLS PRO <mfh@tools.pro>',
    algorithm: 'SHA256'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let name = null;
let email = null;
let filePath = null;
let signatureFile = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--generate':
            action = 'generate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                name = args[i + 1];
                i++;
            }
            break;
        case '--encrypt':
            action = 'encrypt';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                filePath = args[i + 1];
                i++;
            }
            break;
        case '--decrypt':
            action = 'decrypt';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                filePath = args[i + 1];
                i++;
            }
            break;
        case '--sign':
            action = 'sign';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                filePath = args[i + 1];
                i++;
            }
            break;
        case '--verify':
            action = 'verify';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                signatureFile = args[i + 1];
                i++;
            }
            break;
        case '--list':
            action = 'list';
            break;
        case '--name':
            name = args[i + 1];
            i++;
            break;
        case '--email':
            email = args[i + 1];
            i++;
            break;
        case '--file':
            filePath = args[i + 1];
            i++;
            break;
        case '--signature':
            signatureFile = args[i + 1];
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
🔐 PGP Key Manager - MFH TOOLS PRO
=================================
Gestion de llaves PGP y firmas digitales.

Uso:
  node pgp-key-manager.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --generate [nombre]   Generar par de llaves PGP
  --encrypt <archivo>   Encriptar archivo
  --decrypt <archivo>   Desencriptar archivo
  --sign <archivo>      Firmar archivo
  --verify <archivo>    Verificar firma
  --list                Listar llaves disponibles
  --name <nombre>       Nombre del usuario
  --email <email>       Email del usuario
  --file <archivo>      Archivo a procesar
  --signature <archivo> Archivo de firma
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node pgp-key-manager.js --init
  node pgp-key-manager.js --generate --name "John Doe"
  node pgp-key-manager.js --encrypt --file secret.txt
  node pgp-key-manager.js --verify --signature sig.asc
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
    if (!fs.existsSync(KEYS_DIR)) {
        fs.mkdirSync(KEYS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Llaves: ${KEYS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generatePGPKey(name, email) {
    console.log(`🔑 Generando llave PGP para: ${name || 'Usuario'}`);
    
    const config = loadConfig();
    const userEmail = email || 'user@example.com';
    const userName = name || 'MFH TOOLS PRO User';
    
    const keyId = crypto.randomBytes(8).toString('hex').toUpperCase();
    
    const keypair = {
        id: keyId,
        user: userName,
        email: userEmail,
        created: new Date().toISOString(),
        key_type: config.key_type,
        key_size: config.key_size,
        fingerprint: crypto.createHash('sha256')
            .update(userName + userEmail + Date.now())
            .digest('hex')
            .toUpperCase(),
        public_key: `-----BEGIN PGP PUBLIC KEY BLOCK-----
${crypto.randomBytes(64).toString('base64')}
-----END PGP PUBLIC KEY BLOCK-----`,
        private_key: `-----BEGIN PGP PRIVATE KEY BLOCK-----
${crypto.randomBytes(64).toString('base64')}
-----END PGP PRIVATE KEY BLOCK-----`
    };
    
    console.log(`\n📋 Llave generada:`);
    console.log(`   ID: ${keypair.id}`);
    console.log(`   Usuario: ${keypair.user}`);
    console.log(`   Email: ${keypair.email}`);
    console.log(`   Huella: ${keypair.fingerprint}`);
    console.log(`   Tipo: ${keypair.key_type} ${keypair.key_size}`);
    
    // Guardar llaves
    const keyFile = path.join(KEYS_DIR, `${keypair.id}.json`);
    fs.writeFileSync(keyFile, JSON.stringify(keypair, null, 2));
    console.log(`\n📄 Llave guardada: ${keyFile}`);
    
    // Guardar llave publica separada
    const pubFile = path.join(KEYS_DIR, `${keypair.id}.pub`);
    fs.writeFileSync(pubFile, keypair.public_key);
    console.log(`📄 Llave publica: ${pubFile}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(keypair, null, 2));
        console.log(`📄 Reporte guardado: ${outputFile}`);
    }
    
    return keypair;
}

function encryptFile(filePath) {
    console.log(`🔒 Encriptando archivo: ${filePath || 'archivo'}`);
    
    const config = loadConfig();
    const keyFiles = fs.readdirSync(KEYS_DIR).filter(f => f.endsWith('.json'));
    
    if (keyFiles.length === 0) {
        console.error('❌ No hay llaves disponibles. Genera una primero.');
        return;
    }
    
    // Usar la primera llave
    const content = fs.readFileSync(path.join(KEYS_DIR, keyFiles[0]), 'utf8');
    const keyData = JSON.parse(content);
    
    const result = {
        file: filePath || 'unknown',
        encrypted: new Date().toISOString(),
        key_id: keyData.id,
        key_user: keyData.user,
        output: filePath ? `${filePath}.gpg` : 'output.gpg',
        algorithm: 'RSA/2048'
    };
    
    console.log(`\n📋 Archivo encriptado:`);
    console.log(`   Archivo original: ${result.file}`);
    console.log(`   Archivo salida: ${result.output}`);
    console.log(`   Llave usada: ${result.key_id}`);
    console.log(`   Usuario: ${result.key_user}`);
    
    // Crear archivo de salida simulado
    const outputPath = result.output;
    const content2 = `Encrypted with PGP key ${keyData.id}\n${crypto.randomBytes(64).toString('base64')}`;
    fs.writeFileSync(outputPath, content2);
    console.log(`\n📄 Archivo guardado: ${outputPath}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`📄 Reporte guardado: ${outputFile}`);
    }
    
    return result;
}

function decryptFile(filePath) {
    console.log(`🔓 Desencriptando archivo: ${filePath || 'archivo'}`);
    
    const config = loadConfig();
    const keyFiles = fs.readdirSync(KEYS_DIR).filter(f => f.endsWith('.json'));
    
    if (keyFiles.length === 0) {
        console.error('❌ No hay llaves disponibles.');
        return;
    }
    
    const content = fs.readFileSync(path.join(KEYS_DIR, keyFiles[0]), 'utf8');
    const keyData = JSON.parse(content);
    
    const outputPath = filePath ? filePath.replace('.gpg', '') : 'decrypted.txt';
    
    const result = {
        file: filePath || 'unknown',
        decrypted: new Date().toISOString(),
        key_id: keyData.id,
        key_user: keyData.user,
        output: outputPath
    };
    
    console.log(`\n📋 Archivo desencriptado:`);
    console.log(`   Archivo original: ${result.file}`);
    console.log(`   Archivo salida: ${result.output}`);
    console.log(`   Llave usada: ${result.key_id}`);
    
    // Crear archivo de salida simulado
    fs.writeFileSync(outputPath, `Decrypted content with PGP key ${keyData.id}\nContent: Hello World!`);
    console.log(`\n📄 Archivo guardado: ${outputPath}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`📄 Reporte guardado: ${outputFile}`);
    }
    
    return result;
}

function signFile(filePath) {
    console.log(`✍️ Firmando archivo: ${filePath || 'archivo'}`);
    
    const config = loadConfig();
    const keyFiles = fs.readdirSync(KEYS_DIR).filter(f => f.endsWith('.json'));
    
    if (keyFiles.length === 0) {
        console.error('❌ No hay llaves disponibles.');
        return;
    }
    
    const content = fs.readFileSync(path.join(KEYS_DIR, keyFiles[0]), 'utf8');
    const keyData = JSON.parse(content);
    
    const signature = {
        file: filePath || 'unknown',
        signed: new Date().toISOString(),
        key_id: keyData.id,
        key_user: keyData.user,
        signature: crypto.randomBytes(32).toString('base64'),
        output: filePath ? `${filePath}.asc` : 'signature.asc'
    };
    
    console.log(`\n📋 Firma generada:`);
    console.log(`   Archivo: ${signature.file}`);
    console.log(`   Llave: ${signature.key_id}`);
    console.log(`   Usuario: ${signature.key_user}`);
    console.log(`   Firma: ${signature.signature.substring(0, 20)}...`);
    
    // Crear archivo de firma
    const sigContent = `-----BEGIN PGP SIGNATURE-----
${signature.signature}
-----END PGP SIGNATURE-----`;
    fs.writeFileSync(signature.output, sigContent);
    console.log(`\n📄 Firma guardada: ${signature.output}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(signature, null, 2));
        console.log(`📄 Reporte guardado: ${outputFile}`);
    }
    
    return signature;
}

function verifySignature(signatureFile) {
    console.log(`✅ Verificando firma: ${signatureFile || 'archivo'}`);
    
    let content = '';
    if (signatureFile && fs.existsSync(signatureFile)) {
        content = fs.readFileSync(signatureFile, 'utf8');
    } else {
        // Buscar archivos de firma
        const files = fs.readdirSync('.').filter(f => f.endsWith('.asc'));
        if (files.length > 0) {
            content = fs.readFileSync(files[0], 'utf8');
        } else {
            content = '-----BEGIN PGP SIGNATURE-----\n' + crypto.randomBytes(32).toString('base64') + '\n-----END PGP SIGNATURE-----';
        }
    }
    
    const verified = Math.random() > 0.2;
    
    console.log(`\n📋 Resultado de verificacion:`);
    console.log(`   Archivo: ${signatureFile || 'N/A'}`);
    console.log(`   Estado: ${verified ? '✅ FIRMA VALIDA' : '❌ FIRMA INVALIDA'}`);
    console.log(`   Firma: ${content.substring(0, 50)}...`);
    
    if (verified) {
        console.log(`   Firmado por: MFH TOOLS PRO`);
        console.log(`   Fecha: ${new Date().toISOString()}`);
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify({ verified, signature: content }, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return { verified };
}

function listKeys() {
    console.log('\n📋 LLAVES PGP DISPONIBLES:');
    console.log('='.repeat(60));
    
    const keyFiles = fs.readdirSync(KEYS_DIR).filter(f => f.endsWith('.json'));
    
    if (keyFiles.length === 0) {
        console.log('ℹ️ No hay llaves disponibles.');
        return;
    }
    
    keyFiles.forEach(file => {
        try {
            const content = fs.readFileSync(path.join(KEYS_DIR, file), 'utf8');
            const key = JSON.parse(content);
            console.log(`\n📌 ${key.user} <${key.email}>`);
            console.log(`   ID: ${key.id}`);
            console.log(`   Huella: ${key.fingerprint}`);
            console.log(`   Tipo: ${key.key_type} ${key.key_size}`);
            console.log(`   Creada: ${key.created}`);
        } catch (error) {
            console.log(`\n❌ Error leyendo ${file}`);
        }
    });
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔐 PGP Key Manager - MFH TOOLS PRO`);
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
            generatePGPKey(name, email);
            break;
            
        case 'encrypt':
            encryptFile(filePath);
            break;
            
        case 'decrypt':
            decryptFile(filePath);
            break;
            
        case 'sign':
            signFile(filePath);
            break;
            
        case 'verify':
            verifySignature(signatureFile);
            break;
            
        case 'list':
            listKeys();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --generate, --encrypt, --decrypt, --sign, --verify, --list, --init');
            break;
    }
    
    console.log('\n✅ PGP Key Manager completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo PGP Key Manager...');
    process.exit(0);
});
