const serviceAccount = require("./greensense-e15a0-firebase-adminsdk-fbsvc-eb61eb3831.json");

const { GoogleAuth } = require("google-auth-library");

async function getToken() {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ["https://www.googleapis.com/auth/datastore"],
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  console.log("Token:", token.token);
}

getToken();