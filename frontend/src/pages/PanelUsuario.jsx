import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import TestFinal from './TestFinal';
import ModulosAprendizaje from './ModulosAprendizaje';
import Ranking from './Ranking';
import '../App.css';

export default function PanelUsuario({ session }) {
  const [perfil, setPerfil] = useState(null);
  const [lenguaje, setLenguaje] = useState('python');
  const [vista, setVista] = useState('chat'); // 'chat' | 'modulos' | 'ranking' | 'test-final'
  const [mensajes, setMensajes] = useState([]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [modoOscuro, setModoOscuro] = useState(true);

  // 1. Cargar perfil del estudiante desde Supabase
  const cargarPerfil = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setPerfil(data);
        }
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err);
    }
  };

  useEffect(() => {
    cargarPerfil();
  }, [session]);

  // 2. Validación de los 3 retos de cada lenguaje
  const retosPython = ((perfil?.python_e1 ? 1 : 0) + (perfil?.python_e2 ? 1 : 0) + (perfil?.python_e3 ? 1 : 0));
  const retosJava = ((perfil?.java_e1 ? 1 : 0) + (perfil?.java_e2 ? 1 : 0) + (perfil?.java_e3 ? 1 : 0));
  const retosPseint = ((perfil?.pseint_e1 ? 1 : 0) + (perfil?.pseint_e2 ? 1 : 0) + (perfil?.pseint_e3 ? 1 : 0));
  const totalRetos = retosPython + retosJava + retosPseint;

  // Se activa si completó los 3 retos de cada lenguaje (total 9) o si su nivel es >= 3
  const testDesbloqueado = totalRetos >= 9 || (perfil?.nivel_actual >= 3);

  // 3. Enviar mensaje al TutorIA
  const enviarMensaje = async (e) => {
    e?.preventDefault();
    if (!inputMensaje.trim() || cargando) return;

    const textoUsuario = inputMensaje;
    setInputMensaje('');
    setMensajes((prev) => [...prev, { rol: 'usuario', texto: textoUsuario }]);
    setCargando(true);

    try {
      // Simulación de respuesta socrática o llamada a tu backend
      setTimeout(() => {
        setMensajes((prev) => [
          ...prev,
          {
            rol: 'tutor',
            texto: `🤖 TutorIA (${lenguaje.toUpperCase()}): ¡Buen intento! Analicemos la lógica paso a paso. ¿Qué resultado esperas obtener con esa instrucción?`
          }
        ]);
        setCargando(false);
      }, 1000);
    } catch (err) {
      console.error(err);
      setCargando(false);
    }
  };

  const cerrarSesion = async () => {
    if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  return (
    <div className={`app-container ${modoOscuro ? 'dark-mode' : 'light-mode'}`} style={{ display: 'flex', minHeight: '100vh' }}>
      {/* BARRA LATERAL (Sidebar) */}
      <aside className="sidebar" style={{ width: '280px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Encabezado ITQ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '36px', height: '36px', background: '#e11d48', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
              ITQ
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>TutorIA</h2>
              <span style={{ fontSize: '11px', background: '#e11d48', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>
                Estudiante ITQ
              </span>
            </div>
          </div>

          {/* Selector de Tema */}
          <button 
            onClick={() => setModoOscuro(!modoOscuro)}
            style={{ marginBottom: '15px', background: 'transparent', border: '1px solid #475569', color: 'inherit', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', width: '100%' }}
          >
            {modoOscuro ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>

          {/* Menú de Navegación */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            <button 
              onClick={() => setVista('chat')} 
              className={`nav-btn ${vista === 'chat' ? 'active' : ''}`}
              style={{ padding: '10px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', background: vista === 'chat' ? '#e11d48' : 'transparent', color: 'inherit', border: 'none' }}
            >
              💬 Chat del Tutor
            </button>
            <button 
              onClick={() => setVista('modulos')} 
              className={`nav-btn ${vista === 'modulos' ? 'active' : ''}`}
              style={{ padding: '10px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', background: vista === 'modulos' ? '#e11d48' : 'transparent', color: 'inherit', border: 'none' }}
            >
              📚 Módulos Guiados
            </button>
            <button 
              onClick={() => setVista('ranking')} 
              className={`nav-btn ${vista === 'ranking' ? 'active' : ''}`}
              style={{ padding: '10px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', background: vista === 'ranking' ? '#e11d48' : 'transparent', color: 'inherit', border: 'none' }}
            >
              🏅 Ranking
            </button>
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLSeDLKW2oTiv_HMyP0PueO6QwdTsTPEPPQqXdi0fWKwOq8GRgg/viewform"
              target="_blank"
              rel="noreferrer"
              style={{ padding: '10px', borderRadius: '8px', textAlign: 'left', textDecoration: 'none', color: 'inherit', display: 'block' }}
            >
              ⭐ Evaluar Plataforma
            </a>
          </nav>

          {/* Explorador Global de Progreso */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#94a3b8' }}>
              🟣 {perfil?.nivel_actual >= 3 ? 'Programador Global' : 'Estudiante en Formación'}
            </div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>🐍 Python</span> <span>{retosPython}/3 {retosPython >= 3 ? '✅' : '⏳'}</span>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>☕ Java</span> <span>{retosJava}/3 {retosJava >= 3 ? '✅' : '⏳'}</span>
            </div>
            <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>📝 PSeInt</span> <span>{retosPseint}/3 {retosPseint >= 3 ? '✅' : '⏳'}</span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
              Total Errores: {perfil?.errores_totales || 0}
            </div>
          </div>

          {/* BOTÓN DINÁMICO DEL TEST FINAL */}
          <div style={{ marginTop: '10px' }}>
            {testDesbloqueado ? (
              <button
                onClick={() => setVista('test-final')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: 'white',
                  background: perfil?.puntaje_test !== null ? '#10b981' : '#e11d48',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
                  transition: 'all 0.2s ease'
                }}
              >
                {perfil?.puntaje_test !== null 
                  ? `🎓 Test Rendido: ${perfil.puntaje_test}/10 pts` 
                  : `🎯 Iniciar Test Final`
                }
              </button>
            ) : (
              <div style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#64748b',
                background: 'rgba(255,255,255,0.05)',
                border: '1px dashed #475569'
              }}>
                🔒 Test Final ({totalRetos}/9 retos)
              </div>
            )}
          </div>
        </div>

        {/* Usuario y Cerrar Sesión */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '15px' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{perfil?.nombre || 'Estudiante'}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>{perfil?.email}</div>
          <button 
            onClick={cerrarSesion}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL CONTENIDO DINÁMICO */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {vista === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Cabecera del Chat */}
            <header style={{ padding: '15px 25px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontWeight: 'bold' }}>Entorno de {lenguaje.toUpperCase()}</span>
                <select 
                  value={lenguaje} 
                  onChange={(e) => setLenguaje(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '6px', background: '#1e293b', color: 'white', border: '1px solid #475569' }}
                >
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="pseint">PSeInt</option>
                </select>
              </div>
              <button 
                onClick={() => setInputMensaje(`Quiero resolver el siguiente reto de ${lenguaje}`)}
                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                🎯 Pedir Nuevo Reto
              </button>
            </header>

            {/* Mensajes del Chat */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {mensajes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '60px' }}>
                  <h3>👋 ¡Hola, {perfil?.nombre || 'Estudiante'}!</h3>
                  <p>Soy TutorIA. Pregúntame sobre sintaxis, lógica o solicita un nuevo reto en {lenguaje.toUpperCase()}.</p>
                </div>
              ) : (
                mensajes.map((m, idx) => (
                  <div key={idx} style={{ alignSelf: m.rol === 'usuario' ? 'flex-end' : 'flex-start', maxWidth: '75%', padding: '12px 16px', borderRadius: '12px', background: m.rol === 'usuario' ? '#e11d48' : '#1e293b', color: 'white' }}>
                    {m.texto}
                  </div>
                ))
              )}
            </div>

            {/* Input de Código / Pregunta */}
            <form onSubmit={enviarMensaje} style={{ padding: '15px 25px', borderTop: '1px solid #334155', display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={inputMensaje} 
                onChange={(e) => setInputMensaje(e.target.value)}
                placeholder={`Escribe tu código o duda sobre ${lenguaje}...`}
                style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
              />
              <button type="submit" style={{ padding: '12px 24px', background: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                Enviar
              </button>
            </form>
          </div>
        )}

        {/* VISTA MÓDULOS GUIADOS */}
        {vista === 'modulos' && <ModulosAprendizaje lenguaje={lenguaje} />}

        {/* VISTA RANKING */}
        {vista === 'ranking' && <Ranking />}

        {/* VISTA TEST FINAL */}
        {vista === 'test-final' && (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <TestFinal onFinalizado={() => { cargarPerfil(); setVista('ranking'); }} />
          </div>
        )}
      </main>
    </div>
  );
}