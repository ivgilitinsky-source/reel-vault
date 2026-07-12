import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireRole({ role, children }) {
  const { user, loading, token } = useAuth();

  if (loading) {
    return <div className="page-loading">Загрузка…</div>;
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
