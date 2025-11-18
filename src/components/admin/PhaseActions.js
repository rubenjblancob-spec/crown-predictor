const PhaseActions = ({
  activePhase,
  selectedTop30,
  selectedTop12,
  selectedTop5,
  finalistas,
  onSaveSelection
}) => {
  const getPhaseConfig = () => {
    switch (activePhase) {
      case 'inicial':
        return {
          count: selectedTop30.length,
          total: 30,
          phaseName: 'Top 30',
          nextPhase: 'top30',
          color: 'indigo'
        };
      case 'top30':
        return {
          count: selectedTop12.length,
          total: 12,
          phaseName: 'Top 12',
          nextPhase: 'top12',
          color: 'purple'
        };
      case 'top12':
        return {
          count: selectedTop5.length,
          total: 5,
          phaseName: 'Top 5',
          nextPhase: 'top5',
          color: 'pink'
        };
      case 'top5':
        return {
          count: Object.values(finalistas).filter(v => v).length,
          total: 5,
          phaseName: 'Finalistas',
          nextPhase: 'finalistas',
          color: 'yellow'
        };
      default:
        return null;
    }
  };

  const phaseConfig = getPhaseConfig();
  if (!phaseConfig || phaseConfig.count === 0) return null;

  const colorClasses = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 border-indigo-500',
    purple: 'bg-purple-600 hover:bg-purple-700 border-purple-500',
    pink: 'bg-pink-600 hover:bg-pink-700 border-pink-500',
    yellow: 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500'
  };

  return (
    <div className={`bg-black/40 p-6 rounded-lg border ${colorClasses[phaseConfig.color]}/30 mb-8`}>
      <div className="text-center">
        <p className="text-lg font-bold mb-2">
          {activePhase === 'top5' 
            ? `Posiciones asignadas: ${phaseConfig.count} / ${phaseConfig.total}`
            : `Seleccionadas para ${phaseConfig.phaseName}: ${phaseConfig.count} / ${phaseConfig.total}`
          }
        </p>
        <button
          onClick={() => onSaveSelection(phaseConfig.nextPhase, phaseConfig.total)}
          disabled={phaseConfig.count !== phaseConfig.total}
          className={`px-8 py-3 ${colorClasses[phaseConfig.color]} disabled:bg-gray-600 text-white rounded-lg font-bold transition`}
        >
          💾 {activePhase === 'top5' ? 'Guardar Finalistas y Cerrar Competencia' : `Guardar ${phaseConfig.phaseName} y Abrir Fase`}
        </button>
      </div>
    </div>
  );
};

export default PhaseActions;