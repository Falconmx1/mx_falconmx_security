#!/usr/bin/env node

/**
 * Vulnerability Tracker - MFH TOOLS PRO
 * Rastrea vulnerabilidades y su estado en el tiempo
 * 
 * Uso: node vuln-tracker.js [opciones]
 * Ejemplo: node vuln-tracker.js --add --title "SQL Injection" --severity high --asset api.example.com
 * Ejemplo: node vuln-tracker.js --list
 * Ejemplo: node vuln-tracker.js --update VULN-001 --status resolved
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'vulnerabilities.json');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let title = null;
let severity = null;
let asset = null;
let description = null;
let vulnId = null;
let status = null;
let assignee = null;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--add':
            action = 'add';
            break;
        case '--list':
            action = 'list';
            break;
        case '--update':
            action = 'update';
            vulnId = args[i + 1];
            i++;
            break;
        case '--remove':
            action = 'remove';
            vulnId = args[i + 1];
            i++;
            break;
        case '--stats':
            action = 'stats';
            break;
        case '--title':
            title = args[i + 1];
            i++;
            break;
        case '--severity':
            severity = args[i + 1];
            i++;
            break;
        case '--asset':
            asset = args[i + 1];
            i++;
            break;
        case '--description':
            description = args[i + 1];
            i++;
            break;
        case '--status':
            status = args[i + 1];
            i++;
            break;
        case '--assignee':
            assignee = args[i + 1];
            i++;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Vulnerability Tracker - MFH TOOLS PRO
=========================================
Rastrea vulnerabilidades y su estado en el tiempo.

Uso:
  node vuln-tracker.js [opciones]

Opciones:
  --add                   Agregar una nueva vulnerabilidad
  --list                  Listar todas las vulnerabilidades
  --update <id>           Actualizar una vulnerabilidad
  --remove <id>           Eliminar una vulnerabilidad
  --stats                 Mostrar estadísticas
  --title <título>        Título de la vulnerabilidad
  --severity <nivel>      Severidad (critical, high, medium, low)
  --asset <activo>        Activo afectado
  --description <texto>   Descripción
  --status <estado>       Estado (new, in_progress, resolved, false_positive, won_fix)
  --assignee <usuario>    Asignado a
  --help, -h              Mostrar esta ayuda

Ejemplos:
  node vuln-tracker.js --add --title "SQL Injection" --severity high --asset api.example.com
  node vuln-tracker.js --list
  node vuln-tracker.js --update VULN-001 --status resolved
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadVulnerabilities() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando vulnerabilidades:', error.message);
    }
    return { vulns: [], lastId: 0 };
}

function saveVulnerabilities(data) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error guardando vulnerabilidades:', error.message);
    }
}

function generateVulnId(prefix = 'VULN') {
    const data = loadVulnerabilities();
    data.lastId = (data.lastId || 0) + 1;
    saveVulnerabilities(data);
    return `${prefix}-${String(data.lastId).padStart(3, '0')}`;
}

function getSeverityEmoji(severity) {
    const map = {
        'critical': '🔴',
        'high': '🟠',
        'medium': '🟡',
        'low': '🟢'
    };
    return map[severity] || '⚪';
}

function getStatusEmoji(status) {
    const map = {
        'new': '🆕',
        'in_progress': '🔨',
        'resolved': '✅',
        'false_positive': '❌',
        'won_fix': '⏭️'
    };
    return map[status] || '❓';
}

function addVulnerability() {
    if (!title || !severity) {
        console.error('❌ Debes especificar --title y --severity');
        process.exit(1);
    }

    const data = loadVulnerabilities();
    const id = generateVulnId();
    
    const vuln = {
        id,
        title,
        severity,
        asset: asset || 'N/A',
        description: description || '',
        status: status || 'new',
        assignee: assignee || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null
    };
    
    data.vulns.push(vuln);
    saveVulnerabilities(data);
    
    console.log(`✅ Vulnerabilidad agregada: ${id}`);
    console.log(`📋 Título: ${title}`);
    console.log(`📊 Severidad: ${severity}`);
    console.log(`🎯 Activo: ${vuln.asset}`);
}

function listVulnerabilities() {
    const data = loadVulnerabilities();
    if (data.vulns.length === 0) {
        console.log('📭 No hay vulnerabilidades registradas');
        return;
    }
    
    console.log(`\n📋 VULNERABILIDADES (${data.vulns.length}):`);
    console.log('='.repeat(70));
    
    // Ordenar por severidad (crítica primero)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...data.vulns].sort((a, b) => {
        return (severityOrder[a.severity] || 9) - (severityOrder[b.severity] || 9);
    });
    
    for (const vuln of sorted) {
        const sevIcon = getSeverityEmoji(vuln.severity);
        const statusIcon = getStatusEmoji(vuln.status);
        
        console.log(`\n${sevIcon} ${statusIcon} [${vuln.id}] ${vuln.title}`);
        console.log(`   📊 Severidad: ${vuln.severity.toUpperCase()}`);
        console.log(`   🎯 Activo: ${vuln.asset}`);
        console.log(`   📌 Estado: ${vuln.status}`);
        if (vuln.assignee) {
            console.log(`   👤 Asignado: ${vuln.assignee}`);
        }
        console.log(`   📅 Creado: ${new Date(vuln.createdAt).toLocaleString()}`);
        if (vuln.resolvedAt) {
            console.log(`   ✅ Resuelto: ${new Date(vuln.resolvedAt).toLocaleString()}`);
        }
        if (vuln.description) {
            console.log(`   📝 ${vuln.description.substring(0, 80)}${vuln.description.length > 80 ? '...' : ''}`);
        }
    }
}

function updateVulnerability(id) {
    if (!status) {
        console.error('❌ Debes especificar --status para actualizar');
        process.exit(1);
    }
    
    const data = loadVulnerabilities();
    const vuln = data.vulns.find(v => v.id === id);
    
    if (!vuln) {
        console.error(`❌ Vulnerabilidad no encontrada: ${id}`);
        process.exit(1);
    }
    
    const oldStatus = vuln.status;
    vuln.status = status;
    vuln.updatedAt = new Date().toISOString();
    
    if (status === 'resolved' || status === 'false_positive') {
        vuln.resolvedAt = new Date().toISOString();
    }
    
    if (assignee) {
        vuln.assignee = assignee;
    }
    
    saveVulnerabilities(data);
    
    console.log(`✅ Vulnerabilidad actualizada: ${id}`);
    console.log(`📊 Estado: ${oldStatus} → ${status}`);
    if (vuln.resolvedAt) {
        console.log(`✅ Resuelta el: ${new Date(vuln.resolvedAt).toLocaleString()}`);
    }
}

function removeVulnerability(id) {
    const data = loadVulnerabilities();
    const initialLength = data.vulns.length;
    data.vulns = data.vulns.filter(v => v.id !== id);
    
    if (data.vulns.length === initialLength) {
        console.error(`❌ Vulnerabilidad no encontrada: ${id}`);
        process.exit(1);
    }
    
    saveVulnerabilities(data);
    console.log(`✅ Vulnerabilidad eliminada: ${id}`);
}

function showStats() {
    const data = loadVulnerabilities();
    if (data.vulns.length === 0) {
        console.log('📭 No hay vulnerabilidades para estadísticas');
        return;
    }
    
    const stats = {
        total: data.vulns.length,
        bySeverity: {},
        byStatus: {},
        byAsset: {},
        resolved: 0,
        open: 0,
        avgResolution: 0
    };
    
    let totalResolutionDays = 0;
    let resolvedCount = 0;
    
    for (const vuln of data.vulns) {
        // Por severidad
        stats.bySeverity[vuln.severity] = (stats.bySeverity[vuln.severity] || 0) + 1;
        
        // Por estado
        stats.byStatus[vuln.status] = (stats.byStatus[vuln.status] || 0) + 1;
        if (vuln.status === 'resolved' || vuln.status === 'false_positive') {
            stats.resolved++;
        } else {
            stats.open++;
        }
        
        // Por activo
        if (vuln.asset) {
            stats.byAsset[vuln.asset] = (stats.byAsset[vuln.asset] || 0) + 1;
        }
        
        // Tiempo de resolución
        if (vuln.resolvedAt) {
            const created = new Date(vuln.createdAt);
            const resolved = new Date(vuln.resolvedAt);
            const days = (resolved - created) / (1000 * 60 * 60 * 24);
            totalResolutionDays += days;
            resolvedCount++;
        }
    }
    
    if (resolvedCount > 0) {
        stats.avgResolution = totalResolutionDays / resolvedCount;
    }
    
    console.log(`\n📊 ESTADÍSTICAS DE VULNERABILIDADES:`);
    console.log('='.repeat(50));
    console.log(`📋 Total: ${stats.total}`);
    console.log(`✅ Resueltas: ${stats.resolved}`);
    console.log(`🔴 Abiertas: ${stats.open}`);
    console.log(`⏱️ Tiempo promedio de resolución: ${stats.avgResolution.toFixed(1)} días`);
    
    console.log('\n📊 POR SEVERIDAD:');
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    for (const sev of severityOrder) {
        if (stats.bySeverity[sev]) {
            const emoji = getSeverityEmoji(sev);
            console.log(`   ${emoji} ${sev}: ${stats.bySeverity[sev]}`);
        }
    }
    
    console.log('\n📊 POR ESTADO:');
    for (const [status, count] of Object.entries(stats.byStatus)) {
        const emoji = getStatusEmoji(status);
        console.log(`   ${emoji} ${status}: ${count}`);
    }
    
    if (Object.keys(stats.byAsset).length > 0) {
        console.log('\n📊 POR ACTIVO:');
        const sortedAssets = Object.entries(stats.byAsset).sort((a, b) => b[1] - a[1]);
        for (const [asset, count] of sortedAssets.slice(0, 10)) {
            console.log(`   🎯 ${asset}: ${count}`);
        }
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Vulnerability Tracker - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    switch (action) {
        case 'add':
            addVulnerability();
            break;
        case 'list':
            listVulnerabilities();
            break;
        case 'update':
            if (!vulnId) {
                console.error('❌ Debes especificar un ID de vulnerabilidad');
                process.exit(1);
            }
            updateVulnerability(vulnId);
            break;
        case 'remove':
            if (!vulnId) {
                console.error('❌ Debes especificar un ID de vulnerabilidad');
                process.exit(1);
            }
            removeVulnerability(vulnId);
            break;
        case 'stats':
            showStats();
            break;
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            break;
    }

    console.log('\n✅ Vulnerability Tracker completado');
})();
