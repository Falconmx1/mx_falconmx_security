#!/usr/bin/env node

/**
 * Hash Cracker - MFH TOOLS PRO
 * Descifra hashes MD5/SHA1/SHA256 usando diccionarios y rainbow tables
 * 
 * Uso: node hash-cracker.js <hash> [opciones]
 * Ejemplo: node hash-cracker.js 5d41402abc4b2a76b9719d911017c592
 * Ejemplo: node hash-cracker.js --file hashes.txt --wordlist passwords.txt
 * Ejemplo: node hash-cracker.js --hash-type sha256 --hash 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    defaultWordlist: [
        // Contraseñas más comunes
        '123456', 'password', '12345678', 'qwerty', 'abc123', 'monkey', 'letmein', 'dragon',
        'baseball', 'master', '1234567', '123456789', '12345', '1234567890', 'password1',
        'admin', 'welcome', 'login', 'princess', 'sunshine', 'iloveyou', 'fuckyou', 'computer',
        'trustno1', '000000', '1234', 'football', 'superman', 'michael', 'jesus', 'whatever',
        'shadow', 'harley', 'robert', 'matthew', 'daniel', 'jennifer', 'jessica', 'ashley',
        // Palabras en español
        'hola', 'mexico', 'ciudad', 'casa', 'amor', 'perro', 'gato', 'fuego', 'agua',
        'tierra', 'aire', 'sol', 'luna', 'estrella', 'noche', 'dia', 'vida', 'muerte',
        // Nombres comunes
        'juan', 'jose', 'maria', 'ana', 'luis', 'carlos', 'jorge', 'roberto', 'fernando',
        'alejandro', 'manuel', 'javier', 'antonio', 'francisco', 'pedro', 'david', 'daniel',
        'angel', 'andres', 'oscar', 'victor', 'eduardo', 'rafael', 'enrique', 'miguel',
        'armando', 'salvador', 'raul', 'alberto', 'hector', 'gerardo', 'hugo', 'julio',
        'claudia', 'patricia', 'karen', 'sandra', 'monica', 'veronica', 'elena', 'laura',
        // Animales
        'perro', 'gato', 'conejo', 'caballo', 'vaca', 'toro', 'cabra', 'oveja', 'cerdo',
        'leon', 'tigre', 'oso', 'lobo', 'zorro', 'ciervo', 'jaguar', 'pantera', 'leopardo',
        // Deportes
        'futbol', 'tenis', 'beisbol', 'basquet', 'boxeo', 'natacion', 'ciclismo', 'atletismo',
        // Comida
        'taco', 'torta', 'queso', 'carne', 'pollo', 'pescado', 'arroz', 'frijol', 'maiz',
        'chile', 'salsa', 'guacamole', 'tamal', 'elote', 'nopal', 'mole', 'chocolate'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let hashToCrack = null;
let hashFile = null;
let wordlistFile = null;
let hashType = 'auto';
let outputFile = null;
let verbose = false;

function showHelp() {
    console.error(`
🔍 Hash Cracker - MFH TOOLS PRO
================================
Descifra hashes MD5/SHA1/SHA256 usando diccionarios y rainbow tables.

Uso:
  node hash-cracker.js <hash>
  node hash-cracker.js --file <archivo_hashes> [--wordlist <diccionario>]
  node hash-cracker.js --hash-type <md5|sha1|sha256> --hash <hash>

Opciones:
  --hash-type <tipo>   Especifica el tipo de hash (md5, sha1, sha256, auto)
  --file <archivo>     Archivo con lista de hashes a descifrar
  --wordlist <archivo> Archivo con diccionario de palabras (uno por línea)
  --output <archivo>   Guardar resultados en archivo
  --verbose            Mostrar más detalles en la salida
  --help               Mostrar esta ayuda

Ejemplos:
  node hash-cracker.js 5d41402abc4b2a76b9719d911017c592
  node hash-cracker.js --hash-type sha256 --hash 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
  node hash-cracker.js --file hashes.txt --wordlist rockyou.txt
  node hash-cracker.js --file hashes.txt --output resultados.txt
`);
    process.exit(0);
}

// Parsear argumentos
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--hash-type' && args[i + 1]) {
        hashType = args[i + 1].toLowerCase();
        i++;
    } else if (arg === '--file' && args[i + 1]) {
        hashFile = args[i + 1];
        i++;
    } else if (arg === '--wordlist' && args[i + 1]) {
        wordlistFile = args[i + 1];
        i++;
    } else if (arg === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (arg === '--verbose') {
        verbose = true;
    } else if (arg === '--help') {
        showHelp();
    } else if (!arg.startsWith('--')) {
        hashToCrack = arg;
    }
}

// ==================== FUNCIONES DE HASH ====================
function getHashType(hash) {
    const hashLower = hash.toLowerCase();
    if (/^[a-f0-9]{32}$/.test(hashLower)) return 'md5';
    if (/^[a-f0-9]{40}$/.test(hashLower)) return 'sha1';
    if (/^[a-f0-9]{64}$/.test(hashLower)) return 'sha256';
    if (/^[a-f0-9]{96}$/.test(hashLower)) return 'sha384';
    if (/^[a-f0-9]{128}$/.test(hashLower)) return 'sha512';
    return 'unknown';
}

function generateHash(text, type) {
    if (type === 'md5') return crypto.createHash('md5').update(text).digest('hex');
    if (type === 'sha1') return crypto.createHash('sha1').update(text).digest('hex');
    if (type === 'sha256') return crypto.createHash('sha256').update(text).digest('hex');
    if (type === 'sha384') return crypto.createHash('sha384').update(text).digest('hex');
    if (type === 'sha512') return crypto.createHash('sha512').update(text).digest('hex');
    return null;
}

// ==================== CARGAR WORDLIST ====================
function loadWordlist(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return content.split('\n').filter(w => w.trim()).map(w => w.trim());
        }
        return null;
    } catch (e) {
        console.error(`⚠️ Error al leer wordlist: ${filePath}`);
        return null;
    }
}

// ==================== DESCIFRAR HASH ====================
function crackHash(hash, wordlist, type) {
    const detectedType = type === 'auto' ? getHashType(hash) : type;
    
    if (detectedType === 'unknown') {
        return { error: 'Tipo de hash no soportado o inválido' };
    }
    
    if (verbose) {
        console.log(`🔍 Intentando descifrar hash ${detectedType}: ${hash}`);
        console.log(`📋 Diccionario: ${wordlist.length} palabras`);
    }
    
    let attempts = 0;
    const startTime = Date.now();
    
    for (const word of wordlist) {
        attempts++;
        const generated = generateHash(word, detectedType);
        if (generated === hash.toLowerCase()) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            return {
                hash,
                type: detectedType,
                cracked: true,
                word,
                attempts,
                time: elapsed
            };
        }
        
        // Mostrar progreso
        if (verbose && attempts % 1000 === 0) {
            process.stdout.write(`\r   Intentos: ${attempts}...`);
        }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    return {
        hash,
        type: detectedType,
        cracked: false,
        attempts,
        time: elapsed
    };
}

// ==================== DESCIFRAR MÚLTIPLES HASHES ====================
function crackHashes(hashes, wordlist, type) {
    const results = [];
    let totalAttempts = 0;
    let crackedCount = 0;
    const startTime = Date.now();
    
    console.log(`🔍 Procesando ${hashes.length} hashes...`);
    console.log(`📋 Diccionario: ${wordlist.length} palabras`);
    console.log('='.repeat(50));
    
    for (let i = 0; i < hashes.length; i++) {
        const hash = hashes[i].trim();
        if (!hash) continue;
        
        const result = crackHash(hash, wordlist, type);
        totalAttempts += result.attempts || 0;
        if (result.cracked) crackedCount++;
        results.push(result);
        
        // Mostrar progreso
        const progress = Math.round(((i + 1) / hashes.length) * 100);
        process.stdout.write(`\r📊 Progreso: ${progress}% (${i + 1}/${hashes.length}) - Descifrados: ${crackedCount}`);
    }
    
    process.stdout.write('\n');
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return {
        results,
        total: hashes.length,
        cracked: crackedCount,
        attempts: totalAttempts,
        time: elapsed
    };
}

// ==================== MOSTRAR RESULTADOS ====================
function showResults(data) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADOS');
    console.log('='.repeat(50));
    console.log(`✅ Hashes descifrados: ${data.cracked}/${data.total}`);
    console.log(`🔍 Intentos totales: ${data.attempts}`);
    console.log(`⏱️ Tiempo: ${data.time} segundos`);
    
    if (data.cracked > 0) {
        console.log('\n🔓 HASHS DESCIFRADOS:');
        data.results.filter(r => r.cracked).forEach(r => {
            console.log(`   ✅ ${r.type}: ${r.hash} → ${r.word} (${r.attempts} intentos)`);
        });
    }
    
    const failed = data.results.filter(r => !r.cracked && !r.error);
    if (failed.length > 0) {
        console.log(`\n❌ HASHS NO DESCIFRADOS (${failed.length}):`);
        failed.forEach(r => {
            console.log(`   ❌ ${r.type}: ${r.hash}`);
        });
        console.log('\n💡 Sugerencia: Usa un diccionario más grande o fuerza bruta');
    }
}

// ==================== MAIN ====================
(async function main() {
    try {
        // Cargar wordlist
        let wordlist = CONFIG.defaultWordlist;
        if (wordlistFile) {
            const customWordlist = loadWordlist(wordlistFile);
            if (customWordlist) {
                wordlist = customWordlist;
                console.log(`📋 Usando wordlist personalizada: ${wordlist.length} palabras`);
            } else {
                console.warn(`⚠️ No se pudo cargar ${wordlistFile}, usando wordlist por defecto`);
            }
        } else {
            console.log(`📋 Usando wordlist por defecto: ${wordlist.length} palabras`);
            console.log('   💡 Para mejores resultados usa --wordlist con un diccionario más grande');
        }
        
        // Caso 1: Descifrar hash individual
        if (hashToCrack && !hashFile) {
            const result = crackHash(hashToCrack, wordlist, hashType);
            if (result.error) {
                console.error(`❌ ${result.error}`);
                process.exit(1);
            }
            
            console.log('\n' + '='.repeat(50));
            console.log('📊 RESULTADO');
            console.log('='.repeat(50));
            if (result.cracked) {
                console.log(`✅ Hash ${result.type}: ${result.hash}`);
                console.log(`🔓 Texto original: ${result.word}`);
                console.log(`🔍 Intentos: ${result.attempts}`);
                console.log(`⏱️ Tiempo: ${result.time} segundos`);
            } else {
                console.log(`❌ No se pudo descifrar el hash ${result.type}: ${result.hash}`);
                console.log(`🔍 Intentos: ${result.attempts}`);
                console.log(`⏱️ Tiempo: ${result.time} segundos`);
                console.log('\n💡 Sugerencia: Prueba con un diccionario más grande o fuerza bruta');
            }
            
            if (outputFile) {
                fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
                console.log(`\n📁 Resultado guardado en: ${outputFile}`);
            }
            return;
        }
        
        // Caso 2: Descifrar hashes desde archivo
        if (hashFile) {
            if (!fs.existsSync(hashFile)) {
                console.error(`❌ Archivo no encontrado: ${hashFile}`);
                process.exit(1);
            }
            
            const content = fs.readFileSync(hashFile, 'utf8');
            const hashes = content.split('\n').filter(h => h.trim());
            
            if (hashes.length === 0) {
                console.error('❌ No se encontraron hashes en el archivo');
                process.exit(1);
            }
            
            const result = crackHashes(hashes, wordlist, hashType);
            showResults(result);
            
            if (outputFile) {
                fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
                console.log(`\n📁 Resultados guardados en: ${outputFile}`);
            }
            return;
        }
        
        // Si no se especificó nada, mostrar ayuda
        showHelp();
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
