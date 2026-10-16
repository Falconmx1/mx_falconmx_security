#!/usr/bin/env node
/**
 * MFH TOOLS - LibNFC
 * Categoria: NFC
 *
 * Uso: node libnfc.js [--iface <connstring>] [--cmd list|poll]
 *
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// CONFIGURACIONES SOPORTADAS
// ============================================================
const CONNECTIONS = {
    'pn532_spi': 'pn532_spi:/dev/spidev0.1:50000',
    'pn532_i2c': 'pn532_i2c:/dev/i2c-1',
    'pn532_uart': 'pn532_uart:/dev/ttyACM0',
    'acr122_usb': 'acr122_usb:001:002',
    'acr122_pcsc': 'acr122_pcsc'
};

// ============================================================
// REPORTE
// ============================================================
function printReport(iface, cmd) {
    console.log('');
    console.log('='.repeat(65));
    console.log('  LIBNFC - NFC SDK');
    console.log('  Interface: ' + (iface || 'No especificada'));
    console.log('  Comando: ' + (cmd || 'list'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('='.repeat(65));
    console.log('');
    console.log('  [Tool] libnfc');
    console.log('    libnfc is the first libre low level NFC SDK and Programmers API released under the GNU Lesser General Public License [citation:1]');
    console.log('');
    console.log('  [Install]');
    console.log('    sudo apt install libnfc-bin libnfc-examples');
    console.log('    # Para desarrollo:');
    console.log('    sudo apt install libnfc-dev');
    console.log('');
    console.log('  [Configuracion] /etc/nfc/libnfc.conf');
    console.log('    device.name = "PN532 via SPI"');
    console.log('    device.connstring = "' + (iface || 'pn532_spi:/dev/spidev0.1:50000') + '"');
    console.log('');
    console.log('  [Cadenas de conexion comunes]');
    console.log('    SPI:  pn532_spi:/dev/spidev0.1:50000');
    console.log('    I2C:  pn532_i2c:/dev/i2c-1');
    console.log('    UART: pn532_uart:/dev/ttyACM0');
    console.log('    PCSC: acr122_pcsc');
    console.log('');
    if (cmd === 'list') {
        console.log('  [Comando] Listar dispositivos NFC');
        console.log('    nfc-list');
        console.log('    nfc-list -v    # Verbose');
        console.log('');
        console.log('  [Ejemplo de salida]');
        console.log('    nfc-list uses libnfc 1.8.0');
        console.log('    NFC device: PN532 via SPI opened');
        console.log('    1 ISO14443A passive target(s) found:');
        console.log('      ISO/IEC 14443A (106 kbps) target:');
        console.log('        ATQA (SENS_RES): 00 04');
        console.log('        UID (NFCID1): bb 69 f9 04');
        console.log('        SAK (SEL_RES): 08');
    }
    if (cmd === 'poll') {
        console.log('  [Comando] Polling de tarjetas');
        console.log('    nfc-poll');
        console.log('    nfc-poll -v    # Verbose');
        console.log('');
        console.log('  [Ejemplo de salida]');
        console.log('    nfc-poll uses libnfc 1.8.0');
        console.log('    NFC device: PN532 via SPI opened');
        console.log('    NFC device will poll during 36000 ms (20 pollings of 300 ms for 6 modulations)');
        console.log('    ISO/IEC 14443A (106 kbps) target:');
        console.log('      ATQA (SENS_RES): 00 04');
        console.log('      UID (NFCID1): bb 69 f9 04');
        console.log('      SAK (SEL_RES): 08');
        console.log('    Waiting for card removing...');
    }
    console.log('');
    console.log('  [Notas]');
    console.log('    - Puede requerir sudo para acceder al dispositivo');
    console.log('    - SPI: /dev/spidev0.1 (o 0.0 segun el bus)');
    console.log('    - I2C: /dev/i2c-1 (direccion tipica 0x24)');
    console.log('    - UART: /dev/ttyACM0 o /dev/ttyUSB0');
    console.log('');
    console.log('-'.repeat(65));
    console.log('  WARN: solo lee tarjetas que te pertenezcan');
    console.log('-'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var ifaceIdx = args.indexOf('--iface');
    var cmdIdx = args.indexOf('--cmd');

    if (args.length === 0) {
        console.log('');
        console.log('+------------------------------------------------------+');
        console.log('|  MFH TOOLS - LibNFC v' + CONFIG.version + '                          |');
        console.log('|  ' + CONFIG.author + '                              |');
        console.log('+------------------------------------------------------+');
        console.log('');
        console.log('  Uso: node libnfc.js [--iface <connstring>] [--cmd list|poll]');
        console.log('');
        console.log('  Interfaces comunes:');
        Object.keys(CONNECTIONS).forEach(function(k) {
            console.log('    - ' + k + ': ' + CONNECTIONS[k]);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node libnfc.js');
        console.log('    node libnfc.js --iface pn532_i2c:/dev/i2c-1 --cmd poll');
        console.log('');
        process.exit(0);
    }

    var iface = ifaceIdx !== -1 ? args[ifaceIdx + 1] : 'pn532_spi:/dev/spidev0.1:50000';
    var cmd = cmdIdx !== -1 ? args[cmdIdx + 1] : 'list';

    console.log('\nGenerando comandos LibNFC...\n');
    printReport(iface, cmd);
}

main();
