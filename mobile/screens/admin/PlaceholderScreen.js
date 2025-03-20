import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useRoute } from '@react-navigation/native';

const PlaceholderScreen = () => {
  const { colors } = useTheme();
  const route = useRoute();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.text }]}>
        {route.name} Screen - Coming Soon
      </Text>
      <Text style={[styles.subText, { color: colors.secondary }]}>
        This feature is under development
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
  text: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default PlaceholderScreen;
