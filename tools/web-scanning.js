#!/usr/bin/env node
/**
 * MFH TOOLS - Web Scanning
 * Fase 2: Web Scanning
 * 
 * Integra: DIRB, DirBuster, Gobuster
 * 
 * Uso: node web-scanning.js --target <url> [--tool dirb|dirbuster|gobuster] [--wordlist <path>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS DISPONIBLES
// ============================================================
const TOOLS = {
    dirb: {
        name: 'DIRB',
        description: 'Web content scanner con diccionarios',
        install: [
            'sudo apt update',
            'sudo apt install dirb'
        ],
        usage: [
            'dirb <URL> [wordlist] [options]',
            'dirb http://example.com',
            'dirb http://example.com /usr/share/dirb/wordlists/big.txt -o results.txt'
        ],
        options: [
            '-o file       Guardar output en archivo',
            '-w wordlist   Usar diccionario personalizado',
            '-r            No recursivo',
            '-t threads    Número de hilos (default: 10)',
            '-H header     Añadir cabecera personalizada',
            '-z ms         Delay entre requests'
        ],
        defaultWordlist: '/usr/share/dirb/wordlists/common.txt'
    },
    dirbuster: {
        name: 'DirBuster',
        description: 'Multi-threaded Java app para brute-force de directorios',
        install: [
            'sudo apt update',
            'sudo apt install dirbuster'
        ],
        usage: [
            'java -jar DirBuster.jar -u <URL> [options]',
            'java -jar DirBuster-1.0-RC1.jar -H -u https://example.com/',
            'java -jar DirBuster-1.0-RC1.jar -u https://example.com/'
        ],
        options: [
            '-H            Modo headless (sin GUI)',
            '-u URL        URL objetivo',
            '-l wordlist   Diccionario a usar',
            '-t threads    Número de hilos',
            '-e ext        Extensiones (ej: asp,aspx,php)',
            '-r file       Guardar reporte en archivo'
        ],
        defaultWordlist: '/usr/share/dirbuster/wordlists/directory-list-2.3-small.txt'
    },
    gobuster: {
        name: 'Gobuster',
        description: 'Herramienta rápida de Go para enumeración',
        install: [
            'go install github.com/OJ/gobuster/v3@latest',
            'sudo apt install gobuster'
        ],
        usage: [
            'gobuster dir -u <URL> -w <wordlist> [options]',
            'gobuster dir -u https://example.com -w /usr/share/wordlists/dirb/common.txt',
            'gobuster dir -u https://example.com -w wordlist.txt -x php,html,js'
        ],
        options: [
            '-u URL        URL objetivo',
            '-w wordlist   Diccionario',
            '-x ext        Extensiones (ej: php,html,js)',
            '-t threads    Número de hilos (default: 10)',
            '-o file       Guardar output',
            '-s codes      Códigos de estado a mostrar (ej: 200,301,302)',
            '-k            Ignorar errores SSL'
        ],
        defaultWordlist: '/usr/share/wordlists/dirb/common.txt'
    }
};

// ============================================================
// VALIDACIONES
// ============================================================
function isValidUrl(url) {
    return /^https?:\/\/[^\s]+$/i.test(url);
}

function normalizeUrl(url) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return 'http://' + url;
    }
    return url;
}

// ============================================================
// GENERADOR DE COMANDOS
// ============================================================
/**
 * Web Scanning es un generador de comandos, no un escáner.
 * No hace red, no valida target, no sanitiza, no escanea.
 *
 * Lo que realmente hace:
 * - Normaliza la URL (añade http:// si falta esquema).
 * - Genera un comando de DIRB, DirBuster o Gobuster con el target metido.
 * - Imprime un reporte con instalación, uso, opciones y comando recomendado.
 *
 * Bugs funcionales conocidos:
 * - No valida target: acepta "noesunaURL", "example", "javascript:alert(1)".
 * - No sanitiza backticks: genera comandos peligrosos si se copian/pegan.
 * - Exit code 0 en algunos errores (aunque aquí sí usa exit 1 en URL inválida).
 *
 * Lo que NO hace:
 * - No hace peticiones HTTP.
 * - No consulta headers.
 * - No detecta tecnologías.
 * - No verifica TLS.
 * - No lee robots.txt.
 * - No escanea directorios.
 */
function generateCommand(tool, target, options = {}) {
    const cleanTarget = normalizeUrl(target);
    
    switch (tool) {
        case 'dirb':
            let dirbCmd = `dirb ${cleanTarget}`;
            if (options.wordlist) dirbCmd += ` ${options.wordlist}`;
            if (options.output) dirbCmd += ` -o ${options.output}`;
            if (options.threads) dirbCmd += ` -t ${options.threads}`;
            if (options.extensions) dirbCmd += ` -X ${options.extensions}`;
            return dirbCmd;
            
        case 'dirbuster':
            let dbCmd = `java -jar DirBuster-1.0-RC1.jar -H -u ${cleanTarget}`;
            if (options.wordlist) dbCmd += ` -l ${options.wordlist}`;
            if (options.threads) dbCmd += ` -t ${options.threads}`;
            if (options.extensions) dbCmd += ` -e ${options.extensions}`;
            if (options.output) dbCmd += ` -r ${options.output}`;
            return dbCmd;
            
        case 'gobuster':
            let goCmd = `gobuster dir -u ${cleanTarget}`;
            goCmd += ` -w ${options.wordlist || TOOLS.gobuster.defaultWordlist}`;
            if (options.extensions) goCmd += ` -x ${options.extensions}`;
            if (options.threads) goCmd += ` -t ${options.threads}`;
            if (options.output) goCmd += ` -o ${options.output}`;
            if (options.codes) goCmd += ` -s ${options.codes}`;
            goCmd += ' -k';
            return goCmd;
            
        default:
            return null;
    }
}

// ============================================================
// REPORTE
// ============================================================
function printReport(tool, target) {
    const toolInfo = TOOLS[tool];
    if (!toolInfo) {
        console.log('\n❌ Herramienta no soportada: ' + tool);
        console.log('   Opciones: dirb, dirbuster, gobuster\n');
        return;
    }

    const cleanTarget = normalizeUrl(target);

    console.log('');
    console.log('═'.repeat(65));
    console.log('  🌐 WEB SCANNING REPORT');
    console.log('  Herramienta: ' + toolInfo.name);
    console.log('  Target: ' + cleanTarget);
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('═'.repeat(65));
    console.log('');
    console.log('  📋 ' + toolInfo.name + ' - ' + toolInfo.description);
    console.log('');
    console.log('  🔧 Instalación:');
    toolInfo.install.forEach(line => console.log('     ' + line));
    console.log('');
    console.log('  💻 Comandos básicos:');
    toolInfo.usage.forEach(line => console.log('     ' + line));
    console.log('');
    console.log('  ⚙️ Opciones comunes:');
    toolInfo.options.forEach(line => console.log('     ' + line));
    console.log('');
    console.log('  📁 Diccionario por defecto:');
    console.log('     ' + toolInfo.defaultWordlist);
    console.log('');
    console.log('  🎯 Comando recomendado para tu target:');
    const cmd = generateCommand(tool, target, {});
    console.log('     ' + cmd);
    console.log('');
    console.log('─'.repeat(65));
    console.log('  💡 Consejo: Usa -o results.txt para guardar resultados');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    const args = process.argv.slice(2);
    const targetIdx = args.indexOf('--target');
    const toolIdx = args.indexOf('--tool');

    if (targetIdx === -1 || !args[targetIdx + 1]) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Web Scanning v' + CONFIG.version + '                  ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node web-scanning.js --target <URL> [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas disponibles:');
        console.log('    • dirb       - Web content scanner');
        console.log('    • dirbuster  - Multi-threaded brute-force');
        console.log('    • gobuster   - Go-based fast enumerator');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node web-scanning.js --target https://example.com');
        console.log('    node web-scanning.js --target example.com --tool gobuster');
        console.log('');
        process.exit(0);
    }

    const target = args[targetIdx + 1];
    if (!isValidUrl(normalizeUrl(target))) {
        console.log('\n❌ URL inválida: ' + target + '\n');
        process.exit(1);
    }

    const tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'gobuster';
    
    console.log('\n🔍 Generando comando para: ' + target + '\n');
    printReport(tool, target);
}

main();
