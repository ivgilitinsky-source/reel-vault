import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function OperatorDashboard() {
  const { token } = useAuth();

  const [players, setPlayers] = useState(null);
  const [pool, setPool] = useState(null);
  const [error, setError] = useState('');

  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustError, setAdjustError] = useState('');

  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState('');

  const [flaggingId, setFlaggingId] = useState(null);
  const [flagError, setFlagError] = useState('');
  const [flagSuccessId, setFlagSuccessId] = useState(null);

  const loadData = async () => {
    try {
      const [playersData, poolData] = await Promise.all([api.getOperatorPlayers(token), api.getOperatorPool(token)]);
      setPlayers(playersData.players);
      setPool(poolData.players);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdjust = async (playerId, sign) => {
    const rawAmount = Number.parseInt(adjustAmounts[playerId], 10);
    if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
      setAdjustError('Введите положительное число жетонов');
      return;
    }
    setAdjustError('');
    setAdjustingId(playerId);
    try {
      await api.adjustOperatorPlayerBalance(
        playerId,
        { amount: rawAmount * sign, reason: 'Корректировка оператором' },
        token
      );
      await loadData();
      setAdjustAmounts((prev) => ({ ...prev, [playerId]: '' }));
    } catch (err) {
      setAdjustError(err.message);
    } finally {
      setAdjustingId(null);
    }
  };

  const handleClaim = async (playerId) => {
    setClaimError('');
    setClaimingId(playerId);
    try {
      await api.claimPlayerAsOperator(playerId, token);
      await loadData();
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleFlagRisk = async (playerId) => {
    setFlagError('');
    setFlaggingId(playerId);
    try {
      await api.flagPlayerRisk(playerId, token);
      setFlagSuccessId(playerId);
      setTimeout(() => setFlagSuccessId(null), 3000);
    } catch (err) {
      setFlagError(err.message);
    } finally {
      setFlaggingId(null);
    }
  };

  return (
    <main className="admin-page">
      <section className="admin-card">
        <p className="history-card__eyebrow">Панель оператора</p>
        <h1 className="history-card__title">Ваши игроки</h1>

        {error && <p className="slot-machine__error">{error}</p>}

        <div className="admin-block">
          <h2 className="admin-block__title">Игроки ({players?.length ?? 0})</h2>
          {adjustError && <p className="slot-machine__error">{adjustError}</p>}
          {flagError && <p className="slot-machine__error">{flagError}</p>}
          {players && players.length === 0 && <p className="history-card__empty">Пока нет игроков</p>}
          {players && players.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Баланс</th>
                  <th>Пополнить</th>
                  <th>Риск ухода</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.username}</td>
                    <td>{p.balance.toLocaleString('ru-RU')}</td>
                    <td>
                      <div className="admin-adjust">
                        <input
                          className="admin-adjust__input"
                          type="number"
                          min="1"
                          placeholder="0"
                          value={adjustAmounts[p.id] || ''}
                          onChange={(e) => setAdjustAmounts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        />
                        <button
                          className="cabinet-btn"
                          onClick={() => handleAdjust(p.id, 1)}
                          disabled={adjustingId === p.id}
                        >
                          +
                        </button>
                        <button
                          className="cabinet-btn"
                          onClick={() => handleAdjust(p.id, -1)}
                          disabled={adjustingId === p.id}
                        >
                          −
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="cabinet-btn cabinet-btn--stop"
                        onClick={() => handleFlagRisk(p.id)}
                        disabled={flaggingId === p.id}
                      >
                        {flagSuccessId === p.id ? 'Отправлено ✓' : 'Сообщить дилеру'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Пул игроков вашего дилера ({pool?.length ?? 0})</h2>
          {claimError && <p className="slot-machine__error">{claimError}</p>}
          {pool && pool.length === 0 && <p className="history-card__empty">Пул пуст</p>}
          {pool && pool.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Баланс</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {pool.map((p) => (
                  <tr key={p.id}>
                    <td>{p.username}</td>
                    <td>{p.balance.toLocaleString('ru-RU')}</td>
                    <td>
                      <button
                        className="cabinet-btn cabinet-btn--active"
                        onClick={() => handleClaim(p.id)}
                        disabled={claimingId === p.id}
                      >
                        Забрать себе
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
