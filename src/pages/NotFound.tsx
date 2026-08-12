import { Link } from 'react-router-dom';
import { AlertIcon } from '../components/icons';

export default function NotFound() {
  return (
    <main className="not-found">
      <div className="empty-state">
        <AlertIcon size={32} />
        <h1>הדף לא נמצא</h1>
      </div>
      <Link className="home-button" to="/">
        <span className="home-button-text">
          <span className="home-button-title">חזרה לדף הבית</span>
        </span>
      </Link>
    </main>
  );
}
