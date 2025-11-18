import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function RutaProtegidaAdmin({ children }) {
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verificarRol = async () => {
      const usuario = auth.currentUser;
      if (!usuario) {
        setRol('none');
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, 'users', usuario.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setRol(data.role);
        } else {
          setRol('none');
        }
      } catch (error) {
        console.error('❌ Error al verificar rol:', error);
        setRol('none');
      } finally {
        setLoading(false);
      }
    };

    verificarRol();
  }, []);

  if (loading) return <p className="p-6">Verificando acceso...</p>;
  if (rol !== 'admin') return <Navigate to="/predict" replace />;

  return children;
}