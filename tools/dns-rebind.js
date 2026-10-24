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

// ============================================================
// REPORTE
// ============================================================
/**
 * DNS Rebind es un generador de comandos, no una herramienta de DNS rebinding.
 * No ejecuta nada: no lanza rebind. Solo imprime comandos con iface/domain/targets
 * interpolados (port NO se usa).
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, uso básico, comando con targets,
 *   opciones reales de rebind, requisitos y advertencia legal.
 * - SÍ interpola iface y domain en el comando básico.
 * - SÍ interpola iface, domain y targets en el comando con targets.
 * - NO interpola port: --port solo se muestra en el header, no se usa en comandos.
 *
 * Bugs funcionales conocidos:
 * - --port es DECORATIVO: solo se muestra en el header. Los comandos NO incluyen
 *   -p <port>. El usuario pasa --port 8080 esperando -p 8080 y no lo recibe.
 * - No valida iface/domain/targets/port: acepta 'noesuniface', 'noesundominio', etc.
 * - INYECCIÓN POR COPIAR/PEGAR: iface/domain/targets se interpolan sin sanitizar.
 *   Ej: --iface "eth0; rm -rf /" genera "rebind -i eth0; rm -rf / -d ...".
 * - --target y --ip NO EXISTEN: solo iface/domain/targets/port.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 * - Defaults funcionan (iface=eth0, domain=kali.local, targets=ejemplo, port=80).
 *
 * Ventaja funcional:
 * - Interpola iface/domain/targets en 2 comandos (básico y con targets).
 * - Documentación real: opciones -i, -d, -t, -p, -c, -u, -a, -n;
 *   requisitos (dominio, DNS/HTTP/callback, autorización).
 * - Herramienta coherente: rebind es DNS rebinding.
 *
 * Limitaciones:
 * - No ejecuta rebind.
 * - No hace DNS rebinding real.
 * - No valida parámetros.
 * - --port decorativo (no se usa en comandos).
 * - Riesgo de inyección por copiar/pegar.
 * - Solo 1 herramienta (rebind).
 *
 * Veredicto:
 * El nombre "DNS Rebind" promete DNS rebinding. Entrega un recetario REAL
 * de rebind con comandos personalizados (iface/domain/targets), pero sin
 * ejecutar nada y con --port decorativo. Sigue siendo un generador de comandos.
 */
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

// ============================================================
// CLI
// ============================================================
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
