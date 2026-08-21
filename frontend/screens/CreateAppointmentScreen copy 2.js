// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   ScrollView,
//   StyleSheet,
//   StatusBar,
//   Switch,
//   Alert,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import DateTimePicker from '@react-native-community/datetimepicker';
// import { createAppointment } from '../services/api';
// import { useUser } from '../context/UserContext';

// const C = {
//   bg: '#F2F2F7',
//   card: '#FFFFFF',
//   separator: '#C6C6C8',
//   primary: '#007AFF',
//   textPrimary: '#000',
//   textSecondary: '#6D6D72',
// };

// export default function CreateAppointmentScreen({ route, navigation }) {
//   const { receiver } = route.params; // 👈 vient de CompanyDetailScreen
//   const { user } = useUser();

//   const [title, setTitle] = useState('');
//   const [date, setDate] = useState(new Date());
//   const [time, setTime] = useState(new Date());
//   const [location, setLocation] = useState('');
//   const [note, setNote] = useState('');
//   const [reminder, setReminder] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [showDatePicker, setShowDatePicker] = useState(false);
//   const [showTimePicker, setShowTimePicker] = useState(false);
//   const [error, setError] = useState('');

//   const isReady =
//     title.trim() && receiver?._id && date instanceof Date && time instanceof Date;

//   const handleCreate = async () => {
//     if (loading) return;

//     if (!user?._id) {
//       Alert.alert('Validation', 'Vous devez être connecté pour créer un rendez-vous.');
//       return;
//     }

//     if (!user?.companyId) {
//       Alert.alert('Validation', 'Votre entreprise est requise pour créer un rendez-vous.');
//       return;
//     }

//     if (!title.trim()) {
//       Alert.alert('Validation', 'Le titre est requis.');
//       return;
//     }

//     if (!receiver?._id) {
//       Alert.alert('Validation', 'Aucun destinataire sélectionné.');
//       return;
//     }

//     setLoading(true);
//     setError('');

//     try {
//       const appointmentDate = new Date(date);
//       appointmentDate.setHours(time.getHours(), time.getMinutes(), 0, 0);

//       const payload = {
//         companyId: user.companyId,
//         clientId: receiver._id,
//         title: title.trim(),
//         date: appointmentDate,
//         location: location.trim(),
//         note: note.trim(),
//         reminder,
//       };

//       await createAppointment(payload);
//       navigation.goBack();
//     } catch (e) {
//       console.log('CREATE APPOINTMENT ERROR:', e.message);
//       setError('La création du rendez-vous a échoué.');
//       Alert.alert('Erreur', 'Impossible de créer le rendez-vous.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
//       <StatusBar barStyle="dark-content" />

//       {/* Header */}
//       <View style={styles.header}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <Text style={{ color: C.primary }}>Annuler</Text>
//         </TouchableOpacity>

//         <Text style={styles.title}>Rendez-vous</Text>

//         <TouchableOpacity
//           onPress={handleCreate}
//           disabled={!isReady || loading}
//         >
//           <Text style={{ color: isReady ? C.primary : '#aaa' }}>
//             {loading ? '...' : 'Envoyer'}
//           </Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView contentContainerStyle={{ padding: 16 }}>
//         <TextInput
//           placeholder="Titre"
//           value={title}
//           onChangeText={setTitle}
//           style={styles.input}
//         />

//         <TouchableOpacity
//           onPress={() => setShowDatePicker(true)}
//           style={[styles.input, { justifyContent: 'center' }]}
//         >
//           <Text style={{ color: C.textPrimary }}>
//             {date.toLocaleDateString('fr-FR')}
//           </Text>
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => setShowTimePicker(true)}
//           style={[styles.input, { justifyContent: 'center' }]}
//         >
//           <Text style={{ color: C.textPrimary }}>
//             {time.toLocaleTimeString('fr-FR', {
//               hour: '2-digit',
//               minute: '2-digit',
//             })}
//           </Text>
//         </TouchableOpacity>

//         {showDatePicker && (
//           <DateTimePicker
//             value={date}
//             mode="date"
//             display="default"
//             onChange={(event, selectedDate) => {
//               setShowDatePicker(false);
//               if (selectedDate) {
//                 setDate(selectedDate);
//               }
//             }}
//           />
//         )}

//         {showTimePicker && (
//           <DateTimePicker
//             value={time}
//             mode="time"
//             display="default"
//             onChange={(event, selectedTime) => {
//               setShowTimePicker(false);
//               if (selectedTime) {
//                 setTime(selectedTime);
//               }
//             }}
//           />
//         )}

//         <TextInput
//           placeholder="Lieu"
//           value={location}
//           onChangeText={setLocation}
//           style={styles.input}
//         />

//         <TextInput
//           placeholder="Note"
//           value={note}
//           onChangeText={setNote}
//           style={[styles.input, { height: 100 }]}
//           multiline
//         />

//         <View style={styles.row}>
//           <Text>Rappel</Text>
//           <Switch value={reminder} onValueChange={setReminder} />
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     padding: 16,
//     borderBottomWidth: 1,
//     borderColor: C.separator,
//   },
//   title: {
//     fontSize: 16,
//     fontWeight: '700',
//     color: C.textPrimary,
//   },
//   input: {
//     backgroundColor: '#fff',
//     padding: 12,
//     borderRadius: 10,
//     marginBottom: 12,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginTop: 10,
//   },
// });