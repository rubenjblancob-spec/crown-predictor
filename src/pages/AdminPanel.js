import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { initialCandidates } from './candidatesData';

// Componentes importados
import AdminNavbar from '../components/admin/AdminNavbar';
import PhaseManager from '../components/admin/PhaseManager';
import SearchFilters from '../components/admin/SearchFilters';
import CandidateGrid from '../components/admin/CandidateGrid';
import PhaseActions from '../components/admin/PhaseActions';
import BulkActions from '../components/admin/BulkActions';
import Pagination from '../components/common/Pagination';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function AdminPanel() {
  // Estados principales
  const [activePhase, setActivePhase] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [userScores, setUserScores] = useState([]);
  const [filteredUserScores, setFilteredUserScores] = useState([]); // 🆕 Estado para usuarios filtrados
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados de selección
  const [selectedTop30, setSelectedTop30] = useState([]);
  const [selectedTop12, setSelectedTop12] = useState([]);
  const [selectedTop5, setSelectedTop5] = useState([]);
  const [finalistas, setFinalistas] = useState({
    cuarta: null, tercera: null, segunda: null, primera: null, missUniverso: null
  });

  const [faseAbierta, setFaseAbierta] = useState(true);
  const [faseSeleccionada, setFaseSeleccionada] = useState('');
  const itemsPerPage = 10;

  const navigate = useNavigate();

  // Sistema de puntuación mejorado
  const getPhaseMaxScore = (phase) => {
    const maxScores = {
      top30: 15,
      top12: 24,
      top5: 30,
      finalistas: 31
    };
    return maxScores[phase] || 0;
  };

  // Función mejorada para calcular puntuaciones de finalistas
  const calculateFinalistsScore = useCallback((userSelection, realResults) => {
    if (!userSelection || !realResults) return 0;
    
    let score = 0;
    
    const positionPoints = {
      missUniverso: 15,
      primera: 8,
      segunda: 4,
      tercera: 2,
      cuarta: 2
    };

    if (Array.isArray(userSelection)) {
      const correctSelections = userSelection.filter(id => 
        Object.values(realResults).includes(id)
      ).length;
      const percentage = (correctSelections / 5) * 100;
      return Math.round((percentage / 100) * 5);
    } else {
      Object.keys(positionPoints).forEach(position => {
        if (userSelection[position] === realResults[position]) {
          score += positionPoints[position];
        }
      });
    }
    
    return score;
  }, []);

  // Función mejorada para obtener resultados reales
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

  // Función mejorada para calcular puntuaciones
  const calculatePhaseScore = useCallback((userSelection, realResults, phase) => {
    if (!userSelection || !realResults) return 0;

    if (phase === 'finalistas') {
      return calculateFinalistsScore(userSelection, realResults);
    }

    if (userSelection.length === 0 || realResults.length === 0) return 0;
    
    const correctSelections = userSelection.filter(id => realResults.includes(id)).length;
    const totalRequired = Math.min(userSelection.length, realResults.length);
    const percentage = (correctSelections / totalRequired) * 100;
    
    return Math.round((percentage / 100) * getPhaseMaxScore(phase));
  }, [calculateFinalistsScore]);

  // Obtener fecha de la última predicción
  const getLatestPredictionDate = useCallback((predictions) => {
    const dates = Object.values(predictions).flatMap(pred => pred.timestamp?.toDate?.() || new Date(0));
    return new Date(Math.max(...dates));
  }, []);

  // 🆕 FUNCIÓN MEJORADA: Obtener usuarios activos con rol "user"
  const getActiveUsers = useCallback(async () => {
    try {
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
      const usersSnapshot = await getDocs(usersQuery);
      const activeUsers = new Set();
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        // Solo incluir usuarios activos (puedes ajustar esta lógica según tu sistema)
        if (userData.role === 'user' && !userData.deleted) {
          activeUsers.add(doc.id);
        }
      });
      
      return activeUsers;
    } catch (error) {
      console.error('Error obteniendo usuarios activos:', error);
      return new Set();
    }
  }, []);

  // 🆕 FUNCIÓN MEJORADA: Filtrar puntuaciones de usuarios activos
  const filterActiveUserScores = useCallback(async (scores) => {
    try {
      const activeUsers = await getActiveUsers();
      const filteredScores = scores.filter(score => activeUsers.has(score.userId));
      setFilteredUserScores(filteredScores);
    } catch (error) {
      console.error('Error filtrando puntuaciones:', error);
      setFilteredUserScores(scores); // Fallback: mostrar todas las puntuaciones
    }
  }, [getActiveUsers]);

  // Función mejorada para calcular puntuaciones de usuarios
  const calculateUserScores = useCallback(async (predictionsData) => {
    try {
      // Obtener resultados reales de cada fase (MEJORADO)
      const realResults = {
        top30: await getPhaseResults('top30'),
        top12: await getPhaseResults('top12'),
        top5: await getPhaseResults('top5'),
        finalistas: await getPhaseResults('finalistas')
      };

      // Agrupar predicciones por usuario
      const userPredictions = {};
      predictionsData.forEach(prediction => {
        if (!userPredictions[prediction.userId]) {
          userPredictions[prediction.userId] = {
            userName: prediction.userName,
            predictions: {}
          };
        }
        userPredictions[prediction.userId].predictions[prediction.phase] = prediction.selected;
      });

      // Calcular puntuaciones para cada usuario (MEJORADO)
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
          predictionsCount: Object.keys(userData.predictions).length,
          lastPrediction: getLatestPredictionDate(userData.predictions)
        };
      });

      // Ordenar por puntuación total descendente
      scores.sort((a, b) => b.totalScore - a.totalScore);
      setUserScores(scores);
      
      // 🆕 Filtrar solo usuarios activos
      await filterActiveUserScores(scores);
    } catch (error) {
      console.error('Error calculando puntuaciones:', error);
    }
  }, [getPhaseResults, calculatePhaseScore, getLatestPredictionDate, filterActiveUserScores]);

  // Verificar autenticación y rol de usuario
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userDoc = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDoc);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserRole(userData.role);
          if (userData.role !== 'admin') {
            alert('❌ No tienes permisos de administrador');
            navigate('/predict');
            return;
          }
        } else {
          alert('❌ Usuario no encontrado');
          navigate('/login');
          return;
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Configuración de fase activa
  useEffect(() => {
    const configRef = doc(db, 'config', 'phaseStatus');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActivePhase(data.activePhase);
        setFaseAbierta(data.isOpen);
      }
    });

    return () => unsubscribe();
  }, []);

  // Cargar candidatas según fase activa
  useEffect(() => {
    if (!activePhase) return;
    
    const q = query(
      collection(db, 'candidates'), 
      where('phase', '==', activePhase)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setCandidates(data);
    });

    return () => unsubscribe();
  }, [activePhase]);

  // Cargar predicciones y calcular puntuaciones
  useEffect(() => {
    const q = collection(db, 'predictions');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const predictionsData = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Calcular puntuaciones con el nuevo sistema
      calculateUserScores(predictionsData);
    });

    return () => unsubscribe();
  }, [candidates, calculateUserScores]);

  // 🆕 EFFECT: Actualizar filtro cuando cambien los usuarios
  useEffect(() => {
    if (userScores.length > 0) {
      filterActiveUserScores(userScores);
    }
  }, [userScores, filterActiveUserScores]);

  // Función mejorada para obtener el color del badge según la puntuación
  const getScoreColor = useCallback((score, maxScore) => {
    const percentage = (score / maxScore) * 100;
    if (percentage > 80) return 'bg-green-500';
    if (percentage > 60) return 'bg-green-400';
    if (percentage > 40) return 'bg-yellow-500';
    if (percentage > 20) return 'bg-orange-500';
    return 'bg-red-500';
  }, []);

  // Resto de funciones sin cambios...
  const eliminarCandidate = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta candidata?')) return;
    
    try {
      await deleteDoc(doc(db, 'candidates', id));
    } catch (error) {
      console.error('Error al eliminar candidata:', error);
      alert('❌ No se pudo eliminar');
    }
  };

  const candidatasIniciales = useCallback(() => {
    return initialCandidates;
  }, []);

  const cargarCandidatasIniciales = async () => {
    if (!window.confirm('¿Estás seguro de cargar las candidatas iniciales? Esto puede tomar unos segundos.')) return;
    
    setLoadingCandidates(true);
    try {
      const batch = writeBatch(db);
      let nuevas = 0;
      let existentes = 0;

      // Verificar si ya existen candidatas para evitar duplicados
      const existingCandidatesQuery = query(collection(db, 'candidates'));
      const existingSnapshot = await getDocs(existingCandidatesQuery);
      const existingCandidateNames = new Set();
      
      existingSnapshot.docs.forEach(doc => {
        const data = doc.data();
        existingCandidateNames.add(data.name);
      });

      for (const candidata of candidatasIniciales()) {
        // Verificar si la candidata ya existe
        if (existingCandidateNames.has(candidata.name)) {
          existentes++;
          continue;
        }

        // Si no existe, agregarla
        const newDocRef = doc(collection(db, 'candidates'));
        batch.set(newDocRef, candidata);
        nuevas++;
      }

      if (nuevas > 0) {
        await batch.commit();
      }
      
      alert(`✅ Carga completada\nNuevas: ${nuevas}\nYa existentes: ${existentes}`);
    } catch (error) {
      console.error("Error al cargar candidatas:", error);
      alert("❌ Hubo un problema al guardar las candidatas");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const cambiarFaseActiva = async () => {
    if (!faseSeleccionada) return alert("❌ Selecciona una fase");
    try {
      await setDoc(doc(db, 'config', 'phaseStatus'), {
        activePhase: faseSeleccionada,
        isOpen: true
      });
      alert(`✅ Fase "${faseSeleccionada}" activada`);
    } catch (error) {
      console.error("Error al cambiar fase:", error);
      alert("❌ No se pudo cambiar la fase");
    }
  };

  const abrirFase = async () => {
    try {
      await setDoc(doc(db, 'config', 'phaseStatus'), {
        activePhase: activePhase,
        isOpen: true
      });
      alert(`✅ Fase "${activePhase}" abierta`);
    } catch (error) {
      console.error("Error al abrir fase:", error);
      alert("❌ No se pudo abrir la fase");
    }
  };

  const cerrarFase = async () => {
    try {
      await setDoc(doc(db, 'config', 'phaseStatus'), {
        activePhase: activePhase,
        isOpen: false
      });
      alert(`✅ Fase "${activePhase}" cerrada`);
    } catch (error) {
      console.error("Error al cerrar fase:", error);
      alert("❌ No se pudo cerrar la fase");
    }
  };

  // FUNCIÓN MEJORADA: Guardar selección con prevención de duplicados
  const guardarSeleccion = async (ids, nuevaFase, maxSeleccion) => {
    if (guardando) {
      alert('⏳ Ya se está guardando la selección, por favor espera...');
      return;
    }

    if (ids.length !== maxSeleccion) {
      return alert(`❌ Debes seleccionar exactamente ${maxSeleccion} candidatas`);
    }

    setGuardando(true);

    try {
      const existingQuery = query(
        collection(db, 'candidates'), 
        where('phase', '==', nuevaFase)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        const confirmar = window.confirm(
          `⚠️ Ya existen ${existingSnapshot.size} candidatas en la fase ${nuevaFase}. ¿Deseas reemplazarlas?`
        );
        if (!confirmar) {
          setGuardando(false);
          return;
        }
        
        const deleteBatch = writeBatch(db);
        existingSnapshot.docs.forEach(doc => {
          deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
      }

      const batch = writeBatch(db);
      
      for (const id of ids) {
        const docRef = doc(db, 'candidates', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const newDocRef = doc(collection(db, 'candidates'));
          batch.set(newDocRef, {
            ...data,
            phase: nuevaFase,
            order: ids.indexOf(id) + 1,
            createdAt: new Date()
          });
        }
      }

      await batch.commit();
      
      await setDoc(doc(db, 'config', 'phaseStatus'), {
        activePhase: nuevaFase,
        isOpen: true,
        lastUpdated: new Date()
      });
      
      alert(`✅ Fase ${nuevaFase} guardada con ${ids.length} candidatas`);
      
      switch (activePhase) {
        case 'inicial': setSelectedTop30([]); break;
        case 'top30': setSelectedTop12([]); break;
        case 'top12': setSelectedTop5([]); break;
        default: console.warn('⚠️ Fase desconocida:', activePhase); break;
      }
    } catch (error) {
      console.error(`Error al guardar fase ${nuevaFase}:`, error);
      alert("❌ No se pudo guardar la selección");
    } finally {
      setGuardando(false);
    }
  };

  // FUNCIÓN MEJORADA: Guardar finalistas con prevención de duplicados
  const guardarFinalistas = async () => {
    if (guardando) {
      alert('⏳ Ya se está guardando la selección, por favor espera...');
      return;
    }

    const posiciones = Object.entries(finalistas);
    const incompletas = posiciones.filter(([_, id]) => !id);
    
    if (incompletas.length) {
      return alert("❌ Debes asignar todas las posiciones");
    }

    setGuardando(true);

    try {
      const existingQuery = query(
        collection(db, 'candidates'), 
        where('phase', '==', 'finalistas')
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        const confirmar = window.confirm(
          `⚠️ Ya existen ${existingSnapshot.size} finalistas. ¿Deseas reemplazarlas?`
        );
        if (!confirmar) {
          setGuardando(false);
          return;
        }
        
        const deleteBatch = writeBatch(db);
        existingSnapshot.docs.forEach(doc => {
          deleteBatch.delete(doc.ref);
        });
        await deleteBatch.commit();
      }

      const batch = writeBatch(db);
      
      for (const [posicion, id] of posiciones) {
        const docRef = doc(db, 'candidates', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const newDocRef = doc(collection(db, 'candidates'));
          batch.set(newDocRef, {
            ...data,
            phase: 'finalistas',
            position: posicion,
            order: ['cuarta', 'tercera', 'segunda', 'primera', 'missUniverso'].indexOf(posicion) + 1,
            createdAt: new Date()
          });
        }
      }

      await batch.commit();
      await cerrarFase();
      alert("✅ Finalistas guardadas correctamente");
      
      await setDoc(doc(db, 'config', 'scoringSystem'), {
        version: '2.0',
        description: 'Sistema mejorado - Finalistas por posiciones',
        maxPoints: 100,
        updatedAt: new Date()
      });
      
    } catch (error) {
      console.error("Error al guardar finalistas:", error);
      alert("❌ No se pudo guardar la ronda final");
    } finally {
      setGuardando(false);
    }
  };

  const reiniciarTodo = async () => {
    if (!window.confirm("⚠️ ¿Estás seguro de que quieres borrar TODAS las candidatas? Esta acción no se puede deshacer.")) return;
    
    try {
      const snapshot = await getDocs(collection(db, 'candidates'));
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      await setDoc(doc(db, 'config', 'phaseStatus'), {
        activePhase: '',
        isOpen: false
      });
      
      alert("✅ Todo reiniciado correctamente");
    } catch (error) {
      console.error("Error al reiniciar:", error);
      alert("❌ No se pudo reiniciar");
    }
  };

  // Handlers sin cambios
  const handleToggleSelection = (phase, candidateId, isSelected) => {
    switch (phase) {
      case 'top30':
        if (isSelected) {
          if (selectedTop30.length < 30) {
            setSelectedTop30([...selectedTop30, candidateId]);
          }
        } else {
          setSelectedTop30(selectedTop30.filter(id => id !== candidateId));
        }
        break;
      case 'top12':
        if (isSelected) {
          if (selectedTop12.length < 12) {
            setSelectedTop12([...selectedTop12, candidateId]);
          }
        } else {
          setSelectedTop12(selectedTop12.filter(id => id !== candidateId));
        }
        break;
      case 'top5':
        if (isSelected) {
          if (selectedTop5.length < 5) {
            setSelectedTop5([...selectedTop5, candidateId]);
          }
        } else {
          setSelectedTop5(selectedTop5.filter(id => id !== candidateId));
        }
        break;
      default:
        break;
    }
  };

  const handleAssignPosition = (position, candidateId) => {
    if (position) {
      setFinalistas(prev => ({
        ...prev,
        [position]: candidateId
      }));
    }
  };

  const handleSaveSelection = async (nextPhase, requiredCount) => {
    if (guardando) {
      alert('⏳ Ya se está guardando la selección, por favor espera...');
      return;
    }

    let ids = [];
    switch (activePhase) {
      case 'inicial':
        ids = selectedTop30;
        break;
      case 'top30':
        ids = selectedTop12;
        break;
      case 'top12':
        ids = selectedTop5;
        break;
      case 'top5':
        await guardarFinalistas();
        return;
      default:
        break;
    }

    await guardarSeleccion(ids, nextPhase, requiredCount);
  };

  // Renderizado condicional
  if (loading) return <LoadingSpinner message="Cargando panel de administración..." />;
  if (userRole !== 'admin') return <LoadingSpinner message="No tienes permisos de administrador" />;

  // Filtrado y paginación
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.country.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = selectedCountry ? c.country === selectedCountry : true;
    return matchesSearch && matchesCountry;
  });

  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const paginatedCandidates = filteredCandidates.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
      <AdminNavbar 
        user={user} 
        onNavigateToUserAdmin={() => navigate('/admin/usuarios')} 
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header con nuevo sistema de puntuación */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-fuchsia-400 mb-4">Panel de Administración</h1>
          <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 p-3 rounded-lg mb-4">
            <h2 className="text-xl font-bold">🏆 Sistema de Puntuación Mejorado</h2>
            <p className="text-sm opacity-90">Total máximo: 100 puntos | Finalistas por posiciones específicas</p>
          </div>
        </div>

        <PhaseManager
          activePhase={activePhase}
          faseAbierta={faseAbierta}
          faseSeleccionada={faseSeleccionada}
          setFaseSeleccionada={setFaseSeleccionada}
          onCambiarFaseActiva={cambiarFaseActiva}
          onAbrirFase={abrirFase}
          onCerrarFase={cerrarFase}
        />

        <BulkActions
          loadingCandidates={loadingCandidates}
          onLoadInitialCandidates={cargarCandidatasIniciales}
          onResetAll={reiniciarTodo}
        />

        <SearchFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          candidates={candidates}
          onPageReset={() => setCurrentPage(1)}
        />

        <CandidateGrid
          candidates={paginatedCandidates}
          activePhase={activePhase}
          selectedTop30={selectedTop30}
          selectedTop12={selectedTop12}
          selectedTop5={selectedTop5}
          finalistas={finalistas}
          onToggleSelection={handleToggleSelection}
          onAssignPosition={handleAssignPosition}
          onDeleteCandidate={eliminarCandidate}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <PhaseActions
          activePhase={activePhase}
          selectedTop30={selectedTop30}
          selectedTop12={selectedTop12}
          selectedTop5={selectedTop5}
          finalistas={finalistas}
          onSaveSelection={handleSaveSelection}
          guardando={guardando}
        />

        {/* SECCIÓN MEJORADA: Puntuaciones en Tiempo Real - SOLO USUARIOS ACTIVOS */}
        <div className="bg-black/40 p-6 rounded-lg border border-fuchsia-500/30 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-fuchsia-300">
              🏆 Puntuaciones en Tiempo Real - Usuarios Activos
            </h2>
            <div className="bg-gradient-to-r from-green-500 to-blue-500 px-3 py-1 rounded-full text-sm font-bold">
              USUARIOS ACTIVOS: {filteredUserScores.length}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6 text-xs">
            <div className="bg-gray-800 p-2 rounded text-center">
              <div className="font-bold">Top 30</div>
              <div className="text-green-400">15 pts</div>
            </div>
            <div className="bg-gray-800 p-2 rounded text-center">
              <div className="font-bold">Top 12</div>
              <div className="text-green-400">24 pts</div>
            </div>
            <div className="bg-gray-800 p-2 rounded text-center">
              <div className="font-bold">Top 5</div>
              <div className="text-green-400">30 pts</div>
            </div>
            <div className="bg-gray-800 p-2 rounded text-center">
              <div className="font-bold">Finalistas</div>
              <div className="text-green-400">31 pts</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 p-2 rounded text-center">
              <div className="font-bold">Total</div>
              <div className="font-bold">100 pts</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white">
                  <th className="px-4 py-3 text-left">Posición</th>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-center">Top 30</th>
                  <th className="px-4 py-3 text-center">Top 12</th>
                  <th className="px-4 py-3 text-center">Top 5</th>
                  <th className="px-4 py-3 text-center">Finalistas</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">Predicciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUserScores.map((user, index) => (
                  <tr key={user.userId} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-500' : 'bg-gray-700'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{user.userName}</td>
                    
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getScoreColor(user.scoresByPhase.top30, 15)}`}>
                        {user.scoresByPhase.top30}/15
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getScoreColor(user.scoresByPhase.top12, 24)}`}>
                        {user.scoresByPhase.top12}/24
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getScoreColor(user.scoresByPhase.top5, 30)}`}>
                        {user.scoresByPhase.top5}/30
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getScoreColor(user.scoresByPhase.finalistas, 31)}`}>
                        {user.scoresByPhase.finalistas}/31
                      </span>
                    </td>
                    
                    <td className="px-4 py-3 text-center font-bold text-lg">
                      <span className="bg-gradient-to-r from-purple-500 to-fuchsia-500 px-3 py-1 rounded">
                        {user.totalScore}/100
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-500 px-2 py-1 rounded text-xs">
                        {user.predictionsCount}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUserScores.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-400">No hay puntuaciones de usuarios activos</p>
                <p className="text-gray-500 text-sm">Las puntuaciones aparecerán cuando los usuarios activos hagan predicciones</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}