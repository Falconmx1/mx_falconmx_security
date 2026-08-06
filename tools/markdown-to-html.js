#!/usr/bin/env node

/**
 * Markdown to HTML Converter - MFH TOOLS PRO
 * Convierte archivos Markdown a HTML
 * 
 * Uso: node markdown-to-html.js <archivo.md> [opciones]
 * Ejemplo: node markdown-to-html.js README.md
 * Ejemplo: node markdown-to-html.js README.md --output index.html
 * Ejemplo: node markdown-to-html.js README.md --template
 */

const fs = require('fs');
const path = require('path');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let useTemplate = false;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Markdown to HTML Converter - MFH TOOLS PRO
=============================================
Convierte archivos Markdown a HTML.

Uso:
  node markdown-to-html.js <archivo.md> [opciones]

Opciones:
  --output <archivo>   Archivo de salida HTML (default: nombre_archivo.html)
  --template           Usar plantilla HTML con estilos
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node markdown-to-html.js README.md
  node markdown-to-html.js README.md --output index.html
  node markdown-to-html.js README.md --template
`);
    process.exit(1);
}

inputFile = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--template') {
        useTemplate = true;
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

function convertMarkdownToHTML(markdown) {
    let html = markdown;
    
    // ===== ENCABEZADOS =====
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // ===== NEGRITA Y CURSIVA =====
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // ===== CÓDIGO =====
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
        return `<pre><code>${escapeHTML(code.trim())}</code></pre>`;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // ===== LISTAS =====
    // Listas ordenadas
    html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return `<ol>${match}</ol>`;
    });
    // Listas no ordenadas
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        return `<ul>${match}</ul>`;
    });
    
    // ===== CITA =====
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    
    // ===== LÍNEA HORIZONTAL =====
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^___$/gim, '<hr>');
    html = html.replace(/^\*\*\*$/gim, '<hr>');
    
    // ===== ENLACES =====
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // ===== IMÁGENES =====
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    
    // ===== PÁRRAFOS =====
    html = html.replace(/^(?!<[a-z])(.+)$/gim, '<p>$1</p>');
    
    // ===== LIMPIAR =====
    html = html.replace(/\n/g, '\n');
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/\n{3,}/g, '\n\n');
    html = html.replace(/<blockquote>/g, '<blockquote>\n');
    html = html.replace(/<\/blockquote>/g, '\n</blockquote>');
    
    return html;
}

function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getHTMLTemplate(title, content) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHTML(title)}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
            background: #f9f9f9;
        }
        h1, h2, h3, h4, h5, h6 { color: #2c3e50; margin-top: 1.5em; }
        h1 { border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { border-bottom: 2px solid #3498db; padding-bottom: 8px; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; }
        pre { background: #f4f4f4; padding: 15px; border-radius: 8px; overflow-x: auto; border-left: 4px solid #3498db; }
        blockquote { border-left: 4px solid #3498db; padding-left: 20px; margin-left: 0; color: #555; }
        ul, ol { padding-left: 25px; }
        a { color: #3498db; text-decoration: none; }
        a:hover { text-decoration: underline; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        hr { border: none; border-top: 2px solid #eee; margin: 30px 0; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f4f4f4; }
        .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="container">
        ${content}
    </div>
</body>
</html>`;
}

function getSimpleHTML(content) {
    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Markdown Convertido</title></head>
<body>${content}</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Markdown to HTML Converter - MFH TOOLS PRO`);
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
        console.log('📖 Leyendo archivo Markdown...');
        const content = fs.readFileSync(inputFile, 'utf8');
        console.log(`📏 Longitud: ${content.length} caracteres`);
        console.log('');
        
        // Convertir
        console.log('🔍 Convirtiendo Markdown a HTML...');
        const htmlContent = convertMarkdownToHTML(content);
        
        // Detectar título
        const titleMatch = content.match(/^# (.*)$/m);
        const title = titleMatch ? titleMatch[1] : 'Markdown Convertido';
        
        // Generar HTML completo
        let fullHTML;
        if (useTemplate) {
            fullHTML = getHTMLTemplate(title, htmlContent);
            console.log('✅ Usando plantilla con estilos');
        } else {
            fullHTML = getSimpleHTML(htmlContent);
        }
        
        console.log(`✅ HTML generado (${fullHTML.length} caracteres)`);
        console.log('');
        
        // Guardar
        if (!outputFile) {
            const baseName = path.basename(inputFile, path.extname(inputFile));
            outputFile = `${baseName}.html`;
        }
        
        console.log(`💾 Guardando HTML en: ${outputFile}`);
        fs.writeFileSync(outputFile, fullHTML);
        
        const outputInfo = getFileInfo(outputFile);
        console.log(`✅ HTML guardado exitosamente (${outputInfo.sizeFormatted})`);
        
        // Mostrar preview
        console.log('\n📋 PREVIEW DEL HTML:');
        const preview = fullHTML.slice(0, 500);
        console.log(preview + (fullHTML.length > 500 ? '...' : ''));
        
        console.log('\n✅ Markdown to HTML Converter completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
