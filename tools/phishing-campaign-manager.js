#!/usr/bin/env node

/**
 * Phishing Campaign Manager - MFH TOOLS PRO
 * Gestion de campanas de phishing simuladas
 * 
 * Uso: node phishing-campaign-manager.js [opciones]
 * Ejemplo: node phishing-campaign-manager.js --create --targets emails.txt
 * Ejemplo: node phishing-campaign-manager.js --campaign --id CAM-001
 * Ejemplo: node phishing-campaign-manager.js --report --campaign CAM-001
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'phishing_config.json');
const CAMPAIGNS_DIR = path.join(__dirname, 'phishing_campaigns');
const TEMPLATES_DIR = path.join(__dirname, 'phishing_templates');
const REPORTS_DIR = path.join(__dirname, 'phishing_reports');

const DEFAULT_CONFIG = {
    templates: {
        'banking': {
            name: 'Phishing Bancario',
            subject: '⚠️ Alerta de Seguridad - Banco Nacional',
            body: 'Estimado cliente, hemos detectado actividad sospechosa en su cuenta...'
        },
        'social': {
            name: 'Phishing Redes Sociales',
            subject: '🚨 Alerta de Seguridad - Facebook',
            body: 'Hemos detectado un inicio de sesion desde una ubicacion desconocida...'
        },
        'work': {
            name: 'Phishing Laboral',
            subject: '📋 Actualizacion de Politicas Internas',
            body: 'Por favor, revisa las nuevas politicas de seguridad...'
        }
    },
    campaign: {
        default_template: 'banking',
        max_targets: 1000,
        daily_limit: 100
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let targetsFile = null;
let campaignId = null;
let template = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--create':
            action = 'create';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                targetsFile = args[i + 1];
                i++;
            }
            break;
        case '--campaign':
            action = 'campaign';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                campaignId = args[i + 1];
                i++;
            }
            break;
        case '--report':
            action = 'report';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                campaignId = args[i + 1];
                i++;
            }
            break;
        case '--targets':
            targetsFile = args[i + 1];
            i++;
            break;
        case '--id':
            campaignId = args[i + 1];
            i++;
            break;
        case '--template':
            template = args[i + 1];
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
🎣 Phishing Campaign Manager - MFH TOOLS PRO
===========================================
Gestion de campanas de phishing simuladas.

Uso:
  node phishing-campaign-manager.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --create [archivo]    Crear campana de phishing
  --campaign <id>       Ver detalles de una campana
  --report <id>         Generar reporte de campana
  --targets <archivo>   Archivo con lista de targets
  --id <campaign>       ID de la campana
  --template <nombre>   Plantilla a usar
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node phishing-campaign-manager.js --init
  node phishing-campaign-manager.js --create --targets emails.txt
  node phishing-campaign-manager.js --campaign --id CAM-001
  node phishing-campaign-manager.js --report --campaign CAM-001
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
    if (!fs.existsSync(CAMPAIGNS_DIR)) {
        fs.mkdirSync(CAMPAIGNS_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEMPLATES_DIR)) {
        fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Guardar plantillas
    for (const [key, data] of Object.entries(config.templates)) {
        const path = path.join(TEMPLATES_DIR, `${key}.json`);
        if (!fs.existsSync(path)) {
            fs.writeFileSync(path, JSON.stringify(data, null, 2));
        }
    }
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Campanas: ${CAMPAIGNS_DIR}`);
    console.log(`📁 Plantillas: ${TEMPLATES_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function createCampaign(targetsFile) {
    console.log(`🎣 Creando campana de phishing`);
    
    const config = loadConfig();
    const targets = loadTargets(targetsFile);
    
    if (targets.length === 0) {
        console.error('❌ No hay targets para la campana');
        return;
    }
    
    const campaignId = `CAM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const templateName = template || config.campaign.default_template;
    const templateData = config.templates[templateName] || config.templates.banking;
    
    const campaign = {
        id: campaignId,
        created: new Date().toISOString(),
        template: templateName,
        template_data: templateData,
        targets: targets.slice(0, config.campaign.max_targets),
        status: 'pending',
        stats: {
            sent: 0,
            opened: 0,
            clicked: 0,
            reported: 0
        }
    };
    
    // Simular envio
    console.log(`\n📋 Campana creada:`);
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Targets: ${campaign.targets.length}`);
    console.log(`   Plantilla: ${templateName}`);
    console.log(`   Estado: ${campaign.status}`);
    
    console.log(`\n📧 Ejemplo de correo:`);
    console.log(`   Asunto: ${templateData.subject}`);
    console.log(`   Cuerpo: ${templateData.body.substring(0, 100)}...`);
    
    // Simular resultados
    const stats = simulatePhishingResults(targets.length);
    campaign.stats = stats;
    campaign.status = 'completed';
    
    const outputPath = outputFile || path.join(CAMPAIGNS_DIR, `${campaign.id}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(campaign, null, 2));
    console.log(`\n📄 Campana guardada: ${outputPath}`);
    console.log(`\n📊 Resultados:`);
    console.log(`   Enviados: ${stats.sent}`);
    console.log(`   Abiertos: ${stats.opened} (${((stats.opened/stats.sent)*100).toFixed(1)}%)`);
    console.log(`   Clics: ${stats.clicked} (${((stats.clicked/stats.sent)*100).toFixed(1)}%)`);
    console.log(`   Reportados: ${stats.reported} (${((stats.reported/stats.sent)*100).toFixed(1)}%)`);
    
    return campaign;
}

function loadTargets(targetsFile) {
    const targets = [];
    
    if (targetsFile && fs.existsSync(targetsFile)) {
        try {
            const content = fs.readFileSync(targetsFile, 'utf8');
            const lines = content.split('\n').filter(l => l.trim());
            for (const line of lines) {
                if (line.includes('@')) {
                    targets.push({ email: line.trim(), name: line.trim().split('@')[0] });
                } else {
                    targets.push({ email: `${line.trim()}@example.com`, name: line.trim() });
                }
            }
        } catch (error) {
            console.error('❌ Error leyendo archivo:', error.message);
        }
    } else {
        // Targets de ejemplo
        const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'company.com', 'corp.com'];
        for (let i = 0; i < 20; i++) {
            const name = `user${i+1}`;
            const domain = domains[Math.floor(Math.random() * domains.length)];
            targets.push({ email: `${name}@${domain}`, name: name });
        }
    }
    
    return targets;
}

function simulatePhishingResults(total) {
    const sent = total;
    const opened = Math.floor(Math.random() * sent * 0.4) + Math.floor(sent * 0.3);
    const clicked = Math.floor(Math.random() * opened * 0.3) + Math.floor(opened * 0.1);
    const reported = Math.floor(Math.random() * sent * 0.05);
    
    return {
        sent: sent,
        opened: opened,
        clicked: clicked,
        reported: reported
    };
}

function showCampaign(campaignId) {
    console.log(`📋 Mostrando campana: ${campaignId}`);
    
    const campaignPath = path.join(CAMPAIGNS_DIR, `${campaignId}.json`);
    if (!fs.existsSync(campaignPath)) {
        console.error(`❌ Campana no encontrada: ${campaignId}`);
        return;
    }
    
    const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
    
    console.log(`\n📋 Detalles de la campana:`);
    console.log(`   ID: ${campaign.id}`);
    console.log(`   Creada: ${campaign.created}`);
    console.log(`   Plantilla: ${campaign.template}`);
    console.log(`   Estado: ${campaign.status}`);
    console.log(`   Targets: ${campaign.targets.length}`);
    
    console.log(`\n📊 Estadisticas:`);
    console.log(`   Enviados: ${campaign.stats.sent}`);
    console.log(`   Abiertos: ${campaign.stats.opened} (${((campaign.stats.opened/campaign.stats.sent)*100).toFixed(1)}%)`);
    console.log(`   Clics: ${campaign.stats.clicked} (${((campaign.stats.clicked/campaign.stats.sent)*100).toFixed(1)}%)`);
    console.log(`   Reportados: ${campaign.stats.reported} (${((campaign.stats.reported/campaign.stats.sent)*100).toFixed(1)}%)`);
}

function generateReport(campaignId) {
    console.log(`📊 Generando reporte de campana: ${campaignId}`);
    
    const campaignPath = path.join(CAMPAIGNS_DIR, `${campaignId}.json`);
    if (!fs.existsSync(campaignPath)) {
        console.error(`❌ Campana no encontrada: ${campaignId}`);
        return;
    }
    
    const campaign = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
    
    const report = {
        timestamp: new Date().toISOString(),
        campaign: campaign,
        analysis: {
            open_rate: ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1) + '%',
            click_rate: ((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(1) + '%',
            report_rate: ((campaign.stats.reported / campaign.stats.sent) * 100).toFixed(1) + '%',
            risk_score: Math.floor(Math.random() * 30) + 20,
            recommendation: campaign.stats.clicked > campaign.stats.sent * 0.2 ? 
                'Alto riesgo - Se recomienda entrenamiento adicional' : 
                'Riesgo moderado - Mantener monitoreo'
        },
        recommendations: [
            'Capacitar a usuarios que hicieron clic',
            'Revisar politicas de seguridad',
            'Implementar MFA para todos los usuarios',
            'Realizar simulaciones regulares'
        ]
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `phishing_report_${campaignId}_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    console.log(`\n📊 Resumen:`);
    console.log(`   Tasa de apertura: ${report.analysis.open_rate}`);
    console.log(`   Tasa de clics: ${report.analysis.click_rate}`);
    console.log(`   Tasa de reporte: ${report.analysis.report_rate}`);
    console.log(`   ${report.analysis.recommendation}`);
    
    return report;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🎣 Phishing Campaign Manager - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'create':
            createCampaign(targetsFile);
            break;
            
        case 'campaign':
            if (!campaignId) {
                console.error('❌ Debes especificar --id');
                process.exit(1);
            }
            showCampaign(campaignId);
            break;
            
        case 'report':
            if (!campaignId) {
                console.error('❌ Debes especificar --campaign');
                process.exit(1);
            }
            generateReport(campaignId);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --create, --campaign, --report, --init');
            break;
    }
    
    console.log('\n✅ Phishing Campaign Manager completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Phishing Campaign Manager...');
    process.exit(0);
});
