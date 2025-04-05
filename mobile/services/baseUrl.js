const environments = {
  development: {
    deviceLocal: "http://192.168.1.17:4000/api/v1",
  },
  production: "https://bmw-project-514926560822.us-central1.run.app/api/v1",
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
