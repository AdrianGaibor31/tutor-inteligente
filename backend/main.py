import os
from fastapi import FastAPI
from google import genai
from dotenv import load_dotenv
from pathlib import Path

# Cargar configuración
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

@app.get("/")
def home():
    return {"mensaje": "Tutor de Lógica IA listo"}

@app.get("/preguntar")
def preguntar_tutor(duda: str):
    try:
        # Intentamos con el modelo más estable que vimos en tu lista
        response = client.models.generate_content(
            model="gemini-flash-lite-latest", 
            contents=f"""Eres TutorIA, un tutor virtual especializado en lógica de programación para estudiantes de nivel inicial.

Tu forma de enseñar sigue estas reglas estrictas:
1. NUNCA des la respuesta directa a ejercicios, en su lugar da pistas progresivas.
2. Usa analogías del mundo real para explicar conceptos abstractos.
3. Habla siempre en español, con lenguaje simple y amigable.
4. Al final de cada explicación, propón un ejercicio práctico sencillo.
5. Si el estudiante se equivoca, motívalo y guíalo sin criticarlo.
6. Limita tus respuestas a máximo 3 párrafos para no abrumar al estudiante.

Pregunta del estudiante: {duda}"""
        )
        return {"respuesta": response.text}
    except Exception as e:
        return {"error": "El servidor de IA está ocupado, reintenta en 10 segundos."}