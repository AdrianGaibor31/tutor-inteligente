import { useState, useEffect } from "react";
import { supabase } from "../supabase";

function ModulosAprendizaje({ perfil, temaOscuro, onVolver }) {
  const [lenguaje, setLenguaje] = useState("python");
  const [modulos, setModulos] = useState([]);
  const [progresoUsuario, setProgresoUsuario] = useState([]);
  
  const [moduloActivo, setModuloActivo] = useState(null);
  const [pasos, setPasos] = useState([]);
  const [pasoActual, setPasoActual] = useState(0);
  
  const [respuesta, setRespuesta] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [moduloCompletado, setModuloCompletado] = useState(false);
  
  const nivelActual = perfil.nivel_actual || 1;

  // Carga inicial al entrar o cambiar de lenguaje
  useEffect(() => {
    cargarModulos();
    cargarProgreso();
  }, [lenguaje]);

  const cargarModulos = async () => {
    const { data } = await supabase
      .from("modulos")
      .select("*")
      .eq("lenguaje", lenguaje)
      .eq("nivel", nivelActual)
      .eq("activo", true)
      .order("orden");
    if (data) setModulos(data);
  };

  const cargarProgreso = async () => {
    const { data } = await supabase
      .from("progreso_modulos")
      .select("*")
      .eq("usuario_id", perfil.id);
    if (data) setProgresoUsuario(data);
  };

  const obtenerProgresoModulo = (moduloId) => {
    return progresoUsuario.find((p) => p.modulo_id === moduloId);
  };

  // Abre un módulo específico
  const abrirModulo = async (modulo) => {
    setCargando(true);
    setModuloActivo(modulo);
    setResultado(null);
    setRespuesta("");
    setModuloCompletado(false);

    // Obtener los pasos de la BD
    const { data: pasosData } = await supabase
      .from("pasos_modulo")
      .select("*")
      .eq("modulo_id", modulo.id)
      .order("orden");
    
    if (pasosData) setPasos(pasosData);

    // Revisar por dónde iba el estudiante
    const progreso = obtenerProgresoModulo(modulo.id);
    if (progreso) {
      setPasoActual(progreso.completado ? pasosData.length - 1 : progreso.paso_actual);
      if (progreso.completado) setModuloCompletado(true);
    } else {
      setPasoActual(0);
      // Crea el registro si es la primera vez
      await supabase.from("progreso_modulos").insert({
        usuario_id: perfil.id,
        modulo_id: modulo.id,
        paso_actual: 0,
        completado: false,
        intentos: 0
      });
    }
    setCargando(false);
  };

  // Enviar respuesta a FastAPI (TutorIA Backend)
  const verificarRespuesta = async () => {
    if (!respuesta.trim() && pasos[pasoActual]?.tipo !== "explicacion") return;
    
    setCargando(true);
    setResultado(null);
    
    try {
      const res = await fetch("https://tutor-inteligente-g3nk.onrender.com/modulos/progreso/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: perfil.id,
          modulo_id: moduloActivo.id,
          paso_orden: pasos[pasoActual].orden,
          respuesta: respuesta || "continuar",
          tipo: pasos[pasoActual].tipo
        })
      });
      
      const datos = await res.json();
      setResultado(datos);
      
      if (datos.correcto && datos.modulo_completado) {
        setModuloCompletado(true);
        cargarProgreso();
      }
    } catch {
      setResultado({ correcto: false, mensaje: "Error de conexión con el TutorIA." });
    } finally {
      setCargando(false);
    }
  };

  const siguientePaso = () => {
    if (pasoActual < pasos.length - 1) {
      setPasoActual(pasoActual + 1);
      setRespuesta("");
      setResultado(null);
    }
  };

  const estilos = obtenerEstilos(temaOscuro);
  const paso = pasos[pasoActual];

  // ---------------------------------------------------------
  // VISTA 1: LISTADO DE MÓDULOS
  // ---------------------------------------------------------
  if (!moduloActivo) {
    return (
      <div style={estilos.contenedor}>
        <div style={estilos.header}>
          <div>
            <h1 style={estilos.titulo}>📚 Ruta de Aprendizaje</h1>
            <p style={estilos.subtitulo}>Domina la teoría paso a paso antes de enfrentar los retos</p>
          </div>
        </div>

        {/* Selector de lenguaje */}
        <div style={estilos.selectorLang}>
          {["python", "java", "pseint"].map((lang) => (
            <button
              key={lang}
              style={lenguaje === lang ? estilos.langActivo : estilos.langBoton}
              onClick={() => setLenguaje(lang)}
            >
              {lang === "python" ? "🐍 Python" : lang === "java" ? "☕ Java" : "📝 PSeInt"}
            </button>
          ))}
        </div>

        {/* Lista de tarjetas de módulos */}
        <div style={estilos.listaModulos}>
          {modulos.map((modulo, index) => {
            const progreso = obtenerProgresoModulo(modulo.id);
            const completado = progreso?.completado;
            const enProgreso = progreso && !completado;
            // Bloquea si el módulo anterior no está completado
            const bloqueado = index > 0 && !obtenerProgresoModulo(modulos[index - 1]?.id)?.completado;

            return (
              <div
                key={modulo.id}
                style={{
                  ...estilos.tarjetaModulo,
                  opacity: bloqueado ? 0.5 : 1,
                  borderLeft: completado ? "5px solid #10b981" : enProgreso ? "5px solid #eab308" : `5px solid ${temaOscuro ? "#475569" : "#cbd5e1"}`
                }}
                onClick={() => !bloqueado && abrirModulo(modulo)}
              >
                <div style={estilos.moduloIcono}>
                  {completado ? "✅" : enProgreso ? "⏳" : bloqueado ? "🔒" : `${index + 1}`}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={estilos.moduloTitulo}>{modulo.titulo}</h3>
                  <p style={estilos.moduloConcepto}>{modulo.concepto}</p>
                </div>
                {!bloqueado && (
                  <span style={estilos.moduloFlecha}>
                    {completado ? "Repasar →" : enProgreso ? "Continuar →" : "Iniciar →"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // VISTA 2: DENTRO DE UN MÓDULO (PASO A PASO)
  // ---------------------------------------------------------
  return (
    <div style={estilos.contenedor}>
      {/* Header del módulo */}
      <div style={estilos.header}>
        <div>
          <button style={estilos.btnVolver} onClick={() => { setModuloActivo(null); setResultado(null); }}>
            ← Volver al temario
          </button>
          <h1 style={{ ...estilos.titulo, marginTop: "12px" }}>{moduloActivo.titulo}</h1>
        </div>
        <div style={estilos.contadorPaso}>
          Paso {pasoActual + 1} de {pasos.length}
        </div>
      </div>

      {/* Barra de progreso */}
      <div style={estilos.barraFondo}>
        <div style={{ ...estilos.barraRelleno, width: `${((pasoActual + 1) / pasos.length) * 100}%` }} />
      </div>

      {/* Mensaje de completado */}
      {moduloCompletado && (
        <div style={estilos.completadoBox}>
          <h2 style={{ color: "#10b981", margin: "0 0 10px 0" }}>🎉 ¡Módulo Superado!</h2>
          <p style={{ color: temaOscuro ? "#cbd5e1" : "#475569" }}>Has dominado los conceptos de <strong>{moduloActivo.titulo}</strong>.</p>
          <button style={estilos.btnPrimario} onClick={() => { setModuloActivo(null); cargarProgreso(); }}>
            Volver a la Ruta
          </button>
        </div>
      )}

      {/* Contenido del paso */}
      {!moduloCompletado && paso && (
        <div style={estilos.tarjetaPaso}>
          
          <div style={estilos.tipoBadge}>
            {paso.tipo === "explicacion" && "📖 Teoría"}
            {paso.tipo === "seleccion" && "🧠 Pregunta"}
            {paso.tipo === "codigo" && "✍️ Práctica Guiada"}
            {paso.tipo === "reto" && "🎯 Reto Final"}
          </div>

          <p style={estilos.contenidoPaso}>{paso.contenido}</p>

          {/* Opciones (Botones) */}
          {paso.tipo === "seleccion" && paso.opciones && (
            <div style={estilos.opcionesGrid}>
              {JSON.parse(paso.opciones).map((opcion, i) => (
                <button
                  key={i}
                  style={respuesta === opcion ? estilos.opcionSeleccionada : estilos.opcionNormal}
                  onClick={() => { setRespuesta(opcion); setResultado(null); }}
                >
                  {opcion}
                </button>
              ))}
            </div>
          )}

          {/* Opciones (Editor de código) */}
          {(paso.tipo === "codigo" || paso.tipo === "reto") && (
            <textarea
              style={estilos.inputCodigo}
              placeholder={paso.tipo === "reto" ? "Escribe tu programa aquí..." : "Escribe tu código aquí..."}
              value={respuesta}
              onChange={(e) => { setRespuesta(e.target.value); setResultado(null); }}
              rows={paso.tipo === "reto" ? 6 : 2}
            />
          )}

          {/* Caja de feedback (Correcto/Incorrecto) */}
          {resultado && (
            <div style={resultado.correcto ? estilos.resultadoCorrecto : estilos.resultadoIncorrecto}>
              <strong>{resultado.correcto ? "✅ ¡Excelente!" : "❌ Ups, algo falló."}</strong>
              <p style={{ margin: "5px 0 0 0" }}>{resultado.mensaje}</p>
            </div>
          )}

          {/* Botón de Acción Principal */}
          <div style={estilos.footerPaso}>
            {resultado?.correcto ? (
              <button style={estilos.btnPrimario} onClick={siguientePaso}>
                {pasoActual < pasos.length - 1 ? "Siguiente Paso →" : "Finalizar Módulo 🎉"}
              </button>
            ) : (
              <button
                style={estilos.btnSecundario}
                onClick={verificarRespuesta}
                disabled={cargando || (!respuesta.trim() && paso.tipo !== "explicacion")}
              >
                {cargando ? "Evaluando..." : paso.tipo === "explicacion" ? "Entendido, continuar" : "Evaluar mi respuesta"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// DICCIONARIO DE ESTILOS (Integrado con el Tema ITQ)
// ---------------------------------------------------------
const obtenerEstilos = (isDark) => ({
  contenedor: { maxWidth: "700px", margin: "0 auto", padding: "20px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" },
  titulo: { fontSize: "28px", fontWeight: "900", color: isDark ? "#f8fafc" : "#0f172a", margin: 0 },
  subtitulo: { fontSize: "15px", color: isDark ? "#94a3b8" : "#475569", margin: "5px 0 0 0" },
  
  btnVolver: { background: "none", border: "none", color: "#b91c1c", fontWeight: "bold", cursor: "pointer", padding: 0, fontSize: "14px" },
  
  selectorLang: { display: "flex", gap: "12px", marginBottom: "30px" },
  langBoton: { flex: 1, padding: "12px", background: "transparent", border: `2px solid ${isDark ? "#334155" : "#cbd5e1"}`, color: isDark ? "#cbd5e1" : "#475569", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" },
  langActivo: { flex: 1, padding: "12px", background: "#b91c1c", border: "2px solid #b91c1c", color: "white", borderRadius: "10px", fontWeight: "bold", cursor: "pointer" },
  
  listaModulos: { display: "flex", flexDirection: "column", gap: "15px" },
  tarjetaModulo: { background: isDark ? "#1e293b" : "white", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "15px", cursor: "pointer", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" },
  moduloIcono: { width: "45px", height: "45px", background: isDark ? "#334155" : "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "bold" },
  moduloTitulo: { margin: "0 0 5px 0", fontSize: "18px", color: isDark ? "white" : "#0f172a" },
  moduloConcepto: { margin: 0, fontSize: "14px", color: isDark ? "#94a3b8" : "#64748b" },
  moduloFlecha: { color: "#b91c1c", fontWeight: "bold", fontSize: "14px" },
  
  contadorPaso: { background: isDark ? "#334155" : "#e2e8f0", padding: "8px 15px", borderRadius: "20px", fontSize: "14px", fontWeight: "bold", color: isDark ? "white" : "#0f172a" },
  barraFondo: { height: "10px", background: isDark ? "#334155" : "#e2e8f0", borderRadius: "5px", overflow: "hidden", marginBottom: "30px" },
  barraRelleno: { height: "100%", background: "#b91c1c", transition: "width 0.4s ease" },
  
  tarjetaPaso: { background: isDark ? "#1e293b" : "white", padding: "30px", borderRadius: "15px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)" },
  tipoBadge: { display: "inline-block", background: isDark ? "#0f172a" : "#f1f5f9", padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: "bold", color: isDark ? "#94a3b8" : "#475569", marginBottom: "20px" },
  contenidoPaso: { fontSize: "17px", lineHeight: "1.6", color: isDark ? "#f8fafc" : "#1e293b", marginBottom: "30px", whiteSpace: "pre-wrap" },
  
  opcionesGrid: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" },
  opcionNormal: { padding: "15px", background: isDark ? "#0f172a" : "#f8fafc", border: `2px solid ${isDark ? "#334155" : "#e2e8f0"}`, borderRadius: "10px", color: isDark ? "white" : "black", textAlign: "left", cursor: "pointer", fontSize: "15px", fontWeight: "bold" },
  opcionSeleccionada: { padding: "15px", background: isDark ? "rgba(185, 28, 28, 0.1)" : "#fef2f2", border: "2px solid #b91c1c", borderRadius: "10px", color: isDark ? "#fca5a5" : "#991b1b", textAlign: "left", cursor: "pointer", fontSize: "15px", fontWeight: "bold" },
  
  inputCodigo: { width: "100%", padding: "15px", background: isDark ? "#0f172a" : "#1e293b", border: "none", borderRadius: "10px", color: "#10b981", fontFamily: "monospace", fontSize: "15px", boxSizing: "border-box", marginBottom: "20px" },
  
  resultadoCorrecto: { padding: "15px", background: isDark ? "rgba(16, 185, 129, 0.1)" : "#f0fdf4", borderLeft: "5px solid #10b981", borderRadius: "8px", marginBottom: "20px", color: isDark ? "#6ee7b7" : "#065f46" },
  resultadoIncorrecto: { padding: "15px", background: isDark ? "rgba(239, 68, 68, 0.1)" : "#fef2f2", borderLeft: "5px solid #ef4444", borderRadius: "8px", marginBottom: "20px", color: isDark ? "#fca5a5" : "#991b1b" },
  
  footerPaso: { display: "flex", justifyContent: "flex-end", marginTop: "10px" },
  btnPrimario: { background: "#b91c1c", color: "white", padding: "12px 25px", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" },
  btnSecundario: { background: isDark ? "#334155" : "#e2e8f0", color: isDark ? "white" : "black", padding: "12px 25px", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" },
  
  completadoBox: { textAlign: "center", padding: "40px", background: isDark ? "#1e293b" : "white", borderRadius: "15px", border: "2px solid #10b981" }
});

export default ModulosAprendizaje;