import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getLeaderboard()
      .then((data) => setLeaders(data.leaders))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <main className="leaderboard-page">
      <section className="leaderboard-card">
        <p className="history-card__eyebrow">Топ игроков</p>
        <h1 className="history-card__title">Лидерборд</h1>

        {error && <p className="slot-machine__error">{error}</p>}
        {leaders === null && !error && <p className="history-card__loading">Загрузка…</p>}

        {leaders && leaders.length === 0 && (
          <p className="history-card__empty">Пока никто не играл — станьте первым!</p>
        )}

        {leaders && leaders.length > 0 && (
          <ol className="leaderboard-list">
            {leaders.map((leader) => (
              <li
                key={leader.rank}
                className={`leaderboard-item ${
                  user && user.username === leader.username ? 'leaderboard-item--me' : ''
                }`}
              >
                <span className="leaderboard-item__rank">#{leader.rank}</span>
                <span className="leaderboard-item__name">{leader.username}</span>
                <span className="leaderboard-item__balance">{leader.balance.toLocaleString('ru-RU')}</span>
              </li>
            ))}
          </ol>
        )}

        <Link to="/" className="slot-machine__back">
          ← На главную
        </Link>
      </section>
    </main>
  );
}
