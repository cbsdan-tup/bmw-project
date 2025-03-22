import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useRoute } from '@react-navigation/native';

const PlaceholderScreen = () => {
  const { colors } = useTheme();
  const route = useRoute();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {route.name} Screen
      </Text>
      <Text style={[styles.description, { color: colors.text }]}>
        This is a placeholder for the {route.name} functionality.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default PlaceholderScreen;
