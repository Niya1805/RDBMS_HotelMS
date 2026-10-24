import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

const GUEST_STORAGE_KEY = 'grand_aurelia_active_guest';
const ADMIN_STORAGE_KEY = 'grand_aurelia_admin_passcode';

export function AppProvider({ children }) {
  const [activeGuest, setActiveGuestState] = useState(() => {
    try {
      const saved = localStorage.getItem(GUEST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [adminPasscode, setAdminPasscodeState] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [toasts, setToasts] = useState([]);

  const setActiveGuest = useCallback((guest) => {
    setActiveGuestState(guest);
    try {
      if (guest) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guest));
      } else {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const setAdminPasscode = useCallback((code) => {
    setAdminPasscodeState(code);
    try {
      if (code) {
        sessionStorage.setItem(ADMIN_STORAGE_KEY, code);
      } else {
        sessionStorage.removeItem(ADMIN_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        activeGuest,
        setActiveGuest,
        adminPasscode,
        setAdminPasscode,
        isAdminUnlocked: Boolean(adminPasscode),
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
