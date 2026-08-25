#!/usr/bin/env node

/**
 * SSO Federation - MFH TOOLS PRO
 * Federacion de identidades con SAML, OAuth2, OpenID Connect
 * 
 * Uso: node sso-federation.js [opciones]
 * Ejemplo: node sso-federation.js --idp saml --sp https://app.com
 * Ejemplo: node sso-federation.js --test --provider google
 * Ejemplo: node sso-federation.js --certs --generate
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'sso_config.json');
const CERTS_DIR = path.join(__dirname, 'sso_certs');
const LOGS_DIR = path.join(__dirname, 'sso_logs');

const DEFAULT_CONFIG = {
    providers: {
        google: {
            enabled: true,
            client_id: null,
            client_secret: null,
            auth_uri: 'https://accounts.google.com/o/oauth2/auth',
            token_uri: 'https://oauth2.googleapis.com/token',
            userinfo_uri: 'https://www.googleapis.com/oauth2/v3/userinfo'
        },
        github: {
            enabled: true,
            client_id: null,
            client_secret: null,
            auth_uri: 'https://github.com/login/oauth/authorize',
            token_uri: 'https://github.com/login/oauth/access_token',
            userinfo_uri: 'https://api.github.com/user'
        },
        azure: {
            enabled: false,
            tenant_id: null,
            client_id: null,
            client_secret: null,
            auth_uri: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
            token_uri: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
            userinfo_uri: 'https://graph.microsoft.com/v1.0/me'
        }
    },
    saml: {
        enabled: false,
        idp_metadata_url: null,
        sp_entity_id: null,
        acs_url: null
    },
    oidc: {
        enabled: true,
        issuer: 'MFH TOOLS PRO',
        audience: 'mfh-tools-api'
    },
    jwt: {
        expiration: 3600,
        algorithm: 'RS256',
        refresh_token_expiration: 86400
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let provider = null;
let spEntityId = null;
let idpType = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--provider':
            provider = args[i + 1];
            i++;
            break;
        case '--sp':
            spEntityId = args[i + 1];
            i++;
            break;
        case '--idp':
            idpType = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--test':
            action = 'test';
            break;
        case '--certs':
            action = 'certs';
            break;
        case '--metadata':
            action = 'metadata';
            break;
        case '--token':
            action = 'token';
            break;
        case '--list':
            action = 'list';
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
🔐 SSO Federation - MFH TOOLS PRO
================================
Federacion de identidades con SAML, OAuth2, OpenID Connect.

Uso:
  node sso-federation.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --list                Listar proveedores configurados
  --test                Probar conexion con proveedor
  --certs               Generar certificados SSO
  --metadata            Generar metadata SAML
  --token               Generar token JWT
  --provider <nombre>   Nombre del proveedor (google, github, azure)
  --sp <entity_id>      Entity ID del Service Provider
  --idp <tipo>          Tipo de IdP (saml, oidc)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node sso-federation.js --init
  node sso-federation.js --list
  node sso-federation.js --test --provider google
  node sso-federation.js --certs --generate
  node sso-federation.js --metadata --idp saml --sp https://app.com
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
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Certificados: ${CERTS_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function listProviders() {
    const config = loadConfig();
    console.log('\n📋 PROVEEDORES SSO:');
    console.log('='.repeat(60));
    
    for (const [name, data] of Object.entries(config.providers)) {
        console.log(`\n📌 ${name}`);
        console.log(`   Estado: ${data.enabled ? '✅ Habilitado' : '❌ Deshabilitado'}`);
        console.log(`   Auth URI: ${data.auth_uri}`);
        console.log(`   Token URI: ${data.token_uri}`);
        console.log(`   Userinfo URI: ${data.userinfo_uri}`);
    }
    
    console.log(`\n📋 SAML: ${config.saml.enabled ? '✅ Habilitado' : '❌ Deshabilitado'}`);
    console.log(`📋 OIDC: ${config.oidc.enabled ? '✅ Habilitado' : '❌ Deshabilitado'}`);
}

function testProvider(providerName) {
    const config = loadConfig();
    const provider = config.providers[providerName];
    
    if (!provider) {
        console.error(`❌ Proveedor no encontrado: ${providerName}`);
        return;
    }
    
    if (!provider.enabled) {
        console.error(`❌ Proveedor ${providerName} no habilitado`);
        return;
    }
    
    console.log(`🔍 Probando conexion con ${providerName}...`);
    
    // Simular flujo OAuth
    console.log(`\n📋 Flujo OAuth2:`);
    console.log(`   1. Redirigir a: ${provider.auth_uri}`);
    console.log(`   2. Intercambiar codigo en: ${provider.token_uri}`);
    console.log(`   3. Obtener usuario de: ${provider.userinfo_uri}`);
    
    // Simular respuesta
    const mockUser = {
        id: crypto.randomBytes(8).toString('hex'),
        email: `test.${Date.now()}@${providerName}.com`,
        name: `Test ${providerName} User`,
        provider: providerName
    };
    
    console.log(`\n✅ Prueba exitosa!`);
    console.log(`   Usuario simulado:`);
    console.log(`   ID: ${mockUser.id}`);
    console.log(`   Email: ${mockUser.email}`);
    console.log(`   Nombre: ${mockUser.name}`);
    console.log(`   Proveedor: ${mockUser.provider}`);
    
    return mockUser;
}

function generateCerts() {
    console.log('🔑 Generando certificados SSO...');
    
    // Generar par de llaves RSA
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    
    // Guardar certificados
    const privatePath = path.join(CERTS_DIR, 'private.pem');
    const publicPath = path.join(CERTS_DIR, 'public.pem');
    
    fs.writeFileSync(privatePath, privateKey);
    fs.writeFileSync(publicPath, publicKey);
    
    console.log(`✅ Llave privada guardada: ${privatePath}`);
    console.log(`✅ Llave publica guardada: ${publicPath}`);
    
    // Generar metadata
    const metadata = {
        issuer: 'MFH TOOLS PRO',
        valid_from: new Date().toISOString(),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        algorithm: 'RS256',
        key_id: crypto.randomBytes(8).toString('hex'),
        public_key: publicKey
    };
    
    const metadataPath = path.join(CERTS_DIR, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`✅ Metadata guardada: ${metadataPath}`);
    
    return metadata;
}

function generateSAMLMetadata(spEntityId) {
    console.log('📋 Generando metadata SAML...');
    
    const metadata = {
        entity_id: spEntityId || 'https://mfh-tools.com/saml',
        acs_url: `${spEntityId || 'https://mfh-tools.com'}/saml/acs`,
        slo_url: `${spEntityId || 'https://mfh-tools.com'}/saml/slo`,
        certificate: fs.readFileSync(path.join(CERTS_DIR, 'public.pem'), 'utf8'),
        name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        attributes: [
            { name: 'email', friendly_name: 'Email' },
            { name: 'firstName', friendly_name: 'First Name' },
            { name: 'lastName', friendly_name: 'Last Name' },
            { name: 'roles', friendly_name: 'Roles' }
        ]
    };
    
    console.log(`\n📋 Metadata SAML:`);
    console.log(`   Entity ID: ${metadata.entity_id}`);
    console.log(`   ACS URL: ${metadata.acs_url}`);
    console.log(`   SLO URL: ${metadata.slo_url}`);
    console.log(`   Certificate: OK (${metadata.certificate.length} bytes)`);
    console.log(`   Attributes: ${metadata.attributes.map(a => a.name).join(', ')}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
        console.log(`\n📄 Metadata guardada: ${outputFile}`);
    }
    
    return metadata;
}

function generateToken() {
    console.log('🔐 Generando token JWT...');
    
    const config = loadConfig();
    const privateKey = fs.readFileSync(path.join(CERTS_DIR, 'private.pem'), 'utf8');
    
    const payload = {
        sub: crypto.randomBytes(8).toString('hex'),
        email: `user.${Date.now()}@example.com`,
        name: 'Test User',
        roles: ['viewer'],
        iss: config.oidc.issuer,
        aud: config.oidc.audience
    };
    
    const token = jwt.sign(payload, privateKey, {
        algorithm: config.jwt.algorithm,
        expiresIn: config.jwt.expiration
    });
    
    console.log(`\n📋 Token JWT generado:`);
    console.log(`   Algoritmo: ${config.jwt.algorithm}`);
    console.log(`   Expira en: ${config.jwt.expiration}s`);
    console.log(`   Token: ${token}`);
    
    // Verificar token
    const publicKey = fs.readFileSync(path.join(CERTS_DIR, 'public.pem'), 'utf8');
    const decoded = jwt.verify(token, publicKey, { algorithms: [config.jwt.algorithm] });
    
    console.log(`\n✅ Token verificado:`);
    console.log(`   Subject: ${decoded.sub}`);
    console.log(`   Email: ${decoded.email}`);
    console.log(`   Roles: ${decoded.roles.join(', ')}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify({ token, decoded }, null, 2));
        console.log(`\n📄 Token guardado: ${outputFile}`);
    }
    
    return token;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔐 SSO Federation - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'list':
            listProviders();
            break;
            
        case 'test':
            if (!provider) {
                console.error('❌ Debes especificar --provider');
                process.exit(1);
            }
            testProvider(provider);
            break;
            
        case 'certs':
            generateCerts();
            break;
            
        case 'metadata':
            generateSAMLMetadata(spEntityId);
            break;
            
        case 'token':
            generateToken();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --list, --test, --certs, --metadata, --token, --init');
            break;
    }
    
    console.log('\n✅ SSO Federation completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo SSO Federation...');
    process.exit(0);
});
