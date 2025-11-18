import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function Ranking() {
  const [filteredUserScores, setFilteredUserScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Verificar autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            setUserName(userData.name || userData.userName || user.email?.split('@')[0] || 'Usuario');
          } else {
            setUserName(user.email?.split('@')[0] || 'Usuario');
          }
        } catch (error) {
          console.error('Error obteniendo nombre del usuario:', error);
          setUserName(user.email?.split('@')[0] || 'Usuario');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Función para obtener resultados reales
  const getPhaseResults = useCallback(async (phase) => {
    if (!phase) return phase === 'finalistas' ? {} : [];
    
    if (phase === 'finalistas') {
      const q = query(collection(db, 'candidates'), where('phase', '==', 'finalistas'));
      const snapshot = await getDocs(q);
      const results = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.position) {
          results[data.position] = doc.id;
        }
      });
      return results;
    } else {
      const q = query(collection(db, 'candidates'), where('phase', '==', phase));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.id);
    }
  }, []);

  // Función para calcular puntuación de finalistas
  const calculateFinalistsScore = useCallback((userSelection, realResults) => {
    if (!userSelection || !realResults) return 0;
    
    let score = 0;
    const positionPoints = { missUniverso: 15, primera: 8, segunda: 4, tercera: 2, cuarta: 2 };

    if (Array.isArray(userSelection)) {
      const correctSelections = userSelection.filter(id => Object.values(realResults).includes(id)).length;
      return Math.round((correctSelections / 5) * 5);
    } else {
      Object.keys(positionPoints).forEach(position => {
        if (userSelection[position] === realResults[position]) score += positionPoints[position];
      });
    }
    return score;
  }, []);

  // Función para calcular puntuación por fase
  const calculatePhaseScore = useCallback((userSelection, realResults, phase) => {
    if (!userSelection || !realResults) return 0;
    if (phase === 'finalistas') return calculateFinalistsScore(userSelection, realResults);
    if (userSelection.length === 0 || realResults.length === 0) return 0;
    
    const correctSelections = userSelection.filter(id => realResults.includes(id)).length;
    const totalRequired = Math.min(userSelection.length, realResults.length);
    const percentage = (correctSelections / totalRequired) * 100;
    const maxScores = { top30: 15, top12: 24, top5: 30, finalistas: 31 };
    
    return Math.round((percentage / 100) * (maxScores[phase] || 0));
  }, [calculateFinalistsScore]);

  // Obtener usuarios activos con rol "user"
  const getActiveUsers = useCallback(async () => {
    try {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
      const usersSnapshot = await getDocs(usersQuery);
      const activeUsers = new Map();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.role === 'user' && !userData.deleted) {
          activeUsers.set(doc.id, userData.name || userData.userName || 'Usuario');
        }
      });
      
      return activeUsers;
    } catch (error) {
      console.error('Error obteniendo usuarios activos:', error);
      return new Map();
    }
  }, []);

  // Función principal para calcular todas las puntuaciones
  const calculateAllUserScores = useCallback((predictionsData, realResults, activeUsers) => {
    const userPredictions = {};
    
    predictionsData.forEach(prediction => {
      if (activeUsers.has(prediction.userId)) {
        if (!userPredictions[prediction.userId]) {
          userPredictions[prediction.userId] = {
            userName: activeUsers.get(prediction.userId) || 'Usuario',
            predictions: {}
          };
        }
        userPredictions[prediction.userId].predictions[prediction.phase] = prediction.selected;
      }
    });

    const scores = Object.entries(userPredictions).map(([userId, userData]) => {
      const scoresByPhase = {
        top30: calculatePhaseScore(userData.predictions.top30, realResults.top30, 'top30'),
        top12: calculatePhaseScore(userData.predictions.top12, realResults.top12, 'top12'),
        top5: calculatePhaseScore(userData.predictions.top5, realResults.top5, 'top5'),
        finalistas: calculatePhaseScore(userData.predictions.finalistas, realResults.finalistas, 'finalistas')
      };

      const totalScore = Object.values(scoresByPhase).reduce((sum, score) => sum + score, 0);

      return {
        userId,
        userName: userData.userName,
        scoresByPhase,
        totalScore,
        predictionsCount: Object.keys(userData.predictions).length
      };
    });

    return scores.sort((a, b) => b.totalScore - a.totalScore);
  }, [calculatePhaseScore]);

  // Obtener puntuaciones en tiempo real
  const fetchRealTimeScores = useCallback(async () => {
    try {
      const predictionsRef = collection(db, 'predictions');
      const predictionsSnapshot = await getDocs(predictionsRef);
      const predictionsData = predictionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const activeUsers = await getActiveUsers();

      const realResults = {
        top30: await getPhaseResults('top30'),
        top12: await getPhaseResults('top12'),
        top5: await getPhaseResults('top5'),
        finalistas: await getPhaseResults('finalistas')
      };

      const scores = calculateAllUserScores(predictionsData, realResults, activeUsers);

      setFilteredUserScores(scores);
      
      if (user) {
        const currentUserRank = scores.findIndex(score => score.userId === user.uid) + 1;
        setUserRank(currentUserRank > 0 ? currentUserRank : null);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error calculando puntuaciones:', error);
      setLoading(false);
    }
  }, [user, getPhaseResults, calculateAllUserScores, getActiveUsers]);

  useEffect(() => {
    const predictionsRef = collection(db, 'predictions');
    const unsubscribe = onSnapshot(predictionsRef, () => {
      fetchRealTimeScores();
    });
    return () => unsubscribe();
  }, [fetchRealTimeScores]);

  // Sistema de puntuación
  const getPhaseMaxScore = (phase) => {
    const maxScores = { top30: 15, top12: 24, top5: 30, finalistas: 31 };
    return maxScores[phase] || 0;
  };

  // Calcular precisión total
  const calculateTotalAccuracy = (userData) => {
    const totalPossible = 100;
    return totalPossible > 0 ? ((userData.totalScore / totalPossible) * 100).toFixed(0) : 0;
  };

  // Paleta de colores para ranking
  const getRankBadge = (index) => {
    if (index === 0) return { 
      text: '💎', 
      color: 'from-amber-400 to-orange-500',
      bgColor: 'bg-gradient-to-r from-amber-400 to-orange-500',
      textColor: 'text-amber-900'
    };
    if (index === 1) return { 
      text: '🥈', 
      color: 'from-gray-300 to-gray-400',
      bgColor: 'bg-gradient-to-r from-gray-300 to-gray-400',
      textColor: 'text-gray-700'
    };
    if (index === 2) return { 
      text: '🥉', 
      color: 'from-amber-600 to-amber-700',
      bgColor: 'bg-gradient-to-r from-amber-600 to-amber-700',
      textColor: 'text-amber-100'
    };
    if (index < 10) return { 
      text: '🚀', 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
      textColor: 'text-blue-100'
    };
    if (index < 20) return { 
      text: '⭐', 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-100'
    };
    return { 
      text: '🌙', 
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gradient-to-r from-gray-500 to-gray-600',
      textColor: 'text-gray-200'
    };
  };

  // Función para cerrar sesión
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
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
            {user && <span className="text-gray-300 hidden sm:block">Hola, {userName}</span>}
            <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200">Cerrar Sesión</button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Tarjeta de usuario actual
  const UserRankCard = ({ userRank, userData }) => {
    if (!userRank || !userData) return null;

    return (
      <div className="bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl p-6 mb-8 border border-fuchsia-500/50 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-3xl">⭐</div>
            <div>
              <h3 className="text-xl font-bold text-white">Tu Posición</h3>
              <p className="text-fuchsia-100 text-sm">
                Puesto #{userRank} de {filteredUserScores.length} predictores
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-amber-300">
              {userData.totalScore}
              <span className="text-fuchsia-200 text-lg">/100</span>
            </div>
            <div className="text-fuchsia-100 text-sm">
              {calculateTotalAccuracy(userData)}% de precisión
            </div>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="mt-4">
          <div className="flex justify-between text-white text-sm mb-2">
            <span>Progreso general</span>
            <span>{Math.round((userRank / filteredUserScores.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-amber-400 to-amber-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${100 - ((userRank - 1) / filteredUserScores.length) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  };

  // Podio simplificado
  const Podium = ({ topThree }) => (
    <div className="grid grid-cols-3 gap-4 mb-8 items-end">
      {/* Segundo lugar */}
      <div className="transform hover:scale-105 transition-transform">
        <div className="bg-gradient-to-b from-gray-300 to-gray-400 h-20 rounded-t-lg flex items-center justify-center relative border-2 border-gray-200">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="text-2xl">🥈</span>
          </div>
          <div className="text-gray-700 text-sm font-bold">#2</div>
        </div>
        <div className="bg-gray-600 p-3 rounded-b-lg border-2 border-gray-500">
          <div className="text-white text-sm font-bold truncate">
            {topThree[1]?.userName?.split(' ')[0] || '-'}
          </div>
          <div className="text-amber-300 text-lg font-bold">
            {topThree[1]?.totalScore || 0}
          </div>
        </div>
      </div>

      {/* Primer lugar */}
      <div className="transform hover:scale-110 transition-transform">
        <div className="bg-gradient-to-b from-amber-300 to-amber-400 h-24 rounded-t-lg flex items-center justify-center relative border-2 border-amber-200">
          <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
            <span className="text-3xl">💎</span>
          </div>
          <div className="text-amber-900 text-sm font-bold">#1</div>
        </div>
        <div className="bg-amber-600 p-3 rounded-b-lg border-2 border-amber-500">
          <div className="text-white text-sm font-bold truncate">
            {topThree[0]?.userName?.split(' ')[0] || '-'}
          </div>
          <div className="text-white text-lg font-bold">
            {topThree[0]?.totalScore || 0}
          </div>
        </div>
      </div>

      {/* Tercer lugar */}
      <div className="transform hover:scale-105 transition-transform">
        <div className="bg-gradient-to-b from-amber-500 to-amber-600 h-16 rounded-t-lg flex items-center justify-center relative border-2 border-amber-400">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <span className="text-xl">🥉</span>
          </div>
          <div className="text-amber-100 text-sm font-bold">#3</div>
        </div>
        <div className="bg-amber-700 p-3 rounded-b-lg border-2 border-amber-600">
          <div className="text-white text-sm font-bold truncate">
            {topThree[2]?.userName?.split(' ')[0] || '-'}
          </div>
          <div className="text-amber-300 text-lg font-bold">
            {topThree[2]?.totalScore || 0}
          </div>
        </div>
      </div>
    </div>
  );

  // Item de ranking
  const RankingItem = ({ user, index, isCurrentUser }) => {
    const badge = getRankBadge(index);
    const totalAccuracy = calculateTotalAccuracy(user);
    const isExpanded = expandedUser === user.userId;

    return (
      <div className={`bg-gradient-to-r ${badge.color} rounded-lg p-4 shadow-lg border-2 ${
        isCurrentUser ? 'border-amber-400' : 'border-white/10'
      } transition-all duration-300`}>
        
        {/* Header principal */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
        >
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative flex-shrink-0">
              <div className={`text-base font-bold text-white ${badge.bgColor} rounded-full w-8 h-8 flex items-center justify-center shadow`}>
                {index + 1}
              </div>
              {index < 3 && (
                <div className="absolute -top-1 -right-1 text-sm">
                  {badge.text}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-white truncate">
                {user.userName}
              </h3>
              <div className="text-white/80 text-xs">
                {user.predictionsCount} predicciones
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0 ml-3">
            <div className="text-xl font-bold text-white">
              {user.totalScore}
            </div>
            <div className="text-white/90 text-xs">
              {totalAccuracy}% precisión
            </div>
          </div>
        </div>

        {/* Detalles expandibles */}
        {isExpanded && (
          <div className="mt-3 animate-fade-in border-t border-white/20 pt-3">
            <h4 className="text-white font-bold text-xs mb-2">📊 Desglose por Fases</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(user.scoresByPhase || {}).map(([phase, points]) => {
                const maxScore = getPhaseMaxScore(phase);
                const percentage = maxScore > 0 ? ((points / maxScore) * 100).toFixed(0) : 0;
                const phaseIcons = { 
                  top30: { icon: '🔢', color: 'from-green-500 to-emerald-500', name: 'Top 30' },
                  top12: { icon: '⭐', color: 'from-amber-500 to-yellow-500', name: 'Top 12' },
                  top5: { icon: '👑', color: 'from-purple-500 to-fuchsia-500', name: 'Top 5' },
                  finalistas: { icon: '🏆', color: 'from-red-500 to-pink-500', name: 'Finalistas' }
                };
                const phaseInfo = phaseIcons[phase] || { icon: '❓', color: 'from-gray-500 to-gray-600', name: phase };
                
                return (
                  <div key={phase} className="bg-black/20 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-sm">{phaseInfo.icon}</span>
                        <span className="text-white font-medium text-xs">{phaseInfo.name}</span>
                      </div>
                      <span className="text-amber-300 font-bold text-xs">{points}/{maxScore}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1">
                      <div 
                        className={`bg-gradient-to-r ${phaseInfo.color} h-1 rounded-full transition-all duration-700`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-white/60 text-xs mt-1">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botón expandir/contraer */}
        <div className="text-center mt-2">
          <button 
            onClick={() => setExpandedUser(isExpanded ? null : user.userId)}
            className="text-white/70 hover:text-white text-xs font-medium transition-colors duration-200 bg-black/20 px-3 py-1 rounded"
          >
            {isExpanded ? '▲ Ocultar' : '▼ Detalles'}
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-6xl mb-4">💎</div>
          <div className="text-white text-xl">Calculando ranking...</div>
        </div>
      </div>
    );
  }

  const topThree = filteredUserScores.slice(0, 3);
  const currentUserData = user ? filteredUserScores.find(score => score.userId === user.uid) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <Navbar />
      
      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-fuchsia-400 mb-2">
            Ranking de Predictores
          </h1>
          <p className="text-gray-300 text-lg">
            Descubre quién tiene el mejor instinto para coronar misses
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {filteredUserScores.length} usuarios activos compitiendo
          </p>
        </div>

        <UserRankCard userRank={userRank} userData={currentUserData} />

        {/* Podio */}
        {topThree.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-center text-white mb-4">
              Podio de Honor
            </h2>
            <Podium topThree={topThree} />
          </div>
        )}

        {/* Lista de ranking */}
        <div className="space-y-3">
          {filteredUserScores.map((user, index) => (
            <RankingItem 
              key={user.userId}
              user={user}
              index={index}
              isCurrentUser={user.userId === currentUserData?.userId}
            />
          ))}
        </div>

        {/* Mensaje si no hay datos */}
        {filteredUserScores.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl text-gray-200 mb-4">¡No hay usuarios activos!</h3>
            <p className="text-gray-400 text-lg mb-8">Los resultados aparecerán cuando los usuarios activos hagan predicciones</p>
            <button 
              onClick={() => navigate('/predict')}
              className="bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all duration-300 hover:scale-105"
            >
              🎯 Comenzar a Predecir
            </button>
          </div>
        )}

        {/* Información del sistema */}
        <div className="mt-12 text-center">
          <div className="bg-gray-800/50 rounded-xl p-6 border border-fuchsia-500/30 max-w-2xl mx-auto">
            <h4 className="text-fuchsia-400 text-xl font-bold mb-4">Sistema de Puntuación</h4>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div className="text-green-400 font-medium">Top 30: 15 pts</div>
              <div className="text-amber-400 font-medium">Top 12: 24 pts</div>
              <div className="text-purple-400 font-medium">Top 5: 30 pts</div>
              <div className="text-red-400 font-medium">Finalistas: 31 pts</div>
            </div>
            <p className="text-gray-300 text-sm">
              Total máximo: <span className="text-amber-400 font-bold">100 puntos</span> • Solo usuarios activos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}