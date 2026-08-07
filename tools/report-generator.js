#!/usr/bin/env node

/**
 * Report Generator - MFH TOOLS PRO
 * Genera reportes en PDF/HTML
 * 
 * Uso: node report-generator.js [opciones]
 * Ejemplo: node report-generator.js --input scan_results.json --format html --output report.html
 * Ejemplo: node report-generator.js --input scan_results.json --format pdf --output report.pdf
 * Ejemplo: node report-generator.js --input scan_results.json --format markdown --output report.md
 * Ejemplo: node report-generator.js --template custom.html --data data.json --output report.pdf
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

// ==================== CONFIGURACIÓN ====================
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const DEFAULT_TEMPLATE = path.join(TEMPLATES_DIR, 'default.html');

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let inputFile = null;
let outputFile = null;
let format = 'html';
let templateFile = null;
let dataFile = null;
let title = 'MFH TOOLS PRO - Reporte de Seguridad';
let author = 'MFH TOOLS PRO';
let company = 'MFH TOOLS PRO';
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--input':
        case '-i':
            inputFile = args[i + 1];
            i++;
            break;
        case '--output':
        case '-o':
            outputFile = args[i + 1];
            i++;
            break;
        case '--format':
        case '-f':
            format = args[i + 1].toLowerCase();
            i++;
            break;
        case '--template':
        case '-t':
            templateFile = args[i + 1];
            i++;
            break;
        case '--data':
            dataFile = args[i + 1];
            i++;
            break;
        case '--title':
            title = args[i + 1];
            i++;
            break;
        case '--author':
            author = args[i + 1];
            i++;
            break;
        case '--company':
            company = args[i + 1];
            i++;
            break;
        case '--verbose':
        case '-v':
            verbose = true;
            break;
        case '--help':
        case '-h':
            console.log(`
🔍 Report Generator - MFH TOOLS PRO
====================================
Genera reportes en PDF/HTML/Markdown.

Uso:
  node report-generator.js [opciones]

Opciones:
  --input, -i <archivo>   Archivo de datos (JSON)
  --output, -o <archivo>  Archivo de salida
  --format, -f <formato>  Formato: html, pdf, markdown (default: html)
  --template, -t <archivo> Plantilla HTML personalizada
  --data <archivo>        Archivo de datos separado
  --title <título>        Título del reporte
  --author <autor>        Autor del reporte
  --company <empresa>     Empresa/Organización
  --verbose, -v           Mostrar más detalles
  --help, -h              Mostrar esta ayuda

Ejemplos:
  node report-generator.js --input scan_results.json --format html --output report.html
  node report-generator.js --input scan_results.json --format pdf --output report.pdf
  node report-generator.js --input scan_results.json --format markdown --output report.md
  node report-generator.js --template custom.html --data data.json --output report.pdf
`);
            process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function loadData(file) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Error cargando datos: ${error.message}`);
        process.exit(1);
    }
}

function formatDate(date) {
    return new Date(date).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function generateHTMLReport(data, options) {
    const { title, author, company, template } = options;
    
    // Datos de ejemplo
    const reportData = {
        title: title || 'MFH TOOLS PRO - Reporte de Seguridad',
        author: author || 'MFH TOOLS PRO',
        company: company || 'MFH TOOLS PRO',
        date: formatDate(new Date()),
        data: data,
        summary: generateSummary(data),
        stats: generateStats(data)
    };

    // Cargar plantilla
    let templateHtml = null;
    if (template && fs.existsSync(template)) {
        templateHtml = fs.readFileSync(template, 'utf8');
    } else if (fs.existsSync(DEFAULT_TEMPLATE)) {
        templateHtml = fs.readFileSync(DEFAULT_TEMPLATE, 'utf8');
    } else {
        templateHtml = getDefaultTemplate();
    }

    // Reemplazar variables
    let html = templateHtml;
    html = html.replace(/{{TITLE}}/g, reportData.title);
    html = html.replace(/{{AUTHOR}}/g, reportData.author);
    html = html.replace(/{{COMPANY}}/g, reportData.company);
    html = html.replace(/{{DATE}}/g, reportData.date);
    html = html.replace(/{{DATA}}/g, JSON.stringify(reportData.data, null, 2));
    html = html.replace(/{{SUMMARY}}/g, reportData.summary || '');
    html = html.replace(/{{STATS}}/g, JSON.stringify(reportData.stats, null, 2));

    // Generar tablas si hay datos
    if (Array.isArray(reportData.data)) {
        html = html.replace(/{{TABLE}}/g, generateTable(reportData.data));
    } else if (typeof reportData.data === 'object') {
        html = html.replace(/{{TABLE}}/g, generateObjectTable(reportData.data));
    } else {
        html = html.replace(/{{TABLE}}/g, '<p>No hay datos tabulares disponibles</p>');
    }

    return html;
}

function generateSummary(data) {
    if (Array.isArray(data)) {
        return `Se encontraron ${data.length} elementos en el análisis.`;
    } else if (typeof data === 'object') {
        const keys = Object.keys(data);
        return `Se encontraron ${keys.length} categorías en el análisis.`;
    }
    return 'Análisis completado.';
}

function generateStats(data) {
    const stats = {
        total: 0,
        types: {},
        dates: {}
    };

    if (Array.isArray(data)) {
        stats.total = data.length;
        for (const item of data) {
            if (item.type) {
                stats.types[item.type] = (stats.types[item.type] || 0) + 1;
            }
            if (item.date) {
                const date = new Date(item.date).toLocaleDateString();
                stats.dates[date] = (stats.dates[date] || 0) + 1;
            }
        }
    }

    return stats;
}

function generateTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return '<p>No hay datos para mostrar</p>';
    }

    const headers = Object.keys(data[0]);
    let html = '<table class="report-table">\n<thead>\n<tr>\n';
    for (const header of headers) {
        html += `<th>${header}</th>\n`;
    }
    html += '</tr>\n</thead>\n<tbody>\n';

    for (const row of data) {
        html += '<tr>\n';
        for (const header of headers) {
            let value = row[header];
            if (value === undefined || value === null) {
                value = '-';
            } else if (typeof value === 'object') {
                value = JSON.stringify(value);
            }
            html += `<td>${value}</td>\n`;
        }
        html += '</tr>\n';
    }

    html += '</tbody>\n</table>\n';
    return html;
}

function generateObjectTable(data) {
    if (typeof data !== 'object' || data === null) {
        return '<p>Datos no válidos</p>';
    }

    let html = '<table class="report-table">\n<thead>\n<tr>\n<th>Clave</th>\n<th>Valor</th>\n</tr>\n</thead>\n<tbody>\n';

    for (const [key, value] of Object.entries(data)) {
        let displayValue = value;
        if (typeof value === 'object') {
            displayValue = JSON.stringify(value);
        }
        html += `<tr><td><strong>${key}</strong></td><td>${displayValue}</td></tr>\n`;
    }

    html += '</tbody>\n</table>\n';
    return html;
}

function getDefaultTemplate() {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f5f5f5;
            color: #333;
            padding: 40px;
            line-height: 1.6;
        }
        .container {
            max-width: 1100px;
            margin: 0 auto;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 40px;
        }
        .header {
            border-bottom: 3px solid #00aa00;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #00aa00;
            font-size: 2.2rem;
        }
        .header .meta {
            color: #666;
            font-size: 0.9rem;
            margin-top: 10px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #00aa00;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .report-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 0.9rem;
        }
        .report-table th {
            background: #00aa00;
            color: #fff;
            padding: 10px 12px;
            text-align: left;
        }
        .report-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #e0e0e0;
        }
        .report-table tr:hover {
            background: #f9f9f9;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .stat-card {
            background: #f8f8f8;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e0e0e0;
        }
        .stat-card .number {
            font-size: 2rem;
            font-weight: bold;
            color: #00aa00;
        }
        .stat-card .label {
            color: #666;
            font-size: 0.85rem;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 0.8rem;
        }
        .badge {
            display: inline-block;
            background: #00aa00;
            color: #fff;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 0.75rem;
        }
        @media print {
            body { background: #fff; padding: 20px; }
            .container { box-shadow: none; padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{{TITLE}}</h1>
            <div class="meta">
                <strong>Autor:</strong> {{AUTHOR}} &bull;
                <strong>Empresa:</strong> {{COMPANY}} &bull;
                <strong>Fecha:</strong> {{DATE}}
            </div>
        </div>

        <div class="section">
            <h2>📊 Resumen Ejecutivo</h2>
            <p>{{SUMMARY}}</p>
        </div>

        <div class="section">
            <h2>📈 Estadísticas</h2>
            <div class="stats-grid" id="statsContainer">
                {{STATS}}
            </div>
        </div>

        <div class="section">
            <h2>📋 Datos Detallados</h2>
            {{TABLE}}
        </div>

        <div class="section">
            <h2>📄 Datos JSON</h2>
            <pre style="background:#f8f8f8;padding:15px;border-radius:8px;overflow:auto;font-size:0.8rem;max-height:400px;">{{DATA}}</pre>
        </div>

        <div class="footer">
            <p>Generado por {{COMPANY}} &bull; MFH TOOLS PRO &bull; Hecho en México 🇲🇽</p>
            <p style="margin-top:5px;">Este reporte es confidencial y está protegido por derechos de autor</p>
        </div>
    </div>
</body>
</html>`;
}

function generateMarkdownReport(data, options) {
    const { title, author, company } = options;
    
    let markdown = `# ${title}\n\n`;
    markdown += `**Autor:** ${author}  \n`;
    markdown += `**Empresa:** ${company}  \n`;
    markdown += `**Fecha:** ${formatDate(new Date())}  \n\n`;
    markdown += `---\n\n`;
    markdown += `## Resumen Ejecutivo\n\n`;
    markdown += `${generateSummary(data)}\n\n`;
    markdown += `## Datos Detallados\n\n`;

    if (Array.isArray(data) && data.length > 0) {
        // Generar tabla en markdown
        const headers = Object.keys(data[0]);
        markdown += '| ' + headers.join(' | ') + ' |\n';
        markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
        
        for (const row of data.slice(0, 50)) { // Limitar a 50 filas para no hacer el markdown enorme
            const values = headers.map(h => {
                let val = row[h];
                if (val === undefined || val === null) return '-';
                if (typeof val === 'object') return JSON.stringify(val);
                return String(val).replace(/\|/g, '\\|');
            });
            markdown += '| ' + values.join(' | ') + ' |\n';
        }
        
        if (data.length > 50) {
            markdown += `\n*Mostrando 50 de ${data.length} registros*\n`;
        }
    } else if (typeof data === 'object') {
        markdown += '```json\n' + JSON.stringify(data, null, 2) + '\n```\n';
    }

    markdown += `\n---\n\n`;
    markdown += `*Reporte generado automáticamente por MFH TOOLS PRO - Hecho en México 🇲🇽*\n`;

    return markdown;
}

function convertHTMLtoPDF(html, outputPath) {
    return new Promise((resolve, reject) => {
        // Verificar si puppeteer está instalado
        try {
            require.resolve('puppeteer');
        } catch (error) {
            console.log('⚠️ Puppeteer no está instalado. Instalando...');
            try {
                execSync('npm install puppeteer --no-save', { stdio: 'inherit' });
            } catch (installError) {
                console.error('❌ Error instalando puppeteer. Por favor instálalo manualmente:');
                console.error('   npm install puppeteer');
                reject(new Error('Puppeteer no instalado'));
                return;
            }
        }

        try {
            const puppeteer = require('puppeteer');
            (async () => {
                const browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
                const page = await browser.newPage();
                await page.setContent(html);
                await page.pdf({
                    path: outputPath,
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '20mm',
                        bottom: '20mm',
                        left: '15mm',
                        right: '15mm'
                    }
                });
                await browser.close();
                resolve();
            })();
        } catch (error) {
            reject(error);
        }
    });
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🔍 Report Generator - MFH TOOLS PRO`);
    console.log('='.repeat(40));

    // Validar entrada
    if (!inputFile && !dataFile) {
        console.error('❌ Debes especificar un archivo de entrada con --input');
        console.log('   Ejemplo: --input scan_results.json');
        process.exit(1);
    }

    // Cargar datos
    const dataSource = inputFile || dataFile;
    const data = loadData(dataSource);

    if (verbose) {
        console.log(`📊 Datos cargados: ${JSON.stringify(data).length} bytes`);
        console.log(`📋 Tipo de datos: ${typeof data}`);
        if (Array.isArray(data)) {
            console.log(`📦 Elementos: ${data.length}`);
        }
    }

    // Determinar formato de salida
    if (!outputFile) {
        const timestamp = Date.now();
        const ext = format === 'pdf' ? 'pdf' : format === 'markdown' ? 'md' : 'html';
        outputFile = `report_${timestamp}.${ext}`;
    }

    // Generar reporte según formato
    let html = null;
    let markdown = null;

    if (format === 'html' || format === 'pdf') {
        html = generateHTMLReport(data, {
            title,
            author,
            company,
            template: templateFile
        });

        if (format === 'html') {
            fs.writeFileSync(outputFile, html);
            console.log(`✅ Reporte HTML generado: ${outputFile}`);
        } else if (format === 'pdf') {
            try {
                await convertHTMLtoPDF(html, outputFile);
                console.log(`✅ Reporte PDF generado: ${outputFile}`);
            } catch (error) {
                console.error(`❌ Error generando PDF: ${error.message}`);
                console.log('ℹ️ Guardando como HTML como respaldo...');
                const htmlOutput = outputFile.replace(/\.pdf$/, '.html');
                fs.writeFileSync(htmlOutput, html);
                console.log(`✅ Reporte HTML guardado como respaldo: ${htmlOutput}`);
            }
        }
    } else if (format === 'markdown') {
        markdown = generateMarkdownReport(data, {
            title,
            author,
            company
        });
        fs.writeFileSync(outputFile, markdown);
        console.log(`✅ Reporte Markdown generado: ${outputFile}`);
    } else {
        console.error(`❌ Formato no soportado: ${format}`);
        console.log('   Formatos soportados: html, pdf, markdown');
        process.exit(1);
    }

    // Mostrar información del archivo
    const stats = fs.statSync(outputFile);
    console.log(`📦 Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📅 Generado: ${formatDate(stats.mtime)}`);

    console.log('\n✅ Reporte generado exitosamente');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Report Generator detenido');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Report Generator detenido');
    process.exit(0);
});
