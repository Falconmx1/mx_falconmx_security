/**
 * MFH TOOLS - Script del apartado Herramientas de Ciberseguridad
 * Categorías: Reconocimiento | Acceso con Credenciales
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

function isValidMAC(mac) {
    return /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i.test(mac);
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
        webvuln: 'webvulnTab',
        bluetooth: 'bluetoothTab',
        radio: 'radioTab',
        wifi: 'wifiTab',
        creddump: 'creddumpTab',
        hashid: 'hashidTab',
        wordlist: 'wordlistTab'
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
    'web-vulnerability-scanning.js',
    'bluetooth-scanning.js',
    'radio-frequency-scanning.js',
    'wifi-scanning.js',
    'credential-dumping.js',
    'hash-identification.js',
    'wordlist-profiling.js'
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
// HOST INFORMATION (Reconocimiento)
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
// IDENTITY INFORMATION (Reconocimiento)
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
// NETWORK INFORMATION (Reconocimiento)
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
// DNS INFORMATION (Reconocimiento)
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
// WEB SCANNING (Reconocimiento)
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
// VULNERABILITY SCANNING (Reconocimiento)
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
// WEB VULNERABILITY SCANNING (Reconocimiento)
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
// BLUETOOTH SCANNING (Reconocimiento)
// ============================================================
function runBluetoothScanning() {
    var target = ($('bluetoothTarget') ? $('bluetoothTarget').value : '').trim() || 'all';
    var tool = ($('bluetoothTool') ? $('bluetoothTool').value : 'all');

    if (target !== 'all' && !isValidMAC(target)) {
        setOutput('bluetoothResult', '❌ MAC inválida. Formato: AA:BB:CC:DD:EE:FF');
        return;
    }

    setOutput('bluetoothResult', '🔍 Generando comandos Bluetooth...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📶 BLUETOOTH SCANNING COMMANDS');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var allTools = {
            bettercap: {
                name: 'Bettercap',
                install: 'sudo apt install bettercap',
                cmds: [
                    'sudo bettercap -iface hci0',
                    'ble.recon on',
                    'ble.show',
                    'ble.enum ' + target
                ]
            },
            bluetoothctl: {
                name: 'bluetoothctl',
                install: 'sudo apt install bluez bluez-tools',
                cmds: [
                    'bluetoothctl',
                    'scan on',
                    'devices',
                    'info ' + target
                ]
            },
            hcitool: {
                name: 'hcitool',
                install: 'sudo apt install bluez',
                cmds: [
                    'sudo hcitool dev',
                    'sudo hcitool scan',
                    'sudo hcitool lescan',
                    'sudo hcitool name ' + target
                ]
            },
            btmon: {
                name: 'btmon',
                install: 'sudo apt install bluez',
                cmds: [
                    'sudo btmon',
                    'sudo btmon -w capture.log'
                ]
            },
            bluelog: {
                name: 'Bluelog',
                install: 'sudo apt install bluelog',
                cmds: [
                    'sudo bluelog -i hci0 -o scan.log -v'
                ]
            }
        };

        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];

        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.name);
            lines.push('   Instalar: ' + t.install);
            lines.push('   Comandos:');
            t.cmds.forEach(function(c) {
                lines.push(codeBlock(c));
            });
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo escanea dispositivos con autorización');

        setOutput('bluetoothResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// RADIO FREQUENCY SCANNING (Reconocimiento)
// ============================================================
function runRadioScanning() {
    var freq = ($('radioFreq') ? $('radioFreq').value : '').trim() || '100000000';
    var tool = ($('radioTool') ? $('radioTool').value : 'all');

    setOutput('radioResult', '🔍 Generando comandos SDR...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📻 RADIO FREQUENCY COMMANDS');
        lines.push('  Frecuencia: ' + esc(freq) + ' Hz');
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var allTools = {
            hackrf: {
                name: 'HackRF One',
                install: 'sudo apt install hackrf',
                cmds: [
                    'hackrf_info',
                    'hackrf_transfer -r capture.iq -f ' + freq + ' -s 2000000',
                    'hackrf_sweep -f 88:108'
                ]
            },
            gnurdio: {
                name: 'GNU Radio',
                install: 'sudo apt install gnuradio',
                cmds: [
                    'gnuradio-companion',
                    'gnuradio-config-info'
                ]
            },
            rtlsdr: {
                name: 'RTL-SDR',
                install: 'sudo apt install rtl-sdr',
                cmds: [
                    'rtl_test',
                    'rtl_sdr -f ' + freq + ' -s 2000000 out.iq',
                    'rtl_fm -f ' + freq + ' -M fm -s 200000 -r 48000 - | aplay -f S16_LE',
                    'rtl_power -f 88M:108M:100k -i 1 scan.csv'
                ]
            },
            gqrx: {
                name: 'GQRX',
                install: 'sudo apt install gqrx-sdr',
                cmds: [
                    'gqrx'
                ]
            },
            'sdr-sharp': {
                name: 'SDR#',
                install: 'Descargar de https://airspy.com/download/',
                cmds: [
                    'SDRSharp.exe'
                ]
            },
            'universal-radio-hacker': {
                name: 'Universal Radio Hacker',
                install: 'pip install urh',
                cmds: [
                    'urh'
                ]
            }
        };

        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];

        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.name);
            lines.push('   Instalar: ' + t.install);
            lines.push('   Comandos:');
            t.cmds.forEach(function(c) {
                lines.push(codeBlock(c));
            });
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('📡 Bandas comunes:');
        lines.push('   FM: 88-108 MHz | GPS: 1575 MHz | WiFi: 2.4/5 GHz');
        lines.push('');
        lines.push('⚠️ Transmitir sin licencia es ilegal');

        setOutput('radioResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WIFI SCANNING (Reconocimiento)
// ============================================================
function runWifiScanning() {
    var iface = ($('wifiIface') ? $('wifiIface').value : '').trim() || 'wlan0';
    var tool = ($('wifiTool') ? $('wifiTool').value : 'all');

    setOutput('wifiResult', '🔍 Generando comandos WiFi...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📡 WIFI SCANNING COMMANDS');
        lines.push('  Interface: ' + esc(iface));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var allTools = {
            bettercap: {
                name: 'Bettercap',
                install: 'sudo apt install bettercap',
                cmds: [
                    'sudo bettercap -iface ' + iface,
                    'wifi.recon on',
                    'wifi.show'
                ]
            },
            'sparrow-wifi': {
                name: 'Sparrow-WiFi',
                install: 'git clone https://github.com/ghostop14/sparrow-wifi',
                cmds: [
                    'python3 sparrow-wifi.py'
                ]
            },
            kismet: {
                name: 'Kismet',
                install: 'sudo apt install kismet',
                cmds: [
                    'sudo kismet -c ' + iface,
                    '# Web UI: http://localhost:2501'
                ]
            },
            airodump: {
                name: 'Airodump-ng',
                install: 'sudo apt install aircrack-ng',
                cmds: [
                    'sudo airmon-ng start ' + iface,
                    'sudo airodump-ng ' + iface + 'mon',
                    'sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w capture ' + iface + 'mon'
                ]
            },
            airoplay: {
                name: 'Aireplay-ng',
                install: 'sudo apt install aircrack-ng',
                cmds: [
                    'sudo aireplay-ng --test ' + iface + 'mon',
                    'sudo aireplay-ng --deauth 10 -a <BSSID> ' + iface + 'mon'
                ]
            },
            wifite: {
                name: 'Wifite',
                install: 'git clone https://github.com/derv82/wifite2',
                cmds: [
                    'sudo wifite',
                    'sudo wifite --wpa',
                    'sudo wifite --dict /usr/share/wordlists/rockyou.txt'
                ]
            },
            wash: {
                name: 'Wash',
                install: 'sudo apt install reaver',
                cmds: [
                    'sudo wash -i ' + iface + 'mon',
                    'sudo wash -i ' + iface + 'mon -C'
                ]
            },
            reaver: {
                name: 'Reaver',
                install: 'sudo apt install reaver',
                cmds: [
                    'sudo reaver -i ' + iface + 'mon -b <BSSID> -vv',
                    'sudo reaver -i ' + iface + 'mon -b <BSSID> -K 1'
                ]
            }
        };

        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];

        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.name);
            lines.push('   Instalar: ' + t.install);
            lines.push('   Comandos:');
            t.cmds.forEach(function(c) {
                lines.push(codeBlock(c));
            });
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('📋 Flujo recomendado:');
        lines.push('   1. airmon-ng start ' + iface);
        lines.push('   2. airodump-ng ' + iface + 'mon');
        lines.push('   3. airodump-ng -c <CANAL> --bssid <BSSID> -w capture ' + iface + 'mon');
        lines.push('   4. aireplay-ng --deauth 10 -a <BSSID> ' + iface + 'mon');
        lines.push('   5. aircrack-ng capture-01.cap -w rockyou.txt');
        lines.push('');
        lines.push('⚠️ Solo audita tu propia red o con autorización escrita');

        setOutput('wifiResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// CREDENTIAL DUMPING (Acceso con Credenciales)
// ============================================================
function runCredentialDumping() {
    var target = ($('creddumpTarget') ? $('creddumpTarget').value : '').trim() || '/mnt/win';
    var tool = ($('creddumpTool') ? $('creddumpTool').value : 'all');

    setOutput('creddumpResult', '🔐 Generando comandos de Credential Dumping...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🔐 OS CREDENTIAL DUMPING');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var allTools = {
            samdump2: {
                name: 'samdump2',
                install: 'sudo apt install samdump2',
                cmds: [
                    'samdump2 ' + target + '/SYSTEM ' + target + '/SAM > hashes.txt',
                    'cat hashes.txt'
                ]
            },
            chntpw: {
                name: 'chntpw',
                install: 'sudo apt install chntpw',
                cmds: [
                    'chntpw -l ' + target + '/SAM',
                    'chntpw -i ' + target + '/SAM'
                ]
            },
            creddump7: {
                name: 'creddump7',
                install: 'sudo apt install creddump7',
                cmds: [
                    'pwdump.py ' + target + '/SYSTEM ' + target + '/SAM',
                    'lsadump.py ' + target + '/SYSTEM ' + target + '/SECURITY',
                    'cachedump.py ' + target + '/SYSTEM ' + target + '/SECURITY true'
                ]
            },
            secretsdump: {
                name: 'secretsdump',
                install: 'pip install impacket',
                cmds: [
                    'secretsdump.py -sam ' + target + '/SAM -system ' + target + '/SYSTEM -security ' + target + '/SECURITY LOCAL',
                    'secretsdump.py domain/user:pass@target'
                ]
            },
            mimikatz: {
                name: 'Mimikatz',
                install: 'Descargar de GitHub',
                cmds: [
                    'mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"',
                    'mimikatz.exe "lsadump::sam" "exit"'
                ]
            }
        };

        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];

        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.name);
            lines.push('   Instalar: ' + t.install);
            lines.push('   Comandos:');
            t.cmds.forEach(function(c) {
                lines.push(codeBlock(c));
            });
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo extrae credenciales de sistemas con autorización');

        setOutput('creddumpResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// HASH IDENTIFICATION (Acceso con Credenciales)
// ============================================================
function runHashIdentification() {
    var hash = ($('hashidTarget') ? $('hashidTarget').value : '').trim();
    var tool = ($('hashidTool') ? $('hashidTool').value : 'all');

    if (!hash) {
        setOutput('hashidResult', '❌ Ingresa un hash');
        return;
    }

    setOutput('hashidResult', '🔍 Identificando hash...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  #️⃣ HASH IDENTIFICATION');
        lines.push('  Hash: ' + esc(hash));
        lines.push('  Longitud: ' + hash.length + ' caracteres');
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var detected = 'Desconocido';
        if (/^\$2[aby]\$/.test(hash)) detected = 'bcrypt';
        else if (/^\$1\$/.test(hash)) detected = 'MD5 Crypt';
        else if (/^\$5\$/.test(hash)) detected = 'SHA-256 Crypt';
        else if (/^\$6\$/.test(hash)) detected = 'SHA-512 Crypt';
        else if (/^\$argon2/.test(hash)) detected = 'Argon2';
        else if (hash.length === 32) detected = 'MD5 / NTLM / MD4';
        else if (hash.length === 40) detected = 'SHA-1';
        else if (hash.length === 64) detected = 'SHA-256';
        else if (hash.length === 128) detected = 'SHA-512';

        lines.push('📊 Análisis básico:');
        lines.push('   • Tipo probable: ' + detected);
        lines.push('');

        var allTools = {
            hashid: {
                name: 'hashID',
                install: 'pip install hashid',
                cmds: [
                    'hashid \'' + hash + '\'',
                    'hashid -m \'' + hash + '\''
                ]
            },
            'hash-identifier': {
                name: 'Hash-Identifier',
                install: 'sudo apt install hash-identifier',
                cmds: [
                    'hash-identifier ' + hash
                ]
            },
            hashcrack: {
                name: 'hashcrack',
                install: 'pip install hashcrack-cli',
                cmds: [
                    'hashcrack identify ' + hash,
                    'hashcrack analyze ' + hash
                ]
            }
        };

        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];

        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.name);
            lines.push('   Instalar: ' + t.install);
            lines.push('   Comandos:');
            t.cmds.forEach(function(c) {
                lines.push(codeBlock(c));
            });
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('💡 Usa hashid -m para obtener el modo hashcat');

        setOutput('hashidResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// PASSWORD PROFILING (Acceso con Credenciales)
// ============================================================
function runWordlistProfiling() {
    var target = ($('wordlistTarget') ? $('wordlistTarget').value : '').trim();
    var tool = ($('wordlistTool') ? $('wordlistTool').value : 'all');

    if (!target) {
        setOutput('wordlistResult', '❌ Ingresa un nombre o URL');
        return;
    }

    setOutput('wordlistResult', '📝 Generando comandos de Wordlist...');

    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📝 PASSWORD PROFILING & WORDLIST');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');

        var allTools = {
            bopscrk: {
                name: 'bopscrk',
                install: 'pip install bopscrk',
                cmds: [
                    'bopscrk -i',
                    'bopscrk -w "' + target + '" -o bopscrk_wordlist.txt'
                ]
            },
            cewl: {
                name: 'CeWL',
                install: 'sudo apt install cewl',
                cmds: [
                    'cewl ' + target + ' -d 3 -m 5 -w cewl_wordlist.txt',
                    'cewl ' + target + ' --email -w emails.txt'
                ]
            },
            crunch: {
                name: 'Crunch',
                install: 'sudo apt install crunch',
                cmds: [
                    'crunch 8 8 -f /usr/share/crunch/charset.lst numeric -o numeric_8.txt',
                    'crunch 6 6 -t ddd%%% -p "palabra1" "palabra2" -o pattern.txt'
                ]
            },
            pack: {
                name: 'PACK',
                install: 'git clone https://github.com/iphelix/pack',
                cmds: [
                    'python statsgen.py wordlist.txt',
                    'python maskgen.py wordlist.txt'
                ]
            },
            rsmangler: {
                name: 'RSMangler',
                install: 'sudo apt install rsmangler',
                cmds: [
                    'rsmangler -f base_words.txt -e -a -o mangled.txt',
                    'rsmangler -f words.txt -p "pre_" -s "_suf" -o prefixed.txt'
                ]
            },
            seclists: {
                name: 'SecLists',
                install: 'sudo apt install seclists',
                cmds: [
                    'ls /usr/share/seclists/Passwords/',
                    'cat /usr/share/seclists/Passwords/rockyou.txt'
                ]
            },
            twofi: {
                name: 'Twofi',
                install: 'sudo apt install twofi',
                cmds: [
                    'twofi -u ' + target + ' -o twitter_wordlist.txt'
                ]
            }
        };

        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];

        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.name);
            lines.push('   Instalar: ' + t.install);
            lines.push('   Comandos:');
            t.cmds.forEach(function(c) {
                lines.push(codeBlock(c));
            });
            lines.push('');
        });

        lines.push('─'.repeat(50));
        lines.push('🔄 Flujo recomendado:');
        lines.push('   1. bopscrk -i');
        lines.push('   2. cewl <url> -d 3 -m 5 -w cewl.txt');
        lines.push('   3. rsmangler -f cewl.txt -e -a -o mangled.txt');
        lines.push('   4. cat mangled.txt rockyou.txt | sort -u > final.txt');
        lines.push('');
        lines.push('⚠️ Solo para auditorías con autorización');

        setOutput('wordlistResult', lines.join('<br>'));
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
window.runBluetoothScanning = runBluetoothScanning;
window.runRadioScanning = runRadioScanning;
window.runWifiScanning = runWifiScanning;
window.runCredentialDumping = runCredentialDumping;
window.runHashIdentification = runHashIdentification;
window.runWordlistProfiling = runWordlistProfiling;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ MFH TOOLS - script-tools.js cargado correctamente');
    console.log('📦 Herramientas disponibles: ' + AVAILABLE_TOOLS.length);
    console.log('🔍 Reconocimiento: 10 herramientas');
    console.log('🔐 Acceso con Credenciales: 3 herramientas');
});
