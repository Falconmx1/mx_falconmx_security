#!/usr/bin/env node
/**
 * MFH TOOLS - Password Profiling & Wordlist
 * Acceso con Credenciales
 * 
 * Integra: bopscrk, cewl, crunch, pack, rsmangler, seclists, twofi
 * 
 * Uso: node wordlist-profiling.js --target <name|url> [--tool <nombre>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// HERRAMIENTAS DE WORDLIST
// ============================================================
const TOOLS = {
    bopscrk: {
        name: 'bopscrk',
        description: 'Generador de wordlists basado en información personal del target',
        install: [
            'pip install bopscrk',
            '# O desde GitHub:',
            'git clone https://github.com/r3nt0n/bopscrk'
        ],
        usage: [
            'bopscrk -i                    # Modo interactivo',
            'bopscrk -w "John" "Doe" "1990" -o wordlist.txt',
            'bopscrk -i -l lyrics          # Con búsqueda de lyrics'
        ],
        notes: [
            'Combina información personal: nombre, apodo, fecha',
            'Genera variaciones con leet speak',
            'Puede incluir lyrics de artistas',
            'Modo interactivo y one-liner'
        ],
        example: 'bopscrk -w "John" "Doe" "1990" -o custom_wordlist.txt'
    },
    cewl: {
        name: 'CeWL',
        description: 'Custom Word List generator - spiders un sitio web',
        install: [
            'sudo apt install cewl'
        ],
        usage: [
            'cewl <url> -d <depth> -m <min_length> -w wordlist.txt',
            'cewl https://example.com -d 3 -m 5 -w example_words.txt',
            'cewl https://example.com --email -w emails.txt'
        ],
        notes: [
            'Hace spidering del sitio web',
            'Extrae palabras únicas de 3+ caracteres',
            'Puede seguir enlaces externos',
            'Extrae emails de enlaces mailto',
            'Puede extraer metadata de archivos'
        ],
        example: 'cewl https://example.com -d 3 -m 5 -w custom_wordlist.txt'
    },
    crunch: {
        name: 'Crunch',
        description: 'Generador de wordlists por charset y patrones',
        install: [
            'sudo apt install crunch'
        ],
        usage: [
            'crunch <min> <max> [charset] -o wordlist.txt',
            'crunch 8 8 -f /usr/share/crunch/charset.lst numeric -o numeric.txt',
            'crunch 6 6 -t ddd%%% -p "palabra1" "palabra2" -o pattern.txt'
        ],
        notes: [
            'Genera combinaciones por longitud',
            'Usa charsets predefinidos',
            'Soporta patrones con -t',
            'Puede generar wordlists masivas',
            'Usa -p para permutaciones'
        ],
        example: 'crunch 8 8 -f /usr/share/crunch/charset.lst numeric -o numeric_8.txt'
    },
    pack: {
        name: 'PACK',
        description: 'Password Analysis and Cracking Kit - estadísticas y máscaras',
        install: [
            'git clone https://github.com/iphelix/pack',
            'cd pack'
        ],
        usage: [
            'python statsgen.py <wordlist>',
            'python maskgen.py <wordlist>',
            'python rulegen.py <wordlist>'
        ],
        notes: [
            'Analiza estadísticas de wordlists',
            'Genera máscaras para hashcat',
            'Genera reglas para John the Ripper',
            'Útil para optimizar ataques',
            'Puede requerir ajustes para Python 3'
        ],
        example: 'python statsgen.py rockyou.txt -o stats.txt'
    },
    rsmangler: {
        name: 'RSMangler',
        description: 'Wordlist mangling - genera mutaciones de palabras',
        install: [
            'sudo apt install rsmangler'
        ],
        usage: [
            'rsmangler -f <input.txt> -o <output.txt>',
            'rsmangler -f words.txt -e -a -o mangled.txt',
            'rsmangler -f words.txt -p "pre_" -s "_suf" -o prefixed.txt'
        ],
        notes: [
            'Genera permutaciones y combinaciones',
            'Convierte a leet speak (-e)',
            'Aplica todas las mutaciones (-a)',
            'Añade prefijos/sufijos',
            'Añade números y símbolos'
        ],
        example: 'rsmangler -f base_words.txt -e -a -o mangled_wordlist.txt'
    },
    seclists: {
        name: 'SecLists',
        description: 'Colección de múltiples tipos de listas para assessments',
        install: [
            'sudo apt install seclists',
            '# O desde GitHub:',
            'git clone https://github.com/danielmiessler/SecLists'
        ],
        usage: [
            '# Las listas están en /usr/share/seclists/',
            'ls /usr/share/seclists/Passwords/',
            'cat /usr/share/seclists/Passwords/rockyou.txt'
        ],
        notes: [
            'Colección masiva de wordlists',
            'Organizada por categorías',
            'Incluye usernames, passwords, URLs, etc.',
            'Referencia estándar en pentesting',
            'Rockyou.txt incluido'
        ],
        example: 'cat /usr/share/seclists/Passwords/rockyou.txt | head -100'
    },
    twofi: {
        name: 'Twofi',
        description: 'Twitter Words of Interest - wordlist basada en tweets',
        install: [
            'sudo apt install twofi',
            '# Requiere API keys de Twitter'
        ],
        usage: [
            'twofi -u <username> -o wordlist.txt',
            'twofi -s <search_term> -o wordlist.txt',
            'twofi -u user1,user2 -o combined.txt'
        ],
        notes: [
            'Extrae palabras de tweets',
            'Requiere Twitter API keys',
            'Genera wordlist ordenada por frecuencia',
            'Útil para targets específicos',
            'Puede buscar por hashtags'
        ],
        example: 'twofi -u target_user -o twitter_wordlist.txt'
    },
    dosfi: {
        name: 'DoSFi',
        description: 'Denial of Service Fuzzy Inference - generación difusa',
        install: [
            '# Similar a twofi, buscar en GitHub',
            'git clone https://github.com/[repo]/dosfi'
        ],
        usage: [
            'dosfi -u <username> -o wordlist.txt',
            '# Consultar documentación del repo'
        ],
        notes: [
            'Herramienta menos común',
            'Verificar repositorio actualizado',
            'Similar funcionalidad a twofi'
        ],
        example: 'dosfi -u target -o dosfi_wordlist.txt'
    }
};

// ============================================================
// REPORTE
// ============================================================
function printReport(target, selectedTool) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  📝 PASSWORD PROFILING & WORDLIST REPORT');
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

    console.log('  🔄 FLUJO RECOMENDADO');
    console.log('─'.repeat(65));
    console.log('');
    console.log('  1. Generar wordlist base con información personal:');
    console.log('     bopscrk -i');
    console.log('');
    console.log('  2. Complementar con spidering del sitio web:');
    console.log('     cewl https://target.com -d 3 -m 5 -w cewl_words.txt');
    console.log('');
    console.log('  3. Aplicar mutaciones (leet, prefijos, sufijos):');
    console.log('     rsmangler -f base_words.txt -e -a -o mangled.txt');
    console.log('');
    console.log('  4. Combinar con listas estándar (SecLists):');
    console.log('     cat mangled.txt /usr/share/seclists/Passwords/rockyou.txt | sort -u > final.txt');
    console.log('');
    console.log('  5. Usar con hashcat o John:');
    console.log('     hashcat -m 0 hash.txt final.txt');
    console.log('     john --wordlist=final.txt hash.txt');
    console.log('');
    console.log('─'.repeat(65));
    console.log('  💡 Consejo: Combina múltiples fuentes para mayor efectividad');
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
        console.log('║  MFH TOOLS — Password Profiling v' + CONFIG.version + '              ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node wordlist-profiling.js --target <name|url> [--tool <nombre>]');
        console.log('');
        console.log('  Herramientas:');
        Object.keys(TOOLS).forEach(function(k) {
            console.log('    • ' + k + ' - ' + TOOLS[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node wordlist-profiling.js --target "John Doe"');
        console.log('    node wordlist-profiling.js --target https://example.com --tool cewl');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : null;
    var tool = toolIdx !== -1 ? args[toolIdx + 1].toLowerCase() : 'all';

    console.log('\n📝 Generando comandos de Password Profiling...\n');
    printReport(target, tool);
}

main();
