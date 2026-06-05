#!/usr/bin/env node

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

let db;

async function initDatabase() {
    try {
        db = await open({ filename: './database/mfh.db', driver: sqlite3.Database });
        
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
                is_active INTEGER DEFAULT 1
            );
            
            CREATE INDEX IF NOT EXISTS idx_scans_target ON scans(target);
            CREATE INDEX IF NOT EXISTS idx_scans_timestamp ON scans(timestamp);
        `);
        
        console.log('✅ Base de datos SQLite conectada');
        return true;
    } catch (error) {
        console.error('❌ Error en base de datos:', error.message);
        return false;
    }
}

async function scanWithNmap(target, scanType = 'quick') {
    const commands = {
        quick: `nmap -T4 -F ${target}`,
        os: `nmap -T4 -O -sV ${target}`,
        full: `nmap -T4 -p- ${target}`,
        udp: `nmap -sU -T4 -F ${target}`
    };
    
    try {
        const { stdout } = await execPromise(commands[scanType] || commands.quick);
        
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
        
        const osRegex = /OS details:\s+(.+)/;
        const osMatch = osRegex.exec(stdout);
        
        return { 
            success: true, 
            target, 
            openPorts, 
            osDetected: osMatch ? osMatch[1] : null, 
            rawOutput: stdout, 
            scanTime: new Date().toISOString() 
        };
    } catch (error) {
        return { success: false, error: error.message, target };
    }
}

// ==================== ENDPOINTS ====================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        version: '5.0.0', 
        uptime: process.uptime(), 
        nmap: 'available', 
        database: db ? 'connected' : 'disconnected' 
    });
});

app.post('/api/scan', async (req, res) => {
    const { target, scanType = 'quick', saveToDb = true } = req.body;
    
    if (!target) {
        return res.status(400).json({ error: 'Target requerido' });
    }
    
    const result = await scanWithNmap(target, scanType);
    
    if (saveToDb && result.success && db) {
        try {
            await db.run(
                `INSERT INTO scans (target, scan_type, results, open_ports, os_detected, user_ip) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [target, scanType, result.rawOutput, JSON.stringify(result.openPorts), result.osDetected, req.ip || 'unknown']
            );
        } catch (dbError) { 
            console.error('Error guardando en DB:', dbError.message); 
        }
    }
    
    res.json(result);
});

app.post('/api/scan/batch', async (req, res) => {
    const { targets, scanType = 'quick' } = req.body;
    
    if (!targets || !Array.isArray(targets)) {
        return res.status(400).json({ error: 'Lista de targets requerida' });
    }
    
    const results = [];
    for (const target of targets.slice(0, 10)) {
        const result = await scanWithNmap(target, scanType);
        results.push(result);
        
        if (result.success && db) {
            await db.run(
                `INSERT INTO scans (target, scan_type, results, open_ports, os_detected, user_ip) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [target, scanType, result.rawOutput, JSON.stringify(result.openPorts), result.osDetected, req.ip || 'unknown']
            );
        }
        
        await new Promise(r => setTimeout(r, 1000));
    }
    
    res.json({ results, total: results.length });
});

app.get('/api/stats', async (req, res) => {
    if (!db) {
        return res.json({ success: false, error: 'DB no disponible' });
    }
    
    try {
        const totalScans = await db.get('SELECT COUNT(*) as total FROM scans');
        const uniqueTargets = await db.get('SELECT COUNT(DISTINCT target) as unique FROM scans');
        
        res.json({
            success: true,
            stats: {
                totalScans: totalScans?.total || 0,
                uniqueTargets: uniqueTargets?.unique || 0
            }
        });
    } catch (error) {
        console.error('Error en stats:', error.message);
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/history', async (req, res) => {
    if (!db) {
        return res.json({ success: false, error: 'DB no disponible' });
    }
    
    try {
        const scans = await db.all('SELECT * FROM scans ORDER BY timestamp DESC LIMIT 50');
        res.json({ success: true, scans });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.get('/api/history/:target', async (req, res) => {
    if (!db) {
        return res.json({ success: false, error: 'DB no disponible' });
    }
    
    try {
        const { target } = req.params;
        const scans = await db.all(
            'SELECT * FROM scans WHERE target = ? ORDER BY timestamp DESC LIMIT 50',
            [target]
        );
        res.json({ success: true, scans });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==================== WEBSOCKET ====================
wss.on('connection', (ws) => {
    console.log('✅ WebSocket client connected');
    
    ws.on('message', async (data) => {
        try {
            const parsed = JSON.parse(data);
            const { action, target, scanType } = parsed;
            
            if (action === 'scan') {
                ws.send(JSON.stringify({ type: 'status', message: `Escaneando ${target}...` }));
                const result = await scanWithNmap(target, scanType);
                ws.send(JSON.stringify({ type: 'result', data: result }));
            }
        } catch (error) {
            ws.send(JSON.stringify({ type: 'error', error: error.message }));
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
    });
});

// ==================== INICIO ====================
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
║   🛡️ Nmap: ✅ Integrado                                                     ║
║                                                                              ║
║   📋 Endpoints disponibles:                                                 ║
║     POST   /api/scan         - Escaneo individual                           ║
║     POST   /api/scan/batch   - Escaneo masivo                               ║
║     GET    /api/history      - Historial de escaneos                        ║
║     GET    /api/history/:target - Historial por target                      ║
║     GET    /api/stats        - Estadísticas                                 ║
║     GET    /health           - Health check                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝
        `);
    });
}

startServer();

process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (db) await db.close();
    server.close(() => process.exit(0));
});
