import { useState } from 'react';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const iniciarSesion = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('⚠️ Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = cred.user.uid;

      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError('⚠️ No se encontró el usuario en Firestore');
        return;
      }

      const role = userSnap.data().role;

      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/predict');
      }
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
      switch (error.code) {
        case 'auth/user-not-found':
          setError('Usuario no registrado');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta');
          break;
        case 'auth/invalid-email':
          setError('Formato de correo inválido');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Intenta más tarde.');
          break;
        default:
          setError('Error inesperado. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const recuperarContrasena = async () => {
    if (!formData.email) {
      setError('⚠️ Ingresa tu correo para recuperar la contraseña');
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, formData.email);
      alert('📩 Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (error) {
      console.error('❌ Error al enviar recuperación:', error);
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No se encontró un usuario con ese correo');
          break;
        case 'auth/invalid-email':
          setError('Formato de correo inválido');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Espera un momento.');
          break;
        default:
          setError('Error al enviar el correo. Intenta nuevamente.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-fuchsia-600 mb-2 text-center">Iniciar sesión</h2>
        <p className="text-gray-600 text-center mb-6">Accede con tu cuenta</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={iniciarSesion} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico *
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent disabled:bg-gray-100 transition duration-200 bg-white text-gray-900 placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña *
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="Tu contraseña"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent disabled:bg-gray-100 transition duration-200 bg-white text-gray-900 placeholder-gray-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-400 text-white font-bold py-3 rounded-lg transition duration-200"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={recuperarContrasena}
            disabled={resetLoading || loading}
            className="text-sm text-fuchsia-600 hover:text-fuchsia-700 underline disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {resetLoading ? 'Enviando correo...' : '¿Olvidaste tu contraseña?'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <a href="/registro" className="text-fuchsia-600 hover:text-fuchsia-700 font-medium">
              Regístrate aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}