#!/usr/bin/env node

/**
 * Base64 Image Encoder/Decoder - MFH TOOLS PRO
 * Convierte imágenes a Base64 y viceversa
 * 
 * Uso: node base64-image-encoder.js <archivo> [opciones]
 * Ejemplo: node base64-image-encoder.js imagen.jpg
 * Ejemplo: node base64-image-encoder.js encode imagen.jpg --output base64.txt
 * Ejemplo: node base64-image-encoder.js decode base64.txt --output imagen.jpg
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    imageTypes: {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let mode = 'encode';
let inputFile = null;
let outputFile = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Base64 Image Encoder/Decoder - MFH TOOLS PRO
===============================================
Convierte imágenes a Base64 y viceversa.

Uso:
  node base64-image-encoder.js <archivo> [opciones]
  node base64-image-encoder.js encode <archivo> [--output salida.txt]
  node base64-image-encoder.js decode <archivo> [--output imagen.jpg]

Opciones:
  --output <archivo>   Archivo de salida
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node base64-image-encoder.js imagen.jpg
  node base64-image-encoder.js encode imagen.jpg --output base64.txt
  node base64-image-encoder.js decode base64.txt --output imagen.jpg
`);
    process.exit(1);
}

// Detectar modo y archivo
if (args[0] === 'encode' || args[0] === 'decode') {
    mode = args[0];
    inputFile = args[1] || null;
} else {
    // Si solo se pasa un archivo, asumir encode
    inputFile = args[0];
}

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

if (!inputFile) {
    console.error('❌ No se especificó archivo de entrada');
    process.exit(1);
}

// ==================== FUNCIONES ====================
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime,
            ext: path.extname(filePath).toLowerCase(),
            name: path.basename(filePath)
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

function getMimeType(ext) {
    return CONFIG.imageTypes[ext] || 'application/octet-stream';
}

function isImageFile(ext) {
    return CONFIG.imageTypes[ext] !== undefined;
}

function encodeImageToBase64(filePath) {
    const imageData = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = getMimeType(ext);
    const base64 = imageData.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    return {
        base64,
        dataUrl,
        mimeType,
        size: imageData.length,
        sizeFormatted: formatFileSize(imageData.length)
    };
}

function decodeBase64ToImage(base64Data, outputPath) {
    // Limpiar data URL si existe
    let cleanBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
        const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
            cleanBase64 = matches[2];
        } else {
            cleanBase64 = base64Data.split(',')[1] || base64Data;
        }
    }
    
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(outputPath, buffer);
    return {
        size: buffer.length,
        sizeFormatted: formatFileSize(buffer.length)
    };
}

function generateHTMLPreview(base64Data, imageName) {
    return `<img src="data:image/jpeg;base64,${base64Data}" alt="${imageName}" style="max-width: 100%;">`;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Base64 Image Encoder/Decoder - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📝 Modo: ${mode}`);
        console.log(`📁 Archivo: ${inputFile}`);
        
        // Verificar archivo
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Archivo no encontrado: ${inputFile}`);
            process.exit(1);
        }
        
        const fileInfo = getFileInfo(inputFile);
        console.log(`📏 Tamaño: ${fileInfo.sizeFormatted}`);
        console.log('');
        
        if (mode === 'encode') {
            // ====== ENCODE ======
            const ext = path.extname(inputFile).toLowerCase();
            
            if (!isImageFile(ext)) {
                console.warn(`⚠️ El archivo no parece ser una imagen (extensión: ${ext})`);
                console.warn('   Continuando de todos modos...');
            }
            
            console.log('🔍 Codificando imagen a Base64...');
            const result = encodeImageToBase64(inputFile);
            
            console.log('✅ Imagen codificada exitosamente');
            console.log(`   📋 MIME Type: ${result.mimeType}`);
            console.log(`   📏 Tamaño original: ${result.sizeFormatted}`);
            console.log(`   📏 Tamaño Base64: ${result.sizeFormatted}`);
            console.log(`   🔹 Longitud: ${result.base64.length} caracteres`);
            
            // Determinar archivo de salida
            if (!outputFile) {
                outputFile = path.basename(inputFile, path.extname(inputFile)) + '.txt';
            }
            
            // Guardar Base64
            fs.writeFileSync(outputFile, result.base64);
            console.log(`📁 Base64 guardado en: ${outputFile}`);
            
            // Guardar Data URL en archivo separado
            const dataUrlFile = outputFile.replace(/\.txt$/, '_dataurl.txt');
            if (dataUrlFile !== outputFile) {
                fs.writeFileSync(dataUrlFile, result.dataUrl);
                console.log(`📁 Data URL guardado en: ${dataUrlFile}`);
            }
            
            // Mostrar preview en HTML
            if (verbose) {
                const htmlFile = outputFile.replace(/\.txt$/, '_preview.html');
                const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>Preview - ${fileInfo.name}</title></head>
<body>
    <h2>${fileInfo.name}</h2>
    <p>MIME: ${result.mimeType}</p>
    <p>Tamaño: ${result.sizeFormatted}</p>
    ${generateHTMLPreview(result.base64, fileInfo.name)}
</body>
</html>
                `;
                fs.writeFileSync(htmlFile, htmlContent);
                console.log(`📁 Preview HTML guardado en: ${htmlFile}`);
            }
            
        } else {
            // ====== DECODE ======
            console.log('🔍 Decodificando Base64 a imagen...');
            
            let base64Data = fs.readFileSync(inputFile, 'utf8').trim();
            
            // Determinar archivo de salida
            if (!outputFile) {
                // Intentar adivinar extensión
                let ext = '.jpg';
                if (base64Data.startsWith('data:')) {
                    const mimeMatch = base64Data.match(/^data:image\/([^;]+);/);
                    if (mimeMatch) {
                        const mimeExt = mimeMatch[1];
                        if (mimeExt === 'jpeg') ext = '.jpg';
                        else if (mimeExt === 'png') ext = '.png';
                        else if (mimeExt === 'gif') ext = '.gif';
                        else if (mimeExt === 'webp') ext = '.webp';
                        else ext = '.' + mimeExt;
                    }
                } else {
                    // Intentar detectar por contenido
                    if (base64Data.startsWith('/9j/')) ext = '.jpg';
                    else if (base64Data.startsWith('iVBORw0KGgo')) ext = '.png';
                    else if (base64Data.startsWith('R0lGODlh')) ext = '.gif';
                    else if (base64Data.startsWith('UklGR')) ext = '.webp';
                }
                outputFile = `decoded_image${ext}`;
            }
            
            console.log(`📁 Archivo de salida: ${outputFile}`);
            
            const result = decodeBase64ToImage(base64Data, outputFile);
            
            console.log('✅ Imagen decodificada exitosamente');
            console.log(`   📏 Tamaño: ${result.sizeFormatted}`);
        }
        
        console.log('\n✅ Base64 Image Encoder/Decoder completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
