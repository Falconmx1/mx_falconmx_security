#!/usr/bin/env node

/**
 * Notification Sender - MFH TOOLS PRO
 * Envía notificaciones (email, Telegram, etc.)
 * 
 * Uso: node notification-sender.js [opciones]
 * Ejemplo: node notification-sender.js --email --to usuario@email.com --subject "Alerta" --message "Escaneo completado"
 * Ejemplo: node notification-sender.js --telegram --message "Servidor caído"
 * Ejemplo: node notification-sender.js --config config.json --send
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'notifications_config.json');

// Configuración por defecto
const DEFAULT_CONFIG = {
    email: {
        enabled: false,
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            user: '',
            pass: ''
        },
        from: '',
        to: ''
    },
    telegram: {
        enabled: false,
        botToken: '',
        chatId: ''
    },
    webhook: {
        enabled: false,
        url: '',
        method: 'POST'
    },
    slack: {
        enabled: false,
        webhookUrl: ''
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let configPath = null;
let action = null;
let sendEmail = false;
let sendTelegram = false;
let sendWebhook = false;
let sendSlack = false;
let emailTo = null;
let emailSubject = null;
let emailFrom = null;
let message = null;
let telegramBotToken = null;
let telegramChatId = null;
let webhookUrl = null;
let webhookMethod = 'POST';
let slackWebhook = null;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--config':
            configPath = args[i + 1];
            i++;
            break;
        case '--send':
            action = 'send';
            break;
        case '--test':
            action = 'test';
            break;
        case '--email':
            sendEmail = true;
            break;
        case '--telegram':
            sendTelegram = true;
            break;
        case '--webhook':
            sendWebhook = true;
            break;
        case '--slack':
            sendSlack = true;
            break;
        case '--to':
            emailTo = args[i + 1];
            i++;
            break;
        case '--from':
            emailFrom = args[i + 1];
            i++;
            break;
        case '--subject':
            emailSubject = args[i + 1];
            i++;
            break;
        case '--message':
            message = args[i + 1];
            i++;
            break;
        case '--bot-token':
            telegramBotToken = args[i + 1];
            i++;
            break;
        case '--chat-id':
            telegramChatId = args[i + 1];
            i++;
            break;
        case '--webhook-url':
            webhookUrl = args[i + 1];
            i++;
            break;
        case '--webhook-method':
            webhookMethod = args[i + 1].toUpperCase();
            i++;
            break;
        case '--slack-webhook':
            slackWebhook = args[i + 1];
            i++;
            break;
        case '--init':
            action = 'init';
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Notification Sender - MFH TOOLS PRO
=======================================
Envía notificaciones por email, Telegram, webhook y Slack.

Uso:
  node notification-sender.js [opciones]

Opciones:
  --init                    Crear archivo de configuración ejemplo
  --send                    Enviar notificación con la configuración actual
  --test                    Probar la configuración
  --email                   Enviar por email
  --telegram                Enviar por Telegram
  --webhook                 Enviar por webhook
  --slack                   Enviar por Slack
  --to <email>              Email destino
  --from <email>            Email origen
  --subject <asunto>        Asunto del email
  --message <texto>         Mensaje a enviar
  --bot-token <token>       Token del bot de Telegram
  --chat-id <id>            Chat ID de Telegram
  --webhook-url <url>       URL del webhook
  --webhook-method <método> Método HTTP (GET, POST, PUT)
  --slack-webhook <url>     URL del webhook de Slack
  --config <archivo>        Archivo de configuración
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node notification-sender.js --init
  node notification-sender.js --email --to admin@empresa.com --subject "Alerta" --message "Escaneo completado"
  node notification-sender.js --telegram --bot-token "123:abc" --chat-id "456" --message "Servidor caído"
  node notification-sender.js --webhook --webhook-url "https://hooks.example.com" --message '{"event":"scan"}'
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig(configFile) {
    try {
        if (fs.existsSync(configFile)) {
            const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            return config;
        }
    } catch (error) {
        console.error(`❌ Error cargando configuración: ${error.message}`);
    }
    return null;
}

function saveConfig(config, configFile) {
    try {
        fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${configFile}`);
    } catch (error) {
        console.error(`❌ Error guardando configuración: ${error.message}`);
    }
}

function createDefaultConfig() {
    const configFile = CONFIG_FILE;
    if (fs.existsSync(configFile)) {
        console.log(`⚠️ Ya existe un archivo de configuración: ${configFile}`);
        return;
    }
    saveConfig(DEFAULT_CONFIG, configFile);
    console.log(`📝 Archivo de configuración creado: ${configFile}`);
    console.log('ℹ️ Edita el archivo con tus credenciales');
}

function sendEmailNotification(config, to, subject, message) {
    return new Promise((resolve, reject) => {
        const emailConfig = config.email;
        if (!emailConfig.enabled) {
            reject(new Error('Email no habilitado en configuración'));
            return;
        }

        // Usar valores de línea de comandos si se proporcionan
        const finalTo = to || emailConfig.to;
        const finalFrom = emailConfig.from;
        const finalSubject = subject || 'MFH TOOLS PRO - Notificación';

        if (!finalTo) {
            reject(new Error('Email destino no especificado'));
            return;
        }

        const transporter = nodemailer.createTransport({
            host: emailConfig.smtp.host,
            port: emailConfig.smtp.port,
            secure: emailConfig.smtp.secure || false,
            auth: {
                user: emailConfig.smtp.user,
                pass: emailConfig.smtp.pass
            }
        });

        const mailOptions = {
            from: finalFrom,
            to: finalTo,
            subject: finalSubject,
            text: message,
            html: `<h2>${finalSubject}</h2><p>${message}</p><hr><p><small>MFH TOOLS PRO - Notificación automática</small></p>`
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

function sendTelegramNotification(botToken, chatId, message) {
    return new Promise((resolve, reject) => {
        if (!botToken || !chatId) {
            reject(new Error('Bot token y chat ID son requeridos'));
            return;
        }

        const postData = JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${botToken}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.ok) {
                        resolve(parsed);
                    } else {
                        reject(new Error(parsed.description || 'Error en la API de Telegram'));
                    }
                } catch (error) {
                    reject(new Error(`Error parsing response: ${error.message}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

function sendWebhookNotification(url, method, message, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const postData = typeof message === 'string' ? message : JSON.stringify(message);
        const isJson = typeof message === 'object' || message.startsWith('{');

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: method || 'POST',
            headers: {
                'Content-Type': isJson ? 'application/json' : 'text/plain',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        // Merge custom headers
        Object.assign(options.headers, headers);

        const req = httpModule.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    statusMessage: res.statusMessage,
                    body: data
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

function sendSlackNotification(webhookUrl, message) {
    return new Promise((resolve, reject) => {
        const payload = {
            text: message,
            username: 'MFH TOOLS PRO',
            icon_emoji: ':shield:'
        };

        const parsedUrl = new URL(webhookUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const postData = JSON.stringify(payload);
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (isHttps ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = httpModule.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({ statusCode: res.statusCode, body: data });
                } else {
                    reject(new Error(`Slack error: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function sendNotifications(config, options) {
    const results = {};

    // Email
    if (sendEmail || options.email) {
        try {
            console.log('📧 Enviando email...');
            const to = options.to || config.email.to;
            const subject = options.subject || 'MFH TOOLS PRO - Notificación';
            const msg = options.message || message;
            
            if (!to) {
                throw new Error('Email destino no especificado');
            }
            
            const info = await sendEmailNotification(config, to, subject, msg);
            results.email = { success: true, info };
            console.log('✅ Email enviado correctamente');
        } catch (error) {
            results.email = { success: false, error: error.message };
            console.error(`❌ Error enviando email: ${error.message}`);
        }
    }

    // Telegram
    if (sendTelegram || options.telegram) {
        try {
            console.log('📱 Enviando Telegram...');
            const botToken = options.botToken || config.telegram.botToken;
            const chatId = options.chatId || config.telegram.chatId;
            const msg = options.message || message;

            if (!botToken || !chatId) {
                throw new Error('Bot token y chat ID requeridos');
            }

            const info = await sendTelegramNotification(botToken, chatId, msg);
            results.telegram = { success: true, info };
            console.log('✅ Telegram enviado correctamente');
        } catch (error) {
            results.telegram = { success: false, error: error.message };
            console.error(`❌ Error enviando Telegram: ${error.message}`);
        }
    }

    // Webhook
    if (sendWebhook || options.webhook) {
        try {
            console.log('🌐 Enviando webhook...');
            const url = options.webhookUrl || config.webhook.url;
            const method = options.webhookMethod || config.webhook.method || 'POST';
            const msg = options.message || message;

            if (!url) {
                throw new Error('URL de webhook requerida');
            }

            const info = await sendWebhookNotification(url, method, msg);
            results.webhook = { success: true, info };
            console.log('✅ Webhook enviado correctamente');
        } catch (error) {
            results.webhook = { success: false, error: error.message };
            console.error(`❌ Error enviando webhook: ${error.message}`);
        }
    }

    // Slack
    if (sendSlack || options.slack) {
        try {
            console.log('💬 Enviando Slack...');
            const url = options.slackWebhook || config.slack.webhookUrl;
            const msg = options.message || message;

            if (!url) {
                throw new Error('URL de webhook de Slack requerida');
            }

            const info = await sendSlackNotification(url, msg);
            results.slack = { success: true, info };
            console.log('✅ Slack enviado correctamente');
        } catch (error) {
            results.slack = { success: false, error: error.message };
            console.error(`❌ Error enviando Slack: ${error.message}`);
        }
    }

    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Notification Sender - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Inicializar configuración
    if (action === 'init') {
        createDefaultConfig();
        return;
    }

    // Cargar configuración
    let config = null;
    const configFile = configPath || CONFIG_FILE;

    if (fs.existsSync(configFile)) {
        config = loadConfig(configFile);
        console.log(`✅ Configuración cargada: ${configFile}`);
    } else if (action === 'send' || action === 'test') {
        console.log(`⚠️ No se encontró configuración. Usando valores de línea de comandos.`);
        console.log(`💡 Para crear una configuración: node notification-sender.js --init`);
        config = DEFAULT_CONFIG;
    } else {
        console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
        console.log(`💡 Para crear una configuración: node notification-sender.js --init`);
        return;
    }

    // Test
    if (action === 'test') {
        console.log('🔍 Probando configuración...');
        if (config.email.enabled) {
            console.log(`✅ Email habilitado (${config.email.smtp.host})`);
        }
        if (config.telegram.enabled) {
            console.log(`✅ Telegram habilitado`);
        }
        if (config.webhook.enabled) {
            console.log(`✅ Webhook habilitado (${config.webhook.url})`);
        }
        if (config.slack.enabled) {
            console.log(`✅ Slack habilitado`);
        }
        return;
    }

    // Validar mensaje
    if (!message && action === 'send') {
        console.error('❌ Debes especificar un mensaje con --message');
        console.log('   Ejemplo: --message "Escaneo completado"');
        process.exit(1);
    }

    // Enviar notificaciones
    if (action === 'send' || sendEmail || sendTelegram || sendWebhook || sendSlack) {
        const options = {
            email: sendEmail,
            telegram: sendTelegram,
            webhook: sendWebhook,
            slack: sendSlack,
            to: emailTo,
            from: emailFrom,
            subject: emailSubject,
            message: message,
            botToken: telegramBotToken,
            chatId: telegramChatId,
            webhookUrl: webhookUrl,
            webhookMethod: webhookMethod,
            slackWebhook: slackWebhook
        };

        console.log('📤 Enviando notificaciones...');
        const results = await sendNotifications(config, options);

        // Resumen
        console.log('\n📊 RESUMEN:');
        for (const [type, result] of Object.entries(results)) {
            const icon = result.success ? '✅' : '❌';
            const status = result.success ? 'Éxito' : `Error: ${result.error}`;
            console.log(`   ${icon} ${type}: ${status}`);
        }

        const allSuccess = Object.values(results).every(r => r.success);
        if (allSuccess && Object.keys(results).length > 0) {
            console.log('\n🎉 Todas las notificaciones enviadas correctamente');
        } else if (Object.keys(results).length > 0) {
            console.log('\n⚠️ Algunas notificaciones fallaron');
        } else {
            console.log('\nℹ️ No se enviaron notificaciones. Especifica --email, --telegram, --webhook o --slack');
        }
    }
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Notification Sender detenido');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Notification Sender detenido');
    process.exit(0);
});
