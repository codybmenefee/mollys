# 🆕 Setting Up New MongoDB Atlas Cluster

## Step 1: Create New Cluster
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Sign in with your MongoDB account
3. Click **"Create a New Cluster"**
4. Choose **"M0 Sandbox"** (Free Forever)
5. Select a **Cloud Provider & Region** (choose one close to you)
6. **Cluster Name**: `pasturepilot-cluster`
7. Click **"Create Cluster"** (takes 2-3 minutes)

## Step 2: Create Database User
1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `mollysapp`
5. **Password**: `mollys!$` (or create a new secure password)
6. **Database User Privileges**: "Read and write to any database"
7. Click **"Add User"**

## Step 3: Configure Network Access
1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Choose **"Add Current IP Address"** (for your location)
4. Or use **"0.0.0.0/0"** for all IPs (less secure, but good for development)
5. Click **"Confirm"**

## Step 4: Get Connection String
1. Go back to **"Database"** (left sidebar)
2. Find your cluster and click **"Connect"**
3. Choose **"Connect your application"**
4. **Driver**: Node.js
5. **Version**: 4.1 or later
6. **Copy the connection string** - it will look like:
   ```
   mongodb+srv://mollysapp:<password>@pasturepilot-cluster.XXXXX.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
7. **Replace `<password>`** with your actual password: `mollys!$`

## Step 5: Update Your Environment
1. Copy the **complete connection string**
2. Update your `.env.local` file
3. Add the database name `/pasturepilot` before the `?`

**Final connection string should look like:**
```
MONGODB_URI=mongodb+srv://mollysapp:mollys!$@pasturepilot-cluster.XXXXX.mongodb.net/pasturepilot?retryWrites=true&w=majority&appName=Cluster0
```

## Step 6: Test Connection
Run: `node test-mongodb-connection.js`

You should see: ✅ All MongoDB tests passed! 