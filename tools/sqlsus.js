#!/usr/bin/env node
/**
 * MFH TOOLS - SQLSus
 * Categoria: Acceso Inicial
 *
 * Uso: node sqlsus.js --target <url> [--config <file>] [--cmd <command>]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// REPORTE
// ============================================================
/**
 * SQLSus es un generador de comandos, no un lanzador de SQLSus.
 * No ejecuta nada: no lanza sqlsus. Solo imprime comandos con
 * config/cmd interpolados (target NO se usa en comandos).
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, flujo de trabajo (genconf, editar
 *   config, shell), comando generado (si --cmd), shell interactivo con
 *   12 comandos, notas reales y advertencia legal.
 * - SÍ interpola config en --genconf y en el comando shell.
 * - SÍ interpola cmd en el comando generado (sqlsus <config> -e '<cmd>').
 * - Lógica condicional: cmd → comando generado, sin cmd → shell interactivo.
 * - NO interpola target: --target solo se muestra en el header.
 *
 * Bugs funcionales conocidos:
 * - --target es DECORATIVO: solo se muestra en el header. Los comandos
 *   (sqlsus --genconf target.cfg, sqlsus target.cfg) NO incluyen el target.
 *   El usuario pasa --target esperando que se use, pero no.
 * - No valida target/config/cmd: acepta 'noesuntarget', 'noesunconfig', etc.
 * - INYECCIÓN POR COPIAR/PEGAR: config/cmd se interpolan sin sanitizar.
 *   Ej: --config "target.cfg; rm -rf /" genera "sqlsus target.cfg; rm -rf /".
 * - --url y --host NO EXISTEN: solo target/config/cmd.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 * - Defaults funcionan (target=http://ejemplo.com/page.php?id=1,
 *   config=target.cfg, cmd=vacío → shell interactivo).
 *
 * Ventaja funcional:
 * - Interpola config/cmd en los comandos.
 * - Lógica condicional: cmd → comando generado, sin cmd → shell interactivo.
 * - 12 comandos del shell (start, get tables, get columns, get version,
 *   get users, get privileges, get dbs, dump, clone, exec, help, quit).
 * - Documentación real: flujo (genconf, editar config, shell), notas
 *   (MySQL, SQLite cache, Perl, doc).
 * - Herramienta coherente: sqlsus es MySQL injection.
 *
 * Limitaciones:
 * - No ejecuta sqlsus.
 * - No hace SQL injection real.
 * - No valida target/config/cmd.
 * - --target decorativo.
 * - Riesgo de inyección por copiar/pegar.
 * - Solo 1 herramienta (sqlsus).
 *
 * Veredicto:
 * El nombre "SQLSus" promete SQLSus. Entrega un recetario REAL de sqlsus
 * con comandos personalizados (config/cmd) y lógica condicional, pero sin
 * ejecutar nada y con --target decorativo. Sigue siendo un generador de comandos.
 */
function printReport(target, config, cmd) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  SQLSUS - MySQL Injection Toolkit');
    console.log('  Target: ' + (target || 'http://ejemplo.com/page.php?id=1'));
    console.log('  Config: ' + (config || 'target.cfg'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] sqlsus');
    console.log('    sqlsus is an open source MySQL injection and takeover tool, written in perl ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install sqlsus');
    console.log('');
    console.log('  [Flujo de trabajo]');
    console.log('    1. Generar configuracion:');
    console.log('       sqlsus --genconf ' + (config || 'target.cfg'));
    console.log('');
    console.log('    2. Editar ' + (config || 'target.cfg') + ' y poner:');
    console.log('       - URL vulnerable');
    console.log('       - Parametros de inyeccion');
    console.log('       - Nivel de riesgo');
    console.log('');
    if (cmd) {
        console.log('  [Comando generado]');
        console.log('    sqlsus ' + (config || 'target.cfg') + ' -e \'' + cmd + '\'');
    } else {
        console.log('  [Ejecutar shell interactivo]');
        console.log('    sqlsus ' + (config || 'target.cfg'));
        console.log('');
        console.log('  [Comandos dentro del shell]');
        console.log('    start             Iniciar la inyeccion');
        console.log('    get tables        Listar tablas');
        console.log('    get columns       Listar columnas de una tabla');
        console.log('    get version       Version de MySQL');
        console.log('    get users         Usuarios de la DB');
        console.log('    get privileges    Privilegios del usuario');
        console.log('    get dbs           Listar bases de datos');
        console.log('    dump              Dump de datos');
        console.log('    clone             Clonar la DB');
        console.log('    exec <cmd>        Ejecutar comando en DB');
        console.log('    help              Ayuda');
        console.log('    quit              Salir');
    }
    console.log('');
    console.log('  [Notas]');
    console.log('    - Especializado en MySQL');
    console.log('    - Usa SQLite como backend de cache');
    console.log('    - Escrito en Perl');
    console.log('    - Doc: http://sqlsus.sourceforge.net/');
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
    var configIdx = args.indexOf('--config');
    var cmdIdx = args.indexOf('--cmd');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - SQLSus v' + CONFIG.version + '                        |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node sqlsus.js --target <url> [--config <file>] [--cmd <command>]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node sqlsus.js --target "http://target.com/item.php?id=1"');
        console.log('    node sqlsus.js --config target.cfg --cmd "start;get tables"');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : 'http://ejemplo.com/page.php?id=1';
    var config = configIdx !== -1 ? args[configIdx + 1] : 'target.cfg';
    var cmd = cmdIdx !== -1 ? args[cmdIdx + 1] : '';

    console.log('\nGenerando comandos SQLSus...\n');
    printReport(target, config, cmd);
}

main();
