import { useState, useEffect } from "react";
import { supabase } from "../supabase";

// 🔥 RECIBIMOS LA VARIABLE temaOscuro COMO PROP DESDE EL PANEL 🔥
function Ranking({ temaOscuro }) {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const nombresNiveles = { 1: "🟢 Explorador Global", 2: "🔵 Aprendiz Global", 3: "🟣 Programador Global" };

  useEffect(() => {
    const obtenerRanking = async () => {
      const { data, error } = await supabase.from("perfiles").select("*"); 

      if (!error && data) {
        // Filtramos administradores
        const soloEstudiantes = data.filter(user => 
          user.rol !== "admin" && user.rol !== "administrador"
        );

        // 🧠 RECALCULAMOS SUMANDO LA NUEVA ESTRUCTURA DE LENGUAJES
        const rankeados = soloEstudiantes.map(user => {
          const totalEjercicios = 
            (user.python_e1 || 0) + (user.python_e2 || 0) + (user.python_e3 || 0) +
            (user.java_e1 || 0) + (user.java_e2 || 0) + (user.java_e3 || 0) +
            (user.pseint_e1 || 0) + (user.pseint_e2 || 0) + (user.pseint_e3 || 0);
          
          return { ...user, totalEjercicios };
        });

        // 🏆 ALGORITMO DE COMPETITIVIDAD ACTUALIZADO 🏆
        rankeados.sort((a, b) => {
          // 1. Quien tenga más Nivel Global va primero
          const nivelA = a.nivel_actual || 1;
          const nivelB = b.nivel_actual || 1;
          if (nivelB !== nivelA) return nivelB - nivelA;

          // 2. Si empatan en nivel, quien tenga más Retos Completados va primero
          if (b.totalEjercicios !== a.totalEjercicios) return b.totalEjercicios - a.totalEjercicios;

          // 3. Si empatan en retos, quien tenga mejor nota de Test Final
          const notaA = a.puntaje_test || 0;
          const notaB = b.puntaje_test || 0;
          if (notaB !== notaA) return notaB - notaA;

          // 4. NUEVO DESEMPATE: Quien tenga MENOS errores gana la posición
          const erroresA = a.errores_totales || 0;
          const erroresB = b.errores_totales || 0;
          if (erroresA !== erroresB) return erroresA - erroresB;

          // 5. Desempate absoluto: Tiempo récord
          return (a.tiempo_uso_segundos || 0) - (b.tiempo_uso_segundos || 0);
        });

        setEstudiantes(rankeados);
      }
      setCargando(false);
    };
    obtenerRanking();
  }, []);

  const formatoTiempo = (totalSegundos) => {
    if (!totalSegundos) return "00:00";
    const min = Math.floor(totalSegundos / 60);
    const seg = totalSegundos % 60;
    return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
  };

  // 🎨 VARIABLES DE COLOR DINÁMICAS (Modo Noche / Día)
  const colorTextoPrin = temaOscuro ? "#f8fafc" : "#0f172a";
  const colorTextoSec = temaOscuro ? "#cbd5e1" : "#64748b";
  const bgContenedor = temaOscuro ? "#1e293b" : "white";
  const bgTablaHead = temaOscuro ? "#334155" : "#0f172a";
  const borderColor = temaOscuro ? "#475569" : "#e2e8f0";

  if (cargando) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
      <p style={{ color: "#cc0000", fontWeight: "bold", fontSize: "16px" }}>Cargando tabla de posiciones...</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: bgContenedor, padding: "32px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", borderTop: "4px solid #cc0000", fontFamily: "system-ui, sans-serif", transition: "0.3s" }}>
      <h2 style={{ fontSize: "28px", color: colorTextoPrin, margin: "0 0 8px 0", fontWeight: "900" }}>🏅 Ranking ITQ</h2>
      <p style={{ color: colorTextoSec, margin: "0 0 24px 0", fontSize: "15px", fontWeight: "600" }}>
        Mejores estudiantes de TutorIA. ¡Resuelve retos sin errores y sube de rango!
      </p>

      {estudiantes.length === 0 ? (
        <div style={{ padding: "40px", textAlign: "center", backgroundColor: temaOscuro ? "#0f172a" : "#f8fafc", borderRadius: "8px", border: `2px dashed ${borderColor}` }}>
          <p style={{ color: colorTextoSec, margin: 0, fontWeight: "600" }}>Aún no hay estudiantes registrados en la competencia.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${borderColor}`, borderRadius: "8px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "750px" }}>
            <thead>
              <tr style={{ backgroundColor: bgTablaHead, borderBottom: `2px solid ${borderColor}` }}>
                <th style={{ ...estilos.th, color: "white" }}>Posición</th>
                <th style={{ ...estilos.th, color: "white" }}>Estudiante</th>
                <th style={{ ...estilos.th, color: "white" }}>Rango Global</th>
                <th style={{ ...estilos.th, color: "white" }}>Retos</th>
                {/* NUEVA COLUMNA DE ERRORES */}
                <th style={{ ...estilos.th, color: "white" }}>Errores</th>
                <th style={{ ...estilos.th, color: "white" }}>Test Final</th>
                <th style={{ ...estilos.th, color: "white" }}>Tiempo</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map((est, i) => {
                const isFirst = i === 0;
                // Efecto visual destacado para el primer lugar según el modo
                const rowBg = isFirst ? (temaOscuro ? "rgba(204, 0, 0, 0.15)" : "#fff1f2") : "transparent";
                const textColor = isFirst ? "#cc0000" : colorTextoPrin;

                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${borderColor}`, backgroundColor: rowBg, transition: "background-color 0.2s" }}>
                    <td style={estilos.td}>
                      {isFirst ? <span style={{fontSize: "24px"}} title="Primer Lugar">🥇</span> : 
                       i === 1 ? <span style={{fontSize: "24px"}} title="Segundo Lugar">🥈</span> : 
                       i === 2 ? <span style={{fontSize: "24px"}} title="Tercer Lugar">🥉</span> : 
                       <strong style={{color: colorTextoSec, marginLeft: "10px", fontSize: "16px"}}>{i + 1}.</strong>}
                    </td>
                    <td style={{ ...estilos.td, fontWeight: "bold", color: textColor, fontSize: "16px" }}>
                      {est.nombre}
                      {isFirst && <span style={{ marginLeft: "8px", fontSize: "12px", color: "#cc0000", fontWeight: "800", textTransform: "uppercase" }}>(Líder)</span>}
                    </td>
                    <td style={estilos.td}>
                      <span style={est.nivel_actual === 3 ? estilos.badgeL3 : est.nivel_actual === 2 ? estilos.badgeL2 : estilos.badgeL1}>
                        {nombresNiveles[est.nivel_actual || 1]}
                      </span>
                    </td>
                    <td style={{ ...estilos.td, fontWeight: "800", color: textColor }}>
                      {/* 🔥 AHORA ES SOBRE 27 🔥 */}
                      {est.totalEjercicios} / 27
                    </td>
                    <td style={{ ...estilos.td, fontWeight: "800", color: "#ef4444" }}>
                      {/* 🔥 MUESTRA LOS ERRORES 🔥 */}
                      {est.errores_totales || 0}
                    </td>
                    <td style={{ ...estilos.td, color: est.puntaje_test !== null ? "#10b981" : colorTextoSec, fontWeight: est.puntaje_test !== null ? "800" : "600", fontSize: "15px" }}>
                      {est.puntaje_test !== null ? `${est.puntaje_test} pts` : "Sin evaluar"}
                    </td>
                    <td style={{ ...estilos.td, fontFamily: "monospace", color: colorTextoSec, fontSize: "14px", fontWeight: "600" }}>
                      ⏱️ {formatoTiempo(est.tiempo_uso_segundos)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const estilos = {
  th: { padding: "16px 20px", fontWeight: "800", fontSize: "13px", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.5px" },
  td: { padding: "16px 20px", fontSize: "15px", verticalAlign: "middle" },
  
  // Colores traslúcidos para los badges que se ven perfectos en ambos modos
  badgeL1: { backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#10b981", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" },
  badgeL2: { backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#3b82f6", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" },
  badgeL3: { backgroundColor: "rgba(139, 92, 246, 0.2)", color: "#8b5cf6", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: "700" }
};

export default Ranking;