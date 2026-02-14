
# Deploying SecureSphere to AWS CloudFront

Since SecureSphere is a Next.js application with server-side API routes (for file encryption, secure upload, and notifications), it cannot be hosted as a simple static site on S3 + CloudFront alone. It requires a compute environment to run the API logic.

The recommended and easiest way to deploy this architecture on AWS, which automatically provisions CloudFront for you, is **AWS Amplify**.

## **Option 1: AWS Amplify (Recommended)**

AWS Amplify Hosting is a fully managed service that automatically builds your Next.js app, deploys the static assets to S3/CloudFront, and deploys the API routes to AWS Lambda.

### **Prerequisites**
1.  **GitHub/GitLab/Bitbucket**: Your code needs to be in a Git repository.
2.  **AWS Account**: You need access to the AWS Console.

### **Steps:**

1.  **Push Code to Git**:
    Ensure your latest code (including the recent S3 persistence fixes) is committed and pushed to a repository (e.g., GitHub).

2.  **AWS Console**:
    *   Go to **AWS Amplify** in the AWS Console.
    *   Click **"Create new app"** -> **"Gen 2"** (or Gen 1 "Host web app").
    *   Connect your Git repository (GitHub, etc.).

3.  **Configure Build Settings**:
    Amplify usually auto-detects Next.js. Ensure the build settings look like this:
    ```yaml
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    ```

4.  **Environment Variables**:
    **CRITICAL**: You must add your environment variables in the Amplify Console under "Environment variables":
    *   `AWS_REGION`: `us-east-1` (or your region)
    *   `QUARANTINE_BUCKET_NAME`: `your-s3-bucket-name`
    *   `NEXT_PUBLIC_AWS_USER_POOL_ID`: `your-cognito-pool-id`
    *   `NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID`: `your-cognito-client-id`
    *   **AWS Credentials**: Amplify usually uses an IAM Service Role. Ensure the **Amplify Service Role** created has permissions to access your S3 Buckets (Read/Write) and DynamoDB (if used).
        *   *Note*: If you are using `process.env.AWS_ACCESS_KEY_ID` in your code manually (not recommended for production), you'd need to add those too. Better to attach a Policy to the Amplify Role.

5.  **Deploy**:
    Click **"Save and Deploy"**.

6.  **Access**:
    Amplify will give you a default URL (e.g., `https://main.d1234.amplifyapp.com`). This URL is served via **AWS CloudFront** automatically. You can add your custom domain later.

---

## **Option 2: Docker Container (App Runner)**

If you prefer a containerized approach (e.g., if you have specific system dependencies):

1.  **Dockerize**: Create a `Dockerfile` for the Next.js app.
2.  **Push**: Push the image to Amazon ECR.
3.  **Deploy**: Use **AWS App Runner** to deploy the image. It provides a secure URL.
4.  **CloudFront**: create a CloudFront Distribution and set the App Runner URL as the Origin.

---

## **Important Note on Data Persistence**

We have updated the application to use **S3** for storing:
- User Directory (`data/users.json` -> S3)
- Notifications (`data/notifications.json` -> S3)
- Audit Logs (`data/audit_logs.json` -> S3)

This ensures that your data requires no database server and persists even when the server restarts or redeploys. **Do not revert to `fs` (local file system) storage**, or you will lose registered users on every deployment.
