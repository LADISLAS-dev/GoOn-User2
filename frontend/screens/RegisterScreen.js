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
import { Ionicons } from '@expo/vector-icons';

const GUEST_LABELS = {
  fr: "Continuer en tant qu'invité",
  en: 'Continue as Guest',
  es: 'Continuar como invitado',
  pt: 'Continuar como convidado',
  zh: '以访客身份继续',
  hi: 'अतिथि के रूप में जारी रखें',
  ar: 'المتابعة كضيف',
  bn: 'অতিথি হিসেবে চালিয়ে যান',
  ru: 'Продолжить как гость',
  ja: 'ゲストとして続ける',
  de: 'Als Gast fortfahren',
  id: 'Lanjutkan sebagai tamu',
  ur: 'مہمان کے طور پر جاری رکھیں',
};

export default function RegisterScreen({ navigation }) {
  const { register, isLoading, continueAsGuest } = useUser();
  const { t, language } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [authError, setAuthError] = useState('');

  const resolveAuthErrorMessage = (res) => {
    const deletedMessage = t(
      'authAccountDeleted',
      'This account has been permanently deleted. You cannot sign in or create a new account with this email anymore.'
    );

    if (String(res?.errorCode || '').toUpperCase() === 'ACCOUNT_DELETED') {
      return deletedMessage;
    }

    const rawError = String(res?.error || '');
    if (/account has been deleted|cannot sign in anymore|cannot be used anymore/i.test(rawError)) {
      return deletedMessage;
    }

    return rawError || t('registerFailed', 'Unable to create your account. Please try again.');
  };

  const handleRegister = async () => {
    setAuthError('');
    if (password !== confirmPassword) {
      setAuthError(t('passwordsDoNotMatch', 'Passwords do not match.'));
      return;
    }

    // On envoie juste les infos utilisateur normales, pas de rôle
    const res = await register(email, password, name);

    if (!res.success) {
      const message = resolveAuthErrorMessage(res);
      setAuthError(message);
      console.log(message);
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
            onChangeText={(value) => {
              setName(value);
              if (authError) setAuthError('');
            }}
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
            onChangeText={(value) => {
              setEmail(value);
              if (authError) setAuthError('');
            }}
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
              onChangeText={(value) => {
                setPassword(value);
                if (authError) setAuthError('');
              }}
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
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (authError) setAuthError('');
            }}
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

        {!!authError ? <Text style={styles.errorText}>{authError}</Text> : null}

        {/* Continue as Guest */}
        <TouchableOpacity
          onPress={() => {
            continueAsGuest();
            navigation.replace('Home');
          }}
          style={styles.guestButton}
          activeOpacity={0.8}
        >
          <Ionicons name="globe-outline" size={18} color="#8F2AC3" />
          <Text style={styles.guestButtonText}>{GUEST_LABELS[language] || GUEST_LABELS.en}</Text>
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
  errorText: {
    color: '#C0392B',
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#c6b8da',
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8F2AC3',
  },
});