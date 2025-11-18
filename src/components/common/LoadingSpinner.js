const LoadingSpinner = ({ message = "Cargando..." }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <div className="text-white text-2xl">{message}</div>
    </div>
  );
};

export default LoadingSpinner;