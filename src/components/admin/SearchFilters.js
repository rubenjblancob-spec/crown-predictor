const SearchFilters = ({
  searchTerm,
  setSearchTerm,
  selectedCountry,
  setSelectedCountry,
  candidates,
  onPageReset
}) => {
  const uniqueCountries = [...new Set(candidates.map((c) => c.country))].sort();

  return (
    <div className="bg-black/40 p-6 rounded-lg border border-fuchsia-500/30 mb-8">
      <h2 className="text-2xl font-bold text-fuchsia-300 mb-4">Búsqueda y Filtros</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o país..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onPageReset();
          }}
          className="px-4 py-2 rounded bg-gray-800 text-white placeholder-gray-400"
        />
        
        <select
          value={selectedCountry}
          onChange={(e) => {
            setSelectedCountry(e.target.value);
            onPageReset();
          }}
          className="px-4 py-2 rounded bg-gray-800 text-white"
        >
          <option value="">🌍 Todos los países</option>
          {uniqueCountries.map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SearchFilters;