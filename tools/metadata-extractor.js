#!/usr/bin/env node

/**
 * Metadata Extractor - MFH TOOLS PRO
 * Extrae metadatos de archivos: EXIF, PDF, Office, etc.
 * 
 * Uso: node metadata-extractor.js <archivo>
 * Ejemplo: node metadata-extractor.js imagen.jpg
 * Ejemplo: node metadata-extractor.js documento.pdf
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    timeout: 10000,
    maxFileSize: 50 * 1024 * 1024 // 50MB
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

if (args.length < 1) {
    console.error(`
🔍 Metadata Extractor - MFH TOOLS PRO
======================================
Extrae metadatos de archivos: EXIF, PDF, Office, etc.

Uso:
  node metadata-extractor.js <archivo>

Ejemplos:
  node metadata-extractor.js imagen.jpg
  node metadata-extractor.js documento.pdf
  node metadata-extractor.js archivo.docx
`);
    process.exit(1);
}

const filePath = args[0];

// ==================== FUNCIONES ====================
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.png': 'image/png', '.gif': 'image/gif',
            '.pdf': 'application/pdf', '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain', '.md': 'text/markdown',
            '.json': 'application/json', '.xml': 'application/xml'
        };
        
        return {
            name: path.basename(filePath),
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            ext: ext,
            mimeType: mimeTypes[ext] || 'unknown'
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

// ==================== EXIF (imágenes) ====================
async function extractExif(filePath) {
    try {
        // Usar exiftool si está disponible
        try {
            const { stdout } = await execPromise(`exiftool -j "${filePath}"`, { timeout: CONFIG.timeout });
            const data = JSON.parse(stdout);
            if (data && data.length > 0) {
                return data[0];
            }
        } catch (e) {
            // Si exiftool no está disponible, usar fallback
            return { error: 'exiftool no instalado. Instala con: sudo apt-get install exiftool' };
        }
        
        // Fallback: información básica
        const info = getFileInfo(filePath);
        return {
            FileName: info?.name,
            FileSize: info?.sizeFormatted,
            FileType: info?.mimeType,
            FileModifyDate: info?.modified,
            FileCreateDate: info?.created
        };
    } catch (error) {
        return { error: error.message };
    }
}

// ==================== PDF ====================
async function extractPDFMetadata(filePath) {
    try {
        const { stdout } = await execPromise(`pdfinfo "${filePath}"`, { timeout: CONFIG.timeout });
        const lines = stdout.split('\n');
        const metadata = {};
        lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(':').trim();
                if (key && value) {
                    metadata[key] = value;
                }
            }
        });
        return metadata;
    } catch (error) {
        return { error: 'pdfinfo no instalado. Instala con: sudo apt-get install poppler-utils' };
    }
}

// ==================== Office ====================
async function extractOfficeMetadata(filePath) {
    try {
        // Usar oletools para archivos Office
        const { stdout } = await execPromise(`olemeta "${filePath}"`, { timeout: CONFIG.timeout });
        return { raw: stdout };
    } catch (error) {
        return { error: 'olemeta no instalado' };
    }
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Metadata Extractor - ${filePath}`);
        console.log('='.repeat(60));
        
        const fileInfo = getFileInfo(filePath);
        if (!fileInfo) {
            console.error('❌ Archivo no encontrado');
            process.exit(1);
        }
        
        console.log('📁 INFORMACIÓN DEL ARCHIVO:');
        console.log(`   Nombre: ${fileInfo.name}`);
        console.log(`   Tamaño: ${fileInfo.sizeFormatted} (${fileInfo.size} bytes)`);
        console.log(`   Tipo: ${fileInfo.mimeType}`);
        console.log(`   Creado: ${fileInfo.created.toLocaleString()}`);
        console.log(`   Modificado: ${fileInfo.modified.toLocaleString()}`);
        console.log('');
        
        // Extraer metadatos según el tipo
        let metadata = {};
        const ext = fileInfo.ext;
        
        console.log('📋 METADATOS EXTRAÍDOS:');
        console.log('='.repeat(60));
        
        if (['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.bmp'].includes(ext)) {
            console.log('🖼️ Extrayendo metadatos EXIF...');
            metadata = await extractExif(filePath);
        } else if (ext === '.pdf') {
            console.log('📄 Extrayendo metadatos PDF...');
            metadata = await extractPDFMetadata(filePath);
        } else if (['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'].includes(ext)) {
            console.log('📊 Extrayendo metadatos Office...');
            metadata = await extractOfficeMetadata(filePath);
        } else if (['.txt', '.md', '.json', '.xml', '.html', '.css', '.js'].includes(ext)) {
            console.log('📝 Archivo de texto - mostrando contenido parcial...');
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const preview = lines.slice(0, 20).join('\n');
            console.log('   Contenido (primeras 20 líneas):');
            console.log('   ' + '-'.repeat(40));
            console.log('   ' + preview.replace(/\n/g, '\n   '));
            if (lines.length > 20) {
                console.log(`   ... ${lines.length - 20} líneas más`);
            }
            metadata = { preview, totalLines: lines.length };
        } else {
            console.log('⚠️ Tipo de archivo no soportado para extracción avanzada');
            console.log('   Mostrando información básica del archivo:');
            console.log(`   Tamaño: ${fileInfo.sizeFormatted}`);
            console.log(`   Última modificación: ${fileInfo.modified.toLocaleString()}`);
            metadata = { basic: fileInfo };
        }
        
        // Mostrar metadatos
        if (metadata && typeof metadata === 'object') {
            const entries = Object.entries(metadata);
            if (entries.length > 0) {
                console.log('\n📋 METADATOS:');
                entries.forEach(([key, value]) => {
                    if (typeof value === 'object') {
                        console.log(`   ${key}: ${JSON.stringify(value)}`);
                    } else {
                        console.log(`   ${key}: ${value}`);
                    }
                });
            }
        }
        
        console.log('\n✅ Metadata Extractor completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
