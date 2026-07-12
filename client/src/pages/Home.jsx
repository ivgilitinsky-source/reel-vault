import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MarqueeButton from '../components/MarqueeButton.jsx';

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="hero">
      <div className="hero__reels" aria-hidden="true">
        <span className="hero__reel">7</span>
        <span className="hero__reel">🍒</span>
        <span className="hero__reel">🔔</span>
      </div>

      <h1 className="hero__title">
        REEL <span>VAULT</span>
      </h1>
      <p className="hero__subtitle">
        Виртуальный автомат без реальных ставок. Крутите барабаны, копите жетоны,
        поднимайтесь в таблице лидеров.
      </p>

      <div className="hero__actions">
        {user ? (
          <MarqueeButton as={Link} to="/profile">
            В профиль
          </MarqueeButton>
        ) : (
          <>
            <MarqueeButton as={Link} to="/register">
              Начать игру
            </MarqueeButton>
            <Link to="/login" className="hero__secondary-link">
              У меня уже есть аккаунт
            </Link>
          </>
        )}
      </div>

      <p className="hero__disclaimer">18+. Жетоны виртуальные и не имеют денежной стоимости.</p>
    </main>
  );
}
