import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Card } from 'react-native-paper';
import { SimpleBarChart, SimplePieChart } from '../SimpleCharts';
import Icon from 'react-native-vector-icons/FontAwesome';

const DiscountAnalyticsCard = ({ discountStats, colors }) => {
  // Add more robust checking for discountStats
  if (!discountStats || !discountStats.discountUsage || typeof discountStats.discountUsage !== 'object') {
    return (
      <Card style={[styles.container, { backgroundColor: colors.card }]}>
        <Card.Title title="Discount Usage Analytics" titleStyle={{ color: colors.text }} />
        <Card.Content>
          <Text style={{ color: colors.secondary, textAlign: 'center', marginVertical: 20 }}>
            No discount data available
          </Text>
        </Card.Content>
      </Card>
    );
  }

  const { discountUsage, topDiscounts = [], monthlyTrends = [] } = discountStats;

  // Ensure all properties have fallback values
  const safeDiscountUsage = {
    totalDiscountedRentals: discountUsage.totalDiscountedRentals || 0,
    totalSuccessfulRentals: discountUsage.totalSuccessfulRentals || 0,
    percentageWithDiscount: discountUsage.percentageWithDiscount || "0",
    totalDiscountAmount: discountUsage.totalDiscountAmount || 0
  };

  // Prepare data for pie chart showing discounted vs non-discounted rentals
  const discountDistribution = [
    {
      name: "With Discount",
      count: safeDiscountUsage.totalDiscountedRentals,
      color: "#4BC0C0"
    },
    {
      name: "No Discount",
      count: Math.max(0, safeDiscountUsage.totalSuccessfulRentals - safeDiscountUsage.totalDiscountedRentals),
      color: "#E8E8E8"
    }
  ];

  // Prepare data for top discounts bar chart
  const topDiscountsBarData = {
    labels: topDiscounts.slice(0, 5).map(d => d.code),
    datasets: [{
      data: topDiscounts.slice(0, 5).map(d => d.count)
    }]
  };

  // Prepare data for monthly discount trends
  const monthlyTrendsData = {
    labels: monthlyTrends.slice(-6).map(m => {
      const [year, month] = m.month.split('-');
      return `${month}/${year.slice(2)}`;
    }),
    datasets: [{
      data: monthlyTrends.slice(-6).map(m => m.amount)
    }]
  };

  return (
    <Card style={[styles.container, { backgroundColor: colors.card }]}>
      <Card.Title title="Discount Usage Analytics" titleStyle={{ color: colors.text }} />
      <Card.Content>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {safeDiscountUsage.percentageWithDiscount}%
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>
              Rentals with Discount
            </Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              ₱{safeDiscountUsage.totalDiscountAmount.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: colors.secondary }]}>
              Total Savings
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Discount Usage Distribution
        </Text>
        <SimplePieChart 
          data={discountDistribution} 
          height={180}
        />

        {topDiscounts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Top Discount Codes
            </Text>
            <SimpleBarChart
              data={topDiscountsBarData.datasets[0].data}
              labels={topDiscountsBarData.labels}
              height={200}
              colors={colors}
            />
            
            <View style={styles.topDiscountsList}>
              {topDiscounts.slice(0, 5).map((discount, index) => (
                <View key={index} style={[styles.topDiscountItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.discountCodeContainer}>
                    <View style={[styles.rankBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View>
                      <Text style={[styles.discountCode, { color: colors.text }]}>
                        {discount.code}
                      </Text>
                      <Text style={[styles.discountPercentage, { color: colors.secondary }]}>
                        {discount.percentage}% off
                      </Text>
                    </View>
                  </View>
                  <View>
                    <Text style={[styles.discountUsageCount, { color: colors.text }]}>
                      {discount.count} uses
                    </Text>
                    <Text style={[styles.discountAmount, { color: colors.success }]}>
                      ₱{discount.totalAmount.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {monthlyTrends.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Monthly Discount Savings
            </Text>
            <SimpleBarChart
              data={monthlyTrendsData.datasets[0].data}
              labels={monthlyTrendsData.labels}
              height={200}
              colors={{...colors, primary: "#4BC0C0"}}
            />
          </>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statBox: {
    alignItems: 'center',
    padding: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  topDiscountsList: {
    marginTop: 12,
  },
  topDiscountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  discountCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  discountCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  discountPercentage: {
    fontSize: 14,
  },
  discountUsageCount: {
    fontSize: 14,
    textAlign: 'right',
  },
  discountAmount: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'right',
  },
});

export default DiscountAnalyticsCard;
