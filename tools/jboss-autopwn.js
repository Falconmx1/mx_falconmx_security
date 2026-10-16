#!/usr/bin/env node
/**
 * MFH TOOLS - JBoss AutoPwn
 * Categoria: Acceso Inicial
 *
 * Uso: node jboss-autopwn.js --target <ip> [--port 8080] [--os linux|windows]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

function printReport(target, port, os) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  JBOSS AUTOPWN');
    console.log('  Target: ' + (target || '192.168.1.200'));
    console.log('  Puerto: ' + (port || '8080'));
    console.log('  OS: ' + (os || 'linux'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] jboss-autopwn');
    console.log('    jboss-autopwn is a collection of scripts to automate the exploitation of JBoss Application Server ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install jboss-autopwn');
    console.log('    # Dependencias: curl, netcat, metasploit-framework');
    console.log('');
    if (os === 'linux') {
        console.log('  [Comando generado (Linux)]');
        console.log('    ./e.sh ' + (target || '192.168.1.200') + ' ' + (port || '8080'));
        console.log('');
        console.log('  [Alternativa directa]');
        console.log('    jboss-linux ' + (target || '192.168.1.200') + ' ' + (port || '8080') + ' 2> /dev/null');
        console.log('');
    } else {
        console.log('  [Comando generado (Windows)]');
        console.log('    ./e2.sh ' + (target || '192.168.1.200') + ' ' + (port || '8080'));
        console.log('');
        console.log('  [Alternativa directa]');
        console.log('    jboss-win ' + (target || '192.168.1.200') + ' ' + (port || '8080') + ' 2> /dev/null');
        console.log('');
    }
    console.log('  [Como funciona]');
    console.log('    1. Detecta la version de JBoss AS en el target');
    console.log('    2. Elige el payload adecuado (bind_tcp, reverse_tcp)');
    console.log('    3. Deploya JSP shell en el servidor');
    console.log('    4. Proporciona shell interactivo');
    console.log('');
    console.log('  [Scripts incluidos]');
    console.log('    e.sh       - Explotacion para Linux');
    console.log('    e2.sh      - Explotacion para Windows');
    console.log('    jboss-linux - Wrapper directo para Linux');
    console.log('    jboss-win  - Wrapper directo para Windows');
    console.log('');
    console.log('  [Requisitos]');
    console.log('    - JBoss AS accesible (puerto 8080)');
    console.log('    - Consola JMX o Web Console expuesta');
    console.log('    - Autorizacion escrita del dueno del servidor');
    console.log('');
    console.log('-'.repeat(65));
    console.log('  WARN: solo ataca sistemas con autorizacion escrita');
    console.log('-'.repeat(65));
    console.log('');
}

function main() {
    var args = process.argv.slice(2);
    var targetIdx = args.indexOf('--target');
    var portIdx = args.indexOf('--port');
    var osIdx = args.indexOf('--os');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - JBoss AutoPwn v' + CONFIG.version + '                 |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node jboss-autopwn.js --target <ip> [--port 8080] [--os linux|windows]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node jboss-autopwn.js --target 192.168.1.200 --port 8080');
        console.log('    node jboss-autopwn.js --target 192.168.1.200 --port 8080 --os windows');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : '192.168.1.200';
    var port = portIdx !== -1 ? args[portIdx + 1] : '8080';
    var os = osIdx !== -1 ? args[osIdx + 1] : 'linux';

    console.log('\nGenerando comandos JBoss AutoPwn...\n');
    printReport(target, port, os);
}

main();
