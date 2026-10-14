/**
 * MFH TOOLS - Script del apartado Herramientas de Ciberseguridad
 * Reconocimiento + Web Scanning + Vulnerability Scanning
 */

'use strict';

// ============================================================
// TEMA
// ============================================================
(function() {
    var themeToggle = document.getElementById('themeToggle');
    var body = document.body;
    if (!themeToggle || !body) return;

    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
        themeToggle.classList.remove('fa-sun');
        themeToggle.classList.add('fa-moon');
    }

    themeToggle.addEventListener('click', function() {
        body.classList.toggle('light-mode');
        var isLight = body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        if (isLight) {
            themeToggle.classList.remove('fa-sun');
            themeToggle.classList.add('fa-moon');
        } else {
            themeToggle.classList.remove('fa-moon');
            themeToggle.classList.add('fa-sun');
        }
    });
})();

// ============================================================
// UTILIDADES
// ============================================================
function $(id) { return document.getElementById(id); }

function setOutput(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function now() { return new Date().toISOString(); }

function isValidDomain(d) {
    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(d);
}

function isValidIP(ip) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
    return ip.split('.').every(function(n) {
        var x = parseInt(n, 10);
        return x >= 0 && x <= 255;
    });
}

function isValidUrl(url) {
    return /^https?:\/\/[^\s]+$/i.test(url);
}

function normalizeUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'http://' + url;
    }
    return url;
}

function codeBlock(text) {
    return '<div style="background:#000;color:#0f0;padding:6px 10px;border-radius:5px;font-family:Courier New,monospace;font-size:0.75rem;border-left:3px solid #0f0;margin:4px 0;white-space:pre-wrap;word-break:break-all;">' + esc(text) + '</div>';
}

// ============================================================
// NAVEGACIÓN ENTRE TABS
// ============================================================
function showTool(tool) {
    var tabMap = {
        host: 'hostTab',
        identity: 'identityTab',
        network: 'networkTab',
        dns: 'dnsTab',
        webscan: 'webscanTab',
        vulnscan: 'vulnscanTab',
        webvuln: 'webvulnTab'
    };
    var tabId = tabMap[tool];
    if (!tabId) return;
    var trigger = document.querySelector('button[data-bs-target="#' + tabId + '"]');
    if (trigger && typeof bootstrap !== 'undefined') {
        bootstrap.Tab.getOrCreateInstance(trigger).show();
    }
    var panel = document.getElementById('herramientas');
    if (panel) panel.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// DESCARGA DE HERRAMIENTAS
// ============================================================
var AVAILABLE_TOOLS = [
    'host-information.js',
    'identity-information.js',
    'network-information.js',
    'dns-information.js',
    'web-scanning.js',
    'vulnerability-scanning.js',
    'web-vulnerability-scanning.js'
];

function downloadTool(filename) {
    if (!filename) return;
    
    if (AVAILABLE_TOOLS.indexOf(filename) === -1) {
        alert('⚠️ La herramienta "' + filename + '" aún no está disponible.');
        return;
    }

    var link = document.createElement('a');
    link.href = 'tools/' + filename;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(function() {
        if (link.parentNode) link.parentNode.removeChild(link);
    }, 100);
}

// ============================================================
// HOST INFORMATION
// ============================================================
function runHostInfo() {
    var target = ($('hostTarget') ? $('hostTarget').value : '').trim();
    if (!target) {
        setOutput('hostResult', '❌ Ingresa un dominio o IP');
        return;
    }

    setOutput('hostResult', '🔍 Analizando host: ' + esc(target) + '...');

    setTimeout(function() {
        var clean = target.replace(/^https?:\/\//, '').split('/')[0];
        var isIP = isValidIP(clean);
        var isDomain = isValidDomain(clean);

        if (!isIP && !isDomain) {
            setOutput('hostResult', '❌ Formato inválido. Ingresa un dominio (ejemplo.com) o IP (8.8.8.8)');
            return;
        }

        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📋 HOST INFORMATION REPORT');
        lines.push('  Target: ' + esc(clean));
        lines.push('  Tipo: ' + (isIP ? 'Dirección IP' : 'Nombre de dominio'));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('🔍 Análisis de formato:');
        lines.push('   ✅ Target válido');
        lines.push('');

        lines.push('🛡️ Análisis heurístico:');
        var suspicious = [];
        if (/\d{4,}/.test(clean)) suspicious.push('Contiene secuencia numérica larga (posible DGA)');
        if (/\.(xyz|top|club|work|click|loan|bid|tk|ml|ga|cf)$/.test(clean)) suspicious.push('TLD frecuentemente abusado');
        if (clean.length > 50) suspicious.push('Dominio excesivamente largo');
        if (clean.indexOf('--') !== -1) suspicious.push('Contiene doble guion (posible IDN homograph)');

        if (suspicious.length === 0) {
            lines.push('   ✅ Sin patrones sospechosos detectados');
        } else {
            suspicious.forEach(function(s) { lines.push('   ⚠️ ' + s); });
        }
        lines.push('');

        lines.push('🌐 Información del navegador:');
        lines.push('   • User Agent: ' + esc(navigator.userAgent.substring(0, 50)) + '...');
        lines.push('   • Idioma: ' + esc(navigator.language));
        lines.push('   • Online: ' + (navigator.onLine ? '✅ Sí' : '❌ No'));
        lines.push('');

        lines.push('─'.repeat(50));
        lines.push('💡 Para análisis completo, descarga el .js y ejecuta:');
        lines.push('   node tools/host-information.js --target ' + esc(clean));

        setOutput('hostResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// IDENTITY INFORMATION
// ============================================================
function runIdentityInfo() {
    var target = ($('identityTarget') ? $('identityTarget').value : '').trim();
    if (!target) {
        setOutput('identityResult', '❌ Ingresa un email o usuario');
        return;
    }

    setOutput('identityResult', '🔍 Analizando identidad: ' + esc(target) + '...');

    setTimeout(function() {
        var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
        var parts = target.split('@');
        var user = parts[0] || target;
        var domain = parts[1] || '(sin dominio)';

        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  👤 IDENTITY INFORMATION REPORT');
        lines.push('  Target: ' + esc(target));
        lines.push('  Tipo: ' + (isEmail ? 'Email' : 'Usuario'));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('📧 Información básica:');
        lines.push('   • Usuario: ' + esc(user));
        lines.push('   • Dominio: ' + esc(domain));
        lines.push('   • Formato válido: ' + (isEmail ? '✅ Sí' : '⚠️ No es un email válido'));
        lines.push('');

        lines.push('🛡️ Análisis heurístico:');
        var warnings = [];
        if (user.length < 4) warnings.push('Usuario muy corto');
        if (/^(admin|root|test|user|info|support)$/i.test(user)) warnings.push('Usuario genérico común');
        if (/\d{4,}/.test(user)) warnings.push('Muchos números en usuario');

        if (warnings.length === 0) {
            lines.push('   ✅ Sin patrones sospechosos');
        } else {
            warnings.forEach(function(w) { lines.push('   ⚠️ ' + w); });
        }
        lines.push('');

        lines.push('🔍 Recomendaciones OSINT:');
        lines.push('   • https://haveibeenpwned.com/');
        lines.push('   • https://hunter.io/');
        lines.push('');

        lines.push('─'.repeat(50));
        lines.push('💡 Ejecuta: node tools/identity-information.js --target ' + esc(target));

        setOutput('identityResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// NETWORK INFORMATION
// ============================================================
function runNetworkInfo() {
    var target = ($('networkTarget') ? $('networkTarget').value : '').trim();
    if (!target) {
        setOutput('networkResult', '❌ Ingresa una IP o rango CIDR');
        return;
    }

    setOutput('networkResult', '🔍 Analizando red: ' + esc(target) + '...');

    setTimeout(function() {
        var ip = target;
        var cidr = null;

        if (target.indexOf('/') !== -1) {
            var parts = target.split('/');
            ip = parts[0];
            cidr = parseInt(parts[1], 10);
        }

        if (!isValidIP(ip)) {
            setOutput('networkResult', '❌ IP inválida');
            return;
        }

        var ipParts = ip.split('.').map(function(n) { return parseInt(n, 10); });
        var isPrivate = ip.startsWith('10.') || ip.startsWith('192.168.') ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip.startsWith('127.');

        var clase = 'Desconocida';
        if (ipParts[0] >= 1 && ipParts[0] <= 126) clase = 'A';
        else if (ipParts[0] >= 128 && ipParts[0] <= 191) clase = 'B';
        else if (ipParts[0] >= 192 && ipParts[0] <= 223) clase = 'C';
        else if (ipParts[0] >= 224 && ipParts[0] <= 239) clase = 'D (Multicast)';
        else if (ipParts[0] >= 240) clase = 'E (Reservada)';

        var binary = ipParts.map(function(n) { return n.toString(2).padStart(8, '0'); }).join('.');
        var hex = ipParts.map(function(n) { return n.toString(16).padStart(2, '0'); }).join(':');

        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🌐 NETWORK INFORMATION REPORT');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('🔢 Clasificación:');
        lines.push('   • IP: ' + esc(ip));
        lines.push('   • Clase: ' + clase);
        lines.push('   • Tipo: ' + (isPrivate ? '🔒 Privada (RFC 1918)' : '🌍 Pública'));
        lines.push('');
        lines.push('💻 Representaciones:');
        lines.push('   • Binario: ' + binary);
        lines.push('   • Hex: ' + hex);
        lines.push('');

        if (cidr !== null) {
            lines.push('📡 CIDR /' + cidr + ':');
            lines.push('   • Hosts totales: ' + Math.pow(2, 32 - cidr).toLocaleString());
            lines.push('');
        }

        lines.push('─'.repeat(50));
        lines.push('💡 Ejecuta: node tools/network-information.js --target ' + esc(target));

        setOutput('networkResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// DNS INFORMATION
// ============================================================
function runDnsInfo() {
    var target = ($('dnsTarget') ? $('dnsTarget').value : '').trim();
    var type = ($('dnsType') ? $('dnsType').value : 'A');

    if (!target) {
        setOutput('dnsResult', '❌ Ingresa un dominio');
        return;
    }

    if (!isValidDomain(target)) {
        setOutput('dnsResult', '❌ Formato de dominio inválido');
        return;
    }

    setOutput('dnsResult', '🔍 Consultando ' + esc(type) + ' para ' + esc(target) + '...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📡 DNS INFORMATION REPORT');
        lines.push('  Dominio: ' + esc(target));
        lines.push('  Tipo: ' + esc(type));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('⚠️ El navegador no puede hacer DNS lookup real.');
        lines.push('   Los resultados requieren backend o terminal.');
        lines.push('');
        lines.push('🔍 Consultas recomendadas (terminal):');
        lines.push('   nslookup -type=' + esc(type) + ' ' + esc(target));
        lines.push('   dig ' + esc(target) + ' ' + esc(type));
        lines.push('   host -t ' + esc(type) + ' ' + esc(target));
        lines.push('');
        lines.push('🌐 Herramientas online:');
        lines.push('   • https://dns.google/query?name=' + esc(target) + '&type=' + esc(type));
        lines.push('   • https://www.whatsmydns.net/');
        lines.push('');
        lines.push('─'.repeat(50));
        lines.push('💡 Ejecuta: node tools/dns-information.js --target ' + esc(target) + ' --type ' + esc(type));

        setOutput('dnsResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WEB SCANNING
// ============================================================
function runWebScanning() {
    var target = ($('webscanTarget') ? $('webscanTarget').value : '').trim();
    var tool = ($('webscanTool') ? $('webscanTool').value : 'all');

    if (!target) {
        setOutput('webscanResult', '❌ Ingresa una URL');
        return;
    }

    setOutput('webscanResult', '🔍 Generando comandos para: ' + esc(target) + '...');

    setTimeout(function() {
        var clean = normalizeUrl(target);
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🌐 WEB SCANNING COMMANDS');
        lines.push('  Target: ' + esc(clean));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var commands = [];

        if (tool === 'all' || tool === 'dirb') {
            commands.push({
                name: 'DIRB',
                install: 'sudo apt install dirb',
                cmd: 'dirb ' + clean + ' /usr/share/dirb/wordlists/common.txt -o dirb_results.txt'
            });
        }

        if (tool === 'all' || tool === 'dirbuster') {
            commands.push({
                name: 'DirBuster',
                install: 'sudo apt install dirbuster',
                cmd: 'java -jar DirBuster-1.0-RC1.jar -H -u ' + clean + ' -l /usr/share/dirbuster/wordlists/directory-list-2.3-small.txt'
            });
        }

        if (tool === 'all' || tool === 'gobuster') {
            commands.push({
                name: 'Gobuster',
                install: 'sudo apt install gobuster',
                cmd: 'gobuster dir -u ' + clean + ' -w /usr/share/wordlists/dirb/common.txt -x php,html,js,txt -t 50 -o gobuster_results.txt'
            });
        }

        commands.forEach(function(c) {
            lines.push('📌 ' + c.name);
            lines.push('   Instalar: ' + c.install);
            lines.push('   Comando:');
            lines.push(codeBlock(c.cmd));
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('💡 Consejo: Usa -o file.txt para guardar resultados');
        lines.push('⚠️ Solo escanea sitios con autorización escrita');

        setOutput('webscanResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// VULNERABILITY SCANNING
// ============================================================
function runVulnScanning() {
    var target = ($('vulnscanTarget') ? $('vulnscanTarget').value : '').trim();
    var type = ($('vulnscanType') ? $('vulnscanType').value : 'all');

    if (!target) {
        setOutput('vulnscanResult', '❌ Ingresa una IP o host');
        return;
    }

    setOutput('vulnscanResult', '🔍 Generando comandos para: ' + esc(target) + '...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🛡️ VULNERABILITY SCANNING COMMANDS');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var allCommands = [
            { key: 'basic', name: 'Escaneo básico TCP', cmd: 'nmap -sT ' + target },
            { key: 'stealth', name: 'SYN Stealth Scan', cmd: 'sudo nmap -sS ' + target },
            { key: 'version', name: 'Versiones + Scripts', cmd: 'sudo nmap -sV -sC ' + target },
            { key: 'os', name: 'Detección de SO', cmd: 'sudo nmap -O ' + target },
            { key: 'vuln', name: 'Vulnerabilidades NSE', cmd: 'sudo nmap --script=vuln ' + target },
            { key: 'allports', name: 'Todos los puertos', cmd: 'sudo nmap -p- ' + target },
            { key: 'udp', name: 'Escaneo UDP', cmd: 'sudo nmap -sU --top-ports 100 ' + target }
        ];

        var filtered = (type === 'all') ? allCommands : allCommands.filter(function(c) { return c.key === type; });

        lines.push('📌 Instalar: sudo apt install nmap zenmap');
        lines.push('');

        filtered.forEach(function(c) {
            lines.push('🔧 ' + c.name);
            lines.push(codeBlock(c.cmd));
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('📄 Formatos de salida:');
        lines.push(codeBlock('nmap -oN scan.txt ' + target));
        lines.push(codeBlock('nmap -oX scan.xml ' + target));
        lines.push(codeBlock('nmap -oA scan ' + target));
        lines.push('');
        lines.push('💡 Zenmap (GUI): zenmap');
        lines.push('⚠️ Solo escanea sistemas con autorización escrita');

        setOutput('vulnscanResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WEB VULNERABILITY SCANNING
// ============================================================
function runWebVulnScanning() {
    var target = ($('webvulnTarget') ? $('webvulnTarget').value : '').trim();
    var tool = ($('webvulnTool') ? $('webvulnTool').value : 'all');

    if (!target) {
        setOutput('webvulnResult', '❌ Ingresa una URL');
        return;
    }

    setOutput('webvulnResult', '🔍 Generando comandos para: ' + esc(target) + '...');

    setTimeout(function() {
        var clean = normalizeUrl(target);
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🔒 WEB VULNERABILITY SCANNING');
        lines.push('  Target: ' + esc(clean));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        if (tool === 'all' || tool === 'nikto') {
            lines.push('📌 Nikto');
            lines.push('   Instalar: sudo apt install nikto');
            lines.push('   Comando básico:');
            lines.push(codeBlock('nikto -h ' + clean));
            lines.push('   Con reporte HTML:');
            lines.push(codeBlock('nikto -h ' + clean + ' -o nikto_report.html -F HTML -Tuning x'));
            lines.push('   Con reporte JSON:');
            lines.push(codeBlock('nikto -h ' + clean + ' -o nikto_report.json -F JSON'));
            lines.push('');
        }

        if (tool === 'all' || tool === 'zap') {
            lines.push('📌 OWASP ZAP');
            lines.push('   Instalar: sudo apt install zaproxy');
            lines.push('   Modo GUI:');
            lines.push(codeBlock('zaproxy'));
            lines.push('   Modo comando (quick scan):');
            lines.push(codeBlock('zap.sh -cmd -quickurl ' + clean + ' -quickout zap_report.html'));
            lines.push('   Pasos GUI:');
            lines.push('      1. Lanzar: zaproxy');
            lines.push('      2. En "Quick Start" ingresa la URL');
            lines.push('      3. Click en "Attack"');
            lines.push('      4. Ver resultados en "Alerts"');
            lines.push('      5. Report → Generate Report');
            lines.push('');
        }

        lines.push('─'.repeat(50));
        lines.push('🧪 Servidores de prueba (legales):');
        lines.push('   • http://testphp.vulnweb.com');
        lines.push('   • https://juice-shop.herokuapp.com');
        lines.push('   • http://webgoat.herokuapp.com');
        lines.push('');
        lines.push('⚠️ Solo escanea sitios con autorización escrita');

        setOutput('webvulnResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// EXPORTAR FUNCIONES GLOBALES
// ============================================================
window.showTool = showTool;
window.downloadTool = downloadTool;
window.runHostInfo = runHostInfo;
window.runIdentityInfo = runIdentityInfo;
window.runNetworkInfo = runNetworkInfo;
window.runDnsInfo = runDnsInfo;
window.runWebScanning = runWebScanning;
window.runVulnScanning = runVulnScanning;
window.runWebVulnScanning = runWebVulnScanning;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ MFH TOOLS - script-tools.js cargado correctamente');
    console.log('📦 Herramientas disponibles: ' + AVAILABLE_TOOLS.join(', '));
});
