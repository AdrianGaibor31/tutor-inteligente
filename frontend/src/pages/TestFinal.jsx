import { useState, useEffect } from "react"
import { supabase } from "../supabase"

function TestFinal({ perfil, onVolver, temaOscuro }) {
  const [preguntasDB, setPreguntasDB] = useState([])
  const [cargando, setCargando] = useState(true)
  
  const [indicePregunta, setIndicePregunta] = useState(0)
  const [respuestasUsuario, setRespuestasUsuario] = useState({})
  const [finalizado, setFinalizado] = useState(false)
  const [puntaje, setPuntaje] = useState(0)
  const [tiempo, setTiempo] = useState(0)
  const [guardando, setGuardando] = useState(false)

  // 1. Cargar preguntas reales desde el panel de administrador
  useEffect(() => {
    const cargarPreguntas = async () => {
      const { data, error } = await supabase.from("preguntas_test").select("*").eq("activa", true)
      if (!error && data && data.length > 0) {
        // Formatear para que coincida con la lógica
        const formateadas = data.map(q => ({
          pregunta: q.pregunta,
          opciones: q.opciones,
          // Guardamos el índice de la respuesta correcta basándonos en el texto
          respuestaCorrecta: q.opciones.indexOf(q.respuesta_correcta)
        }))
        setPreguntasDB(formateadas)
      }
      setCargando(false)
    }
    cargarPreguntas()
  }, [])

  // 2. Cronómetro
  useEffect(() => {
    let intervalo
    if (!finalizado && !cargando && preguntasDB.length > 0) {
      intervalo = setInterval(() => setTiempo((t) => t + 1), 1000)
    }
    return () => clearInterval(intervalo)
  }, [finalizado, cargando, preguntasDB])

  const seleccionarOpcion = (opcionIndex) => {
    setRespuestasUsuario({ ...respuestasUsuario, [indicePregunta]: opcionIndex })
  }

  const siguientePregunta = () => {
    if (indicePregunta < preguntasDB.length - 1) {
      setIndicePregunta(indicePregunta + 1)
    }
  }

  const anteriorPregunta = () => {
    if (indicePregunta > 0) {
      setIndicePregunta(indicePregunta - 1)
    }
  }

  const terminarTest = async () => {
    setGuardando(true)
    setFinalizado(true)
    
    let aciertos = 0
    preguntasDB.forEach((p, index) => {
      if (respuestasUsuario[index] === p.respuestaCorrecta) {
        aciertos += 1
      }
    })
    
    // 🔥 NUEVA LÓGICA: Calcular sobre 10 Puntos (Como la universidad)
    const puntajeFinal = Math.round((aciertos / preguntasDB.length) * 10)
    setPuntaje(puntajeFinal)

    try {
      await supabase.from("perfiles").update({ puntaje_test: puntajeFinal }).eq("id", perfil.id)
      await supabase.from("clasificacion").insert({
        usuario_id: perfil.id,
        puntaje: puntajeFinal,
        tiempo_completado: tiempo
      })
    } catch (error) {
      console.error("Error al guardar el test:", error)
    } finally {
      setGuardando(false)
    }
  }

  const formatoTiempo = (segundos) => {
    const min = Math.floor(segundos / 60).toString().padStart(2, "0")
    const seg = (segundos % 60).toString().padStart(2, "0")
    return `${min}:${seg}`
  }

  const estilos = obtenerEstilos(temaOscuro)

  if (cargando) {
    return <div style={{ textAlign: "center", marginTop: "50px", color: estilos.colorTexto }}>Cargando examen...</div>
  }

  if (preguntasDB.length === 0) {
    return (
      <div style={estilos.contenedor}>
        <div style={estilos.tarjetaResultados}>
          <h2 style={estilos.tituloResultados}>⚠️ Examen no disponible</h2>
          <p style={estilos.texto}>El administrador aún no ha cargado preguntas para el test final.</p>
          <button style={estilos.botonPrimario} onClick={onVolver}>Volver a la Plataforma</button>
        </div>
      </div>
    )
  }

  if (finalizado) {
    return (
      <div style={estilos.contenedor}>
        <div style={estilos.tarjetaResultados}>
          <h1 style={estilos.tituloResultados}>🏆 Test Finalizado</h1>
          <p style={estilos.texto}>Tiempo utilizado: <strong>{formatoTiempo(tiempo)}</strong></p>
          <div style={estilos.cajaPuntaje}>
            <span style={estilos.numeroPuntaje}>{puntaje}</span>
            <span style={estilos.textoPuntaje}>/ 10 Puntos</span>
          </div>
          <p style={estilos.mensajeFinal}>
            {puntaje >= 7 ? "¡Felicidades! Has aprobado con excelencia." : "No alcanzaste la nota mínima (7/10). Sigue repasando la lógica."}
          </p>
          <button style={estilos.botonPrimario} onClick={onVolver}>
            Volver a la Plataforma
          </button>
        </div>
      </div>
    )
  }

  const preguntaActual = preguntasDB[indicePregunta]

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.headerTest}>
        <div>
          <h2 style={estilos.titulo}>Test de Suficiencia</h2>
          <p style={{ margin: "4px 0 0 0", color: estilos.colorSecundario, fontSize: "14px" }}>Instituto Superior Tecnológico Quito</p>
        </div>
        <div style={estilos.cronometro}>⏱️ {formatoTiempo(tiempo)}</div>
      </div>

      <div style={estilos.tarjeta}>
        <div style={estilos.barraProgresoFondo}>
          <div style={{ ...estilos.barraProgresoRelleno, width: `${((indicePregunta + 1) / preguntasDB.length) * 100}%` }} />
        </div>
        
        <p style={estilos.indicador}>Pregunta {indicePregunta + 1} de {preguntasDB.length}</p>
        <h3 style={estilos.preguntaTexto}>{preguntaActual.pregunta}</h3>

        <div style={estilos.opcionesGrid}>
          {preguntaActual.opciones.map((opcion, index) => (
            <button
              key={index}
              style={respuestasUsuario[indicePregunta] === index ? estilos.opcionSeleccionada : estilos.opcionNormal}
              onClick={() => seleccionarOpcion(index)}
            >
              <div style={respuestasUsuario[indicePregunta] === index ? estilos.radioSeleccionado : estilos.radioNormal} />
              {opcion}
            </button>
          ))}
        </div>

        <div style={estilos.navegacion}>
          <button style={indicePregunta > 0 ? estilos.botonSecundario : estilos.botonOculto} onClick={anteriorPregunta}>
            ← Anterior
          </button>

          {indicePregunta < preguntasDB.length - 1 ? (
            <button style={estilos.botonPrimario} onClick={siguientePregunta} disabled={respuestasUsuario[indicePregunta] === undefined}>
              Siguiente →
            </button>
          ) : (
            <button style={estilos.botonFinalizar} onClick={terminarTest} disabled={respuestasUsuario[indicePregunta] === undefined || guardando}>
              {guardando ? "Guardando..." : "Terminar y Evaluar 🏆"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// 🎨 ESTILOS ADAPTABLES (Día/Noche)
const obtenerEstilos = (isDark) => ({
  colorTexto: isDark ? "white" : "#0f172a",
  colorSecundario: isDark ? "#94a3b8" : "#64748b",
  contenedor: { maxWidth: "750px", margin: "0 auto", padding: "40px 20px", fontFamily: "system-ui, sans-serif" },
  headerTest: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  titulo: { fontSize: "24px", color: isDark ? "white" : "#0f172a", margin: 0, fontWeight: "800" }, 
  cronometro: { backgroundColor: isDark ? "#0f172a" : "#f1f5f9", padding: "10px 18px", borderRadius: "8px", fontWeight: "700", color: isDark ? "white" : "#0f172a", border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}` },
  tarjeta: { backgroundColor: isDark ? "#1e293b" : "white", padding: "32px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", borderTop: "4px solid #cc0000" },
  
  barraProgresoFondo: { height: "6px", backgroundColor: isDark ? "#334155" : "#f1f5f9", borderRadius: "3px", overflow: "hidden", marginBottom: "20px" },
  barraProgresoRelleno: { height: "100%", backgroundColor: "#cc0000", transition: "width 0.3s ease" }, 
  
  indicador: { color: isDark ? "#94a3b8" : "#64748b", fontSize: "14px", marginBottom: "8px", fontWeight: "700", textTransform: "uppercase" },
  preguntaTexto: { fontSize: "20px", color: isDark ? "#f8fafc" : "#1e293b", marginBottom: "32px", lineHeight: "1.5", fontWeight: "600" },
  opcionesGrid: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" },
  
  opcionNormal: { display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", backgroundColor: isDark ? "#0f172a" : "#f8fafc", border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`, borderRadius: "8px", fontSize: "15px", textAlign: "left", cursor: "pointer", color: isDark ? "#cbd5e1" : "#334155", transition: "all 0.2s", fontWeight: "600" },
  opcionSeleccionada: { display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", backgroundColor: isDark ? "rgba(204,0,0,0.1)" : "#fff1f2", border: "2px solid #cc0000", borderRadius: "8px", fontSize: "15px", textAlign: "left", cursor: "pointer", color: isDark ? "#fca5a5" : "#990000", fontWeight: "800" },
  radioNormal: { width: "18px", height: "18px", borderRadius: "50%", border: `2px solid ${isDark ? "#475569" : "#cbd5e1"}`, backgroundColor: "transparent" },
  radioSeleccionado: { width: "18px", height: "18px", borderRadius: "50%", border: "5px solid #cc0000", backgroundColor: "transparent" },

  navegacion: { display: "flex", justifyContent: "space-between", borderTop: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, paddingTop: "24px" },
  botonPrimario: { backgroundColor: "#cc0000", color: "white", border: "none", padding: "12px 28px", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }, 
  botonSecundario: { backgroundColor: "transparent", color: isDark ? "#94a3b8" : "#475569", border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`, padding: "12px 24px", borderRadius: "8px", fontSize: "15px", fontWeight: "700", cursor: "pointer" },
  botonOculto: { visibility: "hidden" },
  botonFinalizar: { backgroundColor: "#10b981", color: "white", border: "none", padding: "12px 28px", borderRadius: "8px", fontSize: "15px", fontWeight: "bold", cursor: "pointer" }, 
  
  tarjetaResultados: { backgroundColor: isDark ? "#1e293b" : "white", padding: "48px 32px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", textAlign: "center", borderTop: "4px solid #cc0000" },
  tituloResultados: { fontSize: "32px", color: isDark ? "white" : "#0f172a", margin: "0 0 16px 0", fontWeight: "800" },
  texto: { fontSize: "15px", color: isDark ? "#cbd5e1" : "#64748b", marginBottom: "32px" },
  cajaPuntaje: { backgroundColor: isDark ? "#0f172a" : "#f8fafc", border: `2px dashed ${isDark ? "#475569" : "#cbd5e1"}`, borderRadius: "50%", width: "160px", height: "160px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", margin: "0 auto 32px auto" },
  numeroPuntaje: { fontSize: "48px", fontWeight: "900", color: "#cc0000", lineHeight: "1" }, 
  textoPuntaje: { fontSize: "13px", color: isDark ? "#94a3b8" : "#64748b", fontWeight: "800", textTransform: "uppercase", marginTop: "8px" },
  mensajeFinal: { fontSize: "16px", color: isDark ? "#f8fafc" : "#1e293b", marginBottom: "40px", fontWeight: "700", padding: "0 20px" }
})

export default TestFinal