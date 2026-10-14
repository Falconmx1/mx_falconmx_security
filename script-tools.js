/**
 * MFH TOOLS - Script del apartado Herramientas de Ciberseguridad
 * Fase 1: Reconocimiento
 * 
 * Sin dependencias externas. Sin 404. Sin errores.
 */

'use strict';

// ============================================================
// TEMA CLARO / OSCURO
// ============================================================
(function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    if (!themeToggle || !body) return;

    if (localStorage.getItem('theme') === 'light') {
        body.classList.add('light-mode');
        themeToggle.classList.remove('fa-sun');
        themeToggle.classList.add('fa-moon');
    }

    themeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        const isLight = body.classList.contains('light-mode');
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
// NAVEGACIÓN ENTRE TABS
// ============================================================
function showTool(tool) {
    const tabMap = {
        host: 'hostTab',
        identity: 'identityTab',
        network: 'networkTab',
        dns: 'dnsTab'
    };
    const tabId = tabMap[tool];
    if (!tabId) return;
    const trigger = document.querySelector('button[data-bs-target="#' + tabId + '"]');
    if (trigger && typeof bootstrap !== 'undefined') {
        bootstrap.Tab.getOrCreateInstance(trigger).show();
    }
    const panel = document.getElementById('herramientas');
    if (panel) panel.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================
// DESCARGA DE HERRAMIENTAS (sin 404)
// ============================================================
const AVAILABLE_TOOLS = [
    'host-information.js',
    'identity-information.js',
    'network-information.js',
    'dns-information.js'
];

function downloadTool(filename) {
    if (!filename) return;
    
    if (!AVAILABLE_TOOLS.includes(filename)) {
        alert('⚠️ La herramienta "' + filename + '" aún no está disponible.\nPronto estará lista.');
        return;
    }

    const link = document.createElement('a');
    link.href = 'tools/' + filename;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
        if (link.parentNode) link.parentNode.removeChild(link);
    }, 100);
}

// ============================================================
// UTILIDADES
// ============================================================
function $(id) { return document.getElementById(id); }
function setOutput(id, html) {
    const el = $(id);
    if (el) el.innerHTML = html;
}
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function now() {
    return new Date().toISOString();
}
function isValidDomain(d) {
    return /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(d);
}
function isValidIP(ip) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
    return ip.split('.').every(n => {
        const num = parseInt(n, 10);
        return num >= 0 && num <= 255;
    });
}

// ============================================================
// HOST INFORMATION
// ============================================================
async function runHostInfo() {
    const target = ($('hostTarget')?.value || '').trim();
    if (!target) {
        setOutput('hostResult', '❌ Ingresa un dominio o IP');
        return;
    }

    setOutput('hostResult', '🔍 Analizando host: ' + esc(target) + '...<br>');

    await new Promise(r => setTimeout(r, 600));

    const clean = target.replace(/^https?:\/\//, '').split('/')[0];
    const isIP = isValidIP(clean);
    const isDomain = isValidDomain(clean);

    if (!isIP && !isDomain) {
        setOutput('hostResult', '❌ Formato inválido. Ingresa un dominio (ejemplo.com) o IP (8.8.8.8)');
        return;
    }

    const lines = [];
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

    // Análisis de amenazas
    lines.push('🛡️ Análisis heurístico:');
    const suspicious = [];
    if (/\d{4,}/.test(clean)) suspicious.push('Contiene secuencia numérica larga (posible DGA)');
    if (/\.(xyz|top|club|work|click|loan|bid|tk|ml|ga|cf)$/.test(clean)) suspicious.push('TLD frecuentemente abusado');
    if (clean.length > 50) suspicious.push('Dominio excesivamente largo (posible phishing)');
    if (clean.includes('--')) suspicious.push('Contiene doble guion (posible IDN homograph)');

    if (suspicious.length === 0) {
        lines.push('   ✅ Sin patrones sospechosos detectados');
    } else {
        suspicious.forEach(s => lines.push('   ⚠️ ' + s));
    }
    lines.push('');

    // Info del navegador
    lines.push('🌐 Información del navegador:');
    lines.push('   • User Agent: ' + esc(navigator.userAgent.substring(0, 60)) + '...');
    lines.push('   • Idioma: ' + esc(navigator.language));
    lines.push('   • Plataforma: ' + esc(navigator.platform || 'N/A'));
    lines.push('   • Online: ' + (navigator.onLine ? '✅ Sí' : '❌ No'));
    lines.push('');

    // Protocolo
    lines.push('🔒 Protocolo sugerido:');
    lines.push('   • HTTPS: https://' + esc(clean));
    lines.push('   • HTTP:  http://' + esc(clean));
    lines.push('');

    lines.push('─'.repeat(50));
    lines.push('💡 Para análisis completo, descarga el .js y ejecuta:');
    lines.push('   node tools/host-information.js --target ' + esc(clean));

    setOutput('hostResult', lines.join('<br>'));
}

// ============================================================
// IDENTITY INFORMATION
// ============================================================
async function runIdentityInfo() {
    const target = ($('identityTarget')?.value || '').trim();
    if (!target) {
        setOutput('identityResult', '❌ Ingresa un email o usuario');
        return;
    }

    setOutput('identityResult', '🔍 Analizando identidad: ' + esc(target) + '...<br>');
    await new Promise(r => setTimeout(r, 600));

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
    const parts = target.split('@');
    const user = parts[0] || target;
    const domain = parts[1] || '(sin dominio)';

    const lines = [];
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
    const warnings = [];
    if (user.length < 4) warnings.push('Usuario muy corto');
    if (/\d{4,}/.test(user)) warnings.push('Contiene muchos números');
    if (/^(admin|root|test|user|info|support)$/i.test(user)) warnings.push('Usuario genérico común');
    if (!domain.includes('.')) warnings.push('Dominio sin TLD válido');

    if (warnings.length === 0) {
        lines.push('   ✅ Sin patrones sospechosos');
    } else {
        warnings.forEach(w => lines.push('   ⚠️ ' + w));
    }
    lines.push('');

    lines.push('🔍 Recomendaciones OSINT:');
    lines.push('   • Buscar en: haveibeenpwned.com');
    lines.push('   • Buscar en: hunter.io (requiere API)');
    lines.push('   • Google dork: "' + esc(target) + '" -site:' + esc(domain));
    lines.push('');

    lines.push('─'.repeat(50));
    lines.push('💡 Descarga identity-information.js para más análisis:');
    lines.push('   node tools/identity-information.js --target ' + esc(target));

    setOutput('identityResult', lines.join('<br>'));
}

// ============================================================
// NETWORK INFORMATION
// ============================================================
async function runNetworkInfo() {
    const target = ($('networkTarget')?.value || '').trim();
    if (!target) {
        setOutput('networkResult', '❌ Ingresa una IP o rango');
        return;
    }

    setOutput('networkResult', '🔍 Analizando red: ' + esc(target) + '...<br>');
    await new Promise(r => setTimeout(r, 600));

    const isIP = isValidIP(target);
    const isPrivate = isIP && (
        target.startsWith('10.') ||
        target.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(target) ||
        target.startsWith('127.')
    );

    const lines = [];
    lines.push('═'.repeat(50));
    lines.push('  🌐 NETWORK INFORMATION REPORT');
    lines.push('  Target: ' + esc(target));
    lines.push('  Fecha: ' + now());
    lines.push('═'.repeat(50));
    lines.push('');
    lines.push('🔢 Clasificación:');
    lines.push('   • Formato válido: ' + (isIP ? '✅ Sí' : '❌ No'));
    lines.push('   • Tipo: ' + (isPrivate ? '🔒 IP Privada (RFC 1918)' : '🌍 IP Pública'));

    if (isIP) {
        const parts = target.split('.').map(n => parseInt(n, 10));
        let clase = 'Desconocida';
        if (parts[0] >= 1 && parts[0] <= 126) clase = 'A';
        else if (parts[0] >= 128 && parts[0] <= 191) clase = 'B';
        else if (parts[0] >= 192 && parts[0] <= 223) clase = 'C';
        else if (parts[0] >= 224 && parts[0] <= 239) clase = 'D (Multicast)';
        else if (parts[0] >= 240) clase = 'E (Reservada)';
        lines.push('   • Clase: ' + clase);

        const binary = parts.map(n => n.toString(2).padStart(8, '0')).join('.');
        const hex = parts.map(n => n.toString(16).padStart(2, '0')).join(':');
        lines.push('   • Binario: ' + binary);
        lines.push('   • Hex: ' + hex);
    }
    lines.push('');

    lines.push('🔍 Rangos privados conocidos:');
    lines.push('   • 10.0.0.0/8');
    lines.push('   • 172.16.0.0/12');
    lines.push('   • 192.168.0.0/16');
    lines.push('   • 127.0.0.0/8 (loopback)');
    lines.push('');

    lines.push('🌐 APIs recomendadas (requieren API key):');
    lines.push('   • ipinfo.io');
    lines.push('   • ipapi.co');
    lines.push('   • ipgeolocation.io');
    lines.push('');

    lines.push('─'.repeat(50));
    lines.push('💡 Descarga network-information.js para análisis extendido:');
    lines.push('   node tools/network-information.js --target ' + esc(target));

    setOutput('networkResult', lines.join('<br>'));
}

// ============================================================
// DNS INFORMATION
// ============================================================
async function runDnsInfo() {
    const target = ($('dnsTarget')?.value || '').trim();
    const type = $('dnsType')?.value || 'A';

    if (!target) {
        setOutput('dnsResult', '❌ Ingresa un dominio');
        return;
    }

    if (!isValidDomain(target)) {
        setOutput('dnsResult', '❌ Formato de dominio inválido');
        return;
    }

    setOutput('dnsResult', '🔍 Consultando registros ' + esc(type) + ' para ' + esc(target) + '...<br>');
    await new Promise(r => setTimeout(r, 700));

    const lines = [];
    lines.push('═'.repeat(50));
    lines.push('  📡 DNS INFORMATION REPORT');
    lines.push('  Dominio: ' + esc(target));
    lines.push('  Tipo: ' + esc(type));
    lines.push('  Fecha: ' + now());
    lines.push('═'.repeat(50));
    lines.push('');

    // Nota honesta: el navegador no puede hacer DNS lookup real
    lines.push('⚠️ El navegador no puede hacer DNS lookup real.');
    lines.push('   Los resultados mostrados son de referencia.');
    lines.push('');

    const dnsInfo = {
        A: 'Registro A: dirección IPv4 del dominio',
        AAAA: 'Registro AAAA: dirección IPv6 del dominio',
        MX: 'Registro MX: servidores de correo (con prioridad)',
        NS: 'Registro NS: servidores de nombres autoritativos',
        TXT: 'Registro TXT: texto (SPF, DKIM, DMARC, verificaciones)',
        CNAME: 'Registro CNAME: alias del dominio',
        SOA: 'Registro SOA: información de autoridad de la zona',
        ALL: 'Todos los registros DNS disponibles'
    };

    if (type === 'ALL') {
        lines.push('📋 Tipos de registros DNS:');
        Object.keys(dnsInfo).forEach(k => {
            if (k !== 'ALL') lines.push('   • ' + k + ': ' + dnsInfo[k]);
        });
    } else {
        lines.push('📋 ' + dnsInfo[type]);
    }
    lines.push('');

    lines.push('🔍 Consultas recomendadas (terminal):');
    lines.push('   nslookup -type=' + type + ' ' + esc(target));
    lines.push('   dig ' + esc(target) + ' ' + type);
    lines.push('   host -t ' + type + ' ' + esc(target));
    lines.push('');

    lines.push('🌐 Herramientas online (sin API key):');
    lines.push('   • https://dns.google/query?name=' + esc(target) + '&type=' + type);
    lines.push('   • https://www.whatsmydns.net/#A/' + esc(target));
    lines.push('   • https://dnschecker.org/#A/' + esc(target));
    lines.push('');

    lines.push('─'.repeat(50));
    lines.push('💡 Descarga dns-information.js para más análisis:');
    lines.push('   node tools/dns-information.js --target ' + esc(target) + ' --type ' + type);

    setOutput('dnsResult', lines.join('<br>'));
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ MFH TOOLS - script-tools.js cargado correctamente');
    console.log('📦 Herramientas disponibles para descarga:', AVAILABLE_TOOLS.join(', '));
});

// Exportar funciones globales
window.showTool = showTool;
window.downloadTool = downloadTool;
window.runHostInfo = runHostInfo;
window.runIdentityInfo = runIdentityInfo;
window.runNetworkInfo = runNetworkInfo;
window.runDnsInfo = runDnsInfo;
