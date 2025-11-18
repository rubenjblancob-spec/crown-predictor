const PhaseManager = ({
  activePhase,
  faseAbierta,
  faseSeleccionada,
  setFaseSeleccionada,
  onCambiarFaseActiva,
  onAbrirFase,
  onCerrarFase
}) => {
  return (
    <div className="bg-black/40 p-6 rounded-lg border border-fuchsia-500/30 mb-8">
      <h2 className="text-2xl font-bold text-fuchsia-300 mb-4">Gestión de Fases</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Fase actual: <strong>{activePhase || 'Ninguna'}</strong>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${faseAbierta ? 'bg-green-600' : 'bg-red-600'}`}>
              {faseAbierta ? 'Abierta' : 'Cerrada'}
            </span>
          </label>
          <div className="flex gap-2 mb-4">
            <button
              onClick={onAbrirFase}
              disabled={!activePhase}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              Abrir Fase
            </button>
            <button
              onClick={onCerrarFase}
              disabled={!activePhase}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              Cerrar Fase
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Cambiar a fase:</label>
          <div className="flex gap-2">
            <select
              value={faseSeleccionada}
              onChange={(e) => setFaseSeleccionada(e.target.value)}
              className="flex-1 px-4 py-2 rounded bg-gray-800 text-white"
            >
              <option value="">Seleccionar fase</option>
              <option value="inicial">Candidatas Iniciales</option>
              <option value="top30">Top 30</option>
              <option value="top12">Top 12</option>
              <option value="top5">Top 5</option>
              <option value="finalistas">Finalistas</option>
            </select>
            <button
              onClick={onCambiarFaseActiva}
              disabled={!faseSeleccionada}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-gray-600 text-white px-4 py-2 rounded transition"
            >
              Activar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhaseManager;