/**
 * Root Index — toujours rediriger vers Discover
 * Les invités naviguent librement, les utilisateurs connectés aussi.
 * L'inscription/connexion ne se déclenche qu'au moment où l'utilisateur
 * tente une action protégée (via AuthPromptModal).
 */
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#B8860B" />
      </View>
    );
  }

  // Toujours aller directement au Discover — pas d'écran de connexion obligatoire
  return <Redirect href="/(tabs)/discover" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
