import { useAuth } from '../context/AuthContext.jsx';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

export default function Profile() {
  const { user } = useAuth();

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

        <p className="profile-card__hint">Игровой автомат и история игр скоро появятся здесь.</p>
      </section>
    </main>
  );
}
