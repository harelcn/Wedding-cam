import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>הדף לא נמצא</h1>
      <Link className="home-button" to="/">חזרה לדף הבית</Link>
    </main>
  );
}
