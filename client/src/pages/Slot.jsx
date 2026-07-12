import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import MarqueeButton from '../components/MarqueeButton.jsx';

const SYMBOL_DISPLAY = {
  7: '7',
  BAR: 'BAR',
  BELL: '🔔',
  CHERRY: '🍒',
};

const SPIN_ANIMATION_SYMBOLS = ['7', 'BAR', 'BELL', 'CHERRY'];
const SPIN_DURATION_MS = 900;

function randomSymbol() {
  return SPIN_ANIMATION_SYMBOLS[Math.floor(Math.random() * SPIN_ANIMATION_SYMBOLS.length)];
}

export default function Slot() {
  const { user, token, updateBalance } = useAuth();

  const [paytable, setPaytable] = useState(null);
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState(['7', 'BAR', 'BELL']);
  const [spinning, setSpinning] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState(null);
  const [error, setError] = useState('');

  const spinIntervalRef = useRef(null);

  useEffect(() => {
    api
      .getPaytable()
      .then((data) => {
        setPaytable(data);
        setBet((current) => Math.min(Math.max(current, data.minBet), data.maxBet));
      })
      .catch(() => {});

    return () => clearInterval(spinIntervalRef.current);
  }, []);

  const handleBetChange = (e) => {
    setBet(Number(e.target.value));
  };

  const handleSpin = async () => {
    if (spinning || !paytable) return;

    setError('');
    setResultMessage('');
    setResultType(null);

    if (bet < paytable.minBet || bet > paytable.maxBet) {
      setError(`Ставка должна быть от ${paytable.minBet} до ${paytable.maxBet}`);
      return;
    }
    if (user && bet > user.balance) {
      setError('Недостаточно жетонов для этой ставки');
      return;
    }

    setSpinning(true);
    spinIntervalRef.current = setInterval(() => {
      setReels([randomSymbol(), randomSymbol(), randomSymbol()]);
    }, 80);

    try {
      const [result] = await Promise.all([
        api.spin(bet, token),
        new Promise((resolve) => setTimeout(resolve, SPIN_DURATION_MS)),
      ]);

      clearInterval(spinIntervalRef.current);
      setReels(result.reels);
      updateBalance(result.balance);

      if (result.payout > 0) {
        setResultType('win');
        setResultMessage(`Выигрыш! +${result.payout.toLocaleString('ru-RU')} жетонов`);
      } else {
        setResultType('lose');
        setResultMessage('Не повезло, попробуйте ещё раз');
      }
    } catch (err) {
      clearInterval(spinIntervalRef.current);
      setError(err.message);
    } finally {
      setSpinning(false);
    }
  };

  if (!user) return null;

  return (
    <main className="slot-page">
      <section className="slot-machine">
        <p className="slot-machine__balance">
          Баланс: <strong>{user.balance.toLocaleString('ru-RU')}</strong> жетонов
        </p>

        <div className={`reels ${spinning ? 'reels--spinning' : ''}`}>
          {reels.map((symbol, index) => (
            <div className="reel" key={index}>
              <span className={`reel__symbol reel__symbol--${symbol}`}>{SYMBOL_DISPLAY[symbol]}</span>
            </div>
          ))}
        </div>

        <div className="slot-machine__status" aria-live="polite">
          {resultMessage && (
            <p className={`slot-machine__result slot-machine__result--${resultType}`}>{resultMessage}</p>
          )}
          {error && <p className="slot-machine__error">{error}</p>}
        </div>

        <div className="bet-control">
          <label className="bet-control__label" htmlFor="bet-range">
            Ставка: {bet} жетонов
          </label>
          <input
            id="bet-range"
            type="range"
            min={paytable?.minBet || 1}
            max={paytable?.maxBet || 500}
            value={bet}
            onChange={handleBetChange}
            disabled={spinning}
          />
        </div>

        <MarqueeButton onClick={handleSpin} disabled={spinning}>
          {spinning ? 'Крутим…' : 'Крутить'}
        </MarqueeButton>

        {paytable && (
          <table className="paytable">
            <thead>
              <tr>
                <th>Комбинация</th>
                <th>Выплата</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(paytable.payouts).map(([symbol, multiplier]) => (
                <tr key={symbol}>
                  <td>
                    {SYMBOL_DISPLAY[symbol]} {SYMBOL_DISPLAY[symbol]} {SYMBOL_DISPLAY[symbol]}
                  </td>
                  <td>× {multiplier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <Link to="/profile" className="slot-machine__back">
          ← Назад в профиль
        </Link>
      </section>
    </main>
  );
}
