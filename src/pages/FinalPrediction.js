import { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

export default function FinalPrediction({ candidates }) {
  const [positions, setPositions] = useState({
    fourthFinalist: '',
    thirdFinalist: '',
    secondFinalist: '',
    firstFinalist: '',
    winner: ''
  });

  const handleChange = (position, value) => {
    // Evita duplicados
    if (Object.values(positions).includes(value)) return;
    setPositions({ ...positions, [position]: value });
  };

  const handleSubmit = async () => {
    const userName = prompt('Ingresa tu nombre o alias para guardar tu predicción final:');
    const values = Object.values(positions);

    if (!userName || values.includes('') || new Set(values).size < 5) {
      alert('Debes asignar una candidata distinta a cada posición.');
      return;
    }

    try {
      await addDoc(collection(db, 'predictions'), {
        name: userName,
        phase: 'cuadroFinal',
        positions: positions,
        timestamp: new Date()
      });
      alert('¡Predicción final guardada exitosamente!');
    } catch (error) {
      console.error('Error al guardar predicción final:', error);
      alert('Hubo un problema al guardar tu predicción.');
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 text-center text-white">
      <h2 className="text-3xl font-serif text-fuchsia-400 mb-6">🏆 Cuadro Final</h2>

      {[
        { key: 'fourthFinalist', label: '4° Finalista' },
        { key: 'thirdFinalist', label: '3° Finalista' },
        { key: 'secondFinalist', label: '2° Finalista' },
        { key: 'firstFinalist', label: '1° Finalista' },
        { key: 'winner', label: 'Miss Universe 2025 👑' }
      ].map(({ key, label }) => (
        <div key={key} className="mb-4">
          <label className="block mb-2 font-bold">{label}</label>
          <select
            value={positions[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            className="text-black px-4 py-2 rounded"
          >
            <option value="">Selecciona una candidata</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="mt-6 px-6 py-2 rounded-full font-bold bg-fuchsia-500 hover:bg-fuchsia-600 text-white"
      >
        Guardar Predicción Final
      </button>
    </div>
  );
}