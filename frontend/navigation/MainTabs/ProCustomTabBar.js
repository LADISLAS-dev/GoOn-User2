// components/CustomTabBar.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "../../context/NotificationContext";
import { useLanguage } from "../../context/LanguageContext";
import { useUser } from "../../context/UserContext";
import AuthPromptModal from "../../components/AuthPromptModal";

const PURPLE = "#7C3AED";

const TAB_CONFIG = {
  Home:     { icon: "🏠", label: "Home"     },
  CompanyHome: { icon: "🏢", label: "My company" },
  Booking:  { icon: "📅", label: "Booking"  },
  Messages: { icon: "💬", label: "Messages" },
  Analytics: { icon: "📊", label: "Analytics" },
  Customers: { icon: "👥", label: "Customers" },
  Team: { icon: "👤", label: "Team" },
  AuditLogs: { icon: "📜", label: "Activity" },
  Inventory: { icon: "📦", label: "Stock" },
  Procurement: { icon: "🧾", label: "Purchasing" },
  Invoices: { icon: "📄", label: "Invoices" },
  SalesOrders: { icon: "🛍️", label: "Sales" },
  About:    { icon: "👤", label: "About"    },
};

export default function CustomTabBar({
  state,
  navigation,
  descriptors,
  defaultCompanyId,
  defaultCurrentUserId,
  moduleConfigs,
  isRestaurantCompany = false,
  isBeautyCompany = false,
}) {
  const insets = useSafeAreaInsets();
  const { notifications = [] } = useNotifications();
  const { t, activeLanguage } = useLanguage();
  const { isGuest } = useUser();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const GUEST_RESTRICTED_TABS = ['Booking', 'Messages'];

  const handleTabPress = (route, defaultPress) => {
    if (isGuest && GUEST_RESTRICTED_TABS.includes(route.name)) {
      setShowAuthPrompt(true);
      return;
    }
    defaultPress();
  };

  const focusedRouteKey = state.routes[state.index]?.key;
  const focusedOptions = descriptors?.[focusedRouteKey]?.options || {};
  const tabBarStyle = focusedOptions.tabBarStyle;
  const shouldHide = Array.isArray(tabBarStyle)
    ? tabBarStyle.some((style) => style?.display === "none")
    : tabBarStyle?.display === "none";

  if (shouldHide) return null;

  const messageUnreadCount = notifications.filter(
    (n) => n?.type === "message" && !n?.read
  ).length;

  const bookingUnreadCount = notifications.filter((n) => {
    if (n?.read) return false;
    if (n?.type !== "appointment") return false;
    // Show badge for newly created appointment requests.
    return String(n?.status || "").toLowerCase() === "pending";
  }).length;

  return (
    <>
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const baseCfg = TAB_CONFIG[route.name] || { icon: "●", label: route.name };
          const moduleConfig = moduleConfigs?.find(
            (module) => module.screen === route.name && module.enabled !== false
          );
          const cfg = {
            ...baseCfg,
            icon: moduleConfig?.icon || baseCfg.icon,
            label: moduleConfig?.labels?.[activeLanguage] ||
              (route.name === "Home"
                ? t('tabHome')
                : route.name === "CompanyHome"
                  ? t('drawerMyCompany')
                : route.name === "Booking"
                  ? t('tabBooking')
                  : route.name === "Messages"
                    ? t('tabMessages')
                    : route.name === "About"
                      ? t('tabAbout')
                      : baseCfg.label),
          };

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;

            if (isGuest && GUEST_RESTRICTED_TABS.includes(route.name)) {
              setShowAuthPrompt(true);
              return;
            }

            if (route.name === "CompanyHome") {
              const routeParams = route?.params || {};
              const nestedParams = routeParams?.params || {};

              const companyId =
                routeParams?.companyId ||
                nestedParams?.companyId ||
                defaultCompanyId;

              const currentUserId =
                routeParams?.currentUserId ||
                nestedParams?.currentUserId ||
                defaultCurrentUserId;

              if (companyId) {
                navigation.navigate("CompanyHome", {
                  screen: isRestaurantCompany ? "RestaurantDashboard" : isBeautyCompany ? "BeautyDashboard" : "CompanyOverview",
                  params: {
                    companyId,
                    ...(currentUserId ? { currentUserId } : {}),
                  },
                });
              } else {
                // Keep current stack state instead of overriding with undefined params.
                navigation.navigate("CompanyHome");
              }
              return;
            }

            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return isFocused ? (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.activePill}
              activeOpacity={0.85}
            >
              {route.name === "Messages" && messageUnreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{messageUnreadCount > 9 ? "9+" : messageUnreadCount}</Text>
                </View>
              ) : null}
              {route.name === "Booking" && bookingUnreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bookingUnreadCount > 9 ? "9+" : bookingUnreadCount}</Text>
                </View>
              ) : null}
              <Text style={styles.activeIcon}>{cfg.icon}</Text>
              <Text style={styles.activeLabel}>{cfg.label}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.iconBtn}
              activeOpacity={0.6}
            >
              {route.name === "Messages" && messageUnreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{messageUnreadCount > 9 ? "9+" : messageUnreadCount}</Text>
                </View>
              ) : null}
              {route.name === "Booking" && bookingUnreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{bookingUnreadCount > 9 ? "9+" : bookingUnreadCount}</Text>
                </View>
              ) : null}
              <Text style={styles.inactiveIcon}>{cfg.icon}</Text>
            </TouchableOpacity>
          );
        })}
        </ScrollView>
      </View>
    </View>
    <AuthPromptModal
      visible={showAuthPrompt}
      onClose={() => setShowAuthPrompt(false)}
      onSignIn={() => { setShowAuthPrompt(false); navigation.navigate('Login'); }}
      onSignUp={() => { setShowAuthPrompt(false); navigation.navigate('Register'); }}
      onContinueAsGuest={() => setShowAuthPrompt(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  bar: {
    backgroundColor: "rgba(20, 18, 30, 0.92)",
    borderRadius: 60,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowOffset: { width: 0, height: 8 },
        shadowRadius: 20,
      },
      android: { elevation: 14 },
    }),
  },
  tabsContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activePill: {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PURPLE,
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 7,
  },
  activeIcon:  { fontSize: 16 },
  activeLabel: { color: "#fff", fontSize: 14, fontWeight: "600" },
  iconBtn:     { flexShrink: 0, padding: 6, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 12,
  },
  inactiveIcon: { fontSize: 22, opacity: 0.5 },
});
