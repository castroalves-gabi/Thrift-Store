import { Navigate, Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import AboutPage from './pages/AboutPage.jsx';
import CartPage from './pages/CartPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import HomePage from './pages/HomePage.jsx';
import StorePage from './pages/StorePage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import LooksPage from './pages/LooksPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrderStatusPage from './pages/OrderStatusPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import Footer from './components/Footer.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';

export default function App() {
  return (
    <>
      <Header />
      <a className="skip-link" href="#page-content">Pular para o conteúdo</a>
      <div id="page-content">
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
          <Route path="/produto/:slug" element={<ProductPage />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/looks" element={<LooksPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedido/:id" element={<OrderStatusPage />} />
          <Route path="/privacidade" element={<PrivacyPage page="privacy" />} />
          <Route path="/termos" element={<PrivacyPage page="terms" />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin/*" element={<AdminDashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </>
  );
}
