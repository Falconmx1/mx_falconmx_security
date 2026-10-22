#!/usr/bin/env node
/**
 * MFH TOOLS - Acceso a Credenciales VoIP
 * Acceso con Credenciales
 * 
 * Integración: svcrack (SIPVicious), enumiax
 * 
 * Uso: node voip-credential-access.js --target <IP> [--tool <nombre>] [--user <username>]
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

const TOOLS = {
    svcrack: {
        name: 'SVCrack (SIPVicious)',
        description: 'Herramienta de cracking de contraseñas en línea para dispositivos SIP, aprovecha la autenticación por digest',
        install: [
            'sudo apt install sipvicious',
            '# o pip install sipvicious'
        ],
        usage: [
            'sipvicious_svcrack -u <username> -d <dictionary> <target>',
            'sipvicious_svcrack -u100 -r1-9999 -z4 10.0.0.1',
            'sipvicious_svcrack -u100 -d dictionary.txt udp://10.0.0.1:5080'
        ],
        notes: [
            'Realiza cracking de contraseñas contra servidores de registro y servidores proxy',
            '-u especifica el nombre de usuario/extensión',
            '-r especifica el rango numérico (ej. 1-9999), -z especifica los dígitos de relleno',
            '-d usa un archivo de diccionario',
            '-n reutiliza el nonce para acelerar el cracking (algunos dispositivos tienen vulnerabilidad de replay)'
        ]
    },
    enumiax: {
        name: 'Enumiax',
        description: 'Enumerador de nombres de usuario del protocolo IAX (Inter-Asterisk eXchange)',
        install: [
            'sudo apt install enumiax'
        ],
        usage: [
            'enumiax <target_ip>',
            'enumiax <target_ip> -p 4569',
            'enumiax <target_ip> -d /usr/share/wordlists/iax_users.txt',
            'enumiax -v -o results.txt <target_ip>'
        ],
        notes: [
            'Realiza ataque de diccionario contra sistemas Asterisk PBX para descubrir nombres de usuario válidos',
            '-p especifica el puerto IAX (por defecto 4569)',
            '-d usa un archivo de diccionario personalizado',
            '-o salida a archivo',
            '-v salida detallada'
        ]
    }
};

// ============================================================
// Generación de reporte
// ============================================================
/**
 * VoIP Credential Access es un generador de comandos, no una herramienta
 * de acceso a credenciales VoIP. No hace nada: no lanza sipvicious_svcrack,
 * enumiax, svmap ni svwar. Solo imprime comandos genéricos de 2 herramientas.
 *
 * Lo que realmente hace:
 * - Imprime un reporte con instalación, uso básico y notas de 2 herramientas
 *   de acceso a credenciales VoIP (SVCrack/SIPVicious, Enumiax).
 * - Muestra el target y user en el header (pero no los usa en comandos).
 * - Acepta --tool para elegir herramienta o 'all'.
 * - Imprime un flujo recomendado de 4 pasos (svmap, svwar, svcrack, enumiax)
 *   con placeholders <target_range>, <target>, <user> (no interpolados).
 * - Advertencia legal.
 *
 * Bugs funcionales conocidos:
 * - --target es DECORATIVO: solo se muestra en el header. Los ejemplos usan
 *   10.0.0.1 fijo, no el target del usuario. El flujo usa <target> placeholder.
 * - --user es DECORATIVO: solo se muestra en el header. Los ejemplos de SVCrack
 *   usan -u100 fijo aunque pases --user 200 o --user admin. El flujo usa
 *   <user> placeholder.
 * - No valida IP: acepta 'noesunaip', cualquier string.
 * - --tool inválida no advierte: cae silenciosamente a mostrar todas.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 *
 * Ventaja de seguridad:
 * - No interpola target ni user → sin inyección por copiar/pegar.
 * - Herramientas coherentes: SVCrack (SIP) y Enumiax (IAX) son de VoIP
 *   credential access.
 *
 * Limitaciones:
 * - No accede a credenciales VoIP reales.
 * - No lanza sipvicious_svcrack, enumiax, svmap ni svwar.
 * - No valida IPs.
 * - No usa el target ni el user para construir comandos.
 *
 * Veredicto:
 * El nombre "VoIP Credential Access" promete acceso a credenciales VoIP.
 * Entrega un recetario de comandos con target y user 100% decorativos
 * (ni en ejemplos ni en flujo) y sin acceder a nada. Es más decorativo
 * que Keylogger (que al menos interpolaba en pasos previos).
 */
function printReport(target, user, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  📞 REPORTE DE ACCESO A CREDENCIALES VoIP');
    console.log('  Objetivo: ' + (target || 'No especificado'));
    console.log('  Usuario: ' + (user || 'No especificado'));
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

    console.log('  🔧 Flujo recomendado:');
    console.log('');
    console.log('  1. Primero usar svmap para descubrir dispositivos VoIP:');
    console.log('     sipvicious_svmap <target_range>');
    console.log('');
    console.log('  2. Usar svwar para enumerar extensiones:');
    console.log('     sipvicious_svwar -e100-999 <target>');
    console.log('');
    console.log('  3. Usar svcrack para crackear las contraseñas de las extensiones descubiertas:');
    console.log('     sipvicious_svcrack -u<user> -r1-9999 <target>');
    console.log('');
    console.log('  4. Para el protocolo IAX usar enumiax:');
    console.log('     enumiax <target>');
    console.log('');
    console.log('─'.repeat(65));
    console.log('  ⚠️ ADVERTENCIA');
    console.log('     Solo realiza acceso a credenciales en sistemas VoIP que tengas permiso de probar.');
    console.log('     Los ataques no autorizados son ilegales.');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var targetIdx = args.indexOf('--target');
    var userIdx = args.indexOf('--user');
    var toolIdx = args.indexOf('--tool');

    if (targetIdx === -1 && toolIdx === -1) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Acceso a Credenciales VoIP v' + CONFIG.version + '      ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node voip-credential-access.js --target <IP> [--user <username>] [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node voip-credential-access.js --target 192.168.1.100');
        console.log('    node voip-credential-access.js --target 10.0.0.1 --user 100 --tool svcrack');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : null;
    var user = userIdx !== -1 ? args[userIdx + 1] : null;
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    console.log('\n📞 Generando comandos de acceso a credenciales VoIP...\n');
    printReport(target, user, tool);
}

main();
