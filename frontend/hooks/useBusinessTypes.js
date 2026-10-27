import { useEffect, useState } from 'react';
import { getBusinessTypes } from '../services/api';
import { mergeBusinessTypes } from '../utils/businessTypes';

export function useBusinessTypes(fallbackCategories, language) {
  const [businessTypes, setBusinessTypes] = useState(fallbackCategories);

  useEffect(() => {
    let isCurrent = true;

    getBusinessTypes()
      .then((types) => {
        if (isCurrent && types.length) {
          setBusinessTypes(mergeBusinessTypes(types, fallbackCategories, language));
        }
      })
      .catch((error) => console.warn('Unable to load business types:', error?.message || error));

    return () => {
      isCurrent = false;
    };
  }, [fallbackCategories, language]);

  return businessTypes;
}