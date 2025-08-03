# Email Setup Guide

## Gmail App Password Setup (Recommended for MVP)

### Step 1: Enable 2-Factor Authentication
1. Go to your [Google Account](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar
3. Under "Signing in to Google", click on "2-Step Verification"
4. Follow the prompts to enable 2FA

### Step 2: Generate App Password
1. After enabling 2FA, go back to Security settings
2. Under "Signing in to Google", you'll now see "App passwords"
3. Click on "App passwords"
4. Select app: "Mail"
5. Select device: "Other (Custom name)"
6. Enter name: "Expert Matching Platform"
7. Click "Generate"
8. Copy the 16-character password (spaces don't matter)

### Step 3: Configure Environment Variables
Add to your `.env.local` file:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # The 16-character password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Test Email Sending
The email service will automatically:
- Send campaign match notifications to experts
- Send proposal notifications to organizations
- Send welcome emails to new users
- Handle password reset emails

### Daily Limits
- **Gmail Free**: 100 emails per day
- Perfect for MVP and testing
- Monitor usage in Gmail's sent folder

## Production Email Services (When Scaling)

### Option 1: SendGrid
- Free tier: 100 emails/day
- Paid: $15-30/month for 15,000-40,000 emails
- Better deliverability and analytics

### Option 2: AWS SES
- $0.10 per 1,000 emails
- Very cost-effective for high volume
- Requires domain verification

### Option 3: Resend
- Free tier: 3,000 emails/month
- Simple API, great developer experience
- $20/month for 50,000 emails

## Email Strategy for the Platform

### Stage 1: Precise Matching (Immediate)
- Send to experts with exact keyword matches
- Limit: 10-20 experts per campaign
- High relevance, better response rate

### Stage 2: Expanded Matching (After 24-48 hours)
- If response rate < 30%
- Send to experts with similar keywords
- Expand location criteria

### Stage 3: Public Broadcasting (After 48-72 hours)
- Open to all experts in category
- Maximum exposure
- May have lower relevance

## Monitoring & Best Practices

1. **Track Email Metrics**:
   - Open rates
   - Click rates
   - Response rates
   - Bounce rates

2. **Avoid Spam Filters**:
   - Use professional email templates
   - Include unsubscribe links
   - Avoid spam trigger words
   - Maintain consistent sending patterns

3. **Rate Limiting**:
   - Batch emails with delays
   - Respect provider limits
   - Queue non-urgent emails

4. **Testing**:
   - Test with multiple email providers
   - Check spam scores
   - Verify links work correctly
   - Test on mobile devices