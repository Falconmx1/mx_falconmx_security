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

// ============================================================
// REPORTE
// ============================================================
/**
 * Commix es un generador de comandos, no un lanzador de Commix.
 * No ejecuta nada: no lanza commix. Solo imprime comandos con
 * url/data/level interpolados condicionalmente.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, detección básica, nivel específico,
 *   OS shell (si --os-shell), comando único, técnicas de inyección,
 *   opciones útiles y advertencia legal.
 * - SÍ interpola url/data en detección básica y nivel específico.
 * - SÍ interpola level en "con nivel específico".
 * - Lógica condicional: --os-shell → bloque [OS Shell interactivo].
 * - Documentación real: técnicas (classic, timebased, filebased, semi-blind),
 *   opciones (--tamper, -r, --batch, --random-agent, --cookie).
 *
 * Bugs funcionales conocidos:
 * - --os-cmd NO EXISTE: solo --os-shell (booleano). El comando único se
 *   muestra con --os-cmd="whoami" FIJO, ignorando el --os-cmd del usuario.
 * - --level no valida: acepta --level 5 aunque Commix solo acepta 1-3.
 * - --url sin valor genera "commix --url='undefined'" (bug grave).
 * - No valida url/data/level: acepta 'noesunaurl', 'noesundata', etc.
 * - INYECCIÓN POR COPIAR/PEGAR: url/data se interpolan sin sanitizar.
 *   Ej: --url "http://example.com; rm -rf /" genera comando con "; rm -rf /".
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 * - Defaults funcionan (url=http://target.com/ping?ip=127.0.0.1, level=1,
 *   data=vacío, osShell=false).
 *
 * Ventaja funcional:
 * - Interpola url/data/level en múltiples comandos (detección básica,
 *   nivel específico, OS shell, comando único).
 * - Lógica condicional: --os-shell → bloque OS shell.
 * - Documentación real: técnicas (classic, timebased, filebased, semi-blind),
 *   opciones (--tamper=base64encode, -r, --batch, --random-agent, --cookie).
 * - Herramienta coherente: Commix es command injection.
 *
 * Limitaciones:
 * - No ejecuta commix.
 * - No hace command injection real.
 * - No valida url/data/level.
 * - --os-cmd no existe (solo --os-shell).
 * - --level 5 se acepta.
 * - --url sin valor → "undefined".
 * - Riesgo de inyección por copiar/pegar.
 * - Solo 1 herramienta (Commix).
 *
 * Veredicto:
 * El nombre "Commix" promete Commix. Entrega un recetario REAL de Commix
 * con comandos personalizados y lógica condicional (os-shell), pero sin
 * ejecutar nada. Sigue siendo un generador de comandos.
 */
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

// ============================================================
// CLI
// ============================================================
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
