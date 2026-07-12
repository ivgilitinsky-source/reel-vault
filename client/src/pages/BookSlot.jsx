import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const SYMBOL_LABELS = {
  TEN: '10',
  JACK: 'J',
  QUEEN: 'Q',
  KING: 'K',
  ACE: 'A',
  ANKH: 'Анкх',
  EYE: 'Глаз',
  SCARAB: 'Скарабей',
  PYRAMID: 'Пирамида',
  BOOK: 'Книга',
};

const ALL_SYMBOLS = Object.keys(SYMBOL_LABELS);
const REELS = 5;
const ROWS = 3;
const SPIN_DURATION_MS = 1100;
const AUTO_SPIN_COUNT = 10;

const PAYLINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
];

const LINE_COLORS = [
  '#ffd400',
  '#ff3b3b',
  '#29c7ff',
  '#ff9f1c',
  '#b6e34d',
  '#ffffff',
  '#29ffb0',
  '#a259ff',
  '#ff4fa3',
];

function randomGrid() {
  const grid = [];
  for (let r = 0; r < REELS; r++) {
    const col = [];
    for (let row = 0; row < ROWS; row++) {
      col.push(ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)]);
    }
    grid.push(col);
  }
  return grid;
}

export default function BookSlot() {
  const { user, token, updateBalance } = useAuth();

  const [paytable, setPaytable] = useState(null);
  const [betPerLine, setBetPerLine] = useState(1);
  const [activeLines, setActiveLines] = useState(9);
  const [grid, setGrid] = useState(randomGrid());
  const [spinning, setSpinning] = useState(false);
  const [winningLines, setWinningLines] = useState([]);
  const [scatterInfo, setScatterInfo] = useState(null);
  const [resultMessage, setResultMessage] = useState('');
  const [resultType, setResultType] = useState(null);
  const [error, setError] = useState('');
  const [bonus, setBonus] = useState(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState(0);

  const spinIntervalRef = useRef(null);
  const autoSpinTimeoutRef = useRef(null);
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    api
      .getBookPaytable()
      .then((data) => {
        setPaytable(data);
        setBetPerLine((current) => Math.min(Math.max(current, data.minBetPerLine), data.maxBetPerLine));
      })
      .catch(() => {});

    return () => {
      clearInterval(spinIntervalRef.current);
      clearTimeout(autoSpinTimeoutRef.current);
    };
  }, []);

  const totalBet = betPerLine * activeLines;

  const handleBetChange = (e) => {
    setBetPerLine(Number(e.target.value));
  };

  const setMinBet = () => {
    if (paytable) setBetPerLine(paytable.minBetPerLine);
  };

  const setMaxBet = () => {
    if (paytable) setBetPerLine(paytable.maxBetPerLine);
  };

  const selectLines = (count) => {
    if (!spinning && !bonus) setActiveLines(count);
  };

  const runSpin = async (isBonusSpin) => {
    setError('');
    setResultMessage('');
    setResultType(null);
    setWinningLines([]);
    setScatterInfo(null);

    setSpinning(true);
    spinIntervalRef.current = setInterval(() => {
      setGrid(randomGrid());
    }, 70);

    try {
      const [result] = await Promise.all([
        api.bookSpin({ betPerLine, activeLines, isBonusSpin, luckySymbol: bonus?.luckySymbol }, token),
        new Promise((resolve) => setTimeout(resolve, SPIN_DURATION_MS)),
      ]);

      clearInterval(spinIntervalRef.current);
      setGrid(result.grid);
      setWinningLines(result.winningLines || []);
      setScatterInfo(result.scatter);
      updateBalance(result.balance);

      if (isBonusSpin) {
        const remaining = bonus.remaining - 1 + (result.freeSpinsAwarded || 0);
        setBonus(remaining > 0 ? { remaining, luckySymbol: bonus.luckySymbol } : null);
      } else if (result.freeSpinsAwarded > 0) {
        setBonus({ remaining: result.freeSpinsAwarded, luckySymbol: result.luckySymbol });
      }

      if (result.totalPayout > 0) {
        setResultType('win');
        setResultMessage(`Выигрыш! +${result.totalPayout.toLocaleString('ru-RU')} жетонов`);
      } else {
        setResultType('lose');
        setResultMessage('Не повезло, попробуйте ещё раз');
      }

      return true;
    } catch (err) {
      clearInterval(spinIntervalRef.current);
      setError(err.message);
      return false;
    } finally {
      setSpinning(false);
    }
  };

  const handleSpin = async () => {
    if (spinning || !paytable) return;
    const isBonusSpin = Boolean(bonus);

    if (!isBonusSpin) {
      if (betPerLine < paytable.minBetPerLine || betPerLine > paytable.maxBetPerLine) {
        setError(`Ставка на линию должна быть от ${paytable.minBetPerLine} до ${paytable.maxBetPerLine}`);
        return;
      }
      if (user && totalBet > user.balance) {
        setError('Недостаточно жетонов для этой ставки');
        return;
      }
    }

    await runSpin(isBonusSpin);
  };

  const stopAutoSpin = () => {
    stopRequestedRef.current = true;
    setAutoSpinsLeft(0);
    clearTimeout(autoSpinTimeoutRef.current);
  };

  const startAutoSpin = () => {
    if (spinning || !paytable || bonus) return;
    if (user && totalBet > user.balance) {
      setError('Недостаточно жетонов для этой ставки');
      return;
    }
    stopRequestedRef.current = false;
    setAutoSpinsLeft(AUTO_SPIN_COUNT);
  };

  useEffect(() => {
    if (autoSpinsLeft <= 0 || spinning || bonus) return;
    if (stopRequestedRef.current) {
      setAutoSpinsLeft(0);
      return;
    }
    if (user && totalBet > user.balance) {
      setAutoSpinsLeft(0);
      setError('Недостаточно жетонов, авто-запуск остановлен');
      return;
    }

    autoSpinTimeoutRef.current = setTimeout(async () => {
      const ok = await runSpin(false);
      if (ok && !stopRequestedRef.current) {
        setAutoSpinsLeft((n) => n - 1);
      } else {
        setAutoSpinsLeft(0);
      }
    }, 400);

    return () => clearTimeout(autoSpinTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpinsLeft, spinning, bonus]);

  if (!user) return null;

  const isAutoSpinning = autoSpinsLeft > 0;

  return (
    <main className="book-page">
      <section className="book-machine">
        <p className="slot-machine__balance">
          Баланс: <strong>{user.balance.toLocaleString('ru-RU')}</strong> жетонов
        </p>

        {bonus && (
          <p className="book-machine__bonus-banner">
            🎁 Бонус! Осталось бесплатных вращений: {bonus.remaining} · Счастливый символ:{' '}
            {SYMBOL_LABELS[bonus.luckySymbol]}
          </p>
        )}

        <div className={`book-grid ${spinning ? 'book-grid--spinning' : ''}`}>
          {grid.map((column, reelIndex) => (
            <div className="book-grid__reel" key={reelIndex}>
              {column.map((symbol, rowIndex) => (
                <div key={rowIndex} className={`book-cell book-cell--${symbol}`}>
                  {SYMBOL_LABELS[symbol]}
                </div>
              ))}
            </div>
          ))}

          {!spinning && (
            <svg className="book-lines-overlay" viewBox="0 0 500 300" preserveAspectRatio="none">
              {PAYLINES.slice(0, activeLines).map((line, lineIndex) => {
                const isWinning = winningLines.some((w) => w.lineIndex === lineIndex);
                const points = line.map((row, reel) => `${reel * 100 + 50},${row * 100 + 50}`).join(' ');
                return (
                  <polyline
                    key={lineIndex}
                    points={points}
                    fill="none"
                    stroke={LINE_COLORS[lineIndex]}
                    strokeWidth={isWinning ? 6 : 2.5}
                    opacity={isWinning ? 1 : 0.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>
          )}
        </div>

        <div className="slot-machine__status" aria-live="polite">
          {resultMessage && (
            <p className={`slot-machine__result slot-machine__result--${resultType}`}>{resultMessage}</p>
          )}
          {error && <p className="slot-machine__error">{error}</p>}
        </div>

        {(winningLines.length > 0 || (scatterInfo && scatterInfo.payout > 0)) && (
          <ul className="book-wins">
            {winningLines.map((line, i) => (
              <li key={i}>
                Линия {line.lineIndex + 1}: {SYMBOL_LABELS[line.symbol]} × {line.count} → +
                {line.payout.toLocaleString('ru-RU')}
              </li>
            ))}
            {scatterInfo && scatterInfo.payout > 0 && (
              <li>
                Книга × {scatterInfo.count} (по всей сетке) → +{scatterInfo.payout.toLocaleString('ru-RU')}
              </li>
            )}
          </ul>
        )}

        {!bonus && (
          <div className="bet-control">
            <label className="bet-control__label" htmlFor="book-bet-range">
              Ставка на линию: {betPerLine} · линий: {activeLines} · всего: {totalBet}
            </label>
            <input
              id="book-bet-range"
              type="range"
              min={paytable?.minBetPerLine || 1}
              max={paytable?.maxBetPerLine || 50}
              value={betPerLine}
              onChange={handleBetChange}
              disabled={spinning || isAutoSpinning}
            />
          </div>
        )}

        <div className="cabinet-panel">
          <div className="cabinet-panel__group">
            <button className="cabinet-btn" onClick={() => setShowPaytable((v) => !v)}>
              Выплаты
            </button>
          </div>

          <div className="cabinet-panel__group">
            {(paytable?.allowedLineCounts || [1, 3, 5, 7, 9]).map((count) => (
              <button
                key={count}
                className={`cabinet-btn cabinet-btn--line ${activeLines === count ? 'cabinet-btn--active' : ''}`}
                onClick={() => selectLines(count)}
                disabled={spinning || isAutoSpinning || Boolean(bonus)}
              >
                {count} лин.
              </button>
            ))}
          </div>

          <div className="cabinet-panel__group">
            <button
              className="cabinet-btn"
              onClick={setMinBet}
              disabled={spinning || isAutoSpinning || Boolean(bonus)}
            >
              Мин ставка
            </button>
            <button
              className="cabinet-btn"
              onClick={setMaxBet}
              disabled={spinning || isAutoSpinning || Boolean(bonus)}
            >
              Макс ставка
            </button>
          </div>

          <div className="cabinet-panel__group cabinet-panel__group--main">
            {isAutoSpinning ? (
              <button className="cabinet-btn cabinet-btn--stop" onClick={stopAutoSpin}>
                Стоп ({autoSpinsLeft})
              </button>
            ) : (
              <button className="cabinet-btn cabinet-btn--spin" onClick={handleSpin} disabled={spinning}>
                {spinning ? 'Крутим…' : bonus ? `Бонус (${bonus.remaining})` : 'Запуск'}
              </button>
            )}
            <button
              className="cabinet-btn"
              onClick={startAutoSpin}
              disabled={spinning || isAutoSpinning || Boolean(bonus)}
            >
              Авто запуск
            </button>
          </div>
        </div>

        {showPaytable && paytable && (
          <table className="paytable">
            <thead>
              <tr>
                <th>Символ</th>
                <th>×3</th>
                <th>×4</th>
                <th>×5</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(paytable.linePaytable).map(([symbol, tiers]) => (
                <tr key={symbol}>
                  <td>{SYMBOL_LABELS[symbol]}</td>
                  <td>{tiers[3]}</td>
                  <td>{tiers[4]}</td>
                  <td>{tiers[5]}</td>
                </tr>
              ))}
              <tr>
                <td>{SYMBOL_LABELS.BOOK} (скаттер)</td>
                <td>×{paytable.scatterPaytable[3]}</td>
                <td>×{paytable.scatterPaytable[4]}</td>
                <td>×{paytable.scatterPaytable[5]}</td>
              </tr>
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
