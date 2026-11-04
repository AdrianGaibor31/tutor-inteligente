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

# ── MODELOS DE DATOS ──

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

class ProgresoModulo(BaseModel):
    usuario_id: str
    modulo_id: int

class RespuestaPaso(BaseModel):
    usuario_id: str
    modulo_id: int
    paso_orden: int
    respuesta: str
    tipo: str


# ── RUTAS PRINCIPALES (CHAT LIBRE Y RETOS) ──

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
                system_instruction = f"""Eres TutorIA, un profesor universitario ultra paciente del ITQ.
Estudiante: {nombre_estudiante}. Entorno actual: {lang.upper()}.

REGLAS DE ENSEÑANZA (MICRO-APRENDIZAJE):
1. NUNCA expliques todo de golpe. Ve PASO A PASO.
2. Si el alumno no sabe nada, enséñale UN solo concepto a la vez y pídele que lo intente en el chat antes de avanzar.
3. Sé interactivo: "Primero hagamos esto... ¿puedes escribir el código para eso?".
4. Si el alumno ya entendió todo el concepto básico, dile: "¡Perfecto, lo dominas! Para sumar puntos en tu progreso, por favor haz clic en el botón verde '🎯 Pedir Nuevo Reto' arriba."
5. NUNCA uses las etiquetas [RETO_SUPERADO] ni [ERROR_DETECTADO] aquí."""
        else:
            system_instruction = f"""Eres el sistema de evaluación automatizado de TutorIA.
Estudiante: {nombre_estudiante}. Entorno: {lang.upper()}.

REGLA ABSOLUTA: El estudiante está enviando la solución a un reto formal. DEBES EVALUARLO.
1. Si el código tiene ERRORES o está incompleto: NO le des la respuesta resuelta. Explícale de forma amable DÓNDE falló y dale una pista para que lo intente de nuevo paso a paso. PON OBLIGATORIAMENTE la etiqueta [ERROR_DETECTADO] al final de tu respuesta.
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
        if data.nivel == 1:
            dificultad = "Principiante absoluto (Nivel 1)"
            tematicas = ["datos personales", "compras simples", "saludos"]
            restricciones = """
            - El usuario NO SABE usar 'if', 'else', 'for', 'while', listas ni funciones.
            - PROHIBIDO pedir cálculos complejos o sistemas completos.
            - El reto debe limitarse ÚNICAMENTE a crear variables y usar print() o input().
            - Ejemplo de lo que SÍ puedes pedir: 'Crea una variable con tu nombre e imprímela'.
            """
        elif data.nivel == 2:
            dificultad = "Intermedio (Nivel 2)"
            tematicas = ["cálculo de notas", "descuentos", "cajero muy simple"]
            restricciones = """
            - El usuario ya sabe variables y condicionales (if/else).
            - NO SABE usar bucles (for/while) ni listas.
            - El reto debe requerir una decisión lógica simple.
            """
        else:
            dificultad = "Avanzado (Nivel 3)"
            tematicas = ["gestión de inventario", "estadísticas", "sistema de contraseñas"]
            restricciones = "El usuario domina lo básico. Puedes pedir el uso de bucles, listas y funciones."
            
        tema_elegido = random.choice(tematicas)

        response = cliente_ia.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=f"""Eres TutorIA. Genera un reto en {data.lenguaje.upper()}. 
            Dificultad: {dificultad}. Contexto: {tema_elegido}. 
            
            REGLAS ESTRICTAS:
            {restricciones}
            
            Responde SOLO con el enunciado del reto. Sé muy breve y directo."""
        )
        return {"ejercicio": response.text, "lenguaje": data.lenguaje}
    except Exception as e:
        return {"error": "Error al generar el ejercicio."}


# ── NUEVOS ENDPOINTS: MÓDULOS DE APRENDIZAJE (TUTORIA 2.0) ──

@app.get("/modulos/{lenguaje}/{nivel}")
def obtener_modulos(lenguaje: str, nivel: int):
    try:
        modulos = supabase.table("modulos").select("*").eq("lenguaje", lenguaje).eq("nivel", nivel).eq("activo", True).order("orden").execute()
        return {"modulos": modulos.data}
    except Exception as e:
        return {"error": "Error al obtener módulos."}

@app.get("/modulos/{modulo_id}/pasos")
def obtener_pasos(modulo_id: int):
    try:
        pasos = supabase.table("pasos_modulo").select("*").eq("modulo_id", modulo_id).order("orden").execute()
        return {"pasos": pasos.data}
    except Exception as e:
        return {"error": "Error al obtener pasos."}

@app.get("/modulos/progreso/{usuario_id}")
def obtener_progreso_usuario(usuario_id: str):
    try:
        progreso = supabase.table("progreso_modulos").select("*").eq("usuario_id", usuario_id).execute()
        return {"progreso": progreso.data}
    except Exception as e:
        return {"error": "Error al obtener progreso."}

@app.post("/modulos/progreso/iniciar")
def iniciar_modulo(data: ProgresoModulo):
    try:
        # Verificar si ya existe progreso
        existente = supabase.table("progreso_modulos").select("*").eq("usuario_id", data.usuario_id).eq("modulo_id", data.modulo_id).execute()
        
        if existente.data:
            return {"progreso": existente.data[0]}
        
        # Crear nuevo progreso
        nuevo = supabase.table("progreso_modulos").insert({
            "usuario_id": data.usuario_id,
            "modulo_id": data.modulo_id,
            "paso_actual": 0,
            "completado": False,
            "intentos": 0
        }).execute()
        
        return {"progreso": nuevo.data[0]}
    except Exception as e:
        return {"error": "Error al iniciar módulo."}

@app.post("/modulos/progreso/verificar")
def verificar_respuesta(data: RespuestaPaso):
    try:
        # Obtener el paso actual
        paso = supabase.table("pasos_modulo").select("*").eq("modulo_id", data.modulo_id).eq("orden", data.paso_orden).execute()
        
        if not paso.data:
            return {"error": "Paso no encontrado."}
        
        paso_actual = paso.data[0]
        es_correcto = False
        mensaje = ""

        if data.tipo == "explicacion":
            # Las explicaciones siempre avanzan
            es_correcto = True
            mensaje = "¡Entendido! Vamos al siguiente paso."

        elif data.tipo == "seleccion":
            es_correcto = data.respuesta.strip() == paso_actual["respuesta_correcta"].strip()
            if es_correcto:
                mensaje = "✅ ¡Correcto! Muy bien."
            else:
                mensaje = f"❌ No es correcto. Pista: {paso_actual['pista']}"

        elif data.tipo == "codigo":
            # Verificar que el código contenga la palabra clave esperada
            es_correcto = paso_actual["respuesta_correcta"].strip().lower() in data.respuesta.strip().lower()
            if es_correcto:
                mensaje = "✅ ¡Perfecto! Tu código es correcto."
            else:
                mensaje = f"❌ Revisa tu código. Pista: {paso_actual['pista']}"

        elif data.tipo == "reto":
            # Los retos se evalúan con IA
            perfil = supabase.table("perfiles").select("*").eq("id", data.usuario_id).execute()
            usuario = perfil.data[0]
            
            response = cliente_ia.models.generate_content(
                model="gemini-flash-lite-latest",
                contents=f"""Evalúa si este código resuelve correctamente el reto.

Reto: {paso_actual['contenido']}
Código del estudiante: {data.respuesta}

Responde EXACTAMENTE así:
RESULTADO: correcto o incorrecto
EXPLICACION: explica en 2 líneas qué hizo bien o qué debe mejorar de forma motivadora."""
            )
            
            texto = response.text.lower()
            es_correcto = "resultado: correcto" in texto
            mensaje = response.text.replace("RESULTADO: correcto", "").replace("RESULTADO: incorrecto", "").replace("EXPLICACION:", "").strip()

        # Si es correcto, actualizar progreso
        if es_correcto:
            # Obtener total de pasos del módulo
            total_pasos = supabase.table("pasos_modulo").select("id").eq("modulo_id", data.modulo_id).execute()
            es_ultimo_paso = data.paso_orden >= len(total_pasos.data)

            # 🔥 CAMBIO APLICADO: Usamos update y .eq() para evitar choques en la base de datos 🔥
            supabase.table("progreso_modulos").update({
                "paso_actual": data.paso_orden,
                "completado": es_ultimo_paso,
                "intentos": 0
            }).eq("usuario_id", data.usuario_id).eq("modulo_id", data.modulo_id).execute()

            return {
                "correcto": True,
                "mensaje": mensaje,
                "modulo_completado": es_ultimo_paso
            }
        else:
            # Sumar intento fallido y retroceder un paso si se equivoca
            supabase.table("progreso_modulos").update({
                "paso_actual": max(0, data.paso_orden - 1),
                "completado": False
            }).eq("usuario_id", data.usuario_id).eq("modulo_id", data.modulo_id).execute()

            return {
                "correcto": False,
                "mensaje": mensaje,
                "modulo_completado": False
            }

    except Exception as e:
        print(f"Error verificando respuesta: {e}")
        return {"error": "Error al verificar la respuesta."}