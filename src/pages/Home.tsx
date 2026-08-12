import { Link } from 'react-router-dom';
import { CameraIcon, QrCodeIcon, FolderIcon } from '../components/icons';

export default function Home() {
  return (
    <main className="home">
      <div className="home-header">
        <h1>Wedding Cam</h1>
        <p className="subtitle">אלבום משותף לכל האירוע - צלמו, שתפו, תיהנו</p>
      </div>
      <div className="home-actions">
        <Link className="home-button" to="/create">
          <span className="home-button-icon"><CameraIcon /></span>
          <span className="home-button-text">
            <span className="home-button-title">צור תיקייה</span>
            <span className="home-button-subtitle">התחל אלבום חדש ושתף QR</span>
          </span>
        </Link>
        <Link className="home-button" to="/scan">
          <span className="home-button-icon"><QrCodeIcon /></span>
          <span className="home-button-text">
            <span className="home-button-title">סרוק קוד</span>
            <span className="home-button-subtitle">הצטרף לתיקייה קיימת</span>
          </span>
        </Link>
        <Link className="home-button" to="/my-folders">
          <span className="home-button-icon"><FolderIcon /></span>
          <span className="home-button-text">
            <span className="home-button-title">התיקיות שלי</span>
            <span className="home-button-subtitle">כל האלבומים שלך במקום אחד</span>
          </span>
        </Link>
      </div>
    </main>
  );
}
