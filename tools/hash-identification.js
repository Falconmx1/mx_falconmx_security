#!/usr/bin/env node
/**
 * MFH TOOLS - Hash Identification
 * Acceso con Credenciales
 * 
 * Integra: hashid, hash-identifier, hashcrack
 * 
 * Uso: node hash-identification.js --hash <hash> [--tool <nombre>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS DE IDENTIFICACIÓN
// ============================================================
const TOOLS = {
    hashid: {
        name: 'hashID',
        description: 'Identifica 220+ tipos de hash usando regex',
        install: [
            'pip install hashid',
            '# O desde GitHub:',
            'git clone https://github.com/psypanda/hashID.git',
            'cd hashID && python setup.py install'
        ],
        usage: [
            'hashid <hash>',
            'hashid \'5d41402abc4b2a76b9719d911017c592\'',
            'hashid -m <hash>    # Mostrar modo hashcat',
            'hashid -j <hash>    # Formato John the Ripper'
        ],
        notes: [
            'Soporta 220+ tipos de hash',
            'Identifica modo hashcat correspondiente',
            'Identifica formato John the Ripper',
            'Puede parsear archivos con múltiples hashes'
        ],
        example: 'hashid \'5d41402abc4b2a76b9719d911017c592\''
    },
    'hash-identifier': {
        name: 'Hash-Identifier',
        description: 'Herramienta clásica de identificación de hashes',
        install: [
            'sudo apt install hash-identifier'
        ],
        usage: [
            'hash-identifier <hash>',
            'hash-identifier    # Modo interactivo'
        ],
        notes: [
            'Pre-instalada en Kali Linux',
            'Modo interactivo disponible',
            'Identificación por longitud y formato',
            'Muestra posibles tipos ordenados por probabilidad'
        ],
        example: 'hash-identifier 5d41402abc4b2a76b9719d911017c592'
    },
    hashcrack: {
        name: 'hashcrack',
        description: 'Herramienta completa: identificación + lookup + cracking',
        install: [
            'pip install hashcrack-cli'
        ],
        usage: [
            'hashcrack identify <hash>',
            'hashcrack lookup <hash>',
            'hashcrack wordlist rockyou.txt <hash>',
            'hashcrack analyze <hash>'
        ],
        notes: [
            'Identifica 20+ tipos de hash',
            'Hace lookup en APIs públicas',
            'Ataque con wordlist local',
            'Análisis de entropía y charset',
            'Salida en JSON para scripting'
        ],
        example: 'hashcrack identify 5d41402abc4b2a76b9719d911017c592'
    }
};

// ============================================================
// TIPOS DE HASH COMUNES
// ============================================================
const HASH_EXAMPLES = [
    { type: 'MD5', length: 32, example: '5d41402abc4b2a76b9719d911017c592' },
    { type: 'SHA-1', length: 40, example: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d' },
    { type: 'SHA-256', length: 64, example: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' },
    { type: 'SHA-512', length: 128, example: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043' },
    { type: 'NTLM', length: 32, example: '8846f7eaee8fb117ad06bdd830b7586c' },
    { type: 'bcrypt', length: 60, example: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' }
];

// ============================================================
// REPORTE
// ============================================================
/**
 * Hash Identification es un generador de comandos CON análisis real del hash.
 * No identifica hashes de verdad (no lanza hashid, hash-identifier ni hashcrack).
 * Solo imprime comandos genéricos de 3 herramientas + análisis básico del input.
 *
 * Lo que realmente hace:
 * - Analiza el hash: longitud, formato (hex/mixto), tipo probable.
 * - Detecta MD5, SHA-1, SHA-256, SHA-512, bcrypt, Argon2, crypt formats.
 * - Imprime un reporte con instalación, uso, notas y ejemplo de 3 herramientas.
 * - Acepta --tool para elegir herramienta o 'all'.
 * - Lista ejemplos de hashes por tipo.
 *
 * Bugs funcionales conocidos:
 * - --hash sin flag es ignorado: el hash posicional no se procesa.
 *   Solo funciona con --hash <hash>. Bug de UX.
 * - tool.example.replace('<hash>', ...) nunca se ejecuta: los ejemplos
 *   no contienen '<hash>', así que siempre muestran el MD5 fijo.
 * - --tool inválida no advierte: cae silenciosamente a mostrar todas.
 * - --hash no valida: acepta 'noesunhash', strings arbitrarios.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 * - No tiene advertencia legal (inconsistente con BT/RF/WiFi/Cred).
 *
 * Limitaciones:
 * - No identifica hashes de verdad (solo análisis básico + comandos).
 * - No hace lookup en APIs, no crackea, no consulta hashid.
 * - No interpola hash en comandos → sin inyección por copiar/pegar.
 *
 * Veredicto:
 * Es el más funcional de los generadores de comandos porque SÍ analiza
 * el hash (longitud, formato, tipo). Pero sigue sin identificar de verdad.
 */
function printReport(hash, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  #️⃣ HASH IDENTIFICATION REPORT');
    console.log('  Hash: ' + (hash || 'No especificado'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('═'.repeat(65));
    console.log('');

    if (hash) {
        console.log('  📊 Análisis del hash:');
        console.log('     • Longitud: ' + hash.length + ' caracteres');
        console.log('     • Formato: ' + (/^[a-f0-9]+$/i.test(hash) ? 'Hexadecimal' : 'Mixto/Custom'));
        console.log('     • Tipo probable: ' + detectHashType(hash));
        console.log('');
    }

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
        console.log('      ' + tool.example.replace('<hash>', hash || '5d41402abc4b2a76b9719d911017c592'));
        console.log('');
        console.log('─'.repeat(65));
        console.log('');
    });

    console.log('  📋 EJEMPLOS DE HASHES POR TIPO');
    console.log('─'.repeat(65));
    HASH_EXAMPLES.forEach(function(h) {
        console.log('   • ' + h.type.padEnd(12) + ' (' + h.length + ' chars): ' + h.example.substring(0, 32) + '...');
    });
    console.log('');
    console.log('─'.repeat(65));
    console.log('  💡 Consejo: Usa hashid -m <hash> para obtener el modo hashcat');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// DETECCIÓN BÁSICA
// ============================================================
function detectHashType(hash) {
    if (!hash) return 'Desconocido';
    var len = hash.length;
    if (/^\$2[aby]\$/.test(hash)) return 'bcrypt';
    if (/^\$1\$/.test(hash)) return 'MD5 Crypt';
    if (/^\$5\$/.test(hash)) return 'SHA-256 Crypt';
    if (/^\$6\$/.test(hash)) return 'SHA-512 Crypt';
    if (/^\$argon2/.test(hash)) return 'Argon2';
    if (len === 32) return 'MD5 / NTLM / MD4';
    if (len === 40) return 'SHA-1';
    if (len === 64) return 'SHA-256';
    if (len === 128) return 'SHA-512';
    return 'Desconocido (usar hashid)';
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var hashIdx = args.indexOf('--hash');
    var toolIdx = args.indexOf('--tool');

    if (args.length === 0) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Hash Identification v' + CONFIG.version + '             ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node hash-identification.js --hash <hash> [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node hash-identification.js --hash 5d41402abc4b2a76b9719d911017c592');
        console.log('    node hash-identification.js --hash abc123 --tool hashcrack');
        console.log('');
        process.exit(0);
    }

    var hash = hashIdx !== -1 ? args[hashIdx + 1] : null;
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    console.log('\n#️⃣ Generando comandos de Hash Identification...\n');
    printReport(hash, tool);
}

main();
