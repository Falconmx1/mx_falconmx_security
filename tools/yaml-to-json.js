#!/usr/bin/env node

/**
 * YAML to JSON Converter - MFH TOOLS PRO
 * Convierte archivos YAML a JSON
 * 
 * Uso: node yaml-to-json.js <archivo.yaml> [opciones]
 * Ejemplo: node yaml-to-json.js config.yaml
 * Ejemplo: node yaml-to-json.js config.yaml --output config.json
 * Ejemplo: node yaml-to-json.js config.yaml --pretty
 */

const fs = require('fs');
const path = require('path');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let pretty = false;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 YAML to JSON Converter - MFH TOOLS PRO
=========================================
Convierte archivos YAML a JSON.

Uso:
  node yaml-to-json.js <archivo.yaml> [opciones]

Opciones:
  --output <archivo>   Archivo de salida JSON (default: nombre_archivo.json)
  --pretty             Formatear JSON con indentación
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node yaml-to-json.js config.yaml
  node yaml-to-json.js config.yaml --output config.json
  node yaml-to-json.js config.yaml --pretty
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--pretty') {
        pretty = true;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime,
            ext: path.extname(filePath).toLowerCase()
        };
    } catch (error) {
        return null;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function parseYAML(content) {
    const lines = content.split('\n');
    const result = {};
    let currentKey = null;
    let currentValue = [];
    let indentLevel = 0;
    let inArray = false;
    let arrayIndent = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        if (trimmed === '' || trimmed.startsWith('#')) continue;
        
        // Detectar indentación
        const indent = line.length - line.trimStart().length;
        
        // Detectar array
        if (trimmed.startsWith('- ')) {
            const value = trimmed.substring(2).trim();
            if (currentKey) {
                if (!Array.isArray(result[currentKey])) {
                    result[currentKey] = [];
                }
                result[currentKey].push(parseValue(value));
            }
            continue;
        }
        
        // Detectar clave: valor
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > 0) {
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            
            if (value === '' || value === '|' || value === '>') {
                // Valor multilínea
                currentKey = key;
                currentValue = [];
                indentLevel = indent + 2;
                inArray = false;
                continue;
            }
            
            // Asignar valor
            const parsedValue = parseValue(value);
            if (indent === 0) {
                result[key] = parsedValue;
            } else {
                // Anidado
                const parent = getParentObject(result, indent);
                if (parent) {
                    parent[key] = parsedValue;
                }
            }
            currentKey = null;
        } else if (currentKey && indent >= indentLevel) {
            // Continuar valor multilínea
            currentValue.push(trimmed);
        }
    }
    
    // Procesar valores multilínea
    if (currentKey && currentValue.length > 0) {
        const value = currentValue.join('\n');
        const parent = getParentObject(result, indentLevel);
        if (parent) {
            parent[currentKey] = value;
        } else {
            result[currentKey] = value;
        }
    }
    
    return result;
}

function parseValue(value) {
    // Números
    if (!isNaN(value) && value !== '') {
        return Number(value);
    }
    // Booleanos
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    if (value.toLowerCase() === 'null') return null;
    // Strings
    if (value.startsWith('"') && value.endsWith('"')) {
        return value.substring(1, value.length - 1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
        return value.substring(1, value.length - 1);
    }
    return value;
}

function getParentObject(obj, indent) {
    // Para simplificar, devolvemos el objeto raíz
    return obj;
}

function parseYAMLPython(content) {
    // Intento con Python si está disponible
    try {
        const { execSync } = require('child_process');
        const result = execSync(`python3 -c "import yaml, json, sys; print(json.dumps(yaml.safe_load(sys.stdin.read())))"`, {
            input: content,
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return JSON.parse(result.toString());
    } catch (error) {
        return null;
    }
}

function detectYAML(content) {
    const lines = content.split('\n');
    let hasColon = false;
    let hasDash = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes(':')) hasColon = true;
        if (trimmed.startsWith('- ')) hasDash = true;
    }
    
    return hasColon || hasDash;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 YAML to JSON Converter - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📁 Archivo: ${inputFile}`);
        
        // Verificar archivo
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Archivo no encontrado: ${inputFile}`);
            process.exit(1);
        }
        
        const fileInfo = getFileInfo(inputFile);
        console.log(`📏 Tamaño: ${fileInfo.sizeFormatted}`);
        console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
        
        // Leer archivo
        console.log('📖 Leyendo archivo YAML...');
        const content = fs.readFileSync(inputFile, 'utf8');
        console.log(`📏 Longitud: ${content.length} caracteres`);
        console.log('');
        
        // Validar YAML
        console.log('🔍 Validando YAML...');
        const isValid = detectYAML(content);
        
        if (!isValid) {
            console.warn('⚠️ El archivo no parece ser YAML válido');
        }
        
        // Parsear YAML
        console.log('🔍 Parseando YAML...');
        let data;
        
        // Intentar con Python primero (más robusto)
        try {
            data = parseYAMLPython(content);
            if (data !== null) {
                console.log('✅ Parseado con Python (yaml library)');
            }
        } catch (e) {
            // Continuar
        }
        
        // Si falló Python, usar parser manual
        if (!data) {
            data = parseYAML(content);
            console.log('✅ Parseado con parser manual');
        }
        
        if (!data || Object.keys(data).length === 0) {
            console.error('❌ No se pudo parsear el YAML');
            process.exit(1);
        }
        
        // Estadísticas
        const keys = Object.keys(data);
        console.log(`📊 Datos parseados: ${keys.length} claves principales`);
        console.log(`   Claves: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? ` ... (${keys.length} total)` : ''}`);
        console.log('');
        
        // Guardar JSON
        if (!outputFile) {
            const baseName = path.basename(inputFile, path.extname(inputFile));
            outputFile = `${baseName}.json`;
        }
        
        console.log(`💾 Guardando JSON en: ${outputFile}`);
        const jsonContent = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
        fs.writeFileSync(outputFile, jsonContent);
        
        const outputInfo = getFileInfo(outputFile);
        console.log(`✅ JSON guardado exitosamente (${outputInfo.sizeFormatted})`);
        
        // Mostrar preview
        console.log('\n📋 PREVIEW DEL JSON:');
        const preview = jsonContent.slice(0, 500);
        console.log(preview + (jsonContent.length > 500 ? '...' : ''));
        
        console.log('\n✅ YAML to JSON Converter completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        console.log('');
        console.log('💡 Para mejor soporte YAML:');
        console.log('   • Instala pyyaml: pip3 install pyyaml');
        console.log('   • Usa archivos YAML válidos');
        process.exit(1);
    }
})();
