import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const TermsConditionsScreen = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Terms & Conditions
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondary }]}>
            Last Updated: May 1, 2024
          </Text>
        </View>

        {/* Introduction */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            1. Introduction
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            Welcome to Borrow My Wheels. These Terms and Conditions govern your use of the Borrow My Wheels mobile application and website 
            (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms. 
            If you disagree with any part of the terms, you may not access the Service.
          </Text>
        </View>

        {/* User Accounts */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            2. User Accounts
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            When you create an account with us, you must provide accurate, complete, and current information at all times. 
            Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            You are responsible for safeguarding the password that you use to access the Service and for any activities 
            or actions under your password. You agree not to disclose your password to any third party. You must notify us 
            immediately upon becoming aware of any breach of security or unauthorized use of your account.
          </Text>
        </View>

        {/* Rental Process */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            3. Rental Process and Payments
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            3.1 Booking Process: Users can browse available vehicles, select rental dates, and request bookings through the Service. 
            All bookings are subject to vehicle availability and owner approval.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            3.2 Payment Terms: All payments must be made through the designated payment methods available in the Service. 
            Rental fees include the daily rate as specified by the vehicle owner, plus any applicable service fees, taxes, and insurance costs.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            3.3 Security Deposits: Vehicle owners may require security deposits, which will be clearly indicated during the booking process. 
            Deposits will be refunded according to the terms specified by the vehicle owner, less any approved deductions for damages or additional charges.
          </Text>
        </View>

        {/* Vehicle Condition */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            4. Vehicle Condition and Responsibilities
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            4.1 Vehicle Condition: Vehicle owners are responsible for ensuring their vehicles are in good working condition, 
            legally registered, and properly insured for rental purposes.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            4.2 Renter Responsibilities: Renters must:
            • Return the vehicle in the same condition as received, except for normal wear and tear
            • Refill the fuel tank to the level at which it was received
            • Adhere to all local traffic laws and regulations
            • Not smoke, eat, or allow pets in the vehicle unless explicitly permitted by the owner
            • Report any accidents or damages to the vehicle immediately
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            4.3 Restricted Use: Vehicles may not be used for illegal activities, racing, off-roading 
            (unless explicitly permitted for specific vehicles), or to transport hazardous materials.
          </Text>
        </View>

        {/* Cancellations */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            5. Cancellations and Modifications
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            5.1 Cancellation Policy: Cancellation policies vary by vehicle and are set by vehicle owners. 
            The specific policy applicable to each rental will be displayed before booking confirmation.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            5.2 Refunds: Refunds for cancellations will be processed according to the applicable cancellation policy. 
            Service fees may be non-refundable in certain circumstances.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            5.3 Modifications: Booking modifications are subject to vehicle availability and may incur additional charges.
          </Text>
        </View>

        {/* Liability */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            6. Liability and Insurance
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            6.1 Insurance Coverage: All rentals must be covered by valid insurance. This may be provided by the vehicle owner, 
            the renter's personal policy, or through additional insurance options offered through the Service.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            6.2 Liability Limitations: Borrow My Wheels functions as a platform connecting vehicle owners and renters. 
            We are not liable for the condition of vehicles, actions of users, or damages resulting from the use of the Service.
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            6.3 Indemnification: You agree to defend, indemnify, and hold harmless Borrow My Wheels and its affiliates from any claims, 
            liabilities, damages, losses, and expenses arising from your use of the Service or violation of these Terms.
          </Text>
        </View>

        {/* Termination */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            7. Termination
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason, 
            including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
          </Text>
        </View>

        {/* Governing Law */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            8. Governing Law
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            These Terms shall be governed and construed in accordance with the laws of the Philippines, 
            without regard to its conflict of law provisions. Any disputes relating to these Terms or the Service 
            shall be subject to the exclusive jurisdiction of the courts in the Philippines.
          </Text>
        </View>

        {/* Changes to Terms */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            9. Changes to Terms
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
            By continuing to access or use our Service after those revisions become effective, 
            you agree to be bound by the revised terms.
          </Text>
        </View>

        {/* Contact */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            10. Contact Us
          </Text>
          <Text style={[styles.paragraph, { color: colors.text }]}>
            If you have any questions about these Terms, please contact us at:
          </Text>
          <Text style={[styles.contactInfo, { color: colors.primary }]}>
            support@borrowmywheels.com
          </Text>
          <Text style={[styles.contactInfo, { color: colors.text }]}>
            123 Rental Street, Metro Manila, Philippines
          </Text>
          <Text style={[styles.contactInfo, { color: colors.text }]}>
            Phone: +63 (2) 8123 4567
          </Text>
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
  headerContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  section: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
  },
  contactInfo: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  footer: {
    marginTop: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 12,
  },
});

export default TermsConditionsScreen;
