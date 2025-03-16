export const calculateRentalDays = (pickup, returnDate) => {
    if (pickup && returnDate) {
      const pickupTime = new Date(pickup).getTime();
      const returnTime = new Date(returnDate).getTime();
      const diffTime = returnTime - pickupTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    }
    return 0;
  };