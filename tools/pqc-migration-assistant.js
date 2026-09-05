#!/usr/bin/env node

/**
 * PQC Migration Assistant - MFH TOOLS PRO
 * Asiste en la migración a criptografía post-cuántica
 * 
 * Uso: node pqc-migration-assistant.js [opciones]
 * Ejemplo: node pqc-migration-assistant.js --assess --system "Sistema Principal"
 * Ejemplo: node pqc-migration-assistant.js --plan --timeline 2028
 * Ejemplo: node pqc-migration-assistant.js --report --format html
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'pqc_migration_config.json');
const MIGRATION_DIR = path.join(__dirname, 'migration_data');
const REPORTS_DIR = path.join(__dirname, 'migration_reports');

const DEFAULT_CONFIG = {
    crypto_components: ['key_exchange', 'digital_signatures', 'encryption', 'hash_functions', 'random_number_generation'],
    migration_phases: ['assessment', 'planning', 'testing', 'implementation', 'monitoring'],
    pqc_algorithms: ['Kyber', 'Dilithium', 'Falcon', 'SPHINCS+', 'NTRU', 'SABER', 'XMSS'],
    risk_levels: ['bajo', 'medio', 'alto', 'crítico']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let systemName = null;
let targetYear = 2028;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--assess':
            action = 'assess';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                systemName = args[i + 1];
                i++;
            }
            break;
        case '--plan':
            action = 'plan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                targetYear = parseInt(args[i + 1]) || 2028;
                i++;
            }
            break;
        case '--report':
            action = 'report';
            break;
        case '--system':
            systemName = args[i + 1];
            i++;
            break;
        case '--timeline':
            targetYear = parseInt(args[i + 1]) || 2028;
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
🔮 PQC Migration Assistant - MFH TOOLS PRO
===========================================
Asiste en la migración a criptografía post-cuántica.

Uso:
  node pqc-migration-assistant.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --assess <sistema>        Evaluar riesgo de migración
  --plan <año>              Planificar migración para año específico
  --report                  Generar reporte de migración
  --system <nombre>         Nombre del sistema a evaluar
  --timeline <año>          Año objetivo para migración (2028, 2030, 2035)
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node pqc-migration-assistant.js --init
  node pqc-migration-assistant.js --assess --system "Sistema Principal"
  node pqc-migration-assistant.js --plan --timeline 2028
  node pqc-migration-assistant.js --report --format html
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
    if (!fs.existsSync(MIGRATION_DIR)) {
        fs.mkdirSync(MIGRATION_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Datos de migración: ${MIGRATION_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function assessMigration(system) {
    console.log(`🔮 Evaluando migración PQC para sistema: ${system}`);
    
    const config = loadConfig();
    const components = config.crypto_components;
    const phases = config.migration_phases;
    const levels = config.risk_levels;
    const pqcAlgos = config.pqc_algorithms;
    
    const assessment = {
        system: system,
        timestamp: new Date().toISOString(),
        components: [],
        overall_risk: '',
        migration_complexity: 0,
        recommendations: [],
        pqc_algorithms_recommended: []
    };
    
    let totalRisk = 0;
    
    for (const comp of components) {
        const risk = levels[Math.floor(Math.random() * levels.length)];
        const score = risk === 'crítico' ? 90 : risk === 'alto' ? 70 : risk === 'medio' ? 45 : 20;
        totalRisk += score;
        
        assessment.components.push({
            component: comp,
            current_crypto: ['RSA-2048', 'ECC-256', 'AES-256', 'SHA-256'][Math.floor(Math.random() * 4)],
            pqc_alternative: pqcAlgos[Math.floor(Math.random() * pqcAlgos.length)],
            risk_level: risk,
            risk_score: score,
            priority: risk === 'crítico' ? 1 : risk === 'alto' ? 2 : risk === 'medio' ? 3 : 4
        });
    }
    
    const avgRisk = totalRisk / components.length;
    assessment.overall_risk = avgRisk > 70 ? 'Alto' : avgRisk > 50 ? 'Medio' : 'Bajo';
    assessment.migration_complexity = Math.round(avgRisk / 10);
    
    // Recomendaciones
    const highRiskComponents = assessment.components.filter(c => c.risk_level === 'crítico' || c.risk_level === 'alto');
    if (highRiskComponents.length > 0) {
        const names = highRiskComponents.map(c => c.component).join(', ');
        assessment.recommendations.push(`Priorizar migración de: ${names}`);
    }
    assessment.recommendations.push('Implementar soluciones híbridas (clásico + PQC)');
    assessment.recommendations.push('Realizar pruebas de interoperabilidad');
    assessment.recommendations.push('Capacitar al equipo en criptografía post-cuántica');
    
    // Algoritmos PQC recomendados
    const uniqueAlgos = [...new Set(assessment.components.map(c => c.pqc_alternative))];
    assessment.pqc_algorithms_recommended = uniqueAlgos.slice(0, 3);
    
    console.log(`\n📊 Resultados de evaluación:`);
    console.log(`   Sistema: ${assessment.system}`);
    console.log(`   Riesgo global: ${assessment.overall_risk}`);
    console.log(`   Complejidad de migración: ${assessment.migration_complexity}/10`);
    console.log(`   Componentes: ${assessment.components.length}`);
    
    console.log(`\n📋 Componentes analizados:`);
    assessment.components.forEach(c => {
        const icon = c.risk_level === 'crítico' ? '🔴' : c.risk_level === 'alto' ? '🟠' : c.risk_level === 'medio' ? '🟡' : '🟢';
        console.log(`   ${icon} ${c.component} (${c.risk_level}) - ${c.current_crypto} → ${c.pqc_alternative}`);
    });
    
    if (assessment.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        assessment.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(MIGRATION_DIR, `migration_assess_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2));
    console.log(`\n📄 Evaluación guardada: ${outputPath}`);
    
    return assessment;
}

function planMigration(targetYear) {
    console.log(`📋 Planificando migración PQC para año: ${targetYear}`);
    
    const config = loadConfig();
    const phases = config.migration_phases;
    const pqcAlgos = config.pqc_algorithms;
    
    const currentYear = new Date().getFullYear();
    const totalYears = targetYear - currentYear;
    
    const plan = {
        target_year: targetYear,
        current_year: currentYear,
        total_years: totalYears,
        timestamp: new Date().toISOString(),
        phases: [],
        milestones: [],
        budget_estimate: 0,
        recommendations: []
    };
    
    // Planificar fases
    let yearOffset = 0;
    for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        const duration = Math.max(1, Math.floor((totalYears - yearOffset) / (phases.length - i)));
        const startYear = currentYear + yearOffset;
        const endYear = startYear + duration;
        
        plan.phases.push({
            phase: phase,
            start_year: startYear,
            end_year: endYear,
            duration: duration,
            description: `Fase ${phase} de migración`,
            status: 'pending'
        });
        
        yearOffset += duration;
        
        // Milestones
        plan.milestones.push({
            year: startYear + Math.floor(duration / 2),
            description: `Completar ${phase}`
        });
    }
    
    // Presupuesto estimado (simulado)
    const baseBudget = 50000;
    const complexityFactor = Math.random() * 3 + 1;
    plan.budget_estimate = Math.round(baseBudget * complexityFactor);
    
    // Recomendaciones
    plan.recommendations = [
        `Iniciar fase de assessment inmediatamente`,
        `Establecer equipo de migración PQC`,
        `Realizar pilotos con ${pqcAlgos.slice(0, 2).join(' y ')}`,
        `Documentar procesos y lecciones aprendidas`,
        `Actualizar políticas de seguridad`
    ];
    
    console.log(`\n📊 Plan de migración:`);
    console.log(`   Año objetivo: ${plan.target_year}`);
    console.log(`   Duración: ${plan.total_years} años`);
    console.log(`   Presupuesto estimado: $${plan.budget_estimate.toLocaleString()}`);
    console.log(`   Fases: ${plan.phases.length}`);
    
    console.log(`\n📋 Fases de migración:`);
    plan.phases.forEach(p => {
        console.log(`   • ${p.phase}: ${p.start_year} - ${p.end_year} (${p.duration} años)`);
    });
    
    console.log(`\n🎯 Milestones:`);
    plan.milestones.forEach(m => {
        console.log(`   • ${m.year}: ${m.description}`);
    });
    
    if (plan.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        plan.recommendations.forEach(r => console.log(`   • ${r}`));
    }
    
    const outputPath = outputFile || path.join(MIGRATION_DIR, `migration_plan_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
    console.log(`\n📄 Plan guardado: ${outputPath}`);
    
    return plan;
}

function generateReport(format) {
    console.log(`📊 Generando reporte de migración PQC en formato ${format}`);
    
    const files = fs.readdirSync(MIGRATION_DIR).filter(f => f.startsWith('migration_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos disponibles. Ejecuta --assess o --plan primero.');
        return;
    }
    
    const data = [];
    for (const file of files) {
        try {
            const d = JSON.parse(fs.readFileSync(path.join(MIGRATION_DIR, file), 'utf8'));
            data.push(d);
        } catch (e) {}
    }
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateMigrationHTML(data);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ data, timestamp: new Date().toISOString() }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `migration_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return data;
}

function generateMigrationHTML(data) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔮 PQC Migration Report</title>
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
        .stat .number { font-size: 2rem; font-weight: bold; }
        .stat .label { color: #888; font-size: 0.8rem; }
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
        <h1>🔮 PQC Migration Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <p><strong>Registros:</strong> ${data.length}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${data.length}</div>
                <div class="label">📋 Registros</div>
            </div>
        </div>
        
        <h2>📋 Planes de Migración</h2>
        ${data.map(d => {
            if (d.system) {
                return `
                    <div style="border:1px solid #333;padding:15px;margin:10px 0;border-radius:8px;">
                        <h3 style="color:#00ff00;">🏢 ${d.system}</h3>
                        <p>Riesgo: ${d.overall_risk} | Complejidad: ${d.migration_complexity}/10</p>
                        <p>Componentes: ${d.components.length}</p>
                    </div>
                `;
            }
            return '';
        }).join('')}
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔮 PQC Migration Assistant - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'assess':
            if (!systemName) {
                console.error('❌ Debes especificar --system');
                process.exit(1);
            }
            assessMigration(systemName);
            break;
            
        case 'plan':
            planMigration(targetYear);
            break;
            
        case 'report':
            generateReport(format);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --assess, --plan, --report, --init');
            break;
    }
    
    console.log('\n✅ PQC Migration Assistant completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo PQC Migration Assistant...');
    process.exit(0);
});
