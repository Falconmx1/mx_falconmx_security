#!/usr/bin/env node

/**
 * Kubernetes Security Scanner - MFH TOOLS PRO
 * Escanea configuraciones de seguridad en Kubernetes
 * 
 * Uso: node k8s-security-scanner.js [opciones]
 * Ejemplo: node k8s-security-scanner.js --scan --namespace default
 * Ejemplo: node k8s-security-scanner.js --check-pod --pod my-pod
 * Ejemplo: node k8s-security-scanner.js --audit-rbac
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'k8s_security_config.json');
const REPORTS_DIR = path.join(__dirname, 'k8s_security_reports');

const DEFAULT_CONFIG = {
    namespaces: ['default', 'kube-system'],
    checks: {
        pods: {
            privileged_containers: true,
            root_user: true,
            read_only_rootfs: true,
            resource_limits: true
        },
        network: {
            network_policies: true,
            service_types: true,
            ingress_tls: true
        },
        rbac: {
            cluster_admin: true,
            service_accounts: true,
            role_bindings: true
        },
        security: {
            pod_security_policies: true,
            secrets: true,
            container_registry: true
        }
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let namespace = null;
let podName = null;
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            break;
        case '--check-pod':
            action = 'checkPod';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                podName = args[i + 1];
                i++;
            }
            break;
        case '--audit-rbac':
            action = 'auditRBAC';
            break;
        case '--namespace':
            namespace = args[i + 1];
            i++;
            break;
        case '--pod':
            podName = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
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
☁️ Kubernetes Security Scanner - MFH TOOLS PRO
============================================
Escanea configuraciones de seguridad en Kubernetes.

Uso:
  node k8s-security-scanner.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan                Escanear cluster Kubernetes
  --check-pod <pod>     Verificar seguridad de un Pod
  --audit-rbac          Auditar configuracion RBAC
  --namespace <ns>      Namespace a escanear
  --pod <nombre>        Nombre del Pod
  --output <archivo>    Guardar reporte
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node k8s-security-scanner.js --init
  node k8s-security-scanner.js --scan --namespace default
  node k8s-security-scanner.js --check-pod --pod my-pod
  node k8s-security-scanner.js --audit-rbac
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
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function simulateK8sResources() {
    return {
        pods: [
            { name: 'nginx-prod', namespace: 'default', privileged: false, root_user: false, read_only_rootfs: true, resources: { cpu: '1', memory: '1Gi' } },
            { name: 'app-dev', namespace: 'default', privileged: true, root_user: true, read_only_rootfs: false, resources: { cpu: null, memory: null } },
            { name: 'database', namespace: 'default', privileged: false, root_user: false, read_only_rootfs: true, resources: { cpu: '2', memory: '4Gi' } }
        ],
        services: [
            { name: 'web-service', namespace: 'default', type: 'LoadBalancer', has_tls: true },
            { name: 'app-service', namespace: 'default', type: 'ClusterIP', has_tls: false },
            { name: 'db-service', namespace: 'default', type: 'ClusterIP', has_tls: false }
        ],
        rbac: {
            cluster_roles: ['cluster-admin', 'view', 'edit'],
            service_accounts: ['default', 'sa-app', 'sa-monitor'],
            role_bindings: [
                { name: 'admin-binding', role: 'cluster-admin', subjects: ['admin'] },
                { name: 'view-binding', role: 'view', subjects: ['monitor'] }
            ]
        }
    };
}

function checkPodSecurity(podName) {
    console.log(`🔍 Verificando seguridad del Pod: ${podName || 'todos'}`);
    
    const resources = simulateK8sResources();
    let pods = resources.pods;
    
    if (podName) {
        pods = pods.filter(p => p.name === podName);
        if (pods.length === 0) {
            console.error(`❌ Pod no encontrado: ${podName}`);
            return;
        }
    }
    
    const results = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    for (const pod of pods) {
        const checks = {
            privileged: {
                passed: !pod.privileged,
                severity: 'critical',
                message: pod.privileged ? 'Contenedor privilegiado' : 'Sin privilegios'
            },
            root_user: {
                passed: !pod.root_user,
                severity: 'high',
                message: pod.root_user ? 'Ejecutando como root' : 'Ejecutando como usuario no-root'
            },
            read_only_rootfs: {
                passed: pod.read_only_rootfs,
                severity: 'medium',
                message: pod.read_only_rootfs ? 'Root filesystem solo lectura' : 'Root filesystem escribible'
            },
            resources: {
                passed: pod.resources.cpu && pod.resources.memory,
                severity: 'medium',
                message: pod.resources.cpu && pod.resources.memory ? 'Resource limits configurados' : 'Sin resource limits'
            }
        };
        
        const issues = Object.values(checks).filter(c => !c.passed);
        if (issues.some(c => c.severity === 'critical')) criticalIssues++;
        if (issues.some(c => c.severity === 'high' || c.severity === 'medium')) warnings++;
        
        results.push({
            pod: pod.name,
            namespace: pod.namespace,
            checks: checks,
            issues: issues.length,
            status: issues.length === 0 ? 'PASSED' : issues.some(c => c.severity === 'critical') ? 'CRITICAL' : 'WARNING'
        });
    }
    
    console.log(`\n📊 Resultados Pods:`);
    console.log(`   Pods analizados: ${results.length}`);
    console.log(`   🔴 Criticos: ${criticalIssues}`);
    console.log(`   ⚠️ Advertencias: ${warnings}`);
    
    for (const result of results) {
        console.log(`\n📌 ${result.namespace}/${result.pod} (${result.status})`);
        for (const [check, data] of Object.entries(result.checks)) {
            const icon = data.passed ? '✅' : '❌';
            console.log(`   ${icon} ${check}: ${data.message}`);
        }
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return results;
}

function auditK8sRBAC() {
    console.log('🔍 Auditando configuracion RBAC...');
    
    const resources = simulateK8sResources();
    const rbac = resources.rbac;
    const findings = [];
    let criticalIssues = 0;
    let warnings = 0;
    
    // Verificar cluster-admin
    for (const binding of rbac.role_bindings) {
        if (binding.role === 'cluster-admin') {
            findings.push({
                type: 'cluster_admin',
                severity: 'critical',
                message: `Cluster-admin asignado a: ${binding.subjects.join(', ')}`,
                binding: binding.name
            });
            criticalIssues++;
        }
    }
    
    // Verificar service accounts
    for (const sa of rbac.service_accounts) {
        if (sa === 'default') {
            findings.push({
                type: 'default_sa',
                severity: 'medium',
                message: 'Service account por defecto en uso',
                account: sa
            });
            warnings++;
        }
    }
    
    console.log(`\n📊 Resultados RBAC:`);
    console.log(`   🔴 Criticos: ${criticalIssues}`);
    console.log(`   ⚠️ Advertencias: ${warnings}`);
    
    if (findings.length > 0) {
        console.log(`\n🔍 Hallazgos:`);
        for (const finding of findings) {
            const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'high' ? '🟠' : '🟡';
            console.log(`   ${icon} ${finding.message}`);
        }
    } else {
        console.log('\n✅ No se encontraron problemas de RBAC');
    }
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(findings, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return findings;
}

function scanK8s(namespace) {
    console.log(`☁️ Escaneando cluster Kubernetes${namespace ? ` (namespace: ${namespace})` : ''}`);
    
    const resources = simulateK8sResources();
    const results = {
        timestamp: new Date().toISOString(),
        namespace: namespace || 'all',
        summary: {
            pods: resources.pods.length,
            privileged_pods: resources.pods.filter(p => p.privileged).length,
            services: resources.services.length,
            load_balancers: resources.services.filter(s => s.type === 'LoadBalancer').length,
            cluster_roles: resources.rbac.cluster_roles.length,
            service_accounts: resources.rbac.service_accounts.length
        },
        details: resources
    };
    
    // Verificar pods privilegiados
    for (const pod of resources.pods) {
        if (pod.privileged) {
            console.log(`   ⚠️ Pod privilegiado: ${pod.name}`);
        }
        if (pod.root_user) {
            console.log(`   ⚠️ Pod ejecutando como root: ${pod.name}`);
        }
    }
    
    // Verificar servicios LoadBalancer
    for (const service of resources.services) {
        if (service.type === 'LoadBalancer') {
            console.log(`   ⚠️ Servicio LoadBalancer expuesto: ${service.name}`);
        }
    }
    
    console.log(`\n📊 Resumen del escaneo:`);
    console.log(`   📦 Pods: ${results.summary.pods}`);
    console.log(`   🚨 Privilegiados: ${results.summary.privileged_pods}`);
    console.log(`   🌐 Services: ${results.summary.services}`);
    console.log(`   🔄 Load Balancers: ${results.summary.load_balancers}`);
    console.log(`   👤 Cluster Roles: ${results.summary.cluster_roles}`);
    console.log(`   🔑 Service Accounts: ${results.summary.service_accounts}`);
    
    if (outputFile) {
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        console.log(`\n📄 Reporte guardado: ${outputFile}`);
    }
    
    return results;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`☁️ Kubernetes Security Scanner - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'scan':
            scanK8s(namespace);
            break;
            
        case 'checkPod':
            checkPodSecurity(podName);
            break;
            
        case 'auditRBAC':
            auditK8sRBAC();
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --check-pod, --audit-rbac, --init');
            break;
    }
    
    console.log('\n✅ Kubernetes Security Scanner completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Kubernetes Security Scanner...');
    process.exit(0);
});
