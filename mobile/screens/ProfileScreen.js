import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  StatusBar,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { useSelector } from "react-redux";
import Icon from "react-native-vector-icons/FontAwesome";
import { useToast } from "../context/ToastContext";

const ProfileScreen = () => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const { user, logout, isLoading, isAuthenticated } = useAuth();
  const navigation = useNavigation();
  const { favorites } = useSelector((state) => state.cars);
  const { bookingsCount } = useSelector((state) => state.bookings);
  const { userReviewsCount } = useSelector((state) => state.reviews);
  const toast = useToast();
  const [logoutConfirmPending, setLogoutConfirmPending] = useState(false);

  const handleLogout = () => {
    if (!logoutConfirmPending) {
      // First tap - show warning toast
      toast.warning("Tap again to confirm logout");
      setLogoutConfirmPending(true);

      // Reset confirmation state after 3 seconds
      setTimeout(() => {
        setLogoutConfirmPending(false);
      }, 3000);
    } else {
      // Second tap - perform logout
      logout();
      toast.info("You have been logged out");
      setLogoutConfirmPending(false);
    }
  };

  const ProfileHeader = () => {
    // Use isAuthenticated instead of just checking user
    if (!isAuthenticated) {
      return (
        <View style={styles.guestHeader}>
          <Icon name="user-circle" size={80} color={colors.secondary} />
          <Text style={[styles.guestTitle, { color: colors.text }]}>
            Welcome!
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.secondary }]}>
            Log in or create an account to access all features
          </Text>
          <View style={styles.authButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.authButton,
                styles.loginButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.authButton,
                styles.registerButton,
                { borderColor: colors.primary },
              ]}
              onPress={() => navigation.navigate("Register")}
            >
              <Text
                style={[styles.registerButtonText, { color: colors.primary }]}
              >
                Register
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {user.avatar?.url ? (
            // Display the user's avatar image
            <Image source={{ uri: user.avatar.url }} style={styles.avatar} />
          ) : (
            // Fallback: Display an icon or placeholder with the user's initial
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.avatarInitial}>
                {user.firstName ? user.firstName[0].toUpperCase() : "U"}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.editAvatarButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={() =>
              navigation.navigate("EditProfile", {
                screen: "Profile",
                params: { screen: "EditProfile" },
              })
            }
          >
            <Icon name="camera" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.userName, { color: colors.text }]}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={[styles.userEmail, { color: colors.secondary }]}>
          {user.email}
        </Text>

        <TouchableOpacity
          style={[styles.editProfileButton, { borderColor: colors.border }]}
          onPress={() =>
            navigation.navigate("EditProfile", {
              screen: "Profile",
              params: { screen: "EditProfile" },
            })
          }
        >
          <Text style={[styles.editProfileText, { color: colors.primary }]}>
            Edit Profile
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const QuickStats = () => {
    if (!user) return null;

    return (
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {favorites.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>
            Favorites
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {bookingsCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>
            Bookings
          </Text>
        </View>
        <View
          style={[styles.statDivider, { backgroundColor: colors.border }]}
        />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {userReviewsCount || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.secondary }]}>
            Reviews
          </Text>
        </View>
      </View>
    );
  };

  const AccountSection = () => {
    if (!user) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() =>
            navigation.navigate("EditProfile", {
              screen: "Profile",
              params: { screen: "EditProfile" },
            })
          }
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name="user"
              size={20}
              color={colors.primary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Personal Information
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate("MyBookings")}
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name="calendar"
              size={20}
              color={colors.primary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              My Bookings
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate("MyReviews", { userId: user._id })}
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name="star"
              size={20}
              color={colors.primary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              My Reviews
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate("MyFavorites")}
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name="bookmark"
              size={20}
              color={colors.primary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              My Favorites
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  const SettingsSection = () => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Settings
      </Text>

      <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
        <View style={styles.settingInfo}>
          <Icon
            name="moon-o"
            size={20}
            color={colors.primary}
            style={styles.settingIcon}
          />
          <Text style={[styles.settingText, { color: colors.text }]}>
            Dark Mode
          </Text>
        </View>
        <Switch
          value={isDarkMode}
          onValueChange={toggleTheme}
          trackColor={{ false: "#767577", true: colors.primary + "80" }}
          thumbColor={isDarkMode ? colors.primary : "#f4f3f4"}
        />
      </View>

      <TouchableOpacity
        style={[styles.settingItem, { borderBottomColor: colors.border }]}
        onPress={() =>
          navigation.navigate("NotificationsTab", {
            screen: "NotificationsScreen",
          })
        }
      >
        <View style={styles.settingInfo}>
          <Icon
            name="bell"
            size={20}
            color={colors.primary}
            style={styles.settingIcon}
          />
          <Text style={[styles.settingText, { color: colors.text }]}>
            Notifications
          </Text>
        </View>
        <Icon name="angle-right" size={20} color={colors.secondary} />
      </TouchableOpacity>

      {isAuthenticated && (
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => navigation.navigate("PrivacySettings")}
        >
          <View style={styles.settingInfo}>
            <Icon
              name="lock"
              size={20}
              color={colors.primary}
              style={styles.settingIcon}
            />
            <Text style={[styles.settingText, { color: colors.text }]}>
              Privacy & Security
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const SupportSection = () => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>

      <TouchableOpacity
        style={[styles.settingItem, { borderBottomColor: colors.border }]}
        onPress={() => navigation.navigate("TermsConditions")}
      >
        <View style={styles.settingInfo}>
          <Icon
            name="file-text"
            size={20}
            color={colors.primary}
            style={styles.settingIcon}
          />
          <Text style={[styles.settingText, { color: colors.text }]}>
            Terms & Conditions
          </Text>
        </View>
        <Icon name="angle-right" size={20} color={colors.secondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => navigation.navigate("AboutUs")}
      >
        <View style={styles.settingInfo}>
          <Icon
            name="info-circle"
            size={20}
            color={colors.primary}
            style={styles.settingIcon}
          />
          <Text style={[styles.settingText, { color: colors.text }]}>
            About Us
          </Text>
        </View>
        <Icon name="angle-right" size={20} color={colors.secondary} />
      </TouchableOpacity>
    </View>
  );

  const MyCarSection = () => {
    if (!user) return null;

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          My Car
        </Text>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate("MyCar")}
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name="car"
              size={20}
              color={colors.primary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Current Rental
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          onPress={() => navigation.navigate("PutCarOnRent")}
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name="plus-circle"
              size={20}
              color={colors.primary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Put Car on Rent
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("RentalHistory")}
        >
          <View style={styles.menuItemLeft}>
            <Icon
              name="history"
              size={20}
              color={colors.primary}
              style={styles.menuIcon}
            />
            <Text style={[styles.menuItemText, { color: colors.text }]}>
              Rental History
            </Text>
          </View>
          <Icon name="angle-right" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBackground,
            paddingTop:
              Platform.OS === "ios" ? 16 : 16 + (StatusBar.currentHeight || 0),
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>
          Profile
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ProfileHeader />
        <QuickStats />

        <View style={styles.sectionsContainer}>
          <AccountSection />
          <MyCarSection />
          <SettingsSection />
          <SupportSection />

          {user && (
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: colors.error }]}
              onPress={handleLogout}
            >
              <Icon
                name="sign-out"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.logoutText}>
                {logoutConfirmPending ? "Tap again to confirm" : "Logout"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.secondary }]}>
            BMW Rentals v1.0.0
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  guestHeader: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginVertical: 10,
  },
  guestSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  authButtonsContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 10,
  },
  authButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: "center",
  },
  loginButton: {
    borderWidth: 0,
  },
  registerButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  registerButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  profileHeader: {
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "white",
    fontSize: 40,
    fontWeight: "bold",
  },
  editAvatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0066B1",
    position: "absolute",
    bottom: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 16,
  },
  editProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  editProfileText: {
    fontWeight: "600",
  },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    justifyContent: "space-around",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  statDivider: {
    width: 1,
    height: "80%",
  },
  sectionsContainer: {
    padding: 16,
  },
  section: {
    borderRadius: 8,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    padding: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuIcon: {
    marginRight: 12,
    width: 20,
    textAlign: "center",
  },
  menuItemText: {
    fontSize: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingIcon: {
    marginRight: 12,
    width: 20,
    textAlign: "center",
  },
  settingText: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    padding: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
});

export default ProfileScreen;
