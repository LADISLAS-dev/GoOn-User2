import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';

const copyByLanguage = {
  fr: {
    title: 'Aucune notification pour le moment',
    userA: 'Envoyez votre première notification',
    userB: 'En attente du premier message de User A',
  },
  en: {
    title: 'No notifications yet',
    userA: 'Send your first notification',
    userB: 'Waiting for User A to send a message',
  },
  es: {
    title: 'Aún no hay notificaciones',
    userA: 'Envía tu primera notificación',
    userB: 'Esperando que User A envíe un mensaje',
  },
  pt: {
    title: 'Ainda não há notificações',
    userA: 'Envie a sua primeira notificação',
    userB: 'Aguardando o primeiro envio do User A',
  },
};

const EmptyNotification = ({ isUserA }) => {
  const { language } = useLanguage();
  const copy = copyByLanguage[language] || copyByLanguage.en;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔕</Text>

      <Text style={styles.title}>{copy.title}</Text>

      <Text style={styles.subtitle}>{isUserA ? copy.userA : copy.userB}</Text>
    </View>
  );
};

export default EmptyNotification;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#171726',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A40',
    marginTop: 10,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  emoji: {
    fontSize: 42,
    marginBottom: 12,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },

  subtitle: {
    color: '#8A8AA3',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});