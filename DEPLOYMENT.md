# 📦 DEPLOYMENT GUIDE - BEARIONS

Website Bearions siap untuk di-deploy! Berikut panduan deployment ke berbagai platform.

---

## 🚀 Deploy ke Vercel (Recommended)

Vercel adalah platform terbaik untuk Next.js apps dan dibuat oleh creator Next.js sendiri.

### Method 1: Via Vercel Dashboard (Paling Mudah)

1. **Push ke GitHub**
   ```bash
   git add .
   git commit -m "Initial Bearions website"
   git push origin main
   ```

2. **Connect ke Vercel**
   - Kunjungi [vercel.com](https://vercel.com)
   - Sign up/Login dengan GitHub
   - Click "Add New Project"
   - Import repository Bearions
   - Click "Import"

3. **Configure Environment Variables**
   Di Vercel dashboard, tambahkan env variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-actual-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Deploy**
   - Click "Deploy"
   - Tunggu ~2 menit
   - Website live! 🎉

### Method 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts
# Set environment variables when asked

# Deploy to production
vercel --prod
```

**Domain:** `your-project.vercel.app`

---

## 🌐 Deploy ke Netlify

### Via Netlify Dashboard

1. **Push ke Git**
   ```bash
   git add .
   git commit -m "Deploy to Netlify"
   git push
   ```

2. **Deploy di Netlify**
   - Kunjungi [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import existing project"
   - Connect GitHub repository
   - Build settings:
     ```
     Build command: npm run build
     Publish directory: .next
     ```

3. **Environment Variables**
   Settings → Environment Variables → Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ```

4. **Deploy**
   - Click "Deploy site"
   - Done!

---

## 🐳 Deploy dengan Docker

### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Build & Run

```bash
# Build
docker build -t bearions .

# Run
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your-url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
  bearions
```

---

## ☁️ Deploy ke AWS (Advanced)

### Via AWS Amplify

1. Push code ke GitHub
2. Login ke AWS Console
3. Navigate ke AWS Amplify
4. Click "New app" → "Host web app"
5. Connect repository
6. Add environment variables
7. Deploy

### Via EC2 + PM2

```bash
# SSH ke EC2
ssh -i key.pem ubuntu@your-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repo
git clone your-repo
cd bearions

# Install dependencies
npm install

# Build
npm run build

# Start with PM2
pm2 start npm --name bearions -- start

# Save PM2 config
pm2 save
pm2 startup
```

---

## 🔧 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All TypeScript errors fixed
- [ ] ESLint warnings resolved
- [ ] Build successful locally (`npm run build`)
- [ ] No console errors in production build

### ✅ Environment Setup
- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Admin user created
- [ ] Environment variables ready
- [ ] `.env.local` not committed to Git

### ✅ Database
- [ ] RLS policies enabled
- [ ] Sample data added (optional)
- [ ] Admin table populated
- [ ] Connection tested

### ✅ Security
- [ ] API keys secured
- [ ] No hardcoded secrets
- [ ] CORS configured in Supabase
- [ ] Authentication working

### ✅ Testing
- [ ] Homepage loads
- [ ] Catalog functional
- [ ] Admin login works
- [ ] CRUD operations working
- [ ] Mobile responsive

---

## 🌍 Custom Domain Setup

### Vercel

1. Go to Project Settings → Domains
2. Add your domain: `bearions.com`
3. Update DNS records:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. Wait for propagation (up to 48h)

### Netlify

1. Go to Domain Settings
2. Add custom domain
3. Follow DNS instructions
4. Enable HTTPS

---

## 📊 Post-Deployment Monitoring

### What to Monitor

1. **Performance**
   - Page load times
   - API response times
   - Database query performance

2. **Errors**
   - 404 errors
   - API failures
   - Authentication issues

3. **Usage**
   - User traffic
   - Popular products
   - Admin activity

### Tools

- **Vercel Analytics** (built-in for Vercel)
- **Google Analytics**
- **Sentry** (error tracking)
- **Supabase Dashboard** (database monitoring)

---

## 🔄 CI/CD Setup

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 🐛 Troubleshooting Deployment

### Build Fails

**Error**: TypeScript errors
```bash
# Fix locally
npm run build
# Fix all errors, then commit
```

**Error**: Missing dependencies
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Runtime Errors

**Error**: Supabase connection failed
- Check environment variables are set correctly
- Verify Supabase URL is accessible
- Check API keys are valid

**Error**: 404 on routes
- Ensure all pages are properly exported
- Check file naming conventions
- Verify Next.js config

### Performance Issues

- Enable edge caching
- Optimize images
- Use CDN for assets
- Enable Supabase connection pooling

---

## 📈 Scaling Considerations

### When Traffic Grows

1. **Database**
   - Upgrade Supabase plan
   - Enable connection pooling
   - Add database indexes
   - Implement caching

2. **Application**
   - Use Next.js ISR (Incremental Static Regeneration)
   - Implement CDN
   - Enable edge functions
   - Add rate limiting

3. **Media**
   - Use image CDN (Cloudinary, imgix)
   - Lazy load images
   - Optimize formats (WebP)
   - Implement responsive images

---

## 💰 Cost Estimation

### Free Tier (Good for Start)
- **Vercel**: Free (Hobby plan)
- **Supabase**: Free (up to 500MB database, 2GB bandwidth)
- **Total**: $0/month

### Production Ready
- **Vercel Pro**: $20/month
- **Supabase Pro**: $25/month
- **Custom Domain**: $10-15/year
- **Total**: ~$45/month + domain

### High Traffic
- **Vercel Enterprise**: Custom pricing
- **Supabase Team**: $599/month
- **CDN**: $50-200/month
- **Total**: $650+/month

---

## 📞 Support Resources

- **Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)

---

## ✅ Final Steps

After successful deployment:

1. ✅ Test all features in production
2. ✅ Verify admin login works
3. ✅ Check all pages load correctly
4. ✅ Test on mobile devices
5. ✅ Setup monitoring/analytics
6. ✅ Create backup strategy
7. ✅ Document admin credentials securely
8. ✅ Share production URL with team

---

**Your Bearions website is now LIVE! 🎉**

Production URL: `https://your-domain.vercel.app`
Admin Panel: `https://your-domain.vercel.app/admin/login`

**Happy Selling! 🐻💰**
