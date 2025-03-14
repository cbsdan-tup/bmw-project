// Define theme palettes
export const lightTheme = {
  background: '#ffffff',
  text: '#000000',
  primary: '#0066cc',
  secondary: '#999999',
  accent: '#ff6600',
  surface: '#f5f5f5',
  card: '#ffffff',
  border: '#dddddd',
  buttonBackground: '#ddd',
  buttonText: '#000000',
  statusBar: 'dark',
  // Navigation specific
  tabBarBackground: '#ffffff',
  tabBarActive: '#0066cc',
  tabBarInactive: '#757575',
  tabBarBorder: '#e0e0e0',
  headerBackground: '#ffffff',
  headerText: '#000000',
};

export const darkTheme = {
  background: '#121212',
  text: '#ffffff',
  primary: '#3399ff',
  secondary: '#666666',
  accent: '#ff9900',
  surface: '#1e1e1e',
  card: '#2c2c2c',
  border: '#444444',
  buttonBackground: '#444',
  buttonText: '#ffffff',
  statusBar: 'light',
  // Navigation specific
  tabBarBackground: '#1e1e1e',
  tabBarActive: '#3399ff',
  tabBarInactive: '#9e9e9e',
  tabBarBorder: '#333333',
  headerBackground: '#1e1e1e',
  headerText: '#ffffff',
};

// Helper function to get theme based on mode
export const getThemeColors = (isDarkMode) => {
  return isDarkMode ? darkTheme : lightTheme;
};
