const BulkActions = ({
  loadingCandidates,
  onLoadInitialCandidates,
  onResetAll
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <button
        onClick={onLoadInitialCandidates}
        disabled={loadingCandidates}
        className={`px-6 py-3 rounded-lg font-bold transition-all ${
          loadingCandidates
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-fuchsia-600 hover:bg-fuchsia-700'
        } text-white`}
      >
        {loadingCandidates ? '⏳ Cargando...' : '📥 Cargar Candidatas Iniciales'}
      </button>
      
      <button
        onClick={onResetAll}
        className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold transition"
      >
        🔄 Reiniciar Todo
      </button>
    </div>
  );
};

export default BulkActions;