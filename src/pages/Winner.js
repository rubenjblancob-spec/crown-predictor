import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  doc,
  getDoc 
} from 'firebase/firestore';
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
  const [userName, setUserName] = useState('');
  const [activePhase, setActivePhase] = useState('todas');
  const [hoveredCandidate, setHoveredCandidate] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener nombre del usuario desde Firestore
  const getUserName = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserName(userDoc.data().name);
      }
    } catch (error) {
      console.error('Error al obtener nombre de usuario:', error);
    }
  };

  // Verificar autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        getUserName(user.uid);
      }
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

  // Información de cada fase - adaptada al estilo minimalista
  const getPhaseInfo = (phase) => {
    const phases = {
      top30: {
        title: 'TOP 30',
        subtitle: 'Primera Selección',
        icon: '🔢',
        order: 1
      },
      top12: {
        title: 'TOP 12',
        subtitle: 'Semifinalistas',
        icon: '⭐',
        order: 2
      },
      top5: {
        title: 'TOP 5',
        subtitle: 'Finalistas',
        icon: '👑',
        order: 3
      },
      finalistas: {
        title: 'CORONACIÓN',
        subtitle: 'Miss Universo 2025',
        icon: '🏆',
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

  // Tarjeta de candidata con diseño minimalista
  const CandidateCard = ({ candidate, phase, index }) => {
    const isMissUniverso = candidate.position === 'missUniverso';
    const isFinalista = candidate.position && candidate.position !== 'missUniverso';
    const isHovered = hoveredCandidate === candidate.id;

    return (
      <div 
        className={`
          relative cursor-pointer transition-all duration-300
          ${isHovered ? 'transform scale-105' : ''}
        `}
        onMouseEnter={() => setHoveredCandidate(candidate.id)}
        onMouseLeave={() => setHoveredCandidate(null)}
      >
        {/* Contenido principal */}
        <div className={`
          relative rounded-lg p-3 transition-all duration-300
          bg-black/30 border border-gray-600
          ${isHovered ? 'border-fuchsia-400 shadow-lg' : 'hover:border-fuchsia-400'}
          ${isMissUniverso ? 'border-amber-400 bg-amber-500/10' : ''}
        `}>
          
          {/* Badge de posición */}
          {(isMissUniverso || isFinalista) && (
            <div className={`
              absolute -top-1 -right-1 px-2 py-0.5 rounded-full 
              text-xs font-bold z-30 border
              ${isMissUniverso ? 'bg-amber-500 border-amber-400 text-white' : 
                'bg-gray-700 border-gray-600 text-gray-300'
              }
            `}>
              {isMissUniverso ? '👑' : 
               candidate.position === 'primera' ? '🥈' :
               candidate.position === 'segunda' ? '🥉' :
               candidate.position === 'tercera' ? '3°' : '4°'}
            </div>
          )}

          {/* Foto */}
          <div className="relative mb-2">
            <img 
              src={candidate.photo} 
              alt={candidate.name}
              className={`
                w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover mx-auto 
                border transition-all duration-300
                ${isMissUniverso ? 'border-amber-300' : 'border-gray-500'}
                ${isHovered ? 'scale-110' : ''}
              `}
            />
          </div>

          {/* Información textual */}
          <div className="text-center space-y-1">
            <h3 className={`
              font-bold text-xs transition-all duration-300 truncate
              ${isMissUniverso ? 'text-amber-300' : 'text-white'}
            `}>
              {candidate.name}
            </h3>
            <p className={`
              text-xs font-light
              ${isMissUniverso ? 'text-amber-200' : 'text-gray-400'}
            `}>
              {candidate.country}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Grid de fase minimalista
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
        <div className="text-center mb-4">
          <div className={`
            inline-flex items-center space-x-2
            px-4 py-2 rounded-lg border border-fuchsia-500/30 
            bg-black/40 mb-2
          `}>
            <span className="text-base">{phaseInfo.icon}</span>
            <div className="text-left">
              <h2 className="text-base font-bold text-white">
                {phaseInfo.title}
              </h2>
              <p className="text-gray-400 text-xs">{phaseInfo.subtitle}</p>
            </div>
            <div className={`
              px-2 py-1 rounded text-xs font-bold
              bg-gray-700 text-gray-300
            `}>
              {candidates.length}
            </div>
          </div>
        </div>

        {/* Grid de candidatas */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3">
          {candidates.map((candidate, index) => (
            <CandidateCard 
              key={candidate.id} 
              candidate={candidate} 
              phase={phase}
              index={index}
            />
          ))}
        </div>

        {/* Separador sutil */}
        <div className="flex items-center justify-center my-4">
          <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent flex-1"></div>
          <div className="w-1 h-1 rounded-full mx-2 bg-fuchsia-500/50"></div>
          <div className="h-px bg-gradient-to-r from-transparent via-fuchsia-500/30 to-transparent flex-1"></div>
        </div>
      </div>
    );
  };

  // Vista de coronación minimalista
  const MissUniversoView = () => {
    const missUniverso = getMissUniverso();
    
    if (!missUniverso) return null;

    return (
      <div className="relative mb-6 overflow-hidden rounded-lg border border-amber-500/30 bg-black/40">
        <div className="relative p-4 sm:p-6">
          <div className="relative z-10 text-center">
            {/* Corona */}
            <div className="mb-3">
              <span className="text-2xl">💎</span>
            </div>
            
            {/* Título principal */}
            <h1 className="text-xl sm:text-2xl font-bold text-amber-400 mb-2">
              MISS UNIVERSO 2025
            </h1>
            
            {/* Foto de la reina */}
            <div className="relative inline-block mb-3">
              <div className="absolute inset-0 bg-amber-500/20 rounded-lg transform rotate-3 scale-105"></div>
              <img 
                src={missUniverso.photo} 
                alt={missUniverso.name}
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg object-cover border-2 border-amber-300 shadow-lg z-10"
              />
            </div>
            
            {/* Información de la ganadora */}
            <h2 className="text-lg sm:text-xl font-light text-white mb-1">
              {missUniverso.name}
            </h2>
            <p className="text-amber-300 text-base font-medium mb-3">
              {missUniverso.country}
            </p>
            
            {/* Badge de honor */}
            <div className="inline-flex items-center space-x-1 bg-amber-500/20 px-2 py-1 rounded border border-amber-400/30">
              <span className="text-amber-300 text-xs">🏆 Reina Coronada</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Filtros minimalistas
  const Filters = () => {
    const hasTop30 = candidatesByPhase.top30.length > 0;
    const hasTop12 = candidatesByPhase.top12.length > 0;
    const hasTop5 = candidatesByPhase.top5.length > 0;
    const hasFinalistas = candidatesByPhase.finalistas.length > 0;

    return (
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => setActivePhase('todas')}
          className={`p-2 sm:px-3 sm:py-2 rounded-lg transition-all text-sm ${
            activePhase === 'todas' 
              ? 'bg-fuchsia-600 text-white' 
              : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'
          }`}
        >
          <span className="text-xs">👁️</span>
          <span className="hidden sm:inline ml-1">Todas</span>
        </button>
        
        {[
          { phase: 'top30', condition: hasTop30, icon: '🔢' },
          { phase: 'top12', condition: hasTop12, icon: '⭐' },
          { phase: 'top5', condition: hasTop5, icon: '👑' },
          { phase: 'finalistas', condition: hasFinalistas, icon: '🏆' }
        ].map(({ phase, condition, icon }) => 
          condition && (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`p-2 sm:px-3 sm:py-2 rounded-lg transition-all text-sm ${
                activePhase === phase 
                  ? 'bg-fuchsia-600 text-white' 
                  : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'
              }`}
            >
              <span className="text-xs">{icon}</span>
              <span className="hidden sm:inline ml-1">{getPhaseInfo(phase).title}</span>
            </button>
          )
        )}
      </div>
    );
  };

  // Cerrar sesión
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
          <div className="animate-pulse text-4xl mb-3">💎</div>
          <div className="text-white text-lg">Cargando...</div>
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
      {/* Navbar Minimalista - Igual que Predict.js */}
      <nav className="bg-black/80 backdrop-blur-sm border-b border-fuchsia-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/predict')}>
              <span className="text-2xl">👑</span>
              <span className="ml-2 text-lg font-bold text-fuchsia-400 hidden sm:block">M 🟄 U</span>
            </div>

            {/* Navegación */}
            <div className="flex space-x-2 sm:space-x-4">
              <button 
                onClick={() => navigate('/predict')}
                className={`p-2 sm:px-3 sm:py-2 rounded-lg transition-all ${
                  location.pathname === '/predict' 
                    ? 'bg-fuchsia-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'
                }`}
              >
                <span className="text-base">🎯</span>
                <span className="hidden sm:inline ml-1">Predecir</span>
              </button>
              <button 
                onClick={() => navigate('/ranking')}
                className={`p-2 sm:px-3 sm:py-2 rounded-lg transition-all ${
                  location.pathname === '/ranking' 
                    ? 'bg-fuchsia-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'
                }`}
              >
                <span className="text-base">🏆</span>
                <span className="hidden sm:inline ml-1">Ranking</span>
              </button>
              <button 
                onClick={() => navigate('/winner')}
                className={`p-2 sm:px-3 sm:py-2 rounded-lg transition-all ${
                  location.pathname === '/winner' 
                    ? 'bg-fuchsia-600 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-fuchsia-600/50'
                }`}
              >
                <span className="text-base">👑</span>
                <span className="hidden sm:inline ml-1">Ganadoras</span>
              </button>
            </div>

            {/* Usuario y logout */}
            <div className="flex items-center space-x-2">
              {user && (
                <span className="text-gray-300 text-xs sm:text-sm bg-black/30 px-2 py-1 rounded hidden sm:block">
                  {userName || user.email?.split('@')[0]}
                </span>
              )}
              <button 
                onClick={handleLogout}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 p-2 rounded-lg transition duration-200 text-sm"
                title="Cerrar sesión"
              >
                <span className="hidden sm:inline">Salir</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-fuchsia-400 mb-2">
            Ganadoras y Clasificadas
          </h1>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto">
            Todas las candidatas que han destacado en esta edición
          </p>
        </div>

        <Filters />

        {/* Coronación destacada */}
        {missUniverso && <MissUniversoView />}

        {/* Fases */}
        <div className="relative space-y-6">
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
            <div className="text-center py-12">
              <div className="text-5xl mb-3 opacity-50">👑</div>
              <h3 className="text-lg text-white mb-2">No hay candidatas aún</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Pronto verás a las candidatas que han destacado en la competencia
              </p>
            </div>
          )}
        </div>

        {/* Footer minimalista */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-1 text-gray-500 text-xs">
            <span>✨</span>
            <span>Miss Universo 2025</span>
            <span>✨</span>
          </div>
        </div>
      </div>
    </div>
  );
}