#!/usr/bin/env node

/**
 * Security Awareness Trainer - MFH TOOLS PRO
 * Plataforma de entrenamiento en concienciación
 * 
 * Uso: node security-awareness-trainer.js [opciones]
 * Ejemplo: node security-awareness-trainer.js --course "phishing101"
 * Ejemplo: node security-awareness-trainer.js --quiz
 * Ejemplo: node security-awareness-trainer.js --report --user "juan@empresa.com"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ==================== CONFIGURACION ====================
const CONFIG_FILE = path.join(__dirname, 'trainer_config.json');
const COURSES_DIR = path.join(__dirname, 'courses');
const USERS_DIR = path.join(__dirname, 'users');
const REPORTS_DIR = path.join(__dirname, 'trainer_reports');

const DEFAULT_CONFIG = {
    courses: [
        { id: 'phishing101', name: 'Phishing 101', level: 'Básico', duration: 30 },
        { id: 'password102', name: 'Seguridad de Contraseñas', level: 'Básico', duration: 25 },
        { id: 'social103', name: 'Ingeniería Social', level: 'Intermedio', duration: 40 },
        { id: 'ransomware201', name: 'Ransomware', level: 'Intermedio', duration: 35 },
        { id: 'advanced301', name: 'Seguridad Avanzada', level: 'Avanzado', duration: 50 }
    ],
    quiz_questions: [
        { q: '¿Qué es phishing?', options: ['Robo de datos', 'Virus', 'Firewall', 'Backup'], correct: 0 },
        { q: '¿Qué hacer ante un correo sospechoso?', options: ['Abrirlo', 'Reenviarlo', 'Reportarlo', 'Ignorarlo'], correct: 2 },
        { q: '¿Qué es ransomware?', options: ['Antivirus', 'Secuestro de datos', 'Firewall', 'Backup'], correct: 1 },
        { q: '¿Cómo crear una contraseña segura?', options: ['123456', 'password', 'Larga y compleja', 'Tu nombre'], correct: 2 },
        { q: '¿Qué es ingeniería social?', options: ['Hackeo técnico', 'Manipulación psicológica', 'Virus', 'Firewall'], correct: 1 }
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let action = null;
let courseId = null;
let userName = null;
let format = 'json';
let outputFile = null;
let init = false;
let verbose = false;

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--course':
            action = 'course';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                courseId = args[i + 1];
                i++;
            }
            break;
        case '--quiz':
            action = 'quiz';
            break;
        case '--report':
            action = 'report';
            if (args[i + 1] && !args[i + 1].startsWith('--')) {
                userName = args[i + 1];
                i++;
            }
            break;
        case '--user':
            userName = args[i + 1];
            i++;
            break;
        case '--format':
            format = args[i + 1];
            i++;
            break;
        case '--output':
            outputFile = args[i + 1];
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
🎓 Security Awareness Trainer - MFH TOOLS PRO
==============================================
Plataforma de entrenamiento en concienciación.

Uso:
  node security-awareness-trainer.js [opciones]

Opciones:
  --init                    Crear configuracion por defecto
  --course <id>             Iniciar curso
  --quiz                    Realizar quiz de concienciación
  --report [usuario]        Generar reporte de progreso
  --user <email>            Usuario para reporte
  --format <formato>        Formato de salida (json, html)
  --output <archivo>        Guardar reporte
  --verbose, -v             Mostrar mas detalles
  --help, -h                Mostrar esta ayuda

Ejemplos:
  node security-awareness-trainer.js --init
  node security-awareness-trainer.js --course phishing101
  node security-awareness-trainer.js --quiz
  node security-awareness-trainer.js --report --user "juan@empresa.com"
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
    if (!fs.existsSync(COURSES_DIR)) {
        fs.mkdirSync(COURSES_DIR, { recursive: true });
    }
    if (!fs.existsSync(USERS_DIR)) {
        fs.mkdirSync(USERS_DIR, { recursive: true });
    }
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    const config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    
    // Crear contenido de cursos
    for (const course of config.courses) {
        const courseFile = path.join(COURSES_DIR, `${course.id}.json`);
        if (!fs.existsSync(courseFile)) {
            fs.writeFileSync(courseFile, JSON.stringify({
                id: course.id,
                name: course.name,
                level: course.level,
                duration: course.duration,
                modules: [
                    { title: 'Introducción', content: `Bienvenido al curso ${course.name}` },
                    { title: 'Conceptos clave', content: 'Contenido del módulo principal' },
                    { title: 'Práctica', content: 'Ejercicios prácticos' },
                    { title: 'Evaluación', content: 'Cuestionario final' }
                ],
                created: new Date().toISOString()
            }, null, 2));
        }
    }
    
    console.log('✅ Configuracion por defecto creada.');
    console.log(`📁 Cursos: ${COURSES_DIR}`);
    console.log(`📁 Usuarios: ${USERS_DIR}`);
    console.log(`📁 Reportes: ${REPORTS_DIR}`);
}

function showCourse(courseId) {
    console.log(`🎓 Iniciando curso: ${courseId}`);
    
    const config = loadConfig();
    const course = config.courses.find(c => c.id === courseId);
    
    if (!course) {
        console.error(`❌ Curso "${courseId}" no encontrado.`);
        console.log(`📋 Cursos disponibles: ${config.courses.map(c => c.id).join(', ')}`);
        return;
    }
    
    const courseFile = path.join(COURSES_DIR, `${courseId}.json`);
    let courseData;
    if (fs.existsSync(courseFile)) {
        courseData = JSON.parse(fs.readFileSync(courseFile, 'utf8'));
    } else {
        courseData = {
            id: course.id,
            name: course.name,
            level: course.level,
            duration: course.duration,
            modules: [
                { title: 'Introducción', content: `Bienvenido al curso ${course.name}` },
                { title: 'Conceptos clave', content: 'Contenido del módulo principal' },
                { title: 'Práctica', content: 'Ejercicios prácticos' },
                { title: 'Evaluación', content: 'Cuestionario final' }
            ],
            created: new Date().toISOString()
        };
    }
    
    console.log(`\n📋 Información del curso:`);
    console.log(`   Nombre: ${courseData.name}`);
    console.log(`   Nivel: ${courseData.level}`);
    console.log(`   Duración: ${courseData.duration} min`);
    
    console.log(`\n📚 Módulos:`);
    courseData.modules.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.title}`);
    });
    
    console.log(`\n💡 Inicia el curso en: courses/${courseId}.json`);
    console.log(`\n✅ Curso cargado correctamente.`);
}

function takeQuiz() {
    console.log('🧠 Iniciando Quiz de concienciación');
    console.log('='.repeat(40));
    
    const config = loadConfig();
    const questions = config.quiz_questions;
    let correct = 0;
    const total = questions.length;
    const answers = [];
    
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        console.log(`\n📝 Pregunta ${i + 1}/${total}: ${q.q}`);
        q.options.forEach((opt, j) => {
            console.log(`   ${String.fromCharCode(65 + j)}. ${opt}`);
        });
        console.log('   (Simulando respuesta correcta)');
        
        // Simular respuesta correcta para demo
        const selected = q.correct;
        if (selected === q.correct) {
            correct++;
            console.log('   ✅ Respuesta correcta!');
        } else {
            console.log('   ❌ Respuesta incorrecta.');
        }
        
        answers.push({
            question: q.q,
            selected: selected,
            correct: q.correct,
            passed: selected === q.correct
        });
    }
    
    const score = Math.round((correct / total) * 100);
    const passed = score >= 60;
    
    console.log(`\n📊 Resultados del Quiz:`);
    console.log(`   Puntuación: ${score}%`);
    console.log(`   Correctas: ${correct}/${total}`);
    console.log(`   Estado: ${passed ? '✅ APROBADO' : '❌ REPROBADO'}`);
    
    const quizResult = {
        timestamp: new Date().toISOString(),
        score: score,
        correct: correct,
        total: total,
        passed: passed,
        answers: answers
    };
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `quiz_${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(quizResult, null, 2));
    console.log(`\n📄 Resultados guardados: ${outputPath}`);
    
    return quizResult;
}

function generateUserReport(userName) {
    console.log(`📊 Generando reporte para usuario: ${userName || 'todos'}`);
    
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.startsWith('quiz_'));
    
    if (files.length === 0) {
        console.log('ℹ️ No hay datos de quizzes disponibles.');
        return;
    }
    
    const results = [];
    for (const file of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf8'));
            results.push(data);
        } catch (e) {
            // Ignorar
        }
    }
    
    const avgScore = results.reduce((acc, r) => acc + r.score, 0) / results.length;
    const passedCount = results.filter(r => r.passed).length;
    
    let content = '';
    let ext = '';
    
    switch (format) {
        case 'html':
            content = generateTrainerHTML(results, avgScore, passedCount);
            ext = '.html';
            break;
        default:
            content = JSON.stringify({ user: userName || 'all', results, avg_score: avgScore, passed: passedCount }, null, 2);
            ext = '.json';
    }
    
    const outputPath = outputFile || path.join(REPORTS_DIR, `trainer_report_${Date.now()}${ext}`);
    fs.writeFileSync(outputPath, content);
    console.log(`\n📄 Reporte guardado: ${outputPath}`);
    
    return results;
}

function generateTrainerHTML(results, avgScore, passedCount) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎓 Security Awareness Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: #1a1a1a;
            border-radius: 12px;
            border: 1px solid #00ff00;
            padding: 40px;
        }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 15px; margin-bottom: 20px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .stat {
            background: #0a0a0a;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #333;
            text-align: center;
        }
        .stat .number { font-size: 2rem; font-weight: bold; }
        .stat .label { color: #888; font-size: 0.8rem; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #00ff00;
            color: #000;
            padding: 10px;
            text-align: left;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #333;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            text-align: center;
            color: #666;
            font-size: 0.8rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎓 Security Awareness Report</h1>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="number">${results.length}</div>
                <div class="label">📝 Quizzes</div>
            </div>
            <div class="stat">
                <div class="number">${avgScore.toFixed(1)}%</div>
                <div class="label">📊 Promedio</div>
            </div>
            <div class="stat">
                <div class="number">${passedCount}</div>
                <div class="label">✅ Aprobados</div>
            </div>
        </div>
        
        <h2>📋 Historial</h2>
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Score</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(r => `
                    <tr>
                        <td>${new Date(r.timestamp).toLocaleDateString()}</td>
                        <td>${r.score}%</td>
                        <td>${r.passed ? '✅ Aprobado' : '❌ Reprobado'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>Hecho en Mexico 🇲🇽 | MFH TOOLS PRO</p>
        </div>
    </div>
</body>
</html>`;
}

// ==================== MAIN ====================
(async function main() {
    console.log(`🎓 Security Awareness Trainer - MFH TOOLS PRO`);
    console.log('='.repeat(50));
    
    if (init) {
        initConfig();
        process.exit(0);
    }
    
    if (!fs.existsSync(REPORTS_DIR)) {
        fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    
    switch (action) {
        case 'course':
            if (!courseId) {
                console.error('❌ Debes especificar --course <id>');
                process.exit(1);
            }
            showCourse(courseId);
            break;
            
        case 'quiz':
            takeQuiz();
            break;
            
        case 'report':
            generateUserReport(userName);
            break;
            
        default:
            console.log('ℹ️ Sin accion especificada. Usa --help para ver opciones.');
            console.log('💡 Opciones: --course, --quiz, --report, --init');
            break;
    }
    
    console.log('\n✅ Security Awareness Trainer completado');
})();

// ==================== MANEJO DE SEÑALES ====================
process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo Security Awareness Trainer...');
    process.exit(0);
});
