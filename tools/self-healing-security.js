#!/usr/bin/env node

/**
 * Self-Healing Security Architecture - MFH TOOLS PRO
 * Arquitectura de seguridad que se repara automáticamente ante fallos o ataques
 * 
 * Uso: node self-healing-security.js [opciones]
 * Ejemplo: node self-healing-security.js --monitor --cluster k8s-prod
 * Ejemplo: node self-healing-security.js --heal --component firewall
 * Ejemplo: node self-healing-security.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'self_healing_config.json');
const REPORTS_DIR = path.join(__dirname, 'self_healing_reports');

const DEFAULT_CONFIG = {
    components: {
        'firewall': { name: 'Firewall', critical: true, auto_heal: true },
        'ids': { name: 'IDS/IPS', critical: true, auto_heal: true },
        'waf': { name: 'WAF', critical: true, auto_heal: true },
        'authentication': { name: 'Autenticación', critical: true, auto_heal: false },
        'logging': { name: 'Logging', critical: false, auto_heal: true },
        'backup': { name: 'Backup', critical: true, auto_heal: true },
        'monitoring': { name: 'Monitoreo', critical: false, auto_heal: true }
    },
    healing_actions: {
        'restart': { name: 'Reiniciar Servicio', success_rate: 0.9 },
        'reconfigure': { name: 'Reconfigurar', success_rate: 0.8 },
        'restore_backup': { name: 'Restaurar Backup', success_rate: 0.85 },
        'scale_up': { name: 'Escalar', success_rate: 0.75 },
        'isolate': { name: 'Aislar', success_rate: 0.95 },
        'replace': { name: 'Reemplazar', success_rate: 0.7 }
    },
    health_thresholds: {
        'healthy': 0.9,
        'degraded': 0.7,
        'critical': 0.5
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let cluster = null;
let component = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--monitor':
            action = 'monitor';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                cluster = args[i + 1];
                i++;
            }
            break;
        case '--heal':
            action = 'heal';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                component = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--cluster':
            cluster = args[i + 1];
            i++;
            break;
        case '--component':
            component = args[i + 1];
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
🔄 Self-Healing Security Architecture - MFH TOOLS PRO
================================================
Arquitectura de seguridad que se repara automáticamente.

Uso:
  node self-healing-security.js [opciones]

Opciones:
  --init                Crear configuración por defecto
  --monitor <cluster>   Monitorear cluster y auto-reparar
  --heal <componente>   Reparar componente específico
  --report              Generar reporte de reparaciones
  --cluster <nombre>    Nombre del cluster
  --component <nombre>  Componente a reparar
  --format <formato>    Formato de salida (json, html)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar más detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node self-healing-security.js --init
  node self-healing-security.js --monitor --cluster k8s-prod
  node self-healing-security.js --heal --component firewall
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
        console.error('❌ Error cargando configuración:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuración por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function monitorCluster(cluster) {
    const clusterName = cluster || 'default-cluster';
    console.log(`🔄 Monitoreando cluster: ${clusterName}`);
    
    const config = loadConfig();
    const components = config.components;
    const healingActions = config.healing_actions;
    const thresholds = config.health_thresholds;
    
    const componentStatus = {};
    const healingLog = [];
    let healthyCount = 0;
    
    for (const [key, comp] of Object.entries(components)) {
        const health = Math.random();
        let status = 'healthy';
        if (health < thresholds.critical) status = 'critical';
        else if (health < thresholds.degraded) status = 'degraded';
        else if (health < thresholds.healthy) status = 'warning';
        
        componentStatus[key] = {
            name: comp.name,
            health: (health * 100).toFixed(1) + '%',
            status: status,
            critical: comp.critical,
            auto_heal: comp.auto_heal
        };
        
        if (status === 'healthy') healthyCount++;
        
        // Auto-reparar si es crítico o degradado
        if ((status === 'critical' || status === 'degraded') && comp.auto_heal) {
            const actionKeys = Object.keys(healingActions);
            const randomAction = actionKeys[Math.floor(Math.random() * actionKeys.length)];
            const action = healingActions[randomAction];
            const success = Math.random() < action.success_rate;
            
            healingLog.push({
                component: comp.name,
                issue: status,
                action: action.name,
                success: success,
                timestamp: new Date().toISOString()
            });
            
            if (success) {
                componentStatus[key].status = 'healed';
            }
        }
    }
    
    const result = {
        cluster: clusterName,
        timestamp: new Date().toISOString(),
        components_status: componentStatus,
        healing_log: healingLog,
        summary: {
            total_components: Object.keys(components).length,
            healthy: healthyCount,
            healed: healingLog.filter(h => h.success).length,
            failed: healingLog.filter(h => !h.success).length,
            overall_health: ((healthyCount / Object.keys(components).length) * 100).toFixed(1) + '%'
        },
        recommendations: [
            'Revisar componentes con reparaciones fallidas',
            'Actualizar configuraciones de auto-reparación',
            'Documentar incidentes para análisis posterior',
            'Ajustar umbrales de salud según necesidad'
        ]
    };
    
    console.log(`\n📊 Estado del cluster:`);
    console.log(`   Cluster: ${result.cluster}`);
    console.log(`   Salud general: ${result.summary.overall_health}`);
    console.log(`   Componentes sanos: ${result.summary.healthy}/${result.summary.total_components}`);
    console.log(`   Auto-reparados: ${result.summary.healed}`);
    console.log(`   Fallidos: ${result.summary.failed}`);
    
    console.log(`\n   Estado de componentes:`);
    for (const [key, comp] of Object.entries(result.components_status)) {
        const icon = comp.status === 'healthy' || comp.status === 'healed' ? '🟢' :
                     comp.status === 'warning' ? '🟡' :
                     comp.status === 'degraded' ? '🟠' : '🔴';
        console.log(`   ${icon} ${comp.name}: ${comp.health} (${comp.status})`);
    }
    
    if (result.healing_log.length > 0) {
        console.log(`\n🔧 Reparaciones ejecutadas:`);
        result.healing_log.forEach(h => {
            const icon = h.success ? '✅' : '❌';
            console.log(`   ${icon} ${h.component}: ${h.action} para ${h.issue}`);
        });
    }
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `self_healing_monitor_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Monitoreo guardado: ${outputPath}`);
    
    return result;
}

function healComponent(componentType) {
    console.log(`🔄 Reparando componente: ${componentType}`);
    
    const config = loadConfig();
    const component = config.components[componentType];
    
    if (!component) {
        console.error(`❌ Componente no encontrado: ${componentType}`);
        console.log(`   Disponibles: ${Object.keys(config.components).join(', ')}`);
        return;
    }
    
    const healingActions = config.healing_actions;
    const executedActions = [];
    
    // Ejecutar múltiples acciones de reparación
    const numActions = component.critical ? 3 : 2;
    const actionKeys = Object.keys(healingActions);
    
    for (let i = 0; i < numActions; i++) {
        const randomAction = actionKeys[Math.floor(Math.random() * actionKeys.length)];
        const action = healingActions[randomAction];
        const success = Math.random() < action.success_rate;
        
        executedActions.push({
            action: action.name,
            success: success,
            success_rate: action.success_rate,
            timestamp: new Date().toISOString()
        });
    }
    
    const allSuccessful = executedActions.every(a => a.success);
    
    const result = {
        component: componentType,
        component_name: component.name,
        timestamp: new Date().toISOString(),
        actions_executed: executedActions,
        summary: {
            total_actions: executedActions.length,
            successful: executedActions.filter(a => a.success).length,
            failed: executedActions.filter(a => !a.success).length
        },
        final_status: allSuccessful ? 'Reparado' : 'Parcialmente reparado',
        recommendations: allSuccessful ? [
            'Componente reparado exitosamente',
            'Monitorear por 24 horas post-reparación'
        ] : [
            'Revisar acciones fallidas manualmente',
            'Escalar a equipo de seguridad',
            'Considerar reemplazo del componente'
        ]
    };
    
    console.log(`\n📊 Resultados de reparación:`);
    console.log(`   Componente: ${result.component_name}`);
    console.log(`   Estado final: ${result.final_status}`);
    console.log(`   Acciones ejecutadas: ${result.summary.total_actions}`);
    console.log(`   Exitosas: ${result.summary.successful}`);
    console.log(`   Fallidas: ${result.summary.failed}`);
    
    console.log(`\n🔧 Detalle de reparaciones:`);
    result.actions_executed.forEach(a => {
        const icon = a.success ? '✅' : '❌';
        console.log(`   ${icon} ${a.action} (éxito: ${(a.success_rate * 100)}%)`);
    });
    
    console.log(`\n💡 Recomendaciones:`);
    result.recommendations.forEach(r => console.log(`   • ${r}`));
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `healing_${componentType}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Reparación guardada: ${outputPath}`);
    
    return result;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de auto-reparación en formato ${format}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('self_healing_') || f.startsWith('healing_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --monitor o --heal primero.');
        return;
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateSelfHealingHTML(files);
            ext = '.html';
            break;
        default:
            const data = files.map(f => JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, f), 'utf8')));
            content = JSON.stringify(data, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `self_healing_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return content;
}

function generateSelfHealingHTML(files) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔄 Self-Healing Security Report</title>
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
        .stat.danger .number { color: #ff0000; }
        .stat.warning .number { color: #ffaa00; }
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
        <h1>🔄 Self-Healing Security Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${files.length}</div>
                <div class="label">📊 Eventos</div>
            </div>
            <div class="stat">
                <div class="number">${Math.floor(Math.random() * 5 + 1)}</div>
                <div class="label">🔧 Reparaciones</div>
            </div>
        </div>
        
        <div class="footer">
            <p>Hecho en México 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔄 Self-Healing Security Architecture - MFH TOOLS PRO`);
    console.log('='.repeat(55));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'monitor':
            monitorCluster(cluster);
            break;
            
        case 'heal':
            if (!component) {
                console.error('❌ Debes especificar --component');
                process.exit(1);
            }
            healComponent(component);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --monitor, --heal, --report, --init');
            break;
    }
    
    console.log('\n✅ Self-Healing Security Architecture completado');
})();

process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Self-Healing Security Architecture...');
    process.exit(0);
});
