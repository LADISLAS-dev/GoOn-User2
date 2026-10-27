import React, { useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { acceptCompanyInvitation } from '../services/api';

const COLORS = {
  background: '#F7F5F1',
  surface: '#FFFFFF',
  border: '#E8E1D7',
  text: '#17161D',
  textSoft: '#6F6A63',
  accent: '#7C3AED',
  danger: '#A83232',
};

export default function ProAcceptTeamInvitationScreen({ navigation }) {
  const { activeLanguage } = useLanguage();
  const { user, isGuest } = useUser();
  const isFrench = activeLanguage === 'fr';
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const copy = isFrench
    ? {
        title: 'Rejoindre une équipe', subtitle: 'Saisissez le code d’invitation reçu.',
        code: 'Code d’invitation', accept: 'Accepter l’invitation',
        signIn: 'Connectez-vous avec l’adresse e-mail invitée avant de continuer.',
        error: 'Impossible d’accepter cette invitation.',
      }
    : {
        title: 'Join a team', subtitle: 'Enter the invitation code you received.',
        code: 'Invitation code', accept: 'Accept invitation',
        signIn: 'Sign in using the invited email address before continuing.',
        error: 'Unable to accept this invitation.',
      };

  const acceptInvitation = async () => {
    if (isGuest || !token.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const membership = await acceptCompanyInvitation(token.trim());
      navigation.navigate('MainTabs', {
        companyId: String(membership.companyId),
        currentUserId: String(user?._id || ''),
      });
    } catch (acceptError) {
      setError(acceptError?.response?.data?.error || acceptError?.message || copy.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>GOON · TEAM ACCESS</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        {isGuest && <Text style={styles.signInText}>{copy.signIn}</Text>}

        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder={copy.code}
          placeholderTextColor="#8F8980"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          accessibilityLabel={copy.code}
        />

        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, (!token.trim() || isGuest || isSubmitting) && styles.buttonDisabled]}
          onPress={acceptInvitation}
          disabled={!token.trim() || isGuest || isSubmitting}
          accessibilityRole="button"
        >
          {isSubmitting
            ? <ActivityIndicator color="#FFFFFF" />
            : <Text style={styles.buttonText}>{copy.accept}</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 60 },
  eyebrow: { color: COLORS.accent, fontSize: 10, fontWeight: '900', marginBottom: 9 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 22 },
  signInText: { color: COLORS.textSoft, fontSize: 12, marginBottom: 10 },
  input: { minHeight: 50, paddingHorizontal: 13, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, fontSize: 15 },
  error: { color: COLORS.danger, fontSize: 12, marginTop: 10 },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 16, borderRadius: 9, backgroundColor: COLORS.accent },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});