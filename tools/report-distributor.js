#!/usr/bin/env node

/**
 * Automated Report Distributor - MFH TOOLS PRO
 * Distribuye reportes automáticos por email, Slack, Teams, Console
 * 
 * Uso: node report-distributor.js [opciones]
 * Ejemplo: node report-distributor.js --file report.pdf --channels console,email
 * Ejemplo: node report-distributor.js --schedule "0 9 * * 1" --file report.pdf
 * Ejemplo: node report-distributor.js --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const https = require('https');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'report_distribution_config.json');
const LOG_FILE = path.join(__dirname, 'report_distribution.log');

const DEFAULT_CONFIG = {
    email: {
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: '',
            pass: ''
        },
        from: 'reports@mfh-tools.com'
    },
    slack: {
        webhookUrl: ''
    },
    teams: {
        webhookUrl: ''
    },
    reports: []
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let file = null;
let channels = [];
let recipients = [];
let subject = null;
let message = null;
let schedule = null;
let reportId = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            file = args[i + 1];
            i++;
            break;
        case '--channels':
        case '-c':
            channels = args[i + 1].split(',').map(c => c.trim());
            i++;
            break;
        case '--recipients':
        case '-r':
            recipients = args[i + 1].split(',').map(r => r.trim());
            i++;
            break;
        case '--subject':
            subject = args[i + 1];
            i++;
            break;
        case '--message':
            message = args[i + 1];
            i++;
            break;
        case '--schedule':
        case '-s':
            schedule = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--send':
            action = 'send';
            reportId = args[i + 1];
            i++;
            break;
        case '--remove':
            action = 'remove';
            reportId = args[i + 1];
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
🔍 Automated Report Distributor - MFH TOOLS PRO
=================================================
Distribuye reportes automáticos.

Uso:
  node report-distributor.js [opciones]

Opciones:
  --init                   Crear configuración por defecto
  --file, -f <archivo>     Archivo a distribuir
  --channels, -c <lista>   Canales (console,email,slack,teams)
  --recipients, -r <lista> Destinatarios (emails, usuarios)
  --subject <asunto>       Asunto del reporte
  --message <mensaje>      Mensaje adicional
  --schedule, -s <cron>    Programación en cron
  --send <id>              Enviar un reporte programado
  --list                   Listar reportes programados
  --remove <id>            Eliminar un reporte programado
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node report-distributor.js --init
  node report-distributor.js --file report.pdf --channels console,email --recipients admin@example.com
  node report-distributor.js --schedule "0 9 * * 1" --file report.pdf --channels console
  node report-distributor.js --list
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            // Asegurar que tiene todas las propiedades
            return { ...DEFAULT_CONFIG, ...config };
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
    const config = { ...DEFAULT_CONFIG };
    config.email.from = 'reports@mfh-tools.com';
    config.reports = [];
    saveConfig(config);
    console.log(`✅ Configuración creada en: ${CONFIG_FILE}`);
    console.log('📝 Edita el archivo para configurar email, Slack y Teams.');
}

function logReport(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    } catch (error) {
        // Si no se puede escribir, solo mostrar en consola
    }
    if (verbose || type === 'error' || type === 'warning') {
        console.log(message);
    }
}

function generateReportId() {
    return 'rpt-' + crypto.randomBytes(6).toString('hex');
}

// ==================== CANALES ====================
function sendToConsole(subject, message, file) {
    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${subject || 'Reporte de Seguridad'}`);
    console.log('='.repeat(60));
    console.log(`📝 ${message || 'Reporte automático generado por MFH TOOLS PRO'}`);
    if (file) {
        console.log(`📄 Archivo: ${path.basename(file)}`);
        try {
            const stats = fs.statSync(file);
            console.log(`📦 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
        } catch (error) {
            // Ignorar
        }
    }
    console.log('='.repeat(60) + '\n');
    return { success: true, channel: 'console' };
}

function sendEmail(recipients, subject, message, attachments, config) {
    return new Promise((resolve, reject) => {
        const emailConfig = config.email || {};
        if (!emailConfig.smtp || !emailConfig.smtp.host || !emailConfig.smtp.user) {
            // Modo simulación si no hay configuración
            console.log(`📧 [SIMULADO] Email a ${recipients.join(', ')}`);
            console.log(`   Asunto: ${subject}`);
            console.log(`   Mensaje: ${message}`);
            resolve({ status: 'simulated', recipients });
            return;
        }

        const transporter = nodemailer.createTransport({
            host: emailConfig.smtp.host,
            port: emailConfig.smtp.port || 587,
            secure: emailConfig.smtp.secure || false,
            auth: {
                user: emailConfig.smtp.user,
                pass: emailConfig.smtp.pass
            }
        });

        const mailOptions = {
            from: emailConfig.from || 'reports@mfh-tools.com',
            to: recipients.join(', '),
            subject: subject || 'Reporte de Seguridad MFH TOOLS PRO',
            text: message || 'Reporte automático generado por MFH TOOLS PRO',
            attachments: attachments || []
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject(error);
            } else {
                resolve(info);
            }
        });
    });
}

function sendSlack(webhookUrl, subject, message, file) {
    return new Promise((resolve, reject) => {
        if (!webhookUrl) {
            console.log(`💬 [SIMULADO] Slack: ${subject}`);
            resolve({ status: 'simulated', channel: 'slack' });
            return;
        }

        const payload = {
            text: `📊 *${subject || 'Reporte de Seguridad'}*\n${message || ''}`,
            attachments: []
        };

        if (file) {
            payload.attachments.push({
                text: `📄 ${path.basename(file)}`,
                color: '#00ff00'
            });
        }

        const postData = JSON.stringify(payload);
        const parsedUrl = new URL(webhookUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ statusCode: res.statusCode });
            } else {
                reject(new Error(`HTTP ${res.statusCode}`));
            }
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

function sendTeams(webhookUrl, subject, message, file) {
    return new Promise((resolve, reject) => {
        if (!webhookUrl) {
            console.log(`💬 [SIMULADO] Teams: ${subject}`);
            resolve({ status: 'simulated', channel: 'teams' });
            return;
        }

        const payload = {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    type: 'AdaptiveCard',
                    version: '1.0',
                    body: [
                        { type: 'TextBlock', text: `📊 ${subject || 'Reporte de Seguridad'}`, weight: 'bolder', size: 'large' },
                        { type: 'TextBlock', text: message || 'Reporte automático generado por MFH TOOLS PRO' },
                        { type: 'TextBlock', text: `📄 ${file ? path.basename(file) : ''}`, isSubtle: true }
                    ]
                }
            }]
        };

        const postData = JSON.stringify(payload);
        const parsedUrl = new URL(webhookUrl);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve({ statusCode: res.statusCode });
            } else {
                reject(new Error(`HTTP ${res.statusCode}`));
            }
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// ==================== FUNCIÓN PRINCIPAL DE DISTRIBUCIÓN ====================
async function distributeReport(file, channels, recipients, subject, message) {
    const config = loadConfig();
    const results = {};
    
    logReport(`📤 Distribuyendo reporte: ${file}`, 'info');
    
    // Verificar archivo
    if (file && !fs.existsSync(file)) {
        logReport(`❌ Archivo no encontrado: ${file}`, 'error');
        throw new Error(`Archivo no encontrado: ${file}`);
    }

    const attachments = file ? [{ filename: path.basename(file), path: file }] : [];

    for (const channel of channels) {
        const channelLower = channel.toLowerCase();
        try {
            logReport(`📡 Enviando por ${channelLower}...`, 'info');
            
            switch (channelLower) {
                case 'console':
                    results.console = sendToConsole(subject, message, file);
                    logReport(`✅ Console enviado`, 'success');
                    break;
                    
                case 'email':
                    if (!recipients || recipients.length === 0) {
                        throw new Error('No se especificaron destinatarios de email');
                    }
                    results.email = await sendEmail(recipients, subject, message, attachments, config);
                    logReport(`✅ Email enviado a ${recipients.join(', ')}`, 'success');
                    break;
                    
                case 'slack':
                    results.slack = await sendSlack(config.slack?.webhookUrl, subject, message, file);
                    logReport(`✅ Slack enviado`, 'success');
                    break;
                    
                case 'teams':
                    results.teams = await sendTeams(config.teams?.webhookUrl, subject, message, file);
                    logReport(`✅ Teams enviado`, 'success');
                    break;
                    
                default:
                    logReport(`⚠️ Canal no soportado: ${channelLower}`, 'warning');
                    results[channelLower] = { error: 'Canal no soportado' };
            }
        } catch (error) {
            logReport(`❌ Error en ${channelLower}: ${error.message}`, 'error');
            results[channelLower] = { error: error.message };
        }
    }

    return results;
}

// ==================== PROGRAMACIÓN ====================
function scheduleReport(file, channels, recipients, subject, message, schedule) {
    if (!cron.validate(schedule)) {
        console.error(`❌ Formato cron inválido: ${schedule}`);
        console.log('   Ejemplos válidos:');
        console.log('   "0 9 * * 1"   → Todos los lunes a las 9:00 AM');
        console.log('   "0 2 * * *"   → Todos los días a las 2:00 AM');
        console.log('   "*/30 * * * *" → Cada 30 minutos');
        process.exit(1);
    }

    const config = loadConfig();
    const newReport = {
        id: generateReportId(),
        file,
        channels,
        recipients,
        subject: subject || `Reporte ${path.basename(file)}`,
        message: message || 'Reporte automático',
        schedule,
        createdAt: new Date().toISOString(),
        lastRun: null,
        enabled: true
    };

    config.reports = config.reports || [];
    config.reports.push(newReport);
    saveConfig(config);

    // Programar
    const task = cron.schedule(schedule, () => {
        console.log(`🔄 Ejecutando reporte programado: ${newReport.id}`);
        distributeReport(file, channels, recipients, subject, message)
            .then(results => {
                logReport(`✅ Reporte ${newReport.id} enviado exitosamente`, 'success');
                // Actualizar último run
                const config2 = loadConfig();
                const report = config2.reports.find(r => r.id === newReport.id);
                if (report) {
                    report.lastRun = new Date().toISOString();
                    saveConfig(config2);
                }
            })
            .catch(error => {
                logReport(`❌ Error en reporte ${newReport.id}: ${error.message}`, 'error');
            });
    });

    global.scheduledReports = global.scheduledReports || {};
    global.scheduledReports[newReport.id] = task;

    console.log(`✅ Reporte programado: ${newReport.id}`);
    console.log(`🕐 Programación: ${schedule}`);
    console.log(`📋 Archivo: ${file}`);
    console.log(`📋 Canales: ${channels.join(', ')}`);
    if (recipients && recipients.length > 0) {
        console.log(`📋 Destinatarios: ${recipients.join(', ')}`);
    }
    
    return newReport;
}

function listReports() {
    const config = loadConfig();
    const reports = config.reports || [];
    
    if (reports.length === 0) {
        console.log('📭 No hay reportes programados');
        return;
    }

    console.log(`\n📋 REPORTES PROGRAMADOS (${reports.length}):`);
    console.log('='.repeat(60));

    for (const report of reports) {
        const statusIcon = report.enabled ? '🟢' : '🔴';
        console.log(`\n${statusIcon} ${report.id}`);
        console.log(`   📋 Archivo: ${path.basename(report.file)}`);
        console.log(`   📋 Canales: ${report.channels.join(', ')}`);
        if (report.recipients && report.recipients.length > 0) {
            console.log(`   📋 Destinatarios: ${report.recipients.join(', ')}`);
        }
        console.log(`   🕐 Programación: ${report.schedule}`);
        if (report.lastRun) {
            console.log(`   ⏱️ Última ejecución: ${new Date(report.lastRun).toLocaleString()}`);
        }
        console.log(`   📅 Creado: ${new Date(report.createdAt).toLocaleString()}`);
    }
}

function removeReport(id) {
    const config = loadConfig();
    const reports = config.reports || [];
    const initialLength = reports.length;
    config.reports = reports.filter(r => r.id !== id);
    
    if (config.reports.length === initialLength) {
        console.error(`❌ Reporte no encontrado: ${id}`);
        process.exit(1);
    }

    saveConfig(config);
    if (global.scheduledReports && global.scheduledReports[id]) {
        global.scheduledReports[id].stop();
        delete global.scheduledReports[id];
    }

    console.log(`✅ Reporte eliminado: ${id}`);
}

function sendReport(id) {
    const config = loadConfig();
    const reports = config.reports || [];
    const report = reports.find(r => r.id === id);
    
    if (!report) {
        console.error(`❌ Reporte no encontrado: ${id}`);
        process.exit(1);
    }

    if (!report.enabled) {
        console.error(`❌ Reporte deshabilitado: ${id}`);
        process.exit(1);
    }

    console.log(`🔄 Enviando reporte: ${id}`);
    distributeReport(report.file, report.channels, report.recipients, report.subject, report.message)
        .then(results => {
            logReport(`✅ Reporte ${id} enviado exitosamente`, 'success');
            report.lastRun = new Date().toISOString();
            saveConfig(config);
        })
        .catch(error => {
            logReport(`❌ Error en reporte ${id}: ${error.message}`, 'error');
        });
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Automated Report Distributor - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (init) {
        initConfig();
        process.exit(0);
    }

    // Cargar tareas existentes
    const config = loadConfig();
    const reports = config.reports || [];
    global.scheduledReports = global.scheduledReports || {};
    
    for (const report of reports) {
        if (report.enabled && cron.validate(report.schedule)) {
            const task = cron.schedule(report.schedule, () => {
                console.log(`🔄 Ejecutando reporte programado: ${report.id}`);
                distributeReport(report.file, report.channels, report.recipients, report.subject, report.message)
                    .then(() => {
                        const config2 = loadConfig();
                        const r = config2.reports.find(r2 => r2.id === report.id);
                        if (r) {
                            r.lastRun = new Date().toISOString();
                            saveConfig(config2);
                        }
                    })
                    .catch(error => {
                        logReport(`❌ Error en reporte ${report.id}: ${error.message}`, 'error');
                    });
            });
            global.scheduledReports[report.id] = task;
        }
    }

    if (Object.keys(global.scheduledReports).length > 0) {
        console.log(`⏰ ${Object.keys(global.scheduledReports).length} reportes programados cargados`);
    }

    switch (action) {
        case 'list':
            listReports();
            break;
            
        case 'send':
            if (!reportId) {
                console.error('❌ Debes especificar un ID de reporte');
                process.exit(1);
            }
            await sendReport(reportId);
            break;
            
        case 'remove':
            if (!reportId) {
                console.error('❌ Debes especificar un ID de reporte');
                process.exit(1);
            }
            removeReport(reportId);
            break;
            
        default:
            if (file && channels && channels.length > 0) {
                if (schedule) {
                    await scheduleReport(file, channels, recipients, subject, message, schedule);
                } else {
                    await distributeReport(file, channels, recipients, subject, message);
                }
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
                console.log('💡 Opciones: --init, --file, --channels, --schedule, --list');
                console.log('💡 Ejemplo: --file report.pdf --channels console,email --recipients admin@example.com');
            }
            break;
    }

    console.log('\n✅ Report Distributor completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo report distributor...');
    if (global.scheduledReports) {
        for (const [id, task] of Object.entries(global.scheduledReports)) {
            task.stop();
        }
    }
    process.exit(0);
});
