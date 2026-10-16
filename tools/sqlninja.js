#!/usr/bin/env node
/**
 * MFH TOOLS - SQLNinja
 * Categoria: Acceso Inicial
 *
 * Uso: node sqlninja.js --target <host:port> [--mode <t|f|b|e|x|u|s|r|d|m>] [--config <file>]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

const MODES = {
    t: 'test - Probar si la inyeccion funciona',
    f: 'fingerprint - Fingerprint user, xp_cmdshell, version',
    b: 'bruteforce - Bruteforce de la cuenta sa',
    e: 'escalation - Agregar usuario a sysadmin',
    x: 'resurrectxp - Recrear xp_cmdshell',
    u: 'upload - Subir archivo .scr',
    s: 'dirshell - Shell directo',
    r: 'revshell - Reverse shell',
    d: 'dnstunnel - Tunel DNS',
    m: 'metasploit - Wrapper a Metasploit'
};

function printReport(target, mode, config) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  SQLNINJA - MSSQL Injection Toolkit');
    console.log('  Target: ' + (target || '192.168.1.51:80'));
    console.log('  Modo: ' + (mode || 't') + ' (' + (MODES[mode] || 'test') + ')');
    console.log('  Config: ' + (config || 'sqlninja.conf'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] sqlninja');
    console.log('    sqlninja is a tool to exploit SQL Injection vulnerabilities on a web application that uses Microsoft SQL Server as its back-end ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install sqlninja');
    console.log('');
    console.log('  [Comando generado]');
    console.log('    sqlninja -m ' + (mode || 't') + ' -f ' + (config || 'sqlninja.conf'));
    console.log('');
    console.log('  [Modos disponibles]');
    Object.keys(MODES).forEach(function(k) {
        console.log('    -m ' + k + '    ' + MODES[k]);
    });
    console.log('');
    console.log('  [Configuracion]');
    console.log('    1. Copiar plantilla: cp /usr/share/sqlninja/sqlninja.conf .');
    console.log('    2. Editar sqlninja.conf con el request HTTP (de Burp)');
    console.log('    3. Ajustar parametros de inyeccion y opciones');
    console.log('');
    console.log('  [Notas]');
    console.log('    - Especializado en Microsoft SQL Server');
    console.log('    - Requiere request HTTP capturado con Burp Suite');
    console.log('    - Usa xp_cmdshell para ejecucion de comandos');
    console.log('    - Documentacion: https://sqlninja.sourceforge.net/');
    console.log('');
    console.log('-'.repeat(65));
    console.log('  WARN: solo ataca sistemas con autorizacion escrita');
    console.log('-'.repeat(65));
    console.log('');
}

function main() {
    var args = process.argv.slice(2);
    var targetIdx = args.indexOf('--target');
    var modeIdx = args.indexOf('--mode');
    var configIdx = args.indexOf('--config');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - SQLNinja v' + CONFIG.version + '                      |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node sqlninja.js --target <host:port> [--mode <t|f|b|e|x|u|s|r|d|m>] [--config <file>]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node sqlninja.js --target 192.168.1.51:80 --mode t');
        console.log('    node sqlninja.js --target 192.168.1.51:80 --mode e --config target.conf');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : '192.168.1.51:80';
    var mode = modeIdx !== -1 ? args[modeIdx + 1] : 't';
    var config = configIdx !== -1 ? args[configIdx + 1] : 'sqlninja.conf';

    console.log('\nGenerando comandos SQLNinja...\n');
    printReport(target, mode, config);
}

main();
