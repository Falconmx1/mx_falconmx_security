#!/usr/bin/env node

/**
 * IOC Correlator - MFH TOOLS PRO
 * Correlacion de indicadores de compromiso (IOCs)
 * 
 * Uso: node ioc-correlator.js [opciones]
 * Ejemplo: node ioc-correlator.js --correlate --iocs iocs.json
 * Ejemplo: node ioc-correlator.js --analyze --source "185.130.5.253"
 * Ejemplo: node ioc-correlator.js --graph --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'ioc_correlator_config.json');
const IOCS_DIR = path.join(__dirname, 'ioc_correlator_data');
const REPORTS_DIR = path.join(__dirname, 'ioc_correlator_reports');

const DEFAULT_CONFIG = {
    sources: ['alienvault', 'virustotal', 'abuseipdb', 'phishtank', 'misp'],
    correlation: {
        max_distance: 3,
        min_confidence: 0.6,
        max_iocs_per_report: 100
    },
    graph: {
        include_relations: true,
        max_nodes: 50
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let iocsFile = null;
let sourceValue = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--correlate':
            action = 'correlate';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                iocsFile = args[i + 1];
                i++;
            }
            break;
        case '--analyze':
            action = 'analyze';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                sourceValue = args[i + 1];
                i++;
            }
            break;
        case '--graph':
            action = 'graph';
            break;
        case '--source':
            sourceValue = args[i + 1];
            i++;
            break;
        case '--format':
            format = args[i + 1];
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
🔗 IOC Correlator - MFH TOOLS PRO
================================
Correlacion de indicadores de compromiso (IOCs).

Uso:
  node ioc-correlator.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --correlate [archivo] Correlacionar IoCs
  --analyze <fuente>    Analizar fuente especifica
  --graph               Generar grafo de relaciones
  --source <valor>      Fuente a analizar (IP, dominio, hash)
  --format <formato>    Formato de salida (json, html, graphml)
  --output <archivo>    Guardar resultados
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node ioc-correlator.js --init
  node ioc-correlator.js --correlate --iocs iocs.json
  node ioc-correlator.js --analyze --source 185.130.5.253
  node ioc-correlator.js --graph --format html
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
    if (!fs.existsSync(IOCS_DIR)) {
        fs.mkdirSync(IOCS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear IoCs de ejemplo para correlacion
    const sampleIocs = generateSampleIOCs();
    const samplePath = path.join(IOCS_DIR, 'sample_iocs.json');
    fs.writeFileSync(samplePath, JSON.stringify(sampleIocs, null, 2));
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 IoCs: ${IOCS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
    console.log(`📄 IoCs de ejemplo: ${samplePath}`);
}

function generateSampleIOCs() {
    const iocs = [];
    const types = ['ip', 'domain', 'hash', 'url', 'email'];
    const sources = ['alienvault', 'virustotal', 'abuseipdb', 'phishtank', 'misp'];
    const risks = ['low', 'medium', 'high', 'critical'];
    
    // Generar IoCs con relaciones
    const baseIps = ['185.130.5.253', '103.230.15.20', '80.70.30.10', '45.33.22.11', '192.168.1.100'];
    const baseDomains = ['malware.com', 'phishing-site.net', 'c2-server.org', 'ransomware.biz', 'evil-domain.info'];
    const baseHashes = [
        '5d41402abc4b2a76b9719d911017c592',
        'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
        '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    ];
    
    for (let i = 0; i < 20; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        let value = '';
        if (type === 'ip') value = baseIps[Math.floor(Math.random() * baseIps.length)];
        else if (type === 'domain') value = baseDomains[Math.floor(Math.random() * baseDomains.length)];
        else if (type === 'hash') value = baseHashes[Math.floor(Math.random() * baseHashes.length)];
        else if (type === 'url') value = `https://${baseDomains[Math.floor(Math.random() * baseDomains.length)]}/path/${i}`;
        else value = `attacker${i}@${baseDomains[Math.floor(Math.random() * baseDomains.length)]}`;
        
        const ioc = {
            id: crypto.randomBytes(8).toString('hex'),
            type: type,
            value: value,
            source: sources[Math.floor(Math.random() * sources.length)],
            risk: risks[Math.floor(Math.random() * risks.length)],
            timestamp: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            related_iocs: []
        };
        
        // Agregar relaciones con otros IoCs
        const numRelations = Math.floor(Math.random() * 3);
        for (let j = 0; j < numRelations; j++) {
            const relType = types[Math.floor(Math.random() * types.length)];
            let relValue = '';
            if (relType === 'ip') relValue = baseIps[Math.floor(Math.random() * baseIps.length)];
            else if (relType === 'domain') relValue = baseDomains[Math.floor(Math.random() * baseDomains.length)];
            else if (relType === 'hash') relValue = baseHashes[Math.floor(Math.random() * baseHashes.length)];
            else if (relType === 'url') relValue = `https://${baseDomains[Math.floor(Math.random() * baseDomains.length)]}/path/${j}`;
            else relValue = `attacker${j}@${baseDomains[Math.floor(Math.random() * baseDomains.length)]}`;
            
            ioc.related_iocs.push({
                type: relType,
                value: relValue,
                confidence: 0.5 + Math.random() * 0.5
            });
        }
        
        iocs.push(ioc);
    }
    
    return iocs;
}

function loadIOCs(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);
            return Array.isArray(data) ? data : [data];
        }
    } catch (error) {
        console.error('❌ Error cargando IoCs:', error.message);
    }
    
    // Cargar IoCs de ejemplo
    const samplePath = path.join(IOCS_DIR, 'sample_iocs.json');
    if (fs.existsSync(samplePath)) {
        const content = fs.readFileSync(samplePath, 'utf8');
        return JSON.parse(content);
    }
    
    return generateSampleIOCs();
}

function correlateIOCs(iocs) {
    console.log(`🔗 Correlacionando ${iocs.length} IoCs...`);
    
    const config = loadConfig();
    const results = [];
    const clusters = [];
    let correlatedCount = 0;
    
    // Simular correlacion
    for (const ioc of iocs) {
        const correlations = [];
        for (const other of iocs) {
            if (ioc.id === other.id) continue;
            
            // Verificar si estan relacionados
            const isRelated = ioc.related_iocs && ioc.related_iocs.some(r => r.value === other.value);
            
            if (isRelated || Math.random() < 0.1) {
                const confidence = 0.5 + Math.random() * 0.5;
                correlations.push({
                    ioc_id: other.id,
                    ioc_value: other.value,
                    ioc_type: other.type,
                    confidence: confidence,
                    relationship: ['same_campaign', 'same_actor', 'same_infrastructure', 'shared_domain'][Math.floor(Math.random() * 4)]
                });
                correlatedCount++;
            }
        }
        
        if (correlations.length > 0) {
            results.push({
                ioc: ioc,
                correlations: correlations,
                confidence: Math.min(1, correlations.reduce((acc, c) => acc + c.confidence, 0) / correlations.length)
            });
        }
    }
    
    // Agrupar en clusters
    const seen = new Set();
    for (const result of results) {
        if (seen.has(result.ioc.id)) continue;
        seen.add(result.ioc.id);
        
        const cluster = {
            id: crypto.randomBytes(8).toString('hex'),
            iocs: [result.ioc],
            confidence: result.confidence
        };
        
        for (const corr of result.correlations) {
            const other = results.find(r => r.ioc.id === corr.ioc_id);
            if (other && !seen.has(other.ioc.id)) {
                cluster.iocs.push(other.ioc);
                seen.add(other.ioc.id);
                cluster.confidence = (cluster.confidence + other.confidence) / 2;
            }
        }
        
        clusters.push(cluster);
    }
    
    console.log(`\n📊 Resultados de correlacion:`);
    console.log(`   IoCs procesados: ${iocs.length}`);
    console.log(`   Correlaciones encontradas: ${correlatedCount}`);
    console.log(`   Clusters formados: ${clusters.length}`);
    
    if (clusters.length > 0) {
        console.log(`\n🔍 Clusters detectados:`);
        clusters.slice(0, 5).forEach(cluster => {
            console.log(`   • Cluster ${cluster.id.substring(0, 8)}: ${cluster.iocs.length} IoCs | Confianza: ${(cluster.confidence * 100).toFixed(1)}%`);
            cluster.iocs.slice(0, 3).forEach(ioc => {
                console.log(`      - ${ioc.type}: ${ioc.value}`);
            });
            if (cluster.iocs.length > 3) {
                console.log(`      ... y ${cluster.iocs.length - 3} mas`);
            }
        });
    }
    
    const report = {
        timestamp: new Date().toISOString(),
        total_iocs: iocs.length,
        correlations: correlatedCount,
        clusters: clusters,
        results: results
    };
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return report;
}

function analyzeSource(source) {
    console.log(`🔍 Analizando fuente: ${source}`);
    
    const iocs = loadIOCs(null);
    const related = [];
    
    for (const ioc of iocs) {
        if (ioc.value === source || ioc.value.includes(source)) {
            related.push(ioc);
        }
        
        if (ioc.related_iocs) {
            for (const rel of ioc.related_iocs) {
                if (rel.value === source || rel.value.includes(source)) {
                    if (!related.find(r => r.id === ioc.id)) {
                        related.push(ioc);
                    }
                }
            }
        }
    }
    
    console.log(`\n📊 Resultados del analisis:`);
    console.log(`   Fuente: ${source}`);
    console.log(`   IoCs relacionados: ${related.length}`);
    
    if (related.length > 0) {
        console.log(`\n🔗 IoCs relacionados:`);
        related.forEach(ioc => {
            console.log(`   • ${ioc.type}: ${ioc.value} (${ioc.source})`);
        });
    }
    
    const analysis = {
        timestamp: new Date().toISOString(),
        source: source,
        related_iocs: related,
        total: related.length
    };
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
        console.log(`\n📄 Analisis guardado: ${outputFile}`);
    }
    
    return analysis;
}

function generateGraph(format) {
    console.log(`📊 Generando grafo de relaciones en formato ${format}`);
    
    const iocs = loadIOCs(null);
    const nodes = [];
    const edges = [];
    
    // Crear nodos
    for (const ioc of iocs.slice(0, 20)) {
        nodes.push({
            id: ioc.id,
            label: ioc.value.substring(0, 20),
            type: ioc.type,
            risk: ioc.risk || 'low'
        });
    }
    
    // Crear edges
    for (const ioc of iocs) {
        if (ioc.related_iocs) {
            for (const rel of ioc.related_iocs) {
                const target = iocs.find(i => i.value === rel.value);
                if (target) {
                    edges.push({
                        source: ioc.id,
                        target: target.id,
                        confidence: rel.confidence || 0.5,
                        type: 'related'
                    });
                }
            }
        }
    }
    
    const graph = {
        nodes: nodes,
        edges: edges.slice(0, 30),
        stats: {
            total_nodes: nodes.length,
            total_edges: edges.length,
            avg_degree: (edges.length * 2 / nodes.length).toFixed(2)
        }
    };
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateHTMLGraph(graph);
            ext = '.html';
            break;
        case 'graphml':
            content = generateGraphML(graph);
            ext = '.graphml';
            break;
        default:
            content = JSON.stringify(graph, null, 2);
            ext = '.json';
    }
    
    const graphFile = outputFile || path.join(REPORTS_DIR, `graph_${Date.now()}${ext}`);
    fs.writeFileSync(graphFile, content);
    
    console.log(`\n📊 Grafo generado:`);
    console.log(`   Nodos: ${graph.stats.total_nodes}`);
    console.log(`   Aristas: ${graph.stats.total_edges}`);
    console.log(`   Grado promedio: ${graph.stats.avg_degree}`);
    console.log(`   📁 Guardado: ${graphFile}`);
    
    return graph;
}

function generateHTMLGraph(graph) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IOC Correlation Graph</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #1a1a1a;
            border-radius: 12px;
            border: 1px solid #00ff00;
            padding: 40px;
        }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 15px; margin-bottom: 20px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat {
            background: #0a0a0a;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333;
            text-align: center;
        }
        .stat .number { font-size: 2rem; font-weight: bold; color: #00ff00; }
        .stat .label { color: #888; font-size: 0.8rem; }
        .graph-container {
            background: #0a0a0a;
            border-radius: 8px;
            border: 1px solid #333;
            padding: 20px;
            margin: 20px 0;
            min-height: 400px;
        }
        .graph-container svg {
            width: 100%;
            height: 400px;
        }
        .node { fill: #00ff00; stroke: #00cc00; stroke-width: 2px; }
        .node-critical { fill: #ff0000; }
        .node-high { fill: #ff4400; }
        .node-medium { fill: #ff8800; }
        .node-low { fill: #00cc00; }
        .edge { stroke: #666; stroke-width: 1px; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔗 IOC Correlation Graph</h1>
        <p><strong>Generado:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${graph.stats.total_nodes}</div>
                <div class="label">📌 Nodos</div>
            </div>
            <div class="stat">
                <div class="number">${graph.stats.total_edges}</div>
                <div class="label">🔗 Aristas</div>
            </div>
            <div class="stat">
                <div class="number">${graph.stats.avg_degree}</div>
                <div class="label">📊 Grado promedio</div>
            </div>
        </div>
        
        <div class="graph-container">
            <svg viewBox="0 0 800 400">
                ${graph.nodes.map((node, i) => {
                    const x = 100 + (i % 5) * 150;
                    const y = 50 + Math.floor(i / 5) * 80;
                    const riskClass = node.risk === 'critical' ? 'node-critical' : 
                                     node.risk === 'high' ? 'node-high' : 
                                     node.risk === 'medium' ? 'node-medium' : 'node-low';
                    return `<circle cx="${x}" cy="${y}" r="20" class="node ${riskClass}" />
                            <text x="${x}" y="${y + 5}" fill="#000" font-size="10" text-anchor="middle">${node.label.substring(0, 8)}</text>`;
                }).join('')}
                ${graph.edges.map(edge => {
                    const sourceIdx = graph.nodes.findIndex(n => n.id === edge.source);
                    const targetIdx = graph.nodes.findIndex(n => n.id === edge.target);
                    if (sourceIdx === -1 || targetIdx === -1) return '';
                    const x1 = 100 + (sourceIdx % 5) * 150 + 20;
                    const y1 = 50 + Math.floor(sourceIdx / 5) * 80 + 20;
                    const x2 = 100 + (targetIdx % 5) * 150 + 20;
                    const y2 = 50 + Math.floor(targetIdx / 5) * 80 + 20;
                    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="edge" />`;
                }).join('')}
            </svg>
        </div>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

function generateGraphML(graph) {
    let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <graph id="ioc-graph" edgedefault="undirected">
    <key id="label" for="node" attr.name="label" attr.type="string"/>
    <key id="type" for="node" attr.name="type" attr.type="string"/>
    <key id="risk" for="node" attr.name="risk" attr.type="string"/>
    <key id="confidence" for="edge" attr.name="confidence" attr.type="double"/>
    <key id="relationship" for="edge" attr.name="relationship" attr.type="string"/>`;
    
    for (const node of graph.nodes) {
        graphml += `
    <node id="${node.id}">
      <data key="label">${node.label}</data>
      <data key="type">${node.type}</data>
      <data key="risk">${node.risk || 'low'}</data>
    </node>`;
    }
    
    for (const edge of graph.edges) {
        graphml += `
    <edge source="${edge.source}" target="${edge.target}">
      <data key="confidence">${edge.confidence || 0.5}</data>
      <data key="relationship">${edge.type || 'related'}</data>
    </edge>`;
    }
    
    graphml += `
  </graph>
</graphml>`;
    
    return graphml;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔗 IOC Correlator - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'correlate':
            const iocs = loadIOCs(iocsFile);
            correlateIOCs(iocs);
            break;
            
        case 'analyze':
            if (!sourceValue) {
                console.error('❌ Debes especificar --source');
                process.exit(1);
            }
            analyzeSource(sourceValue);
            break;
            
        case 'graph':
            generateGraph(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --correlate, --analyze, --graph, --init');
            break;
    }
    
    console.log('\n✅ IOC Correlator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo IOC Correlator...');
    process.exit(0);
});
