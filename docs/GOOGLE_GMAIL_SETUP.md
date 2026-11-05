# Google Cloud Console Setup Guide for Gmail Integration

This guide walks you through setting up Google Cloud Console credentials to enable real Gmail OAuth 2.0 authentication and Gmail API integration in MailGuard AI.

---

## 1. Open Google Cloud Console
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your Google account.

---

## 2. Create or Select a Google Cloud Project
1. In the top navigation bar, click the project dropdown.
2. Click **New Project**.
3. Name your project (e.g., `MailGuard-AI-Security`) and click **Create**.
4. Ensure your new project is selected in the top bar.

---

## 3. Enable the Gmail API
1. Open the left sidebar and navigate to **APIs & Services > Library**.
2. Search for `Gmail API`.
3. Click on **Gmail API** from the search results.
4. Click the **Enable** button.

---

## 4. Configure OAuth Consent Screen
1. Go to **APIs & Services > OAuth consent screen**.
2. Select **External** (or **Internal** if using a Google Workspace organization) and click **Create**.
3. Fill in the required fields:
   - **App name**: `MailGuard AI`
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
4. Click **Save and Continue**.
5. On the **Scopes** page, click **Add or Remove Scopes** and select:
   - `https://www.googleapis.com/auth/gmail.readonly` (Read incoming emails)
   - `https://www.googleapis.com/auth/gmail.modify` (Modify email labels/spam status on user approval)
6. Click **Save and Continue**.
7. Under **Test Users**, click **Add Users** and add your Gmail address (e.g. `your-email@gmail.com`).
8. Click **Save and Continue**.

---

## 5. Create OAuth 2.0 Client ID Credentials
1. Go to **APIs & Services > Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. Select **Web application** as the Application type.
4. Name: `MailGuard AI Web Client`.
5. Under **Authorized JavaScript origins**, add:
   - `http://localhost:3000`
   - Your hosted environment URL (if deployed)
6. Under **Authorized redirect URIs**, add:
   - `http://localhost:3000/api/gmail/oauth/callback`
   - `<Your App Base URL>/api/gmail/oauth/callback`
7. Click **Create**.
8. A modal will appear showing your **Client ID** and **Client Secret**. Copy these values.

---

## 6. Configure Environment Variables
Copy `.env.example` to `.env` or set environment variables in your server hosting platform:

```env
GOOGLE_CLIENT_ID=123456789000-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YourActualClientSecretHere
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/oauth/callback
GEMINI_API_KEY=AIzaSyYourActualGeminiApiKey
```

---

## 7. Run and Verify Connection
1. Start the MailGuard AI application:
   ```bash
   npm run dev
   ```
2. Navigate to the **Connected Gmail** page in MailGuard AI.
3. Click **Authorize & Connect Gmail**.
4. Complete the Google OAuth consent popup/window.
5. Once returned to MailGuard AI, verify that your actual Gmail address is displayed with **CONNECTED** status.
6. Click **Analyze Recent Emails** to fetch and analyze your recent messages through the 5-Agent Security Orchestrator and Risk Engine.
