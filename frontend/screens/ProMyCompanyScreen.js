// screens/MyCompanyScreen.js
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import api from "../services/api";
import CompanyDetailScreen from "./CompanyDetailScreen";
import { useUser } from "../context/UserContext";
import { useLanguage } from "../context/LanguageContext";

export default function MyCompanyScreen({ navigation }) {
  const { user } = useUser();
  const { t } = useLanguage();
  const [companyId, setCompanyId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const res = await api.get("/companies/me");
      setError(null);
      setCompanyId(res.data._id);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || t('myCompanyLoadError', 'Unable to load your company.');
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
    <CompanyDetailScreen
      navigation={navigation}
      route={{
        params: {
          companyId,
          currentUserId: user?._id,
        },
      }}
    />
  );
}