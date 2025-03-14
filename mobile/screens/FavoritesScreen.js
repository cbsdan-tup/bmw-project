import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Sample data
const FAVORITE_CARS = [
  { id: '1', model: 'BMW M4', category: 'Sports Car', price: '299/day', rating: 4.9 },
  { id: '2', model: 'BMW 7 Series', category: 'Luxury Sedan', price: '249/day', rating: 4.8 },
  { id: '3', model: 'BMW X5', category: 'SUV', price: '199/day', rating: 4.7 },
];

const FavoritesScreen = () => {
  const { colors } = useTheme();
  
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        globalStyles.card, 
        { 
          backgroundColor: colors.card,
          marginBottom: 16,
          flexDirection: 'row'
        }
      ]}
    >
      <View style={{ 
        height: 80, 
        width: 80, 
        backgroundColor: colors.surface, 
        borderRadius: 8,
        marginRight: 12
      }}/>
      
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[globalStyles.subtitle, { color: colors.text, marginBottom: 4 }]}>
            {item.model}
          </Text>
          <Icon name="heart" size={24} color={colors.accent} />
        </View>
        <Text style={[globalStyles.text, { color: colors.secondary }]}>{item.category}</Text>
        <View style={[globalStyles.row, { justifyContent: 'space-between', marginTop: 8 }]}>
          <Text style={[globalStyles.text, { color: colors.primary, fontWeight: '700' }]}>${item.price}</Text>
          <Text style={[globalStyles.text, { color: colors.secondary }]}>★ {item.rating}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: colors.background, alignItems: 'stretch' }]}>
      <FlatList
        data={FAVORITE_CARS}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Icon name="heart-outline" size={60} color={colors.secondary} />
            <Text style={[globalStyles.subtitle, { color: colors.text, textAlign: 'center', marginTop: 16 }]}>
              No favorites yet
            </Text>
            <Text style={[globalStyles.text, { color: colors.secondary, textAlign: 'center' }]}>
              Start adding cars to your favorites list
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default FavoritesScreen;
