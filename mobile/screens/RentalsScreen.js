import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Sample data for active and past rentals
const ACTIVE_RENTALS = [
  { id: '1', model: 'BMW X3', startDate: 'May 15, 2023', endDate: 'May 20, 2023', status: 'active' },
];

const PAST_RENTALS = [
  { id: '2', model: 'BMW 3 Series', startDate: 'Apr 10, 2023', endDate: 'Apr 15, 2023', status: 'completed' },
  { id: '3', model: 'BMW i8', startDate: 'Mar 5, 2023', endDate: 'Mar 7, 2023', status: 'completed' },
];

const RentalsScreen = () => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('active');
  
  const renderRentalItem = ({ item }) => (
    <TouchableOpacity
      style={[
        globalStyles.card, 
        { 
          backgroundColor: colors.card,
          marginBottom: 16,
        }
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[globalStyles.subtitle, { color: colors.text }]}>
          {item.model}
        </Text>
        <View style={{ 
          paddingHorizontal: 8, 
          paddingVertical: 2, 
          backgroundColor: item.status === 'active' ? colors.accent : colors.secondary, 
          borderRadius: 4 
        }}>
          <Text style={{ color: '#fff', fontSize: 12, textTransform: 'uppercase' }}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={[globalStyles.row, { marginTop: 16 }]}>
        <Icon name="calendar" size={18} color={colors.secondary} style={{ marginRight: 6 }} />
        <Text style={[globalStyles.text, { color: colors.secondary }]}>
          {item.startDate} - {item.endDate}
        </Text>
      </View>
      
      {item.status === 'active' && (
        <TouchableOpacity 
          style={{ 
            marginTop: 12, 
            padding: 10, 
            backgroundColor: colors.primary, 
            borderRadius: 4,
            alignItems: 'center'
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Extend Rental</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: colors.background, alignItems: 'stretch' }]}>
      <View style={[globalStyles.row, { padding: 16, paddingBottom: 0 }]}>
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            padding: 10, 
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'active' ? colors.primary : 'transparent',
          }}
          onPress={() => setActiveTab('active')}
        >
          <Text style={{ 
            color: activeTab === 'active' ? colors.primary : colors.secondary,
            fontWeight: activeTab === 'active' ? '700' : '400',
          }}>
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={{ 
            flex: 1, 
            padding: 10, 
            alignItems: 'center',
            borderBottomWidth: 2,
            borderBottomColor: activeTab === 'past' ? colors.primary : 'transparent',
          }}
          onPress={() => setActiveTab('past')}
        >
          <Text style={{ 
            color: activeTab === 'past' ? colors.primary : colors.secondary,
            fontWeight: activeTab === 'past' ? '700' : '400',
          }}>
            Past
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={activeTab === 'active' ? ACTIVE_RENTALS : PAST_RENTALS}
        renderItem={renderRentalItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Icon name="car" size={60} color={colors.secondary} />
            <Text style={[globalStyles.subtitle, { color: colors.text, textAlign: 'center', marginTop: 16 }]}>
              No {activeTab} rentals
            </Text>
            <Text style={[globalStyles.text, { color: colors.secondary, textAlign: 'center' }]}>
              {activeTab === 'active' 
                ? "You don't have any active rentals" 
                : "You haven't rented any cars yet"}
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default RentalsScreen;
