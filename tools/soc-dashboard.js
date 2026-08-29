#!/usr/bin/env node

/**
 * SOC Dashboard - MFH TOOLS PRO
 * Dashboard centralizado para operaciones de seguridad
 * 
 * Uso: node soc-dashboard.js [opciones]
 * Ejemplo: node soc-dashboard.js --start --port 3000
 * Ejemplo: node soc-dashboard.js --status
 * Ejemplo: node soc-dashboard.js --alerts --last 24h
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'soc_config.json');
const DASHBOARD_DIR = path.join(__dirname, 'soc_dashboard');
const ALERTS_DIR = path.join(__dirname, 'soc_alerts');
const REPORTS_DIR = path.join(__dirname, 'soc_reports');

const DEFAULT_CONFIG = {
    port: 3000,
    refresh_interval: 30,
    alerts_threshold: {
        critical: 5,
        high: 15,
        medium: 30,
        low: 50
    },
    retention_days: 30
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let port = 3000;
let timeRange = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--start':
            action = 'start';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                port = parseInt(args[i + 1]) || 3000;
                i++;
            }
            break;
        case '--status':
            action = 'status';
            break;
        case '--alerts':
            action = 'alerts';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                timeRange = args[i + 1];
                i++;
            }
            break;
        case '--port':
            port = parseInt(args[i + 1]) || 3000;
            i++;
            break;
        case '--last':
            timeRange = args[i + 1];
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
🛡️ SOC Dashboard - MFH TOOLS PRO
================================
Dashboard centralizado para operaciones de seguridad.

Uso:
  node soc-dashboard.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --start [puerto]      Iniciar dashboard web
  --status              Mostrar estado del SOC
  --alerts [periodo]    Mostrar alertas (24h, 7d, 30d)
  --port <puerto>       Puerto para el dashboard (default: 3000)
  --last <periodo>      Periodo de tiempo (24h, 7d, 30d)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node soc-dashboard.js --init
  node soc-dashboard.js --start --port 8080
  node soc-dashboard.js --status
  node soc-dashboard.js --alerts --last 24h
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
    if (!fs.existsSync(DASHBOARD_DIR)) {
        fs.mkdirSync(DASHBOARD_DIR, { recursive: true });
    }
    if (!fs.existsSync(ALERTS_DIR)) {
        fs.mkdirSync(ALERTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Dashboard: ${DASHBOARD_DIR}`);
    console.log(`📁 Alertas: ${ALERTS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateSOCData() {
    const severities = ['critical', 'high', 'medium', 'low'];
    const sources = ['firewall', 'ids', 'endpoint', 'email', 'web', 'cloud'];
    const types = ['malware', 'phishing', 'unauthorized_access', 'data_exfiltration', 'ddos', 'brute_force'];
    
    const alerts = [];
    const now = Date.now();
    
    for (let i = 0; i < 50; i++) {
        const severity = severities[Math.floor(Math.random() * severities.length)];
        alerts.push({
            id: crypto.randomBytes(8).toString('hex'),
            timestamp: new Date(now - Math.random() * 86400000 * 7).toISOString(),
            severity: severity,
            source: sources[Math.floor(Math.random() * sources.length)],
            type: types[Math.floor(Math.random() * types.length)],
            description: `Alerta ${i+1}: ${types[Math.floor(Math.random() * types.length)]} detectado`,
            status: ['new', 'investigating', 'contained', 'resolved'][Math.floor(Math.random() * 4)],
            ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            user: `user${Math.floor(Math.random() * 100)}`
        });
    }
    
    return alerts;
}

function getAlertsByTime(timeRange) {
    const alerts = generateSOCData();
    const now = Date.now();
    let hours = 24;
    
    if (timeRange) {
        const match = timeRange.match(/(\d+)([dh])/);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            hours = unit === 'd' ? value * 24 : value;
        }
    }
    
    const cutoff = now - hours * 3600000;
    return alerts.filter(a => new Date(a.timestamp).getTime() >= cutoff);
}

function showStatus() {
    console.log('\n🛡️ ESTADO DEL SOC');
    console.log('='.repeat(50));
    
    const config = loadConfig();
    const alerts = generateSOCData();
    const now = Date.now();
    const last24h = alerts.filter(a => new Date(a.timestamp).getTime() >= now - 86400000);
    
    const status = {
        total_alerts: alerts.length,
        alerts_24h: last24h.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
        open: alerts.filter(a => a.status === 'new' || a.status === 'investigating').length,
        resolved: alerts.filter(a => a.status === 'resolved').length,
        sources: {},
        types: {}
    };
    
    alerts.forEach(a => {
        status.sources[a.source] = (status.sources[a.source] || 0) + 1;
        status.types[a.type] = (status.types[a.type] || 0) + 1;
    });
    
    console.log(`\n📊 Alertas totales: ${status.total_alerts}`);
    console.log(`   Últimas 24h: ${status.alerts_24h}`);
    console.log(`\n🔴 Criticas: ${status.critical}`);
    console.log(`🟠 Altas: ${status.high}`);
    console.log(`🟡 Medias: ${status.medium}`);
    console.log(`🟢 Bajas: ${status.low}`);
    console.log(`\n📋 Abiertas: ${status.open}`);
    console.log(`✅ Resueltas: ${status.resolved}`);
    
    console.log(`\n📡 Fuentes:`);
    for (const [source, count] of Object.entries(status.sources)) {
        console.log(`   • ${source}: ${count}`);
    }
    
    console.log(`\n🔍 Tipos:`);
    for (const [type, count] of Object.entries(status.types)) {
        console.log(`   • ${type}: ${count}`);
    }
    
    return status;
}

function showAlerts(timeRange) {
    console.log(`\n🔍 ALERTAS - Últimas ${timeRange || '24h'}`);
    console.log('='.repeat(50));
    
    const alerts = getAlertsByTime(timeRange || '24h');
    const sorted = alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (sorted.length === 0) {
        console.log('ℹ️ No hay alertas en el periodo seleccionado.');
        return;
    }
    
    const severityIcons = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢'
    };
    
    const statusIcons = {
        new: '🆕',
        investigating: '🔍',
        contained: '📦',
        resolved: '✅'
    };
    
    console.log(`\n📋 ${sorted.length} alertas encontradas:\n`);
    
    sorted.slice(0, 20).forEach(a => {
        const sevIcon = severityIcons[a.severity] || '⚪';
        const statIcon = statusIcons[a.status] || '❓';
        const date = new Date(a.timestamp).toLocaleString();
        console.log(`   ${sevIcon} [${a.severity.toUpperCase()}] ${statIcon} ${a.type}`);
        console.log(`      ID: ${a.id}`);
        console.log(`      Fecha: ${date}`);
        console.log(`      Fuente: ${a.source}`);
        console.log(`      IP: ${a.ip}`);
        console.log(`      Usuario: ${a.user}`);
        console.log(`      ${a.description}`);
        console.log('');
    });
    
    if (sorted.length > 20) {
        console.log(`   ... y ${sorted.length - 20} alertas mas`);
    }
    
    if (outputFile) {
        const report = {
            timestamp: new Date().toISOString(),
            period: timeRange || '24h',
            total: sorted.length,
            alerts: sorted
        };
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
}

function startDashboard(port) {
    console.log(`🛡️ Iniciando SOC Dashboard en puerto ${port}...`);
    console.log(`🌐 http://localhost:${port}`);
    
    const config = loadConfig();
    const alerts = generateSOCData();
    
    const server = http.createServer((req, res) => {
        const url = req.url;
        
        if (url === '/' || url === '/dashboard') {
            const html = generateDashboardHTML(alerts, port);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } else if (url === '/api/alerts') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(alerts));
        } else if (url === '/api/status') {
            const status = {
                total: alerts.length,
                critical: alerts.filter(a => a.severity === 'critical').length,
                high: alerts.filter(a => a.severity === 'high').length,
                medium: alerts.filter(a => a.severity === 'medium').length,
                low: alerts.filter(a => a.severity === 'low').length,
                open: alerts.filter(a => a.status === 'new' || a.status === 'investigating').length
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    server.listen(port, () => {
        console.log(`✅ Dashboard ejecutandose en http://localhost:${port}`);
        console.log(`📊 API: http://localhost:${port}/api/alerts`);
        console.log(`📡 API Status: http://localhost:${port}/api/status`);
        console.log('\nPresiona Ctrl+C para detener');
    });
    
    return server;
}

function generateDashboardHTML(alerts, port) {
    const severityCounts = {
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length
    };
    
    const openAlerts = alerts.filter(a => a.status === 'new' || a.status === 'investigating');
    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
    
    const recentAlerts = alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🛡️ SOC Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 20px;
            min-height: 100vh;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #00ff00;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .header h1 { color: #00ff00; }
        .header .time { color: #888; font-size: 0.9rem; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat {
            background: #1a1a1a;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333;
            text-align: center;
        }
        .stat .number { font-size: 2rem; font-weight: bold; }
        .stat .label { color: #888; font-size: 0.8rem; }
        .stat.critical .number { color: #ff0000; }
        .stat.high .number { color: #ff4400; }
        .stat.medium .number { color: #ff8800; }
        .stat.low .number { color: #00cc00; }
        .stat.total .number { color: #00ff00; }
        .stat.open .number { color: #ffaa00; }
        .stat.resolved .number { color: #00cc00; }
        .alerts-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .alerts-table th {
            background: #00ff00;
            color: #000;
            padding: 10px;
            text-align: left;
        }
        .alerts-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #333;
        }
        .severity-critical { color: #ff0000; font-weight: bold; }
        .severity-high { color: #ff4400; font-weight: bold; }
        .severity-medium { color: #ff8800; }
        .severity-low { color: #00cc00; }
        .status-new { color: #ffaa00; }
        .status-investigating { color: #4488ff; }
        .status-contained { color: #00ff88; }
        .status-resolved { color: #00cc00; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.8rem;
        }
        .refresh-btn {
            background: #00ff00;
            color: #000;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
        .refresh-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 0 15px rgba(0,255,0,0.3);
        }
        @media (max-width: 768px) {
            .stats { grid-template-columns: repeat(2, 1fr); }
            .header { flex-direction: column; gap: 10px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ SOC Dashboard</h1>
            <div>
                <span class="time">${new Date().toISOString()}</span>
                <button class="refresh-btn" onclick="location.reload()">⟳ Actualizar</button>
            </div>
        </div>
        
        <div class="stats">
            <div class="stat total">
                <div class="number">${alerts.length}</div>
                <div class="label">📊 Total Alertas</div>
            </div>
            <div class="stat critical">
                <div class="number">${severityCounts.critical}</div>
                <div class="label">🔴 Criticas</div>
            </div>
            <div class="stat high">
                <div class="number">${severityCounts.high}</div>
                <div class="label">🟠 Altas</div>
            </div>
            <div class="stat medium">
                <div class="number">${severityCounts.medium}</div>
                <div class="label">🟡 Medias</div>
            </div>
            <div class="stat low">
                <div class="number">${severityCounts.low}</div>
                <div class="label">🟢 Bajas</div>
            </div>
            <div class="stat open">
                <div class="number">${openAlerts.length}</div>
                <div class="label">📋 Abiertas</div>
            </div>
            <div class="stat resolved">
                <div class="number">${resolvedAlerts.length}</div>
                <div class="label">✅ Resueltas</div>
            </div>
        </div>
        
        <h2>📋 Últimas Alertas</h2>
        <table class="alerts-table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Severidad</th>
                    <th>Tipo</th>
                    <th>Fuente</th>
                    <th>IP</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${recentAlerts.map(a => `
                    <tr>
                        <td>${new Date(a.timestamp).toLocaleString()}</td>
                        <td class="severity-${a.severity}">${a.severity.toUpperCase()}</td>
                        <td>${a.type}</td>
                        <td>${a.source}</td>
                        <td>${a.ip}</td>
                        <td class="status-${a.status}">${a.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>🛡️ MFH TOOLS PRO - SOC Dashboard | Hecho en Mexico 🇲🇽</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🛡️ SOC Dashboard - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'start':
            startDashboard(port);
            break;
            
        case 'status':
            showStatus();
            break;
            
        case 'alerts':
            showAlerts(timeRange);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --start, --status, --alerts, --init');
            break;
    }
    
    if (action !== 'start') {
        console.log('\n✅ SOC Dashboard completado');
    }
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo SOC Dashboard...');
    process.exit(0);
});
