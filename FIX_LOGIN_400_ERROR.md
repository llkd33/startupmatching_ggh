# Fix for Login 400 Error

## Problem Summary
Users were getting 400 errors when trying to log in, specifically during the "user backfill" process. The errors showed:
- `Failed to load resource: the server responded with a status of 400`
- `Failed to backfill user record: Object`

## Root Cause Analysis
The issue was caused by **missing INSERT policy** for the `users` table in Supabase. The login process tries to `upsert` user records, but:

1. ❌ **No INSERT policy** existed for the `users` table
2. ❌ **UPDATE policy** didn't have proper validation checks
3. ❌ **Frontend code** didn't validate data before sending to database

## Fixed Issues

### 1. Database Policies (SQL Fix)
**File**: `supabase/fix_rls_user_insert.sql`

- ✅ Added INSERT policy for users table with validation
- ✅ Enhanced UPDATE policy with proper validation checks  
- ✅ Added data validation for role and email fields
- ✅ Added debugging function for troubleshooting

### 2. Frontend Code (TypeScript Fix)
**File**: `src/app/auth/login/page.tsx`

- ✅ Added email validation before upsert
- ✅ Added role validation against allowed values
- ✅ Enhanced error logging with attempted data
- ✅ Better error messages for debugging

## How to Apply the Fix

### Step 1: Apply Database Fixes
Run this SQL in your Supabase SQL editor:

```bash
# Navigate to the project directory
cd /Users/startuperdaniel/dev/startupmatching

# Apply the RLS fix
cat supabase/fix_rls_user_insert.sql
```

Copy and paste the contents into Supabase SQL Editor and execute.

### Step 2: Verify Policies
Check that these policies exist in your Supabase dashboard:

**Users Table Policies**:
- ✅ `Users can view own profile` (SELECT)
- ✅ `Users can insert own profile` (INSERT) - **NEW**
- ✅ `Users can update own profile` (UPDATE) - **ENHANCED**

### Step 3: Test the Fix
1. Clear browser cache and local storage
2. Try logging in with a test account
3. Monitor browser console for errors
4. Check Supabase logs for any remaining issues

### Step 4: Optional - Enable Debug Logging
If you still see issues, uncomment the debug trigger in the SQL file:

```sql
DROP TRIGGER IF EXISTS debug_user_insert_trigger ON public.users;
CREATE TRIGGER debug_user_insert_trigger
    BEFORE INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.debug_user_insert();
```

This will log all user insert attempts to help debug any remaining issues.

## What the Fix Does

### Database Level
1. **INSERT Policy**: Allows authenticated users to insert their own user record with validation
2. **Validation**: Ensures role is valid (`expert`, `organization`, `admin`) and email is not empty
3. **Security**: Users can only insert/update their own records (auth.uid() = id)

### Application Level  
1. **Data Validation**: Checks email and role before sending to database
2. **Error Handling**: Better error messages and logging for debugging
3. **Type Safety**: Validates role against TypeScript enum

## Expected Result
- ✅ Login should work without 400 errors
- ✅ User records should be created/updated successfully
- ✅ Better error messages if validation fails
- ✅ Improved debugging capabilities

## Monitoring
After applying the fix, monitor for:
- No more 400 errors in browser console
- Successful user record creation in Supabase
- Proper role assignment during login
- Clean authentication flow