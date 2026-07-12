import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const periodFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function DealerDashboard() {
  const { token } = useAuth();

  const [operators, setOperators] = useState(null);
  const [players, setPlayers] = useState(null);
  const [pool, setPool] = useState(null);
  const [notifications, setNotifications] = useState(null);
  const [error, setError] = useState('');
  const [notifError, setNotifError] = useState('');

  const [operatorForm, setOperatorForm] = useState({ username: '', email: '', password: '' });
  const [operatorFormError, setOperatorFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const [operatorActionId, setOperatorActionId] = useState(null);
  const [operatorActionError, setOperatorActionError] = useState('');

  const [operatorBalanceAmounts, setOperatorBalanceAmounts] = useState({});
  const [operatorBalanceId, setOperatorBalanceId] = useState(null);
  const [operatorBalanceError, setOperatorBalanceError] = useState('');

  const [adjustAmounts, setAdjustAmounts] = useState({});
  const [adjustingId, setAdjustingId] = useState(null);
  const [adjustError, setAdjustError] = useState('');

  const [claimingId, setClaimingId] = useState(null);
  const [claimError, setClaimError] = useState('');

  const [statsFrom, setStatsFrom] = useState(daysAgoISO(30));
  const [statsTo, setStatsTo] = useState(todayISO());
  const [statsGroupBy, setStatsGroupBy] = useState('day');
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [statsLoading, setStatsLoading] = useState(false);

  const [promotions, setPromotions] = useState(null);
  const [promoForm, setPromoForm] = useState({ code: '', bonusAmount: '', maxUses: '', expiresAt: '' });
  const [promoFormError, setPromoFormError] = useState('');
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [promoActionId, setPromoActionId] = useState(null);
  const [promoActionError, setPromoActionError] = useState('');

  const loadData = async () => {
    try {
      const [operatorsData, playersData, poolData, notifData, promoData] = await Promise.all([
        api.getOperators(token),
        api.getDealerPlayers(token),
        api.getDealerPool(token),
        api.getDealerNotifications(token),
        api.getPromotions(token),
      ]);
      setOperators(operatorsData.operators);
      setPlayers(playersData.players);
      setPool(poolData.players);
      setNotifications(notifData.notifications);
      setPromotions(promoData.promotions);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadStats = async () => {
    setStatsError('');
    setStatsLoading(true);
    try {
      const data = await api.getDealerStats({ from: statsFrom, to: statsTo, groupBy: statsGroupBy }, token);
      setStats(data.stats);
    } catch (err) {
      setStatsError(err.message);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadStats();
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

  const handleOperatorBalanceAdjust = async (id, sign) => {
    const rawAmount = Number.parseInt(operatorBalanceAmounts[id], 10);
    if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
      setOperatorBalanceError('Введите положительное число жетонов');
      return;
    }
    setOperatorBalanceError('');
    setOperatorBalanceId(id);
    try {
      await api.adjustOperatorBalance(id, { amount: rawAmount * sign, reason: 'Пополнение дилером' }, token);
      await loadData();
      setOperatorBalanceAmounts((prev) => ({ ...prev, [id]: '' }));
    } catch (err) {
      setOperatorBalanceError(err.message);
    } finally {
      setOperatorBalanceId(null);
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

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id, token);
      await loadData();
    } catch (err) {
      setNotifError(err.message);
    }
  };

  const handlePromoFormChange = (e) => {
    setPromoForm({ ...promoForm, [e.target.name]: e.target.value });
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    setPromoFormError('');
    setCreatingPromo(true);
    try {
      await api.createPromotion(
        {
          code: promoForm.code,
          bonusAmount: promoForm.bonusAmount,
          maxUses: promoForm.maxUses || null,
          expiresAt: promoForm.expiresAt || null,
        },
        token
      );
      setPromoForm({ code: '', bonusAmount: '', maxUses: '', expiresAt: '' });
      await loadData();
    } catch (err) {
      setPromoFormError(err.message);
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleDeactivatePromo = async (id) => {
    setPromoActionError('');
    setPromoActionId(id);
    try {
      await api.deactivatePromotion(id, token);
      await loadData();
    } catch (err) {
      setPromoActionError(err.message);
    } finally {
      setPromoActionId(null);
    }
  };

  const [giftAmounts, setGiftAmounts] = useState({});
  const [giftingId, setGiftingId] = useState(null);
  const [giftError, setGiftError] = useState('');

  const handleGiftFromNotification = async (notification) => {
    const rawAmount = Number.parseInt(giftAmounts[notification.id], 10);
    if (!Number.isInteger(rawAmount) || rawAmount <= 0) {
      setGiftError('Введите положительное число жетонов');
      return;
    }
    if (!notification.playerId) {
      setGiftError('У этого уведомления нет привязанного игрока');
      return;
    }
    setGiftError('');
    setGiftingId(notification.id);
    try {
      await api.adjustDealerPlayerBalance(
        notification.playerId,
        { amount: rawAmount, reason: 'Подарок от дилера (из уведомления)' },
        token
      );
      await api.markNotificationRead(notification.id, token);
      await loadData();
      setGiftAmounts((prev) => ({ ...prev, [notification.id]: '' }));
    } catch (err) {
      setGiftError(err.message);
    } finally {
      setGiftingId(null);
    }
  };

  const promoStats = promotions
    ? {
        total: promotions.length,
        active: promotions.filter((p) => p.isActive).length,
        redemptions: promotions.reduce((sum, p) => sum + p.usesCount, 0),
        tokensGiven: promotions.reduce((sum, p) => sum + p.usesCount * p.bonusAmount, 0),
      }
    : null;

  const registerBaseUrl = `${window.location.origin}/register?ref=`;

  return (
    <main className="admin-page">
      <section className="admin-card">
        <p className="history-card__eyebrow">Панель дилера</p>
        <h1 className="history-card__title">Операторы и игроки</h1>

        {error && <p className="slot-machine__error">{error}</p>}

        <div className="admin-block">
          <h2 className="admin-block__title">
            Уведомления{' '}
            {notifications && notifications.filter((n) => !n.isRead).length > 0
              ? `(${notifications.filter((n) => !n.isRead).length} новых)`
              : ''}
          </h2>
          {notifError && <p className="slot-machine__error">{notifError}</p>}
          {giftError && <p className="slot-machine__error">{giftError}</p>}
          {notifications && notifications.length === 0 && (
            <p className="history-card__empty">Уведомлений пока нет</p>
          )}
          {notifications && notifications.length > 0 && (
            <ul className="history-list">
              {notifications.map((n) => (
                <li key={n.id} className={`history-item notification-item ${n.isRead ? '' : 'notification-item--unread'}`}>
                  <span className="history-item__game">{n.message}</span>
                  <div className="history-item__meta">
                    <span className="history-item__date">
                      {new Intl.DateTimeFormat('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(n.createdAt))}
                    </span>
                  </div>
                  <div className="notification-item__actions">
                    {n.playerId && (
                      <div className="admin-adjust">
                        <input
                          className="admin-adjust__input"
                          type="number"
                          min="1"
                          placeholder="Жетонов"
                          value={giftAmounts[n.id] || ''}
                          onChange={(e) => setGiftAmounts((prev) => ({ ...prev, [n.id]: e.target.value }))}
                        />
                        <button
                          className="cabinet-btn cabinet-btn--active"
                          onClick={() => handleGiftFromNotification(n)}
                          disabled={giftingId === n.id}
                        >
                          {giftingId === n.id ? 'Дарим…' : 'Подарить'}
                        </button>
                      </div>
                    )}
                    {!n.isRead && (
                      <button className="cabinet-btn" onClick={() => handleMarkRead(n.id)}>
                        Прочитано
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Статистика</h2>
          <div className="admin-inline-form">
            <label className="field" style={{ minWidth: 140 }}>
              <span className="field__label">С даты</span>
              <input
                className="field__input"
                type="date"
                value={statsFrom}
                onChange={(e) => setStatsFrom(e.target.value)}
              />
            </label>
            <label className="field" style={{ minWidth: 140 }}>
              <span className="field__label">По дату</span>
              <input
                className="field__input"
                type="date"
                value={statsTo}
                onChange={(e) => setStatsTo(e.target.value)}
              />
            </label>
            <label className="field" style={{ minWidth: 120 }}>
              <span className="field__label">Группировка</span>
              <select
                className="field__input"
                value={statsGroupBy}
                onChange={(e) => setStatsGroupBy(e.target.value)}
              >
                <option value="day">По дням</option>
                <option value="month">По месяцам</option>
              </select>
            </label>
            <button className="cabinet-btn cabinet-btn--active" onClick={loadStats} disabled={statsLoading}>
              {statsLoading ? 'Загрузка…' : 'Показать'}
            </button>
          </div>
          {statsError && <p className="slot-machine__error">{statsError}</p>}
          {stats && stats.length === 0 && <p className="history-card__empty">Нет данных за этот период</p>}
          {stats && stats.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Период</th>
                  <th>Игроков</th>
                  <th>Ставок</th>
                  <th>Выплат</th>
                  <th>Прибыль</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.period}>
                    <td>{periodFormatter.format(new Date(s.period))}</td>
                    <td>{s.playersCount}</td>
                    <td>{s.totalBet.toLocaleString('ru-RU')}</td>
                    <td>{s.totalPayout.toLocaleString('ru-RU')}</td>
                    <td className={s.profit >= 0 ? 'history-item__net--win' : 'history-item__net--lose'}>
                      {s.profit >= 0 ? '+' : ''}
                      {s.profit.toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Создать акцию (промокод)</h2>
          <form className="admin-inline-form" onSubmit={handleCreatePromo}>
            <input
              className="field__input"
              name="code"
              placeholder="Код (например WELCOME50)"
              value={promoForm.code}
              onChange={handlePromoFormChange}
              required
            />
            <input
              className="field__input"
              type="number"
              min="1"
              name="bonusAmount"
              placeholder="Бонус (жетонов)"
              value={promoForm.bonusAmount}
              onChange={handlePromoFormChange}
              required
            />
            <input
              className="field__input"
              type="number"
              min="1"
              name="maxUses"
              placeholder="Макс. активаций (необязательно)"
              value={promoForm.maxUses}
              onChange={handlePromoFormChange}
            />
            <input
              className="field__input"
              type="date"
              name="expiresAt"
              value={promoForm.expiresAt}
              onChange={handlePromoFormChange}
            />
            <button className="cabinet-btn cabinet-btn--active" type="submit" disabled={creatingPromo}>
              {creatingPromo ? 'Создаём…' : 'Создать'}
            </button>
          </form>
          {promoFormError && <p className="slot-machine__error">{promoFormError}</p>}
        </div>

        <div className="admin-block">
          <h2 className="admin-block__title">Акции ({promotions?.length ?? 0})</h2>
          {promoStats && (
            <div className="history-stats">
              <div className="history-stats__card">
                <span className="history-stats__game">Всего акций</span>
                <span className="history-stats__row">{promoStats.total} (активно: {promoStats.active})</span>
              </div>
              <div className="history-stats__card">
                <span className="history-stats__game">Активаций</span>
                <span className="history-stats__row">{promoStats.redemptions}</span>
              </div>
              <div className="history-stats__card">
                <span className="history-stats__game">Роздано жетонов</span>
                <span className="history-stats__net history-item__net--lose">
                  −{promoStats.tokensGiven.toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
          )}
          {promoActionError && <p className="slot-machine__error">{promoActionError}</p>}
          {promotions && promotions.length === 0 && <p className="history-card__empty">Пока нет акций</p>}
          {promotions && promotions.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Бонус</th>
                  <th>Использовано</th>
                  <th>Статус</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.code}</td>
                    <td>{p.bonusAmount.toLocaleString('ru-RU')}</td>
                    <td>
                      {p.usesCount}
                      {p.maxUses ? ` / ${p.maxUses}` : ''}
                    </td>
                    <td>
                      <span className={`admin-status ${p.isActive ? 'admin-status--active' : 'admin-status--blocked'}`}>
                        {p.isActive ? 'Активна' : 'Отключена'}
                      </span>
                    </td>
                    <td>
                      {p.isActive && (
                        <button
                          className="cabinet-btn cabinet-btn--stop"
                          onClick={() => handleDeactivatePromo(p.id)}
                          disabled={promoActionId === p.id}
                        >
                          Отключить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

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
          {operatorBalanceError && <p className="slot-machine__error">{operatorBalanceError}</p>}
          {operators && operators.length === 0 && <p className="history-card__empty">Пока нет операторов</p>}
          {operators && operators.length > 0 && (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Игроков</th>
                  <th>Баланс игроков</th>
                  <th>Пополнить оператору</th>
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
                    <td>
                      <div className="admin-adjust">
                        <input
                          className="admin-adjust__input"
                          type="number"
                          min="1"
                          placeholder="0"
                          value={operatorBalanceAmounts[o.id] || ''}
                          onChange={(e) =>
                            setOperatorBalanceAmounts((prev) => ({ ...prev, [o.id]: e.target.value }))
                          }
                        />
                        <button
                          className="cabinet-btn"
                          onClick={() => handleOperatorBalanceAdjust(o.id, 1)}
                          disabled={operatorBalanceId === o.id}
                        >
                          +
                        </button>
                        <button
                          className="cabinet-btn"
                          onClick={() => handleOperatorBalanceAdjust(o.id, -1)}
                          disabled={operatorBalanceId === o.id}
                        >
                          −
                        </button>
                      </div>
                    </td>
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
