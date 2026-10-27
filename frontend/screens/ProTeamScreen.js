import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import {
  addCompanyEmployee,
  createCompanyRole,
  getCompanyTeam,
  revokeCompanyInvitation,
  updateCompanyEmployee,
  updateCompanyRole,
} from '../services/api';

const COLORS = {
  background: '#F7F5F1',
  surface: '#FFFFFF',
  border: '#E8E1D7',
  text: '#17161D',
  textSoft: '#6F6A63',
  accent: '#7C3AED',
  danger: '#A83232',
  success: '#18794E',
};

export default function ProTeamScreen({ companyId }) {
  const { activeLanguage } = useLanguage();
  const isFrench = activeLanguage === 'fr';
  const [team, setTeam] = useState({ roles: [], employees: [], invitations: [], permissions: [], canManage: false });
  const [email, setEmail] = useState('');
  const [roleKey, setRoleKey] = useState('staff');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [roleEditorVisible, setRoleEditorVisible] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [rolePermissions, setRolePermissions] = useState([]);

  const copy = isFrench
    ? {
        title: 'Équipe', subtitle: 'Membres et accès de cette entreprise.',
        email: 'E-mail à inviter', add: 'Inviter', manager: 'Manager', staff: 'Équipe',
        loading: 'Chargement de l’équipe…', empty: 'Aucun membre ajouté.',
        role: 'Rôle', active: 'Actif', suspended: 'Suspendu', suspend: 'Suspendre',
        reactivate: 'Réactiver', changeRole: 'Attribuer', noAccount: 'Le code sera à saisir dans GoOn. Aucun e-mail automatique n’est envoyé.',
        inviteCreated: 'Invitation créée. Partagez le code à usage unique.', inviteCode: 'Code d’invitation',
        pendingInvitations: 'Invitations en attente', revokeInvite: 'Révoquer', shareInvite: 'Partager le code',
        updated: 'Accès mis à jour.', error: 'Impossible de charger l’équipe.',
        roles: 'Rôles', createRole: 'Créer un rôle', editRole: 'Modifier le rôle',
        roleName: 'Nom du rôle', permissions: 'Permissions', saveRole: 'Enregistrer le rôle',
        noPermissions: 'Aucune permission',
      }
    : {
        title: 'Team', subtitle: 'Members and access for this business.',
        email: 'Email to invite', add: 'Invite', manager: 'Manager', staff: 'Staff',
        loading: 'Loading team…', empty: 'No team members added.',
        role: 'Role', active: 'Active', suspended: 'Suspended', suspend: 'Suspend',
        reactivate: 'Reactivate', changeRole: 'Assign', noAccount: 'The invite code is entered in GoOn. No email is sent automatically.',
        inviteCreated: 'Invitation created. Share the one-time code.', inviteCode: 'Invitation code',
        pendingInvitations: 'Pending invitations', revokeInvite: 'Revoke', shareInvite: 'Share code',
        updated: 'Access updated.', error: 'Unable to load team.',
        roles: 'Roles', createRole: 'Create role', editRole: 'Edit role',
        roleName: 'Role name', permissions: 'Permissions', saveRole: 'Save role',
        noPermissions: 'No permissions',
      };

  const loadTeam = useCallback(async () => {
    if (!companyId) {
      setError(copy.error);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      setTeam(await getCompanyTeam(companyId));
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || copy.error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, copy.error]);

  useFocusEffect(useCallback(() => {
    loadTeam();
  }, [loadTeam]));

  const addMember = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || isSaving) return;

    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const invitation = await addCompanyEmployee(companyId, { email: normalizedEmail, roleKey });
      setEmail('');
      setInviteCode(invitation?.token || '');
      setNotice(copy.inviteCreated);
      await loadTeam();
      if (invitation?.token) {
        const message = isFrench
          ? `Vous êtes invité à rejoindre GoOn. Connectez-vous avec ${normalizedEmail}, puis saisissez ce code dans « Accepter une invitation » : ${invitation.token}`
          : `You are invited to join GoOn. Sign in with ${normalizedEmail}, then enter this code in “Accept invitation”: ${invitation.token}`;
        try {
          await Share.share({ message });
        } catch (shareError) {
          console.warn('Invitation share dismissed:', shareError?.message || shareError);
        }
      }
    } catch (addError) {
      setError(addError?.response?.data?.error || addError?.message || copy.error);
    } finally {
      setIsSaving(false);
    }
  };

  const revokeInvitation = async (invitation) => {
    setError('');
    setNotice('');
    try {
      await revokeCompanyInvitation(invitation._id);
      setNotice(copy.updated);
      await loadTeam();
    } catch (revokeError) {
      setError(revokeError?.response?.data?.error || revokeError?.message || copy.error);
    }
  };

  const updateMember = async (employee, payload) => {
    setError('');
    setNotice('');
    try {
      await updateCompanyEmployee(employee._id, payload);
      setNotice(copy.updated);
      await loadTeam();
    } catch (updateError) {
      setError(updateError?.response?.data?.error || updateError?.message || copy.error);
    }
  };

  const openRoleEditor = (role = null) => {
    setEditingRoleId(role?._id || null);
    setRoleName(role?.name || '');
    setRolePermissions(role?.permissions || []);
    setRoleEditorVisible(true);
    setError('');
  };

  const saveRole = async () => {
    const name = roleName.trim();
    if (!name || isSaving) return;

    setIsSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { name, permissions: rolePermissions };
      if (editingRoleId) await updateCompanyRole(companyId, editingRoleId, payload);
      else await createCompanyRole(companyId, payload);
      setRoleEditorVisible(false);
      setNotice(isFrench ? 'Rôle enregistré.' : 'Role saved.');
      await loadTeam();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || copy.error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRolePermission = (key, enabled) => {
    setRolePermissions((current) => enabled
      ? [...new Set([...current, key])]
      : current.filter((permission) => permission !== key));
  };

  const renderEmployee = ({ item }) => {
    const user = item.userId || {};
    const role = item.roleId || {};
    return (
      <View style={styles.memberRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{String(user.name || user.email || '?').trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>{user.name || user.email || 'GoOn user'}</Text>
          <Text style={styles.memberEmail} numberOfLines={1}>{user.email || ''}</Text>
          <View style={styles.memberMeta}>
            <Text style={styles.roleText}>{copy.role}: {role.name || role.key}</Text>
            <Text style={[styles.statusText, item.status === 'active' ? styles.statusActive : styles.statusSuspended]}>
              {item.status === 'active' ? copy.active : copy.suspended}
            </Text>
          </View>
          {team.canManage && (
            <View style={styles.memberActions}>
              {team.roles.filter((availableRole) => availableRole.key !== role.key).map((availableRole) => (
                <TouchableOpacity key={availableRole._id} style={styles.secondaryButton} onPress={() => updateMember(item, { roleKey: availableRole.key })}>
                  <Text style={styles.secondaryButtonText}>{copy.changeRole}: {availableRole.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.secondaryButton} onPress={() => updateMember(item, { status: item.status === 'active' ? 'suspended' : 'active' })}>
                <Text style={styles.secondaryButtonText}>{item.status === 'active' ? copy.suspend : copy.reactivate}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{isFrench ? 'ESPACE PROFESSIONNEL' : 'BUSINESS WORKSPACE'}</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
      </View>

      {team.canManage && (
        <View style={styles.addSection}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={copy.email}
            placeholderTextColor="#8F8980"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.emailInput}
            accessibilityLabel={copy.email}
          />
          <View style={styles.addRow}>
            <View style={styles.roleChoices}>
              {team.roles.map((role) => (
                <TouchableOpacity key={role._id} style={[styles.roleChoice, roleKey === role.key && styles.roleChoiceSelected]} onPress={() => setRoleKey(role.key)}>
                  <Text style={[styles.roleChoiceText, roleKey === role.key && styles.roleChoiceTextSelected]}>{role.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.addButton, (!email.trim() || isSaving) && styles.buttonDisabled]} onPress={addMember} disabled={!email.trim() || isSaving}>
              <Text style={styles.addButtonText}>{isSaving ? '…' : copy.add}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>{copy.noAccount}</Text>
        </View>
      )}

      {team.canManage && (
        <View style={styles.rolesSection}>
          <View style={styles.rolesHeader}>
            <Text style={styles.rolesTitle}>{copy.roles}</Text>
            <TouchableOpacity onPress={() => openRoleEditor()}>
              <Text style={styles.createRoleText}>＋ {copy.createRole}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.roleList}>
            {team.roles.map((role) => (
              <TouchableOpacity
                key={role._id}
                style={styles.roleSummary}
                disabled={role.isSystem}
                onPress={() => openRoleEditor(role)}
              >
                <View style={styles.roleSummaryCopy}>
                  <Text style={styles.roleSummaryName}>{role.name}</Text>
                  <Text style={styles.roleSummaryMeta}>
                    {role.permissions?.length || 0} {copy.permissions.toLowerCase()}
                  </Text>
                </View>
                <Text style={styles.roleSummaryAction}>{role.isSystem ? '●' : '✎'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!!notice && <Text style={styles.noticeText}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
      {!!inviteCode && (
        <View style={styles.inviteCodeCard}>
          <Text style={styles.inviteCodeLabel}>{copy.inviteCode}</Text>
          <Text selectable style={styles.inviteCode}>{inviteCode}</Text>
          <Text style={styles.helperText}>{copy.shareInvite}</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={styles.loader} />
      ) : team.employees.length || team.invitations?.length ? (
        <FlatList
          data={team.employees}
          keyExtractor={(item) => String(item._id)}
          renderItem={renderEmployee}
          ListHeaderComponent={team.canManage && team.invitations?.length ? (
            <View style={styles.pendingInvitations}>
              <Text style={styles.rolesTitle}>{copy.pendingInvitations}</Text>
              {team.invitations.map((invitation) => (
                <View key={invitation._id} style={styles.invitationRow}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{invitation.email}</Text>
                    <Text style={styles.memberEmail}>{invitation.roleId?.name || copy.staff}</Text>
                  </View>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => revokeInvitation(invitation)}>
                    <Text style={styles.secondaryButtonText}>{copy.revokeInvite}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}
          ListEmptyComponent={<Text style={styles.emptyText}>{copy.empty}</Text>}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👤</Text>
          <Text style={styles.emptyText}>{copy.empty}</Text>
        </View>
      )}

      <Modal visible={roleEditorVisible} transparent animationType="slide" onRequestClose={() => setRoleEditorVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.rolesHeader}>
              <Text style={styles.modalTitle}>{editingRoleId ? copy.editRole : copy.createRole}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setRoleEditorVisible(false)}>
                <Text style={styles.closeText}>×</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={roleName}
              onChangeText={setRoleName}
              placeholder={copy.roleName}
              maxLength={60}
              style={styles.emailInput}
              accessibilityLabel={copy.roleName}
            />
            <Text style={styles.permissionsHeading}>{copy.permissions}</Text>
            <FlatList
              data={team.permissions}
              keyExtractor={(permission) => permission.key}
              style={styles.permissionList}
              renderItem={({ item }) => {
                const label = item.labels?.[activeLanguage] || item.labels?.en || item.key;
                return (
                  <View style={styles.permissionRow}>
                    <Text style={styles.permissionLabel}>{label}</Text>
                    <Switch
                      value={rolePermissions.includes(item.key)}
                      onValueChange={(enabled) => toggleRolePermission(item.key, enabled)}
                      trackColor={{ false: '#D6D1CA', true: '#BFA0F3' }}
                      thumbColor={rolePermissions.includes(item.key) ? COLORS.accent : '#FFFFFF'}
                      accessibilityLabel={label}
                    />
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.helperText}>{copy.noPermissions}</Text>}
            />
            <TouchableOpacity style={[styles.addButton, styles.saveRoleButton, (!roleName.trim() || isSaving) && styles.buttonDisabled]} onPress={saveRole} disabled={!roleName.trim() || isSaving}>
              <Text style={styles.addButtonText}>{isSaving ? '…' : copy.saveRole}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14 },
  eyebrow: { color: COLORS.textSoft, fontSize: 10, fontWeight: '800', marginBottom: 5 },
  title: { color: COLORS.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: COLORS.textSoft, fontSize: 13, marginTop: 5 },
  addSection: { marginHorizontal: 18, marginBottom: 12, padding: 13, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  emailInput: { height: 44, paddingHorizontal: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: 9, color: COLORS.text, fontSize: 14 },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 9 },
  roleChoices: { flex: 1, flexDirection: 'row', gap: 6 },
  roleChoice: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 8 },
  roleChoiceSelected: { backgroundColor: '#F1EAFE', borderColor: COLORS.accent },
  roleChoiceText: { color: COLORS.textSoft, fontSize: 12, fontWeight: '700' },
  roleChoiceTextSelected: { color: COLORS.accent },
  addButton: { minWidth: 82, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: COLORS.accent, paddingHorizontal: 12 },
  addButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
  helperText: { color: COLORS.textSoft, fontSize: 11, marginTop: 8 },
  inviteCodeCard: { marginHorizontal: 18, marginBottom: 10, padding: 12, backgroundColor: '#F1EAFE', borderRadius: 10, borderWidth: 1, borderColor: '#D8CCFF' },
  inviteCodeLabel: { color: COLORS.textSoft, fontSize: 10, fontWeight: '900' },
  inviteCode: { color: COLORS.accent, fontSize: 16, fontWeight: '900', letterSpacing: 0.5, marginTop: 5 },
  pendingInvitations: { paddingVertical: 10 },
  invitationRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rolesSection: { marginHorizontal: 18, marginBottom: 8 },
  rolesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rolesTitle: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  createRoleText: { color: COLORS.accent, fontSize: 12, fontWeight: '800' },
  roleList: { gap: 7 },
  roleSummary: { minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: COLORS.surface, borderRadius: 9, borderWidth: 1, borderColor: COLORS.border },
  roleSummaryCopy: { flex: 1 },
  roleSummaryName: { color: COLORS.text, fontSize: 13, fontWeight: '800' },
  roleSummaryMeta: { color: COLORS.textSoft, fontSize: 11, marginTop: 2 },
  roleSummaryAction: { color: COLORS.accent, fontSize: 17, paddingHorizontal: 5 },
  noticeText: { color: COLORS.success, fontSize: 12, marginHorizontal: 18, marginBottom: 8 },
  errorText: { color: COLORS.danger, fontSize: 12, marginHorizontal: 18, marginBottom: 8 },
  loader: { marginTop: 44 },
  listContent: { paddingHorizontal: 18, paddingBottom: 24 },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13 },
  separator: { height: 1, backgroundColor: COLORS.border },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE7FA', marginRight: 12 },
  avatarText: { color: COLORS.accent, fontSize: 17, fontWeight: '900' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  memberEmail: { color: COLORS.textSoft, fontSize: 12, marginTop: 3 },
  memberMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  roleText: { color: COLORS.textSoft, fontSize: 11 },
  statusText: { fontSize: 10, fontWeight: '800' },
  statusActive: { color: COLORS.success },
  statusSuspended: { color: COLORS.danger },
  memberActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  secondaryButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 9, borderRadius: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  secondaryButtonText: { color: COLORS.textSoft, fontSize: 11, fontWeight: '700' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyIcon: { fontSize: 28, marginBottom: 8 },
  emptyText: { color: COLORS.textSoft, fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,18,30,0.42)' },
  modalSheet: { maxHeight: '88%', backgroundColor: COLORS.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 17, paddingBottom: 24 },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  closeText: { color: COLORS.textSoft, fontSize: 27 },
  permissionsHeading: { color: COLORS.textSoft, fontSize: 10, fontWeight: '900', marginTop: 16, marginBottom: 6 },
  permissionList: { flexGrow: 0, maxHeight: 340, marginBottom: 14 },
  permissionRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  permissionLabel: { flex: 1, color: COLORS.text, fontSize: 13, paddingRight: 10 },
  saveRoleButton: { width: '100%', marginTop: 2 },
});