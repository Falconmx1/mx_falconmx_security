#!/usr/bin/env node

/**
 * Zero Trust Access Manager - MFH TOOLS PRO
 * Gestiona políticas de acceso Zero Trust
 * 
 * Uso: node zero-trust-manager.js [opciones]
 * Ejemplo: node zero-trust-manager.js --policy enforce --user admin
 * Ejemplo: node zero-trust-manager.js --verify --session abc123
 * Ejemplo: node zero-trust-manager.js --list-policies
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'zero_trust_config.json');
const POLICIES_DIR = path.join(__dirname, 'zero_trust_policies');
const LOGS_DIR = path.join(__dirname, 'zero_trust_logs');

const DEFAULT_CONFIG = {
    policies: [
        {
            id: 'zt-policy-001',
            name: 'Default Zero Trust Policy',
            description: 'Ningun acceso es confiable por defecto',
            rules: [
                { id: 'rule-1', type: 'network', action: 'allow', condition: 'ip_range=10.0.0.0/8' },
                { id: 'rule-2', type: 'user', action: 'require_mfa', condition: 'role=admin' },
                { id: 'rule-3', type: 'device', action: 'block', condition: 'device_health=failed' },
                { id: 'rule-4', type: 'time', action: 'allow', condition: 'time_between=09:00-18:00' },
                { id: 'rule-5', type: 'geo', action: 'block', condition: 'country=RU,CN,IR' }
            ]
        }
    ],
    verify_always: true,
    session_timeout: 3600,
    log_level: 'info'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let policyName = null;
let userId = null;
let sessionId = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--policy':
            policyName = args[i + 1];
            i++;
            break;
        case '--user':
            userId = args[i + 1];
            i++;
            break;
        case '--session':
            sessionId = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--list-policies':
            action = 'listPolicies';
            break;
        case '--enforce':
            action = 'enforce';
            break;
        case '--verify':
            action = 'verify';
            break;
        case '--audit':
            action = 'audit';
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
🛡️ Zero Trust Access Manager - MFH TOOLS PRO
==========================================
Gestiona politicas de acceso Zero Trust.

Uso:
  node zero-trust-manager.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --list-policies       Listar politicas disponibles
  --enforce             Aplicar politica a un usuario
  --verify              Verificar sesion/permiso
  --audit               Auditar accesos
  --policy <nombre>     Nombre de la politica
  --user <id>           ID de usuario
  --session <id>        ID de sesion
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node zero-trust-manager.js --init
  node zero-trust-manager.js --list-policies
  node zero-trust-manager.js --enforce --user admin --policy "Default Zero Trust Policy"
  node zero-trust-manager.js --verify --session abc123
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
    if (!fs.existsSync(POLICIES_DIR)) {
        fs.mkdirSync(POLICIES_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Guardar politica por defecto
    const defaultPolicyPath = path.join(POLICIES_DIR, 'default.json');
    if (!fs.existsSync(defaultPolicyPath)) {
        fs.writeFileSync(defaultPolicyPath, JSON.stringify(DEFAULT_CONFIG.policies[0], null, 2));
    }
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Politicas: ${POLICIES_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function listPolicies() {
    const config = loadConfig();
    console.log('\n📋 POLITICAS ZERO TRUST:');
    console.log('='.repeat(60));
    
    const policies = config.policies || [];
    if (policies.length === 0) {
        console.log('ℹ️ No hay politicas configuradas.');
        return;
    }
    
    policies.forEach(policy => {
        console.log(`\n📌 ${policy.name} (${policy.id})`);
        console.log(`   Descripcion: ${policy.description}`);
        console.log(`   Reglas: ${policy.rules.length}`);
        policy.rules.forEach(rule => {
            console.log(`      • ${rule.type}: ${rule.action} → ${rule.condition}`);
        });
    });
}

function enforcePolicy(user, policyName) {
    const config = loadConfig();
    let policy = config.policies.find(p => p.name === policyName);
    
    if (!policy) {
        console.error(`❌ Politica no encontrada: ${policyName}`);
        return null;
    }
    
    console.log(`🔒 Aplicando politica ${policy.name} a usuario ${user}`);
    
    // Simular verificacion de contexto
    const context = {
        user: user,
        device: {
            id: 'device-' + crypto.randomBytes(4).toString('hex'),
            health: Math.random() > 0.2 ? 'passed' : 'failed'
        },
        location: {
            ip: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
            country: ['MX', 'US', 'CA', 'ES'][Math.floor(Math.random() * 4)]
        },
        time: new Date().toISOString(),
        request: {
            resource: '/api/' + ['users', 'data', 'admin', 'logs'][Math.floor(Math.random() * 4)]
        }
    };
    
    console.log(`\n📊 Contexto evaluado:`);
    console.log(`   Usuario: ${context.user}`);
    console.log(`   Dispositivo: ${context.device.id} (${context.device.health})`);
    console.log(`   Ubicacion: ${context.location.country} (${context.location.ip})`);
    console.log(`   Recurso: ${context.request.resource}`);
    
    // Evaluar reglas
    let result = {
        allowed: true,
        reasons: [],
        actions: []
    };
    
    for (const rule of policy.rules) {
        let rulePassed = false;
        
        switch (rule.type) {
            case 'network':
                rulePassed = context.location.ip.startsWith('10.');
                if (!rulePassed) {
                    result.allowed = false;
                    result.reasons.push(`Network restriction: ${rule.condition}`);
                }
                break;
            case 'user':
                rulePassed = true; // Asumimos que el usuario existe
                if (rule.action === 'require_mfa') {
                    result.actions.push('MFA required');
                }
                break;
            case 'device':
                rulePassed = context.device.health === 'passed';
                if (!rulePassed) {
                    result.allowed = false;
                    result.reasons.push(`Device health check failed: ${rule.condition}`);
                }
                break;
            case 'time':
                const hour = new Date().getHours();
                const [start, end] = rule.condition.split('=')[1].split('-');
                rulePassed = hour >= parseInt(start) && hour <= parseInt(end);
                if (!rulePassed) {
                    result.allowed = false;
                    result.reasons.push(`Time restriction: ${rule.condition}`);
                }
                break;
            case 'geo':
                const blockedCountries = rule.condition.split('=')[1].split(',');
                rulePassed = !blockedCountries.includes(context.location.country);
                if (!rulePassed) {
                    result.allowed = false;
                    result.reasons.push(`Geographic restriction: ${rule.condition}`);
                }
                break;
            default:
                rulePassed = true;
        }
    }
    
    // Loggear resultado
    const logEntry = {
        timestamp: new Date().toISOString(),
        user: user,
        policy: policy.name,
        context: context,
        result: result,
        session_id: crypto.randomBytes(16).toString('hex')
    };
    
    const logFile = path.join(LOGS_DIR, `access_${Date.now()}.log`);
    fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
    
    console.log(`\n📝 Resultado:`);
    console.log(`   ✅ Acceso ${result.allowed ? 'PERMITIDO' : 'DENEGADO'}`);
    if (result.reasons.length > 0) {
        console.log(`   Razones:`);
        result.reasons.forEach(r => console.log(`      • ${r}`));
    }
    if (result.actions.length > 0) {
        console.log(`   Acciones requeridas:`);
        result.actions.forEach(a => console.log(`      • ${a}`));
    }
    console.log(`\n📄 Log guardado: ${logFile}`);
    
    return result;
}

function verifySession(sessionId) {
    console.log(`🔍 Verificando sesion: ${sessionId}`);
    
    // Simular verificacion de sesion
    const isValid = Math.random() > 0.3;
    const expiryTime = new Date(Date.now() + 3600000).toISOString();
    
    const result = {
        session_id: sessionId,
        valid: isValid,
        user: isValid ? 'user-' + crypto.randomBytes(4).toString('hex') : null,
        expiry: expiryTime,
        permissions: isValid ? ['read', 'write', 'admin'] : [],
        trust_score: isValid ? Math.floor(Math.random() * 30) + 70 : 0
    };
    
    console.log(`\n📊 Resultado de verificacion:`);
    console.log(`   Sesion: ${result.valid ? '✅ VALIDA' : '❌ INVALIDA'}`);
    if (result.valid) {
        console.log(`   Usuario: ${result.user}`);
        console.log(`   Expira: ${result.expiry}`);
        console.log(`   Trust Score: ${result.trust_score}/100`);
        console.log(`   Permisos: ${result.permissions.join(', ')}`);
    }
    
    return result;
}

function auditAccess() {
    console.log('📋 AUDITORIA DE ACCESOS');
    console.log('='.repeat(40));
    
    const logs = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.log'));
    
    if (logs.length === 0) {
        console.log('ℹ️ No hay logs de acceso.');
        return;
    }
    
    const accessData = [];
    for (const logFile of logs.slice(-10)) {
        try {
            const content = fs.readFileSync(path.join(LOGS_DIR, logFile), 'utf8');
            const data = JSON.parse(content);
            accessData.push(data);
        } catch (error) {
            // Ignorar archivos corruptos
        }
    }
    
    const stats = {
        total: accessData.length,
        allowed: 0,
        denied: 0,
        users: new Set(),
        policies: new Set()
    };
    
    accessData.forEach(entry => {
        if (entry.result.allowed) stats.allowed++;
        else stats.denied++;
        stats.users.add(entry.user);
        stats.policies.add(entry.policy);
    });
    
    console.log(`\n📊 Estadisticas (ultimos ${stats.total} accesos):`);
    console.log(`   ✅ Permitidos: ${stats.allowed}`);
    console.log(`   ❌ Denegados: ${stats.denied}`);
    console.log(`   👥 Usuarios unicos: ${stats.users.size}`);
    console.log(`   📋 Politicas usadas: ${Array.from(stats.policies).join(', ')}`);
    console.log(`\n   Tasa de denegacion: ${((stats.denied / stats.total) * 100).toFixed(1)}%`);
    
    // Mostrar eventos recientes
    console.log('\n📝 Eventos recientes:');
    accessData.slice(-5).forEach(entry => {
        console.log(`   ${entry.timestamp} | ${entry.user} | ${entry.result.allowed ? '✅' : '❌'} | ${entry.policy}`);
    });
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🛡️ Zero Trust Access Manager - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'listPolicies':
            listPolicies();
            break;
        case 'enforce':
            if (!userId || !policyName) {
                console.error('❌ Debes especificar --user y --policy');
                process.exit(1);
            }
            enforcePolicy(userId, policyName);
            break;
        case 'verify':
            if (!sessionId) {
                console.error('❌ Debes especificar --session');
                process.exit(1);
            }
            verifySession(sessionId);
            break;
        case 'audit':
            auditAccess();
            break;
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --list-policies, --enforce, --verify, --audit, --init');
            break;
    }
    
    console.log('\n✅ Zero Trust Access Manager completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Zero Trust Access Manager...');
    process.exit(0);
});
