// import React, { useEffect, useState, useCallback, useRef } from 'react';
// import {
//   View, Text, FlatList, Image, Dimensions, StyleSheet,
//   TouchableOpacity, TouchableWithoutFeedback, ScrollView,
//   TextInput, Modal, Alert, ActivityIndicator, Platform, StatusBar, Keyboard,
// } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import * as ImagePicker from 'expo-image-picker';
// import { Share } from 'react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import api, { getCompanyById } from '../services/api';

// const { width } = Dimensions.get('window');

// const PURPLE       = '#7C3AED';
// const PURPLE_LIGHT = '#EDE9FE';
// const PURPLE_MID   = '#C4B5FD';
// const RED          = '#EF4444';

// const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:3000';

// // ─── STORAGE ──────────────────────────────────────────────────────────────
// const storageKey = (id) => `company_cache_${id}`;

// const saveLocal = async (id, data) => {
//   try { await AsyncStorage.setItem(storageKey(id), JSON.stringify(data)); } catch (error) { console.error('AsyncStorage save error:', error); }
// };

// const loadLocal = async (id) => {
//   try {
//     const raw = await AsyncStorage.getItem(storageKey(id));
//     return raw ? JSON.parse(raw) : null;
//   } catch (error) { console.error('AsyncStorage load error:', error); return null; }
// };

// // ─── API ───────────────────────────────────────────────────────────────────
// const patchCompany = (id, body) =>
//   api.patch(`/companies/${id}`, body).then(r => r.data);

// const createService = (cId, body) =>
//   api.post(`/companies/${cId}/services`, body).then(r => r.data);

// const patchService = (cId, sId, body) =>
//   api.patch(`/companies/${cId}/services/${sId}`, body).then(r => r.data);

// const removeService = (cId, sId) =>
//   api.delete(`/companies/${cId}/services/${sId}`);

// // ─── UPLOAD ───────────────────────────────────────────────────────────────
// const uploadImage = async (companyId, localUri) => {
//   const filename = localUri.split('/').pop() || 'photo.jpg';

//   const form = new FormData();
//   form.append('image', {
//     uri: localUri,
//     name: filename,
//     type: 'image/jpeg',
//   });

//   const res = await api.post(`/companies/${companyId}/upload-image`, form, {
//     headers: { 'Content-Type': 'multipart/form-data' },
//   });

//   return res.data.url;
// };

// // ─── IMAGE URL FIX (IMPORTANT) ────────────────────────────────────────────
// const imgUrl = (src) => {
//   if (!src) return null;
//   if (src.startsWith('http') || src.startsWith('file://')) return src;
//   return `${API_BASE_URL}${src.startsWith('/') ? src : '/' + src}`;
// };

// // ─── PICK IMAGE ────────────────────────────────────────────────────────────
// const pickImage = async () => {
//   const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
//   if (status !== 'granted') return null;

//   const result = await ImagePicker.launchImageLibraryAsync({
//     mediaTypes: ['images'],
//     quality: 0.8,
//   });

//   if (result.canceled) return null;
//   return result.assets[0].uri;
// };

// // ─── MAIN COMPONENT ───────────────────────────────────────────────────────
// export default function CompanyDetailScreen({ route, navigation }) {
//   const { companyId } = route.params;

//   const [company, setCompany] = useState(null);
//   const [loading, setLoading] = useState(true);

//   const [carouselIndex, setCarouselIndex] = useState(0);
//   const [activeTab, setActiveTab] = useState('services');
//   const [uploading, setUploading] = useState(false);

//   const flatListRef = useRef(null);

//   // ─── LOAD ───────────────────────────────────────────────────────────────
//   useEffect(() => {
//     (async () => {
//       const cached = await loadLocal(companyId);
//       if (cached) {
//         setCompany(cached);
//         setLoading(false);
//       }

//       try {
//         const data = await getCompanyById(companyId);
//         setCompany(data);
//         saveLocal(companyId, data);
//       } catch (e) {
//         if (!cached) Alert.alert('Erreur');
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [companyId]);

//   // ─── UPDATE LOCAL STATE ──────────────────────────────────────────────────
//   const applyUpdate = useCallback((updater) => {
//     setCompany(prev => {
//       const next = updater(prev);
//       saveLocal(companyId, next);
//       return next;
//     });
//   }, [companyId]);

//   // ─── CAROUSEL SYNC ───────────────────────────────────────────────────────
//   const syncCarousel = async (newImages) => {
//     applyUpdate(p => ({ ...p, carouselImages: newImages }));
//     await patchCompany(companyId, { carouselImages: newImages });
//   };

//   // ─── GALLERY SYNC ────────────────────────────────────────────────────────
//   const syncGallery = async (newImages) => {
//     applyUpdate(p => ({ ...p, galleryImages: newImages }));
//     await patchCompany(companyId, { galleryImages: newImages });
//   };

//   // ─── ADD CAROUSEL ────────────────────────────────────────────────────────
//   const addCarouselImage = async () => {
//     const uri = await pickImage();
//     if (!uri) return;

//     const current = company?.carouselImages || [];

//     if (current.length >= 3) {
//       Alert.alert('Limite 3 images');
//       return;
//     }

//     setUploading(true);
//     try {
//       const url = await uploadImage(companyId, uri);
//       await syncCarousel([...current, url]);

//       setTimeout(() => {
//         flatListRef.current?.scrollToEnd({ animated: true });
//         setCarouselIndex(current.length);
//       }, 200);
//     } finally {
//       setUploading(false);
//     }
//   };

//   // ─── ADD GALLERY (FIX IMPORTANT) ─────────────────────────────────────────
//   const addGalleryImage = async () => {
//     const uri = await pickImage();
//     if (!uri) return;

//     setUploading(true);
//     try {
//       const url = await uploadImage(companyId, uri);
//       const current = company?.galleryImages || [];
//       await syncGallery([...current, url]);
//     } finally {
//       setUploading(false);
//     }
//   };

//   // ─── DELETE GALLERY FIX ───────────────────────────────────────────────────
//   const deleteGallery = (i) => {
//     const newImages = (company?.galleryImages || []).filter((_, idx) => idx !== i);
//     syncGallery(newImages);
//   };

//   if (loading && !company) {
//     return (
//       <View style={styles.center}>
//         <ActivityIndicator size="large" color={PURPLE} />
//       </View>
//     );
//   }

//   const carouselImages = company?.carouselImages || [];
//   const galleryImages = company?.galleryImages || [];
//   const services = company?.services || [];

//   return (
//     <View style={styles.root}>
//       <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

//       <SafeAreaView style={styles.header}>
//         <View style={styles.headerRow}>
//           <TouchableOpacity onPress={() => navigation.goBack()}>
//             <Text style={{ color: '#fff', fontSize: 22 }}>‹</Text>
//           </TouchableOpacity>

//           <Text style={styles.headerTitle}>{company?.name}</Text>

//           <TouchableOpacity onPress={() => Share.share({ message: company?.name })}>
//             <Text style={{ color: '#fff' }}>⤴</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>

//       {uploading && (
//         <View style={styles.uploadOverlay}>
//           <ActivityIndicator color="#fff" />
//         </View>
//       )}

//       <ScrollView>

//         {/* ───── CAROUSEL (UNCHANGED UI) ───── */}
//         <View>
//           <Text style={styles.carouselLabelText}>Photos</Text>

//           <FlatList
//             ref={flatListRef}
//             data={carouselImages}
//             horizontal
//             pagingEnabled
//             keyExtractor={(_, i) => i.toString()}
//             onMomentumScrollEnd={(e) =>
//               setCarouselIndex(Math.round(e.nativeEvent.contentOffset.x / width))
//             }
//             renderItem={({ item }) => (
//               <Image
//                 source={{ uri: imgUrl(item) }}
//                 style={styles.carouselImg}
//               />
//             )}
//           />

//           <Text style={{ textAlign: 'center' }}>
//             {carouselIndex + 1} / {carouselImages.length}
//           </Text>

//           <TouchableOpacity onPress={addCarouselImage}>
//             <Text>+ Ajouter photo</Text>
//           </TouchableOpacity>
//         </View>

//         {/* ───── GALLERY (FIXED ONLY LOGIC) ───── */}
//         <View>
//           <Text style={styles.sectionTitle}>Galerie</Text>

//           <View style={styles.galleryGrid}>
//             {galleryImages.map((uri, i) => (
//               <View key={i} style={styles.galleryItemWrapper}>
//                 <Image
//                   source={{ uri: imgUrl(uri) }}
//                   style={styles.galleryImg}
//                 />

//                 <TouchableOpacity onPress={() => deleteGallery(i)}>
//                   <Text>🗑</Text>
//                 </TouchableOpacity>
//               </View>
//             ))}
//           </View>

//           <TouchableOpacity onPress={addGalleryImage}>
//             <Text>+ Ajouter galerie</Text>
//           </TouchableOpacity>
//         </View>

//         <View style={{ height: 40 }} />
//       </ScrollView>
//     </View>
//   );
// }

// // ─── STYLES (UNCHANGED) ───────────────────────────────────────────────────
// const styles = StyleSheet.create({
//   root: { flex: 1, backgroundColor: '#F6F6F9' },
//   center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

//   header: {
//     backgroundColor: PURPLE,
//     padding: 16,
//   },
//   headerRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   headerTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: '700',
//   },

//   uploadOverlay: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   carouselImg: {
//     width,
//     height: 220,
//   },

//   carouselLabelText: {
//     fontSize: 16,
//     fontWeight: '700',
//     margin: 10,
//   },

//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: '700',
//     margin: 10,
//   },

//   galleryGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//   },

//   galleryItemWrapper: {
//     margin: 5,
//   },

//   galleryImg: {
//     width: 100,
//     height: 100,
//   },
// });