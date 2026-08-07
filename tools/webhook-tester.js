#!/usr/bin/env node

/**
 * Webhook Tester - MFH TOOLS PRO
 * Prueba webhooks localmente
 * 
 * Uso: node webhook-tester.js [opciones]
 * Ejemplo: node webhook-tester.js --port 3000
 * Ejemplo: node webhook-tester.js --port 3000 --path /webhook --verbose
 * Ejemplo: node webhook-tester.js --ngrok --port 3000
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    port: 3000,
    webhookPath: '/webhook',
    logFile: 'webhook_log.json',
    verbose: false
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--port':
        case '-p':
            CONFIG.port = parseInt(args[i + 1]);
            i++;
            break;
        case '--path':
            CONFIG.webhookPath = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            CONFIG.verbose = true;
            break;
        case '--ngrok':
        case '-n':
            CONFIG.useNgrok = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Webhook Tester - MFH TOOLS PRO
==================================
Prueba webhooks localmente.

Uso:
  node webhook-tester.js [opciones]

Opciones:
  --port, -p <puerto>    Puerto del servidor (default: 3000)
  --path <ruta>          Ruta para el webhook (default: /webhook)
  --verbose, -v          Mostrar más detalles
  --ngrok, -n            Crear túnel ngrok
  --help, -h             Mostrar esta ayuda

Ejemplos:
  node webhook-tester.js --port 8080
  node webhook-tester.js --path /github-webhook
  node webhook-tester.js --ngrok --port 3000
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function logWebhook(data) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        method: data.method,
        headers: data.headers,
        body: data.body,
        query: data.query,
        ip: data.ip
    };
    
    let logs = [];
    try {
        if (fs.existsSync(CONFIG.logFile)) {
            logs = JSON.parse(fs.readFileSync(CONFIG.logFile, 'utf8'));
        }
    } catch (error) {
        // Si hay error, empezar con logs vacíos
    }
    
    logs.push(logEntry);
    
    // Mantener solo los últimos 1000 logs
    if (logs.length > 1000) {
        logs = logs.slice(-1000);
    }
    
    fs.writeFileSync(CONFIG.logFile, JSON.stringify(logs, null, 2));
}

function displayWebhook(data) {
    const separator = '='.repeat(50);
    console.log(`\n📨 WEBHOOK RECIBIDO - ${new Date().toISOString()}`);
    console.log(separator);
    console.log(`📌 Método: ${data.method}`);
    console.log(`📍 IP: ${data.ip}`);
    console.log(`🔗 URL: ${data.url}`);
    console.log(`📋 Headers:`);
    for (const [key, value] of Object.entries(data.headers)) {
        console.log(`   ${key}: ${value}`);
    }
    if (data.query && Object.keys(data.query).length > 0) {
        console.log(`🔍 Query Params:`);
        for (const [key, value] of Object.entries(data.query)) {
            console.log(`   ${key}: ${value}`);
        }
    }
    console.log(`📦 Body:`);
    if (typeof data.body === 'object') {
        console.log(JSON.stringify(data.body, null, 2));
    } else {
        console.log(data.body);
    }
    console.log(separator);
}

function startNgrok(port) {
    console.log('🚀 Iniciando túnel ngrok...');
    const ngrok = exec(`ngrok http ${port}`, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error iniciando ngrok:', error.message);
            console.log('💡 Asegúrate de tener ngrok instalado: npm install -g ngrok');
        }
    });
    
    // Esperar a que ngrok esté listo
    setTimeout(() => {
        console.log('🌐 Verifica la URL pública en: http://localhost:4040');
    }, 2000);
    
    return ngrok;
}

// ==================== MAIN ====================
(async function main() {
    const app = express();
    
    // Middleware para parsear diferentes tipos de body
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(express.text({ limit: '10mb' }));
    app.use(express.raw({ limit: '10mb' }));
    
    // Middleware para logging de requests
    app.use((req, res, next) => {
        if (CONFIG.verbose) {
            console.log(`📡 ${req.method} ${req.path} - ${req.ip}`);
        }
        next();
    });
    
    // Ruta principal del webhook
    app.all(CONFIG.webhookPath, (req, res) => {
        const data = {
            method: req.method,
            headers: req.headers,
            body: req.body,
            query: req.query,
            ip: req.ip || req.connection.remoteAddress,
            url: `${req.protocol}://${req.get('host')}${req.originalUrl}`
        };
        
        // Guardar en log
        logWebhook(data);
        
        // Mostrar en consola
        displayWebhook(data);
        
        // Responder
        res.json({
            status: 'success',
            message: 'Webhook recibido',
            timestamp: new Date().toISOString(),
            received: data
        });
    });
    
    // Ruta para ver estadísticas
    app.get('/stats', (req, res) => {
        let logs = [];
        try {
            if (fs.existsSync(CONFIG.logFile)) {
                logs = JSON.parse(fs.readFileSync(CONFIG.logFile, 'utf8'));
            }
        } catch (error) {
            // Ignorar error
        }
        
        const stats = {
            totalRequests: logs.length,
            lastHour: logs.filter(l => {
                const diff = Date.now() - new Date(l.timestamp).getTime();
                return diff < 3600000;
            }).length,
            methods: {},
            endpoints: {}
        };
        
        for (const log of logs) {
            stats.methods[log.method] = (stats.methods[log.method] || 0) + 1;
            // Simplificado para evitar error si no hay endpoint
        }
        
        res.json(stats);
    });
    
    // Ruta para ver logs recientes
    app.get('/logs', (req, res) => {
        let logs = [];
        try {
            if (fs.existsSync(CONFIG.logFile)) {
                logs = JSON.parse(fs.readFileSync(CONFIG.logFile, 'utf8'));
            }
        } catch (error) {
            // Ignorar error
        }
        
        const limit = parseInt(req.query.limit) || 10;
        res.json(logs.slice(-limit));
    });
    
    // Ruta raíz
    app.get('/', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Webhook Tester - MFH TOOLS PRO</title>
                <style>
                    body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff00; padding: 20px; }
                    h1 { color: #00ff00; }
                    .info { background: #1a1a1a; padding: 15px; border: 1px solid #00ff00; border-radius: 5px; margin: 10px 0; }
                    .endpoint { background: #0a0a0a; padding: 10px; border: 1px solid #00ff00; border-radius: 3px; }
                    .url { color: #00ff00; font-weight: bold; }
                </style>
            </head>
            <body>
                <h1>🔍 Webhook Tester</h1>
                <div class="info">
                    <p>📌 Webhook URL: <span class="url">${CONFIG.webhookPath}</span></p>
                    <p>📊 Stats: <a href="/stats" style="color:#00ff00;">/stats</a></p>
                    <p>📋 Logs: <a href="/logs" style="color:#00ff00;">/logs</a></p>
                </div>
                <div class="endpoint">
                    <p>🔗 Envía peticiones a: <span class="url">http://localhost:${CONFIG.port}${CONFIG.webhookPath}</span></p>
                    <p>📝 Los webhooks se guardan en: <span style="color:#ffff00;">${CONFIG.logFile}</span></p>
                </div>
                <p style="margin-top:20px;color:#666;">MFH TOOLS PRO - Hecho en México 🇲🇽</p>
            </body>
            </html>
        `);
    });
    
    // Iniciar servidor
    app.listen(CONFIG.port, () => {
        console.log(`\n🔍 Webhook Tester - MFH TOOLS PRO`);
        console.log('='.repeat(40));
        console.log(`✅ Servidor iniciado en: http://localhost:${CONFIG.port}`);
        console.log(`📌 Webhook URL: http://localhost:${CONFIG.port}${CONFIG.webhookPath}`);
        console.log(`📊 Stats: http://localhost:${CONFIG.port}/stats`);
        console.log(`📋 Logs: http://localhost:${CONFIG.port}/logs`);
        console.log(`📝 Logs guardados en: ${CONFIG.logFile}`);
        
        if (CONFIG.useNgrok) {
            startNgrok(CONFIG.port);
        }
        
        console.log('\n🔄 Esperando webhooks... Presiona Ctrl+C para detener.');
    });
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Webhook Tester...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo Webhook Tester...');
    process.exit(0);
});
