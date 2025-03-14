import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, Image, ActivityIndicator } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ProfileScreen = () => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, logout, isLoading } = useAuth();
  const [userData, setUserData] = useState(null);
  
  useEffect(() => {
    if (user) {
      console.log("user: ", user);
      setUserData(user);
    }
  }, [user]);
  
  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled in App.js based on auth state
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };
  
  const renderSettingItem = (icon, title, action, rightElement = null) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
      onPress={action}
    >
      <View style={{ 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16
      }}>
        <Icon name={icon} size={20} color={colors.primary} />
      </View>
      
      <Text style={[globalStyles.text, { flex: 1, color: colors.text }]}>
        {title}
      </Text>
      
      {rightElement || (
        <Icon name="chevron-right" size={20} color={colors.secondary} />
      )}
    </TouchableOpacity>
  );
  
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 16 }}>
        {/* Profile Header */}
        <View style={[globalStyles.card, { backgroundColor: colors.card, alignItems: 'center', padding: 24 }]}>
          <View style={{ 
            width: 100, 
            height: 100, 
            borderRadius: 50, 
            backgroundColor: colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 16,
            overflow: 'hidden'
          }}>
            {userData?.avatar?.url ? (
              <Image 
                source={{ uri: userData.avatar.url }} 
                style={{ width: '100%', height: '100%' }} 
                resizeMode="cover"
              />
            ) : (
              <Icon name="account" size={60} color={colors.secondary} />
            )}
          </View>
          
          <Text style={[globalStyles.title, { color: colors.text, marginBottom: 4 }]}>
            {userData ? `${userData.firstName} ${userData.lastName}` : 'Guest User'}
          </Text>
          
          <Text style={[globalStyles.text, { color: colors.secondary }]}>
            {userData?.email || 'No email provided'}
          </Text>
          
          <TouchableOpacity 
            style={{ 
              marginTop: 16, 
              paddingHorizontal: 20, 
              paddingVertical: 8, 
              backgroundColor: colors.primary,
              borderRadius: 20
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[globalStyles.card, { backgroundColor: colors.card, marginTop: 16 }]}>
          <Text style={[globalStyles.subtitle, { color: colors.text, marginBottom: 16 }]}>
            Account Settings
          </Text>
          
          {renderSettingItem('credit-card', 'Payment Methods', () => {})}
          {renderSettingItem('history', 'Rental History', () => {})}
          {renderSettingItem('help-circle', 'Help & Support', () => {})}
          {renderSettingItem('shield-check', 'Privacy', () => {})}
          {renderSettingItem('moon-waning-crescent', 'Dark Mode', toggleTheme, (
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: colors.primary + '80' }}
              thumbColor={isDarkMode ? colors.primary : "#f4f3f4"}
            />
          ))}
        </View>
        
        <TouchableOpacity 
          style={[globalStyles.button, { 
            backgroundColor: 'transparent', 
            borderWidth: 1, 
            borderColor: colors.accent,
            marginTop: 24,
            alignItems: 'center',
            padding: 12,
          }]}
          onPress={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign Out</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;
