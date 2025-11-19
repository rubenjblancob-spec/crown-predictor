import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function Predict() {
  const [activePhase, setActivePhase] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [maxSeleccion, setMaxSeleccion] = useState(30);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [existingPrediction, setExistingPrediction] = useState(null);
  const itemsPerPage = 10;

  const navigate = useNavigate();
  const location = useLocation();

  // Obtener nombre del usuario desde Firestore
  const getUserName = useCallback(async (uid) => {
    try {
      const userDoc = doc(db, 'users', uid);
      const userSnap = await getDoc(userDoc);
      if (userSnap.exists()) {
        setUserName(userSnap.data().name);
      }
    } catch (error) {
      console.error('Error al obtener nombre de usuario:', error);
    }
  }, []);

  // Verificar si ya existe una predicción para este usuario y fase
  const checkExistingPrediction = useCallback(async (userId, phase) => {
    try {
      const predictionQuery = query(
        collection(db, 'predictions'),
        where('userId', '==', userId),
        where('phase', '==', phase)
      );
      const snapshot = await getDocs(predictionQuery);
      
      if (!snapshot.empty) {
        const existing = snapshot.docs[0].data();
        setExistingPrediction(existing);
        setSelected(existing.selected || []);
      } else {
        setExistingPrediction(null);
        setSelected([]);
      }
    } catch (error) {
      console.error('Error al verificar predicción existente:', error);
    }
  }, []);

  // Verificar autenticación del usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        getUserName(user.uid);
        // Cargar predicción existente si existe
        if (activePhase) {
          checkExistingPrediction(user.uid, activePhase);
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate, getUserName, checkExistingPrediction, activePhase]);

  // Escucha fase activa y estado de apertura
  useEffect(() => {
    const configRef = doc(db, 'config', 'phaseStatus');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActivePhase(data.activePhase);
        setIsOpen(data.isOpen);

        const limites = {
          top30: 30,
          top12: 12,
          top5: 5,
          finalistas: 3
        };
        setMaxSeleccion(limites[data.activePhase] || 30);

        // Cuando cambia la fase activa, verificar predicción existente
        if (user) {
          checkExistingPrediction(user.uid, data.activePhase);
        }
      }
    });

    return () => unsubscribe();
  }, [user, checkExistingPrediction]);

  // Cargar candidatas según fase activa
  useEffect(() => {
    const fetchCandidates = async () => {
      const q = query(
        collection(db, 'candidates'),
        where('phase', '==', activePhase),
        orderBy('order')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCandidates(data);
      setCurrentPage(1);
    };

    if (activePhase) {
      fetchCandidates();
    }
  }, [activePhase]);

  // Función para seleccionar candidatas
  const toggleCandidate = (id) => {
    if (!isOpen) return;
    
    if (selected.includes(id)) {
      setSelected(selected.filter((c) => c !== id));
    } else if (selected.length < maxSeleccion) {
      setSelected([...selected, id]);
    }
  };

  // GUARDAR PREDICCIÓN - FUNCIÓN PRINCIPAL
  const handleSubmit = async () => {
    if (!user) {
      alert('❌ Debes iniciar sesión para guardar predicciones');
      navigate('/login');
      return;
    }

    if (selected.length !== maxSeleccion) {
      alert(`❌ Debes seleccionar exactamente ${maxSeleccion} candidatas`);
      return;
    }

    try {
      // Crear un ID único para esta predicción (usuario + fase)
      const predictionId = `${user.uid}_${activePhase}`;
      const predictionRef = doc(db, 'predictions', predictionId);

      await setDoc(predictionRef, {
        userId: user.uid,
        userName: userName || user.email,
        phase: activePhase,
        selected: selected,
        timestamp: new Date(),
        lastUpdated: new Date()
      }, { merge: true });

      alert('✅ ¡Predicción guardada exitosamente!');
      
      // Actualizar estado de predicción existente
      setExistingPrediction({
        userId: user.uid,
        userName: userName || user.email,
        phase: activePhase,
        selected: selected,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Error al guardar predicción:', error);
      alert('❌ Hubo un problema al guardar tu predicción.');
    }
  };

  // Limpiar selección actual
  const clearSelection = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar tu selección actual?')) {
      setSelected([]);
    }
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

  // Paginación
  const totalPages = Math.ceil(candidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCandidates = candidates.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Generar números de página para mostrar (máximo 5)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Navbar Minimalista */}
      <nav className="bg-black/80 backdrop-blur-sm border-b border-fuchsia-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo solo con emoji */}
            <div className="flex items-center cursor-pointer" onClick={() => navigate('/predict')}>
              <span className="text-2xl">👑</span>
              <span className="ml-2 text-lg font-bold text-fuchsia-400 hidden sm:block">M 🟄 U</span>
            </div>

            {/* Navegación - Solo emojis en móvil */}
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

            {/* Usuario y logout minimalista */}
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
        {/* Header información */}
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-fuchsia-400 mb-2">
            Fase: <span className="capitalize">{activePhase}</span>
          </h2>
          
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-3">
            <div className="bg-black/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-fuchsia-500/30">
              <span className="text-gray-300 text-sm">Seleccionadas: </span>
              <span className="text-white font-bold text-sm sm:text-base">{selected.length} / {maxSeleccion}</span>
            </div>
            
            {!isOpen && (
              <div className="bg-red-500/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-red-500">
                <span className="text-red-400 font-bold text-sm">🔒 Cerrado</span>
              </div>
            )}
            
            {selected.length === maxSeleccion && (
              <div className="bg-green-500/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border border-green-500">
                <span className="text-green-400 font-bold text-sm">✅ Listo</span>
              </div>
            )}
          </div>

          {/* Botón de limpiar selección */}
          <div className="flex justify-center mb-3">
            <button
              onClick={clearSelection}
              disabled={selected.length === 0}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition text-sm"
            >
              🗑️ Limpiar
            </button>
          </div>

          <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto px-2">
            Selecciona {maxSeleccion} candidatas para la siguiente fase
          </p>
        </div>

        {/* Grid de candidatas - Optimizado para móvil */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {currentCandidates.map((candidate) => (
            <div
              key={candidate.id}
              onClick={() => toggleCandidate(candidate.id)}
              className={`cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                selected.includes(candidate.id)
                  ? 'border-2 border-fuchsia-500 bg-fuchsia-500/20 rounded-lg'
                  : 'border border-gray-600 bg-black/30 rounded-lg hover:border-fuchsia-400'
              } ${!isOpen ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <div className="relative">
                <img
                  src={candidate.photo || '/placeholder.jpg'}
                  alt={candidate.name}
                  className="w-full h-32 sm:h-40 object-cover rounded-t-lg"
                />
                {selected.includes(candidate.id) && (
                  <div className="absolute top-1 right-1 bg-fuchsia-500 rounded-full p-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              
              <div className="p-2">
                <p className="text-white font-bold text-center text-xs sm:text-sm truncate">{candidate.name}</p>
                {candidate.country && (
                  <div className="flex items-center justify-center mt-1">
                    <img 
                      src={candidate.flag} 
                      alt={`Bandera de ${candidate.country}`}
                      className="w-4 h-3 sm:w-5 sm:h-4 inline-block mr-1 rounded"
                    />
                    <p className="text-gray-300 text-xs truncate">{candidate.country}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Paginación minimalista */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center space-x-1 sm:space-x-2 mb-6">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition text-sm"
            >
              ←
            </button>
            
            <div className="flex space-x-1">
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-8 h-8 rounded-lg transition text-sm ${
                    currentPage === page
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition text-sm"
            >
              →
            </button>
          </div>
        )}

        {/* Botón de guardar minimalista */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={!isOpen || selected.length !== maxSeleccion}
            className={`px-6 py-2.5 rounded-lg font-bold text-base transition-all ${
              isOpen && selected.length === maxSeleccion
                ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white shadow'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {existingPrediction ? '💾 Actualizar' : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}