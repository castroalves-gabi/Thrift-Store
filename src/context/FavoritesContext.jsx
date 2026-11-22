import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ammi-maju-favorites-v1';
const FavoritesContext = createContext(null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readFavorites() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { ids: [], error: '' };
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError('Lista de favoritos inválida.');
    return { ids: [...new Set(parsed.filter((id) => typeof id === 'string' && UUID.test(id)))], error: '' };
  } catch (error) {
    console.error('Não foi possível carregar os favoritos.', error);
    return { ids: [], error: 'Não foi possível salvar favoritos neste navegador.' };
  }
}

export function FavoritesProvider({ children }) {
  const [initial] = useState(readFavorites);
  const [ids, setIds] = useState(initial.ids);
  const [error, setError] = useState(initial.error);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      setError('');
    } catch (storageError) {
      console.error('Não foi possível salvar os favoritos.', storageError);
      setError('O navegador bloqueou o armazenamento dos favoritos.');
    }
  }, [ids]);

  const toggle = useCallback((id) => {
    setIds((current) => current.includes(id)
      ? current.filter((savedId) => savedId !== id)
      : [...current, id]);
  }, []);
  const remove = useCallback((id) => {
    setIds((current) => current.filter((savedId) => savedId !== id));
  }, []);

  const value = useMemo(() => ({ ids, error, toggle, remove }), [ids, error, toggle, remove]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider.');
  return context;
}
