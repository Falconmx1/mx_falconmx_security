#!/usr/bin/env node

/**
 * Workflow Orchestrator - MFH TOOLS PRO
 * Orquesta flujos de trabajo complejos entre múltiples herramientas
 * 
 * Uso: node workflow-orchestrator.js [opciones]
 * Ejemplo: node workflow-orchestrator.js --workflow workflow.json
 * Ejemplo: node workflow-orchestrator.js --list
 * Ejemplo: node workflow-orchestrator.js --run workflow-123
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const WORKFLOWS_DIR = path.join(__dirname, 'workflows');
const LOG_DIR = path.join(__dirname, 'workflow_logs');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let workflowFile = null;
let workflowId = null;
let params = {};
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--workflow':
        case '-w':
            workflowFile = args[i + 1];
            i++;
            break;
        case '--run':
            action = 'run';
            workflowId = args[i + 1];
            i++;
            break;
        case '--list':
            action = 'list';
            break;
        case '--params':
            try {
                params = JSON.parse(args[i + 1]);
            } catch (error) {
                // Parsear formato key=value,key2=value2
                const pairs = args[i + 1].split(',');
                for (const pair of pairs) {
                    const [key, value] = pair.split('=').map(s => s.trim());
                    if (key && value) {
                        params[key] = value;
                    }
                }
            }
            i++;
            break;
        case '--init':
            action = 'init';
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Workflow Orchestrator - MFH TOOLS PRO
=========================================
Orquesta flujos de trabajo complejos.

Uso:
  node workflow-orchestrator.js [opciones]

Opciones:
  --workflow, -w <archivo>  Archivo de workflow (JSON)
  --run <id>                Ejecutar un workflow existente
  --list                    Listar workflows disponibles
  --params <json>           Parámetros para el workflow
  --init                    Crear workflow de ejemplo
  --verbose, -v             Mostrar más detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node workflow-orchestrator.js --workflow workflow.json
  node workflow-orchestrator.js --run workflow-123
  node workflow-orchestrator.js --list
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadWorkflow(file) {
    try {
        const fullPath = path.isAbsolute(file) ? file : path.join(WORKFLOWS_DIR, file);
        if (!fs.existsSync(fullPath)) {
            console.error(`❌ Workflow no encontrado: ${fullPath}`);
            process.exit(1);
        }
        const content = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error cargando workflow: ${error.message}`);
        process.exit(1);
    }
}

function saveWorkflow(id, workflow) {
    if (!fs.existsSync(WORKFLOWS_DIR)) {
        fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
    }
    const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
}

function logWorkflow(message, type = 'info') {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
    const logFile = path.join(LOG_DIR, `workflow_${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logEntry, 'utf8');
    if (verbose || type === 'error') {
        console.log(message);
    }
}

function generateWorkflowId() {
    return 'wf-' + crypto.randomBytes(8).toString('hex');
}

function executeStep(step, params, context) {
    return new Promise((resolve, reject) => {
        const { action, target, command, timeout = 30000 } = step;
        logWorkflow(`🔹 Ejecutando: ${step.name || action}`, 'info');
        
        const actions = {
            'block_ip': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ success: true, message: `IP ${target} bloqueada` });
                    }, 500);
                });
            },
            'allow_ip': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ success: true, message: `IP ${target} permitida` });
                    }, 500);
                });
            },
            'scan_host': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ success: true, message: `Escaneo completado: ${target}`, data: { ports: [22, 80, 443] } });
                    }, 2000);
                });
            },
            'send_notification': () => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ success: true, message: `Notificación enviada: ${step.channel || 'console'}` });
                    }, 300);
                });
            },
            'api_call': () => {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        if (Math.random() > 0.1) {
                            resolve({ success: true, message: `API call completada: ${step.url}`, data: { status: 200 } });
                        } else {
                            reject(new Error('API call falló'));
                        }
                    }, 1000);
                });
            },
            'script': () => {
                return new Promise((resolve, reject) => {
                    if (!command) {
                        reject(new Error('Comando no especificado'));
                        return;
                    }
                    exec(command, (error, stdout, stderr) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve({ success: true, stdout, stderr });
                        }
                    });
                });
            },
            'wait': () => {
                const delay = step.delay || 1000;
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({ success: true, message: `Espera de ${delay}ms completada` });
                    }, delay);
                });
            }
        };
        
        const actionFn = actions[action];
        if (actionFn) {
            actionFn().then(result => {
                resolve({ ...result, stepName: step.name || action });
            }).catch(reject);
        } else {
            reject(new Error(`Acción desconocida: ${action}`));
        }
    });
}

async function executeWorkflow(workflow, params) {
    const id = generateWorkflowId();
    const startTime = Date.now();
    logWorkflow(`🚀 Iniciando workflow: ${workflow.name || id}`, 'info');
    logWorkflow(`📋 Pasos: ${workflow.steps ? workflow.steps.length : 0}`, 'info');
    
    const results = [];
    const context = { params, results: {} };
    let success = true;
    let failedStep = null;
    
    const steps = workflow.steps || [];
    
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const stepNumber = i + 1;
        
        try {
            logWorkflow(`🔄 Paso ${stepNumber}/${steps.length}: ${step.name || step.action}`, 'info');
            
            // Verificar condición
            if (step.condition) {
                const conditionMet = evaluateCondition(step.condition, context);
                if (!conditionMet) {
                    logWorkflow(`⏭️ Condición no cumplida, saltando paso ${stepNumber}`, 'warning');
                    results.push({
                        step: stepNumber,
                        name: step.name || step.action,
                        status: 'skipped',
                        reason: 'Condition not met'
                    });
                    continue;
                }
            }
            
            const result = await executeStep(step, params, context);
            results.push({
                step: stepNumber,
                name: step.name || step.action,
                status: 'success',
                result
            });
            
            // Guardar resultado en contexto
            if (step.outputKey) {
                context.results[step.outputKey] = result;
            }
            
            logWorkflow(`✅ Paso ${stepNumber} completado`, 'success');
            
        } catch (error) {
            results.push({
                step: stepNumber,
                name: step.name || step.action,
                status: 'failed',
                error: error.message
            });
            logWorkflow(`❌ Paso ${stepNumber} falló: ${error.message}`, 'error');
            
            // Verificar si el paso es crítico
            if (step.critical !== false) {
                success = false;
                failedStep = stepNumber;
                break;
            }
        }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const summary = {
        id,
        workflow: workflow.name || 'unnamed',
        status: success ? 'completed' : 'failed',
        steps: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        duration,
        failedAt: failedStep,
        timestamp: new Date().toISOString()
    };
    
    logWorkflow(`📊 Workflow ${summary.status}: ${summary.successful}/${summary.steps} exitosos (${duration}ms)`, 'info');
    
    // Guardar resultados
    const resultFile = path.join(LOG_DIR, `workflow_${id}_${Date.now()}.json`);
    const output = {
        summary,
        results,
        context
    };
    fs.writeFileSync(resultFile, JSON.stringify(output, null, 2));
    logWorkflow(`💾 Resultados guardados en: ${resultFile}`, 'info');
    
    return { summary, results, context };
}

function evaluateCondition(condition, context) {
    // Evaluar condición simple (ej: "results.scan.ports.length > 0")
    try {
        const result = new Function(`return (${condition})`).call(context);
        return result;
    } catch (error) {
        logWorkflow(`⚠️ Error evaluando condición: ${condition}`, 'warning');
        return false;
    }
}

function listWorkflows() {
    if (!fs.existsSync(WORKFLOWS_DIR)) {
        fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
        console.log('📭 No hay workflows disponibles');
        return;
    }
    
    const files = fs.readdirSync(WORKFLOWS_DIR);
    if (files.length === 0) {
        console.log('📭 No hay workflows disponibles');
        return;
    }
    
    console.log(`\n📋 WORKFLOWS DISPONIBLES (${files.length}):`);
    console.log('='.repeat(60));
    
    for (const file of files) {
        if (file.endsWith('.json')) {
            try {
                const content = fs.readFileSync(path.join(WORKFLOWS_DIR, file), 'utf8');
                const workflow = JSON.parse(content);
                const id = file.replace('.json', '');
                console.log(`\n📌 ${workflow.name || id}`);
                console.log(`   📋 ID: ${id}`);
                console.log(`   📝 ${workflow.description || 'Sin descripción'}`);
                console.log(`   📊 Pasos: ${workflow.steps ? workflow.steps.length : 0}`);
            } catch (error) {
                console.log(`\n❌ ${file}: Error cargando workflow`);
            }
        }
    }
}

function createExampleWorkflow() {
    if (!fs.existsSync(WORKFLOWS_DIR)) {
        fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
    }
    
    const example = {
        name: 'Ejemplo de Workflow',
        description: 'Workflow de ejemplo que ejecuta múltiples acciones',
        steps: [
            {
                name: 'Escaneo de host',
                action: 'scan_host',
                target: '${params.target || "192.168.1.1"}',
                outputKey: 'scan',
                critical: true
            },
            {
                name: 'Bloquear IP maliciosa',
                action: 'block_ip',
                target: '${params.ip || "192.168.1.100"}',
                condition: 'results.scan.ports.length > 0',
                critical: false
            },
            {
                name: 'Notificar resultado',
                action: 'send_notification',
                channel: 'console',
                critical: false
            }
        ]
    };
    
    const filePath = path.join(WORKFLOWS_DIR, 'example.json');
    fs.writeFileSync(filePath, JSON.stringify(example, null, 2));
    console.log(`✅ Workflow de ejemplo creado: ${filePath}`);
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Workflow Orchestrator - MFH TOOLS PRO`);
    console.log('='.split(40).join('='));

    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    switch (action) {
        case 'init':
            createExampleWorkflow();
            break;
        case 'list':
            listWorkflows();
            break;
        case 'run':
            if (!workflowId) {
                console.error('❌ Debes especificar un ID de workflow');
                console.log('   Usa --list para ver los disponibles');
                process.exit(1);
            }
            const workflowFile2 = path.join(WORKFLOWS_DIR, `${workflowId}.json`);
            if (!fs.existsSync(workflowFile2)) {
                console.error(`❌ Workflow no encontrado: ${workflowId}`);
                process.exit(1);
            }
            const workflow = loadWorkflow(workflowFile2);
            await executeWorkflow(workflow, params);
            break;
        default:
            if (workflowFile) {
                const wf = loadWorkflow(workflowFile);
                await executeWorkflow(wf, params);
            } else {
                console.log('ℹ️ Sin acción especificada. Usa --help para ver opciones.');
                console.log('💡 Opciones: --workflow, --run, --list, --init');
            }
            break;
    }

    console.log('\n✅ Workflow Orchestrator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Workflow Orchestrator detenido');
    process.exit(0);
});
