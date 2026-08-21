// Simple AsyncStorage polyfill using global memory for Expo Go compatibility
// For production, use @react-native-async-storage/async-storage

const store = {};

const AsyncStorage = {
  getItem: async (key) => store[key] || null,
  setItem: async (key, value) => { store[key] = value; },
  removeItem: async (key) => { delete store[key]; },
};

export default AsyncStorage;
