import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import MarqueeButton from '../components/MarqueeButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Profile() {
  const { user, token, updateBalance } = useAuth();
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoError, setPromoError] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeemPromo = async (e) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoMessage('');
    setRedeeming(true);
    try {
      const result = await api.redeemPromotion(promoCode.trim(), token);
      updateBalance(result.balance);
      setPromoMessage(`Начислено +${result.bonusAmount.toLocaleString('ru-RU')} жетонов!`);
      setPromoCode('');
    } catch (err) {
      setPromoError(err.message);
    } finally {
      setRedeeming(false);
    }
  };

  if (!user) return null;

  return (
    <main className="profile-page">
      <section className="profile-card">
        <p className="profile-card__eyebrow">Ваш профиль</p>
        <h1 className="profile-card__username">{user.username}</h1>
        <p className="profile-card__meta">
          {user.email} · в клубе с {dateFormatter.format(new Date(user.createdAt))}
        </p>

        <div className="balance-display">
          <span className="balance-display__label">Баланс жетонов</span>
          <span className="balance-display__value">{user.balance.toLocaleString('ru-RU')}</span>
        </div>

        <div className="profile-card__cta">
          <MarqueeButton as={Link} to="/play">
            Играть в автомат
          </MarqueeButton>
        </div>

        <form className="promo-form" onSubmit={handleRedeemPromo}>
          <input
            className="field__input"
            placeholder="Промокод"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
          />
          <button className="cabinet-btn cabinet-btn--active" type="submit" disabled={redeeming}>
            {redeeming ? 'Проверяем…' : 'Активировать'}
          </button>
        </form>
        {promoMessage && <p className="slot-machine__result slot-machine__result--win">{promoMessage}</p>}
        {promoError && <p className="slot-machine__error">{promoError}</p>}

        <div className="profile-card__links">
          <Link to="/history" className="slot-machine__back">
            История игр
          </Link>
          <Link to="/leaderboard" className="slot-machine__back">
            Лидерборд
          </Link>
        </div>
      </section>
    </main>
  );
}
