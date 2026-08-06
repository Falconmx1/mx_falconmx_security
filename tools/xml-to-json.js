#!/usr/bin/env node

/**
 * XML to JSON Converter - MFH TOOLS PRO
 * Convierte archivos XML a JSON
 * 
 * Uso: node xml-to-json.js <archivo.xml> [opciones]
 * Ejemplo: node xml-to-json.js datos.xml
 * Ejemplo: node xml-to-json.js datos.xml --output datos.json
 * Ejemplo: node xml-to-json.js datos.xml --pretty
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
🔍 XML to JSON Converter - MFH TOOLS PRO
========================================
Convierte archivos XML a JSON.

Uso:
  node xml-to-json.js <archivo.xml> [opciones]

Opciones:
  --output <archivo>   Archivo de salida JSON (default: nombre_archivo.json)
  --pretty             Formatear JSON con indentación
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node xml-to-json.js datos.xml
  node xml-to-json.js datos.xml --output datos.json
  node xml-to-json.js datos.xml --pretty
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

function parseXML(xml) {
    // Limpiar XML
    xml = xml.replace(/<\?xml[^?]*\?>/g, '');
    xml = xml.replace(/<!--[\s\S]*?-->/g, '');
    xml = xml.replace(/\s+/g, ' ');
    
    const result = {};
    let current = result;
    const stack = [];
    
    // Encontrar el elemento raíz
    const rootMatch = xml.match(/<([a-zA-Z0-9_-]+)[^>]*>/);
    if (!rootMatch) {
        return { error: 'No se encontró elemento raíz en el XML' };
    }
    
    const rootName = rootMatch[1];
    result[rootName] = {};
    stack.push({ name: rootName, obj: result[rootName] });
    current = result[rootName];
    
    // Procesar el XML
    let i = 0;
    let inTag = false;
    let tagName = '';
    let tagContent = '';
    let isClosing = false;
    let isSelfClosing = false;
    
    // Parser simplificado
    const tagRegex = /<([a-zA-Z0-9_-]+)([^>]*)>/g;
    const closingTagRegex = /<\/([a-zA-Z0-9_-]+)>/g;
    const selfClosingTagRegex = /<([a-zA-Z0-9_-]+)([^>]*)\/>/g;
    
    // Obtener todas las etiquetas y contenido
    const tags = [];
    let pos = 0;
    let match;
    
    // Encontrar todas las etiquetas
    while ((match = tagRegex.exec(xml)) !== null) {
        const isSelfClosing = xml[match.index + match[0].length - 2] === '/';
        const isClosing = false;
        tags.push({
            index: match.index,
            name: match[1],
            attributes: parseAttributes(match[2]),
            isSelfClosing,
            isClosing,
            endIndex: match.index + match[0].length
        });
    }
    
    // Encontrar etiquetas de cierre
    while ((match = closingTagRegex.exec(xml)) !== null) {
        tags.push({
            index: match.index,
            name: match[1],
            attributes: {},
            isSelfClosing: false,
            isClosing: true,
            endIndex: match.index + match[0].length
        });
    }
    
    // Ordenar por índice
    tags.sort((a, b) => a.index - b.index);
    
    // Construir objeto
    const stack2 = [];
    const root2 = {};
    let current2 = root2;
    let currentName = '';
    
    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        
        if (tag.isClosing) {
            if (stack2.length > 0) {
                const parent = stack2.pop();
                current2 = parent.obj;
                currentName = parent.name;
            }
            continue;
        }
        
        if (tag.isSelfClosing) {
            // Elemento autocerrado
            const value = tag.attributes._value || null;
            if (Array.isArray(current2)) {
                current2.push(value);
            } else if (currentName) {
                if (!current2[currentName]) {
                    current2[currentName] = value;
                } else if (Array.isArray(current2[currentName])) {
                    current2[currentName].push(value);
                } else {
                    current2[currentName] = [current2[currentName], value];
                }
            }
            continue;
        }
        
        // Buscar contenido hasta la siguiente etiqueta
        let content = '';
        const nextTagIndex = tags[i + 1] ? tags[i + 1].index : xml.length;
        content = xml.substring(tag.endIndex, nextTagIndex).trim();
        
        // Parsear contenido
        let parsedContent = content;
        if (content && !content.match(/^[0-9]+$/)) {
            // Intentar parsear como número
            const num = parseFloat(content);
            if (!isNaN(num) && content === String(num)) {
                parsedContent = num;
            }
        }
        
        // Agregar al objeto
        if (Array.isArray(current2)) {
            const obj = {};
            if (tag.attributes && Object.keys(tag.attributes).length > 0) {
                Object.assign(obj, tag.attributes);
            }
            if (parsedContent) {
                obj._text = parsedContent;
            }
            if (Object.keys(obj).length === 1 && obj._text !== undefined) {
                current2.push(obj._text);
            } else {
                current2.push(obj);
            }
            stack2.push({ obj: current2[current2.length - 1], name: tag.name });
            current2 = current2[current2.length - 1];
        } else if (currentName) {
            const obj = {};
            if (tag.attributes && Object.keys(tag.attributes).length > 0) {
                Object.assign(obj, tag.attributes);
            }
            if (parsedContent) {
                obj._text = parsedContent;
            }
            
            if (!current2[currentName]) {
                current2[currentName] = obj;
            } else if (Array.isArray(current2[currentName])) {
                current2[currentName].push(obj);
            } else {
                current2[currentName] = [current2[currentName], obj];
            }
            
            stack2.push({ obj: current2[currentName], name: tag.name });
            current2 = current2[currentName];
        } else {
            // Raíz
            if (tag.attributes && Object.keys(tag.attributes).length > 0) {
                Object.assign(root2, tag.attributes);
            }
            if (parsedContent) {
                root2._text = parsedContent;
            }
            stack2.push({ obj: root2, name: tag.name });
            current2 = root2;
        }
        currentName = tag.name;
    }
    
    // Si root2 está vacío, usar el resultado del otro parser
    if (Object.keys(root2).length === 0 && result[rootName]) {
        return result;
    }
    
    return root2;
}

function parseAttributes(attrString) {
    const attrs = {};
    const regex = /([a-zA-Z0-9_-]+)\s*=\s*["']([^"']*)["']/g;
    let match;
    while ((match = regex.exec(attrString)) !== null) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

function parseXMLPython(content) {
    try {
        const { execSync } = require('child_process');
        const result = execSync(`python3 -c "import xml.etree.ElementTree as ET, json, sys; def parse_element(el): return {el.tag: [parse_element(child) for child in el] if list(el) else el.text} if len(el) > 0 or el.text else {el.tag: {**{k:v for k,v in el.attrib.items()}, '_text': el.text} if el.attrib and el.text else el.attrib or el.text}; print(json.dumps(parse_element(ET.fromstring(sys.stdin.read()))))"`, {
            input: content,
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return JSON.parse(result.toString());
    } catch (error) {
        return null;
    }
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 XML to JSON Converter - MFH TOOLS PRO`);
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
        console.log('📖 Leyendo archivo XML...');
        const content = fs.readFileSync(inputFile, 'utf8');
        console.log(`📏 Longitud: ${content.length} caracteres`);
        console.log('');
        
        // Validar XML
        console.log('🔍 Validando XML...');
        if (!content.includes('<')) {
            console.error('❌ El archivo no parece ser XML válido');
            process.exit(1);
        }
        
        // Parsear XML
        console.log('🔍 Parseando XML...');
        let data;
        
        // Intentar con Python primero
        try {
            data = parseXMLPython(content);
            if (data !== null) {
                console.log('✅ Parseado con Python (xml.etree)');
            }
        } catch (e) {
            // Continuar
        }
        
        // Si falló Python, usar parser manual
        if (!data) {
            data = parseXML(content);
            console.log('✅ Parseado con parser manual');
        }
        
        if (!data || Object.keys(data).length === 0) {
            console.error('❌ No se pudo parsear el XML');
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
        
        console.log('\n✅ XML to JSON Converter completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
