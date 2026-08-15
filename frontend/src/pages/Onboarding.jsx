import { useState } from "react"
import { supabase } from "../supabase"

const slides = [
  {
    emoji: "🧠",
    titulo: "¡Bienvenido a TutorIA!",
    descripcion: "Soy tu tutor virtual de lógica de programación del Instituto Tecnológico Quito (ITQ). Estoy aquí para acompañarte en cada paso de tu aprendizaje, desde los conceptos más básicos hasta convertirte en un experto.",
    color: "#cc0000" // Rojo ITQ
  },
  {
    emoji: "🗺️",
    titulo: "Tu camino de aprendizaje",
    descripcion: "El sistema está dividido en 3 niveles progresivos. Cada nivel desbloquea el siguiente cuando completes 5 ejercicios. Al final te espera un test definitivo para demostrar todo lo que aprendiste.",
    color: "#475569", // Gris Corporativo
    niveles: [
      { icono: "🟢", nombre: "Nivel 1 — Explorador", desc: "Conceptos básicos con ayuda completa del tutor" },
      { icono: "🔵", nombre: "Nivel 2 — Aprendiz", desc: "Ejercicios intermedios con menos pistas" },
      { icono: "🟣", nombre: "Nivel 3 — Programador", desc: "Retos avanzados, el tutor solo orienta" },
      { icono: "🏆", nombre: "Test Final", desc: "Sin IA, solo tú demostrando lo aprendido" },
    ]
  },
  {
    emoji: "⚔️",
    titulo: "¡Demuestra tu talento!",
    descripcion: "Tu puntaje en el test final aparecerá en la tabla de clasificación. Los mejores estudiantes estarán en el TOP. Completa los niveles con honestidad, el tutor está para ayudarte a aprender, no para darte las respuestas.",
    color: "#0f172a", // Azul Oscuro ITQ
    reglas: [
      "✅ Usa el chat del tutor para entender conceptos",
      "✅ Intenta los ejercicios por tu cuenta primero",
      "❌ En el test final no hay ayuda de IA",
      "🏆 Tu puntaje final te posiciona en el ranking"
    ]
  },
  {
    emoji: "🚀",
    titulo: "¡Todo listo para comenzar!",
    descripcion: "Recuerda: cada error es una oportunidad de aprender. TutorIA está aquí para guiarte, no para juzgarte. ¡Tú puedes lograrlo!",
    color: "#cc0000", // Rojo ITQ
    frase: "\"El único modo de aprender a programar es programando.\" — Harold Abelson"
  }
]

function Onboarding({ perfil, onTerminar }) {
  const [slideActual, setSlideActual] = useState(0)
  const [cargando, setCargando] = useState(false)

  const siguiente = () => {
    if (slideActual < slides.length - 1) {
      setSlideActual(slideActual + 1)
    }
  }

  const anterior = () => {
    if (slideActual > 0) {
      setSlideActual(slideActual - 1)
    }
  }

  const terminarOnboarding = async () => {
    setCargando(true)
    await supabase
      .from("perfiles")
      .update({ onboarding_completado: true })
      .eq("id", perfil.id)
    onTerminar()
  }

  const slide = slides[slideActual]

  return (
    <div style={estilos.fondo}>
      <div style={estilos.tarjeta}>

        {/* Indicadores de progreso */}
        <div style={estilos.indicadores}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                ...estilos.punto,
                backgroundColor: i === slideActual ? "#cc0000" : "#cbd5e1", // Siempre rojo el activo
                width: i === slideActual ? "24px" : "8px"
              }}
            />
          ))}
        </div>

        {/* Contenido del slide */}
        <div style={estilos.contenido}>
          <div style={{ ...estilos.emojiBox, backgroundColor: slide.color + "15" }}>
            <span style={estilos.emoji}>{slide.emoji}</span>
          </div>

          <h1 style={{ ...estilos.titulo, color: slide.color }}>{slide.titulo}</h1>
          <p style={estilos.descripcion}>{slide.descripcion}</p>

          {/* Slide 2 — Niveles */}
          {slide.niveles && (
            <div style={estilos.lista}>
              {slide.niveles.map((n, i) => (
                <div key={i} style={estilos.itemNivel}>
                  <span style={estilos.itemIcono}>{n.icono}</span>
                  <div>
                    <p style={estilos.itemTitulo}>{n.nombre}</p>
                    <p style={estilos.itemDesc}>{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Slide 3 — Reglas */}
          {slide.reglas && (
            <div style={estilos.lista}>
              {slide.reglas.map((r, i) => (
                <div key={i} style={estilos.itemRegla}>
                  <p style={estilos.reglaTexto}>{r}</p>
                </div>
              ))}
            </div>
          )}

          {/* Slide 4 — Frase */}
          {slide.frase && (
            <div style={{ ...estilos.fraseBox, borderColor: slide.color }}>
              <p style={{ ...estilos.frase, color: slide.color }}>{slide.frase}</p>
            </div>
          )}
        </div>

        {/* Navegación */}
        <div style={estilos.navegacion}>
          {slideActual > 0 && (
            <button style={estilos.botonSecundario} onClick={anterior}>
              ← Anterior
            </button>
          )}
          <div style={{ flex: 1 }} />
          {slideActual < slides.length - 1 ? (
            <button
              style={estilos.botonPrincipal}
              onClick={siguiente}
            >
              Siguiente →
            </button>
          ) : (
            <button
              style={estilos.botonPrincipal}
              onClick={terminarOnboarding}
              disabled={cargando}
            >
              {cargando ? "Cargando..." : "¡Comenzar ahora! 🚀"}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// 🎨 ESTILOS INSTITUCIONALES ITQ
const estilos = {
  fondo: {
    minHeight: "100vh",
    backgroundColor: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  tarjeta: {
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "40px",
    maxWidth: "560px",
    width: "100%",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    minHeight: "520px",
    borderTop: "4px solid #cc0000" // Borde rojo superior estilo ITQ
  },
  indicadores: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    alignItems: "center",
  },
  punto: {
    height: "8px",
    borderRadius: "4px",
    transition: "all 0.3s ease",
  },
  contenido: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  emojiBox: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: "36px" },
  titulo: {
    fontSize: "24px",
    fontWeight: "800",
    textAlign: "center",
    margin: 0
  },
  descripcion: {
    fontSize: "15px",
    color: "#475569",
    textAlign: "center",
    lineHeight: "1.7",
    margin: 0
  },
  lista: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "8px",
  },
  itemNivel: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    backgroundColor: "#f8fafc",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e2e8f0"
  },
  itemIcono: { fontSize: "24px" },
  itemTitulo: { fontWeight: "700", color: "#1e293b", fontSize: "14px", margin: "0 0 4px 0" },
  itemDesc: { color: "#64748b", fontSize: "13px", margin: 0 },
  itemRegla: {
    backgroundColor: "#f8fafc",
    padding: "14px 16px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0"
  },
  reglaTexto: { fontSize: "14px", color: "#1e293b", margin: 0, fontWeight: "500" },
  fraseBox: {
    borderLeft: "4px solid",
    paddingLeft: "16px",
    marginTop: "16px",
    alignSelf: "center",
    backgroundColor: "#fff1f2",
    padding: "16px",
    borderRadius: "0 8px 8px 0"
  },
  frase: {
    fontSize: "15px",
    fontStyle: "italic",
    lineHeight: "1.6",
    margin: 0,
    fontWeight: "600"
  },
  navegacion: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "10px"
  },
  botonPrincipal: {
    padding: "12px 28px",
    backgroundColor: "#cc0000", // Botón Rojo ITQ
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background-color 0.2s"
  },
  botonSecundario: {
    padding: "12px 20px",
    backgroundColor: "transparent",
    color: "#475569",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "15px",
    cursor: "pointer",
    fontWeight: "700",
    transition: "background-color 0.2s"
  },
}

export default Onboarding