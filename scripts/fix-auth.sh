#!/bin/bash

# Script to fix authentication and user creation issues in Supabase

echo "🔧 Fixing authentication and user creation workflow..."

# Check if .env file exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found. Please create it with your Supabase credentials."
    exit 1
fi

# Extract Supabase URL and key from .env.local
export $(grep -E '^NEXT_PUBLIC_SUPABASE_URL|^NEXT_PUBLIC_SUPABASE_ANON_KEY' .env.local | xargs)

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Supabase credentials not found in .env.local"
    exit 1
fi

echo "📝 Running SQL fix script..."

# Run the SQL fix using Supabase CLI if available
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI to apply fixes..."
    supabase db push --file supabase/fix_auth_complete.sql
else
    echo "⚠️  Supabase CLI not found. Please run the following SQL manually in your Supabase dashboard:"
    echo ""
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the contents of supabase/fix_auth_complete.sql"
    echo "4. Run the query"
    echo ""
    echo "File location: supabase/fix_auth_complete.sql"
fi

echo ""
echo "✅ Authentication fix script completed!"
echo ""
echo "📋 Next steps:"
echo "1. Run the SQL script in your Supabase dashboard if not using CLI"
echo "2. Test signup flow for both Expert and Organization users"
echo "3. Test login flow and profile completion redirection"
echo ""
echo "🎯 What was fixed:"
echo "- User creation trigger with profile creation"
echo "- Proper error handling in signup/login pages"
echo "- Profile completion check during login"
echo "- RLS policies for proper access control"
echo "- Missing profile records for existing users"