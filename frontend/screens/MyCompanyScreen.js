// screens/MyCompanyScreen.js
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useRoute } from '@react-navigation/native';
import api from "../services/api";
import CompanyDetailScreen from "./CompanyDetailScreen";
import { useUser } from "../context/UserContext";
import { useLanguage } from "../context/LanguageContext";
import AuthPromptModal from "../components/AuthPromptModal";
export default function MyCompanyScreen({ navigation }) {
  const { user, isGuest } = useUser();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const route = useRoute();
  const routeCompanyId = String(route?.params?.companyId || '').trim();
  const routeCurrentUserId = String(route?.params?.currentUserId || user?._id || '').trim();
  const routeOnboardingFlow = route?.params?.onboardingFlow === true;
  const routeJustCreatedCompany = route?.params?.justCreatedCompany === true;
  useEffect(() => {
    if (isGuest) setShowAuthPrompt(true);
  }, [isGuest]);
  const { t } = useLanguage();
  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const [companyId, setCompanyId] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (routeCompanyId) {
      setError(null);
      setCompanyId(routeCompanyId);
      return;
    }

    loadCompany();
  }, [routeCompanyId]);
  const loadCompany = async () => {
    try {
      const res = await api.get("/companies/me");
      setError(null);
      setCompanyId(res.data._id);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || tr('myCompanyLoadError', 'Unable to load your company.');
      setError(message);
    }
  };
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text style={{ textAlign: "center" }}>{error}</Text>
      </View>
    );
  }
  if (!companyId) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }
  return (
    <>
      <CompanyDetailScreen
        navigation={navigation}
        route={{
          params: {
            companyId,
            currentUserId: routeCurrentUserId || user?._id,
            onboardingFlow: routeOnboardingFlow,
            justCreatedCompany: routeJustCreatedCompany,
          },
        }}
      />
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => {
          setShowAuthPrompt(false);
          navigation.replace('Home');
        }}
        onSignIn={() => {
          setShowAuthPrompt(false);
          navigation.replace('Login');
        }}
        onSignUp={() => {
          setShowAuthPrompt(false);
          navigation.replace('Register');
        }}
        featureName="manageCompany"
      />
    </>
  );
}