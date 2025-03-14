import React from 'react';
import { View, Text, ScrollView, Image, SafeAreaView } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { useTheme } from '../context/ThemeContext';

const HomeScreen = () => {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 16 }}>
          <Text style={[globalStyles.title, { color: colors.text }]}>
            Welcome to BMW Rentals
          </Text>
          
          <Text style={[globalStyles.subtitle, { color: colors.text }]}>
            Featured Cars
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 16 }}>
            {[1, 2, 3].map((item) => (
              <View 
                key={item}
                style={[
                  globalStyles.card, 
                  { 
                    backgroundColor: colors.card,
                    marginRight: 16,
                    width: 280
                  }
                ]}
              >
                <View style={{ height: 150, backgroundColor: colors.surface, borderRadius: 8, marginBottom: 12 }}/>
                <Text style={[globalStyles.subtitle, { color: colors.text, marginBottom: 4 }]}>BMW X{item}</Text>
                <Text style={[globalStyles.text, { color: colors.secondary }]}>Luxury SUV</Text>
                <View style={[globalStyles.row, { justifyContent: 'space-between', marginTop: 8 }]}>
                  <Text style={[globalStyles.text, { color: colors.primary, fontWeight: '700' }]}>$199/day</Text>
                  <Text style={[globalStyles.text, { color: colors.secondary }]}>★ 4.{9-item}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <Text style={[globalStyles.subtitle, { color: colors.text }]}>
            Special Offers
          </Text>
          
          <View style={[globalStyles.card, { backgroundColor: colors.primary, marginVertical: 16 }]}>
            <Text style={[globalStyles.subtitle, { color: '#fff' }]}>Summer Discount</Text>
            <Text style={{ color: '#fff', marginBottom: 8 }}>Get 15% off on weekly rentals</Text>
            <View style={{ 
              backgroundColor: '#fff', 
              paddingHorizontal: 12, 
              paddingVertical: 6, 
              borderRadius: 4,
              alignSelf: 'flex-start'
            }}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>SUMMER15</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
