import * as ImagePicker from 'expo-image-picker';

/**
 * Custom hook for lazy-loading and using the image picker
 * Provides a wrapper around expo-image-picker for cleaner API usage
 * 
 * @returns {Object} Image picker interface with:
 *   - requestMediaLibraryPermissionsAsync()
 *   - launchImageLibraryAsync(options)
 */
export const useLazyImagePicker = () => {
  return {
    requestMediaLibraryPermissionsAsync: async () => {
      return ImagePicker.requestMediaLibraryPermissionsAsync();
    },
    launchImageLibraryAsync: async (options) => {
      return ImagePicker.launchImageLibraryAsync(options);
    },
  };
};
