import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'bmw_recent_searches';
const MAX_RECENT_SEARCHES = 5;

export const saveSearch = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim() === '') return;
    
    const existingSearchesString = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    let searches = existingSearchesString ? JSON.parse(existingSearchesString) : [];
    
    searches = searches.filter(item => item.toLowerCase() !== searchTerm.toLowerCase());
    
    searches.unshift(searchTerm);
    
    if (searches.length > MAX_RECENT_SEARCHES) {
      searches = searches.slice(0, MAX_RECENT_SEARCHES);
    }
    
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
    
    return searches;
  } catch (error) {
    console.error('Error saving recent search:', error);
    return null;
  }
};

export const getRecentSearches = async () => {
  try {
    const searchesString = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    if (!searchesString) return [];
    return JSON.parse(searchesString);
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    return [];
  }
};

export const clearRecentSearches = async () => {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing recent searches:', error);
    return false;
  }
};
