#!/usr/bin/env node

/**
 * User Behavior Analytics - MFH TOOLS PRO
 * Detecta comportamientos anómalos de usuarios
 * 
 * Uso: node user-behavior-analytics.js [opciones]
 * Ejemplo: node user-behavior-analytics.js --file user_logs.json
 * Ejemplo: node user-behavior-analytics.js --file user_logs.json --threshold 2.5
 * Ejemplo: node user-behavior-analytics.js --live --users user1,user2
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    threshold: 2.5,
    windowSize: 24, // horas
    maxEvents: 10000
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let file = null;
let live = false;
let users = null;
let outputFile = null;
let verbose = false;
let threshold = CONFIG.threshold;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--file':
        case '-f':
            file = args[i + 1];
            i++;
            break;
        case '--live':
            live = true;
            break;
        case '--users':
        case '-u':
            users = args[i + 1].split(',');
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--threshold':
        case '-t':
            threshold = parseFloat(args[i + 1]);
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 User Behavior Analytics - MFH TOOLS PRO
===========================================
Detecta comportamientos anómalos de usuarios.

Uso:
  node user-behavior-analytics.js [opciones]

Opciones:
  --file, -f <archivo>     Archivo de logs de usuarios (JSON)
  --live                   Modo en vivo
  --users, -u <lista>      Lista de usuarios (separados por coma)
  --output, -o <archivo>   Guardar resultados en JSON
  --threshold, -t <n>      Umbral de anomalía (default: 2.5)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node user-behavior-analytics.js --file user_logs.json
  node user-behavior-analytics.js --file user_logs.json --threshold 2.5
  node user-behavior-analytics.js --live --users user1,user2
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function generateMockUserData(users, count) {
    const events = [];
    const actions = ['login', 'logout', 'file_access', 'data_export', 'config_change', 'admin_action', 'failed_login', 'password_change'];
    const resources = ['/home/user1', '/home/user2', '/etc', '/var/log', '/tmp', '/data', '/backup', '/config'];
    const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3', '10.0.0.1', '10.0.0.2', '8.8.8.8'];

    for (let i = 0; i < count; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const isAnomaly = Math.random() < 0.08;
        
        // Comportamiento anómalo: acciones fuera de horario, múltiples fallos, etc.
        let hour = Math.floor(Math.random() * 24);
        let attempts = 1;
        let dataSize = Math.floor(Math.random() * 10) + 1;
        
        if (isAnomaly) {
            hour = Math.floor(Math.random() * 6) + 1; // Madrugada
            attempts = Math.floor(Math.random() * 10) + 5;
            dataSize = Math.floor(Math.random() * 100) + 50;
        }
        
        events.push({
            timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString(),
            user,
            action,
            resource: resources[Math.floor(Math.random() * resources.length)],
            ip: ips[Math.floor(Math.random() * ips.length)],
            hour,
            attempts,
            dataSize,
            isAnomaly,
            success: Math.random() > 0.2
        });
    }
    
    return events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function extractUserFeatures(events) {
    const userData = {};
    
    for (const event of events) {
        if (!userData[event.user]) {
            userData[event.user] = {
                user: event.user,
                events: [],
                actions: {},
                hours: {},
                resources: {},
                ips: {},
                totalAttempts: 0,
                failedAttempts: 0,
                dataExports: 0,
                totalDataSize: 0,
                adminActions: 0
            };
        }
        
        const data = userData[event.user];
        data.events.push(event);
        data.actions[event.action] = (data.actions[event.action] || 0) + 1;
        data.hours[event.hour] = (data.hours[event.hour] || 0) + 1;
        data.resources[event.resource] = (data.resources[event.resource] || 0) + 1;
        data.ips[event.ip] = (data.ips[event.ip] || 0) + 1;
        
        if (!event.success) {
            data.failedAttempts++;
        }
        data.totalAttempts++;
        
        if (event.action === 'data_export') {
            data.dataExports++;
            data.totalDataSize += event.dataSize || 0;
        }
        
        if (event.action === 'admin_action' || event.action === 'config_change') {
            data.adminActions++;
        }
    }
    
    return userData;
}

function calculateUserStats(userData) {
    const stats = {};
    
    for (const [user, data] of Object.entries(userData)) {
        const events = data.events;
        const total = events.length;
        
        // Calcular hora promedio
        const avgHour = events.reduce((sum, e) => sum + e.hour, 0) / total;
        
        // Calcular varianza de hora
        const hourVariance = events.reduce((sum, e) => sum + Math.pow(e.hour - avgHour, 2), 0) / total;
        const hourStdDev = Math.sqrt(hourVariance);
        
        // Tasa de fallos
        const failRate = data.failedAttempts / (data.totalAttempts || 1);
        
        // Variedad de acciones
        const actionTypes = Object.keys(data.actions).length;
        
        // Variedad de recursos
        const resourceTypes = Object.keys(data.resources).length;
        
        // Variedad de IPs
        const ipTypes = Object.keys(data.ips).length;
        
        // Entropía de acciones
        const actionEntropy = calculateEntropy(data.actions);
        
        stats[user] = {
            totalEvents: total,
            avgHour,
            hourStdDev,
            failRate,
            actionTypes,
            resourceTypes,
            ipTypes,
            actionEntropy,
            dataExports: data.dataExports,
            adminActions: data.adminActions,
            totalDataSize: data.totalDataSize
        };
    }
    
    return stats;
}

function calculateEntropy(freq) {
    const total = Object.values(freq).reduce((a, b) => a + b, 0);
    let entropy = 0;
    for (const key in freq) {
        const p = freq[key] / total;
        entropy -= p * Math.log2(p);
    }
    return entropy;
}

function detectAnomalies(userData, stats, threshold) {
    const anomalies = [];
    const allUsers = Object.keys(stats);
    
    // Calcular estadísticas globales
    const globalStats = {
        avgHour: allUsers.reduce((sum, u) => sum + stats[u].avgHour, 0) / allUsers.length,
        avgFailRate: allUsers.reduce((sum, u) => sum + stats[u].failRate, 0) / allUsers.length,
        avgActionTypes: allUsers.reduce((sum, u) => sum + stats[u].actionTypes, 0) / allUsers.length,
        avgDataExports: allUsers.reduce((sum, u) => sum + stats[u].dataExports, 0) / allUsers.length
    };
    
    for (const [user, data] of Object.entries(userData)) {
        const stat = stats[user];
        let score = 0;
        let reasons = [];
        let severity = 'LOW';
        
        // Verificar hora inusual
        if (stat.hourStdDev > 3) {
            score += 0.5;
            reasons.push(`horario irregular (desviación: ${stat.hourStdDev.toFixed(2)})`);
        }
        
        // Verificar tasa de fallos alta
        if (stat.failRate > globalStats.avgFailRate * 2) {
            score += 0.5;
            reasons.push(`alta tasa de fallos (${(stat.failRate * 100).toFixed(1)}%)`);
        }
        
        // Verificar acciones administrativas excesivas
        if (stat.adminActions > 3) {
            score += 0.3;
            reasons.push(`múltiples acciones administrativas (${stat.adminActions})`);
        }
        
        // Verificar exportaciones de datos excesivas
        if (stat.dataExports > globalStats.avgDataExports * 3) {
            score += 0.5;
            reasons.push(`excesivas exportaciones de datos (${stat.dataExports})`);
        }
        
        // Verificar variedad de IPs
        if (stat.ipTypes > 5) {
            score += 0.3;
            reasons.push(`múltiples IPs (${stat.ipTypes})`);
        }
        
        // Verificar entropía de acciones
        if (stat.actionEntropy > 3) {
            score += 0.3;
            reasons.push(`alta diversidad de acciones (entropía: ${stat.actionEntropy.toFixed(2)})`);
        }
        
        // Verificar eventos fuera de horario laboral
        const offHours = data.events.filter(e => e.hour < 8 || e.hour > 20);
        if (offHours.length > data.events.length * 0.3) {
            score += 0.3;
            reasons.push(`${offHours.length} eventos fuera de horario`);
        }
        
        // Verificar intentos múltiples
        const failedEvents = data.events.filter(e => !e.success);
        if (failedEvents.length > 5) {
            score += 0.3;
            reasons.push(`${failedEvents.length} intentos fallidos`);
        }
        
        if (score > 0) {
            if (score >= 1.5) severity = 'HIGH';
            else if (score >= 0.8) severity = 'MEDIUM';
            
            anomalies.push({
                user,
                score,
                severity,
                reasons,
                details: {
                    totalEvents: stat.totalEvents,
                    avgHour: stat.avgHour,
                    failRate: stat.failRate,
                    actionTypes: stat.actionTypes,
                    ipTypes: stat.ipTypes,
                    dataExports: stat.dataExports,
                    adminActions: stat.adminActions
                },
                recentEvents: data.events.slice(-5)
            });
        }
    }
    
    return anomalies.sort((a, b) => b.score - a.score);
}

function formatResults(users, anomalies) {
    let output = '';
    output += `🔍 User Behavior Analytics - MFH TOOLS PRO\n`;
    output += '='.repeat(50) + '\n\n';
    
    output += `📊 RESUMEN:\n`;
    output += `   📋 Usuarios analizados: ${users.length}\n`;
    output += `   🔴 Anomalías: ${anomalies.length}\n`;
    output += `   📊 Tasa de anomalías: ${(anomalies.length / users.length * 100).toFixed(1)}%\n\n`;
    
    if (anomalies.length > 0) {
        output += `🔴 USUARIOS ANÓMALOS:\n`;
        for (const anomaly of anomalies) {
            const emoji = anomaly.severity === 'HIGH' ? '🔴' : anomaly.severity === 'MEDIUM' ? '🟡' : '🟢';
            output += `   ${emoji} ${anomaly.user} (Score: ${anomaly.score.toFixed(2)} - ${anomaly.severity})\n`;
            output += `      📝 Razones: ${anomaly.reasons.join(', ')}\n`;
            output += `      📊 Eventos: ${anomaly.details.totalEvents}\n`;
            output += `      📊 Tasa de fallos: ${(anomaly.details.failRate * 100).toFixed(1)}%\n`;
            output += `      📊 Exportaciones: ${anomaly.details.dataExports}\n`;
            output += `      📊 Acciones admin: ${anomaly.details.adminActions}\n`;
            if (verbose && anomaly.recentEvents.length > 0) {
                output += `      📋 Eventos recientes:\n`;
                for (const event of anomaly.recentEvents) {
                    output += `         • ${event.action} (${event.resource}) - ${event.success ? '✅' : '❌'}\n`;
                }
            }
        }
        
        // Recomendaciones
        output += `\n💡 RECOMENDACIONES:\n`;
        const highCount = anomalies.filter(a => a.severity === 'HIGH').length;
        if (highCount > 0) {
            output += `   🔴 ${highCount} usuarios de alta prioridad detectados\n`;
            output += `   • Revisar actividad de cuentas comprometidas\n`;
            output += `   • Resetear contraseñas de usuarios afectados\n`;
            output += `   • Revisar políticas de acceso\n`;
        } else {
            output += `   🟡 Monitorear actividad de usuarios\n`;
            output += `   • Implementar MFA para acceso sensible\n`;
            output += `   • Revisar logs de acceso periódicamente\n`;
        }
    } else {
        output += `✅ No se detectaron comportamientos anómalos\n`;
    }
    
    return output;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 User Behavior Analytics - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    try {
        let events = [];
        let userList = users || ['user1', 'user2', 'user3', 'user4', 'user5', 'admin', 'developer', 'analyst'];
        
        if (file) {
            if (!fs.existsSync(file)) {
                console.error(`❌ Archivo no encontrado: ${file}`);
                process.exit(1);
            }
            const content = fs.readFileSync(file, 'utf8');
            events = JSON.parse(content);
            console.log(`📋 Cargados ${events.length} eventos desde ${file}`);
        } else if (live) {
            console.log(`📡 Modo en vivo para usuarios: ${userList.join(', ')}`);
            console.log('⚠️ Modo live simulado (generando datos)');
            events = generateMockUserData(userList, CONFIG.maxEvents);
        } else {
            console.log('ℹ️ Generando datos de ejemplo...');
            events = generateMockUserData(userList, 500);
        }
        
        // Extraer características por usuario
        const userData = extractUserFeatures(events);
        const usersAnalyzed = Object.keys(userData);
        console.log(`📊 ${usersAnalyzed.length} usuarios analizados`);
        
        // Calcular estadísticas
        const stats = calculateUserStats(userData);
        
        // Detectar anomalías
        const anomalies = detectAnomalies(userData, stats, threshold);
        
        // Mostrar resultados
        console.log(formatResults(usersAnalyzed, anomalies));
        
        // Guardar resultados
        if (outputFile) {
            const output = {
                timestamp: new Date().toISOString(),
                threshold,
                totalUsers: usersAnalyzed.length,
                anomalies: anomalies,
                userStats: stats,
                userData: userData
            };
            fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
            console.log(`\n💾 Resultados guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Análisis completado');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        if (verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
})();
