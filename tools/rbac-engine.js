#!/usr/bin/env node

/**
 * RBAC Engine - MFH TOOLS PRO
 * Motor de control de acceso basado en roles (Role-Based Access Control)
 * 
 * Uso: node rbac-engine.js [opciones]
 * Ejemplo: node rbac-engine.js --assign --role admin --user jane
 * Ejemplo: node rbac-engine.js --check --user jane --resource /api/users --action delete
 * Ejemplo: node rbac-engine.js --list-roles
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'rbac_config.json');
const ROLES_DIR = path.join(__dirname, 'rbac_roles');
const LOGS_DIR = path.join(__dirname, 'rbac_logs');

const DEFAULT_ROLES = {
    admin: {
        description: 'Administrador completo del sistema',
        permissions: ['*']
    },
    editor: {
        description: 'Puede editar y ver contenido',
        permissions: ['read', 'write', 'update']
    },
    viewer: {
        description: 'Solo puede ver contenido',
        permissions: ['read']
    },
    auditor: {
        description: 'Puede ver logs y auditorias',
        permissions: ['read', 'audit']
    },
    developer: {
        description: 'Acceso a herramientas de desarrollo',
        permissions: ['read', 'write', 'deploy', 'test']
    }
};

const DEFAULT_RESOURCES = [
    { name: '/api/users', actions: ['read', 'write', 'delete', 'update'] },
    { name: '/api/data', actions: ['read', 'write', 'delete'] },
    { name: '/api/admin', actions: ['read', 'write', 'delete', 'audit'] },
    { name: '/api/logs', actions: ['read', 'audit'] },
    { name: '/api/deploy', actions: ['read', 'write', 'deploy'] },
    { name: '/api/test', actions: ['read', 'write', 'test'] }
];

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let role = null;
let user = null;
let resource = null;
let permission = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--role':
            role = args[i + 1];
            i++;
            break;
        case '--user':
            user = args[i + 1];
            i++;
            break;
        case '--resource':
            resource = args[i + 1];
            i++;
            break;
        case '--action':
            permission = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--assign':
            action = 'assign';
            break;
        case '--remove':
            action = 'remove';
            break;
        case '--check':
            action = 'check';
            break;
        case '--list-roles':
            action = 'listRoles';
            break;
        case '--list-users':
            action = 'listUsers';
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
🔐 RBAC Engine - MFH TOOLS PRO
=============================
Motor de control de acceso basado en roles.

Uso:
  node rbac-engine.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --assign              Asignar rol a usuario
  --remove              Remover rol de usuario
  --check               Verificar permiso
  --list-roles          Listar roles disponibles
  --list-users          Listar usuarios y roles
  --audit               Auditar asignaciones
  --role <nombre>       Nombre del rol
  --user <id>           ID de usuario
  --resource <recurso>  Recurso a verificar
  --action <accion>     Accion a verificar (read, write, delete, etc.)
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node rbac-engine.js --init
  node rbac-engine.js --assign --role admin --user jane
  node rbac-engine.js --check --user jane --resource /api/users --action delete
  node rbac-engine.js --list-roles
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
    return { roles: { ...DEFAULT_ROLES }, resources: DEFAULT_RESOURCES, users: {} };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuracion:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(ROLES_DIR)) {
        fs.mkdirSync(ROLES_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    const config = {
        roles: { ...DEFAULT_ROLES },
        resources: DEFAULT_RESOURCES,
        users: {}
    };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Roles: ${ROLES_DIR}`);
    console.log(`📁 Logs: ${LOGS_DIR}`);
}

function listRoles() {
    const config = loadConfig();
    console.log('\n📋 ROLES DISPONIBLES:');
    console.log('='.repeat(60));
    
    for (const [roleName, roleData] of Object.entries(config.roles)) {
        console.log(`\n📌 ${roleName}`);
        console.log(`   Descripcion: ${roleData.description}`);
        console.log(`   Permisos: ${roleData.permissions.join(', ')}`);
    }
}

function listUsers() {
    const config = loadConfig();
    console.log('\n👥 USUARIOS Y ROLES:');
    console.log('='.repeat(60));
    
    const users = config.users || {};
    if (Object.keys(users).length === 0) {
        console.log('ℹ️ No hay usuarios asignados.');
        return;
    }
    
    for (const [userId, userData] of Object.entries(users)) {
        console.log(`\n📌 ${userId}`);
        console.log(`   Roles: ${userData.roles.join(', ')}`);
        if (userData.permissions) {
            console.log(`   Permisos adicionales: ${userData.permissions.join(', ')}`);
        }
    }
}

function assignRole(user, role) {
    const config = loadConfig();
    
    if (!config.roles[role]) {
        console.error(`❌ Rol no encontrado: ${role}`);
        return;
    }
    
    if (!config.users[user]) {
        config.users[user] = { roles: [], permissions: [] };
    }
    
    if (!config.users[user].roles.includes(role)) {
        config.users[user].roles.push(role);
        saveConfig(config);
        console.log(`✅ Rol "${role}" asignado a usuario "${user}"`);
    } else {
        console.log(`ℹ️ Usuario "${user}" ya tiene el rol "${role}"`);
    }
}

function removeRole(user, role) {
    const config = loadConfig();
    
    if (!config.users[user]) {
        console.error(`❌ Usuario no encontrado: ${user}`);
        return;
    }
    
    const index = config.users[user].roles.indexOf(role);
    if (index !== -1) {
        config.users[user].roles.splice(index, 1);
        if (config.users[user].roles.length === 0) {
            delete config.users[user];
        }
        saveConfig(config);
        console.log(`✅ Rol "${role}" removido de usuario "${user}"`);
    } else {
        console.log(`ℹ️ Usuario "${user}" no tiene el rol "${role}"`);
    }
}

function getUserPermissions(user) {
    const config = loadConfig();
    const userData = config.users[user];
    
    if (!userData) {
        return [];
    }
    
    const permissions = new Set();
    
    // Agregar permisos de roles
    for (const roleName of userData.roles) {
        const role = config.roles[roleName];
        if (role) {
            role.permissions.forEach(p => permissions.add(p));
        }
    }
    
    // Agregar permisos individuales
    if (userData.permissions) {
        userData.permissions.forEach(p => permissions.add(p));
    }
    
    return Array.from(permissions);
}

function checkPermission(user, resource, action) {
    const config = loadConfig();
    
    console.log(`🔍 Verificando permiso para: ${user} -> ${resource} : ${action}`);
    
    const permissions = getUserPermissions(user);
    
    // Verificar si tiene permiso "*" (admin)
    if (permissions.includes('*')) {
        console.log('✅ Permiso CONCEDIDO (admin)');
        return true;
    }
    
    // Verificar permiso especifico
    const hasPermission = permissions.includes(action);
    
    if (hasPermission) {
        console.log(`✅ Permiso CONCEDIDO (${action})`);
    } else {
        console.log(`❌ Permiso DENEGADO (${action})`);
    }
    
    return hasPermission;
}

function auditRBAC() {
    const config = loadConfig();
    console.log('📋 AUDITORIA RBAC');
    console.log('='.repeat(60));
    
    const users = config.users || {};
    const totalUsers = Object.keys(users).length;
    const totalRoles = Object.keys(config.roles).length;
    
    console.log(`\n📊 Estadisticas:`);
    console.log(`   Usuarios: ${totalUsers}`);
    console.log(`   Roles: ${totalRoles}`);
    console.log(`   Recursos: ${config.resources.length}`);
    
    // Verificar asignaciones
    console.log('\n📝 Asignaciones de roles:');
    for (const [userId, userData] of Object.entries(users)) {
        console.log(`   ${userId} → ${userData.roles.join(', ')}`);
    }
    
    // Verificar permisos por rol
    console.log('\n📋 Matriz de permisos:');
    for (const [roleName, roleData] of Object.entries(config.roles)) {
        console.log(`   ${roleName}: ${roleData.permissions.join(', ')}`);
    }
    
    // Generar reporte
    if (outputFile) {
        const report = {
            timestamp: new Date().toISOString(),
            totalUsers,
            totalRoles,
            users: config.users,
            roles: config.roles,
            resources: config.resources
        };
        fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔐 RBAC Engine - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'listRoles':
            listRoles();
            break;
            
        case 'listUsers':
            listUsers();
            break;
            
        case 'assign':
            if (!user || !role) {
                console.error('❌ Debes especificar --user y --role');
                process.exit(1);
            }
            assignRole(user, role);
            break;
            
        case 'remove':
            if (!user || !role) {
                console.error('❌ Debes especificar --user y --role');
                process.exit(1);
            }
            removeRole(user, role);
            break;
            
        case 'check':
            if (!user || !resource || !permission) {
                console.error('❌ Debes especificar --user, --resource y --action');
                process.exit(1);
            }
            checkPermission(user, resource, permission);
            break;
            
        case 'audit':
            auditRBAC();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --assign, --remove, --check, --list-roles, --list-users, --audit, --init');
            break;
    }
    
    console.log('\n✅ RBAC Engine completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo RBAC Engine...');
    process.exit(0);
});
