/**
 * MFH TOOLS - Script del apartado Herramientas de Ciberseguridad
 * Fases 1 y 2 completas
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
        dns: 'dnsTab',
        webscan: 'webscanTab',
        vulnscan: 'vulnscanTab',
        webvuln: 'webvulnTab'
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
    'dns-information.js',
    'web-scanning.js',
    'vulnerability-scanning.js',
    'web-vulnerability-scanning.js'
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
    const el
