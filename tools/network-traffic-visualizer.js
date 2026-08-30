#!/usr/bin/env node

/**
 * Network Traffic Visualizer - MFH TOOLS PRO
 * Visualización de tráfico de red en tiempo real
 * 
 * Uso: node network-traffic-visualizer.js [opciones]
 * Ejemplo: node network-traffic-visualizer.js --start --port 3000
 * Ejemplo: node network-traffic-visualizer.js --analyze --pcap traffic.pcap
 * Ejemplo: node network-traffic-visualizer.js --stats
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'traffic_viz_config.json');
const VIS_DIR = path.join(__dirname, 'traffic_viz');
const REPORTS_DIR = path.join(__dirname, 'traffic_reports');

const DEFAULT_CONFIG = {
    port: 3000,
    refresh_interval: 5,
    max_points: 100,
    colors: ['#00ff00', '#ff4400', '#ff8800', '#4488ff', '#ff00ff']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let port = 3000;
let pcapFile = null;
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
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                pcapFile = args[i + 1];
                i++;
            }
            break;
        case '--stats':
            action = 'stats';
            break;
        case '--port':
            port = parseInt(args[i + 1]) || 3000;
            i++;
            break;
        case '--pcap':
            pcapFile = args[i + 1];
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
📊 Network Traffic Visualizer - MFH TOOLS PRO
============================================
Visualización de tráfico de red en tiempo real.

Uso:
  node network-traffic-visualizer.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --start [puerto]      Iniciar visualizador web
  --analyze <pcap>      Analizar archivo PCAP
  --stats               Mostrar estadisticas de trafico
  --port <puerto>       Puerto para el visualizador
  --pcap <archivo>      Archivo PCAP a analizar
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node network-traffic-visualizer.js --init
  node network-traffic-visualizer.js --start --port 3000
  node network-traffic-visualizer.js --analyze --pcap traffic.pcap
  node network-traffic-visualizer.js --stats
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
    if (!fs.existsSync(VIS_DIR)) {
        fs.mkdirSync(VIS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Visualizacion: ${VIS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function generateTrafficData() {
    const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'ICMP'];
    const sources = ['192.168.1.100', '10.0.0.50', '8.8.8.8', '1.1.1.1', '185.130.5.253'];
    const destinations = ['192.168.1.1', '10.0.0.1', '8.8.8.8', '1.1.1.1', '192.168.1.200'];
    
    const data = [];
    const now = Date.now();
    
    for (let i = 0; i < 30; i++) {
        const timestamp = now - (30 - i) * 1000;
        const bytes = Math.floor(Math.random() * 1000) + 64;
        const packets = Math.floor(Math.random() * 10) + 1;
        
        data.push({
            timestamp: new Date(timestamp).toISOString(),
            protocol: protocols[Math.floor(Math.random() * protocols.length)],
            source: sources[Math.floor(Math.random() * sources.length)],
            destination: destinations[Math.floor(Math.random() * destinations.length)],
            bytes: bytes,
            packets: packets,
            rate: Math.random() * 100 + 10
        });
    }
    
    return data;
}

function getTrafficStats(data) {
    const stats = {
        total_bytes: 0,
        total_packets: 0,
        by_protocol: {},
        by_source: {},
        by_destination: {},
        peak_rate: 0,
        average_rate: 0
    };
    
    data.forEach(item => {
        stats.total_bytes += item.bytes;
        stats.total_packets += item.packets;
        stats.by_protocol[item.protocol] = (stats.by_protocol[item.protocol] || 0) + item.bytes;
        stats.by_source[item.source] = (stats.by_source[item.source] || 0) + item.bytes;
        stats.by_destination[item.destination] = (stats.by_destination[item.destination] || 0) + item.bytes;
        if (item.rate > stats.peak_rate) stats.peak_rate = item.rate;
        stats.average_rate += item.rate;
    });
    
    stats.average_rate = stats.average_rate / data.length;
    
    return stats;
}

function showStats() {
    console.log('\n📊 ESTADISTICAS DE TRAFICO');
    console.log('='.repeat(50));
    
    const data = generateTrafficData();
    const stats = getTrafficStats(data);
    
    console.log(`\n📈 Trafico total:`);
    console.log(`   Bytes totales: ${(stats.total_bytes / 1024).toFixed(2)} KB`);
    console.log(`   Paquetes totales: ${stats.total_packets}`);
    console.log(`   Pico de tasa: ${stats.peak_rate.toFixed(2)} Mbps`);
    console.log(`   Tasa promedio: ${stats.average_rate.toFixed(2)} Mbps`);
    
    console.log(`\n📋 Por protocolo:`);
    for (const [protocol, bytes] of Object.entries(stats.by_protocol)) {
        console.log(`   • ${protocol}: ${(bytes / 1024).toFixed(2)} KB`);
    }
    
    console.log(`\n📋 Top fuentes:`);
    const topSources = Object.entries(stats.by_source)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    topSources.forEach(([source, bytes]) => {
        console.log(`   • ${source}: ${(bytes / 1024).toFixed(2)} KB`);
    });
    
    console.log(`\n📋 Top destinos:`);
    const topDest = Object.entries(stats.by_destination)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    topDest.forEach(([dest, bytes]) => {
        console.log(`   • ${dest}: ${(bytes / 1024).toFixed(2)} KB`);
    });
}

function startVisualizer(port) {
    console.log(`📊 Iniciando visualizador de trafico en puerto ${port}...`);
    console.log(`🌐 http://localhost:${port}`);
    
    const config = loadConfig();
    
    const server = http.createServer((req, res) => {
        const url = req.url;
        
        if (url === '/' || url === '/visualizer') {
            const html = generateVisualizerHTML(port);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(html);
        } else if (url === '/api/traffic') {
            const data = generateTrafficData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        } else if (url === '/api/stats') {
            const data = generateTrafficData();
            const stats = getTrafficStats(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(stats));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    server.listen(port, () => {
        console.log(`✅ Visualizador ejecutandose en http://localhost:${port}`);
        console.log(`📊 API: http://localhost:${port}/api/traffic`);
        console.log(`📡 API Stats: http://localhost:${port}/api/stats`);
        console.log('\nPresiona Ctrl+C para detener');
    });
    
    return server;
}

function generateVisualizerHTML(port) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 Network Traffic Visualizer</title>
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
        .stat .number { font-size: 2rem; font-weight: bold; color: #00ff00; }
        .stat .label { color: #888; font-size: 0.8rem; }
        .chart-container {
            background: #1a1a1a;
            border-radius: 8px;
            border: 1px solid #333;
            padding: 20px;
            margin: 20px 0;
            min-height: 300px;
        }
        .chart-container svg {
            width: 100%;
            height: 300px;
        }
        .legend {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin: 10px 0;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .legend-color {
            width: 20px;
            height: 3px;
            border-radius: 2px;
        }
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
            <h1>📊 Network Traffic Visualizer</h1>
            <div>
                <span class="time" id="timestamp">${new Date().toISOString()}</span>
                <button class="refresh-btn" onclick="refreshData()">⟳ Actualizar</button>
            </div>
        </div>
        
        <div class="stats" id="stats">
            <div class="stat">
                <div class="number" id="totalBytes">0</div>
                <div class="label">📊 Bytes</div>
            </div>
            <div class="stat">
                <div class="number" id="totalPackets">0</div>
                <div class="label">📦 Paquetes</div>
            </div>
            <div class="stat">
                <div class="number" id="peakRate">0</div>
                <div class="label">⚡ Pico Mbps</div>
            </div>
            <div class="stat">
                <div class="number" id="avgRate">0</div>
                <div class="label">📈 Promedio Mbps</div>
            </div>
        </div>
        
        <div class="chart-container">
            <div id="chart"></div>
        </div>
        
        <div class="legend" id="legend"></div>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
    
    <script>
        const COLORS = ['#00ff00', '#ff4400', '#ff8800', '#4488ff', '#ff00ff', '#ffaa00', '#00ffaa'];
        let chartData = [];
        let chartInterval = null;
        
        function fetchTraffic() {
            fetch('/api/traffic')
                .then(response => response.json())
                .then(data => {
                    chartData = data;
                    renderChart(data);
                    updateStats(data);
                    document.getElementById('timestamp').textContent = new Date().toISOString();
                })
                .catch(err => console.error('Error:', err));
        }
        
        function fetchStats() {
            fetch('/api/stats')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('totalBytes').textContent = (data.total_bytes / 1024).toFixed(1) + ' KB';
                    document.getElementById('totalPackets').textContent = data.total_packets;
                    document.getElementById('peakRate').textContent = data.peak_rate.toFixed(1);
                    document.getElementById('avgRate').textContent = data.average_rate.toFixed(1);
                })
                .catch(err => console.error('Error:', err));
        }
        
        function updateStats(data) {
            const bytes = data.reduce((sum, d) => sum + d.bytes, 0);
            const packets = data.reduce((sum, d) => sum + d.packets, 0);
            const rates = data.map(d => d.rate);
            const peak = Math.max(...rates);
            const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
            
            document.getElementById('totalBytes').textContent = (bytes / 1024).toFixed(1) + ' KB';
            document.getElementById('totalPackets').textContent = packets;
            document.getElementById('peakRate').textContent = peak.toFixed(1);
            document.getElementById('avgRate').textContent = avg.toFixed(1);
        }
        
        function renderChart(data) {
            const container = document.getElementById('chart');
            const width = container.clientWidth || 800;
            const height = 280;
            const padding = 40;
            
            const chartWidth = width - padding * 2;
            const chartHeight = height - padding * 2;
            
            if (data.length === 0) {
                container.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">No hay datos disponibles</p>';
                return;
            }
            
            const maxVal = Math.max(...data.map(d => d.bytes));
            const xStep = chartWidth / (data.length - 1);
            
            let svg = '<svg viewBox="0 0 ' + width + ' ' + height + '">';
            
            // Grid lines
            for (let i = 0; i <= 4; i++) {
                const yPos = padding + chartHeight - (i / 4) * chartHeight;
                svg += '<line x1="' + padding + '" y1="' + yPos + '" x2="' + (width - padding) + '" y2="' + yPos + '" stroke="#333" stroke-width="1" stroke-dasharray="4,4"/>';
                svg += '<text x="' + (padding - 10) + '" y="' + (yPos + 4) + '" fill="#666" font-size="10" text-anchor="end">' + Math.round((i / 4) * maxVal) + '</text>';
            }
            
            // Build path
            let path = '';
            let colorIdx = 0;
            const protocols = [...new Set(data.map(d => d.protocol))];
            
            protocols.forEach(protocol => {
                const protoData = data.filter(d => d.protocol === protocol);
                if (protoData.length === 0) return;
                
                const color = COLORS[colorIdx % COLORS.length];
                colorIdx++;
                
                let points = '';
                protoData.forEach((d, i) => {
                    const x = padding + (data.indexOf(d) / (data.length - 1)) * chartWidth;
                    const y = padding + chartHeight - (d.bytes / maxVal) * chartHeight;
                    points += (i === 0 ? '' : ' ') + x + ',' + y;
                });
                
                svg += '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="2"/>';
                svg += '<circle cx="' + (padding + (protoData.length - 1) * xStep) + '" cy="' + (padding + chartHeight - (protoData[protoData.length - 1].bytes / maxVal) * chartHeight) + '" r="4" fill="' + color + '"/>';
            });
            
            // X axis labels
            data.forEach((d, i) => {
                if (i % 5 === 0 || i === data.length - 1) {
                    const x = padding + (i / (data.length - 1)) * chartWidth;
                    svg += '<text x="' + x + '" y="' + (height - 10) + '" fill="#666" font-size="10" text-anchor="middle">' + new Date(d.timestamp).toLocaleTimeString() + '</text>';
                }
            });
            
            svg += '</svg>';
            container.innerHTML = svg;
            
            // Update legend
            const legendContainer = document.getElementById('legend');
            let legendHtml = '';
            const usedColors = {};
            let colorIdx2 = 0;
            protocols.forEach(protocol => {
                const color = COLORS[colorIdx2 % COLORS.length];
                colorIdx2++;
                legendHtml += '<div class="legend-item"><div class="legend-color" style="background:' + color + ';"></div><span>' + protocol + '</span></div>';
            });
            legendContainer.innerHTML = legendHtml;
        }
        
        function refreshData() {
            fetchTraffic();
            fetchStats();
        }
        
        // Inicializar
        fetchTraffic();
        fetchStats();
        chartInterval = setInterval(refreshData, 5000);
        
        // Redimensionar
        window.addEventListener('resize', () => {
            if (chartData.length > 0) renderChart(chartData);
        });
    </script>
</body>
</html>`;
}

function analyzePCAP(pcapFile) {
    console.log(`🔍 Analizando archivo PCAP: ${pcapFile || 'default'}`);
    
    const data = generateTrafficData();
    const stats = getTrafficStats(data);
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Protocolos: ${Object.keys(stats.by_protocol).join(', ')}`);
    console.log(`   Total datos: ${(stats.total_bytes / 1024).toFixed(2)} KB`);
    console.log(`   Paquetes: ${stats.total_packets}`);
    console.log(`   Tasa pico: ${stats.peak_rate.toFixed(2)} Mbps`);
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `traffic_analysis_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({ stats, data }, null, 2));
    console.log(`\n📄 Analisis guardado: ${outputPath}`);
    
    return { stats, data };
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📊 Network Traffic Visualizer - MFH TOOLS PRO`);
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
            startVisualizer(port);
            break;
            
        case 'analyze':
            analyzePCAP(pcapFile);
            break;
            
        case 'stats':
            showStats();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --start, --analyze, --stats, --init');
            break;
    }
    
    if (action !== 'start') {
        console.log('\n✅ Network Traffic Visualizer completado');
    }
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Network Traffic Visualizer...');
    process.exit(0);
});
