import carReducer, { 
  setFilterParams, 
  resetFilters,
  toggleFavorite,
  clearError
} from '../redux/slices/carSlice';

describe('Car Slice reducer', () => {
  const initialState = {
    featuredCars: [],
    filteredCars: [],
    currentCar: null,
    favorites: [],
    loading: false,
    error: null,
    filterParams: {
      transmission: "",
      pickUpLocation: "",
      brand: "",
      pricePerDay: "",
      year: "",
      rating: ""
    }
  };

  test('should return the initial state', () => {
    expect(carReducer(undefined, { type: undefined })).toEqual(initialState);
  });

  test('should handle setFilterParams', () => {
    const newParams = {
      brand: 'BMW',
      year: '2022'
    };
    
    const newState = carReducer(initialState, setFilterParams(newParams));
    
    expect(newState.filterParams).toEqual({
      ...initialState.filterParams,
      ...newParams
    });
  });

  test('should handle resetFilters', () => {
    const modifiedState = {
      ...initialState,
      filterParams: {
        transmission: "Automatic",
        pickUpLocation: "Manila",
        brand: "BMW",
        pricePerDay: "5000",
        year: "2023",
        rating: "4"
      }
    };
    
    const newState = carReducer(modifiedState, resetFilters());
    
    expect(newState.filterParams).toEqual(initialState.filterParams);
  });

  test('should handle toggleFavorite for adding new favorite', () => {
    const carId = '12345';
    const newState = carReducer(initialState, toggleFavorite(carId));
    
    expect(newState.favorites).toContain(carId);
    expect(newState.favorites).toHaveLength(1);
  });

  test('should handle toggleFavorite for removing existing favorite', () => {
    const carId = '12345';
    const stateWithFavorite = {
      ...initialState,
      favorites: [carId]
    };
    
    const newState = carReducer(stateWithFavorite, toggleFavorite(carId));
    
    expect(newState.favorites).not.toContain(carId);
    expect(newState.favorites).toHaveLength(0);
  });

  test('should handle clearError', () => {
    const stateWithError = {
      ...initialState,
      error: 'Network error'
    };
    
    const newState = carReducer(stateWithError, clearError());
    
    expect(newState.error).toBeNull();
  });
});
