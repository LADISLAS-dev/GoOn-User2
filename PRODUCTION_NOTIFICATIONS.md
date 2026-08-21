# 🚀 PRODUCTION NOTIFICATIONS - Guide Complet

## Résumé

Votre système supporte maintenant :
- ✅ **Développement** (Expo Go) - ExponentPushToken[...]
- ✅ **Production** (EAS Builds) - ExpoPushToken[...]
  - iOS (TestFlight & App Store)
  - Android (Play Store)

## Architecture

```
┌─────────────────────────────────────────────┐
│         User App (Expo or EAS Build)       │
│  - Registers push token at startup         │
│  - Sends token to backend                  │
└──────────────┬──────────────────────────────┘
               │
          [Token stored]
               │
┌──────────────▼──────────────────────────────┐
│       Backend API (Node.js)                 │
│  - Receives notification requests           │
│  - Stores notifications in MongoDB          │
│  - Sends push via Expo Push API             │
└──────────────┬──────────────────────────────┘
               │
          [to Expo]
               │
┌──────────────▼──────────────────────────────┐
│       Expo Push Service                     │
│  - Routes to Apple APNS                     │
│  - Routes to Google FCM                     │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   [Apple]          [Google]
       │                │
    [APNS]           [FCM]
       │                │
  [iOS Device]    [Android Device]
```

## Étapes de Déploiement

### Phase 1: Préparation

#### 1.1 Vérifier la configuration

```bash
# Depuis le dossier racine du projet
bash check-production-config.sh
```

Résultat attendu:
```
✅ EAS projectId configured in app.json
✅ Production profile configured in eas.json
✅ Production API URL configured in env.js
✅ MongoDB URI configured
✅ JWT_SECRET configured
✅ Firebase configuration detected
```

#### 1.2 Mettre à jour les variables d'environnement

**backend/.env:**
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your-secret-key-here
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service.json
```

**frontend/app.json - extra:**
```json
{
  "extra": {
    "apiUrl": "https://your-production-api.com",
    "debugApiLogs": false,
    "eas": {
      "projectId": "your-eas-project-id"
    }
  }
}
```

### Phase 2: Build Production

#### 2.1 Créer le build EAS

```bash
# iOS
cd frontend
eas build --platform ios --profile production

# Android  
eas build --platform android --profile production

# Attendre que les builds soient prêts
# Consulter: https://expo.dev/builds
```

#### 2.2 Installer l'app

- **iOS**: Télécharger depuis TestFlight pendant le développement, puis soumettre à l'App Store
- **Android**: Télécharger depuis Google Play Console

### Phase 3: Vérification

#### 3.1 Vérifier les tokens enregistrés

Une fois l'app installée et ouverte sur le téléphone:

```bash
cd backend
node diagnosePush.js
```

Résultat attendu:
```
==== PUSH TOKENS STATUS ====
Total users with push tokens: 1

1. User: ram3 (ram3@gmail.com)
   - expoPushToken: ExpoPushToken[-xyz123...]  ← Production token!
   - expoPushTokens (1):
     [0] ExpoPushToken[-xyz123...]  ← Production!
   - expoPushRegistrations (1):
     [0] ExpoPushToken[-xyz123...]
         - appOwnership: standalone
         - executionEnvironment: standalone
```

**Important**: Le token doit commencer par `ExpoPushToken[` (pas `ExponentPushToken[`)

#### 3.2 Tester les notifications

```bash
node testProductionPush.js ram3
```

Résultat attendu:
```
📱 Testing push notifications for: ram3 (ram3@gmail.com)

==== TOKEN ANALYSIS ====

Preferred tokens to use (1):
  [0] ExpoPushToken[-xyz123...]... (Production (EAS))

==== SENDING TEST NOTIFICATION ====

✅ [0] Production (EAS)
   Token: ExpoPushToken[-xyz123...]...
   Ticket: abc123...

==== SUMMARY ====

✅ Success: 1/1
❌ Failed: 0/1

✅ Test completed! Check your device(s) for the notification.
```

#### 3.3 Vérifier sur le téléphone

- Vérifier que la notification push s'affiche
- Cliquer dessus pour ouvrir l'app
- Vérifier que la navigation fonctionne

### Phase 4: Monitoring en Production

#### 4.1 Vérifier les statuts en base de données

```javascript
// En MongoDB:
db.notifications.aggregate([
  { $group: { _id: '$status', count: { $sum: 1 } } }
])

// Résultat attendu:
// { _id: 'sent', count: 45 }
// { _id: 'pending', count: 0 }  ← Doit être proche de 0!
// { _id: 'failed', count: 2 }   ← Peu d'erreurs
```

#### 4.2 Monitoring des logs backend

```bash
# Voir les notifications envoyées:
# 🚀 [PUSH-TOKEN] REGISTERED - Production tokens
# 🧪 [PUSH-TOKEN] REGISTERED - Expo Go tokens (dev only)
# 📤 [PUSH-SEND] ATTEMPT - Tentative d'envoi
# ✅ [PUSH-SEND] RESULT - Succès
# ❌ [PUSH-SEND] RESULT - Échec
```

## Troubleshooting

### Problem 1: Pas de notifications en production

**Symptôme**: Build produit un token `ExpoPushToken[...]` mais pas de notif

**Diagnostic**:
```bash
node testProductionPush.js <username>
# → Si failure: problème de token
# → Si success mais pas de notif: problème permissions téléphone
```

**Solution**:
1. Vérifier permissions dans Settings > Notifications > App
2. Relancer l'app
3. Tester à nouveau

### Problem 2: Token invalide

**Symptôme**: 
```
[PUSH-SEND] Error: Invalid or missing Expo push token
```

**Diagnostic**:
```bash
node diagnosePush.js
# Vérifier que le token commence par ExpoPushToken[
```

**Solution**:
1. Redémarrer l'app
2. S'assurer que le téléphone est physique (pas émulateur)
3. S'assurer que les permissions sont acceptées

### Problem 3: "DeviceNotRegistered"

**Symptôme**: 
```
[PUSH-SEND] Error: DeviceNotRegistered
```

**Explication**: Token obsolète (l'app a changé d'environnement)

**Solution**: Automatique - le token sera supprimé, nouvel enregistrement au redémarrage

### Problem 4: Notifications "pending" dans la BD

**Symptôme**: `node diagnosePush.js` montre beaucoup de notifications "pending"

**Diagnostic**: 
```bash
# Celles créées il y a plus d'1 heure
node cleanOldNotifications.js
```

**Solution**: 
- Les anciennes "pending" sont nettoyées
- Les nouvelles doivent passer à "sent"
- Si non: vérifier les logs du backend

## Checklist Production ✅

### Avant le build EAS
- [ ] Variables d'environnement configurées (.env)
- [ ] API URL en production (app.json)
- [ ] Firebase Admin SDK configuré
- [ ] MongoDB en production connectée
- [ ] Tests locaux OK (Expo Go avec `testProductionPush.js`)

### Pendant le build EAS
- [ ] Build iOS complété sur eas.dev
- [ ] Build Android complété sur eas.dev
- [ ] TestFlight app installée pour test
- [ ] Play Store app configurée

### Après installation produit
- [ ] Tokens enregistrés = ExpoPushToken[...]
- [ ] `node testProductionPush.js` = Succès
- [ ] Notification reçue sur l'appareil
- [ ] Navigation fonctionne au tap
- [ ] Status en BD = "sent"

### En production (ongoing)
- [ ] Monitor MongoDB pour statuts "pending"
- [ ] Alert si trop de "failed"
- [ ] Check logs backend quotidiennement
- [ ] Monitor Expo Push API uptime

## Performance

**Limitations Expo Push API**:
- ~1000 notifications/seconde
- 100 requêtes/minute sans token d'auth
- Max 4KB par notification

**Pour >10k notif/jour**: À venir - implémentation Queue (Redis/BullMQ)

## Support & Debug

### Logs utiles

```bash
# Frontend (dans l'app)
# - [Push] Expo token registered: xyz...
# - [Push] Notification received
# - [Push] Notification response (click)

# Backend
# - [TOKEN-SYNC] Token registered successfully
# - [PUSH] Notification created
# - [PUSH] Push results
# - [PUSH] Notification status updated: sent
```

### Tester Expo Push directement

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "ExpoPushToken[...]",
    "title": "Test",
    "body": "Hello!"
  }'
```

### Contacter Support

1. **Expo Support**: https://expo.dev/help
2. **Firebase Support**: https://firebase.google.com/support
3. **Vérifier docs**: https://docs.expo.dev/push-notifications/

## Prochaines Étapes (Optionnelles)

1. **Authentification Expo Push** - Signer les tokens pour une meilleure sécurité
2. **Queue de Notifications** - Redis/BullMQ pour grande échelle
3. **Webhooks** - Reçevoir les reçus de livraison d'Expo
4. **Analytics** - Tracker les taux de livraison
5. **A/B Testing** - Tester différents messages
