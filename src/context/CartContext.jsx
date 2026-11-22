import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ammi-maju-cart-v2';
const CartContext = createContext(null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readCart() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { cart: {}, error: '' };
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new TypeError('O conteúdo salvo não é um carrinho válido.');
    }

    return {
      cart: Object.fromEntries(
        Object.entries(parsed).filter(
          ([id, quantity]) => UUID.test(id) && Number.isInteger(quantity) && quantity > 0,
        ),
      ),
      error: '',
    };
  } catch (error) {
    console.error('Não foi possível carregar o carrinho salvo.', error);
    return { cart: {}, error: 'O carrinho está temporariamente apenas nesta sessão.' };
  }
}

export function CartProvider({ children }) {
  const [initial] = useState(readCart);
  const [cart, setCart] = useState(initial.cart);
  const [storageError, setStorageError] = useState(initial.error);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      setStorageError('');
    } catch (error) {
      console.error('Não foi possível salvar o carrinho.', error);
      setStorageError('O navegador bloqueou o armazenamento; o carrinho não ficará salvo ao sair.');
    }
  }, [cart]);

  const addToCart = useCallback((product) => {
    const currentQuantity = cart[product.id] ?? 0;
    if (currentQuantity >= product.stock) {
      setMessage('Você já adicionou todas as unidades disponíveis desta peça.');
      return false;
    }
    setCart({ ...cart, [product.id]: currentQuantity + 1 });
    setMessage(`${product.name} foi adicionado ao carrinho.`);
    return true;
  }, [cart]);

  const removeFromCart = useCallback((productId) => {
    setCart((currentCart) => {
      const nextCart = { ...currentCart };
      delete nextCart[productId];
      return nextCart;
    });
    setMessage('Peça removida do carrinho.');
  }, []);

  const changeQuantity = useCallback((productId, change, maxQuantity) => {
    const nextQuantity = (cart[productId] ?? 0) + change;
    if (nextQuantity <= 0) {
      const nextCart = { ...cart };
      delete nextCart[productId];
      setCart(nextCart);
      return;
    }
    if (Number.isInteger(maxQuantity) && nextQuantity > maxQuantity) {
      setMessage('Não há mais unidades disponíveis desta peça.');
      return;
    }
    setCart({ ...cart, [productId]: nextQuantity });
  }, [cart]);

  const itemCount = Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  const clearMessage = useCallback(() => setMessage(''), []);
  const value = useMemo(() => ({
    cart,
    itemCount,
    storageError,
    message,
    addToCart,
    removeFromCart,
    changeQuantity,
    clearMessage,
  }), [cart, itemCount, storageError, message, addToCart, removeFromCart, changeQuantity, clearMessage]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider.');
  return context;
}
