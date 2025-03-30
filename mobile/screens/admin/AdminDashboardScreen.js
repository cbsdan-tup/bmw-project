import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../../context/ThemeContext";
import Icon from "react-native-vector-icons/FontAwesome";
import {
  fetchDashboardStats,
  fetchTopRentedCars,
  fetchMonthlySales,
  fetchUserActivity,
  setSelectedYear,
  fetchDiscountStats,
} from "../../redux/slices/adminDashboardSlice";
import { Card } from "react-native-paper";
import {
  SimpleBarChart,
  SimplePieChart,
  SimpleLineChart,
} from "../../components/SimpleCharts";
import DiscountAnalyticsCard from "../../components/admin/DiscountAnalyticsCard";

// Fallback text-based chart for when even simple charts don't work
const TextChart = ({ data, title, type, colors }) => {
  const textColor = colors.text;

  if (type === "pie" && Array.isArray(data)) {
    return (
      <View style={styles.textChartContainer}>
        <Text style={[styles.chartTitle, { color: textColor }]}>{title}</Text>
        {data.map((item, index) => (
          <View key={index} style={styles.textChartRow}>
            <View
              style={[styles.colorIndicator, { backgroundColor: item.color }]}
            />
            <Text style={[styles.textChartLabel, { color: textColor }]}>
              {item.name}
            </Text>
            <Text style={[styles.textChartValue, { color: textColor }]}>
              {item.count}
            </Text>
            <Text style={[styles.textChartPercentage, { color: textColor }]}>
              {data.reduce((sum, d) => sum + d.count, 0) > 0
                ? `(${(
                    (item.count / data.reduce((sum, d) => sum + d.count, 0)) *
                    100
                  ).toFixed(1)}%)`
                : "(0%)"}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (type === "bar" && data?.datasets?.[0]?.data) {
    const values = data.datasets[0].data;
    const labels = data.labels || [];

    return (
      <View style={styles.textChartContainer}>
        <Text style={[styles.chartTitle, { color: textColor }]}>{title}</Text>
        {values.map((value, index) => (
          <View key={index} style={styles.textChartRow}>
            <Text
              style={[
                styles.textChartLabel,
                { color: textColor, minWidth: 40 },
              ]}
            >
              {labels[index] || `Item ${index + 1}`}
            </Text>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.min(
                      (value / Math.max(...values)) * 100,
                      100
                    )}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.textChartValue,
                { color: textColor, minWidth: 40 },
              ]}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  if (type === "line" && data?.datasets?.[0]?.data) {
    const values = data.datasets[0].data;
    const labels = data.labels || [];

    return (
      <View style={styles.textChartContainer}>
        <Text style={[styles.chartTitle, { color: textColor }]}>{title}</Text>
        <Text style={[styles.textChartSubtitle, { color: textColor }]}>
          Monthly Data:
        </Text>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeader, { color: textColor, flex: 1 }]}>
              Month
            </Text>
            <Text
              style={[
                styles.tableHeader,
                { color: textColor, flex: 1, textAlign: "right" },
              ]}
            >
              Value
            </Text>
          </View>
          {values.map((value, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { color: textColor, flex: 1 }]}>
                {labels[index] || `Month ${index + 1}`}
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  { color: textColor, flex: 1, textAlign: "right" },
                ]}
              >
                ₱{typeof value === "number" ? value.toFixed(2) : "0.00"}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.textChartContainer}>
      <Text style={[styles.chartTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.noChartData, { color: textColor }]}>
        Chart visualization not available
      </Text>
    </View>
  );
};

// Stat Card component for dashboard metrics
const StatCard = ({
  title,
  value,
  icon,
  backgroundColor,
  textColor,
  accentColor,
}) => (
  <View style={[styles.statCard, { backgroundColor }]}>
    <Icon name={icon} size={24} color={accentColor} style={styles.statIcon} />
    <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
    <Text style={[styles.statTitle, { color: textColor }]}>{title}</Text>
  </View>
);

const AdminDashboardScreen = () => {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const screenWidth = Dimensions.get("window").width;

  const {
    loading,
    userStats,
    carStats,
    rentalStats,
    reviewStats,
    salesStats,
    topRentedCars,
    monthlySales,
    selectedYear,
    discountStats,
  } = useSelector((state) => state.adminDashboard);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log("Loading dashboard data...");

      // Use individual dispatches for better error handling
      dispatch(fetchDashboardStats());
      dispatch(fetchTopRentedCars());
      dispatch(fetchMonthlySales(selectedYear));
      dispatch(fetchUserActivity(30));

      // Add explicit logging for discount stats
      console.log("Fetching discount stats...");
      const discountResult = dispatch(fetchDiscountStats());
      console.log("Discount stats result:", discountResult);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Month names for chart labels
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Prepare data for monthly sales chart
  const salesChartData = monthlySales?.length
    ? monthNames.map((_, index) => {
        const monthData = monthlySales.find((item) => item.month === index + 1);
        return monthData ? monthData.revenue : 0;
      })
    : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  // User role distribution data for pie chart
  const userRoleData = [
    {
      name: "Admins",
      count: userStats?.roleDistribution?.admin || 0,
      color: "#FF6384",
    },
    {
      name: "Users",
      count: userStats?.roleDistribution?.user || 0,
      color: "#36A2EB",
    },
  ];

  // Car type distribution data for pie chart
  const carTypeData = carStats?.byType?.length
    ? carStats.byType.map((type, index) => ({
        name: type._id || "Unknown",
        count: type.count,
        color: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"][
          index % 5
        ],
      }))
    : [{ name: "No Data", count: 1, color: "#ddd" }];

  // Review rating distribution data for bar chart
  const ratingDistributionData = [
    reviewStats?.ratingDistribution?.[1] || 0,
    reviewStats?.ratingDistribution?.[2] || 0,
    reviewStats?.ratingDistribution?.[3] || 0,
    reviewStats?.ratingDistribution?.[4] || 0,
    reviewStats?.ratingDistribution?.[5] || 0,
  ];

  // Rental status distribution data for pie chart
  const rentalStatusData = [
    {
      name: "Pending",
      count: rentalStats?.pending || 0,
      color: "#FFCE56",
    },
    {
      name: "Active",
      count: rentalStats?.active || 0,
      color: "#36A2EB",
    },
    {
      name: "Completed",
      count: rentalStats?.completed || 0,
      color: "#4BC0C0",
    },
    {
      name: "Canceled",
      count: rentalStats?.canceled || 0,
      color: "#FF6384",
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.headerTitle, { color: colors.text }]}>
        Dashboard Overview
      </Text>

      {loading && !refreshing ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <>
          {/* Stats Overview Cards */}
          <View style={styles.statsGrid}>
            <StatCard
              title="Total Users"
              value={userStats.total || 0}
              icon="users"
              backgroundColor={colors.card}
              textColor={colors.text}
              accentColor={colors.primary}
            />
            <StatCard
              title="Active Cars"
              value={carStats.active || 0}
              icon="car"
              backgroundColor={colors.card}
              textColor={colors.text}
              accentColor="#36A2EB"
            />
            <StatCard
              title="Active Rentals"
              value={rentalStats.active || 0}
              icon="calendar-check-o"
              backgroundColor={colors.card}
              textColor={colors.text}
              accentColor="#FFCE56"
            />
            <StatCard
              title="Revenue"
              value={`₱${(salesStats?.totalRevenue || 0).toFixed(2)}`}
              icon="money"
              backgroundColor={colors.card}
              textColor={colors.text}
              accentColor="#4BC0C0"
            />
          </View>

          {/* Monthly Revenue Chart */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Card.Title
              title="Monthly Revenue"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <View style={styles.yearSelector}>
                <TouchableOpacity
                  onPress={() => {
                    const newYear = selectedYear - 1;
                    dispatch(setSelectedYear(newYear));
                    dispatch(fetchMonthlySales(newYear));
                  }}
                >
                  <Icon name="chevron-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.yearText, { color: colors.text }]}>
                  {selectedYear}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    const newYear = selectedYear + 1;
                    if (newYear <= new Date().getFullYear()) {
                      dispatch(setSelectedYear(newYear));
                      dispatch(fetchMonthlySales(newYear));
                    }
                  }}
                >
                  <Icon name="chevron-right" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <SimpleLineChart
                data={salesChartData}
                labels={monthNames}
                height={220}
                colors={colors}
              />
            </Card.Content>
          </Card>

          {/* User Statistics */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Card.Title
              title="User Statistics"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <View style={styles.statDetailsContainer}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Active Users:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {userStats.active || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Disabled Users:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {userStats.disabled || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    New This Month:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {userStats.newUsersThisMonth || 0}
                  </Text>
                </View>
              </View>

              {/* User Role Distribution Pie Chart */}
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                User Distribution by Role
              </Text>
              <SimplePieChart data={userRoleData} height={180} />
            </Card.Content>
          </Card>

          {/* Car Statistics */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Card.Title
              title="Car Statistics"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <View style={styles.statDetailsContainer}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Total Cars:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {carStats.total || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Active Cars:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {carStats.active || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Inactive Cars:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {carStats.inactive || 0}
                  </Text>
                </View>
              </View>

              {/* Car Type Distribution Pie Chart */}
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                Car Distribution by Type
              </Text>
              <SimplePieChart data={carTypeData} height={180} />
            </Card.Content>
          </Card>

          {/* Rental Statistics */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Card.Title
              title="Rental Statistics"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <View style={styles.statDetailsContainer}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Total Rentals:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {rentalStats.total || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Avg. Duration:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {rentalStats.averageDuration || 0} days
                  </Text>
                </View>
              </View>

              {/* Rental Status Distribution Pie Chart */}
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                Rental Status Distribution
              </Text>
              <SimplePieChart data={rentalStatusData} height={180} />
            </Card.Content>
          </Card>

          {/* Review Statistics */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Card.Title
              title="Review Statistics"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              <View style={styles.statDetailsContainer}>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Total Reviews:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {reviewStats.total || 0}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.text }]}>
                    Average Rating:
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {reviewStats.averageRating
                      ? reviewStats.averageRating.toFixed(1)
                      : "0"}{" "}
                    / 5
                  </Text>
                </View>
              </View>

              {/* Rating Distribution Bar Chart */}
              <Text style={[styles.chartTitle, { color: colors.text }]}>
                Rating Distribution
              </Text>
              <SimpleBarChart
                data={ratingDistributionData}
                labels={["1★", "2★", "3★", "4★", "5★"]}
                height={220}
                colors={colors}
              />
            </Card.Content>
          </Card>

          {/* Top Rented Cars */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Card.Title
              title="Top Rented Cars"
              titleStyle={{ color: colors.text }}
            />
            <Card.Content>
              {topRentedCars?.length > 0 ? (
                topRentedCars.slice(0, 3).map((car, index) => (
                  <View key={car._id} style={styles.topCarItem}>
                    <View
                      style={[
                        styles.topCarRank,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.topCarDetails}>
                      <Text
                        style={[styles.topCarTitle, { color: colors.text }]}
                      >
                        {car.brand} {car.model} ({car.year})
                      </Text>
                      <Text
                        style={[styles.topCarSubtitle, { color: colors.text }]}
                      >
                        <Icon name="calendar" size={12} color={colors.text} />{" "}
                        Rentals: {car.rentalCount}
                      </Text>
                      <Text
                        style={[styles.topCarSubtitle, { color: colors.text }]}
                      >
                        <Icon name="star" size={12} color={colors.text} />{" "}
                        Rating: {car.averageRating?.toFixed(1) || "N/A"}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.noDataText, { color: colors.text }]}>
                  No rental data available
                </Text>
              )}
            </Card.Content>
          </Card>

          {/* Discount Analytics - add error handling */}
          {discountStats && (
            <DiscountAnalyticsCard
              discountStats={discountStats}
              colors={colors}
            />
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  loader: {
    marginTop: 50,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statIcon: {
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
  },
  sectionCard: {
    marginBottom: 20,
    borderRadius: 10,
    overflow: "hidden",
  },
  statDetailsContainer: {
    marginBottom: 15,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 10,
    textAlign: "center",
  },
  chart: {
    marginVertical: 10,
    borderRadius: 10,
  },
  yearSelector: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  yearText: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 15,
  },
  topCarItem: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "center",
  },
  topCarRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  rankText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  topCarDetails: {
    flex: 1,
  },
  topCarTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  topCarSubtitle: {
    fontSize: 14,
    marginBottom: 3,
  },
  noDataText: {
    textAlign: "center",
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 10,
  },
  // Text chart styles
  textChartContainer: {
    padding: 10,
    marginVertical: 10,
    borderRadius: 8,
  },
  textChartRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  textChartLabel: {
    flex: 1,
    fontSize: 14,
  },
  textChartValue: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 10,
  },
  textChartPercentage: {
    fontSize: 12,
    marginLeft: 5,
    opacity: 0.7,
  },
  textChartSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginVertical: 5,
  },
  barContainer: {
    flex: 1,
    height: 15,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 10,
  },
  noChartData: {
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 15,
    marginBottom: 10,
    opacity: 0.7,
  },
  tableContainer: {
    marginTop: 10,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  tableHeader: {
    fontWeight: "bold",
    fontSize: 14,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  tableCell: {
    fontSize: 14,
  },
});

export default AdminDashboardScreen;
