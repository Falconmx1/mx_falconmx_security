# 🇲🇽 MX-ENCRYPT v1.0

### La neta del cifrado profesional mexicano

**Hecho en México - AES-256 + RSA - Por los compas, para los compas**

## 🚀 ¿Qué pedo con esta herramienta?

MX-ENCRYPT es una suite de cifrado bien cabrona que incluye:

- ✅ **AES-256-GCM** - Cifrado simétrico con autenticación (el que usan los militares)
- ✅ **RSA-2048/4096** - Cifrado asimétrico para intercambio de llaves
- ✅ **PBKDF2** - Derivación de llaves a partir de contraseñas (100,000 iteraciones)
- ✅ **Modo GCM** - Autenticación integrada, nadie te va a modificar tus archivos
- ✅ **Interfaz por comandos** - Como los chingones, nada de GUI pendeja

## 📦 Instalación

```bash
# Instalar dependencias bien vergas
pip install cryptography colorama

# O mejor, desde requirements.txt
pip install -r tools/requirements.txt
