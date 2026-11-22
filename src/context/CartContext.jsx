import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { products } from '../data/products.js';

const STORAGE_KEY = 'ammi-maju-cart';
const CartContext = createContext(null);

function readCart() {
  const savedCart = window.localStorage.getItem(STORAGE_KEY);
  if (!savedCart) return {};

  try {
    const parsedCart = JSON.parse(savedCart);
    if (!parsedCart || typeof parsedCart !== 'object' || Array.isArray(parsedCart)) {
      throw new TypeError('O conteúdo salvo não é um carrinho válido.');
    }

    return Object.fromEntries(
      Object.entries(parsedCart).filter(
        ([id, quantity]) =>
          products.some((product) => product.id === Number(id)) &&
          Number.isInteger(quantity) &&
          quantity > 0,
      ),
    );
  } catch (error) {
    console.error('Não foi possível ler o carrinho salvo.', error);
    window.localStorage.removeItem(STORAGE_KEY);
    return {};
  }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((productId) => {
    setCart((currentCart) => ({
      ...currentCart,
      [productId]: (currentCart[productId] ?? 0) + 1,
    }));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart((currentCart) => {
      const nextCart = { ...currentCart };
      delete nextCart[productId];
      return nextCart;
    });
  }, []);

  const changeQuantity = useCallback((productId, change) => {
    setCart((currentCart) => {
      const nextQuantity = (currentCart[productId] ?? 0) + change;
      if (nextQuantity <= 0) {
        const nextCart = { ...currentCart };
        delete nextCart[productId];
        return nextCart;
      }

      return { ...currentCart, [productId]: nextQuantity };
    });
  }, []);

  const value = useMemo(() => {
    const items = products
      .filter((product) => cart[product.id] > 0)
      .map((product) => ({ ...product, quantidade: cart[product.id] }));

    return {
      items,
      itemCount: items.reduce((total, item) => total + item.quantidade, 0),
      total: items.reduce((total, item) => total + item.valor * item.quantidade, 0),
      addToCart,
      removeFromCart,
      changeQuantity,
    };
  }, [addToCart, cart, changeQuantity, removeFromCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de CartProvider.');
  }
  return context;
}
