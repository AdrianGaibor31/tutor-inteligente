import { useState, useEffect } from "react"
import { supabase } from "../supabase"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid } from "recharts"

function PanelAdmin({ perfil, onCerrarSesion }) {
  const [vista, setVista] = useState("dashboard")
  const [estudiantes, setEstudiantes] = useState([])
  const [preguntas, setPreguntas] = useState([])
  const [logs, setLogs] = useState([])
  const [cargando, setCargando] = useState(true)

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [formPregunta, setFormPregunta] = useState({ pregunta: "", opA: "", opB: "", opC: "", correcta: "A" })

  const [busqueda, setBusqueda] = useState("")
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null)

  const [temaOscuro, setTemaOscuro] = useState(() => localStorage.getItem("temaOscuro_itq") === "true");
  const toggleTema = () => { setTemaOscuro(!temaOscuro); localStorage.setItem("temaOscuro_itq", !temaOscuro); }

  const COLORES = ["#10b981", "#3b82f6", "#8b5cf6"]

  useEffect(() => { cargarDatos() }, [])

  const cargarDatos = async () => {
    setCargando(true)
    const { data: dataEstudiantes } = await supabase.from("perfiles").select("*").eq("rol", "usuario")
    if (dataEstudiantes) setEstudiantes(dataEstudiantes)
    
    const { data: dataPreguntas } = await supabase.from("preguntas_test").select("*").order("id", { ascending: true })
    if (dataPreguntas) setPreguntas(dataPreguntas)
    
    // 🔥 SOLUCIÓN A LAS GRÁFICAS: AHORA LEEMOS LA TABLA 'conversaciones' 🔥
    const { data: dataLogs } = await supabase.from("conversaciones").select("created_at")
    if (dataLogs) setLogs(dataLogs)
      
    setCargando(false)
  }

  const toggleEstadoUsuario = async (id, estadoActual) => {
    try {
      const nuevoEstado = !estadoActual
      await supabase.from("perfiles").update({ activo: nuevoEstado }).eq("id", id)
      setEstudiantes(prev => prev.map(est => est.id === id ? { ...est, activo: nuevoEstado } : est))
      if (estudianteSeleccionado?.id === id) {
        setEstudianteSeleccionado(prev => ({ ...prev, activo: nuevoEstado }))
      }
    } catch (error) { console.error("Error:", error) }
  }

  const guardarPregunta = async () => {
    if (!formPregunta.pregunta || !formPregunta.opA || !formPregunta.opB || !formPregunta.opC) {
      alert("⚠️ Completa todos los campos."); return
    }
    setCargando(true)
    const opcionesArray = [formPregunta.opA, formPregunta.opB, formPregunta.opC]
    const respuestaTexto = formPregunta.correcta === "A" ? formPregunta.opA : formPregunta.correcta === "B" ? formPregunta.opB : formPregunta.opC
    try {
      if (editandoId) {
        const { data, error } = await supabase.from("preguntas_test").update({ pregunta: formPregunta.pregunta, opciones: opcionesArray, respuesta_correcta: respuestaTexto }).eq("id", editandoId).select()
        if (!error && data) setPreguntas(prev => prev.map(p => p.id === editandoId ? data[0] : p))
      } else {
        const { data, error } = await supabase.from("preguntas_test").insert([{ pregunta: formPregunta.pregunta, opciones: opcionesArray, respuesta_correcta: respuestaTexto, activa: true }]).select()
        if (!error && data) setPreguntas([...preguntas, data[0]])
      }
      setMostrarForm(false); setEditandoId(null)
      setFormPregunta({ pregunta: "", opA: "", opB: "", opC: "", correcta: "A" })
    } catch (error) { console.error("Error:", error) }
    setCargando(false)
  }

  const iniciarEdicion = (p) => {
    setFormPregunta({ pregunta: p.pregunta, opA: p.opciones[0] || "", opB: p.opciones[1] || "", opC: p.opciones[2] || "", correcta: p.respuesta_correcta === p.opciones[0] ? "A" : p.respuesta_correcta === p.opciones[1] ? "B" : "C" })
    setEditandoId(p.id); setMostrarForm(true)
  }

  const cancelarFormulario = () => {
    setMostrarForm(false); setEditandoId(null)
    setFormPregunta({ pregunta: "", opA: "", opB: "", opC: "", correcta: "A" })
  }

  const toggleEstadoPregunta = async (id, estadoActual) => {
    try {
      const nuevoEstado = !estadoActual
      await supabase.from("preguntas_test").update({ activa: nuevoEstado }).eq("id", id)
      setPreguntas(prev => prev.map(p => p.id === id ? { ...p, activa: nuevoEstado } : p))
    } catch (error) { console.error("Error:", error) }
  }

  const formatoTiempo = (totalSegundos) => {
    if (!totalSegundos) return "0 min"
    return `${Math.floor(totalSegundos / 60)} min`
  }

  const calcularTotalRetos = (est) => {
    return (est.python_e1 || 0) + (est.python_e2 || 0) + (est.python_e3 || 0) +
           (est.java_e1 || 0) + (est.java_e2 || 0) + (est.java_e3 || 0) +
           (est.pseint_e1 || 0) + (est.pseint_e2 || 0) + (est.pseint_e3 || 0);
  }

  const exportarCSV = () => {
    let csv = "\uFEFFNombre;Correo;Nivel;Retos;ErroresTotales;Test Final;Trampas;Tiempo (min);Estado\n"
    estudiantes.forEach(est => {
      const retos = calcularTotalRetos(est);
      csv += `${est.nombre || ""};${est.email || ""};${est.nivel_actual || 1};${retos};${est.errores_totales || 0};${est.puntaje_test !== null ? est.puntaje_test : "Pendiente"};${est.intentos_trampa || 0};${Math.floor((est.tiempo_uso_segundos || 0) / 60)};${est.activo !== false ? "Activo" : "Suspendido"}\n`
    })
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "Reporte_TutorIA_Global.csv")
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const exportarCSVIndividual = (est) => {
    const retos = calcularTotalRetos(est);
    let csv = "\uFEFFCampo;Valor\n"
    csv += `Nombre;${est.nombre}\nCorreo;${est.email}\nNivel Global;${est.nivel_actual || 1}\n`
    csv += `Retos Python;${(est.python_e1 || 0) + (est.python_e2 || 0) + (est.python_e3 || 0)}\n`
    csv += `Retos Java;${(est.java_e1 || 0) + (est.java_e2 || 0) + (est.java_e3 || 0)}\n`
    csv += `Retos PSeInt;${(est.pseint_e1 || 0) + (est.pseint_e2 || 0) + (est.pseint_e3 || 0)}\n`
    csv += `Total Retos;${retos} / 27\nErrores Totales;${est.errores_totales || 0}\nPuntaje Test Final;${est.puntaje_test !== null ? est.puntaje_test : "Pendiente"}\n`
    csv += `Intentos de Trampa;${est.intentos_trampa || 0}\nTiempo en Plataforma;${formatoTiempo(est.tiempo_uso_segundos)}\n`
    csv += `Estado;${est.activo !== false ? "Activo" : "Suspendido"}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Reporte_TutorIA_${est.nombre}.csv`)
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const totalEstudiantes = estudiantes.length
  const conTest = estudiantes.filter(e => e.puntaje_test !== null)
  const promedioCurso = conTest.length > 0 ? (conTest.reduce((sum, e) => sum + e.puntaje_test, 0) / conTest.length).toFixed(1) : 0
  const promedioRetosGlobal = estudiantes.length > 0 ? (estudiantes.reduce((sum, e) => sum + calcularTotalRetos(e), 0) / estudiantes.length).toFixed(1) : 0

  const datosNiveles = [
    { name: "Explorador", valor: estudiantes.filter(e => (e.nivel_actual || 1) === 1).length },
    { name: "Aprendiz", valor: estudiantes.filter(e => e.nivel_actual === 2).length },
    { name: "Programador", valor: estudiantes.filter(e => e.nivel_actual === 3).length },
  ]

  const datosEjercicios = estudiantes.map(e => ({
    nombre: e.nombre,
    total: calcularTotalRetos(e)
  })).sort((a, b) => b.total - a.total).slice(0, 5)

  // 🔥 NUEVA LÓGICA DE GRÁFICAS LEYENDO DE 'conversaciones' 🔥
  const diasSemana = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const datosLineaTiempo = []
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const fechaFiltroStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    
    // Contamos interacciones del día actual
    const interaccionesDelDia = logs.filter(l => {
      if (!l.created_at) return false;
      const logDate = new Date(l.created_at);
      return logDate.toLocaleDateString('en-CA') === fechaFiltroStr;
    }).length;

    datosLineaTiempo.push({ dia: diasSemana[d.getDay()], interacciones: interaccionesDelDia })
  }

  const datosHoras = [
    { periodo: "Mañana (6a-12p)", actividad: 0 },
    { periodo: "Tarde (12p-6p)", actividad: 0 },
    { periodo: "Noche (6p-12a)", actividad: 0 },
    { periodo: "Madrugada (12a-6a)", actividad: 0 },
  ]
  
  logs.forEach(l => {
    if (!l.created_at) return;
    const hora = new Date(l.created_at).getHours() // getHours() ya nos da la hora local
    if (hora >= 6 && hora < 12) datosHoras[0].actividad++
    else if (hora >= 12 && hora < 18) datosHoras[1].actividad++
    else if (hora >= 18 && hora <= 23) datosHoras[2].actividad++
    else datosHoras[3].actividad++
  })

  const estudiantesFiltrados = busqueda.trim() === "" ? [] : estudiantes.filter(e =>
    e.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.email?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const nombresNiveles = { 1: "🟢 Explorador", 2: "🔵 Aprendiz", 3: "🟣 Programador" }
  const estilos = obtenerEstilos(temaOscuro);

  return (
    <div style={estilos.layout}>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background-color: white !important; font-size: 11px !important; color: black !important; }
          aside, .no-print { display: none !important; }
          main { width: 100% !important; margin: 0 !important; padding: 0 !important; background-color: white !important; }
          .vistaFade { width: 100% !important; margin: 0 !important; max-width: none !important; }
          @page { margin: 8mm; size: A4; }
          div { page-break-inside: avoid !important; break-inside: avoid !important; }
          * { color: black !important; border-color: #ccc !important; }
        }
      `}</style>

      <aside style={estilos.sidebar}>
        <div style={estilos.sidebarHeader}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h2 style={estilos.logo}>🧠 TutorIA</h2>
            <button onClick={toggleTema} style={estilos.botonTema}>{temaOscuro ? "☀️ Claro" : "🌙 Oscuro"}</button>
          </div>
          <span style={estilos.badgeAdmin}>Centro de Control</span>
        </div>
        <nav style={estilos.nav}>
          <button style={vista === "dashboard" ? estilos.navItemActivo : estilos.navItem} onClick={() => setVista("dashboard")}>📊 Resumen Global</button>
          <button style={vista === "estudiantes" ? estilos.navItemActivo : estilos.navItem} onClick={() => setVista("estudiantes")}>👥 Gestión Estudiantes</button>
          <button style={vista === "actividad" ? estilos.navItemActivo : estilos.navItem} onClick={() => setVista("actividad")}>📈 Actividad del Curso</button>
          <button style={vista === "test" ? estilos.navItemActivo : estilos.navItem} onClick={() => setVista("test")}>⚙️ Preguntas Test Final</button>
          <button style={vista === "exportar" ? estilos.navItemActivo : estilos.navItem} onClick={() => setVista("exportar")}>📄 Reportes</button>
        </nav>
        <div style={estilos.sidebarFooter}>
          <div style={estilos.adminInfo}>
            <p style={estilos.adminName}>👤 {perfil.nombre}</p>
            <p style={estilos.adminRole}>Administrador</p>
          </div>
          <button style={estilos.btnSalir} onClick={onCerrarSesion}>Cerrar Sesión</button>
        </div>
      </aside>

      <main style={estilos.mainContent}>
        {cargando ? (
          <p style={{ textAlign: "center", marginTop: "50px", color: estilos.textoSecundario }}>Cargando plataforma administrativa...</p>
        ) : (
          <>
            {/* DASHBOARD */}
            {vista === "dashboard" && (
              <div style={estilos.vistaFade}>
                <h1 style={estilos.tituloVista}>Estadísticas Generales</h1>
                <div style={estilos.gridTarjetas}>
                  <div style={estilos.tarjetaMetrica}><h3 style={estilos.metricaTitulo}>Total Estudiantes</h3><p style={estilos.metricaValor}>{totalEstudiantes}</p></div>
                  <div style={estilos.tarjetaMetrica}><h3 style={estilos.metricaTitulo}>Test Completados</h3><p style={estilos.metricaValor}>{conTest.length}<span style={{ fontSize: "16px", color: estilos.textoSecundario }}> / {totalEstudiantes}</span></p></div>
                  <div style={estilos.tarjetaMetrica}><h3 style={estilos.metricaTitulo}>Promedio del Curso</h3><p style={estilos.metricaValor}>{promedioCurso}<span style={{ fontSize: "16px", color: estilos.textoSecundario }}> pts</span></p></div>
                  <div style={estilos.tarjetaMetrica}><h3 style={estilos.metricaTitulo}>Promedio Retos</h3><p style={estilos.metricaValor}>{promedioRetosGlobal}<span style={{ fontSize: "16px", color: estilos.textoSecundario }}> / 27</span></p></div>
                </div>
                <div style={estilos.gridGraficos}>
                  <div style={estilos.tarjetaGrafico}>
                    <h3 style={estilos.graficoTitulo}>Distribución por Niveles</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={datosNiveles} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="valor">
                          {datosNiveles.map((_, index) => (<Cell key={index} fill={COLORES[index % COLORES.length]} />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: temaOscuro ? "#1e293b" : "white", border: "none", color: temaOscuro ? "white" : "black" }} />
                        <Legend wrapperStyle={{ color: estilos.textoPrimario }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={estilos.tarjetaGrafico}>
                    <h3 style={estilos.graficoTitulo}>Top 5 Estudiantes (Retos)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={datosEjercicios} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <XAxis dataKey="nombre" stroke={temaOscuro ? "#94a3b8" : "#64748b"} fontSize={12} />
                        <YAxis stroke={temaOscuro ? "#94a3b8" : "#64748b"} fontSize={12} allowDecimals={false} />
                        <Tooltip cursor={{ fill: temaOscuro ? "#334155" : "#f1f5f9" }} contentStyle={{ backgroundColor: temaOscuro ? "#1e293b" : "white", border: "none", color: temaOscuro ? "white" : "black" }} />
                        <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* GESTIÓN ESTUDIANTES */}
            {vista === "estudiantes" && (
              <div style={estilos.vistaFade}>
                <h1 style={estilos.tituloVista}>Directorio y Seguridad</h1>
                <div style={estilos.tablaContainer}>
                  <table style={estilos.tabla}>
                    <thead>
                      <tr>
                        <th style={estilos.th}>Estudiante</th>
                        <th style={estilos.th}>Nivel</th>
                        <th style={estilos.th}>Retos</th>
                        <th style={estilos.th}>Errores</th>
                        <th style={estilos.th}>Test Final</th>
                        <th style={estilos.th}>Anti-Trampas</th>
                        <th style={estilos.th}>Tiempo</th>
                        <th style={estilos.th}>Acceso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantes.map((est) => {
                        const retos = calcularTotalRetos(est);
                        const estaActivo = est.activo !== false
                        return (
                          <tr key={est.id} style={estilos.tr}>
                            <td style={estilos.td}><strong>{est.nombre}</strong><br /><span style={{ fontSize: "12px", color: estilos.textoSecundario }}>{est.email}</span></td>
                            <td style={estilos.td}><span style={est.nivel_actual === 3 ? estilos.badgeL3 : est.nivel_actual === 2 ? estilos.badgeL2 : estilos.badgeL1}>{nombresNiveles[est.nivel_actual || 1]}</span></td>
                            <td style={{ ...estilos.td, fontWeight: "700", color: "#4f46e5" }}>{retos}/27</td>
                            <td style={{ ...estilos.td, fontWeight: "700", color: "#ef4444" }}>{est.errores_totales || 0}</td>
                            <td style={{ ...estilos.td, fontWeight: "bold", color: est.puntaje_test !== null ? "#10b981" : estilos.textoSecundario }}>{est.puntaje_test !== null ? `${est.puntaje_test} pts` : "Pendiente"}</td>
                            <td style={estilos.td}>{(est.intentos_trampa || 0) > 0 ? <span style={estilos.badgeTrampa}>🚨 {est.intentos_trampa} alertas</span> : <span style={{ color: "#10b981", fontSize: "13px" }}>✅ Limpio</span>}</td>
                            <td style={{ ...estilos.td, fontFamily: "monospace", color: estilos.textoSecundario }}>{formatoTiempo(est.tiempo_uso_segundos)}</td>
                            <td style={estilos.td}><button onClick={() => toggleEstadoUsuario(est.id, estaActivo)} style={estaActivo ? estilos.btnDesactivar : estilos.btnActivar}>{estaActivo ? "Desactivar" : "Activar"}</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ACTIVIDAD */}
            {vista === "actividad" && (
              <div style={estilos.vistaFade}>
                <h1 style={estilos.tituloVista}>Análisis de Actividad</h1>
                <div style={{ ...estilos.tarjetaGrafico, marginBottom: "24px" }}>
                  <h3 style={estilos.graficoTitulo}>Flujo de Interacciones (Últimos 7 días)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={datosLineaTiempo} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs><linearGradient id="colorActividad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0} /></linearGradient></defs>
                      <XAxis dataKey="dia" stroke={temaOscuro ? "#94a3b8" : "#64748b"} fontSize={12} />
                      <YAxis stroke={temaOscuro ? "#94a3b8" : "#64748b"} fontSize={12} allowDecimals={false} />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={temaOscuro ? "#334155" : "#e2e8f0"} />
                      <Tooltip contentStyle={{ backgroundColor: temaOscuro ? "#1e293b" : "white", border: "none", color: temaOscuro ? "white" : "black" }} />
                      <Area type="monotone" dataKey="interacciones" stroke="#4f46e5" fillOpacity={1} fill="url(#colorActividad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div style={estilos.tarjetaGrafico}>
                  <h3 style={estilos.graficoTitulo}>Análisis de Horas Pico</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={datosHoras} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={temaOscuro ? "#334155" : "#e2e8f0"} />
                      <XAxis type="number" stroke={temaOscuro ? "#94a3b8" : "#64748b"} fontSize={12} allowDecimals={false} />
                      <YAxis dataKey="periodo" type="category" stroke={temaOscuro ? "#94a3b8" : "#334155"} fontSize={13} />
                      <Tooltip cursor={{ fill: temaOscuro ? "#334155" : "#f1f5f9" }} contentStyle={{ backgroundColor: temaOscuro ? "#1e293b" : "white", border: "none", color: temaOscuro ? "white" : "black" }} />
                      <Bar dataKey="actividad" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* TEST FINAL */}
            {vista === "test" && (
              <div style={estilos.vistaFade}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h1 style={estilos.tituloVista}>Gestión del Test Final</h1>
                  <button onClick={mostrarForm ? cancelarFormulario : () => setMostrarForm(true)} style={estilos.btnNuevo}>{mostrarForm ? "❌ Cancelar" : "➕ Nueva Pregunta"}</button>
                </div>
                {mostrarForm && (
                  <div style={estilos.formularioCaja}>
                    <h3 style={{ margin: "0 0 16px 0", color: estilos.textoPrimario }}>{editandoId ? "✏️ Editar Pregunta" : "➕ Nueva Pregunta"}</h3>
                    <label style={estilos.label}>Enunciado:</label>
                    <input type="text" style={estilos.inputForm} value={formPregunta.pregunta} onChange={(e) => setFormPregunta({ ...formPregunta, pregunta: e.target.value })} />
                    <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                      <div style={{ flex: 1 }}><label style={estilos.label}>Opción A:</label><input type="text" style={estilos.inputForm} value={formPregunta.opA} onChange={(e) => setFormPregunta({ ...formPregunta, opA: e.target.value })} /></div>
                      <div style={{ flex: 1 }}><label style={estilos.label}>Opción B:</label><input type="text" style={estilos.inputForm} value={formPregunta.opB} onChange={(e) => setFormPregunta({ ...formPregunta, opB: e.target.value })} /></div>
                      <div style={{ flex: 1 }}><label style={estilos.label}>Opción C:</label><input type="text" style={estilos.inputForm} value={formPregunta.opC} onChange={(e) => setFormPregunta({ ...formPregunta, opC: e.target.value })} /></div>
                    </div>
                    <label style={estilos.label}>Respuesta Correcta:</label>
                    <select style={estilos.inputForm} value={formPregunta.correcta} onChange={(e) => setFormPregunta({ ...formPregunta, correcta: e.target.value })}>
                      <option value="A">Opción A</option><option value="B">Opción B</option><option value="C">Opción C</option>
                    </select>
                    <button onClick={guardarPregunta} style={estilos.btnGuardar}>{editandoId ? "💾 Actualizar" : "💾 Guardar"}</button>
                  </div>
                )}
                <div style={estilos.tablaContainer}>
                  <table style={estilos.tabla}>
                    <thead><tr><th style={estilos.th}>Pregunta</th><th style={estilos.th}>Opciones</th><th style={estilos.th}>Acciones</th></tr></thead>
                    <tbody>
                      {preguntas.length === 0 ? (
                        <tr><td colSpan="3" style={{ textAlign: "center", padding: "20px", color: estilos.textoSecundario }}>No hay preguntas registradas.</td></tr>
                      ) : (
                        preguntas.map((p) => (
                          <tr key={p.id} style={estilos.tr}>
                            <td style={{ ...estilos.td, fontWeight: "600", width: "40%" }}>{p.pregunta}</td>
                            <td style={estilos.td}>
                              <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px" }}>
                                {p.opciones.map((op, i) => (<li key={i} style={{ color: op === p.respuesta_correcta ? "#10b981" : estilos.textoPrimario, fontWeight: op === p.respuesta_correcta ? "bold" : "normal" }}>{op}{op === p.respuesta_correcta && " ✅"}</li>))}
                              </ul>
                            </td>
                            <td style={estilos.td}>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => iniciarEdicion(p)} style={estilos.btnEditar}>✏️ Editar</button>
                                <button onClick={() => toggleEstadoPregunta(p.id, p.activa)} style={p.activa ? estilos.btnDesactivar : estilos.btnActivar}>{p.activa ? "Ocultar" : "Activar"}</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EXPORTAR */}
            {vista === "exportar" && (
              <div style={estilos.vistaFade}>
                <h1 style={estilos.tituloVista} className="no-print">Centro de Reportes</h1>

                {!estudianteSeleccionado && (
                  <div className="no-print">
                    <h2 style={estilos.subtituloSeccion}>📋 Reportes Generales del Curso</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "32px" }}>
                      <div style={estilos.tarjetaExportar}>
                        <div style={estilos.iconoExportar}>📊</div>
                        <div>
                          <h3 style={{ margin: "0 0 8px 0", color: estilos.textoPrimario, fontSize: "18px" }}>Consolidado Excel</h3>
                          <p style={{ margin: "0 0 16px 0", color: estilos.textoSecundario, fontSize: "14px" }}>Todos los estudiantes con métricas completas.</p>
                          <button onClick={exportarCSV} style={estilos.btnExportarExcel}>📥 Descargar CSV</button>
                        </div>
                      </div>
                      <div style={estilos.tarjetaExportar}>
                        <div style={estilos.iconoExportar}>📄</div>
                        <div>
                          <h3 style={{ margin: "0 0 8px 0", color: estilos.textoPrimario, fontSize: "18px" }}>Reporte Ejecutivo PDF</h3>
                          <p style={{ margin: "0 0 16px 0", color: estilos.textoSecundario, fontSize: "14px" }}>Resumen global del dashboard imprimible.</p>
                          <button onClick={() => { setVista("dashboard"); setTimeout(() => window.print(), 1000) }} style={estilos.btnExportarPDF}>🖨️ Imprimir PDF</button>
                        </div>
                      </div>
                    </div>

                    <h2 style={estilos.subtituloSeccion}>🔍 Reporte Individual por Estudiante</h2>
                    <input
                      type="text"
                      placeholder="🔎 Buscar por nombre o correo..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      style={{ ...estilos.inputForm, padding: "14px", fontSize: "15px", marginBottom: "12px" }}
                    />

                    {busqueda.trim() !== "" && (
                      <div style={{ border: `1px solid ${temaOscuro ? "#334155" : "#e2e8f0"}`, borderRadius: "10px", overflow: "hidden", marginBottom: "20px" }}>
                        {estudiantesFiltrados.length > 0 ? (
                          estudiantesFiltrados.map(est => (
                            <div key={est.id} onClick={() => { setEstudianteSeleccionado(est); setBusqueda("") }}
                              style={{ padding: "14px 20px", borderBottom: `1px solid ${temaOscuro ? "#334155" : "#f1f5f9"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", backgroundColor: temaOscuro ? "#1e293b" : "white" }}>
                              <span style={{ fontWeight: "600", color: estilos.textoPrimario }}>👤 {est.nombre}</span>
                              <span style={{ fontSize: "13px", color: estilos.textoSecundario }}>{est.email}</span>
                              <span style={est.nivel_actual === 3 ? estilos.badgeL3 : est.nivel_actual === 2 ? estilos.badgeL2 : estilos.badgeL1}>{nombresNiveles[est.nivel_actual || 1]}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: "16px", color: estilos.textoSecundario, textAlign: "center", backgroundColor: temaOscuro ? "#1e293b" : "white" }}>No se encontraron estudiantes.</div>
                        )}
                      </div>
                    )}

                    {busqueda.trim() === "" && (
                      <div style={{ border: `1px solid ${temaOscuro ? "#334155" : "#e2e8f0"}`, borderRadius: "10px", overflow: "hidden" }}>
                        <div style={{ padding: "12px 20px", backgroundColor: temaOscuro ? "#0f172a" : "#f8fafc", borderBottom: `1px solid ${temaOscuro ? "#334155" : "#e2e8f0"}` }}>
                          <p style={{ margin: 0, fontSize: "13px", color: estilos.textoSecundario }}>O selecciona directamente de la lista:</p>
                        </div>
                        {estudiantes.map(est => (
                          <div key={est.id} onClick={() => setEstudianteSeleccionado(est)}
                            style={{ padding: "14px 20px", borderBottom: `1px solid ${temaOscuro ? "#334155" : "#f1f5f9"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: "16px", backgroundColor: temaOscuro ? "#1e293b" : "white" }}>
                            <span style={{ fontWeight: "600", color: estilos.textoPrimario }}>👤 {est.nombre}</span>
                            <span style={{ fontSize: "13px", color: estilos.textoSecundario }}>{est.email}</span>
                            <span style={est.nivel_actual === 3 ? estilos.badgeL3 : est.nivel_actual === 2 ? estilos.badgeL2 : estilos.badgeL1}>{nombresNiveles[est.nivel_actual || 1]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* BOLETÍN INDIVIDUAL */}
                {estudianteSeleccionado && (
                  <div>
                    <div className="no-print" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button onClick={() => setEstudianteSeleccionado(null)} style={{ ...estilos.btnEditar, backgroundColor: "#475569" }}>⬅️ Volver a la lista</button>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={() => exportarCSVIndividual(estudianteSeleccionado)} style={estilos.btnExportarExcel}>📥 Excel Individual</button>
                        <button onClick={() => setTimeout(() => window.print(), 500)} style={estilos.btnExportarPDF}>🖨️ Imprimir PDF</button>
                      </div>
                    </div>

                    <div style={{ backgroundColor: temaOscuro ? "#1e293b" : "white", padding: "40px", borderRadius: "12px", border: `1px solid ${temaOscuro ? "#334155" : "#e2e8f0"}`, boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
                      <div style={{ borderBottom: `2px solid ${temaOscuro ? "#334155" : "#e2e8f0"}`, paddingBottom: "16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#cc0000", fontWeight: "700", textTransform: "uppercase" }}>TutorIA — Reporte de Desempeño</p>
                          <h2 style={{ margin: "0 0 4px 0", fontSize: "28px", color: estilos.textoPrimario }}>{estudianteSeleccionado.nombre}</h2>
                          <p style={{ margin: 0, color: estilos.textoSecundario, fontSize: "14px" }}>{estudianteSeleccionado.email}</p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={estudianteSeleccionado.activo !== false ? estilos.badgeL1 : estilos.badgeTrampa}>
                            {estudianteSeleccionado.activo !== false ? "✅ Cuenta Activa" : "❌ Cuenta Suspendida"}
                          </span>
                          <p style={{ margin: "4px 0 0 0", fontSize: "11px", color: estilos.textoSecundario }}>Generado: {new Date().toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
                        {[
                          { label: "Nivel Alcanzado", valor: nombresNiveles[estudianteSeleccionado.nivel_actual || 1], color: "#475569" },
                          { label: "Total Retos", valor: `${calcularTotalRetos(estudianteSeleccionado)}/27`, color: "#4f46e5" },
                          { label: "Errores Totales", valor: estudianteSeleccionado.errores_totales || 0, color: "#ef4444" },
                          { label: "Tiempo Activo", valor: formatoTiempo(estudianteSeleccionado.tiempo_uso_segundos), color: "#f59e0b" },
                        ].map((m, i) => (
                          <div key={i} style={{ backgroundColor: temaOscuro ? "#0f172a" : "#f8fafc", padding: "14px", borderRadius: "8px", border: `1px solid ${temaOscuro ? "#334155" : "#e2e8f0"}`, textAlign: "center", borderTop: `3px solid ${m.color}` }}>
                            <p style={{ margin: "0 0 6px 0", color: estilos.textoSecundario, fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}>{m.label}</p>
                            <p style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: m.color }}>{m.valor}</p>
                          </div>
                        ))}
                      </div>

                      <h3 style={{ fontSize: "15px", color: estilos.textoPrimario, marginBottom: "12px", borderBottom: `1px solid ${temaOscuro ? "#334155" : "#e2e8f0"}`, paddingBottom: "6px" }}>Progreso Detallado por Entorno</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                        {[
                          { label: "🐍 Entorno Python", valor: (estudianteSeleccionado.python_e1 || 0) + (estudianteSeleccionado.python_e2 || 0) + (estudianteSeleccionado.python_e3 || 0), color: "#10b981" },
                          { label: "☕ Entorno Java", valor: (estudianteSeleccionado.java_e1 || 0) + (estudianteSeleccionado.java_e2 || 0) + (estudianteSeleccionado.java_e3 || 0), color: "#3b82f6" },
                          { label: "📝 Entorno PSeInt", valor: (estudianteSeleccionado.pseint_e1 || 0) + (estudianteSeleccionado.pseint_e2 || 0) + (estudianteSeleccionado.pseint_e3 || 0), color: "#8b5cf6" },
                        ].map((item, i) => (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "13px", fontWeight: "600", color: estilos.textoSecundario }}>{item.label}</span>
                              <span style={{ fontSize: "13px", fontWeight: "700", color: item.color }}>{item.valor}/9</span>
                            </div>
                            <div style={{ height: "12px", backgroundColor: temaOscuro ? "#334155" : "#e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(item.valor / 9) * 100}%`, backgroundColor: item.color, borderRadius: "6px" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

const obtenerEstilos = (isDark) => ({
  textoPrimario: isDark ? "#f8fafc" : "#0f172a",
  textoSecundario: isDark ? "#94a3b8" : "#64748b",
  layout: { display: "flex", minHeight: "100vh", backgroundColor: isDark ? "#0f172a" : "#f1f5f9", fontFamily: "system-ui, -apple-system, sans-serif", transition: "0.3s" },
  sidebar: { width: "280px", backgroundColor: isDark ? "#020617" : "#0f172a", color: "white", display: "flex", flexDirection: "column", boxShadow: "4px 0 15px rgba(0,0,0,0.1)", transition: "0.3s" },
  sidebarHeader: { padding: "24px", borderBottom: `1px solid ${isDark ? "#1e293b" : "#1e293b"}`, backgroundColor: isDark ? "#020617" : "#020617" },
  logo: { fontSize: "22px", fontWeight: "800", color: "white", margin: 0 },
  botonTema: { backgroundColor: isDark ? "#334155" : "#475569", color: "white", border: "none", borderRadius: "8px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontWeight: "bold" },
  badgeAdmin: { backgroundColor: "#cc0000", color: "white", padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700", display: "inline-block" },
  nav: { flex: 1, padding: "24px 16px", display: "flex", flexDirection: "column", gap: "8px" },
  navItem: { padding: "14px 16px", backgroundColor: "transparent", border: "none", borderRadius: "8px", color: "#94a3b8", fontSize: "15px", fontWeight: "600", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "0.2s" },
  navItemActivo: { padding: "14px 16px", backgroundColor: "#cc0000", border: "none", borderRadius: "8px", color: "white", fontSize: "15px", fontWeight: "700", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px" },
  sidebarFooter: { padding: "20px", borderTop: `1px solid ${isDark ? "#1e293b" : "#1e293b"}`, backgroundColor: isDark ? "#020617" : "#020617" },
  adminInfo: { marginBottom: "16px" },
  adminName: { margin: 0, fontWeight: "700", color: "white", fontSize: "15px" },
  adminRole: { margin: "4px 0 0 0", color: "#94a3b8", fontSize: "12px" },
  btnSalir: { width: "100%", padding: "10px", backgroundColor: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "600", transition: "0.2s" },
  mainContent: { flex: 1, padding: "40px", overflowY: "auto" },
  tituloVista: { fontSize: "28px", fontWeight: "900", color: isDark ? "white" : "#0f172a", margin: "0 0 24px 0" },
  subtituloSeccion: { fontSize: "20px", fontWeight: "700", color: isDark ? "white" : "#1e293b", marginBottom: "16px", borderBottom: `2px solid ${isDark ? "#334155" : "#e2e8f0"}`, paddingBottom: "8px" },
  vistaFade: { width: "100%", maxWidth: "1100px", margin: "0 auto" },
  gridTarjetas: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "30px" },
  tarjetaMetrica: { backgroundColor: isDark ? "#1e293b" : "white", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", borderTop: "4px solid #cc0000", transition: "0.3s" },
  metricaTitulo: { margin: "0 0 8px 0", color: isDark ? "#94a3b8" : "#64748b", fontSize: "13px", fontWeight: "700", textTransform: "uppercase" },
  metricaValor: { margin: 0, fontSize: "32px", fontWeight: "900", color: isDark ? "white" : "#0f172a" },
  gridGraficos: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" },
  tarjetaGrafico: { backgroundColor: isDark ? "#1e293b" : "white", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, transition: "0.3s" },
  graficoTitulo: { margin: "0 0 20px 0", color: isDark ? "white" : "#1e293b", fontSize: "16px", fontWeight: "800" },
  tablaContainer: { backgroundColor: isDark ? "#1e293b" : "white", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflowX: "auto", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`, transition: "0.3s" },
  tabla: { width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" },
  th: { backgroundColor: isDark ? "#0f172a" : "#f8fafc", padding: "16px", color: isDark ? "#cbd5e1" : "#475569", fontWeight: "700", fontSize: "13px", borderBottom: `2px solid ${isDark ? "#334155" : "#e2e8f0"}`, textTransform: "uppercase" },
  tr: { borderBottom: `1px solid ${isDark ? "#334155" : "#f1f5f9"}` },
  td: { padding: "16px", color: isDark ? "#f8fafc" : "#1e293b", fontSize: "14px", verticalAlign: "middle" },
  badgeL1: { backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#10b981", padding: "4px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" },
  badgeL2: { backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#3b82f6", padding: "4px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" },
  badgeL3: { backgroundColor: "rgba(139, 92, 246, 0.2)", color: "#8b5cf6", padding: "4px 8px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" },
  badgeTrampa: { backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#ef4444", padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "800" },
  btnDesactivar: { backgroundColor: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "12px" },
  btnActivar: { backgroundColor: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "12px" },
  btnEditar: { backgroundColor: "#475569", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", fontSize: "12px" },
  tarjetaExportar: { backgroundColor: isDark ? "#1e293b" : "white", padding: "24px", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "20px", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` },
  iconoExportar: { fontSize: "32px", backgroundColor: isDark ? "#0f172a" : "#f8fafc", padding: "16px", borderRadius: "12px", border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}` },
  btnExportarExcel: { backgroundColor: "#10b981", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" },
  btnExportarPDF: { backgroundColor: "#cc0000", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" },
  btnNuevo: { backgroundColor: "#cc0000", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" },
  formularioCaja: { backgroundColor: isDark ? "#1e293b" : "white", padding: "24px", borderRadius: "12px", border: `2px dashed ${isDark ? "#475569" : "#cbd5e1"}`, marginBottom: "24px" },
  label: { display: "block", fontWeight: "700", color: isDark ? "#cbd5e1" : "#334155", fontSize: "13px", marginBottom: "6px" },
  inputForm: { width: "100%", padding: "12px", borderRadius: "8px", border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`, backgroundColor: isDark ? "#0f172a" : "white", color: isDark ? "white" : "black", marginBottom: "16px", outline: "none", fontSize: "14px", boxSizing: "border-box" },
  btnGuardar: { backgroundColor: "#cc0000", color: "white", border: "none", padding: "12px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", width: "100%", fontSize: "15px" },
})

export default PanelAdmin