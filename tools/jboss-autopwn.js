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

// ============================================================
// REPORTE
// ============================================================
/**
 * JBoss-Autopwn es un generador de comandos, no un lanzador de JBoss-Autopwn.
 * No ejecuta nada: no lanza e.sh, e2.sh, jboss-linux ni jboss-win. Solo imprime
 * comandos con target/port/os interpolados condicionalmente.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, comando generado (Linux: ./e.sh,
 *   Windows: ./e2.sh), alternativa directa (jboss-linux / jboss-win),
 *   cómo funciona (4 pasos), scripts incluidos, requisitos y advertencia legal.
 * - SÍ interpola target/port en el comando generado (script) y en la alternativa
 *   directa (wrapper).
 * - Lógica condicional: --os linux → e.sh + jboss-linux;
 *   --os windows → e2.sh + jboss-win.
 *
 * Bugs funcionales conocidos:
 * - --os NO VALIDA: cualquier valor que no sea 'linux' se trata como Windows
 *   (ej: --os macos genera e2.sh + jboss-win). Bug grave.
 * - No valida target/port: acepta 'noesunaip', 'noesunpuerto', etc.
 * - INYECCIÓN POR COPIAR/PEGAR: target/port se interpolan sin sanitizar en
 *   2 comandos (script y wrapper).
 *   Ej: --target "192.168.1.10; rm -rf /" genera comando con "; rm -rf /".
 * - --url NO EXISTE: solo target/port/os.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 * - Defaults funcionan (target=192.168.1.200, port=8080, os=linux).
 *
 * Ventaja funcional:
 * - Interpola target/port/os en 2 comandos (script y wrapper).
 * - Lógica condicional: Linux vs Windows (e.sh/e2.sh, jboss-linux/jboss-win).
 * - Documentación real: cómo funciona (detecta versión, elige payload,
 *   deploya JSP shell, shell interactivo), scripts incluidos (e.sh, e2.sh,
 *   jboss-linux, jboss-win), requisitos (JBoss, JMX/Web Console, autorización).
 * - Herramienta coherente: jboss-autopwn es JBoss exploitation.
 *
 * Limitaciones:
 * - No ejecuta e.sh, e2.sh, jboss-linux ni jboss-win.
 * - No explota JBoss real.
 * - --os no valida (macos → Windows).
 * - No valida target/port.
 * - --url no existe.
 * - Riesgo de inyección por copiar/pegar (2 comandos).
 * - Solo 1 herramienta (jboss-autopwn).
 *
 * Veredicto:
 * El nombre "JBoss AutoPwn" promete JBoss AutoPwn. Entrega un recetario REAL
 * de jboss-autopwn con comandos personalizados (target/port/os) y lógica
 * condicional Linux/Windows, pero sin ejecutar nada. Sigue siendo un generador
 * de comandos.
 */
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

// ============================================================
// CLI
// ============================================================
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
