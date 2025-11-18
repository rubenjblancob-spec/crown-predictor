const CandidateCard = ({
  candidate,
  activePhase,
  isSelectedTop30,
  isSelectedTop12,
  isSelectedTop5,
  finalistaPosition,
  onToggleSelection,
  onAssignPosition,
  onDeleteCandidate
}) => {
  return (
    <div className="bg-black/30 border-2 border-gray-600 rounded-xl p-4 transition-all hover:border-fuchsia-500">
      <img
        src={candidate.photo || '/placeholder.jpg'}
        alt={candidate.name}
        className="rounded-lg mb-3 w-full h-48 object-cover"
      />
      
      <div className="text-center">
        <h3 className="font-bold text-lg mb-1">{candidate.name}</h3>
        
        {/* LÍNEA MODIFICADA - BANDERA DINÁMICA */}
<p className="text-gray-300 text-sm mb-3">
  <img 
    src={candidate.flag} 
    alt={`Bandera de ${candidate.country}`}
    className="w-6 h-4 inline-block mr-2 rounded"
  />
  {candidate.country}
</p>
        
        {/* Controles de selección por fase */}
        {activePhase === 'inicial' && (
          <label className="flex items-center justify-center mb-3">
            <input
              type="checkbox"
              checked={isSelectedTop30}
              onChange={(e) => onToggleSelection('top30', candidate.id, e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Top 30</span>
          </label>
        )}

        {activePhase === 'top30' && (
          <label className="flex items-center justify-center mb-3">
            <input
              type="checkbox"
              checked={isSelectedTop12}
              onChange={(e) => onToggleSelection('top12', candidate.id, e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Top 12</span>
          </label>
        )}

        {activePhase === 'top12' && (
          <label className="flex items-center justify-center mb-3">
            <input
              type="checkbox"
              checked={isSelectedTop5}
              onChange={(e) => onToggleSelection('top5', candidate.id, e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Top 5</span>
          </label>
        )}

        {activePhase === 'top5' && (
          <select
            value={finalistaPosition || ""}
            onChange={(e) => onAssignPosition(e.target.value, candidate.id)}
            className="w-full px-2 py-1 rounded bg-gray-800 text-white text-sm mb-3"
          >
            <option value="">Seleccionar posición</option>
            <option value="cuarta">4° Finalista</option>
            <option value="tercera">3° Finalista</option>
            <option value="segunda">2° Finalista</option>
            <option value="primera">1° Finalista</option>
            <option value="missUniverso">👑 Miss Universo</option>
          </select>
        )}

        <button
          onClick={() => onDeleteCandidate(candidate.id)}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition text-sm"
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
};

export default CandidateCard;