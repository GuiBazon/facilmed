import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, usuarios } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await usuarios.getPerfil();
        setUser(response.data);
      }
    } catch (error) {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(cpf, senha) {
    const response = await auth.login({ cpf, senha });
    await AsyncStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  }

  async function register(data) {
    const response = await auth.register(data);
    await AsyncStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    setUser(null);
  }

  async function toggleInterface() {
    const newType = user.tipo_interface === 'PADRAO' ? 'SIMPLIFICADO' : 'PADRAO';
    await usuarios.atualizarInterface(newType);
    setUser({ ...user, tipo_interface: newType });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, toggleInterface, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
