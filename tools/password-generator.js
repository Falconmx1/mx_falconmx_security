#!/usr/bin/env node

/**
 * Password Generator - MFH TOOLS PRO
 * Genera contraseñas seguras con opciones personalizables
 * 
 * Uso: node password-generator.js [opciones]
 * Ejemplo: node password-generator.js --length 16 --count 5
 * Ejemplo: node password-generator.js --length 24 --no-symbols
 * Ejemplo: node password-generator.js --count 10 --output passwords.txt
 */

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    defaultLength: 16,
    defaultCount: 1,
    defaultCharset: {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    },
    ambiguousChars: 'Il1O0'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let length = CONFIG.defaultLength;
let count = CONFIG.defaultCount;
let outputFile = null;
let useUppercase = true;
let useLowercase = true;
let useNumbers = true;
let useSymbols = true;
let excludeAmbiguous = false;
let verbose = false;

if (args.length === 0) {
    console.error(`
🔍 Password Generator - MFH TOOLS PRO
======================================
Genera contraseñas seguras con opciones personalizables.

Uso:
  node password-generator.js [opciones]

Opciones:
  --length <n>          Longitud de la contraseña (default: 16)
  --count <n>           Número de contraseñas a generar (default: 1)
  --output <archivo>    Guardar contraseñas en archivo
  --no-uppercase        Sin mayúsculas
  --no-lowercase        Sin minúsculas
  --no-numbers          Sin números
  --no-symbols          Sin símbolos
  --exclude-ambiguous   Excluir caracteres ambiguos (Il1O0)
  --verbose             Mostrar más detalles
  --help                Mostrar esta ayuda

Ejemplos:
  node password-generator.js --length 16 --count 5
  node password-generator.js --length 24 --no-symbols
  node password-generator.js --count 10 --output passwords.txt
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--length' && args[i + 1]) {
        length = parseInt(args[i + 1]) || CONFIG.defaultLength;
        i++;
    } else if (args[i] === '--count' && args[i + 1]) {
        count = parseInt(args[i + 1]) || CONFIG.defaultCount;
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--no-uppercase') {
        useUppercase = false;
    } else if (args[i] === '--no-lowercase') {
        useLowercase = false;
    } else if (args[i] === '--no-numbers') {
        useNumbers = false;
    } else if (args[i] === '--no-symbols') {
        useSymbols = false;
    } else if (args[i] === '--exclude-ambiguous') {
        excludeAmbiguous = true;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function buildCharset() {
    let charset = '';
    if (useUppercase) charset += CONFIG.defaultCharset.uppercase;
    if (useLowercase) charset += CONFIG.defaultCharset.lowercase;
    if (useNumbers) charset += CONFIG.defaultCharset.numbers;
    if (useSymbols) charset += CONFIG.defaultCharset.symbols;
    
    if (excludeAmbiguous) {
        for (const char of CONFIG.ambiguousChars) {
            charset = charset.replace(new RegExp(char, 'g'), '');
        }
    }
    
    return charset;
}

function generatePassword(length, charset) {
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
}

function analyzePassword(password) {
    const analysis = {
        length: password.length,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /[0-9]/.test(password),
        hasSymbols: /[^a-zA-Z0-9]/.test(password),
        entropy: 0
    };
    
    // Calcular entropía aproximada
    let pool = 0;
    if (analysis.hasUppercase) pool += 26;
    if (analysis.hasLowercase) pool += 26;
    if (analysis.hasNumbers) pool += 10;
    if (analysis.hasSymbols) pool += 32;
    
    if (pool > 0) {
        analysis.entropy = Math.round(password.length * Math.log2(pool));
    }
    
    return analysis;
}

function getStrength(entropy) {
    if (entropy >= 80) return { level: 'Excelente', emoji: '🟢' };
    if (entropy >= 60) return { level: 'Fuerte', emoji: '🟢' };
    if (entropy >= 40) return { level: 'Media', emoji: '🟡' };
    if (entropy >= 20) return { level: 'Débil', emoji: '🟠' };
    return { level: 'Muy Débil', emoji: '🔴' };
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Password Generator - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📋 Longitud: ${length}`);
        console.log(`📋 Cantidad: ${count}`);
        console.log('');
        
        const charset = buildCharset();
        
        if (charset.length === 0) {
            console.error('❌ No se seleccionó ningún tipo de caracter');
            console.error('   Debes incluir al menos: mayúsculas, minúsculas, números o símbolos');
            process.exit(1);
        }
        
        console.log(`🔤 Conjunto de caracteres: ${charset.length} caracteres`);
        if (verbose) {
            console.log(`   ${charset}`);
        }
        console.log('');
        
        // Generar contraseñas
        const passwords = [];
        for (let i = 0; i < count; i++) {
            const pwd = generatePassword(length, charset);
            passwords.push(pwd);
        }
        
        // Mostrar resultados
        console.log('📋 CONTRASEÑAS GENERADAS:');
        console.log('='.repeat(60));
        
        passwords.forEach((pwd, i) => {
            const analysis = analyzePassword(pwd);
            const strength = getStrength(analysis.entropy);
            console.log(`${String(i + 1).padStart(2)}. ${pwd}`);
            console.log(`   🔹 Longitud: ${analysis.length}`);
            console.log(`   🔹 Entropía: ${analysis.entropy} bits ${strength.emoji} (${strength.level})`);
            console.log(`   🔹 Mayúsculas: ${analysis.hasUppercase ? '✅' : '❌'}`);
            console.log(`   🔹 Minúsculas: ${analysis.hasLowercase ? '✅' : '❌'}`);
            console.log(`   🔹 Números: ${analysis.hasNumbers ? '✅' : '❌'}`);
            console.log(`   🔹 Símbolos: ${analysis.hasSymbols ? '✅' : '❌'}`);
            console.log('');
        });
        
        // Guardar en archivo
        if (outputFile) {
            const content = passwords.join('\n');
            fs.writeFileSync(outputFile, content);
            console.log(`📁 Contraseñas guardadas en: ${outputFile}`);
        }
        
        console.log('\n✅ Password Generator completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
