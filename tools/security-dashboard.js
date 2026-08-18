#!/usr/bin/env node

/**
 * Security Dashboard - MFH TOOLS PRO
 * Dashboard en tiempo real con métricas de seguridad
 * 
 * Uso: node security-dashboard.js [opciones]
 * Ejemplo: node security-dashboard.js --port 3000
 * Ejemplo: node security-dashboard.js --port 3000 --open
 * Ejemplo: node security-dashboard.js --config dashboard.json
 */

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    port: 3000,
    refreshInterval: 5000,
    logFile: path.join(__dirname, 'dashboard_data.json')
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let port = CONFIG.port;
let openBrowser = false;
let configFile = null;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--port':
        case '-p':
            port = parseInt(args[i + 1]);
            i++;
            break;
        case '--open':
        case '-o':
            openBrowser = true;
            break;
        case '--config':
        case '-c':
            configFile = args[i + 1];
            i++;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Security Dashboard - MFH TOOLS PRO
======================================
Dashboard en tiempo real con métricas de seguridad.

Uso:
  node security-dashboard.js [opciones]

Opciones:
  --port, -p <puerto>      Puerto del servidor (default: 3000)
  --open, -o               Abrir en el navegador automáticamente
  --config, -c <archivo>   Archivo de configuración
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node security-dashboard.js --port 8080
  node security-dashboard.js --port 3000 --open
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function generateDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MFH Security Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff00;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            border-bottom: 2px solid #00ff00;
            padding-bottom: 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            color: #00ff00;
            font-size: 2rem;
            text-shadow: 0 0 10px rgba(0,255,0,0.3);
        }
        .status {
            color: #00ff00;
            font-size: 0.8rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            background: rgba(0,255,0,0.05);
            border: 1px solid rgba(0,255,0,0.2);
            border-radius: 10px;
            padding: 20px;
        }
        .card h3 {
            color: #00ff00;
            font-size: 0.9rem;
            margin-bottom: 10px;
            border-bottom: 1px solid rgba(0,255,0,0.1);
            padding-bottom: 5px;
        }
        .metric {
            font-size: 2.5rem;
            font-weight: bold;
            color: #00ff00;
            text-shadow: 0 0 20px rgba(0,255,0,0.2);
        }
        .metric-label {
            font-size: 0.7rem;
            color: rgba(0,255,0,0.6);
        }
        .list-item {
            padding: 5px 0;
            border-bottom: 1px solid rgba(0,255,0,0.05);
            font-size: 0.8rem;
        }
        .list-item .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.6rem;
            margin-right: 5px;
        }
        .badge-high { background: #ff0000; color: #fff; }
        .badge-medium { background: #ff8800; color: #fff; }
        .badge-low { background: #00ff00; color: #000; }
        .badge-critical { background: #ff00ff; color: #fff; }
        .footer {
            border-top: 1px solid rgba(0,255,0,0.2);
            padding-top: 15px;
            margin-top: 20px;
            text-align: center;
            font-size: 0.7rem;
            color: rgba(0,255,0,0.4);
        }
        .refresh {
            color: rgba(0,255,0,0.4);
            font-size: 0.7rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ MFH Security Dashboard</h1>
            <div>
                <span class="status">🟢 LIVE</span>
                <span class="refresh" id="refreshTime">Actualizando...</span>
            </div>
        </div>

        <div class="grid" id="metricsGrid">
            <div class="card">
                <h3>📊 Alertas Activas</h3>
                <div class="metric" id="activeAlerts">0</div>
                <div class="metric-label">Últimas 24 horas</div>
            </div>
            <div class="card">
                <h3>🔴 Incidentes Críticos</h3>
                <div class="metric" id="criticalIncidents">0</div>
                <div class="metric-label">Requieren atención inmediata</div>
            </div>
            <div class="card">
                <h3>✅ Checks Completados</h3>
                <div class="metric" id="checksCompleted">0</div>
                <div class="metric-label">Última hora</div>
            </div>
            <div class="card">
                <h3>⚠️ Vulnerabilidades</h3>
                <div class="metric" id="vulnerabilities">0</div>
                <div class="metric-label">Pendientes de resolver</div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>🔔 Alertas Recientes</h3>
                <div id="recentAlerts">
                    <div class="list-item">Esperando datos...</div>
                </div>
            </div>
            <div class="card">
                <h3>📋 Actividad Reciente</h3>
                <div id="recentActivity">
                    <div class="list-item">Esperando datos...</div>
                </div>
            </div>
        </div>

        <div class="footer">
            MFH TOOLS PRO - Security Dashboard &bull; Hecho en México 🇲🇽
        </div>
    </div>

    <script>
        async function fetchData() {
            try {
                const response = await fetch('/api/dashboard');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }

        function updateDashboard(data) {
            document.getElementById('activeAlerts').textContent = data.activeAlerts || 0;
            document.getElementById('criticalIncidents').textContent = data.criticalIncidents || 0;
            document.getElementById('checksCompleted').textContent = data.checksCompleted || 0;
            document.getElementById('vulnerabilities').textContent = data.vulnerabilities || 0;
            
            document.getElementById('refreshTime').textContent = 'Última actualización: ' + new Date().toLocaleTimeString();

            // Alertas recientes
            const alertsContainer = document.getElementById('recentAlerts');
            if (data.recentAlerts && data.recentAlerts.length > 0) {
                alertsContainer.innerHTML = data.recentAlerts.map(a => \`
                    <div class="list-item">
                        <span class="badge badge-\${a.severity}">\${a.severity}</span>
                        \${a.message}
                        <span style="float:right;font-size:0.6rem;color:rgba(0,255,0,0.4)">\${a.time}</span>
                    </div>
                \`).join('');
            } else {
                alertsContainer.innerHTML = '<div class="list-item">No hay alertas recientes</div>';
            }

            // Actividad reciente
            const activityContainer = document.getElementById('recentActivity');
            if (data.recentActivity && data.recentActivity.length > 0) {
                activityContainer.innerHTML = data.recentActivity.map(a => \`
                    <div class="list-item">
                        \${a.icon || '📌'} \${a.message}
                        <span style="float:right;font-size:0.6rem;color:rgba(0,255,0,0.4)">\${a.time}</span>
                    </div>
                \`).join('');
            } else {
                activityContainer.innerHTML = '<div class="list-item">No hay actividad reciente</div>';
            }
        }

        // Actualizar cada 5 segundos
        fetchData();
        setInterval(fetchData, ${CONFIG.refreshInterval});
    </script>
</body>
</html>`;
}

function generateMockData() {
    return {
        activeAlerts: Math.floor(Math.random() * 20) + 5,
        criticalIncidents: Math.floor(Math.random() * 5),
        checksCompleted: Math.floor(Math.random() * 100) + 50,
        vulnerabilities: Math.floor(Math.random() * 30) + 10,
        recentAlerts: [
            { severity: 'critical', message: 'Intrusión detectada en 192.168.1.100', time: 'Hace 2 min' },
            { severity: 'high', message: 'Escaneo de puertos desde 10.0.0.50', time: 'Hace 5 min' },
            { severity: 'medium', message: 'Intento de login fallido en SSH', time: 'Hace 8 min' },
            { severity: 'low', message: 'Cambio de configuración en firewall', time: 'Hace 15 min' }
        ],
        recentActivity: [
            { icon: '✅', message: 'Escaneo de red completado - 45 hosts activos', time: 'Hace 1 min' },
            { icon: '🔍', message: 'Subdominio encontrado: admin.example.com', time: 'Hace 3 min' },
            { icon: '⚠️', message: 'SSL expira en 30 días: example.com', time: 'Hace 7 min' },
            { icon: '🛡️', message: 'Regla de firewall actualizada', time: 'Hace 12 min' }
        ]
    };
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Security Dashboard - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    const app = express();
    const server = http.createServer(app);

    // Endpoint para el dashboard
    app.get('/', (req, res) => {
        res.send(generateDashboardHTML());
    });

    // API endpoint
    app.get('/api/dashboard', (req, res) => {
        const data = generateMockData();
        res.json(data);
    });

    // Health check
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Iniciar servidor
    server.listen(port, () => {
        console.log(`✅ Dashboard iniciado en: http://localhost:${port}`);
        console.log(`📊 Métricas actualizadas cada ${CONFIG.refreshInterval/1000} segundos`);
        
        if (openBrowser) {
            const url = `http://localhost:${port}`;
            const start = process.platform === 'darwin' ? 'open' : 
                        process.platform === 'win32' ? 'start' : 'xdg-open';
            exec(`${start} ${url}`);
            console.log(`🌐 Abriendo en el navegador: ${url}`);
        }
        
        console.log('\n🔄 Dashboard ejecutándose. Presiona Ctrl+C para detener.');
    });

    // Manejar cierre
    process.on('SIGINT', () => {
        console.log('\n🛑 Deteniendo dashboard...');
        server.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Deteniendo dashboard...');
        server.close();
        process.exit(0);
    });
})();
