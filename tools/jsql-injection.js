#!/usr/bin/env node
/**
 * MFH TOOLS - jSQL Injection
 * Categoria: Acceso Inicial
 *
 * Uso: node jsql-injection.js --url <url> [--data <post>] [--headless] [--method GET|POST]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// REPORTE
// ============================================================
/**
 * jSQL Injection es un generador de comandos, no un lanzador de jSQL Injection.
 * No ejecuta nada: no lanza jsql-injection ni java -jar. Solo imprime comandos
 * con url/data interpolados condicionalmente en modo headless.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, modo headless (si --headless),
 *   enumerar databases, dump a archivo, características y advertencia legal.
 * - SÍ interpola url/data en los comandos de modo headless.
 * - Lógica condicional: --headless → 3 comandos (headless, enumerar, dump);
 *   sin --headless → modo GUI (jsql-injection / java -jar).
 * - NO interpola url en modo GUI (solo muestra comandos genéricos).
 *
 * Bugs funcionales conocidos:
 * - --url sin valor genera "Target: --headless" o url=undefined, tomando
 *   el siguiente flag como valor (bug grave).
 * - --method no valida: PUT se ignora silenciosamente (solo POST se añade).
 * - No valida url/data/method: acepta 'noesunaurl', 'noesundata', etc.
 * - INYECCIÓN POR COPIAR/PEGAR: url/data se interpolan sin sanitizar.
 *   Ej: --url "http://example.com; rm -rf /" genera comando con "; rm -rf /".
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 * - --headless sin url → banner (correcto).
 * - Defaults funcionan (url=http://target.com/item.php?id=1, method=GET,
 *   data=vacío, headless=false).
 *
 * Ventaja funcional:
 * - Interpola url/data en modo headless (3 comandos: headless, enumerar, dump).
 * - Lógica condicional: headless → comandos, sin headless → GUI.
 * - Documentación real: 33 motores DB, estrategias (Normal, Stacked, Error,
 *   Blind, Time), LOAD_FILE/INTO OUTFILE, admin pages, bypass.
 * - Herramienta coherente: jSQL Injection es SQL injection.
 *
 * Limitaciones:
 * - No ejecuta jsql-injection ni java -jar.
 * - No hace SQL injection real.
 * - No valida url/data/method.
 * - --url sin valor → "undefined" o toma flag como valor.
 * - --method PUT se ignora.
 * - Riesgo de inyección por copiar/pegar.
 * - Solo 1 herramienta (jSQL Injection).
 *
 * Veredicto:
 * El nombre "jSQL Injection" promete jSQL Injection. Entrega un recetario
 * REAL de jSQL Injection con comandos personalizados en headless y lógica
 * condicional, pero sin ejecutar nada. Sigue siendo un generador de comandos.
 */
function printReport(url, data, headless, method) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  JSQL INJECTION - SQL Injection Tool');
    console.log('  Target: ' + (url || 'http://target.com/item.php?id=1'));
    console.log('  Metodo: ' + (method || 'GET'));
    if (data) console.log('  POST data: ' + data);
    console.log('  Headless: ' + (headless ? 'Si' : 'No'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] jSQL Injection');
    console.log('    jSQL Injection is a lightweight application used to find database information from a distant server ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install jsql-injection');
    console.log('    # o');
    console.log('    wget https://github.com/ron190/jsql-injection/releases/latest/download/jsql-injection.jar');
    console.log('');
    if (headless) {
        var cmd = 'java -jar jsql-injection.jar --url "' + url + '" --headless';
        if (method === 'POST' && data) cmd += ' --method=POST --data="' + data + '"';
        console.log('  [Modo headless]');
        console.log('    ' + cmd);
        console.log('');
        console.log('  [Enumerar databases]');
        console.log('    ' + cmd + ' --strategy=union');
        console.log('');
        console.log('  [Dump a archivo]');
        console.log('    ' + cmd + ' --strategy=union --output=./dump.json');
        console.log('');
    } else {
        console.log('  [Modo GUI]');
        console.log('    jsql-injection');
        console.log('    # o');
        console.log('    java -jar jsql-injection.jar');
    }
    console.log('');
    console.log('  [Caracteristicas]');
    console.log('    - Soporte para 33 motores de DB (MySQL, Oracle, MSSQL, PostgreSQL, SQLite, etc)');
    console.log('    - Estrategias: Normal, Stacked, Error, Blind, Time');
    console.log('    - Lee/escribe archivos via LOAD_FILE / INTO OUTFILE');
    console.log('    - Busca admin pages automaticamente');
    console.log('    - Bypass de autenticacion y elevacion de privilegios');
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
    var methodIdx = args.indexOf('--method');
    var headless = args.indexOf('--headless') !== -1;

    if (args.length === 0 || urlIdx === -1) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - jSQL Injection v' + CONFIG.version + '                 |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node jsql-injection.js --url <url> [--data <post>] [--headless] [--method GET|POST]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node jsql-injection.js --url "http://target.com/item.php?id=1" --headless');
        console.log('    node jsql-injection.js --url "http://target.com/login" --data "user=admin&pass=test" --headless');
        console.log('');
        process.exit(0);
    }

    var url = args[urlIdx + 1];
    var data = dataIdx !== -1 ? args[dataIdx + 1] : '';
    var method = methodIdx !== -1 ? args[methodIdx + 1].toUpperCase() : 'GET';

    console.log('\nGenerando comandos jSQL Injection...\n');
    printReport(url, data, headless, method);
}

main();
