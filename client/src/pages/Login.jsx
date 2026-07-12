import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MarqueeButton from '../components/MarqueeButton.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await login(form.identifier, form.password);
      navigate('/profile');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-card__title">Вход</h1>

        {formError && (
          <p className="auth-card__error" role="alert">
            {formError}
          </p>
        )}

        <label className="field">
          <span className="field__label">Логин или email</span>
          <input
            className="field__input"
            name="identifier"
            value={form.identifier}
            onChange={handleChange}
            autoComplete="username"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Пароль</span>
          <input
            className="field__input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
          />
        </label>

        <MarqueeButton type="submit" className="auth-card__submit" disabled={submitting}>
          {submitting ? 'Входим…' : 'Войти'}
        </MarqueeButton>

        <p className="auth-card__switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </form>
    </main>
  );
}
