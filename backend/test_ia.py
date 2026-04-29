import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Configuración de ruta
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# Cliente con la versión estable
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

try:
    print("Iniciando consulta al tutor...")
    
    # Usamos el nombre que SÍ te funcionó
    response = client.models.generate_content(
        model="gemini-2.0-flash-lite", 
        contents="Hola, saluda a los usuarios y explícales qué es un algoritmo en una frase corta."
    )
    
    print("\n✅ ¡TODO LISTO!")
    print(f"Respuesta del Tutor: {response.text}")

except Exception as e:
    print(f"\n❌ Error: {e}")