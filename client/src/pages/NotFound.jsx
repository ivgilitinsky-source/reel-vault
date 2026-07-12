import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>404</h1>
      <p>Такой страницы нет в клубе.</p>
      <Link to="/">На главную</Link>
    </main>
  );
}
