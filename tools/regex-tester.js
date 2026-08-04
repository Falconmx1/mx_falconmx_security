#!/usr/bin/env node

/**
 * Regex Tester - MFH TOOLS PRO
 * Prueba expresiones regulares en tiempo real
 * 
 * Uso: node regex-tester.js <regex> <texto> [opciones]
 * Ejemplo: node regex-tester.js "\d+" "Hola 123 mundo 456"
 * Ejemplo: node regex-tester.js "\b\w+@\w+\.\w+\b" "mi@email.com y otro@correo.com"
 * Ejemplo: node regex-tester.js --flags gi "\b\w+\b" "Hola mundo desde México"
 */

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let pattern = null;
let text = null;
let flags = 'g';
let verbose = false;

if (args.length < 2) {
    console.error(`
🔍 Regex Tester - MFH TOOLS PRO
================================
Prueba expresiones regulares en tiempo real.

Uso:
  node regex-tester.js <regex> <texto> [opciones]

Opciones:
  --flags <flags>      Flags de la regex (default: g)
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node regex-tester.js "\\d+" "Hola 123 mundo 456"
  node regex-tester.js "\\b\\w+@\\w+\\.\\w+\\b" "mi@email.com y otro@correo.com"
  node regex-tester.js --flags gi "\\b\\w+\\b" "Hola mundo desde México"
`);
    process.exit(1);
}

pattern = args[0];
text = args[1];

for (let i = 2; i < args.length; i++) {
    if (args[i] === '--flags' && args[i + 1]) {
        flags = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function testRegex(pattern, text, flags) {
    try {
        const regex = new RegExp(pattern, flags);
        const matches = [];
        let match;
        let matchCount = 0;
        
        // Para capturar grupos
        const allMatches = [];
        let tempMatch;
        while ((tempMatch = regex.exec(text)) !== null) {
            allMatches.push({
                index: tempMatch.index,
                match: tempMatch[0],
                groups: tempMatch.slice(1)
            });
            matchCount++;
            if (!flags.includes('g')) break;
        }
        
        // Reemplazar para mostrar el texto resaltado
        const highlighted = text.replace(regex, (match, ...groups) => {
            const groupStr = groups.slice(0, -2).filter(g => g !== undefined);
            return `\x1b[32m${match}\x1b[0m${groupStr.length > 0 ? ` (grupos: ${groupStr.join(', ')})` : ''}`;
        });
        
        return {
            success: true,
            matches: allMatches,
            matchCount,
            highlighted,
            regex: regex
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function analyzeRegex(pattern) {
    const analysis = {
        pattern,
        length: pattern.length,
        hasAnchors: /[\^$]/.test(pattern),
        hasGroups: /\(/.test(pattern) && /\)/.test(pattern),
        hasCharacterClass: /\[/.test(pattern) && /\]/.test(pattern),
        hasQuantifiers: /[+*?{}]/.test(pattern),
        hasAlternation: /\|/.test(pattern),
        complexity: 'Baja'
    };
    
    // Calcular complejidad
    let score = 0;
    if (analysis.hasAnchors) score += 1;
    if (analysis.hasGroups) score += 2;
    if (analysis.hasCharacterClass) score += 1;
    if (analysis.hasQuantifiers) score += 2;
    if (analysis.hasAlternation) score += 2;
    if (pattern.length > 20) score += 1;
    if (pattern.length > 50) score += 2;
    
    if (score >= 8) analysis.complexity = 'Alta';
    else if (score >= 4) analysis.complexity = 'Media';
    else analysis.complexity = 'Baja';
    
    return analysis;
}

function getRegexCheatSheet() {
    return `
📋 CHEAT SHEET DE REGEX:
   .   → Cualquier caracter excepto nueva línea
   \d  → Dígito (0-9)
   \w  → Palabra (a-z, A-Z, 0-9, _)
   \s  → Espacio en blanco
   ^   → Inicio de línea
   $   → Fin de línea
   *   → 0 o más
   +   → 1 o más
   ?   → 0 o 1
   {n} → Exactamente n
   {n,} → n o más
   {n,m} → entre n y m
   |   → O (alternancia)
   ()  → Grupo
   []  → Clase de caracteres
   [^] → Negación de clase
   \b  → Límite de palabra
   \B  → No límite de palabra
`;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Regex Tester - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📋 Patrón: ${pattern}`);
        console.log(`📋 Flags: ${flags}`);
        console.log(`📋 Texto: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
        console.log('');
        
        // Analizar regex
        const analysis = analyzeRegex(pattern);
        console.log('📊 ANÁLISIS DEL PATRÓN:');
        console.log(`   🔹 Longitud: ${analysis.length} caracteres`);
        console.log(`   🔹 Anclas: ${analysis.hasAnchors ? '✅' : '❌'}`);
        console.log(`   🔹 Grupos: ${analysis.hasGroups ? '✅' : '❌'}`);
        console.log(`   🔹 Clases de caracteres: ${analysis.hasCharacterClass ? '✅' : '❌'}`);
        console.log(`   🔹 Cuantificadores: ${analysis.hasQuantifiers ? '✅' : '❌'}`);
        console.log(`   🔹 Alternancia: ${analysis.hasAlternation ? '✅' : '❌'}`);
        console.log(`   🔹 Complejidad: ${analysis.complexity}`);
        console.log('');
        
        // Probar regex
        const result = testRegex(pattern, text, flags);
        
        if (!result.success) {
            console.error(`❌ Error en la expresión regular: ${result.error}`);
            console.log('');
            console.log('💡 Verifica que el patrón sea válido');
            console.log('   Escapa caracteres especiales con \\\\');
            process.exit(1);
        }
        
        // Mostrar resultados
        console.log('📊 RESULTADOS:');
        console.log(`   🔹 Coincidencias encontradas: ${result.matchCount}`);
        console.log(`   🔹 Texto resaltado:`);
        console.log(`   ${result.highlighted}`);
        console.log('');
        
        if (result.matchCount > 0) {
            console.log('📋 DETALLES DE COINCIDENCIAS:');
            result.matches.forEach((m, i) => {
                console.log(`   ${i + 1}. "${m.match}" en posición ${m.index}`);
                if (m.groups && m.groups.length > 0) {
                    console.log(`      Grupos: ${m.groups.join(', ')}`);
                }
            });
            console.log('');
            
            // Estadísticas de coincidencias
            const lengths = result.matches.map(m => m.match.length);
            const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
            console.log('📊 ESTADÍSTICAS DE COINCIDENCIAS:');
            console.log(`   🔹 Longitud promedio: ${avgLength.toFixed(2)} caracteres`);
            console.log(`   🔹 Más corta: ${Math.min(...lengths)} caracteres`);
            console.log(`   🔹 Más larga: ${Math.max(...lengths)} caracteres`);
        } else {
            console.log('❌ No se encontraron coincidencias');
            console.log('');
            console.log('💡 Sugerencias:');
            console.log('   • Verifica que el patrón sea correcto');
            console.log('   • Prueba con diferentes flags (i, g, m)');
            console.log('   • Asegúrate de escapar caracteres especiales');
        }
        
        // Mostrar cheat sheet
        if (verbose) {
            console.log(getRegexCheatSheet());
        }
        
        console.log('\n✅ Regex Tester completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
