import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <main className="home">
      <h1>Wedding Cam</h1>
      <Link className="home-button" to="/create">צור תיקייה</Link>
      <Link className="home-button" to="/scan">סרוק קוד</Link>
      <Link className="home-button" to="/my-folders">התיקיות שלי</Link>
    </main>
  );
}
