// import React, { useEffect, useState } from 'react';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   ActivityIndicator,
//   StyleSheet,
//   StatusBar,
//   TextInput,
//   Modal,
//   Alert,
//   Dimensions,
//   FlatList,
//   Image,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useNavigation, useRoute } from '@react-navigation/native';
// import * as ImagePicker from 'expo-image-picker';

// import { getCompanyById, updateCompany } from '../services/api';

const API_BASE_URL = 'http://192.168.1.2:1987';

// const { width: SCREEN_W } = Dimensions.get('window');

// /* ───────── COLORS ───────── */
// const C = {
//   purple: '#7C3AED',
//   purpleLight: '#9D5CF6',
//   purplePale: '#F3EEFF',
//   purpleMid: '#C4AEF7',
//   white: '#FFFFFF',
//   bg: '#F5F0FC',
//   textPrimary: '#1A1A2E',
//   textMuted: '#6B7280',
//   border: 'rgba(124,58,237,0.12)',
//   success: '#1D8A50',
//   successBg: '#EAFBF0',
// };

// /* ───────── ICONS ───────── */
// const ICONS = {
//   'arrow-left': '‹',
//   share: '⇪',
//   edit: '✎',
//   phone: '☎',
//   mail: '✉',
//   'map-pin': '⌖',
//   clock: '◷',
//   image: '⊞',
//   plus: '+',
//   grid: '⊞',
//   'bar-chart': '▦',
//   message: '✉',
//   home: '⌂',
//   calendar: '▦',
//   x: '✕',
//   trash: '✗',
// };

// const Ico = ({ name, size = 18, color = C.purple }) => (
//   <Text style={{ fontSize: size, color }}>{ICONS[name] || '●'}</Text>
// );

// /* ───────── FIELDS ───────── */
// const EDIT_FIELDS = [
//   { key: 'name', label: 'Nom', multiline: false },
//   { key: 'description', label: 'Description', multiline: true },
//   { key: 'phone', label: 'Téléphone', multiline: false },
//   { key: 'email', label: 'Email', multiline: false },
//   { key: 'location', label: 'Localisation', multiline: false },
//   { key: 'hours', label: 'Horaires', multiline: false },
//   { key: 'category', label: 'Catégorie', multiline: false },
// ];

// export default function CompanyDetailScreen() {
//   const navigation = useNavigation();
//   const route = useRoute();

//   const companyId = route.params?.companyId;
//   const currentUserId = route.params?.currentUserId;

//   const [company, setCompany] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   const [editModal, setEditModal] = useState({
//     visible: false,
//     field: '',
//     label: '',
//     value: '',
//     multiline: false,
//   });

//   const isOwner = company?.ownerId === currentUserId;

//   /* ───────── LOAD ───────── */
//   useEffect(() => {
//     (async () => {
//       try {
//         const data = await getCompanyById(companyId);
//         setCompany(data);
//       } catch (e) {
//         console.log(e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [companyId]);

//   /* ───────── EDIT ───────── */
//   const openEdit = (field) => {
//     const config = EDIT_FIELDS.find(f => f.key === field);

//     setEditModal({
//       visible: true,
//       field,
//       label: config?.label || field,
//       value: company?.[field] || '',
//       multiline: config?.multiline || false,
//     });
//   };

//   const closeEdit = () =>
//     setEditModal({ visible: false, field: '', label: '', value: '', multiline: false });

//   const saveField = async () => {
//     try {
//       setSaving(true);

//       const payload = {
//         [editModal.field]: editModal.value,
//       };

//       await updateCompany(companyId, payload);

//       setCompany(prev => ({ ...prev, ...payload }));
//       closeEdit();
//     } catch {
//       Alert.alert('Erreur');
//     } finally {
//       setSaving(false);
//     }
//   };

//   /* ───────── IMAGE UPLOAD ───────── */
//   const uploadImage = async () => {
//     const result = await ImagePicker.launchImageLibraryAsync({
//       mediaTypes: ['images'],
//       allowsMultipleSelection: true,
//       quality: 0.8,
//     });

//     if (result.canceled) return;

//     const uploadImageToServer = async (localUri) => {
//       const filename = localUri.split('/').pop() || 'photo.jpg';
//       const form = new FormData();
//       form.append('image', {
//         uri: localUri,
//         name: filename,
//         type: 'image/jpeg',
//       });

//       const response = await fetch(`${API_BASE_URL}/companies/${companyId}/upload-image`, {
//         method: 'POST',
//         body: form,
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Upload failed: ${errorText}`);
//       }

//       const body = await response.json();
//       return body.url;
//     };

//     const uploadedUrls = await Promise.all(result.assets.map((a) => uploadImageToServer(a.uri)));

//     const updated = await updateCompany(companyId, {
//       images: [...(company.images || []), ...uploadedUrls],
//     });

//     setCompany((prev) => ({
//       ...prev,
//       images: updated.images,
//     }));
//   };

//   const deleteImage = async (index) => {
//     const newImages = [...company.images];
//     newImages.splice(index, 1);

//     await updateCompany(companyId, { images: newImages });

//     setCompany(prev => ({
//       ...prev,
//       images: newImages,
//     }));
//   };

//   /* ───────── LOADING ───────── */
//   if (loading) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator color={C.purple} />
//       </View>
//     );
//   }

//   if (!company) {
//     return (
//       <View style={styles.center}>
//         <Text>Entreprise introuvable</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.root}>
//       <StatusBar backgroundColor={C.purple} />

//       {/* HEADER */}
//       <SafeAreaView style={styles.header}>
//         <View style={styles.headerRow}>
//           <TouchableOpacity onPress={() => navigation.goBack()}>
//             <Ico name="arrow-left" color="#fff" />
//           </TouchableOpacity>

//           <Text style={styles.headerTitle}>{company.name}</Text>
//         </View>
//       </SafeAreaView>

//       <ScrollView>

//         {/* CAROUSEL PRO */}
//         <CarouselSection
//           images={company.images || []}
//           isOwner={isOwner}
//           onUpload={uploadImage}
//           onDelete={deleteImage}
//         />

//         {/* INFO */}
//         <View style={styles.infoCard}>
//           <Text style={{ color: C.textPrimary }}>
//             {company.description}
//           </Text>
//         </View>

//         {/* CONTACT */}
//         <ContactChip
//           label="Téléphone"
//           value={company.phone}
//           onEdit={() => openEdit('phone')}
//         />

//       </ScrollView>

//       {/* MODAL EDIT */}
//       <Modal visible={editModal.visible} transparent animationType="fade">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalCard}>
//             <Text>{editModal.label}</Text>

//             <TextInput
//               value={editModal.value}
//               onChangeText={(t) =>
//                 setEditModal(p => ({ ...p, value: t }))
//               }
//               multiline={editModal.multiline}
//             />

//             <TouchableOpacity onPress={saveField}>
//               <Text>Sauvegarder</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// /* ───────── CAROUSEL PRO ───────── */
// const CarouselSection = ({ images, isOwner, onUpload, onDelete }) => {
//   const [active, setActive] = useState(0);

//   return (
//     <View style={styles.carouselContainer}>

//       <FlatList
//         data={images}
//         horizontal
//         pagingEnabled
//         keyExtractor={(i, index) => String(index)}
//         onMomentumScrollEnd={(e) => {
//           setActive(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
//         }}
//         renderItem={({ item, index }) => (
//           <View style={styles.carouselItem}>
//             <Image source={{ uri: item }} style={styles.carouselImg} />

//             {isOwner && (
//               <TouchableOpacity
//                 style={styles.deleteBtn}
//                 onPress={() => onDelete(index)}
//               >
//                 <Ico name="trash" color="#fff" size={14} />
//               </TouchableOpacity>
//             )}
//           </View>
//         )}
//       />

//       {images.length === 0 && (
//         <View style={styles.carouselEmpty}>
//           <Ico name="image" size={40} color={C.purpleLight} />
//           <Text>Aucune image</Text>
//         </View>
//       )}

//       {/* DOTS */}
//       <View style={styles.dotsRow}>
//         {images.map((_, i) => (
//           <View
//             key={i}
//             style={[
//               styles.dot,
//               i === active && styles.dotActive,
//             ]}
//           />
//         ))}
//       </View>

//       {/* UPLOAD */}
//       {isOwner && (
//         <TouchableOpacity
//           style={styles.uploadBtn}
//           onPress={onUpload}
//         >
//           <Ico name="plus" color="#fff" />
//           <Text style={{ color: '#fff', marginLeft: 5 }}>
//             Ajouter image
//           </Text>
//         </TouchableOpacity>
//       )}
//     </View>
//   );
// };

// /* ───────── CONTACT ───────── */
// const ContactChip = ({ label, value, onEdit }) => (
//   <View style={styles.contactChip}>
//     <Text>{label}: {value}</Text>

//     <TouchableOpacity onPress={onEdit}>
//       <Ico name="edit" />
//     </TouchableOpacity>
//   </View>
// );

// /* ───────── STYLES ───────── */
// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: C.bg },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//   header: { backgroundColor: C.purple },
//   headerRow: { flexDirection: 'row', padding: 12 },
//   headerTitle: { color: '#fff', marginLeft: 10 },

//   infoCard: { margin: 12, padding: 12, backgroundColor: '#fff' },

//   /* carousel */
//   carouselContainer: { position: 'relative' },
//   carouselItem: { width: SCREEN_W, height: 220 },
//   carouselImg: { width: '100%', height: '100%' },

//   carouselEmpty: {
//     height: 220,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   deleteBtn: {
//     position: 'absolute',
//     top: 10,
//     right: 10,
//     backgroundColor: '#00000088',
//     padding: 6,
//     borderRadius: 20,
//   },

//   uploadBtn: {
//     position: 'absolute',
//     bottom: 10,
//     right: 10,
//     flexDirection: 'row',
//     backgroundColor: C.purple,
//     padding: 10,
//     borderRadius: 20,
//   },

//   dotsRow: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginTop: 6,
//   },

//   dot: {
//     width: 6,
//     height: 6,
//     backgroundColor: '#ccc',
//     margin: 3,
//     borderRadius: 3,
//   },

//   dotActive: {
//     width: 18,
//     backgroundColor: C.purple,
//   },

//   contactChip: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     padding: 12,
//     margin: 12,
//     backgroundColor: '#fff',
//   },

//   modalOverlay: {
//     flex: 1,
//     backgroundColor: '#00000066',
//     justifyContent: 'center',
//   },

//   modalCard: {
//     backgroundColor: '#fff',
//     margin: 20,
//     padding: 20,
//   },
// });