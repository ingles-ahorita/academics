import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import HelloWorld from './pages/HelloWorld';
import './App.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/hello" element={<HelloWorld />} />
    </Routes>
  );
}


