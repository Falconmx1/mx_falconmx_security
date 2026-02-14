# 🌐 MX-WEBSCAN v1.0
### Escáner de Vulnerabilidades Web
#### Hecho en México 🇲🇽 - MFH TOOLS SECURITY MX

![Version](https://img.shields.io/badge/version-1.0-orange)
![Python](https://img.shields.io/badge/python-3.8+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ⚡ ¿QUÉ ES MX-WEBSCAN?

Escáner automatizado de vulnerabilidades web que detecta:

✅ **SQL Injection** - Inyecciones SQL en parámetros  
✅ **XSS** - Cross-Site Scripting reflejado  
✅ **LFI** - Local File Inclusion  
✅ **RFI** - Remote File Inclusion  
✅ **Detección de tecnologías** - Server, framework, CMS

---

## 🚀 INSTALACIÓN

```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar
python mx-webscan.py -u "http://ejemplo.com/page.php?id=1"
