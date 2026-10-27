// navigation/AppNavigator.js
import React, { useCallback } from "react";
import { useEffect, useState } from "react";
import { NavigationContainer, getFocusedRouteNameFromRoute, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCompanyById, getCompanyModules } from '../services/api';

import { useUser }       from "../context/UserContext";
import { navigationRef, flushPendingNavigationActions } from "./navigationRef";
import CustomTabBar      from "../navigation/MainTabs/CustomTabBar";
import ProCustomTabBar   from "../navigation/MainTabs/ProCustomTabBar";

import LoginScreen              from "../screens/LoginScreen";
import OnboardingScreen         from "../screens/OnboardingScreen";
import RegisterScreen           from "../screens/RegisterScreen";
import HomeScreen               from "../screens/HomeScreen";
import ProHomeScreen            from "../screens/ProHomeScreen";
import ProLoginScreen           from "../screens/ProLoginScreen";
import ProOnboardingScreen      from "../screens/ProOnboardingScreen";
import ProRegisterScreen        from "../screens/ProRegisterScreen";
import CategoryCompaniesScreen  from "../screens/CategoryCompaniesScreen";
import ProCategoryCompaniesScreen from "../screens/ProCategoryCompaniesScreen";
import CreateCompanyScreen      from "../screens/CreateCompanyScreen";
import ProCreateCompanyScreen   from "../screens/ProCreateCompanyScreen";
import MyCompanyScreen          from "../screens/MyCompanyScreen";
import ProMyCompanyScreen       from "../screens/ProMyCompanyScreen";
import CompanyDetailScreen      from "../screens/CompanyDetailScreen";
import ProCompanyDetailScreen   from "../screens/ProCompanyDetailScreen";
import ProRestaurantDashboardScreen from "../screens/ProRestaurantDashboardScreen";
import ServiceDetailScreen      from "../screens/ServiceDetailScreen";
import ProServiceDetailScreen   from "../screens/ProServiceDetailScreen";
import CreateAppointmentScreen  from "../screens/CreateAppointmentScreen";
import ProCreateAppointmentScreen from "../screens/ProCreateAppointmentScreen";
import AppointmentDetailsScreen from "../screens/AppointmentDetailsScreen";
import ProAppointmentDetailsScreen from "../screens/ProAppointmentDetailsScreen";

import BookingScreen  from "../screens/BookingScreen";
import ProBookingScreen from "../screens/ProBookingScreen";
import MessagesScreen from "../screens/ChatScreen";
import ProMessagesScreen from "../screens/ProChatScreen";
import AboutScreen     from "../screens/AboutScreen";
import ProAboutScreen  from "../screens/ProAboutScreen";
import ProfileScreen   from "../screens/ProfileScreen";
import ProProfileScreen from "../screens/ProProfileScreen";
import SettingsScreen  from "../screens/SettingsScreen";
import ProSettingsScreen from "../screens/ProSettingsScreen";
import NotificationLabsScreen from "../screens/NotificationLabsScreen";
import ProNotificationLabsScreen from "../screens/ProNotificationLabsScreen";
import AnalyticsDashboardScreen from "../screens/AnalyticsDashboardScreen";
import ProAnalyticsDashboardScreen from "../screens/ProAnalyticsDashboardScreen";
import ProBusinessModulesScreen from "../screens/ProBusinessModulesScreen";
import ProCustomersScreen from "../screens/ProCustomersScreen";
import ProTeamScreen from "../screens/ProTeamScreen";
import ProAuditLogsScreen from "../screens/ProAuditLogsScreen";
import ProAdminCatalogScreen from "../screens/ProAdminCatalogScreen";
import ProAcceptTeamInvitationScreen from "../screens/ProAcceptTeamInvitationScreen";
import ProInventoryScreen from "../screens/ProInventoryScreen";
import ProProcurementScreen from "../screens/ProProcurementScreen";
import ProInvoicesScreen from "../screens/ProInvoicesScreen";
import ProSalesOrdersScreen from "../screens/ProSalesOrdersScreen";
import VideoCallScreen from "../screens/VideoCallScreen";
import ProVideoCallScreen from "../screens/ProVideoCallScreen";

// ─── Navigators ───────────────────────────────────────────────────────────────
const RootStack    = createNativeStackNavigator();
const Tab          = createBottomTabNavigator();
const CompanyStack = createNativeStackNavigator(); // Stack interne au Tab
const APP_MODE_STORAGE_KEY = '@goon:app-mode';

/**
 * Stack imbriqué dans l'onglet principal de l'entreprise.
 * Tous les écrans ici affichent la tab bar.
 */
function CompanyTabStack({ route }) {
  const { companyId, currentUserId, onboardingFlow, justCreatedCompany } = route.params || {};

  return (
    <CompanyStack.Navigator screenOptions={{ headerShown: false }}>
      <CompanyStack.Screen
        name="CompanyOverview"
        component={CompanyDetailScreen}
        initialParams={{ companyId, currentUserId, onboardingFlow, justCreatedCompany }}
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

  const { companyId, currentUserId, onboardingFlow, justCreatedCompany } = navParams || {};

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
                onboardingFlow,
                justCreatedCompany,
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

function ProCompanyTabStack({ route, moduleConfigs, isRestaurantCompany }) {
  const { companyId, currentUserId, onboardingFlow, justCreatedCompany } = route.params || {};
  if (isRestaurantCompany === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0B12' }}>
        <ActivityIndicator color="#C4B5FD" />
      </View>
    );
  }

  return (
    <CompanyStack.Navigator
      key={isRestaurantCompany ? 'restaurant-company-stack' : 'standard-company-stack'}
      initialRouteName={isRestaurantCompany ? 'RestaurantDashboard' : 'CompanyOverview'}
      screenOptions={{ headerShown: false }}
    >
      <CompanyStack.Screen
        name="CompanyOverview"
        component={ProCompanyDetailScreen}
        initialParams={{ companyId, currentUserId, onboardingFlow, justCreatedCompany }}
      />
      <CompanyStack.Screen name="RestaurantDashboard">
        {(props) => (
          <ProRestaurantDashboardScreen
            {...props}
            companyId={companyId}
            onboardingFlow={onboardingFlow}
            moduleConfigs={moduleConfigs}
          />
        )}
      </CompanyStack.Screen>
      <CompanyStack.Screen name="ServiceDetail" component={ProServiceDetailScreen} />
      <CompanyStack.Screen name="CreateAppointment" component={ProCreateAppointmentScreen} />
      <CompanyStack.Screen name="AppointmentDetails" component={ProAppointmentDetailsScreen} />
    </CompanyStack.Navigator>
  );
}

function ProMainTabs({ route }) {
  const navParams =
    route?.params?.params?.params ??
    route?.params?.params ??
    route?.params;

  const { companyId, currentUserId, onboardingFlow, justCreatedCompany } = navParams || {};
  const [moduleConfigs, setModuleConfigs] = useState(null);
  const [isRestaurantCompany, setIsRestaurantCompany] = useState(null);

  useFocusEffect(useCallback(() => {
    let isCurrent = true;
    setModuleConfigs(companyId ? [] : null);
    setIsRestaurantCompany(companyId ? null : false);

    if (!companyId) {
      return () => {
        isCurrent = false;
      };
    }

    getCompanyModules(companyId)
      .then((modules) => {
        if (isCurrent) setModuleConfigs(modules);
      })
      .catch((error) => {
        console.warn('Unable to load company modules:', error?.message || error);
        if (isCurrent) setModuleConfigs([]);
      });

    getCompanyById(companyId)
      .then((company) => {
        const categoryIds = [
          ...(Array.isArray(company?.categoryIds) ? company.categoryIds : []),
          company?.categoryId,
          company?.businessTypeId,
        ].map((id) => String(id || '').trim());
        if (isCurrent) setIsRestaurantCompany(categoryIds.includes('2'));
      })
      .catch(() => {
        if (isCurrent) setIsRestaurantCompany(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [companyId]));

  const hasModule = (key) =>
    !Array.isArray(moduleConfigs) || moduleConfigs.some(
      (module) => module.key === key && module.enabled !== false
    );

  return (
    <Tab.Navigator
      tabBar={(props) => (
        <ProCustomTabBar
          {...props}
          defaultCompanyId={companyId}
          defaultCurrentUserId={currentUserId}
          moduleConfigs={moduleConfigs}
          isRestaurantCompany={isRestaurantCompany}
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
          <ProCompanyTabStack
            {...props}
            moduleConfigs={moduleConfigs}
            isRestaurantCompany={isRestaurantCompany}
            route={{
              ...props.route,
              params: {
                ...(props.route?.params || {}),
                companyId,
                currentUserId,
                onboardingFlow,
                justCreatedCompany,
              },
            }}
          />
        )}
      </Tab.Screen>

      {hasModule('appointments') && (
        <Tab.Screen name="Booking">
          {(props) => (
            <ProBookingScreen
              {...props}
              companyId={companyId}
              currentUserId={currentUserId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('messages') && (
        <Tab.Screen
          name="Messages"
          options={({ route }) => ({
            tabBarStyle: route?.params?.hideTabBar ? { display: "none" } : undefined,
          })}
        >
          {(props) => (
            <ProMessagesScreen
              {...props}
              companyId={companyId}
              currentUserId={currentUserId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('analytics') && (
        <Tab.Screen name="Analytics">
          {(props) => (
            <ProAnalyticsDashboardScreen
              {...props}
              companyId={companyId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('customers') && (
        <Tab.Screen name="Customers">
          {(props) => (
            <ProCustomersScreen
              {...props}
              companyId={companyId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('team') && (
        <Tab.Screen name="Team">
          {(props) => (
            <ProTeamScreen
              {...props}
              companyId={companyId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('audit_logs') && (
        <Tab.Screen name="AuditLogs">
          {(props) => (
            <ProAuditLogsScreen
              {...props}
              companyId={companyId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('inventory') && (
        <Tab.Screen name="Inventory">
          {(props) => (
            <ProInventoryScreen
              {...props}
              companyId={companyId}
              restaurantMode={isRestaurantCompany}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('procurement') && (
        <Tab.Screen name="Procurement">
          {(props) => (
            <ProProcurementScreen
              {...props}
              companyId={companyId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('invoices') && (
        <Tab.Screen name="Invoices">
          {(props) => (
            <ProInvoicesScreen
              {...props}
              companyId={companyId}
            />
          )}
        </Tab.Screen>
      )}

      {hasModule('sales_orders') && (
        <Tab.Screen name="SalesOrders">
          {(props) => (
            <ProSalesOrdersScreen
              {...props}
              companyId={companyId}
              invoicesEnabled={hasModule('invoices')}
            />
          )}
        </Tab.Screen>
      )}

      <Tab.Screen name="About">
        {(props) => (
          <ProAboutScreen
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
  const [appMode, setAppMode] = useState('user');
  const [appModeLoaded, setAppModeLoaded] = useState(false);

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

  useEffect(() => {
    const loadAppMode = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(APP_MODE_STORAGE_KEY);
        setAppMode(storedMode === 'pro' ? 'pro' : 'user');
      } catch (_) {
        setAppMode('user');
      } finally {
        setAppModeLoaded(true);
      }
    };

    loadAppMode();
  }, []);

  if (isLoading || !onboardingLoaded || !appModeLoaded) return null;

  const isProMode = appMode === 'pro';
  const HomeScreenComponent = isProMode ? ProHomeScreen : HomeScreen;
  const OnboardingComponent = isProMode ? ProOnboardingScreen : OnboardingScreen;
  const LoginComponent = isProMode ? ProLoginScreen : LoginScreen;
  const RegisterComponent = isProMode ? ProRegisterScreen : RegisterScreen;
  const CategoryCompaniesComponent = isProMode ? ProCategoryCompaniesScreen : CategoryCompaniesScreen;
  const CreateCompanyComponent = isProMode ? ProCreateCompanyScreen : CreateCompanyScreen;
  const MyCompanyComponent = isProMode ? ProMyCompanyScreen : MyCompanyScreen;
  const ProfileComponent = isProMode ? ProProfileScreen : ProfileScreen;
  const SettingsComponent = isProMode ? ProSettingsScreen : SettingsScreen;
  const NotificationLabsComponent = isProMode ? ProNotificationLabsScreen : NotificationLabsScreen;
  const AnalyticsDashboardComponent = isProMode ? ProAnalyticsDashboardScreen : AnalyticsDashboardScreen;
  const VideoCallComponent = isProMode ? ProVideoCallScreen : VideoCallScreen;
  const MainTabsComponent = isProMode ? ProMainTabs : MainTabs;

  const handleNavigationStateChange = () => {
    const currentRouteName = navigationRef.getCurrentRoute()?.name;
    if (currentRouteName !== 'ProHome' && currentRouteName !== 'UserHome') return;

    const nextMode = currentRouteName === 'ProHome' ? 'pro' : 'user';
    if (nextMode === appMode) return;

    setAppMode(nextMode);
    AsyncStorage.setItem(APP_MODE_STORAGE_KEY, nextMode).catch(() => {});
  };

  // Toujours montrer l'onboarding au premier lancement,
  // puis atterrir directement sur Home (invité ou connecté).
  const showOnboardingFirst = !hasSeenOnboarding;

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={handleNavigationStateChange}
      onReady={flushPendingNavigationActions}
    >
      <RootStack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={showOnboardingFirst ? "Onboarding" : (isProMode ? "ProHome" : "UserHome")}
      >
        {/* Onboarding — premier lancement uniquement */}
        {showOnboardingFirst && (
          <RootStack.Screen name="Onboarding" component={OnboardingComponent} />
        )}

        {/* Écrans principaux — toujours accessibles */}
        <RootStack.Screen
          name="UserHome"
          component={HomeScreen}
          initialParams={{ appMode: 'user' }}
        />
        <RootStack.Screen
          name="ProHome"
          component={ProHomeScreen}
          initialParams={{ appMode: 'pro' }}
        />
        <RootStack.Screen
          name="Home"
          component={HomeScreenComponent}
          initialParams={{ appMode: 'user' }}
        />
        <RootStack.Screen name="CategoryCompanies"  component={CategoryCompaniesComponent} />
        <RootStack.Screen name="AllCompanies"       component={CategoryCompaniesComponent} />
        <RootStack.Screen name="CreateCompany"      component={CreateCompanyComponent}     />
        <RootStack.Screen name="MyCompany"          component={MyCompanyComponent}         />
        <RootStack.Screen name="Profile"            component={ProfileComponent}           />
        <RootStack.Screen name="Settings"           component={SettingsComponent}          />
        <RootStack.Screen name="NotificationLabs"   component={NotificationLabsComponent}  />
        <RootStack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardComponent} />
        <RootStack.Screen name="BusinessModules" component={ProBusinessModulesScreen} />
        <RootStack.Screen name="SuperAdminCatalog" component={ProAdminCatalogScreen} />
        <RootStack.Screen name="AcceptTeamInvitation" component={ProAcceptTeamInvitationScreen} />
        <RootStack.Screen name="VideoCall"          component={VideoCallComponent}         />

        {/* Tab bar */}
        <RootStack.Screen name="MainTabs" component={MainTabsComponent} />

        {/* Auth screens — accessibles depuis partout */}
        <RootStack.Screen name="Login"    component={LoginComponent}    />
        <RootStack.Screen name="Register" component={RegisterComponent} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}