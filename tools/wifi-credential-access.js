#!/usr/bin/env node
/**
 * MFH TOOLS - Acceso a Credenciales WiFi
 * Acceso con Credenciales
 * 
 * Integración: Airgeddon, Wifiphisher, Wifite, Bully, Fern WiFi Cracker, eapmd5pass
 * 
 * Uso: node wifi-credential-access.js --target <BSSID|SSID> [--tool <nombre>]
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

const TOOLS = {
    airgeddon: {
        name: 'Airgeddon',
        description: 'Herramienta integral de auditoría WiFi basada en menús, soporta WPS/WPA/Evil Twin y más',
        install: [
            'git clone https://github.com/v1s1t0r1sh3r3/airgeddon.git',
            'cd airgeddon && ./airgeddon.sh'
        ],
        usage: [
            'sudo bash ./airgeddon.sh',
            'Luego selecciona el tipo de ataque en el menú interactivo'
        ],
        notes: [
            'Basada en menús, tras iniciar hay que seleccionar manualmente la red y el método de ataque',
            'Incluye módulos de DoS, captura de handshake, WPS, Evil Twin, etc.',
            'Recomendada para Kali Linux, verifica dependencias automáticamente'
        ]
    },
    wifiphisher: {
        name: 'Wifiphisher',
        description: 'Framework de Evil Twin + portal de phishing, ataca el factor humano en lugar del cifrado',
        install: [
            'sudo apt install wifiphisher',
            'git clone https://github.com/wifiphisher/wifiphisher.git && cd wifiphisher && sudo python3 setup.py install'
        ],
        usage: [
            'sudo wifiphisher [options]',
            'sudo wifiphisher -e "Free WiFi" -p firmware-upgrade',
            'sudo wifiphisher --essid CONFERENCE_WIFI -p plugin_update -pK s3cr3tp4ssw0rd'
        ],
        notes: [
            'Incluye escenarios de phishing como firmware-upgrade, plugin_update, oauth-login, etc.',
            '-e especifica el ESSID del AP falso',
            '-p selecciona el escenario de phishing',
            '-nD omite la fase de desautenticación (enganche pasivo)'
        ]
    },
    wifite: {
        name: 'Wifite',
        description: 'Wrapper automatizado de auditoría WiFi, soporta WPA/WEP/PMKID',
        install: [
            'sudo apt install wifite',
            'pip install wifite'
        ],
        usage: [
            'sudo wifite',
            'sudo wifite --bssid AA:BB:CC:DD:EE:FF',
            'sudo wifite --wpa --dict /usr/share/wordlists/rockyou.txt',
            'sudo wifite --pmkid'
        ],
        notes: [
            'Modo totalmente automático: escanea y ataca todas las redes visibles',
            '--pmkid ejecuta el ataque PMKID sin cliente',
            '--no-deauth omite la desautenticación (modo stealth)',
            'Depende del conjunto aircrack-ng'
        ]
    },
    bully: {
        name: 'Bully',
        description: 'Herramienta de fuerza bruta WPS implementada en C, más ligera que Reaver',
        install: [
            'sudo apt install bully pixiewps'
        ],
        usage: [
            'bully <interface> -b <BSSID> -c <channel> [options]',
            'bully wlan0mon -b 00:11:22:33:44:55 -c 6 -d -v 3',
            'bully wlan0mon -b 00:11:22:33:44:55 -c 6 -v 3'
        ],
        notes: [
            'El parámetro de interfaz es posicional (ej. bully wlan0mon), a diferencia de Reaver que usa -i',
            '-d activa el ataque offline Pixie-Dust (intentar primero)',
            '-L ignora el estado de bloqueo, -F fuerza la continuación',
            'Requiere primero airmon-ng start wlan0 para activar el modo monitor'
        ]
    },
    'fern-wifi-cracker': {
        name: 'Fern WiFi Cracker',
        description: 'Herramienta gráfica de cracking WiFi en Python/Qt, soporta WEP/WPA/WPS',
        install: [
            'sudo apt install fern-wifi-cracker',
            'sudo python3 execute.py'
        ],
        usage: [
            'sudo fern-wifi-cracker',
            'Luego en la GUI haz clic en Refresh para escanear redes, selecciona una red y haz clic en Attack'
        ],
        notes: [
            'Interfaz gráfica, adecuada para principiantes',
            'Soporta múltiples ataques WEP, ataque de diccionario WPA, ataque WPS (integra Reaver/Bully)',
            'Depende de aircrack-ng, reaver, macchanger, python3-pyqt5'
        ]
    },
    eapmd5pass: {
        name: 'eapmd5pass',
        description: 'Herramienta de ataque de diccionario para extraer y crackear credenciales EAP-MD5',
        install: [
            'sudo apt install eapmd5pass'
        ],
        usage: [
            'eapmd5pass -r <pcapfile> -w <wordlist>',
            'eapmd5pass -r capture.pcap -w /usr/share/wordlists/rockyou.txt',
            'eapmd5pass -i wlan0 -w wordlist.txt'
        ],
        notes: [
            'Ataque de diccionario offline dirigido a autenticación EAP-MD5',
            '-r lee desde archivo pcap, -i captura en tiempo real',
            '-U especifica el nombre de usuario, -C el challenge, -R la response',
            'Adecuada para la evaluación de autenticación EAP-MD5 en WiFi empresarial'
        ]
    }
};

// ============================================================
// Generación de reporte
// ============================================================
/**
 * WiFi Credential Access es un generador de comandos, no una herramienta
 * de acceso a credenciales WiFi. No hace nada: no lanza airgeddon,
 * wifiphisher, wifite, bully, fern-wifi-cracker ni eapmd5pass.
 * Solo imprime comandos genéricos de 6 herramientas.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, uso básico y notas de 6 herramientas
 *   de acceso a credenciales WiFi (Airgeddon, Wifiphisher, Wifite, Bully,
 *   Fern WiFi Cracker, eapmd5pass).
 * - Muestra el target en el header (pero no lo usa en comandos).
 * - Acepta --tool para elegir herramienta o 'all'.
 * - Advertencia legal.
 *
 * Bugs funcionales conocidos:
 * - --target es DECORATIVO: solo se muestra en el header. Los ejemplos usan
 *   BSSID fijo (00:11:22:33:44:55), no el target del usuario.
 * - No valida BSSID ni SSID: acepta 'noesunbssid', '/ruta', cualquier string.
 * - --iface NO EXISTE: solo --target y --tool. No hay forma de pasar interfaz.
 * - --tool inválida no advierte: cae silenciosamente a mostrar todas.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 *
 * Ventaja de seguridad:
 * - No interpola target → sin inyección por copiar/pegar.
 * - Herramientas coherentes: las 6 son de WiFi credential access
 *   (a diferencia de Password Cracking que mezclaba BIOS/BLE/TrueCrypt).
 *
 * Limitaciones:
 * - No accede a credenciales WiFi reales.
 * - No lanza airgeddon, wifiphisher, wifite, bully, fern-wifi-cracker ni eapmd5pass.
 * - No valida BSSID ni SSID.
 * - No usa el target para construir comandos.
 *
 * Veredicto:
 * El nombre "WiFi Credential Access" promete acceso a credenciales WiFi.
 * Entrega un recetario de comandos con target decorativo y sin acceder a nada.
 */
function printReport(target, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  📡 REPORTE DE ACCESO A CREDENCIALES WIFI');
    console.log('  Objetivo: ' + (target || 'No especificado'));
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
        console.log('   📝 Notas:');
        tool.notes.forEach(function(line) { console.log('      • ' + line); });
        console.log('');
        console.log('─'.repeat(65));
        console.log('');
    });

    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Solo realiza acceso a credenciales en redes que tengas permiso de probar.');
    console.log('     Los ataques WiFi no autorizados son ilegales.');
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

    if (targetIdx === -1 && toolIdx === -1) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Acceso a Credenciales WiFi v' + CONFIG.version + '      ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node wifi-credential-access.js --target <BSSID|SSID> [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : null;
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    console.log('\n📡 Generando comandos de acceso a credenciales WiFi...\n');
    printReport(target, tool);
}

main();
