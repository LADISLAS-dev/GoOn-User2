import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { CompanyStore } from '../services/CompanyStore';
import { createService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function AddServiceScreen({ route, navigation }) {
  const { company } = route.params;
  const { t } = useLanguage();
  const tr = (key, fallback) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const add = async () => {
    setError('');

    const trimmedName = name.trim();
    const parsedPrice = parseFloat(price.replace(',', '.'));

    if (!trimmedName) {
      setError(tr('serviceNameRequired', 'Service name is required.'));
      return;
    }

    if (!parsedPrice || parsedPrice <= 0) {
      setError(tr('servicePriceInvalid', 'Please enter a valid price.'));
      return;
    }

    const newService = {
      name: trimmedName,
      price: parsedPrice,
    };

    try {
      const savedService = await createService(company._id || company.id, newService);
      CompanyStore.updateCompany({
        ...company,
        services: [...(company.services || []), savedService],
      });
      navigation.goBack();
    } catch (err) {
      console.error('Failed to save service:', err);
      setError(tr('serviceSaveError', 'Unable to save service.'));
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder={tr('serviceLabel', 'Service')}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        placeholder={tr('priceLabel', 'Price')}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
      />
      {error ? (
        <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>
      ) : null}
      <Button title={tr('addServiceCta', 'Add service')} onPress={add} />
    </View>
  );
}