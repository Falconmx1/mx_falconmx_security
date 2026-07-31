#!/usr/bin/env node

/**
 * Password Strength Checker - MFH TOOLS PRO
 * Verifica la fortaleza de contraseñas
 * 
 * Uso: node password-strength.js <contraseña>
 * Ejemplo: node password-strength.js MiClave123!
 * Ejemplo: node password-strength.js --verbose MiClave123!
 */

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    commonPasswords: [
        '123456', 'password', '12345678', 'qwerty', 'abc123', 'monkey', 'letmein',
        'dragon', 'baseball', 'master', '1234567', '123456789', '12345', 'admin',
        'welcome', 'login', 'princess', 'sunshine', 'iloveyou', 'fuckyou'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let password = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Password Strength Checker - MFH TOOLS PRO
=============================================
Verifica la fortaleza de contraseñas.

Uso:
  node password-strength.js <contraseña>
  node password-strength.js --verbose <contraseña>

Ejemplos:
  node password-strength.js MiClave123!
  node password-strength.js --verbose MiClave123!
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verbose') {
        verbose = true;
    } else if (!args[i].startsWith('--')) {
        password = args[i];
    }
}

if (!password) {
    console.error('❌ Contraseña no proporcionada');
    process.exit(1);
}

// ==================== FUNCIONES ====================
function analyzePassword(pwd) {
    const analysis = {
        length: pwd.length,
        hasUppercase: /[A-Z]/.test(pwd),
        hasLowercase: /[a-z]/.test(pwd),
        hasNumbers: /[0-9]/.test(pwd),
        hasSpecial: /[^a-zA-Z0-9]/.test(pwd),
        isCommon: CONFIG.commonPasswords.includes(pwd.toLowerCase()),
        repeatedChars: false,
        sequence: false
    };
    
    // Detectar caracteres repetidos
    if (/(.)\1{2,}/.test(pwd)) {
        analysis.repeatedChars = true;
    }
    
    // Detectar secuencias comunes
    const sequences = ['123', 'abc', 'qwe', 'asd', 'zxc', 'rty', 'fgh', 'vbn', 'uio', 'jkl', 'm', '098', '987'];
    for (const seq of sequences) {
        if (pwd.toLowerCase().includes(seq)) {
            analysis.sequence = true;
            break;
        }
    }
    
    // Calcular puntuación
    let score = 0;
    
    // Longitud
    if (analysis.length >= 8) score += 20;
    if (analysis.length >= 12) score += 15;
    if (analysis.length >= 16) score += 15;
    if (analysis.length >= 20) score += 10;
    
    // Complejidad
    if (analysis.hasUppercase) score += 10;
    if (analysis.hasLowercase) score += 10;
    if (analysis.hasNumbers) score += 10;
    if (analysis.hasSpecial) score += 15;
    
    // Penalizaciones
    if (analysis.isCommon) score -= 30;
    if (analysis.repeatedChars) score -= 10;
    if (analysis.sequence) score -= 10;
    
    // Limitar puntuación
    score = Math.max(0, Math.min(100, score));
    
    // Determinar nivel
    let level = 'Muy Débil';
    let color = '🔴';
    let emoji = '❌';
    if (score >= 80) {
        level = 'Excelente';
        color = '🟢';
        emoji = '✅';
    } else if (score >= 60) {
        level = 'Fuerte';
        color = '🟢';
        emoji = '✅';
    } else if (score >= 40) {
        level = 'Media';
        color = '🟡';
        emoji = '⚠️';
    } else if (score >= 20) {
        level = 'Débil';
        color = '🟠';
        emoji = '⚠️';
    }
    
    return { ...analysis, score, level, color, emoji };
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Password Strength Checker`);
        console.log('='.repeat(60));
        console.log(`🔐 Contraseña analizada: ${'*'.repeat(password.length)}`);
        console.log('');
        
        const analysis = analyzePassword(password);
        
        console.log('📊 ANÁLISIS:');
        console.log(`   Longitud: ${analysis.length} caracteres`);
        console.log(`   Mayúsculas: ${analysis.hasUppercase ? '✅' : '❌'}`);
        console.log(`   Minúsculas: ${analysis.hasLowercase ? '✅' : '❌'}`);
        console.log(`   Números: ${analysis.hasNumbers ? '✅' : '❌'}`);
        console.log(`   Caracteres especiales: ${analysis.hasSpecial ? '✅' : '❌'}`);
        console.log(`   Es común: ${analysis.isCommon ? '⚠️ Sí' : '✅ No'}`);
        console.log(`   Caracteres repetidos: ${analysis.repeatedChars ? '⚠️ Sí' : '✅ No'}`);
        console.log(`   Secuencias: ${analysis.sequence ? '⚠️ Sí' : '✅ No'}`);
        
        console.log('');
        console.log('🔹 PUNTUACIÓN:');
        console.log(`   Puntuación: ${analysis.score}/100`);
        console.log(`   Nivel: ${analysis.color} ${analysis.level}`);
        
        // Recomendaciones
        console.log('');
        console.log('🔹 RECOMENDACIONES:');
        const recommendations = [];
        
        if (analysis.length < 8) {
            recommendations.push('🔴 Aumentar longitud a mínimo 8 caracteres');
        }
        if (analysis.length < 12) {
            recommendations.push('🟡 Recomendado: 12+ caracteres para mejor seguridad');
        }
        if (!analysis.hasUppercase) {
            recommendations.push('🟡 Incluir al menos una letra mayúscula');
        }
        if (!analysis.hasLowercase) {
            recommendations.push('🟡 Incluir al menos una letra minúscula');
        }
        if (!analysis.hasNumbers) {
            recommendations.push('🟡 Incluir al menos un número');
        }
        if (!analysis.hasSpecial) {
            recommendations.push('🟡 Incluir al menos un carácter especial (!@#$%^&*)');
        }
        if (analysis.isCommon) {
            recommendations.push('🔴 Contraseña común - elegir una menos predecible');
        }
        if (analysis.repeatedChars) {
            recommendations.push('🟡 Evitar caracteres repetidos consecutivos');
        }
        if (analysis.sequence) {
            recommendations.push('🟡 Evitar secuencias comunes (123, abc, qwe)');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ Excelente contraseña - ¡Buen trabajo!');
        }
        
        recommendations.forEach(rec => console.log(`   ${rec}`));
        
        console.log('\n✅ Password Strength Checker completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
