import asyncio
import os
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from google import genai
from anthropic import Anthropic

app = FastAPI(title="TutorIA 2.0 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicialización de clientes de IA con variables de entorno
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
CLAUDE_KEY = os.getenv("ANTHROPIC_API_KEY")

gemini_client = genai.Client(api_key=GEMINI_KEY) if GEMINI_KEY else None
claude_client = Anthropic(api_key=CLAUDE_KEY) if CLAUDE_KEY else None

class MensajeChat(BaseModel):
    mensaje: str
    lenguaje: str = "python"
    estudiante_id: str = None
    es_reto: bool = False

PROMPT_SISTEMA_SOCRATICO = """
Eres TutorIA 2.0, el tutor inteligente del Instituto Superior Tecnológico Quito (ITQ).
Tu objetivo es enseñar lógica de programación mediante el MÉTODO SOCRÁTICO:
1. NUNCA des la solución completa de código de inmediato ni resuelvas el reto por el estudiante.
2. Guía con preguntas cortas, analogías claras y pistas paso a paso.
3. Si el estudiante envía código con error, señala amablemente en qué línea está la falla y pregunta qué cree que produce ese resultado.
4. Responde siempre en español, con un tono motivador, empático y profesional.
5. Adapta la sintaxis al lenguaje seleccionado: {lenguaje}.
"""

async def generar_stream_tutor(mensaje: str, lenguaje: str) -> AsyncGenerator[str, None]:
    system_prompt = PROMPT_SISTEMA_SOCRATICO.format(lenguaje=lenguaje)
    
    # Intento 1: Google Gemini con Streaming rápido
    if gemini_client:
        try:
            response = gemini_client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=[system_prompt, f"Lenguaje actual: {lenguaje}. Mensaje del estudiante: {mensaje}"]
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    await asyncio.sleep(0.02)
            return
        except Exception as e:
            print(f"[Aviso] Error en Gemini, activando fallback: {e}")

    # Intento 2: Anthropic Claude (Fallback de alta precisión)
    if claude_client:
        try:
            with claude_client.messages.stream(
                model="claude-3-5-haiku-20241022",
                max_tokens=600,
                system=system_prompt,
                messages=[{"role": "user", "content": f"Lenguaje: {lenguaje}. Estudiante: {mensaje}"}]
            ) as stream:
                for text in stream.text_stream:
                    yield text
                    await asyncio.sleep(0.02)
            return
        except Exception as e:
            print(f"[Aviso] Error en Claude, activando fallback local: {e}")

    # Intento 3: Fallback local garantizado si fallan las APIs externas
    respuestas_respaldo = {
        "java": "¡Buen avance! En Java recuerda que cada instrucción termina en punto y coma (;) y el método main debe tener la firma: public static void main(String[] args). ¿En qué parte sientes que te trabaste?",
        "python": "Excelente iniciativa. Recuerda que en Python la indentación define los bloques de código. ¿Qué resultado esperabas obtener al ejecutar esa línea?",
        "pseint": "Vas por buen camino. En PSeInt recuerda definir los tipos de variables antes de usarlas con 'Definir variable Como Entero/Caracter'. ¿Qué operación deseas realizar?"
    }
    yield respuestas_respaldo.get(lenguaje.lower(), "¡Sigue adelante! Cuéntame exactamente qué parte de la lógica deseas verificar.")

@app.post("/api/chat-stream")
async def chat_stream_endpoint(payload: MensajeChat):
    return StreamingResponse(
        generar_stream_tutor(payload.mensaje, payload.lenguaje),
        media_type="text/event-stream"
    )