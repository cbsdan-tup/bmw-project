import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken } from "firebase/messaging";
import { getToken as getHelperToken } from "../utils/helper";
import { errMsg, getUser } from "../utils/helper";
import axios from "axios";

const firebaseConfig = {
  apiKey: "AIzaSyBkLhKshuOjD7IQpUl3wV1g3uT_xlPgzGk",
  authDomain: "bmw-project-5ab42.firebaseapp.com",
  projectId: "bmw-project-5ab42",
  storageBucket: "bmw-project-5ab42.firebasestorage.app",
  messagingSenderId: "14654770851",
  appId: "1:14654770851:web:5a983e25953711a30f3916",
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
export const auth = getAuth();
export const generateToken = async () => {
  const permission = await Notification.requestPermission();
  console.log(permission);

  const user = getUser();

  if (permission === "granted") {
    const token = await getToken(messaging, {
      vapidKey:
        "BHD1AnIqN9gS9-eRLcjuMMOc0tRdzLmT-SU0_FUlTTSp6rvrh_SY10JH8PrnDXSS4iJuIyUL6njD8zjGUxMYgWg",
    });

    if (user) {
      console.log(token);
      try {
        const config = {
            headers: {
                'Authorization': `Bearer ${getHelperToken()}`,
                "Content-Type": "application/json",
            }
        }

        const data = await axios.put(
          `${import.meta.env.VITE_API}/update-user/${user._id}`,
          {
            permissionToken: token,
          },
          config
        );
        console.log(data);
        console.log("Successfully stored the permission token!");
      } catch (error) {
        errMsg("Error inserting the permission token!");
        console.log(error);
      }
    }
  } else {
    if (user) {
      try {
        const data = await axios.put(
          `${import.meta.env.VITE_API}/remove-permission-token/${user._id}`, {
            "Authorization": `Bearer ${getHelperToken()}`
          }
        );
        console.log(data);
        console.log("Successfully removed the permission token!");
      } catch (error) {
        errMsg("Error removing the permission token!");
        console.log(error);
      }
    }
  }
};
export default app;
