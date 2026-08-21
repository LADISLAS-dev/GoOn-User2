import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  // =========================
  // GLOBAL
  // =========================

  container: {
    flex: 1,
    backgroundColor: '#10101a',
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // =========================
  // HEADER
  // =========================

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },

  greetingContainer: {
    flex: 1,
  },

  greeting: {
    color: '#8D8DAA',
    fontSize: 16,
    marginBottom: 6,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },

  userName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  roleBadge: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  logoutButton: {
    backgroundColor: '#171726',
    borderWidth: 1,
    borderColor: '#2B2B45',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  seeAll: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },

  logoutText: {
    color: '#B0B0C5',
    fontWeight: '600',
  },

  // =========================
  // TOKEN STATUS
  // =========================

  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171726',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#24243A',
  },

  tokenDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },

  tokenText: {
    color: '#C6C6D8',
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },

  tokenLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },

  // =========================
  // RECEIVER STATUS
  // =========================

  receiverContainer: {
    marginBottom: 24,
  },

  receiverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  receiverTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },

  liveText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  receiverCard: {
    backgroundColor: '#171726',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2A40',
    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  receiverIconContainer: {
    width: 62,
    height: 62,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  receiverInfo: {
    flex: 1,
  },

  receiverName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  receiverDescription: {
    color: '#8F90A6',
    fontSize: 13,
    lineHeight: 20,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  loadingText: {
    color: '#A0A0B8',
    marginLeft: 10,
    fontSize: 14,
  },

  // =========================
  // SEND CARD
  // =========================

  sendCard: {
    backgroundColor: '#171726',
    borderRadius: 26,
    padding: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#2A2A40',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },

  sendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  sendTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 5,
  },

  sendSubtitle: {
    color: '#8A8AA3',
    fontSize: 13,
    lineHeight: 20,
  },

  sendIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#24243A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  inputContainer: {
    marginBottom: 18,
  },

  input: {
    backgroundColor: '#0F0F1A',
    borderRadius: 20,
    padding: 18,
    minHeight: 140,

    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 24,

    borderWidth: 1,
    borderColor: '#2D2D48',

    textAlignVertical: 'top',
  },

  charCount: {
    color: '#666680',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },

  // =========================
  // FEEDBACK
  // =========================

  feedbackBox: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },

  feedbackSuccess: {
    backgroundColor: 'rgba(76, 175, 80, 0.12)',
    borderColor: 'rgba(76, 175, 80, 0.35)',
  },

  feedbackError: {
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderColor: 'rgba(244, 67, 54, 0.35)',
  },

  feedbackWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.12)',
    borderColor: 'rgba(255, 152, 0, 0.35)',
  },

  feedbackText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 20,
  },

  // =========================
  // SEND BUTTON
  // =========================

  sendButton: {
    height: 58,
    borderRadius: 20,

    backgroundColor: '#6C63FF',

    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    shadowColor: '#6C63FF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },

  sendButtonDisabled: {
    opacity: 0.7,
  },

  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    marginRight: 8,
  },

  // =========================
  // NOTIFICATIONS
  // =========================

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },

  unreadBadge: {
    color: '#6C63FF',
  },

  seeAllText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },

  emptyBox: {
    backgroundColor: '#171726',
    borderRadius: 24,
    paddingVertical: 34,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A40',
    borderStyle: 'dashed',
  },

  emptyEmoji: {
    fontSize: 42,
    marginBottom: 14,
  },

  emptyText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },

  emptySubtext: {
    color: '#8A8AA3',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  viewAllButton: {
    marginTop: 16,
    backgroundColor: '#171726',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A40',
  },

  viewAllText: {
    color: '#6C63FF',
    fontSize: 15,
    fontWeight: '700',
  },
});