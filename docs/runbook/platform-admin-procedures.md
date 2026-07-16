# Platform Console — Admin Procedures

## Quick Reference

| Task | Route | Required Role |
|------|-------|---------------|
| Login | `/login` | SUPER_ADMIN or SUPPORT_ADMIN |
| View Dashboard | `/dashboard` | SUPER_ADMIN or SUPPORT_ADMIN |
| Manage Users | `/users` | SUPER_ADMIN or SUPPORT_ADMIN |
| Manage Organizations | `/organizations` | SUPER_ADMIN or SUPPORT_ADMIN |
| Manage Subscriptions | `/subscriptions` | SUPER_ADMIN only |
| Toggle Feature Flags | `/features` | SUPER_ADMIN or SUPPORT_ADMIN |
| View Audit Log | `/audit` | SUPER_ADMIN or SUPPORT_ADMIN |
| Health Dashboard | `/health` | SUPER_ADMIN or SUPPORT_ADMIN |
| Send Broadcasts | `/broadcasts` | SUPER_ADMIN only |

---

## 1. User Management

### Viewing Users
1. Navigate to **Users** in the sidebar
2. Use the search bar to filter by name or email
3. Click a user row to view details

### Deactivating a User
1. Navigate to **Users**
2. Click **Deactivate** on the target user
3. Confirm the action
4. The user will be unable to log in until reactivated

### Force-Logging Out a User
1. Navigate to **Users**
2. Click **Force Logout** on the target user
3. All active sessions for that user are invalidated immediately

### Impersonating a User (Super Admin Only)
1. Navigate to **Users**
2. Click **Impersonate** on the target user
3. A new session is created with the impersonated user's permissions
4. Your original session is preserved for returning

---

## 2. Organization Management

### Viewing Organizations
1. Navigate to **Organizations** in the sidebar
2. Use the search bar to filter by name
3. Status badges show: Active (green), Trial (yellow), Suspended (red)

### Suspending an Organization
1. Navigate to **Organizations**
2. Click **Suspend** on the target organization
3. All users in that organization lose access immediately
4. Their subscription remains active but the org is blocked

### Activating an Organization
1. Navigate to **Organizations**
2. Click **Activate** on the suspended organization
3. All users regain access

### Viewing Organization Stats
1. Navigate to **Organizations**
2. Click on an organization name to view details
3. Stats include: user count, farm count, subscription plan, status

---

## 3. Subscription Management

### Viewing Plans
1. Navigate to **Subscriptions** in the sidebar
2. All plans are displayed as cards with limits and user counts

### Creating a New Plan (Super Admin Only)
1. Navigate to **Subscriptions**
2. Click **Create Plan**
3. Fill in: Name, Description, Price, Max Users, Max Farms, Max Storage (MB)
4. Click **Create**

### Assigning a Plan to an Organization
1. Navigate to **Organizations**
2. Click on the target organization
3. Select a new plan from the dropdown
4. Click **Assign Plan**

### Deleting a Plan (Super Admin Only)
1. Navigate to **Subscriptions**
2. Click **Delete** on the target plan
3. Organizations on that plan will be moved to FREE plan limits

---

## 4. Feature Flag Management

### Viewing Feature Flags
1. Navigate to **Feature Flags** in the sidebar
2. Use the category filter to narrow results
3. Toggle switches show current state

### Enabling/Disabling a Feature Globally
1. Navigate to **Feature Flags**
2. Find the target feature
3. Toggle the **Global** switch on/off
4. Changes take effect immediately for all organizations

### Setting Organization-Specific Override
1. Navigate to **Feature Flags**
2. Click on a feature flag
3. Click **Add Override**
4. Select the organization and set enabled/disabled
5. Org-specific overrides take precedence over global settings

---

## 5. Audit Log

### Viewing Audit Logs
1. Navigate to **Audit Log** in the sidebar
2. Logs are displayed newest first

### Filtering Logs
1. Use the **Action** filter to search by action type (e.g., `broadcast.create`)
2. Use the **Entity** filter to search by entity (e.g., `User`, `Broadcast`)
3. Use the date range filters for time-based queries

### Log Entry Details
Each log entry shows:
- **User**: Who performed the action
- **Action**: What was done (e.g., `user.deactivate`, `feature.toggle`)
- **Entity**: What was affected (e.g., `User`, `FeatureFlag`)
- **Entity ID**: The specific record
- **Timestamp**: When it happened

---

## 6. Health Monitoring

### Viewing Service Health
1. Navigate to **Health** in the sidebar
2. Each service shows: status, uptime, latency, last checked
3. Database status shows connectivity and latency

### Running a Health Check
1. Navigate to **Health**
2. Click **Run Health Check**
3. All services are pinged in parallel
4. Results update with latency and status

### Interpreting Status
- **Healthy** (green): Service responding normally
- **Degraded** (yellow): Service responding but with issues
- **Down** (red): Service unreachable or errored

---

## 7. Broadcasts

### Sending a Broadcast
1. Navigate to **Broadcasts** in the sidebar
2. Click **Create Broadcast**
3. Fill in: Title, Message, Type (INFO/WARNING/MAINTENANCE)
4. Optionally select target organizations
5. Click **Create** — notifications are sent immediately

### Broadcast Types
- **INFO**: General information (blue)
- **WARNING**: Important alerts (yellow)
- **MAINTENANCE**: Scheduled maintenance notices (gray)

### Managing Broadcasts
1. View all broadcasts in the list
2. **Delete** removes the broadcast from the list
3. Broadcasts are stored permanently in the audit log

---

## 8. Security Best Practices

### Login Security
- Use strong passwords (12+ characters)
- Enable 2FA when available
- Never share credentials
- Log out when finished

### Session Management
- Sessions expire after 24 hours of inactivity
- Use **Force Logout** for compromised accounts
- Impersonation sessions are logged in the audit trail

### CORS Policy
- Only approved origins can access the API
- Console app origin is whitelisted in `.env`
- Credentials are allowed for auth flows

### Rate Limits
- **Auth endpoints**: 10 requests per 15 minutes
- **API endpoints**: 100 requests per 15 minutes
- **Health checks**: 30 requests per minute
- Rate limit headers are included in responses

---

## 9. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PLATFORM_SERVICE_PORT` | 4020 | Platform service port |
| `CONSOLE_ALLOWED_ORIGINS` | `http://localhost:3004` | CORS allowed origins |
| `JWT_SECRET` | (required) | JWT signing secret |
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:4005` | Notification service URL |

---

## 10. Troubleshooting

### Cannot Login
1. Verify email and password
2. Check if account is active
3. Check platform-service logs for errors
4. Verify JWT_SECRET is set in `.env`

### Feature Flag Not Working
1. Check if the flag is enabled globally
2. Check if an org override exists
3. Verify the feature key matches the service route
4. Check service logs for 403 responses

### Subscription Limit Not Enforcing
1. Verify the organization has a plan assigned
2. Check the plan's maxUsers/maxFarms limits
3. Ensure the user has the correct organizationId
4. Super admins bypass all limits

### Health Check Failing
1. Verify the target service is running
2. Check the service port in the SERVICES list
3. Check network connectivity between services
4. Review service logs for errors

---

*Last updated: July 2, 2026*
