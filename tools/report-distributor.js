#!/usr/bin/env node

/**
 * Automated Report Distributor - MFH TOOLS PRO
 * Distribuye reportes automáticos por email, Slack, Teams
 * 
 * Uso: node report-distributor.js [opciones]
 * Ejemplo: node report-distributor.js --file report.pdf --channels email,slack
 * Ejemplo: node report-distributor.js --schedule "0 9 * * 1" --file report.pdf
 * Ejemplo: node report-distributor.js --list
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cron = require('node-cron');
const https = require('https');
const nodemailer = require('nodemailer');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'report_distribution_config.json');
const LOG_FILE = path.join(__dirname, 'report_distribution.log');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let file = null;
let channels = [];
let schedule = null;
let recipients = [];
let subject = null;
let message = null;
let reportId = null;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            file = args[i + 1];
            i++;
            break;
        case '--channels':
        case '-c':
            channels = args[i + 1].split(',');
            i++;
            break;
        case '--recipients':
        case '-r':
            recipients = args[i + 1].split(',');
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
  --file, -f <archivo>     Archivo a distribuir
  --channels, -c <lista>   Canales (email,slack,teams)
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
  node report-distributor.js --file report.pdf --channels email,slack
  node report-distributor.js --schedule "0 9 * * 1" --file report.pdf
  node report-distributor.js --list
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
    return { reports: [] };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function logReport(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
    if (verbose || type === 'error') {
        console.log(message);
    }
}

function generateReportId() {
    return 'rpt-' + crypto.randomBytes(6).toString('hex');
}

function sendEmail(recipients, subject, message, attachments, config) {
    return new Promise((resolve, reject) => {
        const emailConfig = config.email || {};
        if (!emailConfig.smtp || !emailConfig.smtp.host) {
            reject(new Error('Configuración de email incompleta'));
            return;
        }

        const transporter = nodemailer.createTransport({
            host: emailConfig.smtp.host,
            port: emailConfig.smtp.port || 587,
            secure: emailConfig.smtp.secure || false,
            auth: {
                user: emailConfig.smtp.user || emailConfig.from,
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

function sendSlack(webhookUrl, message, file) {
    return new Promise((resolve, reject) => {
        const payload = {
            text: message || '📊 Nuevo reporte de seguridad',
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
        const payload = {
            type: 'message',
            attachments: [{
                contentType: 'application/vnd.microsoft.card.adaptive',
                content: {
                    type: 'AdaptiveCard',
                    version: '1.0',
                    body: [
                        { type: 'TextBlock', text: subject || '📊 Reporte de Seguridad', weight: 'bolder', size: 'large' },
                        { type: 'TextBlock', text: message || 'Reporte automático generado por MFH TOOLS PRO' }
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

async function distributeReport(file, channels, recipients, subject, message) {
    const config = loadConfig();
    const results = {};
    
    logReport(`📤 Distribuyendo reporte: ${file}`, 'info');
    
    // Verificar archivo
    if (!fs.existsSync(file)) {
        logReport(`❌ Archivo no encontrado: ${file}`, 'error');
        throw new Error(`Archivo no encontrado: ${file}`);
    }

    const attachments = [{ filename: path.basename(file), path: file }];

    for (const channel of channels) {
        try {
            logReport(`📡 Enviando por ${channel}...`, 'info');
            
            switch (channel.toLowerCase()) {
                case 'email':
                    if (!recipients || recipients.length === 0) {
                        throw new Error('No se especificaron destinatarios de email');
                    }
                    results.email = await sendEmail(recipients, subject, message, attachments, config);
                    logReport(`✅ Email enviado a ${recipients.join(', ')}`, 'success');
                    break;
                    
                case 'slack':
                    const slackWebhook = config.slack?.webhookUrl;
                    if (!slackWebhook) {
                        throw new Error('Webhook de Slack no configurado');
                    }
                    results.slack = await sendSlack(slackWebhook, message || subject, file);
                    logReport(`✅ Slack enviado`, 'success');
                    break;
                    
                case 'teams':
                    const teamsWebhook = config.teams?.webhookUrl;
                    if (!teamsWebhook) {
                        throw new Error('Webhook de Teams no configurado');
                    }
                    results.teams = await sendTeams(teamsWebhook, subject, message, file);
                    logReport(`✅ Teams enviado`, 'success');
                    break;
                    
                default:
                    logReport(`⚠️ Canal no soportado: ${channel}`, 'warning');
                    results[channel] = { error: 'Canal no soportado' };
            }
        } catch (error) {
            logReport(`❌ Error en ${channel}: ${error.message}`, 'error');
            results[channel] = { error: error.message };
        }
    }

    return results;
}

async function scheduleReport(file, channels, recipients, subject, message, schedule) {
    if (!cron.validate(schedule)) {
        console.error(`❌ Formato cron inválido: ${schedule}`);
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
    console.log(`📋 Programación: ${schedule}`);
    console.log(`📋 Archivo: ${file}`);
    console.log(`📋 Canales: ${channels.join(', ')}`);
    
    return newReport;
}

function listReports() {
    const config = loadConfig();
    if (config.reports.length === 0) {
        console.log('📭 No hay reportes programados');
        return;
    }

    console.log(`\n📋 REPORTES PROGRAMADOS (${config.reports.length}):`);
    console.log('='.split(60).join('='));

    for (const report of config.reports) {
        const statusIcon = report.enabled ? '🟢' : '🔴';
        console.log(`\n${statusIcon} ${report.id}`);
        console.log(`   📋 Archivo: ${path.basename(report.file)}`);
        console.log(`   📋 Canales: ${report.channels.join(', ')}`);
        console.log(`   🕐 Programación: ${report.schedule}`);
        if (report.lastRun) {
            console.log(`   ⏱️ Última ejecución: ${new Date(report.lastRun).toLocaleString()}`);
        }
        console.log(`   📅 Creado: ${new Date(report.createdAt).toLocaleString()}`);
    }
}

function removeReport(id) {
    const config = loadConfig();
    const initialLength = config.reports.length;
    config.reports = config.reports.filter(r => r.id !== id);
    
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
    const report = config.reports.find(r => r.id === id);
    
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
    console.log('='.split(40).join('='));

    // Cargar tareas existentes
    const config = loadConfig();
    global.scheduledReports = global.scheduledReports || {};
    
    for (const report of config.reports) {
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
            if (file && channels.length > 0) {
                if (schedule) {
                    await scheduleReport(file, channels, recipients, subject, message, schedule);
                } else {
                    await distributeReport(file, channels, recipients, subject, message);
                }
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
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
