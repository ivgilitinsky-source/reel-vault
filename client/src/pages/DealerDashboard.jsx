import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function DealerDashboard() {
  const { token } = useAuth();

  const [operators, setOperators] = useState(null);
  const [players, setPlayers] = useState(null);
  const [pool, setPool] = useState(null);
  const [error, setError] = useState('');

  const [operatorForm, setOperatorForm] = useState({ username: '', email: '', password: '' });
  const [operatorFormError, setOperatorFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const [operatorActionId, setOperatorActionId] = useState(null);
  const [operatorActionError, setOperatorActionError] = useState('');

  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustError, setAdjustError] = useState('');

  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState('');

  const loadData = async () => {
    try {
      const [operatorsData, playersData, poolData] = await Promise.all([
        api.getOperators(token),
        api.getDealerPlayers(token),
        api.getDealerPool(token),
      ]);
      setOperators(operatorsData.operators);
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

  const handleOperatorFormChange = (e) => {
    setOperatorForm({ ...operatorForm, [e.target.name]: e.target.value });
  };

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    setOperatorFormError('');
    setCreating(true);
    try {
      await api.createOperator(operatorForm, token);
      setOperatorForm({ username: '', email: '', password: '' });
      await loadData();
    } catch (err) {
      setOperatorFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteOperator = async (id, username) => {
    if (!window.confirm(`Удалить оператора "${username}"? Его игроки вернутся в ваш общий список.`)) return;
    setOperatorActionError('');
    setOperatorActionId(id);
    try {
      await api.deleteOperator(id, token);
      await loadData();
    } catch (err) {
      setOperatorActionError(err.message);
    } finally {
      setOperatorActionId(null);
    }
  };

  const handleAdjust = async (playerId, sign) => {
    const rawAmount = Number.parseInt(adjustAmounts[playerId], 10);
    if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
      setAdjustError('Введите положительное число жетонов');
      return;
    }
    setAdjustError('');
    setAdjustingId(playerId);
    try {
      await api.adjustDealerPlayerBalance(
        playerId,
        { amount: rawAmount * sign, reason: 'Корректировка дилером' },
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
      await api.claimPlayerAsDealer(playerId, token);
      await loadData();
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaimingId(null);
    }
  };

  const registerBaseUrl = `${window.location.origin}/register?ref=`;

  return (
    <main className="admin-page">
      <section className="admin-card">
        <p className="history-card__eyebrow">Панель дилера</p>
        <h1 className="history-card__title">Операторы и игроки</h1>

        {error && <p className="slot-machine__error">{error}</p>}

        <div className="admin-block">
          <h2 className="admin-block__title">Создать оператора</h2>
          <form className="admin-inline-form" onSubmit={handleCreateOperator}>
            <input
              className="field__input"
              name="username"
              placeholder="Логин"
              value={operatorForm.username}
              onChange={handleOperatorFormChange}
              required
            />
            <input
              className="field__input"
              type="email"
              name="email"
              placeholder="Email"
              value={operatorForm.email}
              onChange={handleOperatorFormChange}
              required
            />
            <input
              className="field__input"
              type="password"
              name="password"
              placeholder="Пароль"
              value={operatorForm.password}
              onChange={handleOperatorFormChange}
              required
            />
            <button className="cabinet-btn cabinet-btn--active" type="submit" disabled={creating}>
              {creating ? 'Создаём…' : 'Создать'}
            </button>
          </form>
          {operatorFormError && <p className="slot-machine__error">{operatorFormError}</p>}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Операторы ({operators?.length ?? 0})</h2>
          {operatorActionError && <p className="slot-machine__error">{operatorActionError}</p>}
          {operators && operators.length === 0 && <p className="history-card__empty">Пока нет операторов</p>}
          {operators && operators.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Игроков</th>
                  <th>Общий баланс</th>
                  <th>Реф. ссылка</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {operators.map((o) => (
                  <tr key={o.id}>
                    <td>{o.username}</td>
                    <td>{o.playersCount}</td>
                    <td>{o.totalBalance.toLocaleString('ru-RU')}</td>
                    <td className="admin-table__ref">
                      {registerBaseUrl}
                      {o.referralCode}
                    </td>
                    <td>
                      <button
                        className="cabinet-btn cabinet-btn--stop"
                        onClick={() => handleDeleteOperator(o.id, o.username)}
                        disabled={operatorActionId === o.id}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Ваши игроки ({players?.length ?? 0})</h2>
          {adjustError && <p className="slot-machine__error">{adjustError}</p>}
          {players && players.length === 0 && <p className="history-card__empty">Пока нет игроков</p>}
          {players && players.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Баланс</th>
                  <th>Оператор</th>
                  <th>Изменить баланс</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.username}</td>
                    <td>{p.balance.toLocaleString('ru-RU')}</td>
                    <td>{p.operatorUsername || '—'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Общий пул незакреплённых игроков ({pool?.length ?? 0})</h2>
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
