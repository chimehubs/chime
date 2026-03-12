# Production Deployment Checklist

## Deployment Target (Vercel)
- Project ID: `prj_gRJU3Rwni95hywxzeL47ZuFTm2y2`
- Site URL: set your Vercel domain and mirror it in `VITE_SITE_URL` for Google Auth redirects.

## Phase 1: Code Cleanup ✅ COMPLETED
- [x] Remove all mock user data from AdminUsers
- [x] Remove all mock deposits from AdminDeposits
- [x] Remove all mock activity logs from AdminTransactions
- [x] Remove mock spending data from Dashboard
- [x] Remove mock transactions from Dashboard
- [x] Remove demo credentials display from Login page
- [x] Update components to fetch real data from bankingDb

## Phase 2: Backend API Integration
### Priority 1 - Critical
- [ ] Update `src/lib/apiClient.ts` with production API endpoint
- [ ] Implement `/auth/login` endpoint connection
- [ ] Implement `/auth/register` endpoint connection
- [ ] Implement `/auth/logout` endpoint connection
- [ ] Setup secure token storage (httpOnly cookies recommended)

### Priority 2 - User Operations
- [ ] Implement `/users/{id}` GET endpoint (user profile)
- [ ] Implement `/users/{id}` PUT endpoint (profile updates)
- [ ] Implement `/accounts/{id}/transactions` GET endpoint
- [ ] Implement `/accounts/{id}/balance` GET endpoint
- [ ] Setup real transaction processing endpoints

### Priority 3 - Admin Operations
- [ ] Implement `/admin/users` GET endpoint (paginated)
- [ ] Implement `/admin/deposits` GET endpoint
- [ ] Implement `/admin/kyc` GET endpoint
- [ ] Implement `/admin/transactions` GET endpoint (activity logs)
- [ ] Implement `/admin/kyc/{id}/approve` POST endpoint
- [ ] Implement `/admin/kyc/{id}/reject` POST endpoint

## Phase 3: Database Setup
- [ ] Replace in-memory `bankingDb` with real database
- [ ] Setup PostgreSQL / MongoDB connection
- [ ] Create database schemas and migrations
- [ ] Setup connection pooling
- [ ] Configure database backups

## Phase 4: Security Hardening
- [ ] Remove all console.log statements (sensitive data exposure)
- [ ] Implement rate limiting on API endpoints
- [ ] Setup CORS properly for production domain only
- [ ] Enable HTTPS/TLS everywhere
- [ ] Implement request/response encryption for sensitive data
- [ ] Setup helmet.js for security headers
- [ ] Configure CSP (Content Security Policy)
- [ ] Setup CSRF protection
- [ ] Implement input validation on all forms
- [ ] Implement output encoding for XSS prevention

## Phase 5: Environment Configuration
- [ ] Create `.env.production` file (do NOT commit to git)
- [ ] Setup environment variables for:
  - `REACT_APP_API_BASE_URL` → production API domain
  - `REACT_APP_ENV` → 'production'
  - `REACT_APP_LOG_LEVEL` → 'error'
  - Database connection strings (securely)
  - API keys and tokens (securely)
- [ ] Configure CI/CD to use environment secrets
- [ ] Disable debug mode in production build

## Phase 6: Performance Optimization
- [ ] Enable gzip compression
- [ ] Setup CDN for static assets
- [ ] Implement code splitting
- [ ] Optimize bundle size (check with `npm run build`)
- [ ] Setup service workers for offline support
- [ ] Cache optimization headers

## Phase 7: Monitoring & Logging
- [ ] Setup error tracking (Sentry, LogRocket, etc.)
- [ ] Setup performance monitoring (New Relic, DataDog, etc.)
- [ ] Configure structured logging
- [ ] Setup alerting for critical errors
- [ ] Create audit logs for admin actions
- [ ] Monitor database performance

## Phase 8: Testing
- [ ] Run full test suite
- [ ] Perform security audit / penetration testing
- [ ] Load testing (target: 1000+ concurrent users)
- [ ] Stress testing database

## Phase 9: Data & Compliance
- [ ] Setup automated backups
- [ ] Implement GDPR compliance (right to be forgotten)
- [ ] Implement PCI DSS compliance (if handling cards)
- [ ] Setup audit trails for regulatory compliance
- [ ] Implement data retention policies

## Phase 10: Deployment
- [ ] Setup production infrastructure (cloud provider)
- [ ] Configure auto-scaling policies
- [ ] Setup load balancing
- [ ] Configure disk encryption
- [ ] Setup DDoS protection
- [ ] Configure WAF (Web Application Firewall)

## Phase 11: Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify all features working
- [ ] User acceptance testing
- [ ] Gradual traffic increase (blue-green deployment)

## Phase 12: Documentation
- [ ] Update README with production setup
- [ ] Create runbooks for common issues
- [ ] Document incident response procedures
- [ ] Create user guides and help documentation

---

## Key Files to Update Before Production

### 1. Environment Variables
```
./.env.production
VITE_API_URL=https://api.chime.com
VITE_APP_NAME=chime
VITE_SITE_URL=https://your-vercel-domain.vercel.app
VITE_VERCEL_PROJECT_ID=prj_gRJU3Rwni95hywxzeL47ZuFTm2y2
```

### 2. API Client Configuration
```tsx
// src/lib/apiClient.ts
const apiBaseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';
```

### 3. Remove Mock Services
- [ ] Replace `bankingDatabase.ts` with real database connection
- [ ] Remove `provisioningService.ts` (mock service)
- [ ] Update all `TODO` comments in codebase

### 4. Update Authentication
```tsx
// Replace demo token logic with real backend calls
login: async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  // Follow response structure
  return response.data;
}
```

---

## Current Status
✅ **Complete**: Mock data removal from components
⏳ **In Progress**: Backend API integration  
❌ **Not Started**: Database migration, Security hardening

## Next Steps
1. Connect to production backend API
2. Replace in-memory database with real database
3. Implement comprehensive error handling
4. Setup monitoring and logging
5. Security audit and penetration testing
6. Load testing before launch

---

## Important Notes

### Before Deployment
- ✋ **STOP**: Remove all `console.log()` calls
- ✋ **STOP**: Remove all demo/test data from production branches
- ✋ **STOP**: Ensure all API endpoints are tested
- ✋ **STOP**: Verify encryption for sensitive data

### Production Build
```bash
npm run build
# Output will be in build/ directory
# Deploy build/ folder to production server
```

### Monitoring After Launch
- Watch error rates closely first 24 hours
- Monitor database query performance
- Track API response times
- Monitor user registration and login flows
