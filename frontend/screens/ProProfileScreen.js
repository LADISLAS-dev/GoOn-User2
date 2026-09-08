import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updateMyProfile } from '../services/api';
import { auth } from '../services/firebase';
import { useUser } from '../context/UserContext';
import { useLanguage } from '../context/LanguageContext';
import { API_URL } from '../env';
import {
  inferAvatarFileName,
  inferAvatarMimeType,
  isLocalAssetUri,
  resolveAvatarUri,
  sanitizeAvatarForServer,
} from '../utils/profileUtils';
import { useNavigation } from '@react-navigation/native';

const PURPLE = '#8B2FC9';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, updateUserProfile, refreshUserProfile } = useUser();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setBio(user?.bio || '');
    setAvatar(user?.avatar || '');
  }, [user?.name, user?.email, user?.bio, user?.avatar]);

  const pickAvatar = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatar(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Avatar picker error:', e?.message || e);
    }
  };

  const onSave = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const cleanBio = bio.trim();

    if (!cleanName || !cleanEmail) {
      return Alert.alert(t('info'), t('requiredNameEmail'));
    }

    const firebaseUid = auth.currentUser?.uid || user?.firebaseUid;
    if (!firebaseUid) {
      return Alert.alert(t('error'), t('noAuthenticatedUser'));
    }

    try {
      setSaving(true);
      const isLocalAvatar = isLocalAssetUri(avatar) && !String(avatar).includes('/uploads/');

      let payload;
      if (isLocalAvatar) {
        const formData = new FormData();
        formData.append('firebaseUid', firebaseUid);
        formData.append('name', cleanName);
        formData.append('email', cleanEmail);
        formData.append('bio', cleanBio);
        formData.append('avatarFile', {
          uri: avatar,
          name: inferAvatarFileName(avatar),
          type: inferAvatarMimeType(avatar),
        });
        payload = formData;
      } else {
        payload = {
          firebaseUid,
          name: cleanName,
          email: cleanEmail,
          bio: cleanBio,
          avatar: sanitizeAvatarForServer(avatar),
        };
      }

      const updated = await updateMyProfile(payload);

      if (!updated || typeof updated !== 'object') {
        throw new Error('Invalid profile response');
      }

      const optimistic = {
        ...user,
        ...updated,
        name: cleanName,
        email: cleanEmail,
        bio: cleanBio,
      };

      await updateUserProfile?.(optimistic);

      // Final source of truth from backend to keep Home/Profile/cache aligned.
      const synced = await refreshUserProfile?.(true);
      const finalProfile = synced || optimistic;

      setName(finalProfile?.name || cleanName);
      setEmail(finalProfile?.email || cleanEmail);
      setBio(finalProfile?.bio || cleanBio);
      setAvatar(finalProfile?.avatar || '');

      Alert.alert('OK', t('profileUpdated'), [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ProHome'),
        },
      ]);
    } catch (e) {
      console.warn('Profile save error:', e?.message || e);
      Alert.alert(t('error'), t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t('profileTitle')}</Text>

        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
          {resolveAvatarUri(avatar, API_URL) ? (
            <Image source={{ uri: resolveAvatarUri(avatar, API_URL) }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>
                {(name || user?.name || t('userDefault')).slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
          <Text style={styles.changeAvatarText}>{t('changeAvatar')}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>{t('profileName')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          style={styles.input}
          placeholder={t('profileName')}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>{t('profileEmail')}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={t('profileEmail')}
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>{t('profileBio')}</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[styles.input, styles.bioInput]}
          placeholder={t('profileBio')}
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>{t('submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F0FF',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  avatarWrap: {
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  avatar: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 3,
    borderColor: '#E9D5FF',
  },
  avatarFallback: {
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 3,
    borderColor: '#E9D5FF',
    backgroundColor: '#F3E8FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: PURPLE,
    fontSize: 40,
    fontWeight: '800',
  },
  changeAvatarText: {
    textAlign: 'center',
    color: '#2D8CFF',
    fontWeight: '600',
    fontSize: 18,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 10,
    textAlign: 'center',
  },
  label: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  bioInput: {
    minHeight: 88,
  },
  saveBtn: {
    marginTop: 22,
    backgroundColor: '#2D8CFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
