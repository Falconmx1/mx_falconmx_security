#!/usr/bin/env node
/**
 * MFH TOOLS - Identity Information
 * Fase 1: Reconocimiento
 * 
 * Uso: node identity-information.js --target <email@dominio.com|usuario>
 * 
 * Autor: FalconMX Security
 * GitHub: https://github.com/Falconmx1/mx_falconmx_security
 */

'use strict';

const CONFIG = {
    version: '2.0.0',
    author: 'FalconMX Security'
};

// ============================================================
// VALIDACIONES
// ============================================================
function isValidEmail(e) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidUser(u) {
    return /^[a-z0-9._-]{3,32}$/i.test(u);
}

// ============================================================
// ANÁLISIS
// ============================================================
/**
 * Lo que es: un validador de email/usuario + un checklist heurístico de 5 regex +
 * un detector de patrones de 3 regex + un bloque de tips estático.
 * No hace reconocimiento real.
 * No resuelve MX del dominio (para verificar si acepta correo).
 * No hace SMTP handshake ni verifica existencia del buzón.
 * No consulta HaveIBeenPwned, Hunter.io, IntelX, ni ninguna API real.
 * No busca en redes sociales (solo sugiere Sherlock/Maigret).
 * No valida el dominio contra DNS.
 * No detecta emails desechables (temp-mail, etc.).
 * No verifica SPF/DKIM/DMARC.
 */
function analyzeIdentity(target) {
    const isEmail = isValidEmail(target);
    const parts = target.split('@');
    const user = parts[0] || target;
    const domain = parts[1] || '(sin dominio)';

    if (!isEmail && !isValidUser(target)) {
        return { error: 'Target inválido. Debe ser un email o usuario válido.' };
    }

    const warnings = [];
    if (user.length < 4) warnings.push('Usuario muy corto (fácil de adivinar)');
    if (user.length > 30) warnings.push('Usuario muy largo');
    if (/^(admin|root|test|user|info|support|guest|demo)$/i.test(user)) warnings.push('Usuario genérico común (riesgo de fuerza bruta)');
    if (/\d{4,}/.test(user)) warnings.push('Contiene muchos números');
    if (/^[0-9]/.test(user)) warnings.push('Empieza con número');

    const patterns = [];
    if (/^[a-z]+\.[a-z]+$/i.test(user)) patterns.push('Nombre.Apellido detectado');
    if (/^[a-z]+_[a-z]+$/i.test(user)) patterns.push('Nombre_Apellido detectado');
    if (/^[a-z]+\d+$/i.test(user)) patterns.push('Nombre + números detectado');

    return {
        target,
        user,
        domain,
        isEmail,
        warnings,
        patterns,
        timestamp: new Date().toISOString()
    };
}

// ============================================================
// REPORTE
// ============================================================
function printReport(data) {
    if (data.error) {
        console.log('\n❌ ' + data.error + '\n');
        return;
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('  👤 IDENTITY INFORMATION REPORT');
    console.log('  Target: ' + data.target);
    console.log('  Fecha: ' + data.timestamp);
    console.log('═'.repeat(60));
    console.log('');
    console.log('  📧 Información básica:');
    console.log('     • Usuario: ' + data.user);
    console.log('     • Dominio: ' + data.domain);
    console.log('     • Formato válido: ' + (data.isEmail ? '✅ Sí (email)' : '⚠️ Solo usuario'));
    console.log('');

    if (data.patterns.length) {
        console.log('  🔍 Patrones detectados:');
        data.patterns.forEach(p => console.log('     • ' + p));
        console.log('');
    }

    if (data.warnings.length) {
        console.log('  ⚠️ Advertencias:');
        data.warnings.forEach(w => console.log('     • ' + w));
    } else {
        console.log('  ✅ Sin advertencias detectadas');
    }
    console.log('');

    console.log('  🔍 Recomendaciones OSINT:');
    console.log('     • https://haveibeenpwned.com/ (brechas de datos)');
    console.log('     • https://hunter.io/ (emails corporativos, requiere API)');
    console.log('     • https://intelx.io/ (inteligencia de fuentes abiertas)');
    console.log('     • Google dork: "' + data.target + '" -site:' + data.domain);
    console.log('');

    console.log('─'.repeat(60));
    console.log('  🔧 HERRAMIENTAS AVANZADAS (requieren terminal)');
    console.log('─'.repeat(60));
    console.log('');
    console.log('  📦 theHarvester - Emails y subdominios');
    console.log('     Instalación:');
    console.log('       pip install theHarvester');
    console.log('     Uso:');
    console.log('       theHarvester -d ' + data.domain + ' -b all');
    console.log('');
    console.log('  📦 holehe - Verifica email en 120+ sitios');
    console.log('     Instalación:');
    console.log('       pip install holehe');
    console.log('     Uso:');
    console.log('       holehe ' + data.target);
    console.log('');
    console.log('  📦 Sherlock - Busca usuario en redes sociales');
    console.log('     Instalación:');
    console.log('       pip install sherlock-project');
    console.log('     Uso:');
    console.log('       sherlock ' + data.user);
    console.log('');
    console.log('  📦 Maigret - Alternativa avanzada a Sherlock');
    console.log('     Instalación:');
    console.log('       pip install maigret');
    console.log('     Uso:');
    console.log('       maigret ' + data.user);
    console.log('');
    console.log('─'.repeat(60));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    const args = process.argv.slice(2);
    const targetIdx = args.indexOf('--target');

    if (targetIdx === -1 || !args[targetIdx + 1]) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Identity Information v' + CONFIG.version + '          ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node identity-information.js --target <email@dominio.com|usuario>');
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node identity-information.js --target admin@ejemplo.com');
        console.log('    node identity-information.js --target juanperez');
        console.log('');
        process.exit(0);
    }

    const target = args[targetIdx + 1];
    console.log('\n🔍 Analizando identidad: ' + target + '\n');

    const data = analyzeIdentity(target);
    printReport(data);
}

main();
