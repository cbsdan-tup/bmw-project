// Configuration for Google Authentication

// Project specific client IDs from the BMW project google-services.json
export const WEB_CLIENT_ID = "14654770851-58gpdt67ckrtl2s3feuj7u9phjh2btua.apps.googleusercontent.com";
export const ANDROID_CLIENT_ID = "14654770851-58gpdt67ckrtl2s3feuj7u9phjh2btua.apps.googleusercontent.com"; 
export const IOS_CLIENT_ID = "14654770851-9b4ar5o5gcnjvghjhk723elft75lrfie.apps.googleusercontent.com";

// Configuration for expo-auth-session
export const GOOGLE_AUTH_CONFIG = {
  iosClientId: IOS_CLIENT_ID,
  androidClientId: ANDROID_CLIENT_ID,
  webClientId: WEB_CLIENT_ID,
  expoClientId: WEB_CLIENT_ID,
  // Using the standard Expo redirect URI format
  redirectUri: "https://auth.expo.io/@cbsdan028/com.bmw",
  responseType: "id_token",  // Request an ID token
  scopes: ["profile", "email"]
};
