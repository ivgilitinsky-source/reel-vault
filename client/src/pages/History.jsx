import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const SYMBOL_DISPLAY = {
  7: '7',
  BAR: 'BAR',
  BELL: '🔔',
  CHERRY: '🍒',
};

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default function History() {
  const { token } = useAuth();
  const [spins, setSpins] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getHistory(token)
      .then((data) => setSpins(data.spins))
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <main className="history-page">
      <section className="history-card">
        <p className="history-card__eyebrow">История игр</p>
        <h1 className="history-card__title">Последние спины</h1>

        {error && <p className="slot-machine__error">{error}</p>}
        {spins === null && !error && <p className="history-card__loading">Загрузка…</p>}

        {spins && spins.length === 0 && (
          <p className="history-card__empty">Вы ещё не крутили автомат — самое время начать!</p>
        )}

        {spins && spins.length > 0 && (
          <ul className="history-list">
            {spins.map((spin) => (
              <li key={spin.id} className="history-item">
                <div className="history-item__reels">
                  {spin.reels.map((symbol, index) => (
                    <span key={index} className="history-item__symbol">
                      {SYMBOL_DISPLAY[symbol] || symbol}
                    </span>
                  ))}
                </div>
                <div className="history-item__meta">
                  <span className="history-item__date">{dateTimeFormatter.format(new Date(spin.createdAt))}</span>
                  <span className="history-item__bet">Ставка: {spin.betAmount}</span>
                </div>
                <span
                  className={`history-item__net ${
                    spin.netChange >= 0 ? 'history-item__net--win' : 'history-item__net--lose'
                  }`}
                >
                  {spin.netChange >= 0 ? '+' : ''}
                  {spin.netChange.toLocaleString('ru-RU')}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link to="/play" className="slot-machine__back">
          ← Назад к автомату
        </Link>
      </section>
    </main>
  );
}
