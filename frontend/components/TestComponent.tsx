import React from 'react';
import { View } from 'react-native';
import TextInput from './TextInput';
import { colors } from '../styles/theme';

const TestComponent: React.FC = () => {
  return (
    <View>
      <TextInput label="Test" />
    </View>
  );
};

export default TestComponent; 