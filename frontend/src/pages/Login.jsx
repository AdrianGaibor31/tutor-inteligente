import { useState } from "react";
import { supabase } from "../supabase";

function Login() {
  const [vista, setVista] = useState("login"); // 'login' | 'registro' | 'recuperar'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState(""); 
  const [nombre, setNombre] = useState(""); // 👈 ESTADO RECUPERADO PARA EL NOMBRE
  const [errorMensaje, setErrorMensaje] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [cargando, setCargando] = useState(false);
  
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  // 🛡️ LÓGICA DEL MEDIDOR DE CONTRASEÑA
  const evaluarPassword = (pass) => {
    if (!pass) return { ancho: "0%", color: "transparent", texto: "" };
    
    const cumpleRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pass);
    
    if (cumpleRegex) return { ancho: "100%", color: "#10b981", texto: "Segura (Fuerte)" };
    if (pass.length >= 8) return { ancho: "66%", color: "#f59e0b", texto: "Intermedia (Faltan requisitos)" };
    return { ancho: "33%", color: "#ef4444", texto: "Insegura (Débil)" };
  };

  const fortaleza = evaluarPassword(password);

  // 🚀 MANEJO DE FORMULARIO
  const manejarSubmit = async (e) => {
    e.preventDefault();
    setErrorMensaje("");
    setMensajeExito("");
    setCargando(true);

    // 1. VISTA DE RECUPERAR CONTRASEÑA
    if (vista === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin, 
      });
      if (error) {
        setErrorMensaje("Error: " + error.message);
      } else {
        setMensajeExito("¡Listo! Te enviamos un correo con un enlace para restablecer tu contraseña.");
        setEmail(""); 
      }
      setCargando(false);
      return;
    }

// 2. VISTA DE REGISTRO
    if (vista === "registro") {
      if (!nombre) {
        setErrorMensaje("El nombre es obligatorio para registrarse.");
        setCargando(false); return;
      }
      if (fortaleza.ancho !== "100%") {
        setErrorMensaje("La contraseña debe ser Segura. Cumple con los requisitos indicados.");
        setCargando(false); return;
      }
      if (password !== confirmarPassword) {
        setErrorMensaje("Las contraseñas no coinciden. Por favor, verifica.");
        setCargando(false); return;
      }

      // 🚀 Registramos enviando el nombre en los metadatos de Supabase Auth
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { nombre: nombre } // El trigger de SQL leerá esto automáticamente
        }
      });
      
      if (error) {
        setErrorMensaje(error.message);
      } else {
        setMensajeExito("¡Registro casi listo! Te hemos enviado un correo de confirmación. Haz clic en el enlace para poder ingresar.");
        
        // 🧹 Limpiamos el formulario
        setNombre("");
        setEmail("");
        setPassword("");
        setConfirmarPassword("");
        setVista("login"); 
      }
      setCargando(false);
      return;
    }

    // 3. VISTA DE LOGIN NORMAL
    if (vista === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setErrorMensaje("Debes confirmar tu correo electrónico antes de ingresar. Revisa tu bandeja de entrada o spam.");
        } else {
          setErrorMensaje("Correo o contraseña incorrectos.");
        }
      } else {
        window.location.reload(); 
      }
    }
    setCargando(false);
  };

  return (
    <div style={{
      ...estilos.contenedorPrincipal,
      backgroundImage: "url('/fondo-istq.jpg')", 
    }}>
      <div style={estilos.capaOscura}>
        <div style={estilos.cajaLogin}>
          
          <div style={estilos.headerInstitucional}>
            <img src="/logo-istq.png" alt="Logo Instituto Superior Tecnológico Quito" style={estilos.imagenLogo} />
            <p style={estilos.subtituloLogo}>Plataforma TutorIA</p>
          </div>

          <form onSubmit={manejarSubmit} style={estilos.formulario}>
            <h2 style={{ color: "#1e293b", marginBottom: "24px", textAlign: "center", fontSize: "22px" }}>
              {vista === "registro" ? "Crear Nueva Cuenta" : vista === "recuperar" ? "Recuperar Contraseña" : "Portal de Estudiantes"}
            </h2>

            {errorMensaje && <div style={estilos.alertaError}>{errorMensaje}</div>}
            {mensajeExito && <div style={estilos.alertaExito}>{mensajeExito}</div>}

            {vista === "recuperar" && (
              <p style={{ color: "#475569", fontSize: "14px", marginBottom: "20px", textAlign: "center" }}>
                Ingresa el correo con el que te registraste y te enviaremos las instrucciones.
              </p>
            )}

            {/* 📝 CAMPO DE NOMBRE REINCORPORADO */}
            {vista === "registro" && (
              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Nombre Completo</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  style={estilos.input} 
                  placeholder="Ej. Adrián Gaibor" 
                  required
                />
              </div>
            )}

            <div style={estilos.grupoInput}>
              <label style={estilos.label}>Correo Institucional</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={estilos.input} placeholder="estudiante@itq.edu.ec" required />
            </div>

            {vista !== "recuperar" && (
              <div style={estilos.grupoInput}>
                <div style={{display: "flex", justifyContent: "space-between"}}>
                  <label style={estilos.label}>Contraseña</label>
                  {vista === "login" && (
                    <button type="button" onClick={() => {setVista("recuperar"); setErrorMensaje(""); setMensajeExito("");}} style={estilos.enlaceOlvide}>
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                
                <div style={{ position: "relative" }}>
                  <input 
                    type={mostrarPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    style={{...estilos.input, paddingRight: "40px"}} 
                    placeholder="••••••••" 
                    required 
                  />
                  <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} style={estilos.botonOjo} title={mostrarPassword ? "Ocultar contraseña" : "Ver contraseña"}>
                    {mostrarPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                
                {vista === "registro" && (
                  <div style={{marginTop: "8px"}}>
                    <div style={{ height: "6px", backgroundColor: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ width: fortaleza.ancho, backgroundColor: fortaleza.color, height: "100%", transition: "all 0.3s ease" }}></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                      <p style={{ fontSize: "12px", color: fortaleza.color, margin: 0, fontWeight: "bold" }}>
                        {fortaleza.texto}
                      </p>
                      <p style={{ fontSize: "11px", color: "#94a3b8", margin: 0 }}>
                        (Min 8, 1 Mayúscula, 1 Núm, 1 Símbolo)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {vista === "registro" && (
              <div style={estilos.grupoInput}>
                <label style={estilos.label}>Confirmar Contraseña</label>
                <div style={{ position: "relative" }}>
                  <input 
                    type={mostrarConfirmar ? "text" : "password"} 
                    value={confirmarPassword} 
                    onChange={(e) => setConfirmarPassword(e.target.value)} 
                    style={{...estilos.input, paddingRight: "40px"}} 
                    placeholder="••••••••" 
                    required 
                  />
                  <button type="button" onClick={() => setMostrarConfirmar(!mostrarConfirmar)} style={estilos.botonOjo} title={mostrarConfirmar ? "Ocultar contraseña" : "Ver contraseña"}>
                    {mostrarConfirmar ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" disabled={cargando} style={estilos.botonPrincipal}>
              {cargando ? "Procesando..." : vista === "registro" ? "Registrarse en Plataforma" : vista === "recuperar" ? "Enviar Enlace" : "Iniciar Sesión"}
            </button>
          </form>

          <div style={estilos.footerAlternar}>
            {vista === "recuperar" ? (
              <button type="button" onClick={() => { setVista("login"); setErrorMensaje(""); setMensajeExito(""); }} style={estilos.botonSecundario}>
                ⬅️ Volver al Inicio de Sesión
              </button>
            ) : (
              <>
                <p style={{ color: "#475569", margin: "0 0 10px 0", fontSize: "14px" }}>
                  {vista === "registro" ? "¿Ya confirmaste tu cuenta?" : "¿Eres estudiante de nuevo ingreso?"}
                </p>
                <button onClick={() => { 
                  setVista(vista === "registro" ? "login" : "registro"); 
                  setErrorMensaje(""); 
                  setMensajeExito(""); 
                  setPassword(""); 
                  setConfirmarPassword("");
                  setNombre("");
                }} style={estilos.botonSecundario}>
                  {vista === "registro" ? "Ingresa a tu cuenta aquí" : "Regístrate en TutorIA"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const estilos = {
  contenedorPrincipal: { minHeight: "100vh", fontFamily: "system-ui, sans-serif", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" },
  capaOscura: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "rgba(0, 0, 0, 0.75)", padding: "20px" },
  cajaLogin: { backgroundColor: "white", width: "100%", maxWidth: "420px", borderRadius: "12px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)", overflow: "hidden" },
  headerInstitucional: { backgroundColor: "white", padding: "30px 20px 20px 20px", textAlign: "center", borderBottom: "4px solid #cc0000" }, 
  imagenLogo: { width: "140px", height: "auto", marginBottom: "10px", borderRadius: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" },
  subtituloLogo: { margin: "8px 0 0 0", color: "#64748b", fontSize: "13px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "2px" },
  formulario: { padding: "30px" },
  alertaError: { backgroundColor: "#fff1f2", color: "#e11d48", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", borderLeft: "4px solid #e11d48" },
  alertaExito: { backgroundColor: "#ecfdf5", color: "#047857", padding: "12px", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", borderLeft: "4px solid #10b981" },
  grupoInput: { marginBottom: "20px" },
  label: { display: "block", color: "#334155", fontWeight: "700", fontSize: "14px", marginBottom: "8px" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "15px", boxSizing: "border-box", transition: "border-color 0.2s" },
  botonOjo: { position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "18px", opacity: "0.6", transition: "opacity 0.2s" },
  enlaceOlvide: { backgroundColor: "transparent", border: "none", color: "#cc0000", fontSize: "13px", fontWeight: "600", cursor: "pointer", padding: 0, textDecoration: "underline" },
  botonPrincipal: { width: "100%", padding: "14px", backgroundColor: "#cc0000", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", transition: "background-color 0.2s" },
  footerAlternar: { backgroundColor: "#f8fafc", padding: "24px 20px", textAlign: "center", borderTop: "1px solid #e2e8f0" },
  botonSecundario: { backgroundColor: "transparent", color: "#cc0000", border: "none", fontWeight: "800", cursor: "pointer", textDecoration: "underline", fontSize: "15px" }
};

export default Login;