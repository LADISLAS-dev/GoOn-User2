// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   Alert,
// } from 'react-native';

// import { useUser } from '../context/UserContext';
// import { useHomeScreen } from '../hooks/useHomeScreen';
// import { createAppointment } from '../services/api';

// export default function CreateAppointmentScreen({
//   navigation,
//   route,
// }) {
//   const { user } = useUser();
//   const { users } = useHomeScreen();

//   const receiver = route.params?.receiver;

//   const [selectedUser, setSelectedUser] = useState(
//     receiver || null
//   );

//   const [date, setDate] = useState('');
//   const [message, setMessage] = useState('');

//   const sendAppointment = async () => {
//     try {
//       if (!selectedUser) {
//         Alert.alert(
//           'Erreur',
//           'Sélectionnez un utilisateur'
//         );
//         return;
//       }

//       const result = await createAppointment({
//         senderId: user._id,
//         receiverId: selectedUser._id,
//         message,
//         date,
//       });

//       console.log(
//         '✅ APPOINTMENT CREATED:',
//         result.appointment._id
//       );

//       Alert.alert(
//         'Succès',
//         'Rendez-vous envoyé'
//       );

//       navigation.goBack();
//     } catch (e) {
//       console.log(
//         '❌ CREATE APPOINTMENT ERROR:',
//         e.response?.data || e.message
//       );
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text
//         style={{
//           fontSize: 18,
//           marginBottom: 10,
//         }}
//       >
//         Choisir utilisateur
//       </Text>

//       {users.map(u => (
//         <TouchableOpacity
//           key={u._id}
//           onPress={() => setSelectedUser(u)}
//           style={{
//             padding: 10,
//             marginBottom: 8,
//             backgroundColor:
//               selectedUser?._id === u._id
//                 ? '#6C63FF'
//                 : '#333',
//           }}
//         >
//           <Text style={{ color: '#fff' }}>
//             {u.name}
//           </Text>
//         </TouchableOpacity>
//       ))}

//       <TextInput
//         placeholder="Date"
//         value={date}
//         onChangeText={setDate}
//         style={{
//           borderBottomWidth: 1,
//           marginVertical: 10,
//         }}
//       />

//       <TextInput
//         placeholder="Message"
//         value={message}
//         onChangeText={setMessage}
//         style={{
//           borderBottomWidth: 1,
//           marginVertical: 10,
//         }}
//       />

//       <TouchableOpacity
//         onPress={sendAppointment}
//         style={{
//           backgroundColor: '#6C63FF',
//           padding: 12,
//           marginTop: 20,
//         }}
//       >
//         <Text
//           style={{
//             color: '#fff',
//             textAlign: 'center',
//           }}
//         >
//           Envoyer rendez-vous
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );
// }