import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarUsuarios = async () => {
    setLoading(true);
    setError('');
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const lista = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(lista);
    } catch (err) {
      console.error('❌ Error al cargar usuarios:', err);
      setError('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const cambiarRol = async (id, nuevoRol) => {
    try {
      await updateDoc(doc(db, 'users', id), { role: nuevoRol });
      setUsuarios(prev =>
        prev.map(u => (u.id === id ? { ...u, role: nuevoRol } : u))
      );
    } catch (err) {
      console.error('❌ Error al cambiar rol:', err);
      alert('No se pudo cambiar el rol');
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-fuchsia-600 mb-4">Panel de usuarios</h2>
      {loading ? (
        <p>Cargando usuarios...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <table className="w-full border border-gray-300 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Nombre</th>
              <th className="px-4 py-2 text-left">Correo</th>
              <th className="px-4 py-2 text-left">Rol</th>
              <th className="px-4 py-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">
                  {u.role === 'user' ? (
                    <button
                      onClick={() => cambiarRol(u.id, 'admin')}
                      className="text-sm bg-fuchsia-600 text-white px-3 py-1 rounded hover:bg-fuchsia-700"
                    >
                      Hacer admin
                    </button>
                  ) : (
                    <button
                      onClick={() => cambiarRol(u.id, 'user')}
                      className="text-sm bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
                    >
                      Hacer user
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}