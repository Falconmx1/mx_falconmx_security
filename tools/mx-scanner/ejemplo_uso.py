# Escaneo básico (puertos 1-1000)
python mx_scanner.py -t 192.168.1.1

# Escaneo de rango personalizado
python mx_scanner.py -t scanme.nmap.org -p 1-5000

# Escaneo rápido con 200 hilos
python mx_scanner.py -t 10.0.0.1 -p 1-1000 --threads 200

# Escaneo de puertos específicos
python mx_scanner.py -t 127.0.0.1 -p 80,443,3306,8080

# Guardar reporte con nombre personalizado
python mx_scanner.py -t example.com -o mi_escaneo.txt

# Sin colores (para scripts)
python mx_scanner.py -t 192.168.1.1 --no-color
