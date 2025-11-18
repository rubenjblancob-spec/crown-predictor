import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

const AdminNavbar = ({ user, onNavigateToUserAdmin }) => {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="bg-black/80 backdrop-blur-sm border-b border-fuchsia-500/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <span className="text-2xl">👑</span>
            <span className="ml-2 text-xl font-bold text-fuchsia-400">Admin Panel</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-gray-300">{user?.email}</span>
            <button
              onClick={onNavigateToUserAdmin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              👥 Administrar Usuarios
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;