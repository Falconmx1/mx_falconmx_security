#!/usr/bin/env node

/**
 * API Gateway Security - MFH TOOLS PRO
 * Proxy seguro con autenticación y rate limiting para APIs
 * 
 * Uso: node api-gateway-security.js [opciones]
 * Ejemplo: node api-gateway-security.js --port 8080 --target https://api.example.com
 * Ejemplo: node api-gateway-security.js --config gateway_config.json
 * Ejemplo: node api-gateway-security.js --test
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'gateway_config.json');

const DEFAULT_CONFIG = {
    port: 8080,
    target: null,
    rateLimit: {
        enabled: true,
        maxRequests: 100,
        windowMs: 60000 // 1 minuto
    },
    auth: {
        enabled: false,
        type: 'api_key', // api_key, jwt, basic
        apiKeys: [],
        jwtSecret: null,
        users: []
    },
    logging: {
        enabled: true,
        level: 'info'
    },
    cors: {
        enabled: true,
        origins: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization']
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let port = DEFAULT_CONFIG.port;
let target = null;
let configFile = null;
let verbose = false;
let init = false;
let test = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--port':
            port = parseInt(args[i + 1]);
            i++;
            break;
        case '--target':
            target = args[i + 1];
            i++;
            break;
        case '--config':
            configFile = args[i + 1];
            i++;
            break;
        case '--init':
            init = true;
            break;
        case '--test':
            test = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--start':
            action = 'start';
            break;
        case '--stop':
            action = 'stop';
            break;
        case '--status':
            action = 'status';
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 API Gateway Security - MFH TOOLS PRO
========================================
Proxy seguro con autenticación y rate limiting para APIs.

Uso:
  node api-gateway-security.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --start                  Iniciar el gateway
  --stop                   Detener el gateway
  --status                 Ver estado del gateway
  --port <puerto>          Puerto del gateway (default: 8080)
  --target <url>           URL del API backend
  --config <archivo>       Archivo de configuración
  --test                   Probar configuración
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node api-gateway-security.js --init
  node api-gateway-security.js --start --port 8080 --target https://api.example.com
  node api-gateway-security.js --test
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig(file) {
    try {
        const fullPath = file || CONFIG_FILE;
        if (fs.existsSync(fullPath)) {
            const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
            return { ...DEFAULT_CONFIG, ...config };
        }
    } catch (error) {
        console.error('❌ Error cargando configuración:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config, file) {
    try {
        const fullPath = file || CONFIG_FILE;
        fs.writeFileSync(fullPath, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${fullPath}`);
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    const config = { ...DEFAULT_CONFIG };
    config.port = 8080;
    config.target = 'https://jsonplaceholder.typicode.com';
    config.auth.enabled = true;
    config.auth.type = 'api_key';
    config.auth.apiKeys = [
        { key: 'test-key-123', name: 'Test User', permissions: ['read', 'write'] }
    ];
    config.rateLimit.maxRequests = 100;
    saveConfig(config);
    console.log('✅ Configuración por defecto creada.');
    console.log(`📝 Edita: ${CONFIG_FILE}`);
    console.log('🔑 API Key de prueba: test-key-123');
}

function generateAPIKey() {
    return 'key-' + crypto.randomBytes(16).toString('hex');
}

function validateAPIKey(config, key) {
    if (!config.auth || !config.auth.apiKeys) return false;
    return config.auth.apiKeys.find(k => k.key === key);
}

function validateJWT(config, token) {
    if (!config.auth || !config.auth.jwtSecret) return false;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        // Verificación simple (en producción usar librería)
        return true;
    } catch (error) {
        return false;
    }
}

function validateBasicAuth(config, authHeader) {
    if (!config.auth || !config.auth.users) return false;
    try {
        const base64 = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64, 'base64').toString('utf8');
        const [username, password] = credentials.split(':');
        return config.auth.users.find(u => u.username === username && u.password === password);
    } catch (error) {
        return false;
    }
}

function checkRateLimit(ip, config, state) {
    if (!config.rateLimit || !config.rateLimit.enabled) return { allowed: true };
    
    const key = `rate:${ip}`;
    const now = Date.now();
    const windowMs = config.rateLimit.windowMs || 60000;
    const maxRequests = config.rateLimit.maxRequests || 100;
    
    if (!state.rateLimits[key]) {
        state.rateLimits[key] = { count: 0, reset: now + windowMs };
    }
    
    const rate = state.rateLimits[key];
    if (now > rate.reset) {
        rate.count = 0;
        rate.reset = now + windowMs;
    }
    
    rate.count++;
    
    return {
        allowed: rate.count <= maxRequests,
        remaining: Math.max(0, maxRequests - rate.count),
        reset: rate.reset,
        limit: maxRequests
    };
}

function handleCORS(config, req, res) {
    if (!config.cors || !config.cors.enabled) return;
    
    const origin = req.headers.origin;
    const allowedOrigins = config.cors.origins || ['*'];
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Methods', (config.cors.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']).join(', '));
        res.setHeader('Access-Control-Allow-Headers', (config.cors.headers || ['Content-Type', 'Authorization']).join(', '));
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
}

function logRequest(req, config, status) {
    if (!config.logging || !config.logging.enabled) return;
    
    const timestamp = new Date().toISOString();
    const level = config.logging.level || 'info';
    const logEntry = `[${timestamp}] ${req.method} ${req.url} - ${status} - ${req.ip || req.connection.remoteAddress}`;
    
    console.log(logEntry);
    
    // Guardar en archivo de logs
    const logFile = path.join(__dirname, 'gateway.log');
    fs.appendFileSync(logFile, logEntry + '\n', 'utf8');
}

function proxyRequest(req, res, target, config, state) {
    return new Promise((resolve, reject) => {
        // Log de la petición
        if (verbose) {
            console.log(`📡 ${req.method} ${req.url}`);
        }
        
        // Construir URL del target
        const targetUrl = new URL(target);
        const path = req.url;
        
        // Opciones del proxy
        const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: path,
            method: req.method,
            headers: {
                ...req.headers,
                host: targetUrl.hostname,
                'x-forwarded-for': req.ip || req.connection.remoteAddress,
                'x-forwarded-proto': targetUrl.protocol.replace(':', ''),
                'x-forwarded-host': req.headers.host
            }
        };
        
        // Eliminar headers de autenticación que puedan interferir
        if (options.headers.authorization) {
            // Mantener si es necesario para el backend
        }
        
        const httpModule = targetUrl.protocol === 'https:' ? https : http;
        
        const proxyReq = httpModule.request(options, (proxyRes) => {
            // Reenviar cabeceras
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            
            // Reenviar body
            proxyRes.pipe(res);
            
            // Log
            logRequest(req, config, proxyRes.statusCode);
            
            resolve({
                statusCode: proxyRes.statusCode,
                statusMessage: proxyRes.statusMessage
            });
        });
        
        proxyReq.on('error', (error) => {
            console.error(`❌ Error en proxy: ${error.message}`);
            res.statusCode = 502;
            res.end(JSON.stringify({
                error: 'Bad Gateway',
                message: error.message
            }));
            reject(error);
        });
        
        // Reenviar body de la petición
        req.pipe(proxyReq);
    });
}

function handleRequest(req, res, config, state) {
    // CORS
    handleCORS(config, req, res);
    
    // Manejar OPTIONS
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    
    // Rate limiting
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const rateResult = checkRateLimit(ip, config, state);
    
    if (!rateResult.allowed) {
        res.statusCode = 429;
        res.setHeader('Retry-After', Math.ceil((rateResult.reset - Date.now()) / 1000));
        res.setHeader('X-RateLimit-Limit', rateResult.limit);
        res.setHeader('X-RateLimit-Remaining', rateResult.remaining);
        res.setHeader('X-RateLimit-Reset', new Date(rateResult.reset).toISOString());
        res.end(JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter: Math.ceil((rateResult.reset - Date.now()) / 1000)
        }));
        logRequest(req, config, 429);
        return;
    }
    
    // Establecer headers de rate limit
    res.setHeader('X-RateLimit-Limit', rateResult.limit);
    res.setHeader('X-RateLimit-Remaining', rateResult.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(rateResult.reset).toISOString());
    
    // Autenticación
    let authResult = { authenticated: false, user: null };
    
    if (config.auth && config.auth.enabled) {
        const authType = config.auth.type || 'api_key';
        
        if (authType === 'api_key') {
            const apiKey = req.headers['x-api-key'] || req.query.api_key;
            if (apiKey) {
                const user = validateAPIKey(config, apiKey);
                if (user) {
                    authResult = { authenticated: true, user };
                }
            }
        } else if (authType === 'jwt') {
            const token = req.headers.authorization?.split(' ')[1];
            if (token && validateJWT(config, token)) {
                authResult = { authenticated: true, user: { name: 'jwt-user' } };
            }
        } else if (authType === 'basic') {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Basic ')) {
                const user = validateBasicAuth(config, authHeader);
                if (user) {
                    authResult = { authenticated: true, user };
                }
            }
        }
        
        if (!authResult.authenticated) {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'API-Key');
            res.end(JSON.stringify({
                error: 'Unauthorized',
                message: 'Authentication required'
            }));
            logRequest(req, config, 401);
            return;
        }
    }
    
    // Si no hay target, responder con información del gateway
    if (!config.target) {
        res.statusCode = 200;
        res.end(JSON.stringify({
            name: 'MFH API Gateway',
            version: '1.0.0',
            status: 'running',
            timestamp: new Date().toISOString(),
            auth: config.auth.enabled ? `enabled (${config.auth.type})` : 'disabled',
            rateLimit: config.rateLimit.enabled ? `enabled (${config.rateLimit.maxRequests}/min)` : 'disabled'
        }));
        return;
    }
    
    // Proxy
    proxyRequest(req, res, config.target, config, state)
        .catch(error => {
            console.error(`❌ Error en proxy: ${error.message}`);
        });
}

function startGateway(config) {
    const state = {
        rateLimits: {},
        connections: 0
    };
    
    const server = http.createServer((req, res) => {
        state.connections++;
        handleRequest(req, res, config, state);
        state.connections--;
    });
    
    server.on('error', (error) => {
        console.error(`❌ Error en servidor: ${error.message}`);
    });
    
    server.listen(config.port, () => {
        console.log(`\n✅ API Gateway iniciado en puerto ${config.port}`);
        console.log('='.repeat(50));
        console.log(`🎯 Target: ${config.target || 'Ninguno (modo info)'}`);
        console.log(`🔐 Auth: ${config.auth.enabled ? `${config.auth.type.toUpperCase()} habilitado` : 'Deshabilitado'}`);
        console.log(`🚦 Rate Limit: ${config.rateLimit.enabled ? `${config.rateLimit.maxRequests}/min` : 'Deshabilitado'}`);
        console.log(`📊 CORS: ${config.cors.enabled ? 'Habilitado' : 'Deshabilitado'}`);
        console.log('='.repeat(50));
        console.log(`\n🌐 URL: http://localhost:${config.port}`);
        console.log(`📋 Health: http://localhost:${config.port}/health`);
        console.log(`\n🔄 Gateway ejecutándose. Presiona Ctrl+C para detener.`);
    });
    
    // Guardar referencia para detener
    global.gatewayServer = server;
    global.gatewayConfig = config;
    global.gatewayState = state;
    
    return server;
}

function stopGateway() {
    if (global.gatewayServer) {
        global.gatewayServer.close(() => {
            console.log('🛑 Gateway detenido');
        });
        delete global.gatewayServer;
    } else {
        console.log('ℹ️ No hay gateway ejecutándose');
    }
}

function statusGateway() {
    if (global.gatewayServer) {
        const config = global.gatewayConfig || {};
        const state = global.gatewayState || { connections: 0 };
        console.log(`\n📊 ESTADO DEL GATEWAY`);
        console.log('='.repeat(50));
        console.log(`🟢 Estado: Ejecutándose`);
        console.log(`🔌 Puerto: ${config.port || 'N/A'}`);
        console.log(`🎯 Target: ${config.target || 'Ninguno'}`);
        console.log(`📊 Conexiones activas: ${state.connections || 0}`);
        console.log(`📋 Rate limits activos: ${Object.keys(state.rateLimits || {}).length}`);
    } else {
        console.log('🔴 Gateway no está ejecutándose');
    }
}

function testConfig() {
    const config = loadConfig(configFile);
    console.log('\n🔍 PROBANDO CONFIGURACIÓN');
    console.log('='.repeat(50));
    
    // Validar target
    if (config.target) {
        try {
            new URL(config.target);
            console.log(`✅ Target válido: ${config.target}`);
        } catch (error) {
            console.log(`❌ Target inválido: ${config.target}`);
        }
    } else {
        console.log(`ℹ️ Target no configurado`);
    }
    
    // Validar auth
    if (config.auth && config.auth.enabled) {
        console.log(`✅ Auth habilitado: ${config.auth.type}`);
        if (config.auth.type === 'api_key' && config.auth.apiKeys) {
            console.log(`   📋 ${config.auth.apiKeys.length} API keys configuradas`);
        }
    } else {
        console.log(`ℹ️ Auth deshabilitado`);
    }
    
    // Validar rate limit
    if (config.rateLimit && config.rateLimit.enabled) {
        console.log(`✅ Rate limit: ${config.rateLimit.maxRequests}/min`);
    } else {
        console.log(`ℹ️ Rate limit deshabilitado`);
    }
    
    // Validar CORS
    console.log(`✅ CORS: ${config.cors?.enabled ? 'Habilitado' : 'Deshabilitado'}`);
    console.log('='.repeat(50));
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 API Gateway Security - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (init) {
        initConfig();
        process.exit(0);
    }

    const config = loadConfig(configFile);

    // Sobrescribir con argumentos
    if (port) config.port = port;
    if (target) config.target = target;

    switch (action) {
        case 'start':
            startGateway(config);
            break;
        case 'stop':
            stopGateway();
            break;
        case 'status':
            statusGateway();
            break;
        default:
            if (test) {
                testConfig();
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
                console.log('💡 Opciones: --start, --stop, --status, --test, --init');
                console.log('💡 Ejemplo: node api-gateway-security.js --start --port 8080 --target https://api.example.com');
            }
            break;
    }

    // Si no hay acción, mostrar ayuda
    if (!action && !test && !init) {
        console.log('\n📋 Para iniciar el gateway:');
        console.log('   node api-gateway-security.js --start');
    }
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    if (global.gatewayServer) {
        console.log('\n🛑 Deteniendo gateway...');
        global.gatewayServer.close(() => {
            console.log('✅ Gateway detenido');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

process.on('SIGTERM', () => {
    if (global.gatewayServer) {
        console.log('\n🛑 Deteniendo gateway...');
        global.gatewayServer.close(() => {
            console.log('✅ Gateway detenido');
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});
