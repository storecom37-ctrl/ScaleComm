# Environment Setup Guide

This guide will help you set up the required environment variables for the StoreCom Dashboard.

## Required Environment Variables

### 1. Create .env.local file

Create a `.env.local` file in the root directory with the following variables:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/gmb/callback

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/storecom-dashboard
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/storecom-dashboard?retryWrites=true&w=majority

# AWS S3 Configuration (for image uploads)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_s3_bucket_name

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret_here_32_chars_minimum

# Optional: For production
# NODE_ENV=production
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google My Business API
4. Create OAuth 2.0 credentials
5. Add `http://localhost:3000/api/auth/gmb/callback` to authorized redirect URIs
6. Copy the Client ID and Client Secret to your `.env.local` file

### 3. MongoDB Setup

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use `mongodb://localhost:27017/storecom-dashboard` as MONGODB_URI

#### Option B: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string
4. Replace `<username>`, `<password>`, and `<cluster>` with your actual values

### 4. AWS S3 Setup (Optional)

If you want to enable image uploads:

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Create an S3 bucket
3. Create IAM user with S3 permissions
4. Get Access Key ID and Secret Access Key
5. Add them to your `.env.local` file

**Note**: If AWS credentials are not configured, file uploads will be disabled but the app will still work.

### 5. NextAuth Secret

Generate a random secret for NextAuth:

```bash
# Using OpenSSL
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Quick Start

1. Copy the environment variables above to `.env.local`
2. Replace placeholder values with your actual credentials
3. Run `npm run dev`
4. Open `http://localhost:3000`

## Troubleshooting

### Common Issues

1. **AWS S3 Errors**: If you see "InvalidAccessKeyId" errors, make sure your AWS credentials are properly set in `.env.local`

2. **MongoDB Connection**: Ensure MongoDB is running and the connection string is correct

3. **Google OAuth**: Make sure the redirect URI matches exactly what you set in Google Cloud Console

4. **Memory Issues**: The app is configured to use 2GB of memory in development. If you encounter memory issues, you can increase it by modifying the `NODE_OPTIONS` in `package.json`

### Environment File Priority

Next.js loads environment variables in this order:
1. `.env.local` (highest priority)
2. `.env.development` (for development)
3. `.env` (lowest priority)

Make sure to use `.env.local` for your local development environment.
