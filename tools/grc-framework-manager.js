#!/usr/bin/env node

/**
 * GRC Framework Manager - MFH TOOLS PRO
 * Gestiona frameworks de Gobernanza, Riesgo y Cumplimiento
 * 
 * Uso: node grc-framework-manager.js [opciones]
 * Ejemplo: node grc-framework-manager.js --list
 * Ejemplo: node grc-framework-manager.js --apply --framework cobit
 * Ejemplo: node grc-framework-manager.js --assess --framework iso27001
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'grc_config.json');
const FRAMEWORKS_DIR = path.join(__dirname, 'grc_frameworks');
const ASSESSMENTS_DIR = path.join(__dirname, 'grc_assessments');
const REPORTS_DIR = path.join(__dirname, 'grc_reports');

const DEFAULT_CONFIG = {
    frameworks: {
        iso27001: {
            name: 'ISO 27001',
            version: '2022',
            domains: ['Context', 'Leadership', 'Planning', 'Support', 'Operation', 'Evaluation', 'Improvement'],
            controls: 93
        },
        cobit: {
            name: 'COBIT',
            version: '2019',
            domains: ['EDM', 'APO', 'BAI', 'DSS', 'MEA'],
            controls: 40
        },
        nist: {
            name: 'NIST CSF',
            version: '1.1',
            domains: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
            controls: 108
        },
        gdpr: {
            name: 'GDPR',
            version: '2018',
            domains: ['Data Protection', 'Rights', 'Compliance', 'Breach'],
            controls: 99
        },
        sox: {
            name: 'SOX',
            version: '2002',
            domains: ['Internal Controls', 'Financial Reporting', 'Audit'],
            controls: 404
        }
    },
    default_framework: 'iso27001',
    assessment_scale: ['low', 'medium', 'high', 'critical']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let framework = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--list':
            action = 'list';
            break;
        case '--apply':
            action = 'apply';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                framework = args[i + 1];
                i++;
            }
            break;
        case '--assess':
            action = 'assess';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                framework = args[i + 1];
                i++;
            }
            break;
        case '--framework':
            framework = args[i + 1];
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
📊 GRC Framework Manager - MFH TOOLS PRO
=======================================
Gestiona frameworks de Gobernanza, Riesgo y Cumplimiento.

Uso:
  node grc-framework-manager.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --list                Listar frameworks disponibles
  --apply <framework>   Aplicar un framework
  --assess <framework>  Evaluar cumplimiento de un framework
  --framework <nombre>  Nombre del framework
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node grc-framework-manager.js --init
  node grc-framework-manager.js --list
  node grc-framework-manager.js --apply --framework iso27001
  node grc-framework-manager.js --assess --framework nist
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
    if (!fs.existsSync(FRAMEWORKS_DIR)) {
        fs.mkdirSync(FRAMEWORKS_DIR, { recursive: true });
    }
    if (!fs.existsSync(ASSESSMENTS_DIR)) {
        fs.mkdirSync(ASSESSMENTS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Frameworks: ${FRAMEWORKS_DIR}`);
    console.log(`📁 Assessments: ${ASSESSMENTS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function listFrameworks() {
    const config = loadConfig();
    console.log('\n📋 FRAMEWORKS DISPONIBLES:');
    console.log('='.repeat(60));
    
    for (const [key, data] of Object.entries(config.frameworks)) {
        console.log(`\n📌 ${key.toUpperCase()}`);
        console.log(`   Nombre: ${data.name}`);
        console.log(`   Version: ${data.version}`);
        console.log(`   Dominios: ${data.domains.join(', ')}`);
        console.log(`   Controles: ${data.controls}`);
    }
}

function applyFramework(framework) {
    console.log(`📋 Aplicando framework: ${framework}`);
    
    const config = loadConfig();
    const frameworkData = config.frameworks[framework];
    
    if (!frameworkData) {
        console.error(`❌ Framework no encontrado: ${framework}`);
        console.log(`   Frameworks disponibles: ${Object.keys(config.frameworks).join(', ')}`);
        return;
    }
    
    console.log(`\n📊 Detalles del framework:`);
    console.log(`   Nombre: ${frameworkData.name}`);
    console.log(`   Version: ${frameworkData.version}`);
    console.log(`   Dominios: ${frameworkData.domains.length}`);
    console.log(`   Controles: ${frameworkData.controls}`);
    
    // Generar plan de implementacion
    const implementationPlan = {
        framework: framework,
        name: frameworkData.name,
        version: frameworkData.version,
        applied: new Date().toISOString(),
        phases: [
            { phase: 1, name: 'Assessment', duration: '4 weeks', tasks: ['Gap Analysis', 'Risk Assessment'] },
            { phase: 2, name: 'Implementation', duration: '8 weeks', tasks: ['Control Implementation', 'Policy Development'] },
            { phase: 3, name: 'Monitoring', duration: '4 weeks', tasks: ['Compliance Monitoring', 'Reporting'] },
            { phase: 4, name: 'Certification', duration: '2 weeks', tasks: ['Audit Preparation', 'Certification'] }
        ],
        estimated_completion: new Date(Date.now() + 18 * 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    const outputPath = outputFile || path.join(FRAMEWORKS_DIR, `${framework}_plan.json`);
    fs.writeFileSync(outputPath, JSON.stringify(implementationPlan, null, 2));
    
    console.log(`\n📋 Plan de implementacion generado:`);
    console.log(`   Fase 1: ${implementationPlan.phases[0].name} (${implementationPlan.phases[0].duration})`);
    console.log(`   Fase 2: ${implementationPlan.phases[1].name} (${implementationPlan.phases[1].duration})`);
    console.log(`   Fase 3: ${implementationPlan.phases[2].name} (${implementationPlan.phases[2].duration})`);
    console.log(`   Fase 4: ${implementationPlan.phases[3].name} (${implementationPlan.phases[3].duration})`);
    console.log(`   📁 Guardado: ${outputPath}`);
    
    return implementationPlan;
}

function assessFramework(framework) {
    console.log(`🔍 Evaluando cumplimiento de: ${framework}`);
    
    const config = loadConfig();
    const frameworkData = config.frameworks[framework];
    
    if (!frameworkData) {
        console.error(`❌ Framework no encontrado: ${framework}`);
        console.log(`   Frameworks disponibles: ${Object.keys(config.frameworks).join(', ')}`);
        return;
    }
    
    // Simular evaluacion de cumplimiento
    const assessment = {
        framework: framework,
        name: frameworkData.name,
        version: frameworkData.version,
        assessed: new Date().toISOString(),
        overall_score: Math.floor(Math.random() * 40) + 60,
        domains: frameworkData.domains.map(domain => ({
            name: domain,
            score: Math.floor(Math.random() * 40) + 60,
            status: ['compliant', 'partial', 'non-compliant'][Math.floor(Math.random() * 3)]
        })),
        summary: {
            compliant: Math.floor(Math.random() * 10) + 10,
            partial: Math.floor(Math.random() * 10) + 5,
            non_compliant: Math.floor(Math.random() * 5) + 1
        },
        recommendations: [
            'Implementar controles de acceso',
            'Actualizar politicas de seguridad',
            'Realizar capacitacion de personal',
            'Mejorar monitoreo y logging'
        ]
    };
    
    // Calcular estado general
    const totalDomains = assessment.domains.length;
    const compliantDomains = assessment.domains.filter(d => d.status === 'compliant').length;
    const progress = Math.round((compliantDomains / totalDomains) * 100);
    assessment.summary.progress = progress;
    
    console.log(`\n📊 Resultados de la evaluacion:`);
    console.log(`   Framework: ${assessment.name}`);
    console.log(`   Score: ${assessment.overall_score}%`);
    console.log(`   Progreso: ${progress}%`);
    console.log(`   ✅ Cumple: ${assessment.summary.compliant}`);
    console.log(`   ⚠️ Parcial: ${assessment.summary.partial}`);
    console.log(`   ❌ No cumple: ${assessment.summary.non_compliant}`);
    
    console.log(`\n📋 Detalle por dominio:`);
    assessment.domains.forEach(d => {
        const icon = d.status === 'compliant' ? '✅' : d.status === 'partial' ? '⚠️' : '❌';
        console.log(`   ${icon} ${d.name}: ${d.score}% (${d.status})`);
    });
    
    if (assessment.recommendations.length > 0) {
        console.log(`\n💡 Recomendaciones:`);
        assessment.recommendations.forEach(r => {
            console.log(`   • ${r}`);
        });
    }
    
    const outputPath = outputFile || path.join(ASSESSMENTS_DIR, `${framework}_assessment.json`);
    fs.writeFileSync(outputPath, JSON.stringify(assessment, null, 2));
    console.log(`\n📄 Evaluacion guardada: ${outputPath}`);
    
    return assessment;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📊 GRC Framework Manager - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'list':
            listFrameworks();
            break;
            
        case 'apply':
            if (!framework) {
                console.error('❌ Debes especificar --framework');
                process.exit(1);
            }
            applyFramework(framework);
            break;
            
        case 'assess':
            if (!framework) {
                console.error('❌ Debes especificar --framework');
                process.exit(1);
            }
            assessFramework(framework);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --list, --apply, --assess, --init');
            break;
    }
    
    console.log('\n✅ GRC Framework Manager completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo GRC Framework Manager...');
    process.exit(0);
});
