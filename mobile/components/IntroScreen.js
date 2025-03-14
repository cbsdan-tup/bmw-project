import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  TouchableOpacity, 
  Image,
  Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '0',
    title: 'Welcome to\nBorrow My Wheels',
    subtitle: 'Find your perfect BMW rental',
    isWelcomeSlide: true, 
  },
  {
    id: '1',
    title: 'Create a profile',
    steps: [
      'Click the "Register" button.',
      'Fill out the registration form with your details.',
      'Log in and put the information needed.'
    ],
    icon: 'user-circle-o'
  },
  {
    id: '2',
    title: 'Tell us what car you want',
    steps: [
      'Select the car type you need (e.g., sedan, SUV, or truck).',
      'Specify your preferred brand, model, and features.',
      'Indicate your budget and any additional requirements.',
      'Submit the details, and we\'ll match you with the best options.'
    ],
    icon: 'car'
  },
  {
    id: '3',
    title: 'Match with our renter',
    steps: [
      'Browse through our list of verified sellers.',
      'Check seller profiles and customer reviews.',
      'Contact the seller to discuss your requirements.',
      'Schedule a meeting or test drive to finalize details.'
    ],
    icon: 'handshake-o'
  },
  {
    id: '4',
    title: 'Make a deal',
    steps: [
      'Negotiate the price and finalize terms with the seller.',
      'Agree on a payment method and schedule.',
      'Complete the necessary paperwork and documentation.',
      'Make the payment and close the deal securely.'
    ],
    icon: 'check-circle'
  }
];

const IntroScreen = ({ onComplete }) => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();
  const scrollX = useRef(new Animated.Value(0)).current;
  const videoRef = useRef(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const viewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const scrollTo = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ index });
    }
  };
  
  const handleSkip = () => {
    onComplete();
  };

  const renderItem = ({ item, index }) => {
    if (item.isWelcomeSlide) {
      return (
        <View style={styles.slide}>
          <Video
            ref={videoRef}
            source={require('../assets/videos/car-intro.mp4')} 
       o    rate={1.0}
            volume={0.0}
            isMuted={true}
            resfaode="cover"
            shouldPlay
            isLooping
            style={styles.backgroundVideo}
          />
          
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
            style={styles.videoOverlay}
          />
          
          <View style={styles.welcomeTextContainer}>
            <Image 
              source={require('../assets/bmw-logo.png')}
              style={styles.welcomeLogo}
              resizeMode="contain"
            />
            
            <Animated.Text style={styles.welcomeTitle}>
              {item.title}
            </Animated.Text>
            
            <View style={styles.welcomeTaglineContainer}>
              <Text style={styles.welcomeSubtitle}>{item.subtitle}</Text>
            </View>
            
            <View style={styles.welcomeFeatures}>
              <View style={styles.featureItem}>
                <FontAwesome name="car" size={22} color="#fff" style={styles.featureIcon} />
                <Text style={styles.featureText}>Approved Car Collection</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome name="map-marker" size={22} color="#fff" style={styles.featureIcon} />
                <Text style={styles.featureText}>Convenient Locations</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome name="shield" size={22} color="#fff" style={styles.featureIcon} />
                <Text style={styles.featureText}>Safe & Secure Rentals</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    
    return (
      <View style={[styles.slide, { backgroundColor: colors.background }]}>
        <View style={styles.iconContainer}>
          <FontAwesome 
            name={item.icon} 
            size={80} 
            color={colors.primary} 
            style={styles.icon} 
          />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>
          {item.title}
        </Text>
        
        <View style={styles.stepsContainer}>
          {item.steps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>{idx + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
          <MaterialIcons 
            name={isDarkMode ? 'wb-sunny' : 'nightlight-round'} 
            size={24} 
            color={colors.text} 
          />
          <Text style={[styles.themeText, { color: colors.text }]}>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={32}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => {
            const inputRange = [
              (index - 1) * width,
              index * width,
              (index + 1) * width
            ];
            
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [10, 20, 10],
              extrapolate: 'clamp'
            });
            
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp'
            });
            
            return (
              <Animated.View
                key={index.toString()}
                style={[
                  styles.dot,
                  { 
                    width: dotWidth,
                    opacity,
                    backgroundColor: colors.primary
                  }
                ]}
              />
            );
          })}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}>
            <Text style={[styles.buttonText, { color: colors.text }]}>Skip</Text>
          </TouchableOpacity>

          {currentIndex < slides.length - 1 ? (
            <TouchableOpacity 
              style={[styles.button, styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={() => scrollTo(currentIndex + 1)}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={onComplete}>
              <Text style={styles.nextButtonText}>Get Started</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 5,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  themeText: {
    marginLeft: 6,
    fontSize: 14,
  },
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 50,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    borderRadius: 100,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  icon: {
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  stepsContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingHorizontal: 30,
  },
  nextButton: {
    paddingHorizontal: 30,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
    zIndex: 1,
  },
  welcomeTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    padding: 20,
    width: '100%',
  },
  welcomeLogo: {
    width: 100,
    height: 100,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 5,
    letterSpacing: 1,
  },
  welcomeTaglineContainer: {
    backgroundColor: 'rgba(0, 102, 204, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 40,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  welcomeFeatures: {
    width: '90%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureIcon: {
    marginRight: 15,
    width: 24,
    textAlign: 'center',
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default IntroScreen;
