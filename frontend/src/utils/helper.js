import {toast} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const authenticate = (data, next) => {
    if (window !== 'undefined') {
        sessionStorage.setItem('token', JSON.stringify(data.token))
        sessionStorage.setItem('user', JSON.stringify(data.user))
        console.log(data.user)
    }
    next();
}

export const isAuthenticated = () => {
    if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('token');
        const user = sessionStorage.getItem('user');
        if (token && user) {
            return true;
        }
    }
    return false;
};

export const getToken = () => {
    if (window !== 'undefined') {
        if (sessionStorage.getItem('token')) {
            return JSON.parse(sessionStorage.getItem('token'));
        } else {
            return false;
        }
    }
}

export const getUser = () => {
    if (window !== 'undefined') {
        if (sessionStorage.getItem('user')) {
            return JSON.parse(sessionStorage.getItem('user'));
        } else {
            return false;
        }
    }
}

export const isAdmin = () => {
    if (typeof window !== 'undefined') {
        const user = sessionStorage.getItem('user');
        if (user) {
            const userObj = JSON.parse(user);
            return userObj.role === 'admin';
        }
    }
    return false;
};

export const logout = next => {
    if (window !== 'undefined') {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
    }
    next()
}

export const errMsg = (message = '') => toast.error(message, {
    position: 'bottom-right'
});

export const succesMsg = (message = '') => toast.success(message, {
    position: 'bottom-right'
})

export const formatDate = (dateStr) => {
    const dateObj = new Date(dateStr);

    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    };
  
    const formattedDate = dateObj.toLocaleString('en-US', options);
    const [datePart, timePart] = formattedDate.split(', ');
    return `${datePart.replace(/\//g, '-')} ${timePart}`;
  };

  export const calculateRentalDays = (pickUpDate, returnDate) => {
    if (!pickUpDate || !returnDate) {
      return 0;
    }
    const pickUp = new Date(pickUpDate);
    const returnD = new Date(returnDate);
    const timeDiff = Math.abs(returnD - pickUp);
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays;
  };