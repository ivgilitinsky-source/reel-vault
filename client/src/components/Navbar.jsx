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
        <Link to="/leaderboard" className="navbar__link">Лидерборд</Link>
        {user ? (
          <>
            <Link to="/play" className="navbar__link">Автомат</Link>
            <Link to="/book-slot" className="navbar__link">Книга сокровищ</Link>
            <Link to="/history" className="navbar__link">История</Link>
            <Link to="/profile" className="navbar__link">Профиль</Link>
            {user.role === 'admin' && (
              <Link to="/admin" className="navbar__link navbar__link--cta">Админ</Link>
            )}
            {user.role === 'dealer' && (
              <Link to="/dealer" className="navbar__link navbar__link--cta">Дилер</Link>
            )}
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
