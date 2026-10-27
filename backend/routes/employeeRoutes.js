const express = require('express');
const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const TeamInvitation = require('../models/TeamInvitation');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const { logAuditEvent } = require('../services/auditLogService');
const {
  canAssignRole,
  ensureCompanyDefaultRoles,
  resolveCompanyAccess,
  validateRolePermissions,
} = require('../services/rbacService');
const {
  createInvitationCredentials,
  getVerifiedInvitationEmail,
  hashInvitationToken,
  normalizeInvitationEmail,
} = require('../services/teamInvitationService');

const router = express.Router();
router.use(authMiddleware);

async function getTeamAccess(req, res, companyId, permission) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    res.status(400).json({ error: 'Identifiant d’entreprise invalide.' });
    return null;
  }

  const access = await resolveCompanyAccess({
    firebaseUid: req.user?.uid,
    companyId,
    permission,
  });
  if (access.error) {
    res.status(access.error.status).json({ error: access.error.message });
    return null;
  }

  return access;
}

router.get('/company/:companyId', async (req, res) => {
  try {
    const access = await getTeamAccess(req, res, req.params.companyId, 'team:read');
    if (!access) return;

    await ensureCompanyDefaultRoles(access.company._id);
    const [roles, employees, invitations, permissions] = await Promise.all([
      Role.find({ companyId: access.company._id }).sort({ name: 1 }).lean(),
      Employee.find({ companyId: access.company._id })
        .populate('userId', 'name email avatar')
        .populate('roleId', 'key name permissions')
        .sort({ createdAt: 1 })
        .lean(),
      TeamInvitation.find({
        companyId: access.company._id,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
        .populate('roleId', 'key name')
        .select('email roleId invitedBy expiresAt createdAt')
        .sort({ createdAt: -1 })
        .lean(),
      Permission.find({ active: true }).sort({ key: 1 }).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        roles,
        employees,
        invitations,
        permissions,
        canManage: access.isOwner || access.role?.permissions?.includes('team:manage'),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de charger l’équipe.' });
  }
});

router.post('/company/:companyId', async (req, res) => {
  try {
    const access = await getTeamAccess(req, res, req.params.companyId, 'team:manage');
    if (!access) return;

    let email;
    try {
      email = normalizeInvitationEmail(req.body?.email);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    const roleKey = String(req.body?.roleKey || 'staff').trim().toLowerCase();

    await ensureCompanyDefaultRoles(access.company._id);
    const [user, role] = await Promise.all([
      User.findOne({ email }).select('_id name email avatar'),
      Role.findOne({ companyId: access.company._id, key: roleKey }),
    ]);

    if (String(user?._id || '') === String(access.company.ownerId)) {
      return res.status(400).json({ error: 'Le propriétaire ne peut pas être ajouté comme membre.' });
    }
    if (!role || !canAssignRole({ isOwner: access.isOwner, actorRole: access.role, targetRole: role })) {
      return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle.' });
    }

    if (user && await Employee.exists({ companyId: access.company._id, userId: user._id })) {
      return res.status(409).json({ error: 'Ce compte fait déjà partie de l’équipe.' });
    }

    await TeamInvitation.updateMany(
      { companyId: access.company._id, email, status: 'pending' },
      { $set: { status: 'revoked' } }
    );

    const { token, tokenHash } = createInvitationCredentials();
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
    const invitation = await TeamInvitation.create({
      companyId: access.company._id,
      email,
      roleId: role._id,
      invitedBy: access.user._id,
      tokenHash,
      expiresAt,
    });
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'employee.invite',
      entityType: 'employee_invitation',
      entityId: invitation._id,
      changedFields: ['roleId', 'status'],
    });

    return res.status(201).json({
      success: true,
      data: {
        _id: invitation._id,
        email: invitation.email,
        roleId: { key: role.key, name: role.name },
        expiresAt: invitation.expiresAt,
        token,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'Ce compte fait déjà partie de l’équipe.' });
    }
    return res.status(500).json({ error: 'Impossible d’ajouter ce membre.' });
  }
});

router.post('/invitations/accept', async (req, res) => {
  try {
    const currentUser = await User.findOne({ firebaseUid: req.user?.uid }).select('_id');
    if (!currentUser) {
      return res.status(401).json({ error: 'Compte GoOn introuvable.' });
    }

    let tokenHash;
    let email;
    try {
      tokenHash = hashInvitationToken(req.body?.token);
      email = getVerifiedInvitationEmail(req.user);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const invitation = await TeamInvitation.findOne({
      tokenHash,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).populate('roleId', 'key name permissions');
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation invalide, déjà utilisée ou expirée.' });
    }
    if (email !== invitation.email) {
      return res.status(403).json({ error: 'Connectez-vous avec l’adresse e-mail invitée.' });
    }

    const consumed = await TeamInvitation.findOneAndUpdate(
      { _id: invitation._id, status: 'pending', expiresAt: { $gt: new Date() } },
      { $set: { status: 'accepted', acceptedBy: currentUser._id, acceptedAt: new Date() } },
      { new: true }
    );
    if (!consumed) {
      return res.status(409).json({ error: 'Cette invitation vient d’être utilisée.' });
    }

    let employee;
    try {
      employee = await Employee.create({
        companyId: invitation.companyId,
        userId: currentUser._id,
        roleId: invitation.roleId._id,
        status: 'active',
        addedBy: invitation.invitedBy,
      });
    } catch (error) {
      await TeamInvitation.updateOne(
        { _id: invitation._id, status: 'accepted', acceptedBy: currentUser._id },
        error?.code === 11000
          ? { $set: { status: 'revoked' } }
          : { $set: { status: 'pending' }, $unset: { acceptedBy: 1, acceptedAt: 1 } }
      );
      if (error?.code === 11000) {
        return res.status(409).json({ error: 'Ce compte fait déjà partie de cette équipe.' });
      }
      throw error;
    }

    await logAuditEvent(req, {
      companyId: invitation.companyId,
      actorId: currentUser._id,
      action: 'employee.accept_invite',
      entityType: 'employee_invitation',
      entityId: invitation._id,
      changedFields: ['status'],
    });

    return res.status(201).json({
      success: true,
      data: { employeeId: employee._id, companyId: invitation.companyId },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible d’accepter cette invitation.' });
  }
});

router.patch('/invitations/:invitationId/revoke', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.invitationId)) {
      return res.status(400).json({ error: 'Identifiant d’invitation invalide.' });
    }

    const invitation = await TeamInvitation.findById(req.params.invitationId);
    if (!invitation) return res.status(404).json({ error: 'Invitation introuvable.' });

    const access = await getTeamAccess(req, res, invitation.companyId, 'team:manage');
    if (!access) return;
    if (invitation.status !== 'pending') {
      return res.status(409).json({ error: 'Cette invitation n’est plus en attente.' });
    }

    invitation.status = 'revoked';
    await invitation.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'employee.invite_revoke',
      entityType: 'employee_invitation',
      entityId: invitation._id,
      changedFields: ['status'],
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de révoquer cette invitation.' });
  }
});

router.post('/company/:companyId/roles', async (req, res) => {
  try {
    const access = await getTeamAccess(req, res, req.params.companyId, 'team:manage');
    if (!access) return;

    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 60) {
      return res.status(400).json({ error: 'Le nom du rôle est obligatoire et limité à 60 caractères.' });
    }

    let permissions;
    try {
      permissions = validateRolePermissions(req.body?.permissions);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const roleData = {
      companyId: access.company._id,
      key: `custom_${new mongoose.Types.ObjectId().toString()}`,
      name,
      permissions,
      isSystem: false,
    };

    if (!canAssignRole({ isOwner: access.isOwner, actorRole: access.role, targetRole: roleData })) {
      return res.status(403).json({ error: 'Ce rôle contient des permissions que vous ne possédez pas.' });
    }

    const role = await Role.create(roleData);
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'role.create',
      entityType: 'role',
      entityId: role._id,
      changedFields: ['name', 'permissions'],
    });
    return res.status(201).json({ success: true, data: role });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de créer ce rôle.' });
  }
});

router.patch('/company/:companyId/roles/:roleId', async (req, res) => {
  try {
    const access = await getTeamAccess(req, res, req.params.companyId, 'team:manage');
    if (!access) return;
    if (!mongoose.Types.ObjectId.isValid(req.params.roleId)) {
      return res.status(400).json({ error: 'Identifiant rôle invalide.' });
    }

    const role = await Role.findOne({ _id: req.params.roleId, companyId: access.company._id });
    if (!role) return res.status(404).json({ error: 'Rôle introuvable.' });
    if (role.isSystem) return res.status(400).json({ error: 'Les rôles système ne peuvent pas être modifiés.' });

    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 60) {
      return res.status(400).json({ error: 'Le nom du rôle est obligatoire et limité à 60 caractères.' });
    }

    let permissions;
    try {
      permissions = validateRolePermissions(req.body?.permissions);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!canAssignRole({ isOwner: access.isOwner, actorRole: access.role, targetRole: { ...role.toObject(), permissions } })) {
      return res.status(403).json({ error: 'Ce rôle contient des permissions que vous ne possédez pas.' });
    }

    role.name = name;
    role.permissions = permissions;
    await role.save();
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'role.update',
      entityType: 'role',
      entityId: role._id,
      changedFields: ['name', 'permissions'],
    });
    return res.json({ success: true, data: role });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de modifier ce rôle.' });
  }
});

router.patch('/:employeeId', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.employeeId)) {
      return res.status(400).json({ error: 'Identifiant membre invalide.' });
    }

    const employee = await Employee.findById(req.params.employeeId);
    if (!employee) return res.status(404).json({ error: 'Membre introuvable.' });

    const access = await getTeamAccess(req, res, employee.companyId, 'team:manage');
    if (!access) return;

    if (req.body?.roleKey !== undefined) {
      const roleKey = String(req.body.roleKey || '').trim().toLowerCase();
      const role = await Role.findOne({ companyId: access.company._id, key: roleKey });
      if (!role || !canAssignRole({ isOwner: access.isOwner, actorRole: access.role, targetRole: role })) {
        return res.status(403).json({ error: 'Vous ne pouvez pas attribuer ce rôle.' });
      }
      employee.roleId = role._id;
    }

    if (req.body?.status !== undefined) {
      const status = String(req.body.status || '').trim().toLowerCase();
      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Le statut du membre est invalide.' });
      }
      if (!access.isOwner && String(employee.userId) === String(access.user._id) && status === 'suspended') {
        return res.status(400).json({ error: 'Vous ne pouvez pas suspendre votre propre accès.' });
      }
      employee.status = status;
    }

    const changedFields = Object.keys(req.body || {}).filter((field) => ['roleKey', 'status'].includes(field));
    await employee.save();
    await employee.populate([
      { path: 'userId', select: 'name email avatar' },
      { path: 'roleId', select: 'key name permissions' },
    ]);
    await logAuditEvent(req, {
      companyId: access.company._id,
      actorId: access.user._id,
      action: 'employee.update',
      entityType: 'employee',
      entityId: employee._id,
      changedFields: changedFields.map((field) => field === 'roleKey' ? 'roleId' : field),
    });
    return res.json({ success: true, data: employee });
  } catch (error) {
    return res.status(500).json({ error: 'Impossible de modifier ce membre.' });
  }
});

module.exports = router;