# JWT Cookie Configuration Fix - Production Domains

## Issues Fixed ✅

### 1. **Cookie Domain Missing** 
- **Problem**: Cookies were not shared across subdomains (cart.varnikaorganics.com couldn't access auth cookies)
- **Fix**: Added `domain: ".varnikaorganics.com"` to cookie options

### 2. **Logout Not Clearing Domain Cookies**
- **Problem**: Logout's `clearCookie` didn't include domain, so cookies persisted
- **Fix**: Added same domain settings to `clearCookie` call

### 3. **CORS Not Configured for Production Domains**
- **Problem**: Frontend at varnikaorganics.com might be blocked by CORS
- **Fix**: Updated CORS to use configurable FRONTEND_URLS array

### 4. **sameSite Override Breaking Production**
- **Problem**: `loginVerifyOtp` had `{ sameSite: "lax" }` override, breaking "none" setting needed for cross-subdomain
- **Fix**: Removed override, now uses consistent settings

### 5. **No Cookie Domain Configuration**
- **Problem**: Cookie domain was hardcoded; different environments need different domains
- **Fix**: Added `COOKIE_DOMAIN` to config.js, configurable via `.env`

---

## Environment Variables Required

Add these to your `.env` file:

```env
# Production domains
NODE_ENV=production
COOKIE_DOMAIN=.varnikaorganics.com
FRONTEND_URLS=https://varnikaorganics.com,https://www.varnikaorganics.com

# Development (if testing locally)
# NODE_ENV=development
# COOKIE_DOMAIN=localhost
# FRONTEND_URLS=http://localhost:5173
```

---

## Cookie Configuration Applied

All cookies now use:
```javascript
{
  httpOnly: true,           // Cannot be accessed by JavaScript
  secure: true,             // HTTPS only in production
  sameSite: "none",         // Allow cross-site in production
  domain: ".varnikaorganics.com", // Shared across all subdomains
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
}
```

---

## CORS Configuration Applied

```javascript
{
  origin: ["https://varnikaorganics.com", "https://www.varnikaorganics.com"],
  credentials: true,        // Allow cookies in CORS requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}
```

---

## Middleware Order (Important!)

```
1. app.use(cors(corsOptions))        ← CORS FIRST
2. app.use(express.json())           ← Body parsing
3. app.use(cookieParser())           ← Cookie parser
4. applySecurityMiddleware()         ← Security headers
5. app.use('/api/auth', authRoutes)  ← Routes with actual handlers
```

---

## Files Modified

1. **src/config/config.js**
   - Added `COOKIE_DOMAIN` configuration
   - Added `FRONTEND_URLS` array parsing

2. **src/app.js**
   - Updated CORS configuration
   - Ensured middleware order is correct
   - Uses `config.FRONTEND_URLS` from environment

3. **src/controller/auth.controller.js**
   - Imported `config`
   - Added `domain` to `authCookieOptions()`
   - Removed `sameSite` override in `loginVerifyOtp`
   - Added `domain` to `logout` clearCookie

---

## Testing Checklist

- [ ] Deploy to production environment
- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_DOMAIN=.varnikaorganics.com`
- [ ] Set `FRONTEND_URLS` to your domains
- [ ] Login from frontend: `varnikaorganics.com`
- [ ] Verify cart service receives JWT cookie
- [ ] Verify logout clears cookie from all subdomains
- [ ] Test with HTTPS (secure flag requires HTTPS in production)
- [ ] Check browser DevTools → Application → Cookies for domain settings

---

## How It Works Now

1. **Frontend logs in** → `varnikaorganics.com`
2. **Auth API sets cookie** with `domain: .varnikaorganics.com`
3. **Cookie is shared** with all subdomains:
   - `auth.varnikaorganics.com` ✅
   - `cart.varnikaorganics.com` ✅
   - `api.varnikaorganics.com` ✅
4. **Other services** can read the JWT from cookies
5. **Logout clears** cookie from all subdomains

---

## Important Notes

⚠️ **HTTPS Required**: `secure: true` in production requires HTTPS. Browsers won't send cookies over HTTP with `secure: true`.

⚠️ **sameSite: none**: Requires `secure: true` and HTTPS. Used for cross-site cookie sending.

⚠️ **Domain Prefix**: `.varnikaorganics.com` (with dot) means ALL subdomains. Remove dot to restrict to specific subdomain.

⚠️ **CORS Order**: CORS middleware MUST run before routes, else credentials won't work.
