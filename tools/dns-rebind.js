#!/usr/bin/env node
/**
 * MFH TOOLS - DNS Rebind
 * Categoria: Acceso Inicial
 *
 * Uso: node dns-rebind.js --iface <eth0> --domain <domain.local> [--targets <ip1,ip2>] [--port 80]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

function printReport(iface, domain, targets, port) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  DNS REBIND');
    console.log('  Interface: ' + (iface || 'eth0'));
    console.log('  Dominio: ' + (domain || 'kali.local'));
    console.log('  Targets: ' + (targets || 'todos'));
    console.log('  Puerto: ' + (port || '80'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] rebind');
    console.log('    rebind is a tool for DNS rebinding attacks against routers ');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install rebind');
    console.log('');
    console.log('  [Uso basico]');
    console.log('    rebind -i ' + (iface || 'eth0') + ' -d ' + (domain || 'kali.local'));
    console.log('');
    console.log('  [Con targets especificos]');
    if (targets) {
        console.log('    rebind -i ' + iface + ' -d ' + domain + ' -t ' + targets);
    } else {
        console.log('    rebind -i ' + iface + ' -d ' + domain + ' -t 192.168.1.1,192.168.1.2');
    }
    console.log('');
    console.log('  [Opciones]');
    console.log('    -i <interface>   Interfaz de red [eth0]');
    console.log('    -d <domain>      Dominio registrado [kali.local]');
    console.log('    -t <targets>     IPs objetivo, separadas por coma');
    console.log('    -p <port>        Puerto target [80]');
    console.log('    -c <port>        Puerto callback [81]');
    console.log('    -u <user>        Basic Auth user [admin]');
    console.log('    -a <pass>        Basic Auth password [admin]');
    console.log('    -n <ms>          Intervalo callback (ms) [2000]');
    console.log('');
    console.log('  [Requisitos]');
    console.log('    - Un dominio registrado apuntando a tu IP publica');
    console.log('    - Servidor DNS, HTTP (80) y callback (81) abiertos');
    console.log('    - Autorizacion escrita del dueno de los routers');
    console.log('');
    console.log('-'.repeat(65));
    console.log('  WARN: solo ataca redes con autorizacion escrita');
    console.log('-'.repeat(65));
    console.log('');
}

function main() {
    var args = process.argv.slice(2);
    var ifaceIdx = args.indexOf('--iface');
    var domainIdx = args.indexOf('--domain');
    var targetsIdx = args.indexOf('--targets');
    var portIdx = args.indexOf('--port');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - DNS Rebind v' + CONFIG.version + '                      |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node dns-rebind.js --iface <eth0> --domain <domain> [--targets ip1,ip2] [--port 80]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node dns-rebind.js --iface eth0 --domain kali.local');
        console.log('    node dns-rebind.js --iface eth0 --domain kali.local --targets 192.168.1.1,192.168.1.2');
        console.log('');
        process.exit(0);
    }

    var iface = ifaceIdx !== -1 ? args[ifaceIdx + 1] : 'eth0';
    var domain = domainIdx !== -1 ? args[domainIdx + 1] : 'kali.local';
    var targets = targetsIdx !== -1 ? args[targetsIdx + 1] : '';
    var port = portIdx !== -1 ? args[portIdx + 1] : '80';

    console.log('\nGenerando comandos DNS Rebind...\n');
    printReport(iface, domain, targets, port);
}

main();
