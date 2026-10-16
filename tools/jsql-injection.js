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
