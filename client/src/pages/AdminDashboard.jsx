import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

export default function AdminDashboard() {
  const { token } = useAuth();

  const [dealers, setDealers] = useState(null);
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState('');

  const [dealerForm, setDealerForm] = useState({ username: '', email: '', password: '' });
  const [dealerFormError, setDealerFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustError, setAdjustError] = useState('');

  const loadData = async () => {
    try {
      const [dealersData, playersData] = await Promise.all([api.getDealers(token), api.getAllPlayers(token)]);
      setDealers(dealersData.dealers);
      setPlayers(playersData.players);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDealerFormChange = (e) => {
    setDealerForm({ ...dealerForm, [e.target.name]: e.target.value });
  };

  const handleCreateDealer = async (e) => {
    e.preventDefault();
    setDealerFormError('');
    setCreating(true);
    try {
      await api.createDealer(dealerForm, token);
      setDealerForm({ username: '', email: '', password: '' });
      await loadData();
    } catch (err) {
      setDealerFormError(err.message);
    } finally {
      setCreating(false);
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
      await api.adjustPlayerBalance(
        playerId,
        { amount: rawAmount * sign, reason: 'Ручная корректировка (админ)' },
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

  const [dealerActionId, setDealerActionId] = useState(null);
  const [dealerActionError, setDealerActionError] = useState('');

  const handleDeleteDealer = async (id, username) => {
    if (!window.confirm(`Удалить дилера "${username}"? Его операторы и игроки вернутся в общий пул.`)) return;
    setDealerActionError('');
    setDealerActionId(id);
    try {
      await api.deleteDealer(id, token);
      await loadData();
    } catch (err) {
      setDealerActionError(err.message);
    } finally {
      setDealerActionId(null);
    }
  };

  const handleToggleBlockDealer = async (id) => {
    setDealerActionError('');
    setDealerActionId(id);
    try {
      await api.toggleBlockDealer(id, token);
      await loadData();
    } catch (err) {
      setDealerActionError(err.message);
    } finally {
      setDealerActionId(null);
    }
  };

  const registerBaseUrl = `${window.location.origin}/register?ref=`;

  return (
    <main className="admin-page">
      <section className="admin-card">
        <p className="history-card__eyebrow">Панель администратора</p>
        <h1 className="history-card__title">Дилеры и игроки</h1>

        {error && <p className="slot-machine__error">{error}</p>}

        <div className="admin-block">
          <h2 className="admin-block__title">Создать дилера</h2>
          <form className="admin-inline-form" onSubmit={handleCreateDealer}>
            <input
              className="field__input"
              name="username"
              placeholder="Логин"
              value={dealerForm.username}
              onChange={handleDealerFormChange}
              required
            />
            <input
              className="field__input"
              type="email"
              name="email"
              placeholder="Email"
              value={dealerForm.email}
              onChange={handleDealerFormChange}
              required
            />
            <input
              className="field__input"
              type="password"
              name="password"
              placeholder="Пароль"
              value={dealerForm.password}
              onChange={handleDealerFormChange}
              required
            />
            <button className="cabinet-btn cabinet-btn--active" type="submit" disabled={creating}>
              {creating ? 'Создаём…' : 'Создать'}
            </button>
          </form>
          {dealerFormError && <p className="slot-machine__error">{dealerFormError}</p>}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Дилеры ({dealers?.length ?? 0})</h2>
          {dealerActionError && <p className="slot-machine__error">{dealerActionError}</p>}
          {dealers && dealers.length === 0 && <p className="history-card__empty">Пока нет дилеров</p>}
          {dealers && dealers.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Статус</th>
                  <th>Операторов</th>
                  <th>Игроков</th>
                  <th>Общий баланс</th>
                  <th>Реф. ссылка</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {dealers.map((d) => (
                  <tr key={d.id}>
                    <td>{d.username}</td>
                    <td>
                      <span className={`admin-status ${d.isBlocked ? 'admin-status--blocked' : 'admin-status--active'}`}>
                        {d.isBlocked ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td>{d.operatorsCount}</td>
                    <td>{d.playersCount}</td>
                    <td>{d.totalBalance.toLocaleString('ru-RU')}</td>
                    <td className="admin-table__ref">
                      {registerBaseUrl}
                      {d.referralCode}
                    </td>
                    <td>
                      <div className="admin-adjust">
                        <button
                          className="cabinet-btn"
                          onClick={() => handleToggleBlockDealer(d.id)}
                          disabled={dealerActionId === d.id}
                        >
                          {d.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                        <button
                          className="cabinet-btn cabinet-btn--stop"
                          onClick={() => handleDeleteDealer(d.id, d.username)}
                          disabled={dealerActionId === d.id}
                        >
                          Удалить
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
          <h2 className="admin-block__title">Все игроки ({players?.length ?? 0})</h2>
          {adjustError && <p className="slot-machine__error">{adjustError}</p>}
          {players && players.length === 0 && <p className="history-card__empty">Игроков пока нет</p>}
          {players && players.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Баланс</th>
                  <th>Дилер</th>
                  <th>Оператор</th>
                  <th>Изменить баланс</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>{p.username}</td>
                    <td>{p.balance.toLocaleString('ru-RU')}</td>
                    <td>{p.dealerUsername || '—'}</td>
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
      </section>
    </main>
  );
}
