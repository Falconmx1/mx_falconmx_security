#!/usr/bin/env node
/**
 * MFH TOOLS - JBoss Linux
 * Categoria: Acceso Inicial
 *
 * Uso: node jboss-linux.js --target <ip> [--port 8080]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

function printReport(target, port) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  JBOSS LINUX');
    console.log('  Target: ' + (target || '192.168.1.200'));
    console.log('  Puerto: ' + (port || '8080'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] jboss-linux');
    console.log('    jboss-autopwn is a tool to automate the exploitation of JBoss Application Server. jboss-linux targets Linux hosts ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install jboss-autopwn');
    console.log('    # Dependencias: curl, metasploit-framework');
    console.log('');
    console.log('  [Comando generado]');
    console.log('    jboss-linux ' + (target || '192.168.1.200') + ' ' + (port || '8080') + ' 2> /dev/null');
    console.log('');
    console.log('  [Como funciona]');
    console.log('    1. Detecta la version de JBoss AS');
    console.log('    2. Deploya un JSP shell (cmd.jsp o similar)');
    console.log('    3. Ejecuta comandos en el servidor via HTTP');
    console.log('    4. Abre bind shell o reverse shell');
    console.log('');
    console.log('  [Requisitos]');
    console.log('    - JBoss Application Server accesible en el puerto 8080');
    console.log('    - Consola de administracion (/jmx-console o /web-console)');
    console.log('    - Credenciales por defecto o acceso sin auth');
    console.log('');
    console.log('  [Alternativas]');
    console.log('    # Reverse shell manual:');
    console.log('    curl http://' + (target || 'target') + ':' + (port || '8080') + '/shell/cmd.jsp?cmd=id');
    console.log('');
    console.log('    # Deploy manual con JMX:');
    console.log('    Metasploit: use exploit/multi/http/jboss_maindeployer');
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

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - JBoss Linux v' + CONFIG.version + '                    |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node jboss-linux.js --target <ip> [--port 8080]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node jboss-linux.js --target 192.168.1.200 --port 8080');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : '192.168.1.200';
    var port = portIdx !== -1 ? args[portIdx + 1] : '8080';

    console.log('\nGenerando comandos JBoss Linux...\n');
    printReport(target, port);
}

main();
