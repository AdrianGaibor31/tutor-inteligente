import os
from google import genai
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

print("--- Lista de modelos disponibles ---")
try:
    # Solo imprimimos el nombre para evitar errores de atributos
    for model in client.models.list():
        print(f"👉 {model.name}")
except Exception as e:
    print(f"Error: {e}")