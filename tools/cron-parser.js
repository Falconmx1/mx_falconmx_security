#!/usr/bin/env node

/**
 * Cron Expression Parser - MFH TOOLS PRO
 * Parsea y explica expresiones cron
 * 
 * Uso: node cron-parser.js <expresion>
 * Ejemplo: node cron-parser.js "0 0 * * *"
 * Ejemplo: node cron-parser.js "*/5 * * * *"
 * Ejemplo: node cron-parser.js "0 9-17 * * 1-5"
 * Ejemplo: node cron-parser.js --verbose "0 0 * * *"
 */

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    weekdays: {
        0: 'Domingo',
        1: 'Lunes',
        2: 'Martes',
        3: 'Miércoles',
        4: 'Jueves',
        5: 'Viernes',
        6: 'Sábado'
    },
    months: {
        1: 'Enero',
        2: 'Febrero',
        3: 'Marzo',
        4: 'Abril',
        5: 'Mayo',
        6: 'Junio',
        7: 'Julio',
        8: 'Agosto',
        9: 'Septiembre',
        10: 'Octubre',
        11: 'Noviembre',
        12: 'Diciembre'
    }
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let expression = null;
let verbose = false;

if (args.length < 1) {
    console.error(`
🔍 Cron Expression Parser - MFH TOOLS PRO
=========================================
Parsea y explica expresiones cron.

Uso:
  node cron-parser.js <expresion> [opciones]

Opciones:
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node cron-parser.js "0 0 * * *"
  node cron-parser.js "*/5 * * * *"
  node cron-parser.js "0 9-17 * * 1-5"
  node cron-parser.js --verbose "0 0 * * *"
`);
    process.exit(1);
}

expression = args[0];

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function parseCronExpression(expr) {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5) {
        return { error: 'La expresión debe tener al menos 5 campos (minuto hora día mes día_semana)' };
    }
    
    return {
        minute: parts[0],
        hour: parts[1],
        day: parts[2],
        month: parts[3],
        weekday: parts[4],
        command: parts.slice(5).join(' ') || null
    };
}

function expandField(field, min, max, name) {
    const values = new Set();
    const parts = field.split(',');
    
    for (const part of parts) {
        if (part === '*') {
            for (let i = min; i <= max; i++) {
                values.add(i);
            }
        } else if (part.includes('/')) {
            const [stepBase, step] = part.split('/');
            const stepNum = parseInt(step);
            let start = 0;
            if (stepBase === '*') {
                start = min;
            } else {
                start = parseInt(stepBase);
            }
            for (let i = start; i <= max; i += stepNum) {
                values.add(i);
            }
        } else if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number);
            for (let i = start; i <= end; i++) {
                values.add(i);
            }
        } else {
            const val = parseInt(part);
            if (!isNaN(val) && val >= min && val <= max) {
                values.add(val);
            }
        }
    }
    
    return Array.from(values).sort((a, b) => a - b);
}

function describeField(values, type, min, max) {
    if (values.length === 0) return 'Ninguno';
    if (values.length === max - min + 1) return 'Cada';
    if (values.length === 1) return `${values[0]}`;
    
    // Verificar si es un rango continuo
    let isRange = true;
    for (let i = 0; i < values.length - 1; i++) {
        if (values[i + 1] !== values[i] + 1) {
            isRange = false;
            break;
        }
    }
    
    if (isRange) {
        return `${values[0]}-${values[values.length - 1]}`;
    }
    
    return values.join(', ');
}

function getFieldName(type) {
    const names = {
        minute: 'Minuto',
        hour: 'Hora',
        day: 'Día del mes',
        month: 'Mes',
        weekday: 'Día de la semana'
    };
    return names[type] || type;
}

function getHumanReadable(type, value) {
    if (type === 'weekday') {
        return CONFIG.weekdays[value] || value;
    }
    if (type === 'month') {
        return CONFIG.months[value] || value;
    }
    return value;
}

function getFieldDescription(values, type, min, max) {
    const unique = new Set(values);
    const arr = Array.from(unique).sort((a, b) => a - b);
    const total = max - min + 1;
    
    if (arr.length === 0) return 'Ninguno';
    if (arr.length === total) return 'Cada';
    if (arr.length === 1) {
        const val = arr[0];
        const readable = getHumanReadable(type, val);
        return `${val} ${readable !== val ? `(${readable})` : ''}`.trim();
    }
    
    // Verificar si es un rango continuo
    let isRange = true;
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i + 1] !== arr[i] + 1) {
            isRange = false;
            break;
        }
    }
    
    if (isRange && arr.length > 2) {
        const first = arr[0];
        const last = arr[arr.length - 1];
        const firstReadable = getHumanReadable(type, first);
        const lastReadable = getHumanReadable(type, last);
        return `${firstReadable !== first ? firstReadable : first} - ${lastReadable !== last ? lastReadable : last}`;
    }
    
    return arr.map(v => {
        const readable = getHumanReadable(type, v);
        return readable !== v ? `${v} (${readable})` : v;
    }).join(', ');
}

function getExpressionExample(parsed) {
    const examples = {
        '0 0 * * *': 'Diariamente a medianoche',
        '*/5 * * * *': 'Cada 5 minutos',
        '0 * * * *': 'Cada hora',
        '0 0 * * 1': 'Todos los lunes a medianoche',
        '0 9-17 * * 1-5': 'Cada hora de 9 a 17, de lunes a viernes',
        '0 0 1 * *': 'El primer día de cada mes a medianoche',
        '30 4 * * 0': 'Todos los domingos a las 4:30 AM',
        '0 0 1 1 *': 'El 1 de enero a medianoche',
        '15 14 * * *': 'Todos los días a las 14:15'
    };
    
    const expr = `${parsed.minute} ${parsed.hour} ${parsed.day} ${parsed.month} ${parsed.weekday}`;
    return examples[expr] || null;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Cron Expression Parser - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📋 Expresión: ${expression}`);
        console.log('');
        
        // Parsear
        const parsed = parseCronExpression(expression);
        
        if (parsed.error) {
            console.error(`❌ ${parsed.error}`);
            process.exit(1);
        }
        
        // Expandir campos
        const minuteValues = expandField(parsed.minute, 0, 59, 'minute');
        const hourValues = expandField(parsed.hour, 0, 23, 'hour');
        const dayValues = expandField(parsed.day, 1, 31, 'day');
        const monthValues = expandField(parsed.month, 1, 12, 'month');
        const weekdayValues = expandField(parsed.weekday, 0, 6, 'weekday');
        
        // Mostrar resultados
        console.log('📊 ANÁLISIS:');
        console.log('='.repeat(60));
        
        const fields = [
            { name: 'Minuto', value: parsed.minute, values: minuteValues, min: 0, max: 59, type: 'minute' },
            { name: 'Hora', value: parsed.hour, values: hourValues, min: 0, max: 23, type: 'hour' },
            { name: 'Día del mes', value: parsed.day, values: dayValues, min: 1, max: 31, type: 'day' },
            { name: 'Mes', value: parsed.month, values: monthValues, min: 1, max: 12, type: 'month' },
            { name: 'Día de la semana', value: parsed.weekday, values: weekdayValues, min: 0, max: 6, type: 'weekday' }
        ];
        
        fields.forEach(f => {
            const description = getFieldDescription(f.values, f.type, f.min, f.max);
            console.log(`   ${f.name}: ${f.value}`);
            if (verbose) {
                console.log(`      📋 Valores: ${f.values.join(', ')}`);
                console.log(`      📝 Descripción: ${description}`);
                console.log(`      📊 Total: ${f.values.length} de ${f.max - f.min + 1}`);
            } else {
                console.log(`      📝 ${description}`);
            }
            console.log('');
        });
        
        // Comando (si existe)
        if (parsed.command) {
            console.log(`   Comando: ${parsed.command}`);
            console.log('');
        }
        
        // Interpretación en lenguaje natural
        console.log('🔹 INTERPRETACIÓN:');
        console.log('='.repeat(60));
        
        const minuteDesc = getFieldDescription(minuteValues, 'minute', 0, 59);
        const hourDesc = getFieldDescription(hourValues, 'hour', 0, 23);
        const dayDesc = getFieldDescription(dayValues, 'day', 1, 31);
        const monthDesc = getFieldDescription(monthValues, 'month', 1, 12);
        const weekdayDesc = getFieldDescription(weekdayValues, 'weekday', 0, 6);
        
        let natural = '';
        if (minuteValues.length === 60) {
            natural += 'Cada minuto';
        } else if (minuteValues.length === 1) {
            natural += `En el minuto ${minuteDesc}`;
        } else {
            natural += `En los minutos ${minuteDesc}`;
        }
        
        if (hourValues.length === 24) {
            natural += ', cada hora';
        } else if (hourValues.length === 1) {
            natural += `, a las ${hourDesc} horas`;
        } else {
            natural += `, a las horas ${hourDesc}`;
        }
        
        if (dayValues.length === 31) {
            natural += ', todos los días';
        } else if (dayValues.length === 1) {
            natural += `, el día ${dayDesc}`;
        } else {
            natural += `, los días ${dayDesc}`;
        }
        
        if (monthValues.length === 12) {
            natural += ', de todos los meses';
        } else if (monthValues.length === 1) {
            natural += `, en ${monthDesc}`;
        } else {
            natural += `, en los meses ${monthDesc}`;
        }
        
        if (weekdayValues.length === 7) {
            natural += ', todos los días de la semana';
        } else if (weekdayValues.length === 1) {
            natural += `, en ${weekdayDesc}`;
        } else {
            natural += `, en ${weekdayDesc}`;
        }
        
        console.log(`   ${natural}`);
        
        // Mostrar ejemplo
        const example = getExpressionExample(parsed);
        if (example) {
            console.log(`   💡 Ejemplo: ${example}`);
        }
        
        // Próximas ejecuciones (simuladas)
        console.log('\n🔹 PRÓXIMAS EJECUCIONES (simuladas):');
        console.log('='.repeat(60));
        
        // Mostrar próximas 5 ejecuciones simuladas
        const now = new Date();
        console.log(`   📅 Actual: ${now.toLocaleString()}`);
        console.log('   ⏳ Próximas ejecuciones:');
        
        // Simular 5 próximas ejecuciones
        let found = 0;
        let attempts = 0;
        const maxAttempts = 1000;
        
        while (found < 5 && attempts < maxAttempts) {
            attempts++;
            const testDate = new Date(now.getTime() + attempts * 60000);
            
            const minute = testDate.getMinutes();
            const hour = testDate.getHours();
            const day = testDate.getDate();
            const month = testDate.getMonth() + 1;
            const weekday = testDate.getDay();
            
            if (minuteValues.includes(minute) && hourValues.includes(hour) &&
                dayValues.includes(day) && monthValues.includes(month) &&
                weekdayValues.includes(weekday)) {
                found++;
                console.log(`   ${found}. ${testDate.toLocaleString()}`);
            }
        }
        
        if (found === 0) {
            console.log('   ⚠️ No se encontraron ejecuciones en el rango simulado');
        }
        
        console.log('\n✅ Cron Expression Parser completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
