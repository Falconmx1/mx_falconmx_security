#!/usr/bin/env node
/**
 * MFH TOOLS - SQLMap
 * Categoria: Acceso Inicial
 *
 * Uso: node sqlmap.js --url <url> [--data <post>] [--cookie <cookie>] [--db <db>] [--table <table>]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// REPORTE
// ============================================================
/**
 * SQLMap es un generador de comandos, no un lanzador de SQLMap.
 * No ejecuta nada: no lanza sqlmap. Solo imprime comandos con
 * url/data/cookie/db/table interpolados condicionalmente.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, detección básica, enumerar DBs,
 *   enumerar tablas, dump de tabla, opciones útiles y advertencia legal.
 * - SÍ interpola url/data/cookie en el comando base.
 * - SÍ interpola db/table condicionalmente: db activa --tables,
 *   table (con db) activa --dump. Sin db, muestra placeholder <dbname>.
 * - Lógica condicional real: db → tablas, table → dump.
 *
 * Bugs funcionales conocidos:
 * - --url sin valor genera "sqlmap -u 'undefined' --batch" (bug grave).
 *   El código no valida que args[urlIdx + 1] exista.
 * - No valida url/data/cookie/db/table: acepta 'noesunaurl', 'noesundata', etc.
 * - INYECCIÓN POR COPIAR/PEGAR: url/data/cookie/db/table se interpolan sin
 *   sanitizar. Ej: --url "http://example.com; rm -rf /" genera comando con
 *   "; rm -rf /". --data "user=admin; id" genera comando con "; id".
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 *
 * Ventaja funcional:
 * - Interpolación condicional: db → --tables, table → --dump.
 * - 5 params interpolados (url/data/cookie/db/table).
 * - Documentación real: --level=5 --risk=3, --dbms=mysql, --os-shell,
 *   --file-read=/etc/passwd, --random-agent, --tamper=space2comment, -r request.txt.
 * - --data sin --url → banner (correcto).
 * - Herramienta coherente: SQLMap es SQL injection.
 *
 * Limitaciones:
 * - No ejecuta sqlmap.
 * - No hace SQL injection real.
 * - No valida url/data/cookie/db/table.
 * - --url sin valor → "undefined".
 * - Riesgo de inyección por copiar/pegar.
 * - Solo 1 herramienta (SQLMap).
 *
 * Veredicto:
 * El nombre "SQLMap" promete SQLMap. Entrega un recetario REAL de SQLMap
 * con comandos personalizados y lógica condicional (db/table), pero sin
 * ejecutar nada. Sigue siendo un generador de comandos.
 */
function printReport(url, data, cookie, db, table) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  SQLMAP - SQL Injection Automation');
    console.log('  Target: ' + (url || 'http://testphp.vulnweb.com/artists.php?artist=1'));
    if (data) console.log('  POST data: ' + data);
    if (cookie) console.log('  Cookie: ' + cookie);
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] SQLMap');
    console.log('    sqlmap is an open source penetration testing tool that automates the process of detecting and exploiting SQL injection flaws ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install sqlmap');
    console.log('    # o');
    console.log('    git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git');
    console.log('');
    var cmd = 'sqlmap -u "' + url + '" --batch';
    if (data) cmd += ' --data="' + data + '"';
    if (cookie) cmd += ' --cookie="' + cookie + '"';
    console.log('  [Deteccion basica]');
    console.log('    ' + cmd);
    console.log('');
    console.log('  [Enumerar DBs]');
    console.log('    ' + cmd + ' --dbs');
    console.log('');
    if (db) {
        console.log('  [Enumerar tablas de ' + db + ']');
        console.log('    ' + cmd + ' -D ' + db + ' --tables');
        if (table) {
            console.log('  [Dump de ' + db + '.' + table + ']');
            console.log('    ' + cmd + ' -D ' + db + ' -T ' + table + ' --dump');
        }
    } else {
        console.log('  [Enumerar tablas]');
        console.log('    ' + cmd + ' -D <dbname> --tables');
    }
    console.log('');
    console.log('  [Opciones utiles]');
    console.log('    --level=5 --risk=3      Pruebas exhaustivas');
    console.log('    --dbms=mysql            Forzar tipo DB');
    console.log('    --os-shell              Shell interactivo');
    console.log('    --file-read=/etc/passwd Leer archivo');
    console.log('    --random-agent          User agent aleatorio');
    console.log('    --tamper=space2comment  Bypass de WAF');
    console.log('    -r request.txt          Leer request de Burp');
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
    var cookieIdx = args.indexOf('--cookie');
    var dbIdx = args.indexOf('--db');
    var tableIdx = args.indexOf('--table');

    if (args.length === 0 || urlIdx === -1) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - SQLMap v' + CONFIG.version + '                        |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node sqlmap.js --url <url> [--data <post>] [--cookie <c>] [--db <name>] [--table <name>]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node sqlmap.js --url "http://target.com/page.php?id=1"');
        console.log('    node sqlmap.js --url "http://target.com/login" --data "user=admin&pass=test"');
        console.log('');
        process.exit(0);
    }

    var url = args[urlIdx + 1];
    var data = dataIdx !== -1 ? args[dataIdx + 1] : '';
    var cookie = cookieIdx !== -1 ? args[cookieIdx + 1] : '';
    var db = dbIdx !== -1 ? args[dbIdx + 1] : '';
    var table = tableIdx !== -1 ? args[tableIdx + 1] : '';

    console.log('\nGenerando comandos SQLMap...\n');
    printReport(url, data, cookie, db, table);
}

main();
