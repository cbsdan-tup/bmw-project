import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Clipboard,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { globalStyles } from '../styles/globalStyles';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDiscountByCode } from '../redux/slices/adminDiscountSlice';

const { width } = Dimensions.get('window');

const DiscountScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { colors, isDarkMode } = useTheme();
  const toast = useToast();
  const [codeOpacity] = useState(new Animated.Value(1));
  
  // Get discount code from navigation params
  const discountCode = route.params?.discountCode;
  
  // Get discount details from Redux store
  const { discountDetails: discount, loading, error } = useSelector(state => state.adminDiscounts);
  
  useEffect(() => {
    // Fetch discount details when component mounts
    if (discountCode) {
      dispatch(fetchDiscountByCode(discountCode));
    }
  }, [dispatch, discountCode]);

  const copyDiscountCode = (code) => {
    Clipboard.setString(code);
    
    // Flash animation for feedback
    Animated.sequence([
      Animated.timing(codeOpacity, {
        toValue: 0.2,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(codeOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
    
    toast.success('Discount code copied to clipboard!');
  };
  
  // Display loading state
  if (loading || (!discount && !error)) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('HomeScreen')} 
          style={styles.closeButton}
        >
          <Icon name="times" size={22} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading discount details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  // Display error state
  if (error || !discount) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('HomeScreen')} 
          style={styles.closeButton}
        >
          <Icon name="times" size={22} color={colors.error} />
        </TouchableOpacity>
        
        <View style={styles.errorContainer}>
          <Icon name="exclamation-circle" size={50} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || "Discount information not available"}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => dispatch(fetchDiscountByCode(discountCode))}
          >
            <Text style={{ color: '#fff' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Close button at top right */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('HomeScreen')} 
        style={styles.closeButton}
      >
        <Icon name="times" size={22} color={colors.error} />
      </TouchableOpacity>
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Discount Header */}
        <LinearGradient
          colors={[colors.primary, colors.primary, 'transparent']}
          style={styles.gradientHeader}
        >
          <View style={styles.discountHeader}>
            {discount.discountLogo && discount.discountLogo.imageUrl ? (
              <Image 
                source={{ uri: discount.discountLogo.imageUrl }} 
                style={styles.discountImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.discountImagePlaceholder, { backgroundColor: colors.primary }]}>
                <Icon name="percent" size={48} color="#FFFFFF" />
              </View>
            )}
          </View>
        </LinearGradient>
        
        {/* Discount Content */}
        <View style={styles.contentContainer}>
          <Text style={[styles.discountTitle, { color: colors.text }]}>
            {discount.discountPercentage}% Discount
          </Text>
          
          {discount.description && (
            <Text style={[styles.discountDescription, { color: colors.secondary }]}>
              {discount.description}
            </Text>
          )}
          
          {/* Promo Code Section */}
          <View style={styles.codeContainer}>
            <View style={styles.codeLabelContainer}>
              <Icon name="tag" size={14} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.codeLabel, { color: colors.primary }]}>
                PROMO CODE
              </Text>
            </View>
            
            <Animated.View 
              style={[
                styles.codeBox, 
                { 
                  backgroundColor: isDarkMode ? colors.card : '#f5f7fa',
                  borderColor: colors.border,
                  opacity: codeOpacity
                }
              ]}
            >
              <Text style={[styles.codeText, { color: colors.text }]}>
                {discount.code}
              </Text>
              <TouchableOpacity 
                style={[styles.copyButton, { backgroundColor: colors.primary }]}
                onPress={() => copyDiscountCode(discount.code)}
              >
                <Text style={styles.copyText}>COPY</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          <View style={styles.divider} />
          
          {/* Dates Section */}
          <View style={styles.detailRow}>
            <View style={[styles.detailItem, { borderColor: colors.border }]}>
              <Icon name="calendar-check-o" size={22} color={colors.primary} />
              <Text style={[styles.detailItemLabel, { color: colors.secondary }]}>
                Valid From
              </Text>
              <Text style={[styles.detailItemValue, { color: colors.text }]}>
                {new Date(discount.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
            
            <View style={[styles.detailItem, { borderColor: colors.border }]}>
              <Icon name="calendar-times-o" size={22} color={colors.error} />
              <Text style={[styles.detailItemLabel, { color: colors.secondary }]}>
                Expires On
              </Text>
              <Text style={[styles.detailItemValue, { color: colors.text }]}>
                {new Date(discount.endDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>
          
          {/* Usage Note */}
          <View style={[styles.usageNote, { 
            backgroundColor: isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)' 
          }]}>
            <Icon name="info-circle" size={18} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={[styles.usageNoteText, { color: colors.text }]}>
              {discount.isOneTime ? 
                "This is a one-time use discount code" : 
                "This discount code can be used multiple times"}
            </Text>
          </View>
          
          {/* Terms and Conditions */}
          {discount.termsAndConditions && (
            <View style={styles.termsSection}>
              <Text style={[styles.termsSectionTitle, { color: colors.text }]}>
                Terms & Conditions
              </Text>
              <Text style={[styles.termsText, { color: colors.secondary }]}>
                {discount.termsAndConditions}
              </Text>
            </View>
          )}
          
          {/* Apply Button */}
          <TouchableOpacity 
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              copyDiscountCode(discount.code);
              navigation.navigate('SearchTab');
            }}
          >
            <Text style={styles.applyButtonText}>
              Book Now and Apply this Code
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gradientHeader: {
    height: 200,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 30, // Add some top margin to compensate for removed header
  },
  discountHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  discountImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  discountImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  discountTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  discountDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  codeContainer: {
    marginBottom: 24,
  },
  codeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  codeText: {
    flex: 1,
    paddingLeft: 16,
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 1.5,
  },
  copyButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  copyText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  detailItem: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: 1,
  },
  detailItemLabel: {
    fontSize: 13,
    marginTop: 12,
    marginBottom: 4,
  },
  detailItemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  usageNote: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  usageNoteText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  termsSection: {
    marginBottom: 24,
  },
  termsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  termsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});

export default DiscountScreen;
