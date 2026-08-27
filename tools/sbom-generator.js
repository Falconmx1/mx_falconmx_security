#!/usr/bin/env node

/**
 * SBOM Generator - MFH TOOLS PRO
 * Genera Software Bill of Materials (SBOM) en formatos SPDX y CycloneDX
 * 
 * Uso: node sbom-generator.js [opciones]
 * Ejemplo: node sbom-generator.js --scan --path ./project
 * Ejemplo: node sbom-generator.js --format spdx --output sbom.json
 * Ejemplo: node sbom-generator.js --compare --sbom1 sbom1.json --sbom2 sbom2.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'sbom_config.json');
const SBOMS_DIR = path.join(__dirname, 'sbom_reports');

const DEFAULT_CONFIG = {
    formats: ['spdx', 'cyclonedx'],
    include_dev_dependencies: true,
    include_hashes: true,
    include_licenses: true,
    exclude_patterns: ['node_modules', '.git', 'dist', 'build']
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let scanPath = null;
let format = 'spdx';
let outputFile = null;
let sbom1 = null;
let sbom2 = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--scan':
            action = 'scan';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                scanPath = args[i + 1];
                i++;
            }
            break;
        case '--compare':
            action = 'compare';
            break;
        case '--format':
            format = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
            i++;
            break;
        case '--sbom1':
            sbom1 = args[i + 1];
            i++;
            break;
        case '--sbom2':
            sbom2 = args[i + 1];
            i++;
            break;
        case '--path':
            scanPath = args[i + 1];
            i++;
            break;
        case '--init':
            init = true;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
📋 SBOM Generator - MFH TOOLS PRO
================================
Genera Software Bill of Materials (SBOM) en formatos SPDX y CycloneDX.

Uso:
  node sbom-generator.js [opciones]

Opciones:
  --init                Crear configuracion por defecto
  --scan [directorio]   Escanear proyecto y generar SBOM
  --compare             Comparar dos SBOMs
  --format <formato>    Formato de salida (spdx, cyclonedx)
  --output <archivo>    Guardar SBOM en archivo
  --sbom1 <archivo>     Primer SBOM para comparar
  --sbom2 <archivo>     Segundo SBOM para comparar
  --path <directorio>   Directorio del proyecto
  --verbose, -v         Mostrar mas detalles
  --help, -h            Mostrar esta ayuda

Ejemplos:
  node sbom-generator.js --init
  node sbom-generator.js --scan --path ./project
  node sbom-generator.js --scan --format cyclonedx --output sbom.json
  node sbom-generator.js --compare --sbom1 sbom1.json --sbom2 sbom2.json
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('❌ Error cargando configuracion:', error.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('❌ Error guardando configuracion:', error.message);
    }
}

function initConfig() {
    if (!fs.existsSync(SBOMS_DIR)) {
        fs.mkdirSync(SBOMS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 SBOMs: ${SBOMS_DIR}`);
}

function scanProject(projectPath) {
    console.log(`🔍 Escaneando proyecto: ${projectPath || 'directorio actual'}`);
    
    const config = loadConfig();
    const targetPath = projectPath || '.';
    
    if (!fs.existsSync(targetPath)) {
        console.error(`❌ Directorio no encontrado: ${targetPath}`);
        return;
    }
    
    // Detectar tipo de proyecto
    const packageJsonPath = path.join(targetPath, 'package.json');
    const pomPath = path.join(targetPath, 'pom.xml');
    const requirementsPath = path.join(targetPath, 'requirements.txt');
    const goModPath = path.join(targetPath, 'go.mod');
    
    let projectType = 'unknown';
    let dependencies = [];
    
    if (fs.existsSync(packageJsonPath)) {
        projectType = 'nodejs';
        dependencies = parseNodeProject(targetPath);
    } else if (fs.existsSync(pomPath)) {
        projectType = 'java';
        dependencies = parseJavaProject(targetPath);
    } else if (fs.existsSync(requirementsPath)) {
        projectType = 'python';
        dependencies = parsePythonProject(targetPath);
    } else if (fs.existsSync(goModPath)) {
        projectType = 'golang';
        dependencies = parseGoProject(targetPath);
    } else {
        console.log('⚠️ No se detecto un proyecto reconocido. Escaneando archivos...');
        dependencies = scanFiles(targetPath);
    }
    
    // Generar SBOM
    const sbom = generateSBOM(projectType, targetPath, dependencies, format);
    
    // Guardar SBOM
    const outputPath = outputFile || path.join(SBOMS_DIR, `sbom_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
    
    console.log(`\n📊 SBOM generado:`);
    console.log(`   Proyecto: ${targetPath}`);
    console.log(`   Tipo: ${projectType}`);
    console.log(`   Dependencias: ${dependencies.length}`);
    console.log(`   Formato: ${format}`);
    console.log(`   📁 Guardado: ${outputPath}`);
    
    return sbom;
}

function parseNodeProject(projectPath) {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
    const dependencies = [];
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const [name, version] of Object.entries(allDeps)) {
        const hash = crypto.createHash('sha256')
            .update(`${name}@${version}`)
            .digest('hex');
        
        dependencies.push({
            name: name,
            version: version,
            type: packageJson.devDependencies && packageJson.devDependencies[name] ? 'dev' : 'runtime',
            hash: hash,
            license: getLicenseForPackage(name),
            purl: `pkg:npm/${name}@${version}`
        });
    }
    
    return dependencies;
}

function parseJavaProject(projectPath) {
    // Simular dependencias Java
    const dependencies = [
        { name: 'spring-boot-starter', version: '3.2.0', type: 'runtime' },
        { name: 'spring-boot-starter-web', version: '3.2.0', type: 'runtime' },
        { name: 'spring-boot-starter-data-jpa', version: '3.2.0', type: 'runtime' },
        { name: 'mysql-connector-java', version: '8.0.33', type: 'runtime' },
        { name: 'lombok', version: '1.18.30', type: 'dev' },
        { name: 'spring-boot-starter-test', version: '3.2.0', type: 'dev' }
    ];
    
    return dependencies.map(dep => ({
        ...dep,
        hash: crypto.createHash('sha256')
            .update(`${dep.name}@${dep.version}`)
            .digest('hex'),
        license: 'Apache-2.0',
        purl: `pkg:maven/${dep.name}@${dep.version}`
    }));
}

function parsePythonProject(projectPath) {
    // Simular dependencias Python
    const dependencies = [
        { name: 'flask', version: '3.0.0', type: 'runtime' },
        { name: 'django', version: '5.0.0', type: 'runtime' },
        { name: 'numpy', version: '1.26.0', type: 'runtime' },
        { name: 'pandas', version: '2.1.0', type: 'runtime' },
        { name: 'pytest', version: '7.4.0', type: 'dev' }
    ];
    
    return dependencies.map(dep => ({
        ...dep,
        hash: crypto.createHash('sha256')
            .update(`${dep.name}@${dep.version}`)
            .digest('hex'),
        license: 'MIT',
        purl: `pkg:pypi/${dep.name}@${dep.version}`
    }));
}

function parseGoProject(projectPath) {
    // Simular dependencias Go
    const dependencies = [
        { name: 'github.com/gin-gonic/gin', version: 'v1.9.1', type: 'runtime' },
        { name: 'github.com/jinzhu/gorm', version: 'v1.9.16', type: 'runtime' },
        { name: 'github.com/stretchr/testify', version: 'v1.8.4', type: 'dev' },
        { name: 'golang.org/x/crypto', version: 'v0.16.0', type: 'runtime' }
    ];
    
    return dependencies.map(dep => ({
        ...dep,
        hash: crypto.createHash('sha256')
            .update(`${dep.name}@${dep.version}`)
            .digest('hex'),
        license: 'MIT',
        purl: `pkg:golang/${dep.name}@${dep.version}`
    }));
}

function scanFiles(projectPath) {
    const dependencies = [];
    const files = fs.readdirSync(projectPath);
    
    for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.go')) {
            const content = fs.readFileSync(path.join(projectPath, file), 'utf8');
            const matches = content.match(/(?:import|require|from)\s+['"]([^'"]+)['"]/g) || [];
            
            for (const match of matches) {
                const name = match.replace(/^(?:import|require|from)\s+['"]/, '').replace(/['"]$/, '');
                if (!dependencies.find(d => d.name === name)) {
                    dependencies.push({
                        name: name,
                        version: 'unknown',
                        type: 'runtime',
                        hash: crypto.createHash('sha256')
                            .update(name)
                            .digest('hex'),
                        license: 'unknown',
                        purl: `pkg:generic/${name}`
                    });
                }
            }
        }
    }
    
    return dependencies;
}

function getLicenseForPackage(name) {
    // Simular licencias comunes
    const licenses = {
        'express': 'MIT',
        'react': 'MIT',
        'vue': 'MIT',
        'angular': 'MIT',
        'lodash': 'MIT',
        'axios': 'MIT',
        'typescript': 'Apache-2.0',
        'jest': 'MIT',
        'webpack': 'MIT',
        'babel': 'MIT'
    };
    
    return licenses[name] || 'unknown';
}

function generateSBOM(projectType, projectPath, dependencies, format) {
    const sbom = {
        document: {
            id: crypto.randomBytes(16).toString('hex'),
            created: new Date().toISOString(),
            format: format,
            project_type: projectType,
            project_path: projectPath
        },
        metadata: {
            generator: 'MFH TOOLS PRO - SBOM Generator',
            version: '1.0.0'
        },
        dependencies: dependencies.map(dep => ({
            name: dep.name,
            version: dep.version,
            type: dep.type || 'runtime',
            hash: dep.hash,
            license: dep.license || 'unknown',
            purl: dep.purl || `pkg:generic/${dep.name}@${dep.version}`
        })),
        summary: {
            total: dependencies.length,
            runtime: dependencies.filter(d => d.type === 'runtime').length,
            dev: dependencies.filter(d => d.type === 'dev').length,
            unknown: dependencies.filter(d => d.type === 'unknown').length
        }
    };
    
    // Generar SPDX
    if (format === 'spdx') {
        sbom.document.format = 'spdx';
        sbom.spdx = {
            spdxVersion: 'SPDX-2.3',
            dataLicense: 'CC0-1.0',
            name: `SBOM-${projectType}-${Date.now()}`,
            documentNamespace: `https://mfh-tools.com/sbom/${sbom.document.id}`
        };
    }
    
    // Generar CycloneDX
    if (format === 'cyclonedx') {
        sbom.document.format = 'cyclonedx';
        sbom.cyclonedx = {
            bomFormat: 'CycloneDX',
            specVersion: '1.5',
            version: 1
        };
    }
    
    return sbom;
}

function compareSBOMs(sbom1Path, sbom2Path) {
    console.log(`🔍 Comparando SBOMs:`);
    console.log(`   SBOM 1: ${sbom1Path}`);
    console.log(`   SBOM 2: ${sbom2Path}`);
    
    if (!fs.existsSync(sbom1Path) || !fs.existsSync(sbom2Path)) {
        console.error('❌ No se encontraron los archivos SBOM');
        return;
    }
    
    const sbom1Data = JSON.parse(fs.readFileSync(sbom1Path, 'utf8'));
    const sbom2Data = JSON.parse(fs.readFileSync(sbom2Path, 'utf8'));
    
    const deps1 = new Set(sbom1Data.dependencies.map(d => d.name));
    const deps2 = new Set(sbom2Data.dependencies.map(d => d.name));
    
    const onlyIn1 = [...deps1].filter(d => !deps2.has(d));
    const onlyIn2 = [...deps2].filter(d => !deps1.has(d));
    const common = [...deps1].filter(d => deps2.has(d));
    
    console.log(`\n📊 Resultados de la comparacion:`);
    console.log(`   🔄 Comunes: ${common.length}`);
    console.log(`   ➕ Solo en SBOM 1: ${onlyIn1.length}`);
    console.log(`   ➕ Solo en SBOM 2: ${onlyIn2.length}`);
    
    if (onlyIn1.length > 0) {
        console.log(`\n📌 Solo en SBOM 1:`);
        onlyIn1.forEach(d => console.log(`   • ${d}`));
    }
    
    if (onlyIn2.length > 0) {
        console.log(`\n📌 Solo en SBOM 2:`);
        onlyIn2.forEach(d => console.log(`   • ${d}`));
    }
    
    // Guardar comparacion
    const comparison = {
        timestamp: new Date().toISOString(),
        sbom1: sbom1Path,
        sbom2: sbom2Path,
        common: common,
        only_in_sbom1: onlyIn1,
        only_in_sbom2: onlyIn2,
        stats: {
            total_sbom1: deps1.size,
            total_sbom2: deps2.size,
            common: common.length,
            only_in_sbom1: onlyIn1.length,
            only_in_sbom2: onlyIn2.length
        }
    };
    
    const comparisonPath = outputFile || path.join(SBOMS_DIR, `comparison_${Date.now()}.json`);
    fs.writeFileSync(comparisonPath, JSON.stringify(comparison, null, 2));
    console.log(`\n📄 Comparacion guardada: ${comparisonPath}`);
    
    return comparison;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`📋 SBOM Generator - MFH TOOLS PRO`);
    console.log('='.repeat(40));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(SBOMS_DIR)) {
        fs.mkdirSync(SBOMS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'scan':
            scanProject(scanPath);
            break;
            
        case 'compare':
            if (!sbom1 || !sbom2) {
                console.error('❌ Debes especificar --sbom1 y --sbom2');
                process.exit(1);
            }
            compareSBOMs(sbom1, sbom2);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --scan, --compare, --init');
            break;
    }
    
    console.log('\n✅ SBOM Generator completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo SBOM Generator...');
    process.exit(0);
});
