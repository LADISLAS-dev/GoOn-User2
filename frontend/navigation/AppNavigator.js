// navigation/AppNavigator.js
import React from "react";
import { useEffect, useState } from "react";
import { NavigationContainer, getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUser }       from "../context/UserContext";
import { navigationRef, flushPendingNavigationActions } from "./navigationRef";
import CustomTabBar      from "../navigation/MainTabs/CustomTabBar";

import LoginScreen              from "../screens/LoginScreen";
import OnboardingScreen         from "../screens/OnboardingScreen";
import RegisterScreen           from "../screens/RegisterScreen";
import HomeScreen               from "../screens/HomeScreen";
import CategoryCompaniesScreen  from "../screens/CategoryCompaniesScreen";
import CreateCompanyScreen      from "../screens/CreateCompanyScreen";
import MyCompanyScreen          from "../screens/MyCompanyScreen";
import CompanyDetailScreen      from "../screens/CompanyDetailScreen";
import ServiceDetailScreen      from "../screens/ServiceDetailScreen";
import CreateAppointmentScreen  from "../screens/CreateAppointmentScreen";
import AppointmentDetailsScreen from "../screens/AppointmentDetailsScreen";

import BookingScreen  from "../screens/BookingScreen";
import MessagesScreen from "../screens/ChatScreen";
import AboutScreen     from "../screens/AboutScreen";
import ProfileScreen   from "../screens/ProfileScreen";
import SettingsScreen  from "../screens/SettingsScreen";
import NotificationLabsScreen from "../screens/NotificationLabsScreen";
import AnalyticsDashboardScreen from "../screens/AnalyticsDashboardScreen";
import VideoCallScreen from "../screens/VideoCallScreen";

// ─── Navigators ───────────────────────────────────────────────────────────────
const RootStack    = createNativeStackNavigator();
const Tab          = createBottomTabNavigator();
const CompanyStack = createNativeStackNavigator(); // Stack interne au Tab

/**
 * Stack imbriqué dans l'onglet principal de l'entreprise.
 * Tous les écrans ici affichent la tab bar.
 */
function CompanyTabStack({ route }) {
  const { companyId, currentUserId } = route.params || {};

  return (
    <CompanyStack.Navigator screenOptions={{ headerShown: false }}>
      <CompanyStack.Screen
        name="CompanyOverview"
        component={CompanyDetailScreen}
        initialParams={{ companyId, currentUserId }}
      />
      <CompanyStack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
      <CompanyStack.Screen name="CreateAppointment" component={CreateAppointmentScreen} />
      <CompanyStack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
    </CompanyStack.Navigator>
  );
}

/**
 * Tab navigator — tab bar visible sur tous ses enfants.
 *
 * companyId est reçu via route.params (passé depuis MainTabs lors du navigate)
 * et redistribué en props à chacun des 4 onglets, pour que Booking/Messages/About
 * sachent de quelle entreprise il s'agit, même si on switch d'onglet.
 */
function MainTabs({ route }) {
  const navParams =
    route?.params?.params?.params ??
    route?.params?.params ??
    route?.params;

  const { companyId, currentUserId } = navParams || {};

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          defaultCompanyId={companyId}
          defaultCurrentUserId={currentUserId}
        />
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen
        name="CompanyHome"
        options={({ route }) => {
          const nestedRoute = getFocusedRouteNameFromRoute(route) ?? "CompanyOverview";
          const hideTabBarRoutes = ['ServiceDetail', 'CreateAppointment', 'AppointmentDetails'];
          return {
            tabBarLabel: "Home",
            tabBarStyle: hideTabBarRoutes.includes(nestedRoute) ? { display: "none" } : undefined,
          };
        }}
      >
        {(props) => (
          <CompanyTabStack
            {...props}
            route={{
              ...props.route,
              params: {
                ...(props.route?.params || {}),
                companyId,
                currentUserId,
              },
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Booking">
        {(props) => (
          <BookingScreen
            {...props}
            companyId={companyId}
            currentUserId={currentUserId}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Messages"
        options={({ route }) => ({
          tabBarStyle: route?.params?.hideTabBar ? { display: "none" } : undefined,
        })}
      >
        {(props) => (
          <MessagesScreen
            {...props}
            companyId={companyId}
            currentUserId={currentUserId}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="About">
        {(props) => (
          <AboutScreen
            {...props}
            companyId={companyId}
            currentUserId={currentUserId}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

/**
 * Stack racine.
 *
 * Home et CategoryCompanies sont ICI → pas de tab bar.
 * Pour ouvrir CompanyDetail (avec tab bar), navigue vers "MainTabs"
 * en passant companyId dans les params (voir CategoryCompaniesScreen).
 */
export default function AppNavigator() {
  const { isAuthenticated, isGuest, isLoading } = useUser();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);

  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const seen = await AsyncStorage.getItem('has_seen_onboarding');
        setHasSeenOnboarding(seen === '1');
      } catch (_) {
        setHasSeenOnboarding(false);
      } finally {
        setOnboardingLoaded(true);
      }
    };
    loadOnboardingState();
  }, []);

  if (isLoading || !onboardingLoaded) return null;

  // Toujours montrer l'onboarding au premier lancement,
  // puis atterrir directement sur Home (invité ou connecté).
  const showOnboardingFirst = !hasSeenOnboarding;

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={flushPendingNavigationActions}
    >
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={showOnboardingFirst ? "Onboarding" : "Home"}
      >
        {/* Onboarding — premier lancement uniquement */}
        {showOnboardingFirst && (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        )}

        {/* Écrans principaux — toujours accessibles */}
        <RootStack.Screen name="Home"               component={HomeScreen}              />
        <RootStack.Screen name="CategoryCompanies"  component={CategoryCompaniesScreen} />
        <RootStack.Screen name="AllCompanies"       component={CategoryCompaniesScreen} />
        <RootStack.Screen name="CreateCompany"      component={CreateCompanyScreen}     />
        <RootStack.Screen name="MyCompany"          component={MyCompanyScreen}         />
        <RootStack.Screen name="Profile"            component={ProfileScreen}           />
        <RootStack.Screen name="Settings"           component={SettingsScreen}          />
        <RootStack.Screen name="NotificationLabs"   component={NotificationLabsScreen}  />
        <RootStack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
        <RootStack.Screen name="VideoCall"          component={VideoCallScreen}         />

        {/* Tab bar */}
        <RootStack.Screen name="MainTabs" component={MainTabs} />

        {/* Auth screens — accessibles depuis partout */}
        <RootStack.Screen name="Login"    component={LoginScreen}    />
        <RootStack.Screen name="Register" component={RegisterScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}