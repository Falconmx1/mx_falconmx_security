#!/usr/bin/env node

/**
 * Text Diff Checker - MFH TOOLS PRO
 * Compara dos textos y muestra diferencias
 * 
 * Uso: node text-diff.js <archivo1> <archivo2>
 * Ejemplo: node text-diff.js file1.txt file2.txt
 * Ejemplo: node text-diff.js "Hola mundo" "Hola mundo2"
 * Ejemplo: node text-diff.js --verbose file1.txt file2.txt
 */

const fs = require('fs');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let file1 = null;
let file2 = null;
let text1 = null;
let text2 = null;
let verbose = false;

if (args.length < 2) {
    console.error(`
🔍 Text Diff Checker - MFH TOOLS PRO
=====================================
Compara dos textos y muestra diferencias.

Uso:
  node text-diff.js <archivo1> <archivo2>
  node text-diff.js "texto1" "texto2"

Opciones:
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node text-diff.js file1.txt file2.txt
  node text-diff.js "Hola mundo" "Hola mundo2"
`);
    process.exit(1);
}

let arg1 = args[0];
let arg2 = args[1];

for (let i = 2; i < args.length; i++) {
    if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function readText(input) {
    // Verificar si es archivo
    if (fs.existsSync(input)) {
        return fs.readFileSync(input, 'utf8');
    }
    // Si no, es texto directo
    return input;
}

function getLines(text) {
    return text.split('\n').map(line => line.trimEnd());
}

function findDifferences(lines1, lines2) {
    const diff = [];
    const maxLength = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLength; i++) {
        const line1 = i < lines1.length ? lines1[i] : null;
        const line2 = i < lines2.length ? lines2[i] : null;
        
        if (line1 === null && line2 !== null) {
            diff.push({ type: 'added', line: i + 1, content: line2 });
        } else if (line1 !== null && line2 === null) {
            diff.push({ type: 'removed', line: i + 1, content: line1 });
        } else if (line1 !== line2) {
            diff.push({ type: 'changed', line: i + 1, content1: line1, content2: line2 });
        } else if (verbose) {
            diff.push({ type: 'same', line: i + 1, content: line1 });
        }
    }
    
    return diff;
}

function findCharacterDiff(text1, text2) {
    const maxLength = Math.max(text1.length, text2.length);
    let diff = '';
    
    for (let i = 0; i < maxLength; i++) {
        const char1 = i < text1.length ? text1[i] : null;
        const char2 = i < text2.length ? text2[i] : null;
        
        if (char1 === null && char2 !== null) {
            diff += `[+${char2}]`;
        } else if (char1 !== null && char2 === null) {
            diff += `[-${char1}]`;
        } else if (char1 !== char2) {
            diff += `[${char1}→${char2}]`;
        } else {
            diff += char1;
        }
    }
    
    return diff;
}

function getStatistics(lines1, lines2, diff) {
    const stats = {
        totalLines1: lines1.length,
        totalLines2: lines2.length,
        added: 0,
        removed: 0,
        changed: 0,
        same: 0
    };
    
    diff.forEach(item => {
        if (item.type === 'added') stats.added++;
        else if (item.type === 'removed') stats.removed++;
        else if (item.type === 'changed') stats.changed++;
        else if (item.type === 'same') stats.same++;
    });
    
    stats.similarity = Math.round(((stats.same) / Math.max(stats.totalLines1, stats.totalLines2)) * 100);
    
    return stats;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Text Diff Checker - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        // Leer textos
        const text1 = readText(arg1);
        const text2 = readText(arg2);
        
        console.log(`📝 Texto 1: ${arg1} (${text1.length} caracteres)`);
        console.log(`📝 Texto 2: ${arg2} (${text2.length} caracteres)`);
        console.log('');
        
        // Obtener líneas
        const lines1 = getLines(text1);
        const lines2 = getLines(text2);
        
        // Encontrar diferencias
        console.log('🔍 Analizando diferencias...');
        const diff = findDifferences(lines1, lines2);
        
        // Estadísticas
        const stats = getStatistics(lines1, lines2, diff);
        
        console.log('\n📊 ESTADÍSTICAS:');
        console.log(`   📝 Líneas texto 1: ${stats.totalLines1}`);
        console.log(`   📝 Líneas texto 2: ${stats.totalLines2}`);
        console.log(`   ➕ Líneas agregadas: ${stats.added}`);
        console.log(`   ➖ Líneas eliminadas: ${stats.removed}`);
        console.log(`   🔄 Líneas modificadas: ${stats.changed}`);
        console.log(`   ✅ Líneas iguales: ${stats.same}`);
        console.log(`   📈 Similitud: ${stats.similarity}%`);
        
        // Mostrar diferencias
        if (diff.length > 0) {
            console.log('\n📋 DIFERENCIAS DETECTADAS:');
            console.log('='.repeat(60));
            
            let changeCount = 0;
            diff.forEach(item => {
                if (item.type === 'same' && !verbose) return;
                changeCount++;
                
                if (item.type === 'added') {
                    console.log(`\n${String(changeCount).padStart(3)}. ➕ Línea ${item.line}:`);
                    console.log(`   📝 Nuevo: ${item.content}`);
                } else if (item.type === 'removed') {
                    console.log(`\n${String(changeCount).padStart(3)}. ➖ Línea ${item.line}:`);
                    console.log(`   📝 Original: ${item.content}`);
                } else if (item.type === 'changed') {
                    console.log(`\n${String(changeCount).padStart(3)}. 🔄 Línea ${item.line}:`);
                    console.log(`   📝 Original: ${item.content1}`);
                    console.log(`   📝 Nuevo: ${item.content2}`);
                    
                    // Mostrar diff de caracteres para líneas cambiadas
                    if (item.content1 && item.content2) {
                        const charDiff = findCharacterDiff(item.content1, item.content2);
                        if (charDiff !== item.content1 && charDiff !== item.content2) {
                            console.log(`   🔍 Diff: ${charDiff}`);
                        }
                    }
                } else if (item.type === 'same' && verbose) {
                    console.log(`\n${String(changeCount).padStart(3)}. ✅ Línea ${item.line}:`);
                    console.log(`   📝 ${item.content}`);
                }
            });
        } else {
            console.log('\n✅ Los textos son idénticos');
        }
        
        // Recomendaciones
        console.log('\n🔹 RECOMENDACIONES:');
        if (stats.similarity === 100) {
            console.log('   ✅ Los textos son idénticos');
        } else if (stats.similarity > 80) {
            console.log('   🟡 Los textos son muy similares');
        } else if (stats.similarity > 50) {
            console.log('   🟡 Los textos tienen diferencias significativas');
        } else {
            console.log('   🔴 Los textos son muy diferentes');
        }
        
        console.log('\n✅ Text Diff Checker completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
