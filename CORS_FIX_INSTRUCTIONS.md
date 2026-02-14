# How to Fix CORS Error on AWS API Gateway

The error `Access to fetch at '...' from origin 'http://localhost:3000' has been blocked by CORS policy` means your AWS API Gateway is blocking requests from your local browser.

## Option 1: The "One-Click" Fix (AWS Console)
This is the easiest way to fix the issue on an existing API.

1.  Log in to the **AWS Console**.
2.  Go to **API Gateway**.
3.  Select your API (ID: `72jrlelo50`).
4.  In the "Resources" panel on the left:
    *   Select the `/generate-upload-url` resource.
5.  Click the **"Enable CORS"** button (or **Actions** -> **Enable CORS**).
6.  **Settings**:
    *   **Access-Control-Allow-Origin**: Enter `*` (or `http://localhost:3000`).
    *   **Access-Control-Allow-Methods**: Select `POST`, `OPTIONS`.
    *   Click **Enable CORS and replace existing CORS headers**.
7.  **IMPORTANT: DEPLOY THE API**
    *   Click **Actions** -> **Deploy API**.
    *   Select the **Stage** (e.g., `prod`).
    *   Click **Deploy**.

**Wait 30-60 seconds**, then try the upload again.

---

## Option 2: Fix via Code (If redeploying)

I have updated `backend_lambdas/api/upload-url/route.ts` to include the necessary CORS headers in the response. If you redeploy your backend code, ensure your Lambda/Handler returns these headers:

```json
{
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
    "Access-Control-Allow-Headers": "Content-Type"
  }
}
```
