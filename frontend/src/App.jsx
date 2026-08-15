import { useState, useEffect } from "react"
import { supabase } from "./supabase"
import Login from "./pages/Login"
import Onboarding from "./pages/Onboarding"
import PanelUsuario from "./pages/PanelUsuario"
import PanelAdmin from "./pages/PanelAdmin"

function App() {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const verificarSesion = async () => {
      // Intercepta el enlace de confirmación de correo de Supabase para forzar el paso por el Login
      const hash = window.location.hash
      if (hash && (hash.includes("type=signup") || hash.includes("type=email"))) {
        await supabase.auth.signOut()
        setPerfil(null)
        setCargando(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      if (data.session) {
        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single()
        setPerfil(perfilData || null)
      }
      setCargando(false)
    }

    verificarSesion()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const hash = window.location.hash
      if (hash && (hash.includes("type=signup") || hash.includes("type=email"))) {
        await supabase.auth.signOut()
        setPerfil(null)
        setCargando(false)
        return
      }

      if (session) {
        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
        setPerfil(perfilData || null)
      } else {
        setPerfil(null)
      }
      setCargando(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const actualizarPerfil = (perfilActualizado) => {
    setPerfil(perfilActualizado)
  }

  if (cargando) {
    return (
      <div style={estilos.cargando}>
        <p>⏳ Cargando TutorIA...</p>
      </div>
    )
  }

  if (!perfil) return <Login onLogin={setPerfil} />

  if (perfil.rol === "administrador") {
    return <PanelAdmin perfil={perfil} onCerrarSesion={cerrarSesion} />
  }

  if (!perfil.onboarding_completado) {
    return (
      <Onboarding
        perfil={perfil}
        onTerminar={() => actualizarPerfil({ ...perfil, onboarding_completado: true })}
      />
    )
  }

  return <PanelUsuario perfil={perfil} onCerrarSesion={cerrarSesion} />
}

const estilos = {
  cargando: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    color: "#4f46e5",
  }
}

export default App