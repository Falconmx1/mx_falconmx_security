#!/usr/bin/env node
/**
 * MFH TOOLS - Credenciales No Protegidas
 * Acceso con Credenciales
 * 
 * Propósito: enumerar ubicaciones de almacenamiento de credenciales no protegidas en el sistema
 * Referencia: MITRE ATT&CK T1552 (Unsecured Credentials)
 * 
 * Uso: node unsecured-credentials.js --target <user_home> [--category <ssh|cloud|history|all>]
 * 
 * Autor: FalconMX Security
 */

'use strict';

const CONFIG = { version: '1.0.0', author: 'FalconMX Security' };

// ============================================================
// Categorías de credenciales
// ============================================================
const CATEGORIES = {
    ssh: {
        name: 'Claves SSH',
        description: 'Claves privadas SSH y archivos de hosts conocidos',
        paths: [
            '~/.ssh/id_rsa',
            '~/.ssh/id_ed25519',
            '~/.ssh/id_ecdsa',
            '~/.ssh/authorized_keys',
            '~/.ssh/known_hosts',
            '~/.ssh/config'
        ],
        risks: [
            'Las claves privadas con permisos 0644 pueden ser leídas por otros usuarios',
            'Las claves privadas sin cifrar se pueden usar directamente',
            'authorized_keys expone las claves de confianza'
        ],
        mitre: 'T1552.004'
    },
    cloud: {
        name: 'Credenciales de servicios en la nube',
        description: 'Configuración de AWS, GCP, Azure, Kubernetes',
        paths: [
            '~/.aws/credentials',
            '~/.aws/config',
            '~/.config/gcloud/credentials.db',
            '~/.azure/accessTokens.json',
            '~/.kube/config',
            '~/.docker/config.json'
        ],
        risks: [
            'La filtración de credenciales en la nube puede provocar la intrusión en el entorno de producción',
            'El config de Kubernetes contiene permisos de acceso al clúster',
            'El config de Docker puede contener credenciales del registry'
        ],
        mitre: 'T1552.001'
    },
    history: {
        name: 'Historial de Shell',
        description: 'Credenciales que pueden filtrarse en el historial de comandos',
        paths: [
            '~/.bash_history',
            '~/.zsh_history',
            '~/.python_history',
            '~/.mysql_history',
            '~/.psql_history'
        ],
        risks: [
            'Contraseñas en texto plano en la línea de comandos',
            'Variables de claves exportadas',
            'Cabeceras de autenticación en comandos curl'
        ],
        mitre: 'T1552.003'
    },
    browser: {
        name: 'Credenciales del navegador',
        description: 'Contraseñas y sesiones guardadas por el navegador',
        paths: [
            '~/.mozilla/firefox/*/logins.json',
            '~/.mozilla/firefox/*/key4.db',
            '~/.config/google-chrome/Default/Login Data',
            '~/.config/chromium/Default/Login Data'
        ],
        risks: [
            'Firefox logins.json + key4.db pueden descifrar contraseñas',
            'Chrome Login Data es una base de datos SQLite',
            'Las cookies de sesión pueden provocar el takeover de la cuenta'
        ],
        mitre: 'T1555.003'
    },
    keyring: {
        name: 'Credenciales del Keyring',
        description: 'Llavero del sistema y almacenes de claves de aplicaciones',
        paths: [
            '~/.local/share/keyrings/',
            '~/.gnome2/keyrings/'
        ],
        risks: [
            'Los archivos del llavero pueden descifrarse offline',
            'Almacena credenciales de aplicaciones GNOME/KDE'
        ],
        mitre: 'T1555.001'
    },
    git: {
        name: 'Credenciales de Git',
        description: 'Almacén de credenciales y configuración de Git',
        paths: [
            '~/.git-credentials',
            '~/.gitconfig',
            '~/.config/git/credentials'
        ],
        risks: [
            'git-credentials almacena tokens en texto plano',
            'gitconfig puede contener configuración del helper'
        ],
        mitre: 'T1552.001'
    },
    tokens: {
        name: 'Tokens de aplicaciones',
        description: 'Tokens de acceso de diversas aplicaciones y servicios',
        paths: [
            '~/.netrc',
            '~/.npmrc',
            '~/.pypirc',
            '~/.gem/credentials',
            '~/.config/gh/hosts.yml'
        ],
        risks: [
            'Los tokens de npm/pypi pueden publicar paquetes maliciosos',
            'El token de GitHub puede acceder a repositorios privados',
            'netrc almacena credenciales FTP/HTTP'
        ],
        mitre: 'T1552.001'
    }
};

// ============================================================
// Generación de reporte
// ============================================================
/**
 * Unsecured Credentials es un generador de listas estáticas, no un
 * enumerador de credenciales. No busca archivos, no lee nada, no enumera
 * nada. Solo imprime una lista fija de rutas y riesgos con '~/' fijo.
 *
 * Lo que realmente hace:
 * - Imprime una lista estática de 7 categorías de credenciales con rutas,
 *   riesgos y referencias MITRE ATT&CK.
 * - Muestra el target en el header (pero no lo usa en rutas ni comandos).
 * - Acepta --category para elegir una categoría o 'all'.
 * - Imprime 4 comandos de verificación genéricos con '~/' fijo.
 * - Advertencia legal.
 *
 * Bugs funcionales conocidos:
 * - --target es 100% DECORATIVO: solo se muestra en el header. Las rutas
 *   internas son siempre '~/.ssh/...', '~/.aws/...', etc. El target NO se
 *   interpola en ninguna ruta ni comando. Es el más decorativo de todas
 *   las herramientas auditadas.
 * - Rutas siempre '~/': no se usa el target para construir rutas como
 *   '<target>/.ssh/id_rsa'.
 * - Output 100% estático: el mismo siempre, solo cambia el header.
 * - --user y --path NO EXISTEN: solo --target y --category.
 * - --category inválida no advierte: cae silenciosamente a mostrar todas.
 * - Exit code 0 en todos los casos (no hay process.exit(1)).
 *
 * Ventaja de seguridad:
 * - No interpola target → sin inyección por copiar/pegar.
 *
 * Limitaciones:
 * - No enumera nada (solo imprime lista estática).
 * - No busca archivos, no lee nada, no detecta nada.
 * - No usa el target para construir rutas.
 * - El nombre "Unsecured Credentials" promete enumerar credenciales
 *   no protegidas; entrega una lista estática de rutas conocidas.
 */
function printReport(targetHome, selectedCategory) {
    console.log('');
    console.log('═'.repeat(65));
    console.log('  🔍 ENUMERACIÓN DE CREDENCIALES NO PROTEGIDAS');
    console.log('  Home objetivo: ' + (targetHome || '~/'));
    console.log('  Fecha: ' + new Date().toISOString());
    console.log('═'.repeat(65));
    console.log('');
    console.log('  Referencia: MITRE ATT&CK T1552 (Unsecured Credentials)');
    console.log('');

    var catsToShow = selectedCategory === 'all' ? Object.keys(CATEGORIES) :
                     CATEGORIES[selectedCategory] ? [selectedCategory] : Object.keys(CATEGORIES);

    catsToShow.forEach(function(key) {
        var cat = CATEGORIES[key];
        console.log('📌 ' + cat.name);
        console.log('   ' + cat.description);
        console.log('');
        console.log('   📁 Rutas:');
        cat.paths.forEach(function(p) { console.log('      ' + p); });
        console.log('');
        console.log('   ⚠️ Riesgos:');
        cat.risks.forEach(function(r) { console.log('      • ' + r); });
        console.log('');
        console.log('   🎯 MITRE: ' + cat.mitre);
        console.log('');
        console.log('─'.repeat(65));
        console.log('');
    });

    console.log('  🔧 Ejemplos de comandos de verificación:');
    console.log('');
    console.log('     # Buscar claves privadas SSH legibles');
    console.log('     find ~/.ssh -name "id_*" -type f ! -name "*.pub" -perm /o+r');
    console.log('');
    console.log('     # Buscar contraseñas en el historial del shell');
    console.log('     grep -iE "password|passwd|pwd|secret|token|key" ~/.bash_history');
    console.log('');
    console.log('     # Verificar archivos de credenciales en la nube');
    console.log('     ls -la ~/.aws/ ~/.config/gcloud/ ~/.kube/ 2>/dev/null');
    console.log('');
    console.log('     # Listar todos los archivos relacionados');
    console.log('     find ~ -maxdepth 3 \\( -name "*.pem" -o -name "*.key" -o -name "credentials*" \\) 2>/dev/null');
    console.log('');
    console.log('─'.repeat(65));
    console.log('  ⚠️ Solo enumera sistemas a los que tengas derecho de acceso.');
    console.log('    El acceso no autorizado a credenciales es ilegal.');
    console.log('─'.repeat(65));
    console.log('');
}

// ============================================================
// CLI
// ============================================================
function main() {
    var args = process.argv.slice(2);
    var targetIdx = args.indexOf('--target');
    var catIdx = args.indexOf('--category');

    if (args.length === 0) {
        console.log('');
        console.log('╔══════════════════════════════════════════════════════╗');
        console.log('║  MFH TOOLS — Credenciales No Protegidas v' + CONFIG.version + '      ║');
        console.log('║  ' + CONFIG.author + '                              ║');
        console.log('╚══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('  Uso: node unsecured-credentials.js --target <home> [--category <ssh|cloud|history|all>]');
        console.log('');
        console.log('  Categorías:');
        Object.keys(CATEGORIES).forEach(function(k) {
            console.log('    • ' + k + ' - ' + CATEGORIES[k].name);
        });
        console.log('');
        console.log('  Ejemplos:');
        console.log('    node unsecured-credentials.js --target ~/');
        console.log('    node unsecured-credentials.js --target ~/ --category ssh');
        console.log('');
        process.exit(0);
    }

    var target = targetIdx !== -1 ? args[targetIdx + 1] : '~/';
    var category = catIdx !== -1 ? args[catIdx + 1].toLowerCase() : 'all';

    console.log('\n🔍 Enumerando ubicaciones de credenciales no protegidas...\n');
    printReport(target, category);
}

main();
