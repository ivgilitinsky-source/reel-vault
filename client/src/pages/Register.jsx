import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import MarqueeButton from '../components/MarqueeButton.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});

    if (form.password !== form.confirm) {
      setFieldErrors({ confirm: 'Пароли не совпадают' });
      return;
    }

    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password);
      navigate('/profile');
    } catch (err) {
      setFormError(err.message);
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-card__title">Регистрация</h1>

        {formError && (
          <p className="auth-card__error" role="alert">
            {formError}
          </p>
        )}

        <label className="field">
          <span className="field__label">Имя пользователя</span>
          <input
            className="field__input"
            name="username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
            required
          />
          {fieldErrors.username && <span className="field__error">{fieldErrors.username}</span>}
        </label>

        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="field__input"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
          {fieldErrors.email && <span className="field__error">{fieldErrors.email}</span>}
        </label>

        <label className="field">
          <span className="field__label">Пароль</span>
          <input
            className="field__input"
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          {fieldErrors.password && <span className="field__error">{fieldErrors.password}</span>}
        </label>

        <label className="field">
          <span className="field__label">Повторите пароль</span>
          <input
            className="field__input"
            type="password"
            name="confirm"
            value={form.confirm}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          {fieldErrors.confirm && <span className="field__error">{fieldErrors.confirm}</span>}
        </label>

        <MarqueeButton type="submit" className="auth-card__submit" disabled={submitting}>
          {submitting ? 'Создаём аккаунт…' : 'Зарегистрироваться'}
        </MarqueeButton>

        <p className="auth-card__switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
    </main>
  );
}
