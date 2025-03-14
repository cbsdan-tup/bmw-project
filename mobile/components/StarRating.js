import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTheme } from '../context/ThemeContext';
import { COMMON_COLORS } from '../styles/theme';

const StarRating = ({ rating, size = 16, style, color }) => {
  const { colors } = useTheme();
  const starColor = color || COMMON_COLORS.starColor;
  
  // Convert rating to array of stars (full, half, or empty)
  const stars = [];
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  
  // Add full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(<Icon key={`full-${i}`} name="star" size={size} color={starColor} />);
  }
  
  // Add half star if needed
  if (halfStar) {
    stars.push(<Icon key="half" name="star-half-o" size={size} color={starColor} />);
  }
  
  // Add empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars.push(<Icon key={`empty-${i}`} name="star-o" size={size} color={starColor} />);
  }
  
  return (
    <View style={[styles.container, style]}>
      {stars}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});

export default StarRating;
