import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

/**
 * Simple Bar Chart using native Views
 */
export const SimpleBarChart = ({ data, labels, height = 200, colors }) => {
  // Find the maximum value for scaling
  const maxValue = Math.max(...data);
  
  return (
    <View style={[styles.chartContainer, { height }]}>
      {data.map((value, index) => {
        // Calculate percentage height based on the max value
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        
        return (
          <View key={index} style={styles.barWrapper}>
            <Text style={[styles.barValue, { color: colors.text }]}>
              {value}
            </Text>
            <View style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: `${percentage}%`,
                    backgroundColor: colors.primary 
                  }
                ]}
              />
            </View>
            <Text style={[styles.barLabel, { color: colors.text }]}>
              {labels[index] || ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

/**
 * Simple Pie Chart using native Views
 */
export const SimplePieChart = ({ data, height = 200 }) => {
  // Calculate total
  const total = data.reduce((sum, item) => sum + item.count, 0);
  
  // If no data or total is 0, show empty chart
  if (!data || data.length === 0 || total === 0) {
    return (
      <View style={[styles.pieContainer, { height }]}>
        <View style={styles.emptyPie}>
          <Text style={styles.emptyPieText}>No data</Text>
        </View>
      </View>
    );
  }
  
  // Calculate percentages and angles for each segment
  const pieData = data.map((item, index) => {
    const percentage = (item.count / total) * 100;
    return {
      ...item,
      percentage,
    };
  });

  return (
    <View style={[styles.pieContainer, { height }]}>
      <View style={styles.pieChartWrapper}>
        <View style={styles.pieOuter}>
          {/* Generate slices with varying widths based on percentage */}
          {pieData.map((item, index) => {
            // Calculate slice width - each slice is a fraction of the full width
            const sliceWidth = (item.percentage / 100) * 360;
            
            // Calculate start position for this slice (sum of all previous slices)
            const startAngle = pieData
              .slice(0, index)
              .reduce((sum, prev) => sum + (prev.percentage / 100) * 360, 0);
            
            return (
              <View 
                key={index} 
                style={[
                  styles.pieSlice,
                  {
                    backgroundColor: item.color,
                    width: '50%',
                    height: '100%',
                    transform: [
                      { rotate: `${startAngle}deg` }
                    ]
                  }
                ]}
              >
                <View
                  style={[
                    styles.sliceContent,
                    { 
                      backgroundColor: item.color,
                      transform: [
                        { rotate: `${sliceWidth/2}deg` }
                      ]
                    }
                  ]}
                >
                  {item.percentage > 20 && (
                    <Text style={styles.sliceText}>
                      {Math.round(item.percentage)}%
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
          
          {/* Inner circle removed */}
        </View>
      </View>
      
      {/* Legend with total count */}
      <View style={styles.pieLegend}>
        <View style={styles.totalCountContainer}>
          <Text style={styles.totalCountLabel}>Total:</Text>
          <Text style={styles.totalCountValue}>{total}</Text>
        </View>
        <ScrollView>
          {pieData.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={styles.legendText}>{item.name || 'Unknown'}</Text>
              <Text style={styles.legendValue}>{item.count}</Text>
              <Text style={styles.legendPercentage}>
                {item.percentage.toFixed(1)}%
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

/**
 * Simple Line Chart using native Views
 */
export const SimpleLineChart = ({ data, labels, height = 200, colors }) => {
  // Ensure data exists and has content
  if (!data || !data.length) {
    return (
      <View style={[styles.lineChartContainer, { height }]}>
        <Text style={{ color: colors.text }}>No data available</Text>
      </View>
    );
  }

  // Find min and max values
  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue;
  
  // Create horizontal guide lines
  const guideLinesCount = 5;
  const guideLines = Array(guideLinesCount).fill(0).map((_, i) => {
    const value = minValue + (range * (i / (guideLinesCount - 1)));
    return { value: Math.round(value * 100) / 100 };
  });

  return (
    <View style={[styles.lineChartContainer, { height }]}>
      <View style={styles.lineChartBody}>
        {/* Guide lines */}
        {guideLines.map((line, i) => (
          <View 
            key={i} 
            style={[
              styles.guideLine, 
              { 
                bottom: `${i * (100 / (guideLinesCount - 1))}%`,
                borderColor: colors.border
              }
            ]}
          >
            <Text style={[styles.guideLineText, { color: colors.text }]}>
            ₱{line.value}
            </Text>
          </View>
        ))}
        
        {/* Data bars - simplified representation of a line chart */}
        <View style={styles.dataContainer}>
          {data.map((value, index) => {
            const percentage = range > 0 
              ? ((value - minValue) / range) * 100 
              : 0;
            
            return (
              <View key={index} style={styles.dataPointContainer}>
                <View 
                  style={[
                    styles.dataBar, 
                    { 
                      height: `${percentage}%`,
                      backgroundColor: colors.primary 
                    }
                  ]}
                />
                <Text 
                  style={[styles.dataLabel, { color: colors.text }]} 
                  numberOfLines={1}
                >
                  {labels[index] || ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Bar Chart Styles
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: 20,
    paddingHorizontal: 5,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barContainer: {
    width: 20,
    height: '70%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barLabel: {
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 10,
    marginBottom: 5,
  },
  
  // Pie Chart Styles
  pieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 10,
  },
  pieChartWrapper: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pieOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieSlice: {
    position: 'absolute',
    left: '50%',
    top: 0,
    height: '100%',
    transformOrigin: 'left center',
  },
  sliceContent: {
    width: '200%',
    height: '100%',
    left: 0,
    position: 'absolute',
    transformOrigin: 'left center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
    position: 'absolute',
    right: '25%',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  // pieInner styles removed
  pieLegend: {
    flex: 1,
    marginLeft: 5,
    maxHeight: 140,
  },
  totalCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 5,
    marginBottom: 8,
  },
  totalCountLabel: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  totalCountValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyPie: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPieText: {
    color: '#888',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 5,
  },
  legendPercentage: {
    fontSize: 12,
    opacity: 0.6,
    width: 45,
  },
  
  // Line Chart Styles
  lineChartContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  lineChartBody: {
    flex: 1,
    position: 'relative',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  guideLineText: {
    position: 'absolute',
    left: 0,
    top: -10,
    fontSize: 8,
  },
  dataContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    position: 'absolute',
    left: 40,
    right: 10,
    bottom: 20,
    top: 10,
  },
  dataPointContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  dataBar: {
    width: 10,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  dataLabel: {
    fontSize: 8,
    marginTop: 3,
    transform: [{ rotate: '-45deg' }],
    width: 20,
  },
});
