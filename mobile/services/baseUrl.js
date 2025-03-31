const environments = {
  development: {
    androidEmulator: "http://192.168.1.13:4000/api/v1",
    iOSSimulator: "http://localhost:4000/api/v1",
    deviceLocal: "http://192.168.196.8:4000/api/v1",
    staging: "https://staging-api.bmw-rentals.com/api/v1",
  },
  production: "https://api.bmw-rentals.com/api/v1",
};

const getBaseUrl = () => {
  const isDev = __DEV__;

  if (isDev) {
    return environments.development.deviceLocal;
  } else {
    return environments.production;
  }
};

const baseURL = getBaseUrl();

export default baseURL;
