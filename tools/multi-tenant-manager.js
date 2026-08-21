#!/usr/bin/env node

/**
 * Multi-Tenant Manager - MFH TOOLS PRO
 * Gestiona múltiples clientes/entornos de forma aislada
 * 
 * Uso: node multi-tenant-manager.js [opciones]
 * Ejemplo: node multi-tenant-manager.js --create --name "Cliente A" --domain cliente-a.com
 * Ejemplo: node multi-tenant-manager.js --list
 * Ejemplo: node multi-tenant-manager.js --tenant tenant-123 --config
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
let config = null;
let verbose = false;

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
        case '--config':
            action = 'config';
            tenantId = args[i + 1];
            i++;
            break;
        case '--tenant':
            tenantId = args[i + 1];
            i++;
            break;
        case '--name':
            name = args[i + 1];
            i++;
            break;
        case '--domain':
            domain = args[i + 1];
            i++;
            break;
        case '--set':
            try {
                config = JSON.parse(args[i + 1]);
            } catch (error) {
                // Parsear formato key=value,key2=value2
                const pairs = args[i + 1].split(',');
                config = {};
                for (const pair of pairs) {
                    const [key, value] = pair.split('=').map(s => s.trim());
                    if (key && value) {
                        config[key] = value;
                    }
                }
            }
            i++;
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
  --create                Crear un nuevo tenant
  --list                  Listar todos los tenants
  --delete <id>           Eliminar un tenant
  --config <id>           Ver configuración de un tenant
  --tenant <id>           Seleccionar tenant para operaciones
  --name <nombre>         Nombre del tenant
  --domain <dominio>      Dominio del tenant
  --set <json>            Establecer configuración
  --verbose, -v           Mostrar más detalles
  --help, -h              Mostrar esta ayuda

Ejemplos:
  node multi-tenant-manager.js --create --name "Cliente A" --domain cliente-a.com
  node multi-tenant-manager.js --list
  node multi-tenant-manager.js --tenant tenant-123 --config
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
    return { tenants: [], lastId: 0 };
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
    }
    return tenantDir;
}

function createTenant(name, domain, configData) {
    const id = generateTenantId();
    const tenant = {
        id,
        name: name || `Tenant ${id}`,
        domain: domain || null,
        createdAt: new Date().toISOString(),
        status: 'active',
        config: configData || {},
        stats: {
            scans: 0,
            alerts: 0,
            reports: 0,
            lastActivity: null
        }
    };

    const config = loadConfig();
    config.tenants.push(tenant);
    saveConfig(config);

    // Crear directorio
    const tenantDir = createTenantDirectory(id);
    
    // Crear archivo de configuración del tenant
    const tenantConfig = {
        id,
        name: tenant.name,
        domain: tenant.domain,
        createdAt: tenant.createdAt,
        settings: tenant.config
    };
    fs.writeFileSync(path.join(tenantDir, 'tenant.json'), JSON.stringify(tenantConfig, null, 2));

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
        return;
    }

    console.log(`\n📋 TENANTS (${config.tenants.length}):`);
    console.log('='.split(60).join('='));

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
    }
}

function getTenant(id) {
    const config = loadConfig();
    const tenant = config.tenants.find(t => t.id === id);
    if (!tenant) {
        console.error(`❌ Tenant no encontrado: ${id}`);
        process.exit(1);
    }
    return tenant;
}

function showTenantConfig(id) {
    const tenant = getTenant(id);
    const tenantDir = path.join(TENANTS_DIR, id);
    const tenantConfigPath = path.join(tenantDir, 'tenant.json');
    
    console.log(`\n📋 CONFIGURACIÓN DE TENANT: ${id}`);
    console.log('='.split(60).join('='));
    console.log(`📌 Nombre: ${tenant.name}`);
    console.log(`🌐 Dominio: ${tenant.domain || 'N/A'}`);
    console.log(`📅 Creado: ${new Date(tenant.createdAt).toLocaleString()}`);
    console.log(`📊 Estado: ${tenant.status}`);
    
    if (fs.existsSync(tenantConfigPath)) {
        const configData = JSON.parse(fs.readFileSync(tenantConfigPath, 'utf8'));
        console.log(`\n📋 CONFIGURACIÓN DETALLADA:`);
        console.log(JSON.stringify(configData, null, 2));
    }
    
    // Mostrar archivos del tenant
    const tenantDir2 = path.join(TENANTS_DIR, id);
    if (fs.existsSync(tenantDir2)) {
        console.log(`\n📁 DIRECTORIO DEL TENANT:`);
        console.log(`   ${tenantDir2}`);
        const subdirs = ['data', 'logs', 'reports'];
        for (const subdir of subdirs) {
            const subPath = path.join(tenantDir2, subdir);
            if (fs.existsSync(subPath)) {
                const files = fs.readdirSync(subPath);
                console.log(`   📂 ${subdir}: ${files.length} archivos`);
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
    if (updates.name) tenant.name = updates.name;
    if (updates.domain) tenant.domain = updates.domain;
    if (updates.status) tenant.status = updates.status;
    if (updates.config) {
        tenant.config = { ...tenant.config, ...updates.config };
    }

    saveConfig(config);

    // Actualizar archivo de configuración del tenant
    const tenantDir = path.join(TENANTS_DIR, id);
    const tenantConfigPath = path.join(tenantDir, 'tenant.json');
    if (fs.existsSync(tenantConfigPath)) {
        const configData = JSON.parse(fs.readFileSync(tenantConfigPath, 'utf8'));
        configData.settings = tenant.config;
        fs.writeFileSync(tenantConfigPath, JSON.stringify(configData, null, 2));
    }

    console.log(`✅ Tenant actualizado: ${id}`);
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

    saveConfig(config);

    // Opcional: eliminar directorio (comentado por seguridad)
    // const tenantDir = path.join(TENANTS_DIR, id);
    // if (fs.existsSync(tenantDir)) {
    //     fs.rmSync(tenantDir, { recursive: true });
    // }

    console.log(`✅ Tenant eliminado: ${id}`);
}

function updateTenantStats(id, stats) {
    const config = loadConfig();
    const tenant = config.tenants.find(t => t.id === id);
    if (tenant) {
        tenant.stats = tenant.stats || {};
        if (stats.scans) tenant.stats.scans = (tenant.stats.scans || 0) + stats.scans;
        if (stats.alerts) tenant.stats.alerts = (tenant.stats.alerts || 0) + stats.alerts;
        if (stats.reports) tenant.stats.reports = (tenant.stats.reports || 0) + stats.reports;
        tenant.stats.lastActivity = new Date().toISOString();
        saveConfig(config);
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Multi-Tenant Manager - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (!fs.existsSync(TENANTS_DIR)) {
        fs.mkdirSync(TENANTS_DIR, { recursive: true });
    }

    switch (action) {
        case 'create':
            createTenant(name, domain, config);
            break;
        case 'list':
            listTenants();
            break;
        case 'config':
            if (!tenantId) {
                console.error('❌ Debes especificar un ID de tenant');
                process.exit(1);
            }
            showTenantConfig(tenantId);
            break;
        case 'delete':
            if (!tenantId) {
                console.error('❌ Debes especificar un ID de tenant');
                process.exit(1);
            }
            deleteTenant(tenantId);
            break;
        default:
            if (tenantId && config) {
                updateTenantConfig(tenantId, { config });
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
            }
            break;
    }

    console.log('\n✅ Multi-Tenant Manager completado');
})();
