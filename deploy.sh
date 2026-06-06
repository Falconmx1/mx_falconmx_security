#!/bin/bash
echo "🚀 Desplegando a Railway..."

# Instalar Railway CLI
npm install -g @railway/cli

# Login (primera vez)
railway login

# Link al proyecto
railway link

# Desplegar
railway up

# Variables de entorno
railway variables set HIBP_API_KEY="tu_api_key_aqui"
railway variables set NODE_ENV="production"

echo "✅ Despliegue completado!"
