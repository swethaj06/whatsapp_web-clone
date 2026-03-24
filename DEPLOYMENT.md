# Vercel Deployment Guide for WhatsApp Clone

## Quick Start

### 1. Prerequisites
- Vercel Account (https://vercel.com)
- GitHub Repository (push your code)
- MongoDB Atlas Database
- Environment Variables Ready

### 2. GitHub Setup

```bash
# Initialize git if not already done
git init

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/whatsapp_web-clone.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Vercel Deployment

#### Option A: Via Vercel Dashboard (Recommended)

1. **Create Vercel Account**
   - Visit https://vercel.com/signup
   - Sign up with GitHub

2. **Import Project**
   - Go to https://vercel.com/dashboard
   - Click "Add New" → "Project"
   - Click "Import Git Repository"
   - Select your `whatsapp_web-clone` repository
   - Project name: `whatsappClone`

3. **Configure Environment**
   - Framework: Select Auto-detected (or React)
   - Root Directory: ./
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: frontend/build

4. **Set Environment Variables**
   - Click "Environment Variables"
   - Add the following:

   ```
   MONGODB_URI
   mongodb+srv://username:password@cluster.mongodb.net/whatsapp-clone?retryWrites=true&w=majority
   
   JWT_SECRET
   your_very_strong_secret_key_here_minimum_32_characters
   
   CORS_ORIGIN
   https://whatsappClone.vercel.app
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build completion
   - Your app will be live at `https://whatsappClone.vercel.app`

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel deploy --prod
```

## Configuration Files

### vercel.json
Located in project root. Configures:
- Build commands
- Routes (API and Frontend)
- Environment variables
- Function configuration

### .vercelignore
Excludes unnecessary files from deployment:
- node_modules
- Git files
- Development files
- Build artifacts

### backend/api/index.js
Express app exported as serverless function:
- Handles all API routes
- Socket.IO configuration
- CORS setup for production
- MongoDB connection pooling

## Post-Deployment Steps

### 1. Verify Deployment

```bash
# Check if backend is running
curl https://whatsappClone.vercel.app/api/health
# Expected response: {"message":"Server is running"}
```

### 2. Update Frontend Environment

After getting your Vercel URL, update frontend environment:

```env
REACT_APP_API_URL=https://whatsappClone.vercel.app/api
REACT_APP_SOCKET_URL=https://whatsappClone.vercel.app
```

Then redeploy:
```bash
git push origin main
```

### 3. MongoDB Atlas Whitelist

Add Vercel deployment IP to MongoDB Access:
1. MongoDB Atlas Dashboard → Your Cluster
2. Network Access → IP Whitelist
3. Add IP: `0.0.0.0/0` (for development) or specific Vercel IPs

## Troubleshooting

### Build Failures

**Error: "Cannot find module"**
```bash
# Solution: Ensure all dependencies are in package.json
npm install missing-package --save
git push origin main
```

**Error: "Frontend build failed"**
- Check `frontend/public` folder exists
- Verify all imports are correct
- Run `npm run build` locally first

### Runtime Errors

**MongoDB Connection Timeout**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas whitelist includes Vercel
- Verify connection string has correct password

**CORS Error**
- Update `CORS_ORIGIN` to match Vercel URL
- Redeploy after updating
- Check frontend API endpoint matches

**WebSocket Connection Failed**
- Verify Socket.IO is installed: `npm list socket.io`
- Check Socket.IO configuration in `backend/src/server.js`
- Ensure CORS settings allow your domain

### Performance Issues

**Slow API Responses**
- Check MongoDB Atlas performance metrics
- Monitor Vercel Function duration
- Consider database indexing

**High Memory Usage**
- Review `vercel.json` memory settings
- Check for memory leaks in backend code
- Monitor active connections

## Production Best Practices

### Security
- [ ] Use strong JWT_SECRET (minimum 32 characters)
- [ ] Enable MongoDB authentication
- [ ] Set NODE_ENV=production
- [ ] Use HTTPS only
- [ ] Implement rate limiting
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets

### Performance
- [ ] Enable caching headers
- [ ] Compress responses
- [ ] Optimize database queries
- [ ] Monitor API response times
- [ ] Use CDN for static files
- [ ] Implement pagination

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Monitor uptime
- [ ] Track API metrics
- [ ] Monitor database performance
- [ ] Set up alerts for failures

## Deployment Checklist

Before deploying to production:

- [ ] All tests passing locally
- [ ] Environment variables configured
- [ ] MongoDB backup created
- [ ] SSL certificate configured
- [ ] CORS settings correct
- [ ] Rate limiting configured
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place

## Custom Domain Setup

1. **In Vercel Dashboard**
   - Project Settings → Domains
   - Add custom domain (e.g., whatsappclone.com)

2. **Update DNS Records**
   - Provider: Your domain registrar
   - Add CNAME record pointing to Vercel

3. **Verify SSL**
   - Vercel automatically provisions SSL
   - Wait for DNS propagation (up to 24 hours)

## Rollback Procedure

If deployment has issues:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click three dots → "Promote to Production"
4. Previous version will be restored

## Cost Estimations

**Vercel Pricing:**
- Hobby: Free tier (perfect for learning)
- Pro: $20/month (for production apps)
- Enterprise: Custom pricing

**MongoDB Atlas:**
- Free tier: 512MB storage (great for testing)
- Shared cluster: $57/month (small production)
- Dedicated: Pay as you go

## Support Resources

- Vercel Docs: https://vercel.com/docs
- MongoDB Docs: https://docs.mongodb.com
- Node.js Docs: https://nodejs.org/docs
- Express Docs: https://expressjs.com
- Socket.IO Docs: https://socket.io/docs

## Next Steps

1. Set up CI/CD pipeline for automatic deployments
2. Implement automated backups
3. Set up monitoring and alerting
4. Configure custom domain
5. Plan scaling strategy
6. Document API documentation
7. Set up analytics tracking
