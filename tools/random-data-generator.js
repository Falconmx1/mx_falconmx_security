#!/usr/bin/env node

/**
 * Random Data Generator - MFH TOOLS PRO
 * Genera datos aleatorios (nombres, emails, direcciones, etc.)
 * 
 * Uso: node random-data-generator.js [opciones]
 * Ejemplo: node random-data-generator.js --type name --count 5
 * Ejemplo: node random-data-generator.js --type email --count 10
 * Ejemplo: node random-data-generator.js --type all --count 5
 */

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    defaultCount: 5,
    types: ['name', 'email', 'phone', 'address', 'city', 'country', 'color', 'animal', 'food', 'all'],
    names: [
        'Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez', 'Luis Rodríguez',
        'Laura Fernández', 'José Sánchez', 'Isabel Ramírez', 'Miguel Torres', 'Sofía Rivera',
        'Alejandro Morales', 'Valentina Ortiz', 'Daniel Cruz', 'Camila Reyes', 'Fernando Mendoza',
        'Lucía Herrera', 'Andrés Silva', 'Mariana Rojas', 'Jorge Vázquez', 'Paula Castro'
    ],
    cities: [
        'Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Toluca',
        'Tijuana', 'León', 'Querétaro', 'San Luis Potosí', 'Mérida'
    ],
    countries: [
        'México', 'USA', 'España', 'Argentina', 'Colombia',
        'Chile', 'Perú', 'Alemania', 'Francia', 'Japón'
    ],
    colors: [
        'Rojo', 'Azul', 'Verde', 'Amarillo', 'Naranja',
        'Morado', 'Rosa', 'Negro', 'Blanco', 'Gris'
    ],
    animals: [
        'Perro', 'Gato', 'León', 'Tigre', 'Elefante',
        'Jirafa', 'Delfín', 'Águila', 'Serpiente', 'Lobo'
    ],
    foods: [
        'Taco', 'Pizza', 'Sushi', 'Hamburguesa', 'Enchiladas',
        'Tortas', 'Tamales', 'Pasta', 'Arroz', 'Frijoles'
    ]
};

// ==================== PARSEAR ARGUMENTOS ====================
const args = process.argv.slice(2);

let type = 'all';
let count = CONFIG.defaultCount;
let outputFile = null;
let verbose = false;

if (args.length === 0) {
    console.error(`
🔍 Random Data Generator - MFH TOOLS PRO
=========================================
Genera datos aleatorios (nombres, emails, direcciones, etc.).

Uso:
  node random-data-generator.js [opciones]

Opciones:
  --type <tipo>        Tipo de datos: name, email, phone, address, city, country, color, animal, food, all
  --count <n>          Cantidad de datos a generar (default: 5)
  --output <archivo>   Guardar en archivo
  --verbose            Mostrar más detalles
  --help               Mostrar esta ayuda

Ejemplos:
  node random-data-generator.js --type name --count 5
  node random-data-generator.js --type email --count 10
  node random-data-generator.js --type all --count 5 --output datos.txt
`);
    process.exit(1);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
        type = args[i + 1].toLowerCase();
        if (!CONFIG.types.includes(type)) {
            console.error(`❌ Tipo inválido: ${type}`);
            console.error(`   Tipos disponibles: ${CONFIG.types.join(', ')}`);
            process.exit(1);
        }
        i++;
    } else if (args[i] === '--count' && args[i + 1]) {
        count = parseInt(args[i + 1]) || CONFIG.defaultCount;
        i++;
    } else if (args[i] === '--output' && args[i + 1]) {
        outputFile = args[i + 1];
        i++;
    } else if (args[i] === '--verbose') {
        verbose = true;
    } else if (args[i] === '--help') {
        console.error('Ayuda: revisa el mensaje de uso arriba.');
        process.exit(0);
    }
}

// ==================== FUNCIONES ====================
function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName() {
    return randomItem(CONFIG.names);
}

function generateEmail() {
    const domains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'protonmail.com'];
    const name = generateName().toLowerCase().replace(' ', '.');
    return `${name}${randomNumber(1, 999)}@${randomItem(domains)}`;
}

function generatePhone() {
    const formats = [
        '+52 55 ${randomNumber(1000,9999)} ${randomNumber(1000,9999)}',
        '+52 55 ${randomNumber(1000,9999)}-${randomNumber(1000,9999)}',
        '+52 33 ${randomNumber(1000,9999)} ${randomNumber(1000,9999)}',
        '+52 81 ${randomNumber(1000,9999)} ${randomNumber(1000,9999)}',
        '+52 44 ${randomNumber(1000,9999)} ${randomNumber(1000,9999)}'
    ];
    const format = randomItem(formats);
    return format.replace(/\${randomNumber\((\d+),(\d+)\)}/g, (_, min, max) => {
        return String(randomNumber(parseInt(min), parseInt(max)));
    });
}

function generateAddress() {
    const streets = ['Av. Reforma', 'Calle Juárez', 'Boulevard Insurgentes', 'Calle 5 de Mayo', 'Av. Constitución'];
    const numbers = randomNumber(100, 9999);
    return `${randomItem(streets)} #${numbers}, ${randomItem(CONFIG.cities)}`;
}

function generateCity() {
    return randomItem(CONFIG.cities);
}

function generateCountry() {
    return randomItem(CONFIG.countries);
}

function generateColor() {
    return randomItem(CONFIG.colors);
}

function generateAnimal() {
    return randomItem(CONFIG.animals);
}

function generateFood() {
    return randomItem(CONFIG.foods);
}

function generateData(type) {
    switch(type) {
        case 'name': return generateName();
        case 'email': return generateEmail();
        case 'phone': return generatePhone();
        case 'address': return generateAddress();
        case 'city': return generateCity();
        case 'country': return generateCountry();
        case 'color': return generateColor();
        case 'animal': return generateAnimal();
        case 'food': return generateFood();
        case 'all': return generateAll();
        default: return 'Tipo desconocido';
    }
}

function generateAll() {
    return {
        name: generateName(),
        email: generateEmail(),
        phone: generatePhone(),
        address: generateAddress(),
        city: generateCity(),
        country: generateCountry(),
        color: generateColor(),
        animal: generateAnimal(),
        food: generateFood()
    };
}

function formatOutput(data, type) {
    if (type === 'all') {
        return `${data.name} | ${data.email} | ${data.phone} | ${data.address} | ${data.city} | ${data.country} | ${data.color} | ${data.animal} | ${data.food}`;
    }
    return data;
}

// ==================== MAIN ====================
(async function main() {
    try {
        console.log(`🔍 Random Data Generator - MFH TOOLS PRO`);
        console.log('='.repeat(60));
        console.log(`📋 Tipo: ${type}`);
        console.log(`📋 Cantidad: ${count}`);
        console.log('');
        
        const results = [];
        
        for (let i = 0; i < count; i++) {
            const data = generateData(type);
            results.push(data);
        }
        
        console.log('📋 DATOS GENERADOS:');
        console.log('='.repeat(60));
        
        if (type === 'all') {
            results.forEach((item, i) => {
                console.log(`${String(i + 1).padStart(2)}. ${item.name}`);
                console.log(`   📧 Email: ${item.email}`);
                console.log(`   📱 Teléfono: ${item.phone}`);
                console.log(`   🏠 Dirección: ${item.address}`);
                console.log(`   🏙️ Ciudad: ${item.city}`);
                console.log(`   🌍 País: ${item.country}`);
                console.log(`   🎨 Color: ${item.color}`);
                console.log(`   🐾 Animal: ${item.animal}`);
                console.log(`   🍽️ Comida: ${item.food}`);
                console.log('');
            });
        } else {
            results.forEach((item, i) => {
                console.log(`${String(i + 1).padStart(2)}. ${item}`);
            });
        }
        
        // Guardar en archivo
        if (outputFile) {
            let content = '';
            if (type === 'all') {
                content = results.map(item => {
                    return `${item.name} | ${item.email} | ${item.phone} | ${item.address} | ${item.city} | ${item.country} | ${item.color} | ${item.animal} | ${item.food}`;
                }).join('\n');
            } else {
                content = results.join('\n');
            }
            fs.writeFileSync(outputFile, content);
            console.log(`\n📁 Datos guardados en: ${outputFile}`);
        }
        
        console.log('\n✅ Random Data Generator completado exitosamente');
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
})();
