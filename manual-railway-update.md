# Manual Railway Database Update Guide

If the automated script doesn't work, you can apply the schema updates manually.

## Method 1: Using Railway CLI (Recommended)

### Prerequisites
```bash
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
cd /path/to/tablebooking
railway link
```

### Steps
1. **Connect to your database:**
   ```bash
   railway connect --service postgresql
   ```

2. **Copy and paste the SQL from the update file:**
   Open `backend/src/config/schema-updates.sql` and copy all contents, then paste into the PostgreSQL prompt.

3. **Verify the updates:**
   ```sql
   -- Check if new tables were created
   \dt dietary_requirements
   \dt booking_templates
   \dt booking_occasions
   
   -- Check if new columns were added to bookings
   \d bookings
   ```

## Method 2: Using Railway Dashboard

### Steps
1. **Go to Railway Dashboard:**
   - Visit [railway.app](https://railway.app)
   - Navigate to your project
   - Click on your PostgreSQL service

2. **Open Query Tab:**
   - Click on "Query" tab in the PostgreSQL service
   - This opens a web-based SQL editor

3. **Execute the SQL:**
   - Copy contents from `backend/src/config/schema-updates.sql`
   - Paste into the query editor
   - Click "Execute"

## Method 3: Using External Database Client

### Get Connection Details
```bash
# Get database URL
railway variables get DATABASE_URL

# Or get individual connection details
railway variables get PGHOST
railway variables get PGPORT
railway variables get PGDATABASE
railway variables get PGUSER
railway variables get PGPASSWORD
```

### Connect with your preferred client:
- **pgAdmin**: Use the connection details above
- **DBeaver**: Create new PostgreSQL connection
- **VSCode**: Use PostgreSQL extension
- **Terminal**: Use `psql` directly with the DATABASE_URL

## Backup First (Recommended)

Before applying updates, create a backup:

```bash
# Using Railway CLI
railway connect --service postgresql -- pg_dump --schema-only > schema-backup.sql

# Or full backup (schema + data)
railway connect --service postgresql -- pg_dump > full-backup.sql
```

## What the Updates Do

The schema updates are **SAFE** and only add new features:

### New Tables Added:
- `dietary_requirements` - Reference table for allergies/preferences
- `booking_templates` - Customer history for auto-complete
- `booking_occasions` - Predefined occasions (birthday, anniversary, etc.)

### New Columns Added to `bookings`:
- `dietary_requirements` (TEXT)
- `occasion` (VARCHAR)
- `preferred_seating` (VARCHAR)
- `marketing_consent` (BOOLEAN)
- `source` (VARCHAR)
- `created_by` (UUID)
- `is_vip` (BOOLEAN)
- `internal_notes` (TEXT)
- `metadata` (JSONB)

### No Data Loss:
- ✅ All existing bookings remain unchanged
- ✅ New columns have default values
- ✅ No breaking changes to existing functionality

## Verification Commands

After applying updates, verify everything worked:

```sql
-- Check new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('dietary_requirements', 'booking_templates', 'booking_occasions');

-- Check new columns in bookings table
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('dietary_requirements', 'occasion', 'preferred_seating', 'marketing_consent', 'source', 'created_by', 'is_vip', 'internal_notes', 'metadata');

-- Count sample data
SELECT COUNT(*) FROM dietary_requirements;
SELECT COUNT(*) FROM booking_occasions;
```

## Troubleshooting

### Common Issues:

1. **Permission Denied:**
   - Make sure you're connected to the right database service
   - Verify your Railway user has database access

2. **Table Already Exists:**
   - The script uses `CREATE TABLE IF NOT EXISTS` - this is safe
   - You can re-run the updates multiple times

3. **Connection Timeout:**
   - Railway connections timeout after inactivity
   - Reconnect and try again

4. **Railway CLI Issues:**
   - Update CLI: `npm update -g @railway/cli`
   - Re-login: `railway logout && railway login`
   - Re-link project: `railway link`

### Getting Help:

If you encounter issues:
1. Check Railway service logs: `railway logs --service postgresql`
2. Verify service status: `railway status`
3. Check Railway dashboard for service health
4. Contact Railway support if database service is down

## After Update

Once schema is updated:
1. Your Railway deployment will automatically restart
2. The new optimized booking form will be available
3. Test by clicking "Quick Booking" in the admin panel
4. Verify customer auto-complete and dietary requirements work

## Success Indicators

You'll know it worked when:
- ✅ No errors during SQL execution
- ✅ New tables appear in database
- ✅ "Quick Booking" button works in frontend
- ✅ Customer auto-complete shows typing suggestions
- ✅ Dietary requirements dropdown populates
- ✅ Time slots show color-coded availability