#!/usr/bin/env node
/**
 * MFH TOOLS - Cracking de Contraseñas
 * Acceso con Credenciales
 * 
 * Integración: Hashcat, John the Ripper, fcrackzip, cmospwd, Crackle, Truecrack
 * 
 * Uso: node password-cracking.js --hash <hash|file> [--type <md5|ntlm|zip>] [--tool <nombre>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS DE CRACKING DE CONTRASEÑAS
// ============================================================
const TOOLS = {
    hashcat: {
        name: 'Hashcat',
        description: 'Herramienta de cracking offline de contraseñas acelerada por GPU, número uno del sector',
        install: [
            'sudo apt install hashcat hashcat-data'
        ],
        usage: [
            'hashcat -m <mode> -a <attack> <hashfile> <wordlist>',
            'hashcat -m 0 hash.txt rockyou.txt',
            'hashcat -m 1000 hash.txt rockyou.txt'
        ],
        examples: [
            'hashcat -m 0 -a 0 hash.txt /usr/share/wordlists/rockyou.txt',
            'hashcat -m 1000 -a 0 ntlm_hashes.txt rockyou.txt',
            'hashcat -m 0 -a 3 hash.txt ?a?a?a?a?a?a'
        ],
        notes: [
            '-m especifica el tipo de hash (0=MD5, 1000=NTLM, 3200=bcrypt)',
            '-a especifica el modo de ataque (0=diccionario, 3=fuerza bruta)',
            'Aprovecha la aceleración por GPU, mucho más rápido que las herramientas de CPU'
        ]
    },
    john: {
        name: 'John the Ripper',
        description: 'Identifica y crackea más de 200 tipos de hash, número dos del sector',
        install: [
            'sudo apt install john john-data'
        ],
        usage: [
            'john --wordlist=<wordlist> <hashfile>',
            'john --format=<type> <hashfile>',
            'john --show <hashfile>'
        ],
        examples: [
            'john --wordlist=/usr/share/wordlists/rockyou.txt hash.txt',
            'john --format=nt hash.txt --wordlist=rockyou.txt',
            'john --show hash.txt'
        ],
        notes: [
            'Detecta automáticamente el tipo de hash',
            'Soporta reglas personalizadas (--rules)',
            'johnny es su versión gráfica'
        ]
    },
    fcrackzip: {
        name: 'fcrackzip',
        description: 'Herramienta de cracking de contraseñas ZIP, soporta diccionario y enumeración',
        install: [
            'sudo apt install fcrackzip'
        ],
        usage: [
            'fcrackzip -u -D -p <wordlist> <file.zip>',
            'fcrackzip -u -b -c a1 <file.zip>'
        ],
        examples: [
            'fcrackzip -u -D -p /usr/share/wordlists/rockyou.txt secret.zip',
            'fcrackzip -u -b -c a1 -l 1-6 secret.zip'
        ],
        notes: [
            '-D modo diccionario, -b modo fuerza bruta',
            '-c especifica el conjunto de caracteres (a=minúsculas, 1=números, A=mayúsculas)',
            '-u usa unzip para verificar'
        ]
    },
    cmospwd: {
        name: 'cmospwd',
        description: 'Elimina o recupera contraseñas CMOS/BIOS',
        install: [
            'sudo apt install cmospwd'
        ],
        usage: [
            'cmospwd',
            'cmospwd /k <keyfile>'
        ],
        examples: [
            'cmospwd',
            'cmospwd /k backup.bin'
        ],
        notes: [
            'Se usa para recuperación de contraseñas BIOS a nivel de hardware',
            'Requiere acceso físico o condiciones de hardware específicas',
            'También se puede usar para borrar la contraseña CMOS'
        ]
    },
    crackle: {
        name: 'Crackle',
        description: 'Crackea claves de emparejamiento Bluetooth LE (Just Works / passkey de 6 dígitos)',
        install: [
            'sudo apt install crackle'
        ],
        usage: [
            'crackle -i <pairing.pcap>',
            'crackle -i capture.pcap -o output'
        ],
        examples: [
            'crackle -i pairing.pcap',
            'crackle -i ble_capture.pcap -o cracked_key'
        ],
        notes: [
            'Dirigida a BLE 4.x Legacy Pairing',
            'Requiere haber capturado primero el proceso de emparejamiento en un archivo PCAP',
            'Se usa para recuperar el TK de Just Works o passkey de 6 dígitos'
        ]
    },
    truecrack: {
        name: 'Truecrack',
        description: 'Crackea volúmenes cifrados de TrueCrypt',
        install: [
            'git clone https://github.com/lvaccaro/truecrack',
            'cd truecrack && ./configure && make && sudo make install'
        ],
        usage: [
            'truecrack -t <volume> -w <wordlist>',
            'truecrack -t volume.tc -k <keyfile>'
        ],
        examples: [
            'truecrack -t encrypted_volume.tc -w rockyou.txt',
            'truecrack -t volume.tc -k keyfile -w passwords.txt'
        ],
        notes: [
            'Dedicada exclusivamente a volúmenes TrueCrypt',
            'Soporta ataque de diccionario y archivos de clave',
            'Requiere proporcionar la ruta del archivo del volumen cifrado'
        ]
    }
};

// ============================================================
// Generación de reporte
// ============================================================
/**
 * Password Cracking es un generador de comandos, no un crackeador de contraseñas.
 * No crackea nada (no lanza hashcat, john, fcrackzip, cmospwd, crackle ni truecrack).
 * Solo imprime comandos genéricos de 6 herramientas.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, uso básico, ejemplos y notas de 6 herramientas.
 * - Muestra el hash y el tipo en el header (pero no los usa en comandos).
 * - Acepta --tool para elegir herramienta o 'all'.
 * - Advertencia legal.
 *
 * Bugs funcionales conocidos:
 * - --hash es DECORATIVO: solo se muestra en el header. Los ejemplos usan
 *   'hash.txt' fijo, no el hash del usuario.
 * - --type es DECORATIVO: solo cambia el header. Los comandos de Hashcat
 *   siguen mostrando -m 0 (MD5) aunque pases --type ntlm (debería ser -m 1000).
 *   --type zip no activa fcrackzip como comando recomendado.
 * - Mezcla inconsistente de herramientas: cmospwd (BIOS), crackle (BLE) y
 *   truecrack (TrueCrypt) no son cracking de hashes. Solo Hashcat, John y
 *   fcrackzip lo son.
 * - --tool inválida no advierte: cae silenciosamente a mostrar todas.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 *
 * Ventaja de seguridad:
 * - No interpola hash ni type → sin inyección por copiar/pegar.
 *
 * Limitaciones:
 * - No crackea contraseñas reales.
 * - No lanza hashcat, john, fcrackzip, cmospwd, crackle ni truecrack.
 * - No valida hashes ni archivos.
 * - No interpola hash ni type en comandos.
 *
 * Veredicto:
 * El nombre "Password Cracking" promete crackear contraseñas. Entrega un
 * recetario de comandos con hash y type decorativos y sin crackear nada.
 */
function printReport(hashFile, hashType, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  🔓 REPORTE DE CRACKING DE CONTRASEÑAS');
    console.log('  Objetivo: ' + (hashFile || 'No especificado'));
    console.log('  Tipo: ' + (hashType || 'Auto-detección'));
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
        console.log('   💻 Uso básico:');
        tool.usage.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        console.log('   🎯 Ejemplos:');
        tool.examples.forEach(function(line) { console.log('      ' + line); });
        console.log('');
        console.log('   📝 Notas:');
        tool.notes.forEach(function(line) { console.log('      • ' + line); });
        console.log('');
        console.log('─'.repeat(65));
        console.log('');
    });

    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Solo crackea archivos hash a los que tengas derecho de acceso.');
    console.log('     El cracking de contraseñas no autorizado puede ser ilegal.');
    console.log('');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var hashIdx = args.indexOf('--hash');
    var typeIdx = args.indexOf('--type');
    var toolIdx = args.indexOf('--tool');

    if (args.length === 0) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Cracking de Contraseñas v' + CONFIG.version + '          ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node password-cracking.js --hash <file|hash> [--type <md5|ntlm|zip>] [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node password-cracking.js --hash hashes.txt --type md5');
        console.log('    node password-cracking.js --hash secret.zip --type zip --tool fcrackzip');
        console.log('');
        process.exit(0);
    }

    var hashFile = hashIdx !== -1 ? args[hashIdx + 1] : null;
    var hashType = typeIdx !== -1 ? args[typeIdx + 1] : 'auto';
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    console.log('\n🔓 Generando comandos de Cracking de Contraseñas...\n');
    printReport(hashFile, hashType, tool);
}

main();
