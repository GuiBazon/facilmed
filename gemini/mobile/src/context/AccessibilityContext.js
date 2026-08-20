import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AccessibilityContext = createContext();

export function AccessibilityProvider({ children, initialMode = 'PADRAO' }) {
  const [isSimplified, setIsSimplified] = useState(initialMode === 'SIMPLIFICADO');

  const toggleMode = async () => {
    const next = !isSimplified;
    setIsSimplified(next);
    try {
      await api.updatePreferencias(next ? 'SIMPLIFICADO' : 'PADRAO');
    } catch (e) {
      console.warn('Erro ao sincronizar preferência:', e.message);
    }
  };

  const theme = {
    isSimplified,
    fontSize: {
      xs: isSimplified ? 16 : 11,
      sm: isSimplified ? 18 : 13,
      base: isSimplified ? 22 : 15,
      lg: isSimplified ? 26 : 18,
      xl: isSimplified ? 30 : 22,
      xxl: isSimplified ? 36 : 28
    },
    buttonHeight: isSimplified ? 64 : 48,
    colors: {
      primary: isSimplified ? '#0f766e' : '#0d9488',
      background: isSimplified ? '#fffbeb' : '#f8fafc',
      card: '#ffffff',
      text: isSimplified ? '#1e293b' : '#334155',
      heading: isSimplified ? '#0f172a' : '#0f172a',
      accent: isSimplified ? '#d97706' : '#14b8a6',
      border: isSimplified ? '#f59e0b' : '#e2e8f0',
      highContrastBadge: isSimplified ? '#78350f' : '#0f766e'
    }
  };

  return (
    <AccessibilityContext.Provider value={{ isSimplified, setIsSimplified, toggleMode, theme }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  return useContext(AccessibilityContext);
}
