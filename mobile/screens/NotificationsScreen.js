import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { useTheme } from '../context/ThemeContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Sample notifications data
const NOTIFICATIONS = [
  { 
    id: '1', 
    title: 'Rental Reminder', 
    message: 'Your BMW X3 rental is due tomorrow. Don\'t forget to return it on time!',
    time: '2 hours ago',
    read: false,
    type: 'reminder'
  },
  { 
    id: '2', 
    title: 'Special Offer', 
    message: 'Weekend discount! Get 20% off on premium car rentals this weekend.',
    time: '1 day ago',
    read: true,
    type: 'promotion'
  },
  { 
    id: '3', 
    title: 'New Model Available', 
    message: 'The all-new BMW i4 is now available for rent. Be the first to experience it!',
    time: '3 days ago',
    read: true,
    type: 'news'
  },
];

const NotificationsScreen = () => {
  const { colors } = useTheme();
  
  const getIconForType = (type) => {
    switch(type) {
      case 'reminder': return 'clock-outline';
      case 'promotion': return 'tag-outline';
      case 'news': return 'newspaper';
      default: return 'bell-outline';
    }
  };
  
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        globalStyles.card, 
        { 
          backgroundColor: colors.card,
          marginBottom: 16,
          opacity: item.read ? 0.8 : 1,
          borderLeftWidth: 4,
          borderLeftColor: item.read ? 'transparent' : colors.primary,
        }
      ]}
    >
      <View style={{ flexDirection: 'row' }}>
        <View style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 20, 
          backgroundColor: item.read ? colors.surface : colors.primary + '20',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12
        }}>
          <Icon 
            name={getIconForType(item.type)} 
            size={20} 
            color={item.read ? colors.secondary : colors.primary} 
          />
        </View>
        
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[
              globalStyles.subtitle, 
              { 
                color: colors.text, 
                marginBottom: 4,
                fontWeight: item.read ? '400' : '600'
              }
            ]}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 12, color: colors.secondary }}>{item.time}</Text>
          </View>
          
          <Text style={[globalStyles.text, { color: colors.secondary }]}>
            {item.message}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: colors.background, alignItems: 'stretch' }]}>
      <FlatList
        data={NOTIFICATIONS}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40 }}>
            <Icon name="bell-outline" size={60} color={colors.secondary} />
            <Text style={[globalStyles.subtitle, { color: colors.text, textAlign: 'center', marginTop: 16 }]}>
              No notifications
            </Text>
            <Text style={[globalStyles.text, { color: colors.secondary, textAlign: 'center' }]}>
              You're all caught up!
            </Text>
          </View>
        }
      />
    </View>
  );
};

export default NotificationsScreen;
