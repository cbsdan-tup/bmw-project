import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

/**
 * Simple Bar Chart using native Views
 */
export const SimpleBarChart = ({ data, labels, height = 200, colors = {} }) => {
  try {
    // Ensure data is properly defined
    const safeData = Array.isArray(data) ? data : [];
    const safeLabels = Array.isArray(labels) ? labels : [];
    
    // Find the maximum value for scaling (with safety check)
    const maxValue = safeData.length > 0 ? Math.max(...safeData.filter(val => !isNaN(val))) : 0;
    
    return (
      <View style={[styles.chartContainer, { height }]}>
        {safeData.map((value, index) => {
          // Calculate percentage height based on the max value
          const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
          
          return (
            <View key={index} style={styles.barWrapper}>
              <Text style={[styles.barValue, { color: colors.text || '#000' }]}>
                {value}
              </Text>
              <View style={styles.barContainer}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: `${percentage}%`,
                      backgroundColor: colors.primary || '#36a2eb' 
                    }
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: colors.text || '#000' }]}>
                {safeLabels[index] || ''}
              </Text>
            </View>
          );
        })}
      </View>
    );
  } catch (error) {
    console.error('Bar chart error:', error);
    // Return a safe fallback
    return (
      <View style={[styles.chartContainer, { height }]}>
        <Text style={{ color: colors?.text || '#000' }}>Chart could not be displayed</Text>
      </View>
    );
  }
};

/**
 * Simple Pie Chart using native Views
 */
export const SimplePieChart = ({ data, height = 200 }) => {
  try {
    // Ensure data is properly defined
    const safeData = Array.isArray(data) ? data : [];
    
    // Calculate total
    const total = safeData.reduce((sum, item) => sum + (item?.count || 0), 0);
    
    // If no data or total is 0, show empty chart
    if (safeData.length === 0 || total === 0) {
      return (
        <View style={[styles.pieContainer, { height }]}>
          <View style={styles.emptyPie}>
            <Text style={styles.emptyPieText}>No data</Text>
          </View>
        </View>
      );
    }
    
    // Process data for pie rendering
    let cumulativeAngle = 0;
    const pieData = safeData.map((item, index) => {
      const count = item?.count || 0;
      const percentage = (count / total) * 100;
      const angle = (count / total) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;
      
      return {
        ...item,
        percentage,
        angle,
        startAngle,
        endAngle: startAngle + angle,
        color: item?.color || '#cccccc',
      };
    });

    // Calculate chart dimensions
    const size = 120;
    const radius = size / 2;
    const center = { x: radius, y: radius };

    return (
      <View style={[styles.pieContainer, { height }]}>
        <View style={styles.pieChartWrapper}>
          <View style={styles.pieOuter}>
            {/* The real improvement is here - proper mathematical construction of segments */}
            {pieData.map((item, index) => {
              // Skip tiny slices in visualization (but keep them in the legend)
              if (item.angle < 1) return null;
              
              // Breaking down slices for more accurate rendering
              const segmentCount = Math.ceil(item.angle / 30); // Split into 30° segments for smoothness
              const segments = [];
              
              for (let i = 0; i < segmentCount; i++) {
                const segStart = item.startAngle + (i * (item.angle / segmentCount));
                const segEnd = segStart + (item.angle / segmentCount);
                const segAngle = segEnd - segStart;
                
                segments.push(
                  <View 
                    key={`${index}-${i}`}
                    style={[
                      styles.pieSegment,
                      {
                        backgroundColor: item.color,
                        transform: [
                          { rotate: `${segStart}deg` }
                        ]
                      }
                    ]}
                  >
                    <View 
                      style={[
                        styles.segmentInner,
                        {
                          backgroundColor: item.color,
                          transform: [
                            { rotate: `${segAngle}deg` }
                          ]
                        }
                      ]}
                    />
                  </View>
                );
              }
              
              return segments;
            })}
            
            {/* Add percentage labels at proper positions */}
            {pieData.map((item, index) => {
              if (item.percentage < 5) return null; // Skip labels for small slices
              
              // Calculate label position using proper trigonometry
              const midAngle = item.startAngle + (item.angle / 2);
              const midAngleRad = (midAngle - 90) * (Math.PI / 180); // Convert to radians, adjust for 0° at top
              const labelDistance = radius * 0.7; // Position labels at 70% of the radius
              
              const x = center.x + labelDistance * Math.cos(midAngleRad);
              const y = center.y + labelDistance * Math.sin(midAngleRad);
              
              return (
                <Text
                  key={`label-${index}`}
                  style={[
                    styles.sliceText,
                    {
                      position: 'absolute',
                      left: x - 12, // Adjust for text width
                      top: y - 8,   // Adjust for text height
                    }
                  ]}
                >
                  {Math.round(item.percentage)}%
                </Text>
              );
            })}
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
                <Text style={styles.legendValue}>{item.count || 0}</Text>
                <Text style={styles.legendPercentage}>
                  {item.percentage.toFixed(1)}%
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  } catch (error) {
    console.error('Pie chart error:', error);
    // Return a safe fallback
    return (
      <View style={[styles.pieContainer, { height }]}>
        <View style={styles.emptyPie}>
          <Text style={styles.emptyPieText}>Chart could not be displayed</Text>
        </View>
      </View>
    );
  }
};

/**
 * Simple Line Chart using native Views
 */
export const SimpleLineChart = ({ data, labels, height = 200, colors = {} }) => {
  try {
    // Ensure data is properly defined
    const safeData = Array.isArray(data) ? data : [];
    const safeLabels = Array.isArray(labels) ? labels : [];
    
    // Ensure data exists and has content
    if (safeData.length === 0) {
      return (
        <View style={[styles.lineChartContainer, { height }]}>
          <Text style={{ color: colors.text || '#000' }}>No data available</Text>
        </View>
      );
    }

    // Find min and max values (with safety checks)
    const filteredData = safeData.filter(val => !isNaN(val));
    const maxValue = filteredData.length > 0 ? Math.max(...filteredData) : 0;
    const minValue = filteredData.length > 0 ? Math.min(...filteredData) : 0;
    const range = maxValue - minValue || 1; // Prevent division by zero
    
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
                  borderColor: colors.border || '#ccc'
                }
              ]}
            >
              <Text style={[styles.guideLineText, { color: colors.text || '#000' }]}>
              ₱{line.value}
              </Text>
            </View>
          ))}
          
          {/* Data bars - simplified representation of a line chart */}
          <View style={styles.dataContainer}>
            {safeData.map((value, index) => {
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
                        backgroundColor: colors.primary || '#36a2eb' 
                      }
                    ]}
                  />
                  <Text 
                    style={[styles.dataLabel, { color: colors.text || '#000' }]} 
                    numberOfLines={1}
                  >
                    {safeLabels[index] || ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  } catch (error) {
    console.error('Line chart error:', error);
    // Return a safe fallback
    return (
      <View style={[styles.lineChartContainer, { height }]}>
        <Text style={{ color: colors?.text || '#000' }}>Chart could not be displayed</Text>
      </View>
    );
  }
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
  
  // New improved pie segment styles
  pieSegment: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0,
  },
  segmentInner: {
    position: 'absolute',
    width: '50%',  // One half of the circle
    height: '100%',
    left: '50%',   // Start from center
    top: 0,
    transformOrigin: 'left center',
  },
  sliceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Keep existing pie chart styles that are still needed
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
