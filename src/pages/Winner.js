import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function Winner() {
  const [candidatesByPhase, setCandidatesByPhase] = useState({
    top30: [],
    top12: [],
    top5: [],
    finalistas: []
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activePhase, setActivePhase] = useState('todas');
  const [hoveredCandidate, setHoveredCandidate] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Obtener candidatas por fase en tiempo real
  useEffect(() => {
    const phases = ['top30', 'top12', 'top5', 'finalistas'];
    const unsubscribes = [];

    phases.forEach(phase => {
      const q = query(
        collection(db, 'candidates'),
        where('phase', '==', phase),
        orderBy('order', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const candidates = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setCandidatesByPhase(prev => ({
          ...prev,
          [phase]: candidates
        }));
      });

      unsubscribes.push(unsubscribe);
    });

    setLoading(false);

    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, []);

  // Información de cada fase
  const getPhaseInfo = (phase) => {
    const phases = {
      top30: {
        title: 'TOP 30',
        subtitle: 'Primera Selección',
        color: 'from-purple-600 to-fuchsia-600',
        accentColor: 'bg-purple-500',
        icon: '🌸',
        gradient: 'bg-gradient-to-br from-purple-500/20 to-fuchsia-600/10',
        border: 'border-l-4 border-purple-400',
        order: 1
      },
      top12: {
        title: 'TOP 12',
        subtitle: 'Semifinalistas',
        color: 'from-fuchsia-600 to-rose-600',
        accentColor: 'bg-fuchsia-500',
        icon: '💫',
        gradient: 'bg-gradient-to-br from-fuchsia-500/20 to-rose-600/10',
        border: 'border-l-4 border-fuchsia-400',
        order: 2
      },
      top5: {
        title: 'TOP 5',
        subtitle: 'Finalistas',
        color: 'from-rose-600 to-red-500',
        accentColor: 'bg-rose-500',
        icon: '👑',
        gradient: 'bg-gradient-to-br from-rose-500/20 to-red-500/10',
        border: 'border-l-4 border-rose-400',
        order: 3
      },
      finalistas: {
        title: 'CORONACIÓN',
        subtitle: 'Miss Universo 2025',
        color: 'from-amber-500 to-orange-500',
        accentColor: 'bg-amber-400',
        icon: '🏆',
        gradient: 'bg-gradient-to-br from-amber-400/20 to-orange-500/10',
        border: 'border-l-4 border-amber-300',
        order: 4
      }
    };
    return phases[phase] || phases.top30;
  };

  // Obtener Miss Universo
  const getMissUniverso = () => {
    return candidatesByPhase.finalistas.find(candidate => 
      candidate.position === 'missUniverso'
    );
  };

  // Tarjeta de candidata con diseño moderno
  const CandidateCard = ({ candidate, phase, index }) => {
    const phaseInfo = getPhaseInfo(phase);
    const isMissUniverso = candidate.position === 'missUniverso';
    const isFinalista = candidate.position && candidate.position !== 'missUniverso';
    const isHovered = hoveredCandidate === candidate.id;

    return (
      <div 
        className={`
          relative cursor-pointer transition-all duration-300
          ${isHovered ? 'transform scale-105' : 'transform scale-100'}
        `}
        onMouseEnter={() => setHoveredCandidate(candidate.id)}
        onMouseLeave={() => setHoveredCandidate(null)}
      >
        {/* Contenido principal */}
        <div className={`
          relative rounded-xl p-4 transition-all duration-300
          ${phaseInfo.gradient}
          border border-white/10
          ${isHovered ? 'shadow-xl' : 'shadow-lg'}
          ${isMissUniverso ? 'bg-gradient-to-br from-amber-400/30 to-orange-500/20' : ''}
        `}>
          
          {/* Badge de posición */}
          {(isMissUniverso || isFinalista) && (
            <div className={`
              absolute -top-2 -right-2 px-3 py-1 rounded-full 
              text-xs font-bold z-30 border border-white/20
              ${isMissUniverso ? 'bg-amber-500/90 text-amber-50' : 
                'bg-white/20 text-white'
              }
            `}>
              {isMissUniverso ? '👑 REINA' : 
               candidate.position === 'primera' ? '🥈 1°' :
               candidate.position === 'segunda' ? '🥉 2°' :
               candidate.position === 'tercera' ? '3°' : '4°'}
            </div>
          )}

          {/* Foto */}
          <div className="relative mb-3">
            <img 
              src={candidate.photo} 
              alt={candidate.name}
              className={`
                w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover mx-auto 
                border-2 transition-all duration-300
                ${isMissUniverso ? 'border-amber-300' : 'border-white/30'}
                ${isHovered ? 'scale-110' : ''}
              `}
            />
          </div>

          {/* Información textual */}
          <div className="text-center space-y-1">
            <h3 className={`
              font-bold text-sm transition-all duration-300
              ${isMissUniverso ? 'text-amber-100' : 'text-white'}
            `}>
              {candidate.name}
            </h3>
            <p className={`
              text-xs font-light
              ${isMissUniverso ? 'text-amber-200' : 'text-white/70'}
            `}>
              {candidate.country}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Grid de fase
  const PhaseGrid = ({ phase, candidates, zIndex }) => {
    const phaseInfo = getPhaseInfo(phase);
    const isActive = activePhase === 'todas' || activePhase === phase;

    if (!isActive || candidates.length === 0) return null;

    return (
      <div 
        className={`transition-all duration-500 transform ${
          isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
        style={{ zIndex }}
      >
        {/* Header de fase */}
        <div className="text-center mb-6">
          <div className={`
            inline-flex items-center space-x-3
            px-6 py-3 rounded-xl border border-white/20 
            shadow-lg mb-3
            ${phaseInfo.gradient}
          `}>
            <span className="text-xl">{phaseInfo.icon}</span>
            <div className="text-left">
              <h2 className="text-lg font-bold text-white">
                {phaseInfo.title}
              </h2>
              <p className="text-white/70 text-sm">{phaseInfo.subtitle}</p>
            </div>
            <div className={`
              px-2 py-1 rounded-lg text-xs font-bold
              bg-white/20 text-white
            `}>
              {candidates.length}
            </div>
          </div>
        </div>

        {/* Grid de candidatas */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4">
          {candidates.map((candidate, index) => (
            <CandidateCard 
              key={candidate.id} 
              candidate={candidate} 
              phase={phase}
              index={index}
            />
          ))}
        </div>

        {/* Separador */}
        <div className="flex items-center justify-center my-6">
          <div className={`h-px bg-gradient-to-r from-transparent via-${phaseInfo.color.split('-')[1]}-400/50 to-transparent flex-1`}></div>
          <div className={`w-2 h-2 rounded-full mx-3 ${phaseInfo.accentColor}`}></div>
          <div className={`h-px bg-gradient-to-r from-transparent via-${phaseInfo.color.split('-')[1]}-400/50 to-transparent flex-1`}></div>
        </div>
      </div>
    );
  };

  // Vista de coronación
  const MissUniversoView = () => {
    const missUniverso = getMissUniverso();
    
    if (!missUniverso) return null;

    return (
      <div className="relative mb-8 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 via-rose-500/5 to-orange-500/10"></div>
        
        <div className="relative backdrop-blur-lg border border-white/10 rounded-2xl p-6 sm:p-8">
          <div className="relative z-10 text-center">
            {/* Corona */}
            <div className="mb-4">
              <span className="text-4xl">💎</span>
            </div>
            
            {/* Título principal */}
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-300 via-rose-400 to-orange-400 bg-clip-text text-transparent mb-3">
              MISS UNIVERSO 2025
            </h1>
            
            {/* Foto de la reina */}
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 to-rose-500/30 rounded-xl transform rotate-6 scale-105"></div>
              <img 
                src={missUniverso.photo} 
                alt={missUniverso.name}
                className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover border-4 border-amber-300/50 shadow-lg z-10"
              />
            </div>
            
            {/* Información de la ganadora */}
            <h2 className="text-xl sm:text-2xl font-light text-white mb-2">
              {missUniverso.name}
            </h2>
            <p className="text-amber-300 text-lg font-medium mb-4">
              {missUniverso.country}
            </p>
            
            {/* Badge de honor */}
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 backdrop-blur-sm px-3 py-2 rounded-lg border border-amber-400/30">
              <span className="text-amber-300 text-sm">🏆 Reina Coronada</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Navbar consistente con Predict.js
  const Navbar = () => (
    <nav className="bg-black/80 backdrop-blur-sm border-b border-fuchsia-500/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/predict')}>
            <span className="text-2xl">👑</span>
            <span className="ml-2 text-xl font-bold text-fuchsia-400">Crown Predictor</span>
          </div>

          <div className="hidden md:flex space-x-4">
            <button onClick={() => navigate('/predict')} className={`px-3 py-2 rounded-lg transition-all ${location.pathname === '/predict' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'}`}>🎯 Predecir</button>
            <button onClick={() => navigate('/ranking')} className={`px-3 py-2 rounded-lg transition-all ${location.pathname === '/ranking' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'}`}>🏆 Ranking</button>
            <button onClick={() => navigate('/winner')} className={`px-3 py-2 rounded-lg transition-all ${location.pathname === '/winner' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'}`}>👑 Ganadoras</button>
            <button onClick={() => navigate('/final')} className={`px-3 py-2 rounded-lg transition-all ${location.pathname === '/final' ? 'bg-fuchsia-600 text-white' : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'}`}>⭐ Final</button>
          </div>

          <div className="flex items-center space-x-4">
            {user && <span className="text-gray-300 hidden sm:block">Hola, {user.email?.split('@')[0]}</span>}
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200">Cerrar Sesión</button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Filtros
  const Filters = () => {
    const hasTop30 = candidatesByPhase.top30.length > 0;
    const hasTop12 = candidatesByPhase.top12.length > 0;
    const hasTop5 = candidatesByPhase.top5.length > 0;
    const hasFinalistas = candidatesByPhase.finalistas.length > 0;

    return (
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <button
          onClick={() => setActivePhase('todas')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activePhase === 'todas' 
              ? 'bg-fuchsia-600 text-white' 
              : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'
          }`}
        >
          👁️ Vista Completa
        </button>
        
        {[
          { phase: 'top30', condition: hasTop30, icon: '🌸' },
          { phase: 'top12', condition: hasTop12, icon: '💫' },
          { phase: 'top5', condition: hasTop5, icon: '👑' },
          { phase: 'finalistas', condition: hasFinalistas, icon: '🏆' }
        ].map(({ phase, condition, icon }) => 
          condition && (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`px-4 py-2 rounded-lg transition-all ${
                activePhase === phase 
                  ? 'bg-fuchsia-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'
              }`}
            >
              {icon} {getPhaseInfo(phase).title}
            </button>
          )
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">💎</div>
          <div className="text-white text-xl">Cargando...</div>
        </div>
      </div>
    );
  }

  const missUniverso = getMissUniverso();
  const hasFinalistas = candidatesByPhase.finalistas.length > 0;
  const hasTop5 = candidatesByPhase.top5.length > 0;
  const hasTop12 = candidatesByPhase.top12.length > 0;
  const hasTop30 = candidatesByPhase.top30.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <Navbar />
      
      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-fuchsia-400 mb-2">
            Ganadoras y Clasificadas
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto">
            Todas las candidatas que han destacado en esta edición de Miss Universo
          </p>
        </div>

        <Filters />

        {/* Coronación destacada */}
        {missUniverso && <MissUniversoView />}

        {/* Fases */}
        <div className="relative space-y-8">
          {[
            { phase: 'finalistas', condition: hasFinalistas, zIndex: 40 },
            { phase: 'top5', condition: hasTop5, zIndex: 30 },
            { phase: 'top12', condition: hasTop12, zIndex: 20 },
            { phase: 'top30', condition: hasTop30, zIndex: 10 }
          ].map(({ phase, condition, zIndex }) => 
            condition && (
              <PhaseGrid 
                key={phase}
                phase={phase} 
                candidates={candidatesByPhase[phase]}
                zIndex={zIndex}
              />
            )
          )}

          {/* Estado vacío */}
          {!hasTop30 && !hasTop12 && !hasTop5 && !hasFinalistas && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 opacity-50">👑</div>
              <h3 className="text-xl text-gray-300 mb-2">No hay candidatas aún</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Pronto verás a las candidatas que han destacado en la competencia
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-500 text-sm">
            <span>✨</span>
            <span>Miss Universo 2025</span>
            <span>✨</span>
          </div>
        </div>
      </div>
    </div>
  );
}