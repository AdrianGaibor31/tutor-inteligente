import os
import random
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client
from pydantic import BaseModel
from typing import List, Optional

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "https://tutor-inteligente-theta.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

cliente_ia = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

class MensajeHistorial(BaseModel):
    tipo: str
    texto: str

class Pregunta(BaseModel):
    duda: str
    historial: List[MensajeHistorial] = []
    usuario_id: str
    lenguaje: str = "python"
    es_reto_formal: bool = False 

class Ejercicio(BaseModel):
    lenguaje: str
    usuario_id: str
    nivel: int = 1

@app.get("/")
def home():
    return {"mensaje": "TutorIA listo"}

@app.post("/preguntar")
def preguntar_tutor(data: Pregunta):
    try:
        perfil = supabase.table("perfiles").select("*").eq("id", data.usuario_id).execute()
        if not perfil.data or not perfil.data[0]["activo"]:
            raise HTTPException(status_code=403, detail="Tu cuenta está desactivada.")

        usuario = perfil.data[0]
        nombre_estudiante = usuario.get("nombre", "Estudiante")
        lang = data.lenguaje.lower()
        nivel_actual = usuario.get("nivel_actual", 1) 
        
        # Misiones actuales del lenguaje seleccionado
        ejercicios_lang_actual = usuario.get(f"{lang}_e{nivel_actual}", 0)

        # INSTRUCCIONES DINÁMICAS SEGÚN EL ESTADO DEL ESTUDIANTE
        if not data.es_reto_formal:
            if ejercicios_lang_actual >= 3:
                system_instruction = f"""Eres TutorIA, profesor del ITQ.
Estudiante: {nombre_estudiante}. Entorno: {lang.upper()}.
El estudiante YA COMPLETÓ los 3 retos requeridos de {lang.upper()} para este nivel.
Regla: Felicítalo y dile que cambie a otro lenguaje en la parte superior para completar sus misiones pendientes, o que revise su panel si ya completó los 3 lenguajes."""
            else:
                system_instruction = f"""Eres TutorIA, profesor universitario del ITQ.
Estudiante: {nombre_estudiante}. Entorno actual: {lang.upper()}.

REGLAS DE ENSEÑANZA:
1. Si el alumno no sabe nada, enséñale un concepto BÁSICO con un ejemplo claro.
2. Si el alumno ya entendió el concepto o hace un ejercicio de prueba bien, dile: "¡Perfecto, lo has entendido! Para sumar puntos en tu progreso, por favor haz clic en el botón verde '🎯 Pedir Nuevo Reto' que está en la parte superior derecha."
3. NUNCA uses las etiquetas [RETO_SUPERADO] ni [ERROR_DETECTADO] aquí."""
        else:
            system_instruction = f"""Eres el sistema de evaluación automatizado de TutorIA.
Estudiante: {nombre_estudiante}. Entorno: {lang.upper()}.

REGLA ABSOLUTA: El estudiante está enviando la solución a un reto formal. DEBES EVALUARLO.
1. Si el código tiene ERRORES o está incompleto: Explícale el error y PON OBLIGATORIAMENTE la etiqueta [ERROR_DETECTADO] al final de tu respuesta.
2. Si el código es 100% CORRECTO: Felicítalo brevemente y PON OBLIGATORIAMENTE la etiqueta [RETO_SUPERADO] al final de tu respuesta."""

        contents_para_ia = []
        for msg in data.historial:
            rol_gemini = "user" if msg.tipo == "usuario" else "model"
            if contents_para_ia and contents_para_ia[-1]["role"] == rol_gemini:
                contents_para_ia[-1]["parts"][0]["text"] += f"\n\n{msg.texto}"
            else:
                contents_para_ia.append({"role": rol_gemini, "parts": [{"text": msg.texto}]})

        if not contents_para_ia or contents_para_ia[-1]["role"] != "user":
            contents_para_ia.append({"role": "user", "parts": [{"text": data.duda}]})

        response = cliente_ia.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=contents_para_ia,
            config={"system_instruction": system_instruction, "temperature": 0.5}
        )
        texto_respuesta = response.text
        
        reto_superado = False
        error_cometido = False
        subio_nivel_global = False

        if data.es_reto_formal:
            if "[RETO_SUPERADO]" in texto_respuesta:
                reto_superado = True
                texto_respuesta = texto_respuesta.replace("[RETO_SUPERADO]", "").strip()
                
                columna_actual = f"{lang}_e{nivel_actual}"
                ejercicios_actuales = usuario.get(columna_actual, 0) + 1
                
                py_e = ejercicios_actuales if lang == "python" else usuario.get(f"python_e{nivel_actual}", 0)
                ja_e = ejercicios_actuales if lang == "java" else usuario.get(f"java_e{nivel_actual}", 0)
                ps_e = ejercicios_actuales if lang == "pseint" else usuario.get(f"pseint_e{nivel_actual}", 0)

                # EVALUACIÓN DE ASCENSO DE NIVEL
                if py_e >= 3 and ja_e >= 3 and ps_e >= 3 and nivel_actual < 3:
                    nuevo_nivel = nivel_actual + 1
                    
                    # 🔥 ACTUALIZAMOS TANTO EL NIVEL GLOBAL COMO LOS NIVELES INDIVIDUALES DE BD 🔥
                    supabase.table("perfiles").update({
                        columna_actual: ejercicios_actuales,
                        "nivel_actual": nuevo_nivel,
                        "python_nivel": nuevo_nivel,
                        "java_nivel": nuevo_nivel,
                        "pseint_nivel": nuevo_nivel
                    }).eq("id", data.usuario_id).execute()
                    
                    subio_nivel_global = True
                else:
                    supabase.table("perfiles").update({
                        columna_actual: ejercicios_actuales
                    }).eq("id", data.usuario_id).execute()

            if "[ERROR_DETECTADO]" in texto_respuesta:
                error_cometido = True
                texto_respuesta = texto_respuesta.replace("[ERROR_DETECTADO]", "").strip()
                errores_totales = usuario.get("errores_totales", 0) + 1
                supabase.table("perfiles").update({"errores_totales": errores_totales}).eq("id", data.usuario_id).execute()

        supabase.table("conversaciones").insert({
            "usuario_id": data.usuario_id, "mensaje": data.duda, "respuesta": texto_respuesta
        }).execute()

        return {
            "respuesta": texto_respuesta, 
            "reto_superado": reto_superado, 
            "error_cometido": error_cometido, 
            "subio_nivel_global": subio_nivel_global 
        }
    except Exception as e:
        return {"error": "Error interno del tutor."}

@app.post("/ejercicio/generar")
def generar_ejercicio(data: Ejercicio):
    try:
        dificultad = "básico" if data.nivel == 1 else "intermedio" if data.nivel == 2 else "avanzado"
        tematicas = ["gestión de un restaurante", "un videojuego", "un banco", "clima", "tienda online"]
        tema_elegido = random.choice(tematicas)

        response = cliente_ia.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=f"""Eres TutorIA. Genera un reto de programación en {data.lenguaje.upper()}. Dificultad: {dificultad}. Contexto: {tema_elegido}. Responde SOLO con el enunciado claro del reto."""
        )
        return {"ejercicio": response.text, "lenguaje": data.lenguaje}
    except Exception as e:
        return {"error": "Error al generar el ejercicio."}