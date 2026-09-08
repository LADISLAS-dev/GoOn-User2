// screens/ChatScreen.js
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  TextInput,
  Text,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useUser } from "../context/UserContext";
import {
  getAllUsers,
  getCompanyById,
  getMessages,
  getAppointmentsByCompany,
  sendMessageApi,
  updateMessageApi,
  deleteMessageApi,
  sendTypingStatus,
  getTypingStatus,
  blockUserApi,
  unblockUserApi,
} from "../services/api";
import { useNotifications } from "../context/NotificationContext";
import { useLanguage } from "../context/LanguageContext";
import { Image } from "react-native";
import { API_URL } from "../env";

const PURPLE = "#7C3AED";

const imgUrl = (src) => {
  if (!src) return null;
  if (src.startsWith("file://")) return src;

  if (src.startsWith("http")) {
    // If avatar points to any backend /uploads URL (possibly wrong host like localhost/10.0.2.2),
    // remap it to the API host used by the current client.
    if (src.includes("/uploads/")) {
      try {
        const parsed = new URL(src);
        const normalizedPath = `${parsed.pathname}${parsed.search || ""}`;
        return `${API_URL}${normalizedPath}`;
      } catch (_) {
        // fallback when URL constructor fails on malformed remote value
        const idx = src.indexOf("/uploads/");
        if (idx >= 0) {
          return `${API_URL}${src.slice(idx)}`;
        }
      }
    }
    return src;
  }

  const clean = src.startsWith("/") ? src : `/${src}`;
  return `${API_URL}${clean}`;
};

const avatarFallback = (name = "User") =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=EDE9FE&color=7C3AED&bold=true`;

const avatarUrl = (src, name = "User") => {
  const raw =
    typeof src === "string"
      ? src
      : src?.uri || src?.url || src?.avatar || src?.avatarUrl || src?.photoURL || src?.profileImage || src?.path || null;

  const normalized = typeof raw === "string" ? raw.replace(/\\/g, "/") : raw;
  return imgUrl(normalized);
};

const resolveUserAvatar = (userLike) => {
  if (!userLike) return null;

  const candidate =
    userLike?.avatar ||
    userLike?.avatarUrl ||
    userLike?.photoURL ||
    userLike?.profileImage ||
    userLike?.image ||
    null;

  if (!candidate) return null;

  return candidate;
};

const entityId = (value) => String(value?._id || value?.id || value || "");

// Un utilisateur est considéré en ligne s'il était actif dans les 5 dernières minutes
const isOnline = (u) => {
  if (!u?.lastActiveAt) return false;
  return Date.now() - new Date(u.lastActiveAt).getTime() < 5 * 60 * 1000;
};

const senderEntityFromMessage = (message) => {
  const sender = message?.senderId;
  if (sender && typeof sender === "object") return sender;
  return null;
};

const avatarInitials = (name = "User") =>
  String(name || "User")
    .split(" ")
    .map((part) => part?.[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Avatar({ src, name, style, textStyle }) {
  const [failed, setFailed] = useState(false);
  const uri = avatarUrl(src, name);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <View style={[styles.avatarFallbackCircle, style]}>
        <Text style={[styles.avatarFallbackText, textStyle]}>{avatarInitials(name)}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

const fileUrl = (src) => imgUrl(src);

export default function ChatScreen(props) {
  // companyId vient des props (passé depuis MainTabs) ou des route.params en fallback
  const companyId = props?.route?.params?.companyId ?? props?.companyId ?? null;
  const selectedUserIdFromRoute = props?.route?.params?.selectedUserId;
  const selectedUserNameFromRoute = props?.route?.params?.selectedUserName;
  const { user } = useUser();
  const {
    notifications = [],
    markMessageNotificationsBySender,
    setActiveMessageConversation,
  } = useNotifications();
  const { t } = useLanguage();

  const [company, setCompany]   = useState(null);
  const [text, setText]         = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers]       = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sending, setSending]   = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [activeOwnMessageId, setActiveOwnMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingSentRef = useRef(false);
  const hasLoadedMessagesRef = useRef(false);

  const loadMessages = useCallback(async ({ silent = false } = {}) => {
    if (!companyId) return;
    if (!silent && !hasLoadedMessagesRef.current) setLoading(true);
    try {
      const [companyData, msgData] = await Promise.all([
        getCompanyById(companyId).catch(() => null),
        getMessages(companyId).catch(() => []),
      ]);
      setCompany(companyData);
      setMessages(msgData || []);
      hasLoadedMessagesRef.current = true;
    } catch (err) {
      console.warn("Failed to load messages:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [companyId]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await getAllUsers();
      const currentFirebaseUid = String(user?.firebaseUid || '').trim();

      let list = (res?.users || []).filter((u) => {
        if (String(u?._id) === String(user?._id)) return false;
        const sameFirebaseUid =
          currentFirebaseUid &&
          String(u?.firebaseUid || '').trim() === currentFirebaseUid;
        return !sameFirebaseUid;
      });

      // Dans le contexte d'une entreprise, n'afficher que le propriétaire
      // (sauf si l'utilisateur courant est lui-même le propriétaire)
      if (companyId) {
        const companyData = await getCompanyById(companyId).catch(() => null);
        const ownerId = String(companyData?.ownerId?._id || companyData?.ownerId || '');
        const isOwner = !!user?._id && ownerId === String(user._id);
        if (!isOwner && ownerId) {
          list = list.filter((u) => String(u._id) === ownerId);
        } else if (isOwner) {
          const [msgData, apptData] = await Promise.all([
            getMessages(companyId).catch(() => []),
            getAppointmentsByCompany(companyId).catch(() => []),
          ]);

          const relatedIds = new Set();

          (msgData || []).forEach((m) => {
            const sId = String(m?.senderId?._id || m?.senderId || '');
            const rId = String(m?.receiverId?._id || m?.receiverId || '');
            if (sId && sId !== ownerId) relatedIds.add(sId);
            if (rId && rId !== ownerId) relatedIds.add(rId);
          });

          (apptData || []).forEach((a) => {
            const sId = String(a?.senderId?._id || a?.senderId || '');
            const rId = String(a?.receiverId?._id || a?.receiverId || '');
            if (sId && sId !== ownerId) relatedIds.add(sId);
            if (rId && rId !== ownerId) relatedIds.add(rId);
          });

          if (selectedUserIdFromRoute) {
            relatedIds.add(String(selectedUserIdFromRoute));
          }

          list = list.filter((u) => relatedIds.has(String(u?._id || '')));
        }
      }

      setUsers(list);
    } catch (err) {
      console.warn("Failed to load users:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [user?._id, user?.firebaseUid, companyId, selectedUserIdFromRoute]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!companyId || !selectedUser?._id) return;

    const id = setInterval(() => {
      loadMessages({ silent: true });
    }, 2000);

    return () => clearInterval(id);
  }, [companyId, selectedUser?._id, loadMessages]);

  useEffect(() => {
    if (!companyId || !selectedUser?._id) return;

    const id = setInterval(async () => {
      try {
        const res = await getTypingStatus({
          companyId,
          peerId: selectedUser._id,
        });
        setPeerTyping(!!res?.isTyping);
      } catch (e) {
        // ignore transient typing read errors
      }
    }, 1200);

    return () => clearInterval(id);
  }, [companyId, selectedUser?._id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredMessages = useMemo(() => {
    if (!selectedUser?._id) return [];
    const selectedId = entityId(selectedUser?._id);
    const currentId = entityId(user?._id);

    return messages.filter((m) => {
      const sender = entityId(m?.senderId);
      const receiver = entityId(m?.receiverId);

      if (receiver) {
        return (
          (sender === currentId && receiver === selectedId) ||
          (sender === selectedId && receiver === currentId)
        );
      }

      // Backward compatibility for old messages without receiverId.
      return sender === selectedId;
    });
  }, [messages, selectedUser?._id, user?._id]);

  const companyOwnerId = useMemo(
    () => String(company?.ownerId?._id || company?.ownerId || ""),
    [company?.ownerId]
  );

  const companyScopedUsers = useMemo(() => {
    if (!companyId) return users;

    const ownerId = companyOwnerId;
    if (!ownerId) return [];

    const isOwner = ownerId === String(user?._id || "");

    if (!isOwner) {
      return users.filter((u) => String(u?._id || "") === ownerId);
    }

    // Propriétaire: n'afficher que les utilisateurs ayant un thread avec lui dans cette entreprise.
    const relatedUserIds = new Set();
    messages.forEach((m) => {
      const senderId = String(m?.senderId?._id || m?.senderId || "");
      const receiverId = String(m?.receiverId?._id || m?.receiverId || "");
      if (!senderId && !receiverId) return;

      if (senderId === ownerId && receiverId && receiverId !== ownerId) {
        relatedUserIds.add(receiverId);
      }
      if (receiverId === ownerId && senderId && senderId !== ownerId) {
        relatedUserIds.add(senderId);
      }
    });

    return users.filter((u) => relatedUserIds.has(String(u?._id || "")));
  }, [companyId, companyOwnerId, messages, users, user?._id]);

  const unreadBySender = useMemo(() => {
    const map = {};
    notifications.forEach((n) => {
      if (n?.type !== "message" || n?.read) return;
      const sender = String(n?.senderId?._id || n?.senderId || "");
      if (!sender) return;
      map[sender] = (map[sender] || 0) + 1;
    });
    return map;
  }, [notifications]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(timer);
  }, [filteredMessages.length, selectedUser?._id]);

  useEffect(() => {
    if (!selectedUserIdFromRoute) return;

    const matched = companyScopedUsers.find((u) => String(u._id) === String(selectedUserIdFromRoute));
    if (matched) {
      setSelectedUser(matched);
      return;
    }

    if (selectedUserNameFromRoute) {
      setSelectedUser({
        _id: String(selectedUserIdFromRoute),
        name: selectedUserNameFromRoute,
      });
    }
  }, [selectedUserIdFromRoute, selectedUserNameFromRoute, companyScopedUsers]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    const stillVisible = companyScopedUsers.some(
      (u) => String(u?._id) === String(selectedUser?._id)
    );
    if (!stillVisible) {
      setSelectedUser(null);
    }
  }, [companyScopedUsers, selectedUser?._id]);

  useEffect(() => {
    if (!selectedUser?._id) return;
    markMessageNotificationsBySender?.(selectedUser._id);
  }, [selectedUser?._id, markMessageNotificationsBySender]);

  useEffect(() => {
    if (selectedUser?._id) {
      setActiveMessageConversation?.({
        senderId: selectedUser._id,
        companyId,
      });
    } else {
      setActiveMessageConversation?.(null);
    }

    return () => {
      setActiveMessageConversation?.(null);
    };
  }, [selectedUser?._id, companyId, setActiveMessageConversation]);

  useEffect(() => {
    props?.navigation?.setParams?.({ hideTabBar: !!selectedUser?._id });
  }, [selectedUser?._id, props?.navigation]);

  const stopTyping = useCallback(async () => {
    if (!typingSentRef.current || !companyId || !selectedUser?._id) return;
    typingSentRef.current = false;
    try {
      await sendTypingStatus({
        companyId,
        receiverId: selectedUser._id,
        isTyping: false,
      });
    } catch (e) {
      // ignore typing stop errors
    }
  }, [companyId, selectedUser?._id]);

  const signalTyping = useCallback(async (nextText) => {
    if (!companyId || !selectedUser?._id) return;

    const hasText = !!nextText.trim();

    if (hasText && !typingSentRef.current) {
      typingSentRef.current = true;
      try {
        await sendTypingStatus({
          companyId,
          receiverId: selectedUser._id,
          isTyping: true,
        });
      } catch (e) {
        // ignore typing start errors
      }
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!hasText) {
      stopTyping();
      return;
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1400);
  }, [companyId, selectedUser?._id, stopTyping]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedUser?._id) {
      stopTyping();
      setPeerTyping(false);
      setAttachMenuOpen(false);
      setActiveOwnMessageId(null);
      setEditingMessageId(null);
    }
  }, [selectedUser?._id, stopTyping]);

  const startEditMessage = (message) => {
    if (!message?._id || !message?.text) return;
    setEditingMessageId(message._id);
    setText(message.text);
    setActiveOwnMessageId(null);
    setAttachMenuOpen(false);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setText("");
  };

  const confirmDeleteMessage = (messageId) => {
    if (!messageId || sending) return;

    Alert.alert(
      t('deleteMessageTitle'),
      t('deleteMessageBody'),
      [
        { text: t('cancel'), style: "cancel" },
        {
          text: t('delete'),
          style: "destructive",
          onPress: async () => {
            try {
              setSending(true);
              await deleteMessageApi(messageId);
              setMessages((prev) => prev.filter((m) => m._id !== messageId));
              if (editingMessageId === messageId) {
                cancelEditMessage();
              }
            } catch (err) {
              console.warn("Delete failed:", err);
            } finally {
              setActiveOwnMessageId(null);
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = () => {
    if (!selectedUser?._id) return;
    Alert.alert(
      t('blockUserTitle', 'Bloquer cet utilisateur'),
      t('blockUserBody', 'Vous ne recevrez plus de messages de cet utilisateur.'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('block', 'Bloquer'),
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUserApi(selectedUser._id);
              Alert.alert(t('blocked', 'Bloqué'), t('blockedConfirm', 'Cet utilisateur a été bloqué.'));
              setSelectedUser(null);
            } catch (err) {
              Alert.alert(t('error'), err?.response?.data?.error || t('blockFailed', 'Impossible de bloquer cet utilisateur.'));
            }
          },
        },
      ]
    );
  };

  const sendMessage = async () => {
    const content = text.trim();
    if (!content || !user?._id || !companyId || sending || !selectedUser?._id) return;

    if (editingMessageId) {
      try {
        setSending(true);
        const updated = await updateMessageApi(editingMessageId, content);
        setMessages((prev) => prev.map((m) => (m._id === editingMessageId ? updated : m)));
        setText("");
        setEditingMessageId(null);
      } catch (err) {
        console.warn("Edit failed:", err);
      } finally {
        setSending(false);
      }
      return;
    }

    setSending(true);
    setText("");

    // optimistic UI
    const tempMsg = {
      _id: `temp_${Date.now()}`,
      text: content,
      senderId: user._id,
      receiverId: selectedUser._id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const created = await sendMessageApi({
        companyId,
        receiverId: selectedUser._id,
        text: content,
      });

      setMessages((prev) =>
        prev.map((m) => (m._id === tempMsg._id ? created : m))
      );
      stopTyping();
    } catch (err) {
      console.warn("Send failed:", err);
      // retire le message optimiste en cas d'échec
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    } finally {
      setSending(false);
    }
  };

  const openAttachment = async (url) => {
    const target = fileUrl(url);
    if (!target) return;
    try {
      await Linking.openURL(target);
    } catch (e) {
      console.warn("Cannot open attachment:", e);
    }
  };

  const sendAttachment = async (asset, kind) => {
    if (!asset || !companyId || !selectedUser?._id || sending || editingMessageId) return;

    const formData = new FormData();
    formData.append("companyId", companyId);
    formData.append("receiverId", selectedUser._id);
    formData.append("text", text.trim());
    formData.append("attachment", {
      uri: asset.uri,
      name: asset.name || `${kind}-${Date.now()}`,
      type: asset.mimeType || (kind === "image" ? "image/jpeg" : "application/octet-stream"),
    });

    setSending(true);
    setText("");

    const tempMsg = {
      _id: `temp_attach_${Date.now()}`,
      text: text.trim(),
      senderId: user._id,
      receiverId: selectedUser._id,
      attachmentUrl: asset.uri,
      attachmentName: asset.name || (kind === "image" ? t('photo', 'Photo') : t('document', 'Document')),
      attachmentMime: asset.mimeType || (kind === "image" ? "image/jpeg" : "application/octet-stream"),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const created = await sendMessageApi(formData);
      setMessages((prev) => prev.map((m) => (m._id === tempMsg._id ? created : m)));
      stopTyping();
    } catch (err) {
      console.warn("Send attachment failed:", err);
      setMessages((prev) => prev.filter((m) => m._id !== tempMsg._id));
    } finally {
      setSending(false);
    }
  };

  const pickDocument = async () => {
    try {
      setAttachMenuOpen(false);
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      await sendAttachment(result.assets[0], "document");
    } catch (err) {
      console.warn("Document pick failed:", err);
    }
  };

  const pickPhoto = async () => {
    try {
      setAttachMenuOpen(false);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('permissionRequired', 'Permission required'), t('permissionGallery', 'Allow gallery access'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.[0]) return;
      await sendAttachment(result.assets[0], "image");
    } catch (err) {
      console.warn("Photo pick failed:", err);
    }
  };

  // ── Pas de companyId → état vide ────────────────────────────────────────────
  if (!companyId) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyText}>{t('chatNoConversation')}</Text>
          <Text style={styles.emptySub}>
            {t('chatOpenCompany')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* HEADER */}
      <View style={styles.header}>
        {!selectedUser && company?.logo ? (
          <Image source={{ uri: imgUrl(company.logo) }} style={styles.headerLogo} />
        ) : !selectedUser ? (
          <View style={styles.headerLogoPlaceholder}>
            <Text style={styles.headerLogoText}>
              {(company?.name || "?")[0]?.toUpperCase()}
            </Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>{t('back')}</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          {selectedUser ? (
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {selectedUser?.name || company?.name || t('tabMessages')}
              </Text>
              <View style={[styles.headerStatusDot, isOnline(selectedUser) ? styles.onlineDotActive : styles.onlineDotInactive]} />
            </View>
          ) : (
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedUser?.name || company?.name || t('tabMessages')}
            </Text>
          )}
        </View>
        {selectedUser ? (
          <Avatar
            src={resolveUserAvatar(selectedUser)}
            name={selectedUser.name}
            style={styles.headerUserAvatar}
            textStyle={styles.headerUserAvatarText}
          />
        ) : null}
        {selectedUser ? (
          <TouchableOpacity style={styles.blockBtn} onPress={handleBlockUser} activeOpacity={0.7}>
            <Text style={styles.blockBtnText}>🚫</Text>
          </TouchableOpacity>
        ) : null}


        
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {!selectedUser ? (
          loadingUsers ? (
            <ActivityIndicator style={styles.flex} color={PURPLE} />
          ) : (
            <FlatList
              data={companyScopedUsers}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                return (
                  <TouchableOpacity
                    style={styles.userItem}
                    onPress={() => setSelectedUser(item)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.avatarWrapper}>
                      <Avatar
                        src={resolveUserAvatar(item)}
                        name={item.name}
                        style={styles.userAvatar}
                        textStyle={styles.userAvatarText}
                      />
                      <View style={[styles.onlineDot, isOnline(item) ? styles.onlineDotActive : styles.onlineDotInactive]} />
                    </View>
                    <View style={styles.userBody}>
                      <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.userSub} numberOfLines={1}>{item.email || t('userDefault')}</Text>
                    </View>
                    {!!unreadBySender[String(item._id)] && (
                      <View style={styles.userUnreadBadge}>
                        <Text style={styles.userUnreadBadgeText}>
                          {unreadBySender[String(item._id)] > 9 ? "9+" : unreadBySender[String(item._id)]}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyText}>{t('noUser')}</Text>
                </View>
              }
            />
          )
        ) : loading ? (
          <ActivityIndicator style={styles.flex} color={PURPLE} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item, index) => {
              if (item?._id) return String(item._id);
              if (item?.id) return String(item.id);
              console.warn("Message without _id/id encountered at index", index);
              return `msg-fallback-${index}-${String(item?.createdAt || 'no-date')}`;
            }}
            contentContainerStyle={styles.list}
            onScrollBeginDrag={() => setActiveOwnMessageId(null)}
            renderItem={({ item }) => {
              const isMe = entityId(item.senderId) === entityId(user?._id);
              const senderEntity = senderEntityFromMessage(item);
              const isFromSelectedUser = entityId(item?.senderId) === entityId(selectedUser?._id);
              const bubbleUser = isMe
                ? user
                : senderEntity || companyScopedUsers.find((u) => entityId(u._id) === entityId(item.senderId)) || (isFromSelectedUser ? selectedUser : null);

              return (
                <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                  {!isMe ? (
                    <Avatar
                      src={resolveUserAvatar(bubbleUser)}
                      name={bubbleUser?.name || "User"}
                      style={styles.bubbleAvatar}
                      textStyle={styles.bubbleAvatarText}
                    />
                  ) : null}
                  <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      delayLongPress={180}
                      onLongPress={() => {
                        if (isMe) setActiveOwnMessageId(item._id);
                      }}
                      onPress={() => setActiveOwnMessageId(null)}
                      style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
                    >
                      {!!item.text && (
                        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                          {item.text}
                        </Text>
                      )}

                      {item.attachmentUrl && item.attachmentMime?.startsWith("image/") ? (
                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => openAttachment(item.attachmentUrl)}
                          style={styles.imageWrap}
                        >
                          <Image
                            source={{ uri: fileUrl(item.attachmentUrl) || item.attachmentUrl }}
                            style={styles.attachmentImage}
                          />
                        </TouchableOpacity>
                      ) : null}

                      {item.attachmentUrl && !item.attachmentMime?.startsWith("image/") ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => openAttachment(item.attachmentUrl)}
                          style={[styles.fileChip, isMe && styles.fileChipMe]}
                        >
                          <Text style={[styles.fileChipText, isMe && styles.fileChipTextMe]} numberOfLines={1}>
                            📎 {item.attachmentName || t('document')}
                          </Text>
                        </TouchableOpacity>
                      ) : null}

                      {!!item.editedAt && (
                        <Text style={[styles.editedHint, isMe && styles.editedHintMe]}>
                          {t('edit')}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {isMe && activeOwnMessageId === item._id ? (
                      <View style={[styles.messageActions, styles.messageActionsMe]}>
                        {!!item.text && (
                          <TouchableOpacity
                            style={styles.messageActionBtn}
                            onPress={() => startEditMessage(item)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.messageActionText}>{t('edit')}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.messageActionBtn, styles.messageActionBtnDanger]}
                          onPress={() => confirmDeleteMessage(item._id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.messageActionTextDanger}>{t('delete')}</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>{t('noMessage')}</Text>
                <Text style={styles.emptySub}>{t('sendFirstMessage')}</Text>
              </View>
            }
          />
        )}

        {selectedUser ? (
          <View style={styles.inputWrap}>
            {editingMessageId ? (
              <View style={styles.editBanner}>
                <Text style={styles.editBannerText}>{t('editMode')}</Text>
                <TouchableOpacity onPress={cancelEditMessage} activeOpacity={0.8}>
                  <Text style={styles.editBannerCancel}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.inputRow}>
              {attachMenuOpen ? (
                <View style={styles.attachMenu}>
                  <TouchableOpacity
                    style={styles.attachMenuItem}
                    onPress={pickPhoto}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.attachMenuItemText}>🖼️ {t('photo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.attachMenuItem}
                    onPress={pickDocument}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.attachMenuItemText}>📎 {t('document')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.attachBtn, (sending || !!editingMessageId) && styles.attachBtnDisabled]}
                onPress={() => setAttachMenuOpen((v) => !v)}
                disabled={sending || !!editingMessageId}
              >
                <Text style={styles.attachBtnText}>📎</Text>
              </TouchableOpacity>
              <TextInput
                value={text}
                onChangeText={(value) => {
                  setText(value);
                  signalTyping(value);
                }}
                placeholder={editingMessageId ? t('edit') : t('writeMessage')}
                placeholderTextColor="#aaa"
                style={styles.input}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
                onPress={sendMessage}
                disabled={!text.trim() || sending}
              >
                {sending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.sendIcon}>{editingMessageId ? "✓" : "➤"}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {selectedUser && peerTyping ? (
          <View style={styles.typingWrap}>
            <Text style={styles.typingText}>{selectedUser?.name || t('userDefault')}...</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F6F9" },
  flex: { flex: 1 },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#EEE",
    backgroundColor: "#8B2FC9",
  },
  headerLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F3F4F6" },
  headerLogoPlaceholder: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center",
  },
  headerLogoText: { color: PURPLE, fontWeight: "800", fontSize: 15 },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#ffffff", flex: 1 },
  headerUserAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
  },
  headerUserAvatarText: {
    fontSize: 10,
  },
  blockBtn: {
    marginLeft: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  blockBtnText: {
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backBtnText: { color: "#444", fontWeight: "700", fontSize: 12 },

  userItem: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ECECF1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  userAvatarText: {
    fontSize: 13,
  },
  userBody: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700", color: "#222" },
  userSub: { fontSize: 12, color: "#8B8B99", marginTop: 1 },
  userUnreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  userUnreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  avatarWrapper: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
    
  },
  onlineDotActive: {
    backgroundColor: "#22C55E",
  },
  onlineDotInactive: {
    backgroundColor: "#D1D5DB",
  },
  headerStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },

  bubbleRow:   { flexDirection: "row", marginBottom: 8, alignItems: "flex-end", gap: 6 },
  bubbleRowMe: { justifyContent: "flex-end" },
  bubbleAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F3F4F6",
  },
  bubbleAvatarText: {
    fontSize: 10,
  },
  avatarFallbackCircle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE9FE",
  },
  avatarFallbackText: {
    color: PURPLE,
    fontWeight: "800",
    fontSize: 12,
  },

  bubble: {
    borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  bubbleWrap: {
    maxWidth: "75%",
  },
  bubbleWrapMe: {
    alignItems: "flex-end",
  },
  bubbleMe:     { backgroundColor: PURPLE, borderBottomRightRadius: 4 },
  bubbleThem:   { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  bubbleText:   { fontSize: 15, color: "#333" },
  bubbleTextMe: { color: "#fff" },
  imageWrap: {
    marginTop: 8,
    borderRadius: 10,
    overflow: "hidden",
  },
  attachmentImage: {
    width: 210,
    height: 210,
    backgroundColor: "#E5E7EB",
  },
  fileChip: {
    marginTop: 8,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    maxWidth: 220,
  },
  fileChipMe: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  fileChipText: {
    color: "#8B2FC9",
    fontWeight: "700",
    fontSize: 12,
  },
  fileChipTextMe: {
    color: "#fff",
  },
  editedHint: {
    marginTop: 4,
    fontSize: 10,
    color: "#6B7280",
    fontStyle: "italic",
  },
  editedHintMe: {
    color: "rgba(255,255,255,0.8)",
  },
  messageActions: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8,
  },
  messageActionsMe: {
    alignSelf: "flex-end",
  },
  messageActionBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  messageActionBtnDanger: {
    backgroundColor: "#FEE2E2",
  },
  messageActionText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "700",
  },
  messageActionTextDanger: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "800",
  },

  inputWrap: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  editBanner: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editBannerText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 12,
  },
  editBannerCancel: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 12,
  },
  inputRow: {
    flexDirection: "row", alignItems: "flex-end",
    paddingBottom: 22, padding: 12, backgroundColor: "#fff",
    gap: 10,
  },
  input: {
    flex: 1, backgroundColor: "#F3F4F6",
    borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: 15,
    color: "#333", maxHeight: 100,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtnDisabled: {
    opacity: 0.45,
  },
  attachBtnText: {
    fontSize: 16,
  },
  attachMenu: {
    position: "absolute",
    bottom: 58,
    left: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    zIndex: 30,
    overflow: "hidden",
  },
  attachMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 130,
  },
  attachMenuItemText: {
    fontSize: 14,
    color: "#222",
    fontWeight: "600",
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: PURPLE,
    alignItems: "center", justifyContent: "center",
    
  },
  sendIcon: { color: "#fff", fontSize: 18, marginLeft: 2 },
  typingWrap: {
    paddingHorizontal: 18,
    paddingBottom: 8,
    backgroundColor: "#fff",
  },
  typingText: {
    paddingBottom: 6,
    fontSize: 12,
    color: "#8B2FC9",
    fontWeight: "600",
  },

  empty:     { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 17, fontWeight: "700", color: "#333", marginBottom: 8, textAlign: "center" },
  emptySub:  { fontSize: 13, color: "#aaa", textAlign: "center", lineHeight: 19 },
});