#!/usr/bin/env node
/**
 * MFH TOOLS - NFC MIFARE Classic
 * Categoria: NFC
 *
 * Uso: node nfc-mfclassic.js [--action <r|w|R|W|f>] [--key <a|A|b|B>] [--uid <u|U...>] [--dump <file>]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// REPORTE
// ============================================================
function printReport(action, key, uid, dump) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  NFC-MFCLASSIC - MIFARE Classic Tool');
    console.log('  Accion: ' + action);
    console.log('  Key: ' + key);
    console.log('  UID: ' + uid);
    console.log('  DUMP: ' + dump);
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] nfc-mfclassic');
    console.log('    nfc-mfclassic is a MIFARE Classic tool that allow to read or write DUMP file using MIFARE keys provided in KEYS file [citation:4]');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install libnfc-bin');
    console.log('');
    console.log('  [Sintaxis]');
    console.log('    nfc-mfclassic f|r|R|w|W a|A|b|B u|U<uid> DUMP [KEYS [f]]');
    console.log('');
    console.log('  [Acciones]');
    console.log('    f = format (resetear keys a FFFFFFFFFFFF, data a 00, ACLs default)');
    console.log('    r = read (leer tarjeta a DUMP)');
    console.log('    R = unlocked read (bypass auth, leer Key A y B)');
    console.log('    w = write (escribir DUMP a tarjeta)');
    console.log('    W = unlocked write (escribir bloque 0, UID y manufacturer data)');
    console.log('');
    console.log('  [Keys]');
    console.log('    a/A = Key A (mayuscula = ignorar errores)');
    console.log('    b/B = Key B (mayuscula = ignorar errores)');
    console.log('');
    console.log('  [UID]');
    console.log('    u = UID default (libnfc decide)');
    console.log('    U01ab23cd = UID especifico (4 bytes)');
    console.log('');
    console.log('  [Comando generado]');
    console.log('    nfc-mfclassic ' + action + ' ' + key + ' ' + uid + ' ' + dump);
    console.log('');
    console.log('  [Ejemplos]');
    console.log('    nfc-mfclassic r a u dump.mfd                    # Leer con Key A');
    console.log('    nfc-mfclassic w a u dump.mfd                    # Escribir con Key A');
    console.log('    nfc-mfclassic R a u dump.mfd                    # Unlocked read');
    console.log('    nfc-mfclassic f a u dump.mfd                    # Formatear');
    console.log('    nfc-mfclassic r a U01ab23cd dump.mfd            # UID especifico');
    console.log('');
    console.log('  [Notas]');
    console.log('    - W y R solo funcionan en tarjetas MIFARE 1K chinas (clones) [citation:4]');
    console.log('    - f resetea keys a FFFFFFFFFFFF y data a 00');
    console.log('    - Al cambiar UID, verificar el BCC (UID checksum)');
    console.log('    - R/W errores: mayuscula (A|B) ignora errores, minuscula (a|b) detiene [citation:4]');
    console.log('');
    console.log('-'.repeat(65));
    console.log('  WARN: solo lee/escribe tarjetas que te pertenezcan');
    console.log('-'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var actionIdx = args.indexOf('--action');
    var keyIdx = args.indexOf('--key');
    var uidIdx = args.indexOf('--uid');
    var dumpIdx = args.indexOf('--dump');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - NFC MIFARE Classic v' + CONFIG.version + '                  |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node nfc-mfclassic.js [--action <r|w|R|W|f>] [--key <a|A|b|B>] [--uid <u|U...>] [--dump <file>]');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node nfc-mfclassic.js --action r --key a --dump dump.mfd');
        console.log('    node nfc-mfclassic.js --action f --key a --dump dump.mfd');
        console.log('');
        process.exit(0);
    }

    var action = actionIdx !== -1 ? args[actionIdx + 1] : 'r';
    var key = keyIdx !== -1 ? args[keyIdx + 1] : 'a';
    var uid = uidIdx !== -1 ? args[uidIdx + 1] : 'u';
    var dump = dumpIdx !== -1 ? args[dumpIdx + 1] : 'dump.mfd';

    console.log('\nGenerando comandos nfc-mfclassic...\n');
    printReport(action, key, uid, dump);
}

main();
