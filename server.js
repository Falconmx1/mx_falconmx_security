#!/usr/bin/env node

require('dotenv').config();
const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const axios = require('axios');

// Webhooks
const { Webhook: DiscordWebhook } = require('discord-webhook-node');
const { IncomingWebhook } = require('@slack/webhook');
const { Telegraf } = require('telegraf');

// ==================== CONFIGURACIÓN ====================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Demasiadas solicitudes, espera un momento' }
});
app.use('/api/', limiter);

// ==================== BASE DE DATOS SQLITE ====================
let db;

async function initDatabase() {
    db = await open({
        filename: './database/mfh.db',
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS scans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target TEXT NOT NULL,
            scan_type TEXT NOT NULL,
            results TEXT,
            open_ports TEXT,
            os_detected TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_ip TEXT
        );
        
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            webhook_url TEXT,
            last_triggered DATETIME,
            is_active BOOLEAN DEFAULT 1
        );
        
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            points INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_scans_target ON scans(target);
        CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
    `);
    
    console.log('✅ Base de datos SQLite inicializada');
}

// ==================== WEBHOOKS ====================
class WebhookManager {
    constructor() {
        this.discordHooks = new Map();
        this.slackHooks = new Map();
        this.telegramBots = new Map();
    }
    
    async sendDiscord(webhookUrl, message) {
        try {
            const hook = new DiscordWebhook(webhookUrl);
            await hook.send(message);
            return true;
        } catch (error) {
            console.error('Discord webhook error:', error);
            return false;
        }
    }
    
    async sendSlack(webhookUrl, message) {
        try {
            const hook = new IncomingWebhook(webhookUrl);
            await hook.send({ text: message });
            return true;
        } catch (error) {
            console.error('Slack webhook error:', error);
            return false;
        }
    }
    
    async sendTelegram(botToken, chatId, message) {
        try {
            const bot = new Telegraf(botToken);
            await bot.telegram.sendMessage(chatId, message);
            return true;
        } catch (error) {
            console.error('Telegram error:', error);
            return false;
        }
    }
    
    async sendAlert(alertConfig, message) {
        const { type, webhookUrl, botToken, chatId } = alertConfig;
        
        switch(type) {
            case 'discord':
                return await this.sendDiscord(webhookUrl, message);
            case 'slack':
                return await this.sendSlack(webhookUrl, message);
            case 'telegram':
                return await this.sendTelegram(botToken, chatId, message);
            default:
                return false;
        }
    }
}

const webhookManager = new WebhookManager();

// ==================== ESCÁNER CON NMAP REAL ====================
async function scanWithNmap(target, scanType = 'quick') {
    let command;
    
    switch(scanType) {
        case 'quick':
            command = `nmap -T4 -F ${target}`;
            break;
        case 'full':
            command = `nmap -T4 -p- ${target}`;
            break;
        case 'os':
            command = `nmap -T4 -O -sV ${target}`;
            break;
        case 'udp':
            command = `nmap -sU -T4 -F ${target}`;
            break;
        case 'vuln':
            command = `nmap --script vuln ${target}`;
            break;
        default:
            command = `nmap -T4 -F ${target}`;
    }
    
    try {
        const { stdout, stderr } = await execPromise(command);
        
        // Parsear resultados de Nmap
        const openPorts = [];
        const portRegex = /(\d+)\/(tcp|udp)\s+open\s+(\S+)/g;
        let match;
        while ((match = portRegex.exec(stdout)) !== null) {
            openPorts.push({
                port: parseInt(match[1]),
                protocol: match[2],
                service: match[3]
            });
        }
        
        // Detectar OS
        let osDetected = null;
        const osRegex = /OS details:\s+(.+)/;
        const osMatch = osRegex.exec(stdout);
        if (osMatch) osDetected = osMatch[1];
        
        return {
            success: true,
            target,
            openPorts,
            osDetected,
            rawOutput: stdout,
            scanTime: new Date().toISOString()
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            target
        };
    }
}

// ==================== MONITOREO Y ALERTAS ====================
class MonitorManager {
    constructor() {
        this.monitors = new Map();
        this.setupCronJobs();
    }
    
    setupCronJobs() {
        // Ejecutar cada hora
        cron.schedule('0 * * * *', async () => {
            console.log('🔄 Ejecutando monitoreo programado...');
            await this.checkAllMonitors();
        });
    }
    
    async addMonitor(target, alertConfig) {
        const monitorId = `${target}_${Date.now()}`;
        this.monitors.set(monitorId, {
            target,
            alertConfig,
            lastState: null,
            createdAt: new Date()
        });
        
        await db.run(
            'INSERT INTO alerts (target, alert_type, webhook_url, is_active) VALUES (?, ?, ?, ?)',
            [target, alertConfig.type, alertConfig.webhookUrl, 1]
        );
        
        return monitorId;
    }
    
    async checkAllMonitors() {
        for (const [id, monitor] of this.monitors) {
            await this.checkSingleMonitor(id, monitor);
        }
    }
    
    async checkSingleMonitor(id, monitor) {
        const scanResult = await scanWithNmap(monitor.target, 'quick');
        
        if (scanResult.success && scanResult.openPorts.length > 0) {
            const currentState = scanResult.openPorts.map(p => `${p.port}/${p.protocol}`).join(',');
            
            if (monitor.lastState !== currentState) {
                const message = `🔔 ALERTA: Cambios detectados en ${monitor.target}\n📡 Puertos abiertos: ${currentState}\n🕐 Hora: ${new Date().toLocaleString()}`;
                await webhookManager.sendAlert(monitor.alertConfig, message);
                monitor.lastState = currentState;
                
                // Guardar en DB
                await db.run(
                    'UPDATE alerts SET last_triggered = ? WHERE target = ?',
                    [new Date().toISOString(), monitor.target]
                );
            }
        }
    }
}

const monitorManager = new MonitorManager();

// ==================== API ENDPOINTS ====================

// Escaneo con Nmap
app.post('/api/scan', async (req, res) => {
    const { target, scanType = 'quick', saveToDb = true, userIp = req.ip } = req.body;
    
    if (!target) {
        return res.status(400).json({ error: 'Target requerido' });
    }
    
    const result = await scanWithNmap(target, scanType);
    
    if (saveToDb && result.success) {
        await db.run(
            'INSERT INTO scans (target, scan_type, results, open_ports, os_detected, user_ip) VALUES (?, ?, ?, ?, ?, ?)',
            [
                target,
                scanType,
                result.rawOutput,
                JSON.stringify(result.openPorts),
                result.osDetected,
                userIp
            ]
        );
    }
    
    res.json(result);
});

// Escaneo masivo
app.post('/api/scan/batch', async (req, res) => {
    const { targets, scanType = 'quick' } = req.body;
    
    if (!targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: 'Lista de targets requerida' });
    }
    
    const results = [];
    for (const target of targets.slice(0, 10)) { // Limitar a 10 por request
        const result = await scanWithNmap(target, scanType);
        results.push(result);
        
        if (result.success) {
            await db.run(
                'INSERT INTO scans (target, scan_type, results, open_ports, os_detected) VALUES (?, ?, ?, ?, ?)',
                [target, scanType, result.rawOutput, JSON.stringify(result.openPorts), result.osDetected]
            );
        }
        
        // Pequeña pausa para no sobrecargar
        await new Promise(r => setTimeout(r, 1000));
    }
    
    res.json({ results, total: results.length });
});

// Configurar alerta
app.post('/api/alerts/create', async (req, res) => {
    const { target, alertType, webhookUrl, botToken, chatId } = req.body;
    
    if (!target || !alertType) {
        return res.status(400).json({ error: 'Target y tipo de alerta requeridos' });
    }
    
    const alertConfig = { type: alertType, webhookUrl, botToken, chatId };
    const monitorId = await monitorManager.addMonitor(target, alertConfig);
    
    res.json({ success: true, monitorId, message: `Alerta configurada para ${target}` });
});

// Probar webhook
app.post('/api/alerts/test', async (req, res) => {
    const { alertType, webhookUrl, botToken, chatId } = req.body;
    
    const testMessage = `🧪 TEST: Alerta desde MFH TOOLS PRO\n⏰ ${new Date().toLocaleString()}`;
    const result = await webhookManager.sendAlert(
        { type: alertType, webhookUrl, botToken, chatId },
        testMessage
    );
    
    res.json({ success: result, message: result ? 'Webhook funcionando' : 'Error al enviar' });
});

// Obtener historial de escaneos
app.get('/api/history/:target?', async (req, res) => {
    const { target } = req.params;
    const { limit = 50 } = req.query;
    
    let query = 'SELECT * FROM scans ORDER BY timestamp DESC LIMIT ?';
    let params = [limit];
    
    if (target) {
        query = 'SELECT * FROM scans WHERE target = ? ORDER BY timestamp DESC LIMIT ?';
        params = [target, limit];
    }
    
    const scans = await db.all(query, params);
    res.json({ success: true, scans });
});

// Estadísticas
app.get('/api/stats', async (req, res) => {
    const totalScans = await db.get('SELECT COUNT(*) as total FROM scans');
    const uniqueTargets = await db.get('SELECT COUNT(DISTINCT target) as unique FROM scans');
    const topPorts = await db.all(`
        SELECT port, COUNT(*) as count FROM (
            SELECT json_each.value ->> 'port' as port
            FROM scans, json_each(open_ports)
            WHERE open_ports IS NOT NULL
        ) GROUP BY port ORDER BY count DESC LIMIT 10
    `);
    
    res.json({
        success: true,
        stats: {
            totalScans: totalScans.total,
            uniqueTargets: uniqueTargets.unique,
            topPorts
        }
    });
});

// Wordlists disponibles
app.get('/api/wordlists', async (req, res) => {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
        const files = await fs.readdir('./wordlists');
        const wordlists = files.filter(f => f.endsWith('.txt') || f.endsWith('.gz'));
        res.json({ success: true, wordlists });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        version: '5.0.0',
        uptime: process.uptime(),
        nmap: 'available',
        database: 'connected',
        webhooks: 'configured'
    });
});

// ==================== WEBSOCKET PARA ESCANEOS EN TIEMPO REAL ====================
wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`✅ WebSocket client connected from ${clientIp}`);
    
    ws.on('message', async (data) => {
        try {
            const parsed = JSON.parse(data);
            const { action, target, scanType } = parsed;
            
            if (action === 'scan') {
                ws.send(JSON.stringify({ type: 'status', message: `Iniciando escaneo de ${target}...` }));
                
                const result = await scanWithNmap(target, scanType || 'quick');
                
                ws.send(JSON.stringify({
                    type: 'result',
                    data: result
                }));
                
                if (result.success) {
                    await db.run(
                        'INSERT INTO scans (target, scan_type, results, open_ports, os_detected, user_ip) VALUES (?, ?, ?, ?, ?, ?)',
                        [target, scanType, result.rawOutput, JSON.stringify(result.openPorts), result.osDetected, clientIp]
                    );
                }
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', error: error.message }));
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 WebSocket client disconnected from ${clientIp}`);
    });
});

// ==================== INICIALIZACIÓN ====================
async function startServer() {
    await initDatabase();
    
    server.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║   🇲🇽 MFH TOOLS PRO v5.0 - SUITE COMPLETA DE CIBERSEGURIDAD 🥚🔥            ║
║                                                                              ║
║   🚀 API REST: http://localhost:${PORT}/api                                  ║
║   🔌 WebSocket: ws://localhost:${PORT}                                       ║
║   📊 Database: SQLite (./database/mfh.db)                                   ║
║   🔔 Webhooks: Discord | Slack | Telegram                                   ║
║   🛡️ Nmap: Integrado y listo                                                ║
║   📚 Wordlists: rockyou.txt, common.txt, subdomains.txt                     ║
║                                                                              ║
║   📋 Endpoints disponibles:                                                 ║
║     POST   /api/scan         - Escaneo individual                           ║
║     POST   /api/scan/batch   - Escaneo masivo                               ║
║     POST   /api/alerts/create- Configurar alerta                            ║
║     POST   /api/alerts/test  - Probar webhook                               ║
║     GET    /api/history      - Historial de escaneos                        ║
║     GET    /api/stats        - Estadísticas                                 ║
║     GET    /api/wordlists    - Lista de wordlists                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
        `);
    });
}

startServer();

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (db) await db.close();
    server.close(() => process.exit(0));
});
