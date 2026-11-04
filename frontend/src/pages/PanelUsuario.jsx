import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';

export default function PanelUsuario() {
  const [lenguaje, setLenguaje] = useState('python');
  const [mensajes, setMensajes] = useState([]);
  const [inputMensaje, setInputMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState({ python: 0, java: 0, pseint: 0 });
  const chatFinRef = useRef(null);

  // Calcular porcentaje global de avance para desbloquear el Test Final
  const totalRetos = progreso.python + progreso.java + progreso.pseint;
  const porcentajeGlobal = Math.min(Math.round((totalRetos / 9) * 100), 100);
  const testDesbloqueado = totalRetos >= 9;

  // Auto-scroll en el chat
  useEffect(() => {
    chatFinRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Consumir el streaming en tiempo real desde el backend
  const enviarMensaje = async (e) => {
    e?.preventDefault();
    if (!inputMensaje.trim() || cargando) return;

    const textoUsuario = inputMensaje;
    setInputMensaje('');
    
    // Agregar mensaje del usuario al chat
    setMensajes((prev) => [...prev, { rol: 'usuario', texto: textoUsuario }]);
    setCargando(true);

    try {
      // Agregar burbuja vacía para la IA
      setMensajes((prev) => [...prev, { rol: 'tutor', texto: '' }]);

      const respuesta = await fetch('http://localhost:8000/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: textoUsuario, lenguaje: lenguaje })
      });

      const lector = respuesta.body.getReader();
      const decodificador = new TextDecoder();
      let acumulado = '';

      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        acumulado += decodificador.decode(value, { stream: true });
        
        // Actualizar el último mensaje con el texto que llega en vivo
        setMensajes((prev) => {
          const actualizados = [...prev];
          actualizados[actualizados.length - 1] = { rol: 'tutor', texto: acumulado };
          return actualizados;
        });
      }
    } catch (err) {
      console.error("Error al conectar con TutorIA:", err);
      setMensajes((prev) => [
        ...prev,
        { rol: 'tutor', texto: "Disculpa, hubo una intermitencia de red. Por favor intenta enviar tu código nuevamente." }
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Barra Lateral Institucional ITQ */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              ITQ
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">TutorIA 2.0</h1>
              <p className="text-xs text-slate-400">Plataforma Adaptativa</p>
            </div>
          </div>

          {/* Selector de Lenguaje */}
          <div className="mb-6">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
              Entorno Activo
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['python', 'java', 'pseint'].map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLenguaje(lang)}
                  className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-all ${
                    lenguaje === lang 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Tarjeta de Progreso Unificado */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-6">
            <div className="flex justify-between items-center text-xs mb-2">
              <span className="font-medium text-slate-300">Ruta de Retos</span>
              <span className="font-bold text-blue-400">{porcentajeGlobal}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500 rounded-full"
                style={{ width: `${porcentajeGlobal}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {totalRetos}/9 retos completados entre los 3 lenguajes.
            </p>
          </div>
        </div>

        {/* Botón Dinámico del Test Final */}
        <div>
          {testDesbloqueado ? (
            <a
              href="/test-final"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm transition-all animate-pulse"
            >
              🎓 Iniciar Test Final
            </a>
          ) : (
            <div className="w-full py-3 px-4 bg-slate-800/80 text-slate-500 font-medium rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-800">
              🔒 Test Final ({totalRetos}/9 retos)
            </div>
          )}
        </div>
      </aside>

      {/* Área Central del Chat */}
      <main className="flex-1 flex flex-col bg-slate-950">
        <header className="h-16 border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-sm font-semibold capitalize text-slate-200">
              Tutor Socrático — {lenguaje}
            </span>
          </div>
        </header>

        {/* Mensajes del Chat */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                  m.rol === 'usuario'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                }`}
              >
                {m.texto ? (
                  <p className="whitespace-pre-wrap">{m.texto}</p>
                ) : (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-100"></span>
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-200"></span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={chatFinRef} />
        </div>

        {/* Input de Enviar Código / Duda */}
        <form onSubmit={enviarMensaje} className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={inputMensaje}
              onChange={(e) => setInputMensaje(e.target.value)}
              placeholder={`Escribe tu duda o solución en ${lenguaje}...`}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-slate-100 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={cargando}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-medium text-sm transition-all shadow-md shadow-blue-500/20"
            >
              Enviar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}