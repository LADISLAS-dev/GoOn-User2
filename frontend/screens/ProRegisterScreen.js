import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterScreen({ navigation }) {
  const { register, isLoading } = useUser();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      console.log('Passwords do not match');
      return;
    }

    // On envoie juste les infos utilisateur normales, pas de rôle
    const res = await register(email, password, name);

    if (!res.success) {
      console.log(res.error);
    }
  };

  const isDisabled = !email || !password || !name || !confirmPassword || isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t('registerTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('registerSubtitle')}
        </Text>

        {/* NAME */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('name')}</Text>
          <TextInput
            placeholder={t('name')}
            placeholderTextColor="#8E8E93"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        </View>

        {/* EMAIL */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('email')}</Text>
          <TextInput
            placeholder={t('email')}
            placeholderTextColor="#8E8E93"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        {/* PASSWORD */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              style={styles.inputFlex}
            />
            <TouchableOpacity onPress={() => setSecure(!secure)}>
              <Text style={styles.show}>
                {secure ? t('show') : t('hide')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CONFIRM PASSWORD */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>{t('confirmPassword')}</Text>
          <TextInput
            placeholder="••••••••"
            placeholderTextColor="#8E8E93"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={styles.input}
          />
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={isDisabled}
          style={[
            styles.button,
            isDisabled && styles.buttonDisabled,
          ]}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('createAccount')}</Text>
          )}
        </TouchableOpacity>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('alreadyAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerTextStrong}>{t('signIn')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0E6F8',
    justifyContent: 'center',
    padding: 20,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    shadowColor: '#7421A8',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#251A34',
    marginBottom: 6,
    letterSpacing: -0.5,
  },

  subtitle: {
    color: '#8B7A9F',
    marginBottom: 24,
    fontSize: 14,
    fontWeight: '500',
  },

  inputBox: {
    marginBottom: 16,
  },

  label: {
    color: '#7421A8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  input: {
    backgroundColor: '#F9F5FE',
    borderRadius: 14,
    padding: 14,
    color: '#251A34',
    borderWidth: 1,
    borderColor: '#D9D2E8',
    fontSize: 15,
  },

  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F5FE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9D2E8',
    paddingRight: 12,
  },

  inputFlex: {
    flex: 1,
    padding: 14,
    color: '#251A34',
    fontSize: 15,
  },

  show: {
    color: '#8F2AC3',
    fontWeight: '700',
    fontSize: 13,
  },

  button: {
    backgroundColor: '#8F2AC3',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#7421A8',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },

  footerText: {
    color: '#8B7A9F',
    fontSize: 14,
    fontWeight: '500',
  },

  footerTextStrong: {
    color: '#8F2AC3',
    fontWeight: '800',
    fontSize: 14,
  },
});