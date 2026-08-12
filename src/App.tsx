import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateFolder from './pages/CreateFolder';
import ScanFolder from './pages/ScanFolder';
import JoinFolder from './pages/JoinFolder';
import MyFolders from './pages/MyFolders';
import FolderView from './pages/FolderView';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create" element={<CreateFolder />} />
      <Route path="/scan" element={<ScanFolder />} />
      <Route path="/join/:folderId" element={<JoinFolder />} />
      <Route path="/my-folders" element={<MyFolders />} />
      <Route path="/folder/:folderId" element={<FolderView />} />
    </Routes>
  );
}
