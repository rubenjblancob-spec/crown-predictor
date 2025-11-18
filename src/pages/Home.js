import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const navigate = useNavigate();

  // Usar useMemo para memoizar la fecha y evitar recrearla en cada render
  const eventDate = useMemo(() => new Date('2025-11-15T19:00:00'), []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = eventDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / (1000 * 60)) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [eventDate]);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/registro');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-gradient-to-br from-gray-900 to-black relative">
      {/* Botones de acceso en esquina superior derecha */}
      <div className="absolute top-6 right-6 flex gap-4">
        <button
          onClick={handleLogin}
          className="bg-transparent border border-fuchsia-500 text-fuchsia-400 hover:bg-fuchsia-500 hover:text-white font-bold py-2 px-6 rounded-full transition duration-300"
        >
          Iniciar Sesión
        </button>
        <button
          onClick={handleRegister}
          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-2 px-6 rounded-full transition duration-300"
        >
          Registrarse
        </button>
      </div>

      {/* Contenido principal */}
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl font-bold text-fuchsia-400 mb-8 drop-shadow-lg">
          👑 Crown Predictor
        </h1>
        
        <p className="text-xl text-gray-300 mb-8 max-w-md mx-auto">
          Predice los resultados y demuestra que eres el mejor adivino del evento
        </p>

        <div className="bg-black/40 backdrop-blur-sm p-8 rounded-2xl border border-fuchsia-500/30 mb-8">
          <h2 className="text-2xl font-semibold text-fuchsia-300 mb-4">
            ⏳ El show comienza en:
          </h2>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white bg-fuchsia-600/20 rounded-lg py-4">
                {timeLeft.days.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400 mt-2">Días</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white bg-fuchsia-600/20 rounded-lg py-4">
                {timeLeft.hours.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400 mt-2">Horas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white bg-fuchsia-600/20 rounded-lg py-4">
                {timeLeft.minutes.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400 mt-2">Minutos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white bg-fuchsia-600/20 rounded-lg py-4">
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-400 mt-2">Segundos</div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="text-gray-400 text-sm space-y-2 mt-6">
          <p>✨ Predice los resultados y compite con otros participantes</p>
          <p>🏆 Gana puntos y sube en el ranking</p>
          <p>👑 Demuestra que tienes el toque real</p>
          <p className="text-fuchsia-400 font-medium mt-4">
            Inicia sesión o regístrate para comenzar a predecir
          </p>
        </div>
      </div>
    </div>
  );
}