# 📱 Guide Production - Notifications Push

## Architecture

Le système supporte:
- ✅ **Expo Go** (développement) - ExponentPushToken[...]
- ✅ **EAS Builds** (production) - ExpoPushToken[...]
  - iOS (TestFlight & App Store)
  - Android (Play Store)

## Configuration Production

### 1. Backend (.env)

```env
PORT=3000
MONGODB_URI=your_mongodb_uri
NODE_ENV=production
JWT_SECRET=your_jwt_secret
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service.json
```

### 2. Frontend (eas.json - Production)

```json
{
  "build": {
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "ios": {
        "image": "latest"
      }
    }
  }
}
```

### 3. API URL en Production

Dans `app.json` > `extra`:
```json
{
  "extra": {
    "apiUrl": "https://your-production-api.com"
  }
}
```

## Déploiement

### Étape 1: Build EAS

```bash
# Build pour TestFlight/Preview
eas build --platform ios --profile preview

# Build pour App Store/Play Store
eas build --platform ios --profile production
eas build --platform android --profile production
```

### Étape 2: Soumettre à l'App Store

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

### Étape 3: Vérifier les tokens

Après installation de la build production:
- L'app devrait enregistrer un token `ExpoPushToken[...]`
- Le token sera stocké en base de données

## Test des Notifications

### Test Local (Expo Go)

```bash
# Vérifier les tokens
node diagnosePush.js

# Envoyer une notification de test
node testProductionPush.js ram3
```

### Test Production (EAS Build)

Après l'installation d'une build EAS:

```bash
# Testez depuis le backend
node testProductionPush.js ram3

# Vérifiez que le token commence par ExpoPushToken[
node diagnosePush.js
```

## Monitoring en Production

### Vérifier le statut des notifications

```bash
# Connectez-vous à MongoDB
# Vérifiez que les notifications ont le statut "sent"
db.notifications.find({ status: "sent" }).count()
db.notifications.find({ status: "pending" }).count()
db.notifications.find({ status: "failed" }).count()
```

### Logs du Backend

Les logs vous montreront:

```
[PUSH] Notification status updated: {
  notificationId: "...",
  status: "sent",  // ✅ Succès
  error: null
}
```

Si vous voyez `status: "failed"`, vérifiez:
- Le token est valide
- L'utilisateur a les permissions de notification
- Expo Push API est accessible

## Troubleshooting

### 1. Notifications "pending" mais pas reçues

**Cause**: Token invalide ou non enregistré

**Solution**:
```bash
# Vérifiez les tokens en BD
node diagnosePush.js

# Si vide: relancez l'app et acceptez les permissions
```

### 2. Erreur "DeviceNotRegistered"

**Cause**: Token obsolète (l'app a été désinstallée/réinstallée)

**Solution**:
- Automatique: Le système supprime les tokens obsolètes
- Manuel: Redémarrez l'app

### 3. Pas de notification push reçue

**Vérifications**:
```bash
1. Tokens enregistrés?
   → node diagnosePush.js

2. Notification a le statut "sent"?
   → MongoDB: db.notifications.findOne({_id: ObjectId("...")})

3. Permissions de notification OK?
   → Paramètres du téléphone > Notifications > App

4. Expo Push API accessible?
   → Backend logs pour erreur HTTP
```

## Format des Données Push

### Notification (API)

```json
{
  "receiverId": "user_id",
  "message": "Contenu de la notification",
  "title": "Titre",
  "type": "appointment|message|custom",
  "data": { }
}
```

### Structure Push (vers Expo)

```json
{
  "to": "ExpoPushToken[...]",
  "title": "Titre",
  "body": "Message",
  "sound": "default",
  "priority": "high",
  "channelId": "default",
  "data": {
    "type": "appointment",
    "appointmentId": "...",
    "notificationId": "...",
    "senderId": "..."
  }
}
```

## Performance & Scalabilité

### Batch Processing (À Implémenter)

Pour >1000 notifications/jour:

```javascript
// À venir: Queue (Redis/BullMQ)
// - Reessais automatiques
// - Limitation de débit
// - Priorités
```

### Rate Limits

Expo Push API:
- ~1000 notifications/seconde
- 100 requêtes/minute sans token d'authentification

## Checklist Production ✅

- [ ] Backend déployé sur production
- [ ] Variables d'environnement configurées
- [ ] Firebase Admin SDK configuré
- [ ] MongoDB connecté
- [ ] Builds EAS générées et testées
- [ ] Tokens production enregistrés en BD
- [ ] Test avec `node testProductionPush.js`
- [ ] Notifications reçues sur le téléphone
- [ ] Status "sent" visible en BD
- [ ] Logs du backend sans erreur

## Support & Debugging

### Activer les logs détaillés

Dans `notificationService.js`:
```javascript
const DEBUG_PUSH = true; // Set to true for detailed logs
```

### Contacter Expo Support

Si les notifications ne passent toujours pas:
1. Vérifiez la validité de votre token (format ExpoPushToken[...])
2. Testez sur https://expo.dev/notifications
3. Contactez support Expo

## Liens Utiles

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
