import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const GAME_LABELS = {
  classic: 'Автомат',
  book: 'Книга сокровищ',
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
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.getHistory(token), api.getHistoryStats(token)])
      .then(([historyData, statsData]) => {
        setSpins(historyData.spins);
        setStats(statsData.stats);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <main className="history-page">
      <section className="history-card">
        <p className="history-card__eyebrow">История игр</p>
        <h1 className="history-card__title">Статистика и последние спины</h1>

        {error && <p className="slot-machine__error">{error}</p>}

        {stats && stats.length > 0 && (
          <div className="history-stats">
            {stats.map((s) => (
              <div key={s.game} className="history-stats__card">
                <span className="history-stats__game">{GAME_LABELS[s.game] || s.game}</span>
                <span className="history-stats__row">Спинов: {s.spinsCount}</span>
                <span className="history-stats__row">Ставок: {s.totalBet.toLocaleString('ru-RU')}</span>
                <span className="history-stats__row">Выплат: {s.totalPayout.toLocaleString('ru-RU')}</span>
                <span
                  className={`history-stats__net ${s.net >= 0 ? 'history-item__net--win' : 'history-item__net--lose'}`}
                >
                  {s.net >= 0 ? '+' : ''}
                  {s.net.toLocaleString('ru-RU')}
                </span>
              </div>
            ))}
          </div>
        )}

        {spins === null && !error && <p className="history-card__loading">Загрузка…</p>}

        {spins && spins.length === 0 && (
          <p className="history-card__empty">Вы ещё не крутили автомат — самое время начать!</p>
        )}

        {spins && spins.length > 0 && (
          <ul className="history-list">
            {spins.map((spin) => (
              <li key={`${spin.game}-${spin.id}`} className="history-item">
                <span className="history-item__game">{GAME_LABELS[spin.game] || spin.game}</span>
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

        <Link to="/profile" className="slot-machine__back">
          ← Назад в профиль
        </Link>
      </section>
    </main>
  );
}
