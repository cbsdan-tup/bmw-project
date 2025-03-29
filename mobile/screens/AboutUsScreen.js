import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import Icon from "react-native-vector-icons/FontAwesome";

const { width } = Dimensions.get("window");

const StepCard = ({ number, title, steps, icon, colors }) => (
  <View style={[styles.stepCard, { backgroundColor: colors.card }]}>
    <View
      style={[styles.stepNumberContainer, { backgroundColor: colors.primary }]}
    >
      <Text style={styles.stepNumber}>{number}</Text>
    </View>
    <View style={styles.stepIcon}>
      <Icon name={icon} size={28} color={colors.primary} />
    </View>
    <Text style={[styles.stepTitle, { color: colors.text }]}>{title}</Text>
    {steps.map((step, index) => (
      <View key={index} style={styles.stepRow}>
        <Text style={[styles.stepBullet, { color: colors.primary }]}>•</Text>
        <Text style={[styles.stepDescription, { color: colors.secondary }]}>
          {step}
        </Text>
      </View>
    ))}
  </View>
);

const AboutUsScreen = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Logo/Banner */}
        <View style={styles.bannerContainer}>
          <View style={[styles.banner, { backgroundColor: colors.primary }]}>
            <Text style={styles.welcomeText}>Welcome to</Text>
            <View style={{ alignItems: "center", gap: 10, flexDirection: "row" }}>
              <Image
                source={require("../assets/bmw-logo.png")}
                style={{ width: 100, height: 100 }}
              />
              <Text style={styles.brandName}>Borrow My Wheels</Text>
            </View>
          </View>
        </View>

        {/* Get Started Steps */}
        <Text style={[styles.stepsHeading, { color: colors.text }]}>
          Get started with 4 simple steps
        </Text>

        <View style={styles.stepsContainer}>
          <StepCard
            number="1"
            title="Create a profile"
            icon="user-plus"
            steps={[
              "Visit our website or download our app 'Borrow My Wheels' and Register your account.",
              "Fill out the registration form with your details.",
              "Log in and put the information needed.",
            ]}
            colors={colors}
          />

          <StepCard
            number="2"
            title="Tell us what car you want"
            icon="car"
            steps={[
              "Select the car type you need (e.g., sedan, SUV, or truck).",
              "Specify your preferred brand, model, and features.",
              "Indicate your budget and any additional requirements.",
              "Submit the details, and we'll match you with the best options.",
            ]}
            colors={colors}
          />

          <StepCard
            number="3"
            title="Match with seller"
            icon="handshake-o"
            steps={[
              "Browse through our list of verified sellers.",
              "Check seller profiles and customer reviews.",
              "Contact the seller to discuss your requirements.",
              "Schedule a meeting or test drive to finalize details.",
            ]}
            colors={colors}
          />

          <StepCard
            number="4"
            title="Make a deal"
            icon="money"
            steps={[
              "Negotiate the price and finalize terms with the seller.",
              "Agree on a payment method and schedule.",
              "Complete the necessary paperwork and documentation.",
              "Make the payment and close the deal securely.",
            ]}
            colors={colors}
          />
        </View>

        {/* About Us Content */}
        <View style={[styles.aboutSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.aboutTitle, { color: colors.text }]}>
            About Us
          </Text>
          <Text style={[styles.aboutText, { color: colors.secondary }]}>
            Welcome to our Car Rental service! We offer a wide selection of
            vehicles to meet all your transportation needs. Whether you need a
            quick city drive, a road trip, or a special occasion car, we've got
            you covered.
          </Text>
          <Text
            style={[
              styles.aboutText,
              { color: colors.secondary, marginTop: 10 },
            ]}
          >
            Our goal is to provide a seamless car rental experience with easy
            booking, flexible rates, and top-notch customer service. We're here
            to make your journeys as comfortable and hassle-free as possible.
          </Text>
          <Text
            style={[
              styles.aboutText,
              { color: colors.secondary, marginTop: 10 },
            ]}
          >
            Search for cheap rental cars in the Philippines. With a diverse
            fleet of many vehicles, with an attractive and fun selection.
          </Text>
        </View>

        {/* Car Types */}
        <View style={[styles.fleetSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.fleetTitle, { color: colors.text }]}>
            Our Fleet
          </Text>
          <View style={styles.carTypesContainer}>
            <View style={styles.carTypeItem}>
              <Icon name="car" size={24} color={colors.primary} />
              <Text style={[styles.carTypeText, { color: colors.text }]}>
                Sedans
              </Text>
            </View>
            <View style={styles.carTypeItem}>
              <Icon name="truck" size={24} color={colors.primary} />
              <Text style={[styles.carTypeText, { color: colors.text }]}>
                SUVs
              </Text>
            </View>
            <View style={styles.carTypeItem}>
              <Icon name="fighter-jet" size={24} color={colors.primary} />
              <Text style={[styles.carTypeText, { color: colors.text }]}>
                Luxury
              </Text>
            </View>
            <View style={styles.carTypeItem}>
              <Icon name="bus" size={24} color={colors.primary} />
              <Text style={[styles.carTypeText, { color: colors.text }]}>
                Vans
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            © 2024 Borrow My Wheels. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bannerContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  banner: {
    width: "100%",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  welcomeText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "500",
  },
  brandName: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 8,
  },
  stepsHeading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepCard: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stepNumberContainer: {
    position: "absolute",
    top: -15,
    left: 20,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  stepIcon: {
    alignItems: "center",
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  stepRow: {
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  stepBullet: {
    fontSize: 16,
    marginRight: 8,
  },
  stepDescription: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  aboutSection: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  aboutTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 24,
  },
  fleetSection: {
    padding: 20,
    borderRadius: 10,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fleetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  carTypesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    marginTop: 8,
  },
  carTypeItem: {
    alignItems: "center",
    width: width / 4 - 20,
    marginBottom: 16,
  },
  carTypeText: {
    marginTop: 8,
    fontSize: 14,
  },
  footer: {
    marginTop: 10,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
  },
});

export default AboutUsScreen;
