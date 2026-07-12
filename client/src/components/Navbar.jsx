import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        REEL <span>VAULT</span>
      </Link>
      <nav className="navbar__links">
        {user ? (
          <>
            <Link to="/profile" className="navbar__link">Профиль</Link>
            <button className="navbar__link navbar__link--button" onClick={handleLogout}>
              Выйти
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar__link">Войти</Link>
            <Link to="/register" className="navbar__link navbar__link--cta">
              Регистрация
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
