import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import AboutPage from './pages/AboutPage.jsx';
import CartPage from './pages/CartPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import HomePage from './pages/HomePage.jsx';
import StorePage from './pages/StorePage.jsx';

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/views/index.html" element={<Navigate to="/" replace />} />
        <Route path="/sobre" element={<AboutPage />} />
        <Route path="/views/sobre.html" element={<Navigate to="/sobre" replace />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route path="/views/contato.html" element={<Navigate to="/contato" replace />} />
        <Route path="/loja" element={<StorePage />} />
        <Route path="/views/loja.html" element={<Navigate to="/loja" replace />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/views/carrinho.html" element={<Navigate to="/carrinho" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
