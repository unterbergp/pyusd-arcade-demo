# pyusd-arcade-demo

A simple demo of using PYUSD over Solana for an arcade concept. This runs over devnet and requires Phantom. Do not run this code for any production uses - its only meant to be a concept.




# PYUSD Arcade Web Application Setup
Here are the instructions to install the PYUSD Arcade web application on a new Node.js server with Node.js 18:

## Prerequisites

1. **A new server (Ubuntu 20.04 or later recommended)**
2. **SSH access to the server**
3. **A GitHub repository for your project**

## Steps

### 1. Update and Upgrade the System

```bash
sudo apt update
sudo apt upgrade -y
```

### 2. Install Node.js 18

```bash
# Install NodeSource PPA
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs

# Verify the installation
node -v
npm -v
```

### 3. Install Git

```bash
sudo apt install git -y
```

### 4. Clone Your GitHub Repository

```bash
# Navigate to the desired directory
cd /path/to/your/directory

# Clone your repository (replace `your-repo-url` with the actual repository URL)
git clone git@github.com:your-username/your-repo.git

# Navigate into the project directory
cd your-repo
```

### 5. Install Project Dependencies

```bash
npm install
```

### 6. Set Up Environment Variables

Create a `.env` file in the root of your project and add your environment variables. For example:

```env
PORT=3000
SOLANA_CLUSTER_URL=https://api.devnet.solana.com
PYUSD_TOKEN_MINT=CXk2AMBfi3TwaEL2468s6zP8xq9NxTXjp9gjMgzeUynM
RECIPIENT_ADDRESS=ARFwpM41PsUudu1HQE7i1HbbP6nkDAnKYRc77KQMS18e
```

### 7. Create the Images Directory

```bash
# Navigate to the public directory
cd public

# Create the img directory
mkdir img

# Upload your images to the img directory
# Example: scp image1.jpg username@your-server:/path/to/your-repo/public/img/
```

### 8. Run the Application

```bash
# Navigate to the project directory if not already there
cd /path/to/your/repo

# Start the application
npm start
```

### 9. Setting Up Reverse Proxy (Optional)

If you are using a reverse proxy (e.g., Nginx), ensure it is configured to forward requests to your Node.js application. Here is an example Nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

After updating the Nginx configuration, restart Nginx:

```bash
sudo systemctl restart nginx
```

### 10. Access Your Application

Open a web browser and navigate to `http://your-domain.com` or `http://your-server-ip:3000` to access your application.

---

These steps will help you set up and deploy the PYUSD Arcade web application on a new Node.js server.
