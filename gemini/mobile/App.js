import React, { useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import AgendamentoWizardScreen from './src/screens/AgendamentoWizardScreen';
import ChatSofiaScreen from './src/screens/ChatSofiaScreen';
import MinhasConsultasScreen from './src/screens/MinhasConsultasScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('login'); // 'login', 'home', 'agendar', 'chat', 'consultas'

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setScreen('home');
  };

  const handleLogout = () => {
    setUser(null);
    setScreen('login');
  };

  return (
    <AccessibilityProvider initialMode={user?.tipo_interface || 'PADRAO'}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.container}>
          {screen === 'login' && (
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          )}

          {screen === 'home' && (
            <HomeScreen
              user={user}
              onNavigate={(nextScreen) => setScreen(nextScreen)}
              onLogout={handleLogout}
            />
          )}

          {screen === 'agendar' && (
            <AgendamentoWizardScreen
              user={user}
              onBack={() => setScreen('home')}
              onComplete={() => setScreen('consultas')}
            />
          )}

          {screen === 'chat' && (
            <ChatSofiaScreen
              user={user}
              onBack={() => setScreen('home')}
            />
          )}

          {screen === 'consultas' && (
            <MinhasConsultasScreen
              user={user}
              onBack={() => setScreen('home')}
            />
          )}
        </View>
      </SafeAreaView>
    </AccessibilityProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0d9488',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
