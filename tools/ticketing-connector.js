#!/usr/bin/env node

/**
 * Ticketing System Connector - MFH TOOLS PRO
 * Conecta con sistemas de tickets (Jira, ServiceNow, Zendesk)
 * 
 * Uso: node ticketing-connector.js [opciones]
 * Ejemplo: node ticketing-connector.js --create --title "Vulnerabilidad encontrada" --priority high
 * Ejemplo: node ticketing-connector.js --update TICKET-123 --status "In Progress"
 * Ejemplo: node ticketing-connector.js --list
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ==================== CONFIGURACIÓN ====================
const CONFIG_FILE = path.join(__dirname, 'ticketing_config.json');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let ticketId = null;
let title = null;
let description = null;
let priority = 'medium';
let status = null;
let assignee = null;
let labels = [];
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--create':
            action = 'create';
            break;
        case '--update':
            action = 'update';
            ticketId = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--get':
            action = 'get';
            ticketId = args[i + 1];
            i++;
            break;
        case '--title':
            title = args[i + 1];
            i++;
            break;
        case '--description':
            description = args[i + 1];
            i++;
            break;
        case '--priority':
            priority = args[i + 1];
            i++;
            break;
        case '--status':
            status = args[i + 1];
            i++;
            break;
        case '--assignee':
            assignee = args[i + 1];
            i++;
            break;
        case '--labels':
            labels = args[i + 1].split(',');
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Ticketing System Connector - MFH TOOLS PRO
===============================================
Conecta con sistemas de tickets.

Uso:
  node ticketing-connector.js [opciones]

Opciones:
  --create                Crear un nuevo ticket
  --update <id>           Actualizar un ticket
  --list                  Listar tickets
  --get <id>              Obtener detalles de un ticket
  --title <título>        Título del ticket
  --description <texto>   Descripción del ticket
  --priority <nivel>      Prioridad (critical, high, medium, low)
  --status <estado>       Estado (new, in_progress, resolved, closed)
  --assignee <usuario>    Usuario asignado
  --labels <lista>        Etiquetas (separadas por coma)
  --verbose, -v           Mostrar más detalles
  --help, -h              Mostrar esta ayuda

Ejemplos:
  node ticketing-connector.js --create --title "Vulnerabilidad encontrada" --priority high
  node ticketing-connector.js --update TICKET-123 --status "In Progress"
  node ticketing-connector.js --list
`);
            process.exit(0);
    }
}

// ==================== CONFIGURACIÓN POR DEFECTO ====================
const DEFAULT_CONFIG = {
    provider: 'jira',
    host: 'your-domain.atlassian.net',
    email: '',
    token: '',
    project: 'MFH',
    issueType: 'Task',
    priorityMapping: {
        critical: 'Highest',
        high: 'High',
        medium: 'Medium',
        low: 'Low'
    },
    statusMapping: {
        new: 'To Do',
        in_progress: 'In Progress',
        resolved: 'Done',
        closed: 'Closed'
    }
};

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const content = fs.readFileSync(CONFIG_FILE, 'utf8');
            return JSON.parse(content);
        }
        return DEFAULT_CONFIG;
    } catch (error) {
        console.error(`❌ Error cargando configuración: ${error.message}`);
        return DEFAULT_CONFIG;
    }
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`✅ Configuración guardada en: ${CONFIG_FILE}`);
    } catch (error) {
        console.error(`❌ Error guardando configuración: ${error.message}`);
    }
}

function makeJiraRequest(endpoint, method, data) {
    return new Promise((resolve, reject) => {
        const config = loadConfig();
        const auth = Buffer.from(`${config.email}:${config.token}`).toString('base64');
        
        const options = {
            hostname: config.host,
            path: `/rest/api/3/${endpoint}`,
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(response));
                    } catch (error) {
                        resolve({ raw: response });
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${response}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function makeServiceNowRequest(endpoint, method, data) {
    return new Promise((resolve, reject) => {
        const config = loadConfig();
        const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
        
        const options = {
            hostname: config.host,
            path: `/api/now/${endpoint}`,
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(response));
                    } catch (error) {
                        resolve({ raw: response });
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${response}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

function makeZendeskRequest(endpoint, method, data) {
    return new Promise((resolve, reject) => {
        const config = loadConfig();
        const auth = Buffer.from(`${config.email}/token:${config.token}`).toString('base64');
        
        const options = {
            hostname: config.host,
            path: `/api/v2/${endpoint}`,
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let response = '';
            res.on('data', (chunk) => { response += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(response));
                    } catch (error) {
                        resolve({ raw: response });
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${response}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function createTicket(title, description, priority, assignee, labels) {
    const config = loadConfig();
    const provider = config.provider.toLowerCase();
    
    console.log(`📌 Creando ticket en ${provider}: ${title}`);
    
    const data = {
        summary: title,
        description: description || 'Creado automáticamente por MFH TOOLS PRO',
        priority: config.priorityMapping[priority] || priority,
        labels: labels || []
    };

    if (assignee) {
        data.assignee = { name: assignee };
    }

    try {
        let result;
        switch (provider) {
            case 'jira':
                result = await makeJiraRequest('issue', 'POST', {
                    fields: {
                        project: { key: config.project },
                        summary: data.summary,
                        description: data.description,
                        priority: { name: data.priority },
                        issuetype: { name: config.issueType },
                        labels: data.labels,
                        assignee: data.assignee ? { name: data.assignee } : undefined
                    }
                });
                break;
            case 'servicenow':
                result = await makeServiceNowRequest('table/incident', 'POST', {
                    short_description: data.summary,
                    description: data.description,
                    priority: priority === 'critical' ? 1 : priority === 'high' ? 2 : priority === 'medium' ? 3 : 4,
                    assignment_group: assignee || '',
                    category: 'Security'
                });
                break;
            case 'zendesk':
                result = await makeZendeskRequest('tickets', 'POST', {
                    ticket: {
                        subject: data.summary,
                        comment: { body: data.description },
                        priority: priority,
                        tags: data.labels,
                        assignee_id: assignee || null
                    }
                });
                break;
            default:
                throw new Error(`Proveedor no soportado: ${provider}`);
        }
        
        console.log(`✅ Ticket creado exitosamente`);
        console.log(`📋 Detalles:`, JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error(`❌ Error creando ticket: ${error.message}`);
        throw error;
    }
}

async function updateTicket(ticketId, updates) {
    const config = loadConfig();
    const provider = config.provider.toLowerCase();
    
    console.log(`📌 Actualizando ticket ${ticketId} en ${provider}`);
    
    try {
        let result;
        switch (provider) {
            case 'jira':
                const jiraUpdates = {};
                if (updates.status) {
                    jiraUpdates.status = { name: updates.status };
                }
                if (updates.assignee) {
                    jiraUpdates.assignee = { name: updates.assignee };
                }
                if (updates.priority) {
                    jiraUpdates.priority = { name: config.priorityMapping[updates.priority] || updates.priority };
                }
                result = await makeJiraRequest(`issue/${ticketId}`, 'PUT', { fields: jiraUpdates });
                break;
            case 'servicenow':
                const snUpdates = {};
                if (updates.status) snUpdates.state = updates.status === 'resolved' ? 6 : updates.status === 'closed' ? 7 : 1;
                if (updates.priority) snUpdates.priority = updates.priority === 'critical' ? 1 : updates.priority === 'high' ? 2 : 3;
                if (updates.assignee) snUpdates.assignment_group = updates.assignee;
                result = await makeServiceNowRequest(`table/incident/${ticketId}`, 'PUT', snUpdates);
                break;
            case 'zendesk':
                const zdUpdates = {};
                if (updates.status) zdUpdates.status = updates.status;
                if (updates.priority) zdUpdates.priority = updates.priority;
                if (updates.assignee) zdUpdates.assignee_id = updates.assignee;
                result = await makeZendeskRequest(`tickets/${ticketId}`, 'PUT', { ticket: zdUpdates });
                break;
            default:
                throw new Error(`Proveedor no soportado: ${provider}`);
        }
        
        console.log(`✅ Ticket ${ticketId} actualizado`);
        return result;
    } catch (error) {
        console.error(`❌ Error actualizando ticket: ${error.message}`);
        throw error;
    }
}

async function listTickets() {
    const config = loadConfig();
    const provider = config.provider.toLowerCase();
    
    console.log(`📋 Listando tickets en ${provider}`);
    
    try {
        let result;
        switch (provider) {
            case 'jira':
                result = await makeJiraRequest(`search?jql=project=${config.project}&maxResults=10`, 'GET');
                break;
            case 'servicenow':
                result = await makeServiceNowRequest(`table/incident?sysparm_limit=10`, 'GET');
                break;
            case 'zendesk':
                result = await makeZendeskRequest(`tickets?per_page=10`, 'GET');
                break;
            default:
                throw new Error(`Proveedor no soportado: ${provider}`);
        }
        
        console.log('📋 Tickets encontrados:');
        console.log(JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error(`❌ Error listando tickets: ${error.message}`);
        throw error;
    }
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Ticketing System Connector - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    // Verificar configuración
    const config = loadConfig();
    if (!config.host || config.host === 'your-domain.atlassian.net') {
        console.log('⚠️ Configuración no completada. Creando configuración por defecto...');
        saveConfig(DEFAULT_CONFIG);
        console.log('📝 Edita el archivo de configuración con tus credenciales:');
        console.log(`   ${CONFIG_FILE}`);
        console.log('📌 Luego ejecuta de nuevo el comando.');
        process.exit(0);
    }

    try {
        switch (action) {
            case 'create':
                if (!title) {
                    console.error('❌ Debes especificar --title');
                    process.exit(1);
                }
                await createTicket(title, description, priority, assignee, labels);
                break;
            case 'update':
                if (!ticketId) {
                    console.error('❌ Debes especificar un ID de ticket');
                    process.exit(1);
                }
                const updates = {};
                if (status) updates.status = status;
                if (assignee) updates.assignee = assignee;
                if (priority) updates.priority = priority;
                await updateTicket(ticketId, updates);
                break;
            case 'list':
                await listTickets();
                break;
            default:
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
                console.log('💡 Opciones: --create, --update, --list, --get');
                break;
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }

    console.log('\n✅ Ticketing Connector completado');
})();
