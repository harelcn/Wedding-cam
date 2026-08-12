import { useNavigate } from 'react-router-dom';
import QrScanner from '../components/QrScanner';

export default function ScanFolder() {
  const navigate = useNavigate();

  function handleDecode(text: string) {
    try {
      const url = new URL(text);
      const match = url.pathname.match(/\/join\/([\w-]+)/);
      if (match) {
        navigate(`/join/${match[1]}`);
      }
    } catch {
      // Not a URL — ignore and keep scanning
    }
  }

  return (
    <main className="scan-folder">
      <h1>סרוק קוד</h1>
      <QrScanner onDecode={handleDecode} />
    </main>
  );
}
