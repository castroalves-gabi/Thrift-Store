import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <FavoritesProvider>
          <CatalogProvider>
            <App />
          </CatalogProvider>
        </FavoritesProvider>
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
