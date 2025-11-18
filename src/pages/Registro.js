import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export default function Registro() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('');
  };

  const validarFormulario = () => {
    if (!formData.name.trim()) return 'El nombre es requerido';
    if (!formData.email.trim()) return 'El email es requerido';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'El formato del email es inválido';
    if (formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
    return null;
  };

  const registrarUsuario = async (e) => {
    e.preventDefault();
    
    const errorValidacion = validarFormulario();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cred = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const uid = cred.user.uid;

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: 'user',
        createdAt: new Date(),
        lastLogin: new Date()
      });

      // Éxito - limpiar formulario y mostrar mensaje
      setFormData({ name: '', email: '', password: '' });
      alert('✅ Usuario registrado correctamente. Bienvenido!');
      navigate('/predict');
      
      // Opcional: redirigir a otra página
      // window.location.href = '/dashboard';

    } catch (error) {
      console.error('❌ Error al registrar usuario:', error);
      
      // Mensajes de error específicos de Firebase
      let mensajeError = 'No se pudo registrar el usuario. Intenta nuevamente.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          mensajeError = 'Este email ya está registrado. ¿Quieres iniciar sesión?';
          break;
        case 'auth/weak-password':
          mensajeError = 'La contraseña es demasiado débil. Usa al menos 6 caracteres.';
          break;
        case 'auth/invalid-email':
          mensajeError = 'El formato del email es inválido.';
          break;
        case 'auth/operation-not-allowed':
          mensajeError = 'La operación no está permitida. Contacta al administrador.';
          break;
        case 'auth/network-request-failed':
          mensajeError = 'Error de conexión. Verifica tu internet.';
          break;
        default:
          mensajeError = 'Error inesperado. Intenta nuevamente.';
      }
      
      setError(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-6 bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-fuchsia-600 mb-2 text-center">
          Crear Cuenta
        </h2>
        <p className="text-gray-600 text-center mb-6">
          Regístrate para comenzar
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={registrarUsuario} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Tu nombre completo"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent disabled:bg-gray-100 transition duration-200 bg-white text-gray-900 placeholder-gray-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico *
            </label>
            <input
              id="email"
              name="email"
              type="email"
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
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent disabled:bg-gray-100 transition duration-200 bg-white text-gray-900 placeholder-gray-500"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-500 mt-1">La contraseña debe tener al menos 6 caracteres</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-400 text-white font-bold py-3 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Registrando...
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <a href="/login" className="text-fuchsia-600 hover:text-fuchsia-700 font-medium">
              Inicia sesión aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}