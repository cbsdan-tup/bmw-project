import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const AdminScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  
  const adminMenuItems = [
    { name: 'Dashboard', icon: 'dashboard', route: 'Dashboard' },
    { name: 'User Management', icon: 'users', route: 'UserManagement' },
    { name: 'Cars Management', icon: 'car', route: 'CarsManagement' },
    { name: 'Rental Management', icon: 'calendar-check-o', route: 'RentalManagement' },
    { name: 'Reviews Management', icon: 'star', route: 'ReviewsManagement' },
    { name: 'Discounts Management', icon: 'percent', route: 'DiscountsManagement' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Admin Dashboard</Text>
      </View>
      
      <View style={styles.menuGrid}>
        {adminMenuItems.map((item) => (
          <TouchableOpacity 
            key={item.name}
            style={[styles.menuItem, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Icon name={item.icon} size={30} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 10,
  },
  menuItem: {
    width: '45%',
    padding: 20,
    marginVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuText: {
    marginTop: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AdminScreen;
