# 1. Imagen base oficial de Python
FROM python:3.10-slim

# 2. Carpeta de trabajo dentro del contenedor
WORKDIR /app

# 3. Copiar e instalar librerías
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copiar todo el código del backend
COPY . .

# 5. Puerto que expondrá el servicio
EXPOSE 8000

# 6. Comando para iniciar la API con Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]