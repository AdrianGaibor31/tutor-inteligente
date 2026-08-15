import { useState, useRef, useEffect } from "react"
import { supabase } from "../supabase"
import TestFinal from "./TestFinal"
import Ranking from "./Ranking"

const FormatearMensaje = ({ texto, isDark }) => {
  if (!texto) return null;
  const partes = texto.split(/(```[\s\S]*?```|\*\*.*?\*\*|`.*?`)/g);
  return (
    <span style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", lineHeight: "1.5" }}>
      {partes.map((parte, index) => {
        if (parte.startsWith("```") && parte.endsWith("```")) {
          const codigo = parte.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");
          return (
            <pre key={index} style={{
              backgroundColor: isDark ? "#0f172a" : "#1e293b", color: "#f8fafc", 
              padding: "14px", borderRadius: "8px", overflowX: "auto", 
              marginTop: "10px", marginBottom: "10px", fontFamily: "monospace", fontSize: "14px"
            }}>{codigo}</pre>
          );
        }
        if (parte.startsWith("**") && parte.endsWith("**")) { return <strong key={index}>{parte.slice(2, -2)}</strong>; }
        if (parte.startsWith("`") && parte.endsWith("`")) {
          return <code key={index} style={{
            backgroundColor: isDark ? "#334155" : "#e2e8f0", padding: "2px 6px", borderRadius: "4px", color: isDark ? "#fca5a5" : "#cc0000", fontFamily: "monospace"
          }}>{parte.slice(1, -1)}</code>;
        }
        return <span key={index}>{parte}</span>;
      })}
    </span>
  );
};

const MiniBarra = ({ count, isDark }) => (
  <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
    {[1, 2, 3].map(i => (
      <div key={i} style={{ 
        height: '6px', flex: 1, 
        backgroundColor: i <= count ? '#10b981' : (isDark ? '#334155' : '#cbd5e1'), 
        borderRadius: '3px', transition: '0.3s' 
      }} />
    ))}
  </div>
);

function PanelUsuario({ perfil, onCerrarSesion }) {
  const [vista, setVista] = useState("chat")
  const [perfilData, setPerfilData] = useState(perfil)
  const [lenguaje, setLenguaje] = useState("python")

  const [temaOscuro, setTemaOscuro] = useState(() => localStorage.getItem("temaOscuro_itq") === "true");
  const toggleTema = () => { setTemaOscuro(!temaOscuro); localStorage.setItem("temaOscuro_itq", !temaOscuro); }

  const langKey = lenguaje.toLowerCase();
  
  const nivelActual = perfilData.nivel_actual || 1;
  const pyCount = perfilData[`python_e${nivelActual}`] || 0;
  const jaCount = perfilData[`java_e${nivelActual}`] || 0;
  const psCount = perfilData[`pseint_e${nivelActual}`] || 0;
  
  const yaHizoDiagnostico = perfilData[`${langKey}_diag`] === true;

  const [mensajes, setMensajes] = useState([])
  const [duda, setDuda] = useState("")
  const [cargando, setCargando] = useState(false)
  
  const [diagnosticoIniciado, setDiagnosticoIniciado] = useState(yaHizoDiagnostico)
  const [navegacionBloqueada, setNavegacionBloqueada] = useState(!yaHizoDiagnostico)

  const [retoActivoEnunciado, setRetoActivoEnunciado] = useState(null)

  const inputChatRef = useRef(null)
  const chatEndRef = useRef(null)

  const nombresNiveles = { 1: "🟢 Explorador Global", 2: "🔵 Aprendiz Global", 3: "🟣 Programador Global" }

  const recargarPerfil = async () => {
    const { data } = await supabase.from("perfiles").select("*").eq("id", perfil.id).single();
    if (data) setPerfilData(data);
  }

  // 1. MOTOR SEGUIMIENTO TIEMPO
  useEffect(() => {
    const guardarTiempo = async () => {
      try {
        const { data } = await supabase.from("perfiles").select("tiempo_uso_segundos").eq("id", perfil.id).single();
        if (data) {
          await supabase.from("perfiles").update({ tiempo_uso_segundos: (data.tiempo_uso_segundos || 0) + 60 }).eq("id", perfil.id);
        }
      } catch (error) { console.error("Error guardando tiempo", error) }
    };
    const intervaloTiempo = setInterval(guardarTiempo, 60000);
    return () => clearInterval(intervaloTiempo);
  }, [perfil.id]);

  // 2. MOTOR ANTI-TRAMPAS
  useEffect(() => {
    const manejarCambioPestana = async () => {
      if (document.hidden && retoActivoEnunciado !== null) {
        try {
          const { data } = await supabase.from("perfiles").select("intentos_trampa").eq("id", perfil.id).single();
          if (data) {
            await supabase.from("perfiles").update({ intentos_trampa: (data.intentos_trampa || 0) + 1 }).eq("id", perfil.id);
            alert("⚠️ ADVERTENCIA DE INTEGRIDAD ACADÉMICA ⚠️\n\nEl sistema ha detectado que saliste de la pestaña durante un reto activo.\nIntento registrado.");
          }
        } catch (error) { console.error("Error registrando trampa", error) }
      }
    };
    document.addEventListener("visibilitychange", manejarCambioPestana);
    return () => document.removeEventListener("visibilitychange", manejarCambioPestana);
  }, [perfil.id, retoActivoEnunciado]);

  useEffect(() => {
    const estadoDiag = perfilData[`${langKey}_diag`] === true;
    if (!estadoDiag) {
      setMensajes([]); setDiagnosticoIniciado(false); setNavegacionBloqueada(true);
    } else {
      const chatGuardado = localStorage.getItem(`chat_itq_${perfil.id}_${langKey}`);
      if (chatGuardado) {
        setMensajes(JSON.parse(chatGuardado)); setDiagnosticoIniciado(true); setNavegacionBloqueada(false);
      }
    }
  }, [lenguaje, perfil.id, langKey]);

  useEffect(() => {
    if (mensajes.length > 0) localStorage.setItem(`chat_itq_${perfil.id}_${langKey}`, JSON.stringify(mensajes));
  }, [mensajes, perfil.id, langKey]);

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }) }, [mensajes, cargando])
  useEffect(() => { if (vista === "chat" && !cargando && inputChatRef.current) inputChatRef.current.focus() }, [cargando, vista])

  const iniciarDiagnostico = async (sabeProgramacion) => {
    setDiagnosticoIniciado(true) 
    const resUsr = sabeProgramacion ? `Sí, tengo conocimientos previos de ${lenguaje.toUpperCase()}.` : `No, empiezo desde cero en ${lenguaje.toUpperCase()}.`
    const msgBienvenida = { tipo: "tutor", texto: `👋 ¡Hola ${perfil.nombre || "Estudiante"}! Antes de arrancar con ${lenguaje.toUpperCase()}, cuéntame: ¿Tienes experiencia?` }
    const msgUsuario = { tipo: "usuario", texto: resUsr }
    
    setMensajes([msgBienvenida, msgUsuario])
    setCargando(true)

    try {
      const res = await fetch("http://127.0.0.1:8000/preguntar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duda: `Soy el estudiante. Respondí: "${resUsr}". Enséñame el primer paso en ${lenguaje.toUpperCase()} de forma rápida.`, historial: [msgBienvenida, msgUsuario], usuario_id: perfil.id, lenguaje, es_reto_formal: false })
      })
      const datos = await res.json()
      setMensajes(prev => [...prev, { tipo: "tutor", texto: datos.respuesta }])
      recargarPerfil();
    } catch { setMensajes(prev => [...prev, { tipo: "tutor", texto: "Error de red." }]) } 
    finally { setCargando(false) }
  }

  const enviarPregunta = async () => {
    const textoLimpio = duda.trim()
    if (!textoLimpio || cargando) return
    
    const nuevoHistorial = [...mensajes, { tipo: "usuario", texto: textoLimpio }]
    setMensajes(nuevoHistorial)
    setDuda("") 
    setCargando(true)

    if (navegacionBloqueada) {
      try {
        await supabase.from("perfiles").update({ [`${langKey}_diag`]: true }).eq("id", perfil.id)
        setPerfilData(prev => ({...prev, [`${langKey}_diag`]: true})); setNavegacionBloqueada(false);
      } catch (error) {}
    }

    const enModoReto = retoActivoEnunciado !== null;

    try {
      const res = await fetch("http://127.0.0.1:8000/preguntar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          duda: textoLimpio, 
          historial: nuevoHistorial, 
          usuario_id: perfil.id, 
          lenguaje, 
          es_reto_formal: enModoReto
        })
      })
      const datos = await res.json()
      setMensajes(prev => [...prev, { tipo: "tutor", texto: datos.respuesta }])
      
      await recargarPerfil(); 

      if (enModoReto && datos.reto_superado) {
        setRetoActivoEnunciado(null); 
        if (datos.subio_nivel_global) {
          setTimeout(() => {
            alert(`🎉 ¡FELICIDADES ${perfil.nombre || "Estudiante"}! 🎉\n\nHas completado los 9 retos requeridos.\nEl sistema te asciende oficialmente al siguiente Nivel Global.`);
          }, 500);
        }
      }
      
    } catch (err) { setMensajes(prev => [...prev, { tipo: "tutor", texto: "Error de conexión." }]) } 
    finally { setCargando(false) }
  }

  const manejarTeclado = (e) => { 
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      enviarPregunta(); 
    } 
  }

  const generarRetoEnChat = async () => {
    // Si ya completó los 3 del lenguaje actual
    const retosActuales = perfilData[`${langKey}_e${nivelActual}`] || 0;
    if (retosActuales >= 3) {
      alert(`⚠️ Ya has completado las 3 misiones de ${lenguaje.toUpperCase()} para el Nivel ${nivelActual}.\n\nPor favor cambia a otro lenguaje en la pestaña superior para continuar tus misiones.`);
      return;
    }

    setCargando(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/ejercicio/generar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lenguaje, usuario_id: perfil.id, nivel: nivelActual })
      })
      const datos = await res.json()
      
      setRetoActivoEnunciado(datos.ejercicio);

      setMensajes(prev => [ 
        ...prev, 
        { tipo: "usuario", texto: `🎯 (Solicitud de Reto Formal)` }, 
        { tipo: "tutor", texto: `¡Claro que sí! Aquí tienes tu reto evaluado para sumar puntos:\n\n**${datos.ejercicio}**\n\nEscribe tu código y dale a Enviar para que te lo evalúe estrictamente.` } 
      ])
    } catch { setMensajes(prev => [...prev, { tipo: "tutor", texto: "Error al generar reto." }]) } 
    finally { setCargando(false) }
  }

  const manejarCierreSesion = async () => {
    if (window.confirm("¿Seguro que deseas cerrar sesión?")) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("chat_itq_") || key === "temaOscuro_itq") localStorage.removeItem(key);
      });
      onCerrarSesion();
    }
  }

  // VALIDACIÓN DE TEST FINAL
  const puedeHacerTest = nivelActual === 3 && pyCount >= 3 && jaCount >= 3 && psCount >= 3;
  const yaRendioTest = perfilData.puntaje_test !== null && perfilData.puntaje_test !== undefined;

  const estilos = obtenerEstilos(temaOscuro);

  return (
    <div style={estilos.layout}>
      <aside style={estilos.sidebar}>
        <div style={estilos.sidebarHeader}>
          <div style={{display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px"}}>
            <img src="/logo-istq.png" alt="Logo ITQ" style={{ width: "45px", height: "auto", borderRadius: "6px" }} />
            <h2 style={estilos.logo}>TutorIA</h2>
          </div>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
            <span style={estilos.badgeUsuario}>Estudiante ITQ</span>
            <button onClick={toggleTema} style={estilos.botonTema}>{temaOscuro ? "☀️ Claro" : "🌙 Oscuro"}</button>
          </div>
        </div>

        <div style={estilos.progresoWidget}>
          <p style={estilos.nivelTexto}>{nombresNiveles[nivelActual]}</p>
          <ul style={{listStyle: "none", padding: 0, margin: 0, fontSize: "13.5px", color: temaOscuro ? "#f8fafc" : "#0f172a", fontWeight: "600"}}>
            <li style={{marginBottom: "12px"}}>
              <div style={{display: "flex", justifyContent: "space-between"}}><span>🐍 Python</span> <span>{pyCount}/3 {pyCount >= 3 ? "✅" : "⏳"}</span></div>
              <MiniBarra count={pyCount} isDark={temaOscuro} />
            </li>
            <li style={{marginBottom: "12px"}}>
              <div style={{display: "flex", justifyContent: "space-between"}}><span>☕ Java</span> <span>{jaCount}/3 {jaCount >= 3 ? "✅" : "⏳"}</span></div>
              <MiniBarra count={jaCount} isDark={temaOscuro} />
            </li>
            <li style={{marginBottom: "12px"}}>
              <div style={{display: "flex", justifyContent: "space-between"}}><span>📝 PSeInt</span> <span>{psCount}/3 {psCount >= 3 ? "✅" : "⏳"}</span></div>
              <MiniBarra count={psCount} isDark={temaOscuro} />
            </li>
          </ul>

          <div style={estilos.erroresCaja}>
            <span style={{fontSize: "12px", fontWeight: "bold"}}>❌ Total Errores:</span>
            <span style={{fontSize: "14px", fontWeight: "900", color: "#ef4444"}}>{perfilData.errores_totales || 0}</span>
          </div>

          {/* 🔥 BOTÓN TEST FINAL CON CANDADO SI YA FUE RENDIDO 🔥 */}
          {puedeHacerTest && (
            yaRendioTest ? (
              <div style={estilos.cajaTestCompletado}>
                🎓 Test Rendido: <strong>{perfilData.puntaje_test}/10 pts</strong>
              </div>
            ) : (
              <button style={estilos.botonTestFinal} onClick={() => setVista("test")}>🏆 Iniciar Test Final</button>
            )
          )}
        </div>

        <nav style={estilos.nav}>
          <button style={vista === "chat" ? estilos.navItemActivo : estilos.navItem} onClick={() => setVista("chat")}>💬 Chat del Tutor</button>
          <button style={vista === "ranking" ? estilos.navItemActivo : estilos.navItem} onClick={() => !navegacionBloqueada && setVista("ranking")} disabled={navegacionBloqueada}>🏅 Ranking {navegacionBloqueada && "🔒"}</button>
        </nav>

        <div style={estilos.sidebarFooter}>
          <p style={estilos.adminName}>👤 {perfil.nombre || "Estudiante"}</p>
          <button style={estilos.btnSalir} onClick={manejarCierreSesion}>Cerrar Sesión</button>
        </div>
      </aside>

      <main style={estilos.mainContent}>
        {vista === "chat" && (
          <div style={estilos.vistaFade}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h1 style={estilos.tituloVista}>Entorno de {lenguaje.toUpperCase()}</h1>
              
              <div style={estilos.generadorRapidoBox}>
                <select value={lenguaje} onChange={(e) => setLenguaje(e.target.value)} style={estilos.selectLang} disabled={cargando}>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="pseint">PSeInt</option>
                </select>
                {!navegacionBloqueada && (
                  <button style={retoActivoEnunciado ? estilos.botonGenerarRetoActivo : estilos.botonGenerarReto} onClick={generarRetoEnChat} disabled={cargando || retoActivoEnunciado}>
                    {cargando ? "Cargando..." : retoActivoEnunciado ? "⚠️ Resuelve el reto activo" : "🎯 Pedir Nuevo Reto"}
                  </button>
                )}
              </div>
            </div>

            <div style={estilos.tarjeta}>
              <div style={estilos.chat}>
                {mensajes.length === 0 && !diagnosticoIniciado && (
                  <div style={estilos.bienvenidaContainer}>
                    <div style={{fontSize: "48px", marginBottom: "16px"}}>🤖</div>
                    <h2 style={{ color: temaOscuro ? "white" : "#0f172a", marginBottom: "12px" }}>Entorno de {lenguaje.toUpperCase()} 👋</h2>
                    <p style={{ color: temaOscuro ? "#cbd5e1" : "#334155", marginBottom: "24px" }}>¡Hola, {perfil.nombre || "Estudiante"}! ¿Tienes experiencia previa en {lenguaje.toUpperCase()}?</p>
                    <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                      <button style={estilos.btnCheckSi} onClick={() => iniciarDiagnostico(true)}>✅ Sí, sé un poco</button>
                      <button style={estilos.btnCheckNo} onClick={() => iniciarDiagnostico(false)}>❌ No, empiezo de cero</button>
                    </div>
                  </div>
                )}

                {mensajes.map((msg, i) => (
                  <div key={i} style={msg.tipo === "usuario" ? estilos.mensajeUsuario : estilos.mensajeTutor}>
                    <strong>{msg.tipo === "usuario" ? "Tú" : "🤖 TutorIA"}</strong>
                    <div style={{ marginTop: "6px" }}>
                      {msg.tipo === "usuario" ? <span style={{ whiteSpace: "pre-wrap" }}>{msg.texto}</span> : <FormatearMensaje texto={msg.texto} isDark={temaOscuro} />}
                    </div>
                  </div>
                ))}
                {cargando && <div style={estilos.mensajeTutor}><strong>🤖 TutorIA</strong><p style={{ marginTop: "6px" }}>Escribiendo...</p></div>}
                <div ref={chatEndRef} />
              </div>

              {(mensajes.length > 0 || diagnosticoIniciado) && (
                <div style={estilos.contenedorInput}>
                  {retoActivoEnunciado && <div style={{ backgroundColor: "#fef3c7", padding: "8px 12px", borderRadius: "8px", border: "1px solid #f59e0b", color: "#b45309", fontSize: "13px", fontWeight: "700", marginBottom: "6px" }}>⚠️ ESTÁS EN MODO RETO: Tu siguiente mensaje será evaluado estrictamente por el sistema.</div>}
                  <div style={estilos.inputArea}>
                    {/* 🔥 BLOQUEO DE COPY-PASTE APLICADO AQUI 🔥 */}
                    <textarea 
                      ref={inputChatRef} 
                      style={estilos.textarea} 
                      placeholder="Escribe tu código o duda aquí..." 
                      value={duda} 
                      onChange={(e) => setDuda(e.target.value)} 
                      onKeyDown={manejarTeclado} 
                      onPaste={(e) => { e.preventDefault(); alert("⚠️ Está prohibido pegar código. Debes redactarlo manualmente."); }}
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      disabled={cargando} 
                      rows="2" 
                    />
                    <button style={estilos.botonPrimario} onClick={enviarPregunta} disabled={cargando}>Enviar</button>
                  </div>
                  <p style={estilos.textoInstruccion}>💡 Presiona <strong>[Shift] + [Enter]</strong> para salto de línea. Presiona <strong>[Enter]</strong> para enviar.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {vista === "ranking" && <div style={estilos.vistaFade}><Ranking temaOscuro={temaOscuro} /></div>}
        {vista === "test" && <div style={estilos.vistaFade}><TestFinal perfil={perfilData} onVolver={() => setVista("chat")} temaOscuro={temaOscuro} /></div>}
      </main>
    </div>
  )
}

const obtenerEstilos = (isDark) => ({
  layout: { display: "flex", minHeight: "100vh", backgroundColor: isDark ? "#0f172a" : "#e2e8f0", fontFamily: "system-ui, sans-serif", transition: "0.3s" },
  sidebar: { width: "280px", backgroundColor: isDark ? "#020617" : "#ffffff", color: isDark ? "white" : "#0f172a", display: "flex", flexDirection: "column", boxShadow: "4px 0 15px rgba(0,0,0,0.05)", transition: "0.3s" }, 
  sidebarHeader: { padding: "24px", borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` },
  logo: { fontSize: "22px", fontWeight: "900", margin: 0, letterSpacing: "1px", color: isDark ? "white" : "#0f172a" },
  badgeUsuario: { backgroundColor: "#cc0000", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }, 
  botonTema: { backgroundColor: isDark ? "#334155" : "#cbd5e1", color: isDark ? "white" : "#0f172a", border: "none", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" },
  progresoWidget: { padding: "20px 16px", borderBottom: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` },
  nivelTexto: { margin: "0 0 12px 0", fontWeight: "800", color: isDark ? "white" : "#0f172a", fontSize: "16px" },
  erroresCaja: { marginTop: "16px", padding: "10px", backgroundColor: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(239, 68, 68, 0.4)" },
  botonTestFinal: { width: "100%", marginTop: "16px", padding: "10px", backgroundColor: "#fbbf24", color: "#78350f", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", cursor: "pointer" },
  cajaTestCompletado: { width: "100%", marginTop: "16px", padding: "10px", backgroundColor: "#d1fae5", color: "#065f46", borderRadius: "8px", fontWeight: "bold", fontSize: "13px", textAlign: "center", border: "1px solid #a7f3d0", boxSizing: "border-box" },
  nav: { flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "8px" },
  navItem: { padding: "14px 16px", backgroundColor: "transparent", border: "none", borderRadius: "8px", color: isDark ? "#94a3b8" : "#475569", fontSize: "15px", fontWeight: "700", textAlign: "left", cursor: "pointer", transition: "0.2s" },
  navItemActivo: { padding: "14px 16px", backgroundColor: "#cc0000", border: "none", borderRadius: "8px", color: "white", fontSize: "15px", fontWeight: "700", textAlign: "left", cursor: "pointer" }, 
  sidebarFooter: { padding: "20px", borderTop: `1px solid ${isDark ? "#1e293b" : "#e2e8f0"}` },
  adminName: { margin: "0 0 12px 0", fontWeight: "800", color: isDark ? "white" : "#0f172a", fontSize: "15px" },
  btnSalir: { width: "100%", padding: "10px", backgroundColor: "transparent", border: `1px solid ${isDark ? "#334155" : "#94a3b8"}`, color: isDark ? "#cbd5e1" : "#475569", borderRadius: "8px", cursor: "pointer", fontWeight: "700", transition: "0.2s" },
  mainContent: { flex: 1, padding: "40px", overflowY: "auto" },
  tituloVista: { fontSize: "28px", fontWeight: "900", color: isDark ? "#f8fafc" : "#0f172a", margin: 0 },
  vistaFade: { width: "100%", maxWidth: "900px", margin: "0 auto" },
  tarjeta: { backgroundColor: isDark ? "#1e293b" : "white", borderRadius: "12px", padding: "24px", boxShadow: "0 4px 10px rgba(0,0,0,0.08)", border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`, transition: "0.3s" },
  generadorRapidoBox: { display: "flex", gap: "8px", alignItems: "center" },
  selectLang: { padding: "8px 12px", borderRadius: "6px", border: `1px solid ${isDark ? "#475569" : "#94a3b8"}`, backgroundColor: isDark ? "#0f172a" : "#f1f5f9", color: isDark ? "white" : "#0f172a", fontWeight: "700", outline: "none", cursor: "pointer" },
  botonGenerarReto: { padding: "9px 16px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "pointer" },
  botonGenerarRetoActivo: { padding: "9px 16px", backgroundColor: "#f59e0b", color: "white", border: "none", borderRadius: "6px", fontWeight: "700", cursor: "not-allowed" },
  chat: { minHeight: "350px", maxHeight: "450px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px", paddingRight: "10px" },
  bienvenidaContainer: { textAlign: "center", padding: "40px 20px", backgroundColor: isDark ? "#0f172a" : "#f1f5f9", borderRadius: "12px", border: `2px dashed ${isDark ? "#334155" : "#94a3b8"}` },
  btnCheckSi: { padding: "12px 24px", backgroundColor: "#10b981", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  btnCheckNo: { padding: "12px 24px", backgroundColor: "#64748b", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" },
  mensajeUsuario: { alignSelf: "flex-end", backgroundColor: "#cc0000", color: "white", padding: "14px 18px", borderRadius: "16px 16px 0 16px", maxWidth: "75%", fontSize: "15px", fontWeight: "500" },
  mensajeTutor: { alignSelf: "flex-start", backgroundColor: isDark ? "#334155" : "#f1f5f9", border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`, padding: "14px 18px", borderRadius: "16px 16px 16px 0", maxWidth: "75%", fontSize: "15px", color: isDark ? "#f1f5f9" : "#0f172a", fontWeight: "500" },
  contenedorInput: { display: "flex", flexDirection: "column", gap: "6px" },
  inputArea: { display: "flex", gap: "12px", alignItems: "flex-end" },
  textarea: { flex: 1, padding: "12px", borderRadius: "8px", border: `2px solid ${isDark ? "#475569" : "#cbd5e1"}`, backgroundColor: isDark ? "#0f172a" : "#f8fafc", color: isDark ? "white" : "black", fontSize: "15px", outline: "none", resize: "none", fontWeight: "500" },
  botonPrimario: { padding: "12px 24px", height: "48px", backgroundColor: "#cc0000", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "800", fontSize: "16px" },
  textoInstruccion: { margin: 0, fontSize: "12px", color: isDark ? "#94a3b8" : "#64748b", paddingLeft: "4px", fontWeight: "600" }
});

export default PanelUsuario