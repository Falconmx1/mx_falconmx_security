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
        wordlist: 'wordlistTab',
        bruteforce: 'bruteforceTab',
        passcrack: 'passcrackTab',
        unsecured: 'unsecuredTab',
        wificred: 'wificredTab',
        keylogger: 'keyloggerTab',
        voip: 'voipTab'
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
    'wordlist-profiling.js',
    'brute-force.js',
    'password-cracking.js',
    'unsecured-credentials.js',
    'wifi-credential-access.js',
    'keylogger.js',
    'voip-credential-access.js'
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
    if (!target) { setOutput('hostResult', '❌ Ingresa un dominio o IP'); return; }
    setOutput('hostResult', '🔍 Analizando host: ' + esc(target) + '...');
    setTimeout(function() {
        var clean = target.replace(/^https?:\/\//, '').split('/')[0];
        var isIP = isValidIP(clean);
        var isDomain = isValidDomain(clean);
        if (!isIP && !isDomain) { setOutput('hostResult', '❌ Formato inválido'); return; }
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📋 HOST INFORMATION REPORT');
        lines.push('  Target: ' + esc(clean));
        lines.push('  Tipo: ' + (isIP ? 'IP' : 'Dominio'));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('🔍 Análisis de formato: ✅ Válido');
        lines.push('');
        var susp = [];
        if (/\d{4,}/.test(clean)) susp.push('Secuencia numérica larga (posible DGA)');
        if (/\.(xyz|top|club|work|click|loan|bid|tk|ml|ga|cf)$/.test(clean)) susp.push('TLD sospechoso');
        if (clean.length > 50) susp.push('Dominio muy largo');
        lines.push('🛡️ Análisis heurístico:');
        if (susp.length === 0) lines.push('   ✅ Sin patrones sospechosos');
        else susp.forEach(function(s) { lines.push('   ⚠️ ' + s); });
        lines.push('');
        lines.push('🌐 Navegador:');
        lines.push('   • UA: ' + esc(navigator.userAgent.substring(0, 50)) + '...');
        lines.push('   • Idioma: ' + esc(navigator.language));
        lines.push('   • Online: ' + (navigator.onLine ? '✅' : '❌'));
        lines.push('');
        lines.push('─'.repeat(50));
        lines.push('💡 Ejecuta: node tools/host-information.js --target ' + esc(clean));
        setOutput('hostResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// IDENTITY INFORMATION
// ============================================================
function runIdentityInfo() {
    var target = ($('identityTarget') ? $('identityTarget').value : '').trim();
    if (!target) { setOutput('identityResult', '❌ Ingresa un email o usuario'); return; }
    setOutput('identityResult', '🔍 Analizando: ' + esc(target) + '...');
    setTimeout(function() {
        var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
        var parts = target.split('@');
        var user = parts[0] || target;
        var domain = parts[1] || '(sin dominio)';
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  👤 IDENTITY INFORMATION REPORT');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('📧 Info básica:');
        lines.push('   • Usuario: ' + esc(user));
        lines.push('   • Dominio: ' + esc(domain));
        lines.push('   • Email válido: ' + (isEmail ? '✅' : '⚠️'));
        lines.push('');
        lines.push('🛡️ Análisis:');
        var warns = [];
        if (user.length < 4) warns.push('Usuario muy corto');
        if (/^(admin|root|test|user|info|support)$/i.test(user)) warns.push('Usuario genérico');
        if (warns.length === 0) lines.push('   ✅ Sin patrones sospechosos');
        else warns.forEach(function(w) { lines.push('   ⚠️ ' + w); });
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
    if (!target) { setOutput('networkResult', '❌ Ingresa una IP o CIDR'); return; }
    setOutput('networkResult', '🔍 Analizando: ' + esc(target) + '...');
    setTimeout(function() {
        var ip = target, cidr = null;
        if (target.indexOf('/') !== -1) {
            var p = target.split('/');
            ip = p[0];
            cidr = parseInt(p[1], 10);
        }
        if (!isValidIP(ip)) { setOutput('networkResult', '❌ IP inválida'); return; }
        var parts = ip.split('.').map(function(n) { return parseInt(n, 10); });
        var isPrivate = ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip.startsWith('127.');
        var clase = 'Desconocida';
        if (parts[0] >= 1 && parts[0] <= 126) clase = 'A';
        else if (parts[0] >= 128 && parts[0] <= 191) clase = 'B';
        else if (parts[0] >= 192 && parts[0] <= 223) clase = 'C';
        else if (parts[0] >= 224 && parts[0] <= 239) clase = 'D';
        else if (parts[0] >= 240) clase = 'E';
        var binary = parts.map(function(n) { return n.toString(2).padStart(8, '0'); }).join('.');
        var hex = parts.map(function(n) { return n.toString(16).padStart(2, '0'); }).join(':');
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
        lines.push('   • Tipo: ' + (isPrivate ? '🔒 Privada' : '🌍 Pública'));
        lines.push('');
        lines.push('💻 Representaciones:');
        lines.push('   • Binario: ' + binary);
        lines.push('   • Hex: ' + hex);
        if (cidr !== null) {
            lines.push('');
            lines.push('📡 CIDR /' + cidr + ':');
            lines.push('   • Hosts: ' + Math.pow(2, 32 - cidr).toLocaleString());
        }
        lines.push('');
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
    if (!target) { setOutput('dnsResult', '❌ Ingresa un dominio'); return; }
    if (!isValidDomain(target)) { setOutput('dnsResult', '❌ Dominio inválido'); return; }
    setOutput('dnsResult', '🔍 Consultando ' + esc(type) + '...');
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
        lines.push('');
        lines.push('🔍 Consultas recomendadas:');
        lines.push('   nslookup -type=' + esc(type) + ' ' + esc(target));
        lines.push('   dig ' + esc(target) + ' ' + esc(type));
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
    if (!target) { setOutput('webscanResult', '❌ Ingresa una URL'); return; }
    setOutput('webscanResult', '🔍 Generando comandos...');
    setTimeout(function() {
        var clean = normalizeUrl(target);
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🌐 WEB SCANNING COMMANDS');
        lines.push('  Target: ' + esc(clean));
        lines.push('═'.repeat(50));
        lines.push('');
        var cmds = [];
        if (tool === 'all' || tool === 'dirb') cmds.push({n: 'DIRB', i: 'sudo apt install dirb', c: 'dirb ' + clean + ' /usr/share/dirb/wordlists/common.txt -o dirb_results.txt'});
        if (tool === 'all' || tool === 'dirbuster') cmds.push({n: 'DirBuster', i: 'sudo apt install dirbuster', c: 'java -jar DirBuster-1.0-RC1.jar -H -u ' + clean});
        if (tool === 'all' || tool === 'gobuster') cmds.push({n: 'Gobuster', i: 'sudo apt install gobuster', c: 'gobuster dir -u ' + clean + ' -w /usr/share/wordlists/dirb/common.txt -x php,html,js'});
        cmds.forEach(function(c) {
            lines.push('📌 ' + c.n);
            lines.push('   Instalar: ' + c.i);
            lines.push(codeBlock(c.c));
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo escanea sitios con autorización');
        setOutput('webscanResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// VULNERABILITY SCANNING
// ============================================================
function runVulnScanning() {
    var target = ($('vulnscanTarget') ? $('vulnscanTarget').value : '').trim();
    var type = ($('vulnscanType') ? $('vulnscanType').value : 'all');
    if (!target) { setOutput('vulnscanResult', '❌ Ingresa una IP'); return; }
    setOutput('vulnscanResult', '🔍 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🛡️ VULNERABILITY SCANNING');
        lines.push('  Target: ' + esc(target));
        lines.push('═'.repeat(50));
        lines.push('');
        var allCmds = [
            {k: 'basic', n: 'Básico', c: 'nmap -sT ' + target},
            {k: 'stealth', n: 'SYN Stealth', c: 'sudo nmap -sS ' + target},
            {k: 'version', n: 'Versiones', c: 'sudo nmap -sV -sC ' + target},
            {k: 'os', n: 'SO', c: 'sudo nmap -O ' + target},
            {k: 'vuln', n: 'Vulnerabilidades', c: 'sudo nmap --script=vuln ' + target},
            {k: 'allports', n: 'Todos los puertos', c: 'sudo nmap -p- ' + target},
            {k: 'udp', n: 'UDP', c: 'sudo nmap -sU --top-ports 100 ' + target}
        ];
        var filtered = (type === 'all') ? allCmds : allCmds.filter(function(c) { return c.k === type; });
        lines.push('📌 Instalar: sudo apt install nmap zenmap');
        lines.push('');
        filtered.forEach(function(c) {
            lines.push('🔧 ' + c.n);
            lines.push(codeBlock(c.c));
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo escanea sistemas con autorización');
        setOutput('vulnscanResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WEB VULNERABILITY SCANNING
// ============================================================
function runWebVulnScanning() {
    var target = ($('webvulnTarget') ? $('webvulnTarget').value : '').trim();
    var tool = ($('webvulnTool') ? $('webvulnTool').value : 'all');
    if (!target) { setOutput('webvulnResult', '❌ Ingresa una URL'); return; }
    setOutput('webvulnResult', '🔍 Generando comandos...');
    setTimeout(function() {
        var clean = normalizeUrl(target);
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🔒 WEB VULNERABILITY SCANNING');
        lines.push('  Target: ' + esc(clean));
        lines.push('═'.repeat(50));
        lines.push('');
        if (tool === 'all' || tool === 'nikto') {
            lines.push('📌 Nikto');
            lines.push('   Instalar: sudo apt install nikto');
            lines.push(codeBlock('nikto -h ' + clean));
            lines.push(codeBlock('nikto -h ' + clean + ' -o nikto_report.html -F HTML -Tuning x'));
            lines.push('');
        }
        if (tool === 'all' || tool === 'zap') {
            lines.push('📌 OWASP ZAP');
            lines.push('   Instalar: sudo apt install zaproxy');
            lines.push(codeBlock('zaproxy'));
            lines.push(codeBlock('zap.sh -cmd -quickurl ' + clean + ' -quickout zap_report.html'));
            lines.push('');
        }
        lines.push('─'.repeat(50));
        lines.push('🧪 Test servers: testphp.vulnweb.com, juice-shop.herokuapp.com');
        lines.push('⚠️ Solo escanea sitios con autorización');
        setOutput('webvulnResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// BLUETOOTH SCANNING
// ============================================================
function runBluetoothScanning() {
    var target = ($('bluetoothTarget') ? $('bluetoothTarget').value : '').trim() || 'all';
    var tool = ($('bluetoothTool') ? $('bluetoothTool').value : 'all');
    if (target !== 'all' && !isValidMAC(target)) { setOutput('bluetoothResult', '❌ MAC inválida'); return; }
    setOutput('bluetoothResult', '🔍 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📶 BLUETOOTH SCANNING');
        lines.push('  Target: ' + esc(target));
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            bettercap: {n: 'Bettercap', i: 'sudo apt install bettercap', c: ['sudo bettercap -iface hci0', 'ble.recon on', 'ble.show']},
            bluetoothctl: {n: 'bluetoothctl', i: 'sudo apt install bluez bluez-tools', c: ['bluetoothctl', 'scan on', 'devices']},
            hcitool: {n: 'hcitool', i: 'sudo apt install bluez', c: ['sudo hcitool dev', 'sudo hcitool scan', 'sudo hcitool lescan']},
            btmon: {n: 'btmon', i: 'sudo apt install bluez', c: ['sudo btmon']},
            bluelog: {n: 'Bluelog', i: 'sudo apt install bluelog', c: ['sudo bluelog -i hci0 -o scan.log -v']}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo escanea con autorización');
        setOutput('bluetoothResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// RADIO FREQUENCY
// ============================================================
function runRadioScanning() {
    var freq = ($('radioFreq') ? $('radioFreq').value : '').trim() || '100000000';
    var tool = ($('radioTool') ? $('radioTool').value : 'all');
    setOutput('radioResult', '🔍 Generando comandos SDR...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📻 RADIO FREQUENCY');
        lines.push('  Frecuencia: ' + esc(freq) + ' Hz');
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            hackrf: {n: 'HackRF', i: 'sudo apt install hackrf', c: ['hackrf_info', 'hackrf_transfer -r capture.iq -f ' + freq + ' -s 2000000']},
            gnurdio: {n: 'GNU Radio', i: 'sudo apt install gnuradio', c: ['gnuradio-companion']},
            rtlsdr: {n: 'RTL-SDR', i: 'sudo apt install rtl-sdr', c: ['rtl_test', 'rtl_sdr -f ' + freq + ' -s 2000000 out.iq']},
            gqrx: {n: 'GQRX', i: 'sudo apt install gqrx-sdr', c: ['gqrx']},
            'sdr-sharp': {n: 'SDR#', i: 'Descargar de airspy.com', c: ['SDRSharp.exe']},
            'universal-radio-hacker': {n: 'URH', i: 'pip install urh', c: ['urh']}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Transmitir sin licencia es ilegal');
        setOutput('radioResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WIFI SCANNING
// ============================================================
function runWifiScanning() {
    var iface = ($('wifiIface') ? $('wifiIface').value : '').trim() || 'wlan0';
    var tool = ($('wifiTool') ? $('wifiTool').value : 'all');
    setOutput('wifiResult', '🔍 Generando comandos WiFi...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📡 WIFI SCANNING');
        lines.push('  Interface: ' + esc(iface));
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            bettercap: {n: 'Bettercap', i: 'sudo apt install bettercap', c: ['sudo bettercap -iface ' + iface, 'wifi.recon on', 'wifi.show']},
            'sparrow-wifi': {n: 'Sparrow-WiFi', i: 'git clone https://github.com/ghostop14/sparrow-wifi', c: ['python3 sparrow-wifi.py']},
            kismet: {n: 'Kismet', i: 'sudo apt install kismet', c: ['sudo kismet -c ' + iface]},
            airodump: {n: 'Airodump-ng', i: 'sudo apt install aircrack-ng', c: ['sudo airmon-ng start ' + iface, 'sudo airodump-ng ' + iface + 'mon']},
            airoplay: {n: 'Aireplay-ng', i: 'sudo apt install aircrack-ng', c: ['sudo aireplay-ng --test ' + iface + 'mon']},
            wifite: {n: 'Wifite', i: 'git clone https://github.com/derv82/wifite2', c: ['sudo wifite']},
            wash: {n: 'Wash', i: 'sudo apt install reaver', c: ['sudo wash -i ' + iface + 'mon']},
            reaver: {n: 'Reaver', i: 'sudo apt install reaver', c: ['sudo reaver -i ' + iface + 'mon -b <BSSID> -vv']}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo audita tu propia red o con autorización');
        setOutput('wifiResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// CREDENTIAL DUMPING
// ============================================================
function runCredentialDumping() {
    var target = ($('creddumpTarget') ? $('creddumpTarget').value : '').trim() || '/mnt/win';
    var tool = ($('creddumpTool') ? $('creddumpTool').value : 'all');
    setOutput('creddumpResult', '🔐 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🔐 OS CREDENTIAL DUMPING');
        lines.push('  Target: ' + esc(target));
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            samdump2: {n: 'samdump2', i: 'sudo apt install samdump2', c: ['samdump2 ' + target + '/SYSTEM ' + target + '/SAM > hashes.txt']},
            chntpw: {n: 'chntpw', i: 'sudo apt install chntpw', c: ['chntpw -l ' + target + '/SAM', 'chntpw -i ' + target + '/SAM']},
            creddump7: {n: 'creddump7', i: 'sudo apt install creddump7', c: ['pwdump.py ' + target + '/SYSTEM ' + target + '/SAM', 'lsadump.py ' + target + '/SYSTEM ' + target + '/SECURITY']},
            secretsdump: {n: 'secretsdump', i: 'pip install impacket', c: ['secretsdump.py -sam ' + target + '/SAM -system ' + target + '/SYSTEM -security ' + target + '/SECURITY LOCAL']},
            mimikatz: {n: 'Mimikatz', i: 'Descargar de GitHub', c: ['mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"']}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo extrae credenciales con autorización');
        setOutput('creddumpResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// HASH IDENTIFICATION
// ============================================================
function runHashIdentification() {
    var hash = ($('hashidTarget') ? $('hashidTarget').value : '').trim();
    var tool = ($('hashidTool') ? $('hashidTool').value : 'all');
    if (!hash) { setOutput('hashidResult', '❌ Ingresa un hash'); return; }
    setOutput('hashidResult', '🔍 Identificando hash...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  #️⃣ HASH IDENTIFICATION');
        lines.push('  Hash: ' + esc(hash));
        lines.push('  Longitud: ' + hash.length + ' caracteres');
        lines.push('═'.repeat(50));
        lines.push('');
        var detected = 'Desconocido';
        if (/^\$2[aby]\$/.test(hash)) detected = 'bcrypt';
        else if (/^\$1\$/.test(hash)) detected = 'MD5 Crypt';
        else if (/^\$5\$/.test(hash)) detected = 'SHA-256 Crypt';
        else if (/^\$6\$/.test(hash)) detected = 'SHA-512 Crypt';
        else if (hash.length === 32) detected = 'MD5 / NTLM / MD4';
        else if (hash.length === 40) detected = 'SHA-1';
        else if (hash.length === 64) detected = 'SHA-256';
        else if (hash.length === 128) detected = 'SHA-512';
        lines.push('📊 Tipo probable: ' + detected);
        lines.push('');
        var allTools = {
            hashid: {n: 'hashID', i: 'pip install hashid', c: ['hashid \'' + hash + '\'', 'hashid -m \'' + hash + '\'']},
            'hash-identifier': {n: 'Hash-Identifier', i: 'sudo apt install hash-identifier', c: ['hash-identifier ' + hash]},
            hashcrack: {n: 'hashcrack', i: 'pip install hashcrack-cli', c: ['hashcrack identify ' + hash]}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('💡 Usa hashid -m para modo hashcat');
        setOutput('hashidResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// PASSWORD PROFILING
// ============================================================
function runWordlistProfiling() {
    var target = ($('wordlistTarget') ? $('wordlistTarget').value : '').trim();
    var tool = ($('wordlistTool') ? $('wordlistTool').value : 'all');
    if (!target) { setOutput('wordlistResult', '❌ Ingresa un nombre o URL'); return; }
    setOutput('wordlistResult', '📝 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📝 PASSWORD PROFILING');
        lines.push('  Target: ' + esc(target));
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            bopscrk: {n: 'bopscrk', i: 'pip install bopscrk', c: ['bopscrk -i', 'bopscrk -w "' + target + '" -o bopscrk_wordlist.txt']},
            cewl: {n: 'CeWL', i: 'sudo apt install cewl', c: ['cewl ' + target + ' -d 3 -m 5 -w cewl_wordlist.txt']},
            crunch: {n: 'Crunch', i: 'sudo apt install crunch', c: ['crunch 8 8 -f /usr/share/crunch/charset.lst numeric -o numeric.txt']},
            pack: {n: 'PACK', i: 'git clone https://github.com/iphelix/pack', c: ['python statsgen.py wordlist.txt']},
            rsmangler: {n: 'RSMangler', i: 'sudo apt install rsmangler', c: ['rsmangler -f base_words.txt -e -a -o mangled.txt']},
            seclists: {n: 'SecLists', i: 'sudo apt install seclists', c: ['ls /usr/share/seclists/Passwords/']},
            twofi: {n: 'Twofi', i: 'sudo apt install twofi', c: ['twofi -u ' + target + ' -o twitter_wordlist.txt']}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo para auditorías con autorización');
        setOutput('wordlistResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// BRUTE FORCE
// ============================================================
function runBruteForce() {
    var target = ($('bruteforceTarget') ? $('bruteforceTarget').value : '').trim();
    var service = ($('bruteforceService') ? $('bruteforceService').value : 'ssh');
    var tool = ($('bruteforceTool') ? $('bruteforceTool').value : 'all');
    if (!target) { setOutput('bruteforceResult', '❌ Ingresa una IP o host'); return; }
    setOutput('bruteforceResult', '🔨 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🔨 BRUTE FORCE');
        lines.push('  Target: ' + esc(target));
        lines.push('  Servicio: ' + esc(service));
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            hydra: {n: 'Hydra', i: 'sudo apt install hydra', c: ['hydra -l admin -P /usr/share/wordlists/rockyou.txt ' + target + ' ' + service, 'hydra -L users.txt -P pass.txt ' + service + '://' + target]},
            'hydra-gtk': {n: 'Hydra-GTK', i: 'sudo apt install hydra-gtk', c: ['xhydra']},
            medusa: {n: 'Medusa', i: 'sudo apt install medusa', c: ['medusa -h ' + target + ' -u admin -P /usr/share/wordlists/rockyou.txt -M ' + service]},
            netexec: {n: 'NetExec', i: 'pip install netexec', c: ['nxc ' + service + ' ' + target + ' -u admin -p password', 'nxc ' + service + ' ' + target + ' -u users.txt -p pass.txt']},
            ncrack: {n: 'Ncrack', i: 'sudo apt install ncrack', c: ['ncrack -U users.txt -P pass.txt ' + service + '://' + target]},
            crowbar: {n: 'Crowbar', i: 'sudo apt install crowbar', c: ['crowbar -b rdp -s ' + target + '/32 -u admin -C pass.txt']},
            cat: {n: 'CAT (Context Application Tool)', i: 'Herramienta manual de pentest web', c: ['python3 cat.py -u http://' + target]}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo ataca sistemas con autorización escrita');
        setOutput('bruteforceResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// PASSWORD CRACKING
// ============================================================
function runPasswordCracking() {
    var target = ($('passcrackTarget') ? $('passcrackTarget').value : '').trim();
    var type = ($('passcrackType') ? $('passcrackType').value : 'md5');
    var tool = ($('passcrackTool') ? $('passcrackTool').value : 'all');
    if (!target) { setOutput('passcrackResult', '❌ Ingresa un hash o archivo'); return; }
    setOutput('passcrackResult', '🔓 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  🔓 PASSWORD CRACKING');
        lines.push('  Target: ' + esc(target));
        lines.push('  Tipo: ' + esc(type));
        lines.push('═'.repeat(50));
        lines.push('');
        var hashcatModes = {md5: '0', ntlm: '1000', sha1: '100', sha256: '1400', bcrypt: '3200'};
        var allTools = {
            hashcat: {n: 'Hashcat', i: 'sudo apt install hashcat hashcat-data', c: ['hashcat -m ' + (hashcatModes[type] || '0') + ' -a 0 ' + target + ' /usr/share/wordlists/rockyou.txt', 'hashcat -m ' + (hashcatModes[type] || '0') + ' -a 3 ' + target + ' ?a?a?a?a?a?a']},
            john: {n: 'John the Ripper', i: 'sudo apt install john john-data', c: ['john --wordlist=/usr/share/wordlists/rockyou.txt ' + target, 'john --format=' + type + ' ' + target + ' --wordlist=rockyou.txt']},
            fcrackzip: {n: 'fcrackzip', i: 'sudo apt install fcrackzip', c: ['fcrackzip -u -D -p /usr/share/wordlists/rockyou.txt ' + target, 'fcrackzip -u -b -c a1 -l 1-6 ' + target]},
            cmospwd: {n: 'cmospwd', i: 'sudo apt install cmospwd', c: ['cmospwd']},
            crackle: {n: 'Crackle', i: 'sudo apt install crackle', c: ['crackle -i ' + target, 'crackle -i ' + target + ' -o output']},
            truecrack: {n: 'Truecrack', i: 'git clone https://github.com/lvaccaro/truecrack', c: ['truecrack -t ' + target + ' -w /usr/share/wordlists/rockyou.txt']}
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo crackea hashes que te pertenezcan');
        setOutput('passcrackResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// UNSECURED CREDENTIALS
// ============================================================
function runUnsecuredCredentials() {
    var target = ($('unsecuredTarget') ? $('unsecuredTarget').value : '').trim() || '~/';
    var category = ($('unsecuredCategory') ? $('unsecuredCategory').value : 'all');
    setOutput('unsecuredResult', '📂 Enumerando credenciales...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📂 UNSECURED CREDENTIALS');
        lines.push('  Home: ' + esc(target));
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('  Referencia: MITRE ATT&CK T1552');
        lines.push('');
        var categories = {
            ssh: {n: 'SSH Keys', paths: ['~/.ssh/id_rsa', '~/.ssh/id_ed25519', '~/.ssh/authorized_keys'], risk: 'Permisos 0644 en privadas'},
            cloud: {n: 'Cloud Credentials', paths: ['~/.aws/credentials', '~/.config/gcloud/credentials.db', '~/.kube/config'], risk: 'Acceso a producción'},
            history: {n: 'Shell History', paths: ['~/.bash_history', '~/.zsh_history'], risk: 'Passwords en texto plano'},
            browser: {n: 'Browser', paths: ['~/.mozilla/firefox/*/logins.json', '~/.config/google-chrome/Default/Login Data'], risk: 'Passwords guardados'},
            keyring: {n: 'Keyring', paths: ['~/.local/share/keyrings/'], risk: 'Descifrado offline'},
            git: {n: 'Git', paths: ['~/.git-credentials', '~/.gitconfig'], risk: 'Tokens en texto plano'},
            tokens: {n: 'App Tokens', paths: ['~/.netrc', '~/.npmrc', '~/.config/gh/hosts.yml'], risk: 'Tokens de publicación'}
        };
        var cats = (category === 'all') ? Object.keys(categories) : [category];
        cats.forEach(function(k) {
            var c = categories[k];
            if (!c) return;
            lines.push('📌 ' + c.n);
            lines.push('   Rutas:');
            c.paths.forEach(function(p) { lines.push('      ' + p); });
            lines.push('   ⚠️ ' + c.risk);
            lines.push('');
        });
        lines.push('🔧 Comandos:');
        lines.push(codeBlock('find ~/.ssh -name "id_*" -type f ! -name "*.pub" -perm /o+r'));
        lines.push(codeBlock('grep -iE "password|secret|token" ~/.bash_history'));
        lines.push(codeBlock('ls -la ~/.aws/ ~/.config/gcloud/ ~/.kube/ 2>/dev/null'));
        lines.push('');
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo enumera sistemas con autorización');
        setOutput('unsecuredResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WIFI CREDENTIAL ACCESS
// ============================================================
function runWifiCredentialAccess() {
    var target = ($('wificredTarget') ? $('wificredTarget').value : '').trim();
    var tool = ($('wificredTool') ? $('wificredTool').value : 'all');
    if (!target) { setOutput('wificredResult', '❌ Ingresa un BSSID o ESSID'); return; }
    setOutput('wificredResult', '📶 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📶 WIFI CREDENTIAL ACCESS');
        lines.push('  Target: ' + esc(target));
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            'aircrack-ng': {
                n: 'Aircrack-ng',
                i: 'sudo apt install aircrack-ng',
                c: [
                    'aircrack-ng -w /usr/share/wordlists/rockyou.txt -b ' + target + ' capture-01.cap',
                    'aircrack-ng -w wordlist.txt capture-01.cap'
                ]
            },
            'wifi-honey': {
                n: 'Wifi-honey',
                i: 'sudo apt install wifi-honey',
                c: ['wifi-honey ' + target + ' 6 wlan0']
            },
            wifiphisher: {
                n: 'Wifiphisher',
                i: 'sudo apt install wifiphisher',
                c: [
                    'sudo wifiphisher -e "' + target + '" -p firmware-upgrade',
                    'sudo wifiphisher --essid ' + target + ' -p plugin_update'
                ]
            },
            wifite: {
                n: 'Wifite',
                i: 'sudo apt install wifite',
                c: [
                    'sudo wifite --bssid ' + target,
                    'sudo wifite --wpa --dict /usr/share/wordlists/rockyou.txt',
                    'sudo wifite --pmkid'
                ]
            },
            airgeddon: {
                n: 'Airgeddon',
                i: 'git clone https://github.com/v1s1t0r1sh3r3/airgeddon.git',
                c: [
                    'sudo bash ./airgeddon.sh',
                    '# Menu interactivo: seleccionar ataque'
                ]
            },
            bully: {
                n: 'Bully',
                i: 'sudo apt install bully pixiewps',
                c: [
                    'bully wlan0mon -b ' + target + ' -c 6 -d -v 3',
                    'bully wlan0mon -b ' + target + ' -c 6 -v 3'
                ]
            },
            'fern-wifi-cracker': {
                n: 'Fern WiFi Cracker',
                i: 'sudo apt install fern-wifi-cracker',
                c: [
                    'sudo fern-wifi-cracker',
                    '# GUI: Refresh -> Attack'
                ]
            },
            eapmd5pass: {
                n: 'eapmd5pass',
                i: 'sudo apt install eapmd5pass',
                c: [
                    'eapmd5pass -r capture.pcap -w /usr/share/wordlists/rockyou.txt',
                    'eapmd5pass -i wlan0 -w wordlist.txt'
                ]
            }
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo ataca redes con autorización escrita');
        setOutput('wificredResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// KEYLOGGER
// ============================================================
function runKeylogger() {
    var target = ($('keyloggerTarget') ? $('keyloggerTarget').value : '').trim();
    var port = ($('keyloggerPort') ? $('keyloggerPort').value : '').trim() || '6000';
    var timeout = ($('keyloggerTimeout') ? $('keyloggerTimeout').value : '').trim() || '600';
    if (!target) { setOutput('keyloggerResult', '❌ Ingresa una IP objetivo'); return; }
    setOutput('keyloggerResult', '⌨️ Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  ⌨️ KEYLOGGER (X11 Keyboard Spy)');
        lines.push('  Target: ' + esc(target));
        lines.push('  Puerto: ' + esc(port));
        lines.push('  Timeout: ' + esc(timeout) + ' segundos');
        lines.push('═'.repeat(50));
        lines.push('');
        lines.push('📌 Xspy via Metasploit');
        lines.push('   Instalar: sudo apt install metasploit-framework');
        lines.push('');
        lines.push('🔧 Paso 1: Escanear puerto X11');
        lines.push(codeBlock('msfconsole'));
        lines.push(codeBlock('use auxiliary/scanner/x11/open_x11'));
        lines.push(codeBlock('set rhosts ' + target));
        lines.push(codeBlock('run'));
        lines.push('');
        lines.push('🔧 Paso 2: Capturar teclado');
        lines.push(codeBlock('use auxiliary/gather/x11_keyboard_spy'));
        lines.push(codeBlock('set rhosts ' + target));
        lines.push(codeBlock('set rport ' + port));
        lines.push(codeBlock('set LISTENER_TIMEOUT ' + timeout));
        lines.push(codeBlock('run'));
        lines.push('');
        lines.push('📝 Notas:');
        lines.push('   • LISTENER_TIMEOUT 0 = escucha permanente');
        lines.push('   • PRINTERVAL ajusta el intervalo de salida');
        lines.push('   • El target debe tener el puerto X11 abierto (6000 por defecto)');
        lines.push('');
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo monitorea sistemas que te pertenezcan');
        setOutput('keyloggerResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// VOIP CREDENTIAL ACCESS
// ============================================================
function runVoipCredentialAccess() {
    var target = ($('voipTarget') ? $('voipTarget').value : '').trim();
    var user = ($('voipUser') ? $('voipUser').value : '').trim();
    var tool = ($('voipTool') ? $('voipTool').value : 'all');
    if (!target) { setOutput('voipResult', '❌ Ingresa una IP objetivo'); return; }
    setOutput('voipResult', '📞 Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('═'.repeat(50));
        lines.push('  📞 VOIP CREDENTIAL ACCESS');
        lines.push('  Target: ' + esc(target));
        lines.push('  Usuario: ' + (esc(user) || 'No especificado'));
        lines.push('═'.repeat(50));
        lines.push('');
        var allTools = {
            svcrack: {
                n: 'SVCrack (SIPVicious)',
                i: 'sudo apt install sipvicious',
                c: [
                    'sipvicious_svcrack -u' + (user || '100') + ' -r1-9999 ' + target,
                    'sipvicious_svcrack -u' + (user || '100') + ' -d dictionary.txt ' + target
                ]
            },
            enumiax: {
                n: 'Enumiax',
                i: 'sudo apt install enumiax',
                c: [
                    'enumiax ' + target,
                    'enumiax ' + target + ' -p 4569',
                    'enumiax -v -o results.txt ' + target
                ]
            }
        };
        var keys = (tool === 'all') ? Object.keys(allTools) : [tool];
        keys.forEach(function(k) {
            var t = allTools[k];
            if (!t) return;
            lines.push('📌 ' + t.n);
            lines.push('   Instalar: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('🔧 Flujo recomendado:');
        lines.push(codeBlock('sipvicious_svmap ' + target));
        lines.push(codeBlock('sipvicious_svwar -e100-999 ' + target));
        lines.push(codeBlock('sipvicious_svcrack -u' + (user || '100') + ' -r1-9999 ' + target));
        lines.push('');
        lines.push('─'.repeat(50));
        lines.push('⚠️ Solo ataca sistemas VoIP con autorización');
        setOutput('voipResult', lines.join('<br>'));
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
window.runBruteForce = runBruteForce;
window.runPasswordCracking = runPasswordCracking;
window.runUnsecuredCredentials = runUnsecuredCredentials;
window.runWifiCredentialAccess = runWifiCredentialAccess;
window.runKeylogger = runKeylogger;
window.runVoipCredentialAccess = runVoipCredentialAccess;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ MFH TOOLS - script-tools.js cargado correctamente');
    console.log('📦 Herramientas disponibles: ' + AVAILABLE_TOOLS.length);
    console.log('🔍 Reconocimiento: 10 herramientas');
    console.log('🔐 Acceso con Credenciales: 9 herramientas');
});
