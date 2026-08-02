#!/usr/bin/env node

/**
 * QR Code Generator - MFH TOOLS PRO
 * Genera códigos QR a partir de texto o URLs
 * 
 * Uso: node qr-code-generator.js <texto> [opciones]
 * Ejemplo: node qr-code-generator.js "https://falconmx1.github.io"
 * Ejemplo: node qr-code-generator.js "Hola mundo" --output qr.png
 * Ejemplo: node qr-code-generator.js --file texto.txt --output qr.png
 */

const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    defaultSize: 300,
    defaultOutput: 'qr_code.png'
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let text = null;
let filePath = null;
let outputFile = CONFIG.defaultOutput;
let size = CONFIG.defaultSize;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 QR Code Generator - MFH TOOLS PRO
=====================================
Genera códigos QR a partir de texto o URLs.

Uso:
  node qr-code-generator.js <texto> [opciones]
  node qr-code-generator.js --file <archivo> [opciones]

Opciones:
  --output <archivo>   Archivo de salida (default: qr_code.png)
  --size <pixels>      Tamaño en píxeles (default: 300)
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node qr-code-generator.js "https://falconmx1.github.io"
  node qr-code-generator.js "Hola mundo" --output qr.png
  node qr-code-generator.js --file texto.txt --output qr.png
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
        filePath = args[i + 1];
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--size' && args[i + 1]) {
        size = parseInt(args[i + 1]) || CONFIG.defaultSize;
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    } else if (!args[i].startsWith('--')) {
        text = args[i];
    }
}

// ==================== FUNCIONES ====================
async function checkDependencies() {
    try {
        await execPromise('which qrencode', { timeout: 2000 });
        return true;
    } catch (error) {
        return false;
    }
}

async function generateQR(text, output, size) {
    try {
        // Escapar texto para el comando
        const escapedText = text.replace(/"/g, '\\"');
        const cmd = `qrencode -o "${output}" -s ${Math.round(size / 10)} "${escapedText}"`;
        await execPromise(cmd, { timeout: CONFIG.timeout });
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function generateQRWithPython(text, output, size) {
    try {
        const pythonScript = `
import qrcode
qr = qrcode.QRCode(version=1, box_size=10, border=4)
qr.add_data("${text.replace(/"/g, '\\"')}")
qr.make(fit=True)
img = qr.make_image(fill_color="black", back_color="white")
img.save("${output}")
        `;
        const tempFile = '/tmp/qr_temp.py';
        fs.writeFileSync(tempFile, pythonScript);
        await execPromise(`python3 ${tempFile}`, { timeout: CONFIG.timeout });
        fs.unlinkSync(tempFile);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime
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

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 QR Code Generator - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        
        let content = text;
        let fileInfo = null;
        
        // Leer desde archivo
        if (filePath) {
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Archivo no encontrado: ${filePath}`);
                process.exit(1);
            }
            fileInfo = getFileInfo(filePath);
            content = fs.readFileSync(filePath, 'utf8');
            console.log(`📁 Archivo: ${filePath}`);
            console.log(`📏 Tamaño: ${fileInfo.sizeFormatted} (${fileInfo.size} bytes)`);
            console.log(`📅 Última modificación: ${fileInfo.modified.toLocaleString()}`);
            console.log('');
        } else if (!content) {
            console.error('❌ No se proporcionó texto');
            process.exit(1);
        }
        
        console.log('📝 CONTENIDO:');
        console.log(`   ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
        console.log(`   📏 Longitud: ${content.length} caracteres`);
        console.log('');
        
        // Generar QR
        console.log('🔍 Generando código QR...');
        
        // Intentar con qrencode
        let result = await generateQR(content, outputFile, size);
        
        if (!result.success) {
            console.log('⚠️ qrencode no disponible, intentando con Python...');
            result = await generateQRWithPython(content, outputFile, size);
        }
        
        if (!result.success) {
            console.error(`❌ Error al generar QR: ${result.error}`);
            console.log('');
            console.log('💡 Para usar qrencode:');
            console.log('   sudo apt-get install qrencode');
            console.log('');
            console.log('💡 O instala Python qrcode:');
            console.log('   pip3 install qrcode[pil]');
            process.exit(1);
        }
        
        // Verificar archivo generado
        if (fs.existsSync(outputFile)) {
            const info = getFileInfo(outputFile);
            console.log('✅ QR Code generado exitosamente');
            console.log(`   📁 Archivo: ${outputFile}`);
            console.log(`   📏 Tamaño: ${info.sizeFormatted}`);
            console.log(`   📐 Dimensiones: ${size}x${size} píxeles`);
        } else {
            console.log('⚠️ El archivo QR se generó pero no se pudo verificar');
        }
        
        console.log('\n✅ QR Code Generator completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
