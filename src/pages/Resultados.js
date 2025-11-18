import { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from 'firebase/firestore';

export default function Resultados() {
  const [predictions, setPredictions] = useState([]);
  const [candidatesMap, setCandidatesMap] = useState({});
  const [faseSeleccionada, setFaseSeleccionada] = useState('top30');

  // 🔄 Cargar predicciones por fase
  useEffect(() => {
    const fetchPredictions = async () => {
      const q = query(collection(db, 'predictions'), where('phase', '==', faseSeleccionada));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPredictions(data);
    };

    fetchPredictions();
  }, [faseSeleccionada]);

  // 📦 Cargar candidatas en mapa para mostrar nombres
  useEffect(() => {
    const fetchCandidates = async () => {
      const snapshot = await getDocs(collection(db, 'candidates'));
      const map = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        map[doc.id] = data;
      });
      setCandidatesMap(map);
    };

    fetchCandidates();
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 text-center">
      <h2 className="text-2xl font-bold text-fuchsia-400 mb-4">📊 Predicciones guardadas</h2>

      {/* 🔘 Selector de fase */}
      <select
        value={faseSeleccionada}
        onChange={(e) => setFaseSeleccionada(e.target.value)}
        className="mb-6 px-4 py-2 rounded-md border border-gray-300"
      >
        <option value="top30">Top 30</option>
        <option value="top12">Top 12</option>
        <option value="top5">Top 5</option>
        <option value="finalistas">Finalistas</option>
      </select>

      {/* 🧑‍💻 Lista de predicciones */}
      {predictions.length === 0 ? (
        <p className="text-white">No hay predicciones para esta fase.</p>
      ) : (
        <div className="space-y-6">
          {predictions.map((pred) => (
            <div key={pred.id} className="bg-black/20 p-4 rounded-lg text-left text-white">
              <h3 className="text-lg font-bold text-fuchsia-300 mb-2">{pred.name}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {pred.selected.map((id) => {
                  const candidata = candidatesMap[id];
                  return (
                    <div key={id} className="bg-black/40 p-2 rounded text-center">
                      <img
                        src={candidata?.photo || '/placeholder.jpg'}
                        alt={candidata?.name || 'Desconocida'}
                        className="w-16 h-16 object-cover rounded-full mx-auto mb-1"
                      />
                      <p className="text-sm font-semibold">{candidata?.name || 'Sin nombre'}</p>
                      <p className="text-xs text-gray-300">{candidata?.country || ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}