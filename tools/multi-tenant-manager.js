#!/usr/bin/env node

/**
 * Multi-Tenant Manager - MFH TOOLS PRO
 * Gestiona múltiples clientes/entornos de forma aislada
 * 
 * Uso: node multi-tenant-manager.js [opciones]
 * Ejemplo: node multi-tenant-manager.js --create --name "Cliente A" --domain cliente-a.com
 * Ejemplo: node multi-tenant-manager.js --list
 * Ejemplo: node multi-tenant-manager.js --tenant tenant-001 --config-get
 * Ejemplo: node multi-tenant-manager.js --tenant tenant-001 --config-set '{"key":"value"}'
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACIÓN ====================
const TENANTS_DIR = path.join(__dirname, 'tenants');
const CONFIG_FILE = path.join(__dirname, 'tenants_config.json');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let tenantId = null;
let name = null;
let domain = null;
let configData = null;
let verbose = false;
let init = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--create':
            action = 'create';
            break;
        case '--list':
            action = 'list';
            break;
        case '--delete':
            action = 'delete';
            tenantId = args[i + 1];
            i++;
            break;
        case '--tenant':
            tenantId = args[i + 1];
            i++;
            break;
        case '--config-get':
            action = 'config-get';
            break;
        case '--config-set':
            action = 'config-set';
            try {
                configData = JSON.parse(args[i + 1]);
            } catch (error) {
                // Parsear formato key=value,key2=value2
                const pairs = args[i + 1].split(',');
                configData = {};
                for (const pair of pairs) {
                    const [key, value] = pair.split('=').map(s => s.trim());
                    if (key && value) {
                        configData[key] = value;
                    }
                }
            }
            i++;
            break;
        case '--stats':
            action = 'stats';
            break;
        case '--name':
            name = args[i + 1];
            i++;
            break;
        case '--domain':
            domain = args[i + 1];
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
🔍 Multi-Tenant Manager - MFH TOOLS PRO
========================================
Gestiona múltiples clientes/entornos de forma aislada.

Uso:
  node multi-tenant-manager.js [opciones]

Opciones:
  --init                   Inicializar sistema multi-tenant
  --create                 Crear un nuevo tenant
  --list                   Listar todos los tenants
  --delete <id>            Eliminar un tenant
  --tenant <id>            Seleccionar tenant para operaciones
  --config-get             Ver configuración del tenant seleccionado
  --config-set <json>      Establecer configuración del tenant
  --stats                  Ver estadísticas generales
  --name <nombre>          Nombre del tenant (con --create)
  --domain <dominio>       Dominio del tenant (con --create)
  --verbose, -v            Mostrar más detalles
  --help, -h               Mostrar esta ayuda

Ejemplos:
  node multi-tenant-manager.js --init
  node multi-tenant-manager.js --create --name "Cliente A" --domain cliente-a.com
  node multi-tenant-manager.js --list
  node multi-tenant-manager.js --tenant tenant-001 --config-get
  node multi-tenant-manager.js --tenant tenant-001 --config-set '{"maxScans":100,"notifyEmail":"admin@cliente.com"}'
  node multi-tenant-manager.js --stats
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
    return { tenants: [], lastId: 0, stats: { totalTenants: 0, totalScans: 0, totalAlerts: 0 } };
}

function saveConfig(data) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuración:', error.message);
    }
}

function generateTenantId() {
    const config = loadConfig();
    config.lastId = (config.lastId || 0) + 1;
    saveConfig(config);
    return `tenant-${String(config.lastId).padStart(3, '0')}`;
}

function createTenantDirectory(id) {
    const tenantDir = path.join(TENANTS_DIR, id);
    if (!fs.existsSync(tenantDir)) {
        fs.mkdirSync(tenantDir, { recursive: true });
        fs.mkdirSync(path.join(tenantDir, 'data'), { recursive: true });
        fs.mkdirSync(path.join(tenantDir, 'logs'), { recursive: true });
        fs.mkdirSync(path.join(tenantDir, 'reports'), { recursive: true });
        fs.mkdirSync(path.join(tenantDir, 'config'), { recursive: true });
    }
    return tenantDir;
}

function initSystem() {
    if (!fs.existsSync(TENANTS_DIR)) {
        fs.mkdirSync(TENANTS_DIR, { recursive: true });
    }
    
    const config = loadConfig();
    if (config.tenants.length === 0) {
        // Crear tenant por defecto
        const defaultTenant = {
            id: 'tenant-001',
            name: 'Default',
            domain: 'localhost',
            createdAt: new Date().toISOString(),
            status: 'active',
            config: {
                maxScans: 100,
                maxAlerts: 1000,
                notifyEmail: 'admin@localhost',
                retentionDays: 30
            },
            stats: {
                scans: 0,
                alerts: 0,
                reports: 0,
                lastActivity: null
            }
        };
        config.tenants.push(defaultTenant);
        config.lastId = 1;
        config.stats = { totalTenants: 1, totalScans: 0, totalAlerts: 0 };
        saveConfig(config);
        
        // Crear directorio del tenant
        createTenantDirectory(defaultTenant.id);
        
        // Crear archivo de configuración del tenant
        const tenantDir = path.join(TENANTS_DIR, defaultTenant.id);
        const tenantConfigPath = path.join(tenantDir, 'config', 'tenant.json');
        fs.writeFileSync(tenantConfigPath, JSON.stringify(defaultTenant, null, 2));
        
        console.log(`✅ Sistema multi-tenant inicializado`);
        console.log(`📋 Tenant por defecto creado: ${defaultTenant.id}`);
        console.log(`📁 Directorio: ${tenantDir}`);
    } else {
        console.log(`ℹ️ Sistema ya inicializado con ${config.tenants.length} tenants`);
    }
}

function createTenant(name, domain) {
    const id = generateTenantId();
    const config = loadConfig();
    
    const tenant = {
        id,
        name: name || `Tenant ${id}`,
        domain: domain || null,
        createdAt: new Date().toISOString(),
        status: 'active',
        config: {
            maxScans: 100,
            maxAlerts: 1000,
            notifyEmail: `admin@${domain || 'localhost'}`,
            retentionDays: 30
        },
        stats: {
            scans: 0,
            alerts: 0,
            reports: 0,
            lastActivity: null
        }
    };

    config.tenants.push(tenant);
    config.stats.totalTenants = config.tenants.length;
    saveConfig(config);

    // Crear directorio
    const tenantDir = createTenantDirectory(id);
    
    // Crear archivo de configuración del tenant
    const tenantConfigPath = path.join(tenantDir, 'config', 'tenant.json');
    fs.writeFileSync(tenantConfigPath, JSON.stringify(tenant, null, 2));

    console.log(`✅ Tenant creado: ${id}`);
    console.log(`📋 Nombre: ${tenant.name}`);
    console.log(`📋 Dominio: ${tenant.domain || 'N/A'}`);
    console.log(`📁 Directorio: ${tenantDir}`);

    return tenant;
}

function listTenants() {
    const config = loadConfig();
    if (config.tenants.length === 0) {
        console.log('📭 No hay tenants creados');
        console.log('   Ejecuta --init para inicializar el sistema');
        return;
    }

    console.log(`\n📋 TENANTS (${config.tenants.length}):`);
    console.log('='.repeat(70));

    for (const tenant of config.tenants) {
        const statusIcon = tenant.status === 'active' ? '🟢' : '🔴';
        console.log(`\n${statusIcon} ${tenant.id} - ${tenant.name}`);
        console.log(`   🌐 Dominio: ${tenant.domain || 'N/A'}`);
        console.log(`   📅 Creado: ${new Date(tenant.createdAt).toLocaleString()}`);
        console.log(`   📊 Escaneos: ${tenant.stats?.scans || 0}`);
        console.log(`   📊 Alertas: ${tenant.stats?.alerts || 0}`);
        console.log(`   📊 Reportes: ${tenant.stats?.reports || 0}`);
        if (tenant.stats?.lastActivity) {
            console.log(`   ⏱️ Última actividad: ${new Date(tenant.stats.lastActivity).toLocaleString()}`);
        }
        console.log(`   📁 Directorio: ${path.join(TENANTS_DIR, tenant.id)}`);
    }
}

function getTenant(id) {
    const config = loadConfig();
    const tenant = config.tenants.find(t => t.id === id);
    if (!tenant) {
        console.error(`❌ Tenant no encontrado: ${id}`);
        console.log('   Usa --list para ver los tenants disponibles');
        process.exit(1);
    }
    return tenant;
}

function showTenantConfig(id) {
    const tenant = getTenant(id);
    
    console.log(`\n📋 CONFIGURACIÓN DE TENANT: ${id}`);
    console.log('='.repeat(60));
    console.log(`📌 Nombre: ${tenant.name}`);
    console.log(`🌐 Dominio: ${tenant.domain || 'N/A'}`);
    console.log(`📊 Estado: ${tenant.status}`);
    console.log(`📅 Creado: ${new Date(tenant.createdAt).toLocaleString()}`);
    console.log(`\n⚙️ CONFIGURACIÓN:`);
    console.log(JSON.stringify(tenant.config, null, 2));
    
    // Mostrar archivos del tenant
    const tenantDir = path.join(TENANTS_DIR, id);
    if (fs.existsSync(tenantDir)) {
        console.log(`\n📁 DIRECTORIO DEL TENANT:`);
        console.log(`   ${tenantDir}`);
        const subdirs = ['data', 'logs', 'reports', 'config'];
        for (const subdir of subdirs) {
            const subPath = path.join(tenantDir, subdir);
            if (fs.existsSync(subPath)) {
                const files = fs.readdirSync(subPath);
                console.log(`   📂 ${subdir}: ${files.length} archivos`);
                if (subdir === 'config' && files.length > 0) {
                    const configFiles = files.filter(f => f.endsWith('.json'));
                    for (const cf of configFiles) {
                        console.log(`      📄 ${cf}`);
                    }
                }
            }
        }
    }
}

function updateTenantConfig(id, updates) {
    const config = loadConfig();
    const tenant = config.tenants.find(t => t.id === id);
    if (!tenant) {
        console.error(`❌ Tenant no encontrado: ${id}`);
        process.exit(1);
    }

    // Actualizar configuración
    tenant.config = { ...tenant.config, ...updates };
    tenant.updatedAt = new Date().toISOString();
    
    saveConfig(config);

    // Actualizar archivo de configuración del tenant
    const tenantDir = path.join(TENANTS_DIR, id);
    const tenantConfigPath = path.join(tenantDir, 'config', 'tenant.json');
    if (fs.existsSync(tenantConfigPath)) {
        const configData = JSON.parse(fs.readFileSync(tenantConfigPath, 'utf8'));
        configData.config = tenant.config;
        configData.updatedAt = tenant.updatedAt;
        fs.writeFileSync(tenantConfigPath, JSON.stringify(configData, null, 2));
    }

    console.log(`✅ Configuración del tenant actualizada: ${id}`);
    console.log(`📋 Nuevos valores:`, JSON.stringify(updates, null, 2));
    return tenant;
}

function deleteTenant(id) {
    const config = loadConfig();
    const initialLength = config.tenants.length;
    config.tenants = config.tenants.filter(t => t.id !== id);
    
    if (config.tenants.length === initialLength) {
        console.error(`❌ Tenant no encontrado: ${id}`);
        process.exit(1);
    }

    config.stats.totalTenants = config.tenants.length;
    saveConfig(config);

    // Opcional: eliminar directorio (comentado por seguridad)
    // const tenantDir = path.join(TENANTS_DIR, id);
    // if (fs.existsSync(tenantDir)) {
    //     fs.rmSync(tenantDir, { recursive: true });
    // }

    console.log(`✅ Tenant eliminado: ${id}`);
}

function updateTenantStats(id, statsUpdate) {
    const config = loadConfig();
    const tenant = config.tenants.find(t => t.id === id);
    if (tenant) {
        tenant.stats = tenant.stats || {};
        if (statsUpdate.scans) tenant.stats.scans = (tenant.stats.scans || 0) + statsUpdate.scans;
        if (statsUpdate.alerts) tenant.stats.alerts = (tenant.stats.alerts || 0) + statsUpdate.alerts;
        if (statsUpdate.reports) tenant.stats.reports = (tenant.stats.reports || 0) + statsUpdate.reports;
        tenant.stats.lastActivity = new Date().toISOString();
        saveConfig(config);
        
        // Actualizar estadísticas globales
        config.stats.totalScans = config.tenants.reduce((sum, t) => sum + (t.stats?.scans || 0), 0);
        config.stats.totalAlerts = config.tenants.reduce((sum, t) => sum + (t.stats?.alerts || 0), 0);
        saveConfig(config);
    }
}

function showStats() {
    const config = loadConfig();
    const tenants = config.tenants;
    
    if (tenants.length === 0) {
        console.log('📭 No hay tenants para mostrar estadísticas');
        return;
    }

    console.log(`\n📊 ESTADÍSTICAS GLOBALES`);
    console.log('='.repeat(60));
    console.log(`📋 Total tenants: ${tenants.length}`);
    console.log(`📊 Total escaneos: ${config.stats?.totalScans || 0}`);
    console.log(`📊 Total alertas: ${config.stats?.totalAlerts || 0}`);
    
    console.log(`\n📊 POR TENANT:`);
    console.log('='.repeat(60));
    
    for (const tenant of tenants) {
        const statusIcon = tenant.status === 'active' ? '🟢' : '🔴';
        console.log(`\n${statusIcon} ${tenant.id}: ${tenant.name}`);
        console.log(`   📊 Escaneos: ${tenant.stats?.scans || 0}`);
        console.log(`   📊 Alertas: ${tenant.stats?.alerts || 0}`);
        console.log(`   📊 Reportes: ${tenant.stats?.reports || 0}`);
        if (tenant.stats?.lastActivity) {
            console.log(`   ⏱️ Última actividad: ${new Date(tenant.stats.lastActivity).toLocaleString()}`);
        }
        console.log(`   📅 Creado: ${new Date(tenant.createdAt).toLocaleString()}`);
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Multi-Tenant Manager - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    if (init) {
        initSystem();
        process.exit(0);
    }

    if (!fs.existsSync(TENANTS_DIR)) {
        console.log('ℹ️ Sistema no inicializado. Ejecuta --init para crear el tenant por defecto.');
        process.exit(0);
    }

    switch (action) {
        case 'create':
            createTenant(name, domain);
            break;
            
        case 'list':
            listTenants();
            break;
            
        case 'config-get':
            if (!tenantId) {
                console.error('❌ Debes especificar un ID de tenant con --tenant');
                console.log('   Ejemplo: --tenant tenant-001 --config-get');
                process.exit(1);
            }
            showTenantConfig(tenantId);
            break;
            
        case 'config-set':
            if (!tenantId) {
                console.error('❌ Debes especificar un ID de tenant con --tenant');
                console.log('   Ejemplo: --tenant tenant-001 --config-set \'{"key":"value"}\'');
                process.exit(1);
            }
            if (!configData) {
                console.error('❌ Debes especificar los datos de configuración');
                process.exit(1);
            }
            updateTenantConfig(tenantId, configData);
            break;
            
        case 'delete':
            if (!tenantId) {
                console.error('❌ Debes especificar un ID de tenant');
                process.exit(1);
            }
            deleteTenant(tenantId);
            break;
            
        case 'stats':
            showStats();
            break;
            
        default:
            console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --init, --create, --list, --config-get, --config-set, --stats, --delete');
            console.log('💡 Ejemplo: --tenant tenant-001 --config-get');
            break;
    }

    console.log('\n✅ Multi-Tenant Manager completado');
})();
