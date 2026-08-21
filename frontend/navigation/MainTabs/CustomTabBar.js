// components/CustomTabBar.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "../../context/NotificationContext";
import { useLanguage } from "../../context/LanguageContext";

const PURPLE = "#7C3AED";

const TAB_CONFIG = {
  CompanyHome: { icon: "🏠", label: "Home"     },
  Home:     { icon: "🏠", label: "Home"     },
  Booking:  { icon: "📅", label: "Booking"  },
  Messages: { icon: "💬", label: "Messages" },
  About:    { icon: "👤", label: "About"    },
};

export default function CustomTabBar({
  state,
  navigation,
  descriptors,
  defaultCompanyId,
  defaultCurrentUserId,
}) {
  const insets = useSafeAreaInsets();
  const { notifications = [] } = useNotifications();
  const { t } = useLanguage();

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
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const baseCfg = TAB_CONFIG[route.name] || { icon: "●", label: route.name };
          const cfg = {
            ...baseCfg,
            label:
              route.name === "Home" || route.name === "CompanyHome"
                ? t('tabHome')
                : route.name === "Booking"
                  ? t('tabBooking')
                  : route.name === "Messages"
                    ? t('tabMessages')
                    : route.name === "About"
                      ? t('tabAbout')
                      : baseCfg.label,
          };

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;

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
                  screen: "CompanyOverview",
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
      </View>
    </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  activePill: {
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
  iconBtn:     { padding: 6, alignItems: "center", justifyContent: "center" },
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
