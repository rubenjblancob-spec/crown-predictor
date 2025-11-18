import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Predict from './pages/Predict';
import Ranking from './pages/Ranking';
import Winner from './pages/Winner';
import AdminPanel from './pages/AdminPanel';
import FinalPrediction from './pages/FinalPrediction';
import Registro from './pages/Registro';
import Login from './pages/Login';
import AdminUsuarios from './pages/AdminUsuarios';
import RutaProtegidaAdmin from './components/RutaProtegidaAdmin';
import RutaProtegida from './components/RutaProtegida'; // Si tienes protección para usuarios normales

function App() {
  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/login" element={<Login />} />
        
        {/* Rutas protegidas para usuarios autenticados */}
        <Route path="/predict" element={
          <RutaProtegida>
            <Predict />
          </RutaProtegida>
        } />
        <Route path="/ranking" element={
          <RutaProtegida>
            <Ranking />
          </RutaProtegida>
        } />
        <Route path="/winner" element={
          <RutaProtegida>
            <Winner />
          </RutaProtegida>
        } />
        <Route path="/final" element={
          <RutaProtegida>
            <FinalPrediction />
          </RutaProtegida>
        } />
        
        {/* Rutas protegidas para administradores */}
        <Route path="/admin" element={
          <RutaProtegidaAdmin>
            <AdminPanel />
          </RutaProtegidaAdmin>
        } />
        <Route path="/admin/usuarios" element={
          <RutaProtegidaAdmin>
            <AdminUsuarios />
          </RutaProtegidaAdmin>
        } />
        
        {/* Ruta por defecto para páginas no encontradas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
