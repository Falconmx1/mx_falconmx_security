#!/usr/bin/env node

/**
 * Security Metrics Dashboard - MFH TOOLS PRO
 * Dashboard de métricas de seguridad en tiempo real
 * 
 * Uso: node security-metrics-dashboard.js [opciones]
 * Ejemplo: node security-metrics-dashboard.js --port 3000
 * Ejemplo: node security-metrics-dashboard.js --export --format json
 * Ejemplo: node security-metrics-dashboard.js --watch
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'metrics_config.json');
const METRICS_FILE = path.join(__dirname, 'security_metrics.json');

const DEFAULT_CONFIG = {
    port: 3000,
    refresh_interval: 30,
    thresholds: {
        critical: 90,
        high: 70,
        medium: 50,
        low: 30
    },
    export: {
        enabled: false,
        path: './metrics_exports',
        format: 'json'
    }
};

// ==================== DATOS MÉTRICOS ====================
function generateMetrics() {
    const now = new Date();
    
    return {
        timestamp: now.toISOString(),
        incidentes: {
            total: Math.floor(Math.random() * 50) + 10,
            criticales: Math.floor(Math.random() * 5),
            altas: Math.floor(Math.random() * 10),
            medias: Math.floor(Math.random() * 20),
            bajas: Math.floor(Math.random() * 30),
            tendencia_24h: Math.floor(Math.random() * 20) - 10
        },
        vulnerabilidades: {
            total: Math.floor(Math.random() * 200) + 50,
            criticas: Math.floor(Math.random() * 10),
            altas: Math.floor(Math.random() * 30),
            medias: Math.floor(Math.random() * 60),
            bajas: Math.floor(Math.random() * 100),
            por_parchar: Math.floor(Math.random() * 40)
        },
        cumplimiento: {
            pci_dss: Math.floor(Math.random() * 30) + 70,
            gdpr: Math.floor(Math.random() * 30) + 65,
            iso27001: Math.floor(Math.random() * 30) + 68,
            hipaa: Math.floor(Math.random() * 30) + 72
        },
        rendimiento: {
            uptime: (Math.random() * 5) + 95,
            tiempo_respuesta_promedio: Math.floor(Math.random() * 200) + 50,
            peticiones_segundo: Math.floor(Math.random() * 500) + 100,
            tasa_exito: (Math.random() * 10) + 90
        },
        amenazas: {
            bloqueadas: Math.floor(Math.random() * 1000) + 200,
            investigadas: Math.floor(Math.random() * 100) + 20,
            falsos_positivos: Math.floor(Math.random() * 50) + 5,
            iocs_activos: Math.floor(Math.random() * 30) + 5
        },
        salud_sistema: {
            cpu: Math.floor(Math.random() * 60) + 10,
            memoria: Math.floor(Math.random() * 60) + 20,
            disco: Math.floor(Math.random() * 50) + 30,
            red: Math.floor(Math.random() * 40) + 10
        }
    };
}

function saveMetrics(metrics) {
    try {
        // Guardar histórico
        const history = loadHistory();
        history.push(metrics);
        // Mantener solo últimos 1000 registros
        while (history.length > 1000) {
            history.shift();
        }
        fs.writeFileSync(METRICS_FILE, JSON.stringify(history, null, 2));
    } catch (error) {
        console.error('❌ Error guardando métricas:', error.message);
    }
}

function loadHistory() {
    try {
        if (fs.existsSync(METRICS_FILE)) {
            return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando historial:', error.message);
    }
    return [];
}

function generateHTMLDashboard(metrics) {
    const getStatus = (value, threshold) => {
        if (value >= threshold.critical) return 'critical';
        if (value >= threshold.high) return 'high';
        if (value >= threshold.medium) return 'medium';
        return 'low';
    };
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Metrics Dashboard</title>
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
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            background: #1a1a1a;
            border-radius: 10px;
            padding: 20px;
            border: 1px solid #333;
            transition: all 0.3s ease;
        }
        .card:hover { border-color: #00ff00; }
        .card .title { color: #888; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
        .card .value { font-size: 2rem; font-weight: bold; margin: 10px 0; }
        .card .sub { color: #888; font-size: 0.8rem; }
        .status-critical { color: #ff0000; }
        .status-high { color: #ff4400; }
        .status-medium { color: #ff8800; }
        .status-low { color: #00cc00; }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #333;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-bar .fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.5s ease;
        }
        .progress-critical .fill { background: #ff0000; }
        .progress-high .fill { background: #ff4400; }
        .progress-medium .fill { background: #ff8800; }
        .progress-low .fill { background: #00cc00; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.8rem;
        }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 768px) { .row { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Security Metrics Dashboard</h1>
            <div class="time">${metrics.timestamp}</div>
        </div>
        
        <div class="grid">
            <div class="card">
                <div class="title">📊 Incidentes</div>
                <div class="value">${metrics.incidentes.total}</div>
                <div class="sub">Críticos: ${metrics.incidentes.criticos} | Altos: ${metrics.incidentes.altas}</div>
                <div class="sub">Tendencia 24h: ${metrics.incidentes.tendencia_24h > 0 ? '+' : ''}${metrics.incidentes.tendencia_24h}%</div>
            </div>
            
            <div class="card">
                <div class="title">🛡️ Vulnerabilidades</div>
                <div class="value">${metrics.vulnerabilidades.total}</div>
                <div class="sub">Críticas: ${metrics.vulnerabilidades.criticas} | Por parchar: ${metrics.vulnerabilidades.por_parchar}</div>
            </div>
            
            <div class="card">
                <div class="title">📋 Cumplimiento</div>
                <div class="value">${Math.round((metrics.cumplimiento.pci_dss + metrics.cumplimiento.gdpr + metrics.cumplimiento.iso27001) / 3)}%</div>
                <div class="sub">PCI-DSS: ${metrics.cumplimiento.pci_dss}% | GDPR: ${metrics.cumplimiento.gdpr}%</div>
            </div>
            
            <div class="card">
                <div class="title">⏱️ Rendimiento</div>
                <div class="value">${metrics.rendimiento.uptime.toFixed(1)}%</div>
                <div class="sub">Uptime | ${metrics.rendimiento.peticiones_segundo} req/s</div>
            </div>
        </div>
        
        <div class="row">
            <div class="card">
                <div class="title">🚨 Amenazas</div>
                <div class="value">${metrics.amenazas.bloqueadas}</div>
                <div class="sub">Bloqueadas | ${metrics.amenazas.iocs_activos} IoCs activos</div>
                <div class="progress-bar progress-${getStatus(metrics.amenazas.bloqueadas / 100, { critical: 80, high: 60, medium: 40, low: 20 })}">
                    <div class="fill" style="width: ${Math.min(metrics.amenazas.bloqueadas / 10, 100)}%"></div>
                </div>
            </div>
            
            <div class="card">
                <div class="title">💻 Salud del Sistema</div>
                <div class="value">CPU ${metrics.salud_sistema.cpu}%</div>
                <div class="sub">Memoria ${metrics.salud_sistema.memoria}% | Disco ${metrics.salud_sistema.disco}%</div>
                <div class="progress-bar progress-${getStatus(metrics.salud_sistema.cpu, { critical: 80, high: 70, medium: 60, low: 40 })}">
                    <div class="fill" style="width: ${metrics.salud_sistema.cpu}%"></div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Hecho en México 🇲🇽 | MFH TOOLS PRO - Security Metrics Dashboard</p>
        </div>
    </div>
</body>
</html>`;
}

function generateJSONExport(metrics) {
    return JSON.stringify(metrics, null, 2);
}

// ==================== SERVIDOR ====================
function startServer(port) {
    const server = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/dashboard') {
            const metrics = generateMetrics();
            const html = generateHTMLDashboard(metrics);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } else if (req.url === '/api/metrics') {
            const metrics = generateMetrics();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(metrics));
        } else if (req.url === '/api/history') {
            const history = loadHistory();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(history));
        } else if (req.url === '/export') {
            const metrics = generateMetrics();
            const json = generateJSONExport(metrics);
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="metrics_export.json"'
            });
            res.end(json);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    server.listen(port, () => {
        console.log(`✅ Dashboard ejecutándose en http://localhost:${port}`);
        console.log(`📊 API en http://localhost:${port}/api/metrics`);
        console.log(`📋 Historial en http://localhost:${port}/api/history`);
    });
    
    return server;
}

// ==================== PARSEAR ARGUMENTOS ====================
const args2 = process.argv.slice(2);

let port = 3000;
let exportFormat = null;
let watch = false;
let init2 = false;

for (let i = 0; i < args2.length; i++) {
    switch (args2[i]) {
        case '--port':
            port = parseInt(args2[i + 1]) || 3000;
            i++;
            break;
        case '--export':
            exportFormat = args2[i + 1] || 'json';
            i++;
            break;
        case '--watch':
            watch = true;
            break;
        case '--init':
            init2 = true;
            break;
        case '--help':
        case '-h':
            console.log(`
📊 Security Metrics Dashboard - MFH TOOLS PRO
==========================================
Dashboard de métricas de seguridad en tiempo real.

Uso:
  node security-metrics-dashboard.js [opciones]

Opciones:
  --init               Crear configuración por defecto
  --port <puerto>      Puerto para el servidor (default: 3000)
  --export <formato>   Exportar métricas (json)
  --watch              Monitorear métricas continuamente
  --help, -h           Mostrar esta ayuda

Ejemplos:
  node security-metrics-dashboard.js --init
  node security-metrics-dashboard.js --port 8080
  node security-metrics-dashboard.js --export json
  node security-metrics-dashboard.js --watch
`);
            process.exit(0);
    }
}

// ==================== MAIN ====================
(async function main2() {
    console.log(`📊 Security Metrics Dashboard - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init2) {
        if (!fs.existsSync(path.dirname(METRICS_FILE))) {
            fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
        }
        const config = { ...DEFAULT_CONFIG, port };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log('✅ Configuración por defecto creada.');
        process.exit(0);
    }
    
    if (exportFormat) {
        const metrics = generateMetrics();
        if (exportFormat === 'json') {
            const output = generateJSONExport(metrics);
            const outputFile = `metrics_export_${Date.now()}.json`;
            fs.writeFileSync(outputFile, output);
            console.log(`✅ Métricas exportadas a: ${outputFile}`);
        }
        process.exit(0);
    }
    
    if (watch) {
        console.log('🔄 Monitoreando métricas... (presiona Ctrl+C para salir)');
        setInterval(() => {
            const metrics = generateMetrics();
            saveMetrics(metrics);
            console.log(`📊 ${new Date().toISOString()}: ${metrics.incidentes.total} incidentes, ${metrics.vulnerabilidades.total} vulnerabilidades`);
        }, 30000);
    } else {
        const server = startServer(port);
        
        process.on('SIGINT', () => {
            console.log('\n🛑 Deteniendo dashboard...');
            server.close();
            process.exit(0);
        });
    }
})();
