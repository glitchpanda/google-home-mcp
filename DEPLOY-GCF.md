# Google Cloud Functions Deployment Guide

Deploy your Google Home MCP server to Google Cloud Functions for a serverless, scalable solution.

## Prerequisites

1. Google Cloud account with billing enabled
2. `gcloud` CLI installed and authenticated
3. Project ID from your credentials.json (already set in deploy script)

## Quick Deploy

1. **Make the deployment script executable**:
```bash
chmod +x deploy-function.sh
```

2. **Deploy to Google Cloud Functions**:
```bash
./deploy-function.sh
```

This will:
- Enable required APIs
- Build your project
- Deploy as a Gen 2 Cloud Function
- Generate a secure AUTH_TOKEN
- Output your function URL

## Manual Deployment

If you prefer to deploy manually:

```bash
# Set your project
gcloud config set project eastern-store-461408-g8

# Build the project
npm run build

# Deploy the function
gcloud functions deploy google-home-mcp \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=googleHomeMCP \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars="AUTH_TOKEN=your-secret-token" \
  --memory=256MB \
  --timeout=60s
```

## Configuration

### Environment Variables

- `AUTH_TOKEN`: Bearer token for authentication (auto-generated if not provided)
- `GOOGLE_CREDENTIALS`: Your Google OAuth credentials JSON (optional)

### Set Environment Variables

```bash
# Set auth token
gcloud functions deploy google-home-mcp \
  --update-env-vars AUTH_TOKEN=your-new-token

# Set Google credentials
gcloud functions deploy google-home-mcp \
  --update-env-vars GOOGLE_CREDENTIALS='{"installed":{...}}'
```

## Claude Configuration

### For Claude Desktop

Add to your `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "google-home": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "https://REGION-PROJECT_ID.cloudfunctions.net/google-home-mcp",
        "-H", "Authorization: Bearer YOUR_AUTH_TOKEN",
        "-H", "Content-Type: application/json",
        "-d", "@-"
      ]
    }
  }
}
```

### For Claude Web

The function automatically supports CORS, so it can be called directly from Claude web.

## Testing

1. **Health check**:
```bash
curl https://REGION-PROJECT_ID.cloudfunctions.net/google-home-mcp/health \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

2. **List tools**:
```bash
curl https://REGION-PROJECT_ID.cloudfunctions.net/google-home-mcp \
  -X POST \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/list"}'
```

## Monitoring

View logs:
```bash
gcloud functions logs read google-home-mcp --region=us-central1
```

View metrics in Cloud Console:
```
https://console.cloud.google.com/functions
```

## Cost

Google Cloud Functions free tier includes:
- 2 million invocations per month
- 400,000 GB-seconds of compute time
- 200,000 GHz-seconds of compute time

For typical usage, this should remain within the free tier.

## Updating

To update your function after code changes:

```bash
npm run build
./deploy-function.sh
```

## Cleanup

To delete the function:
```bash
gcloud functions delete google-home-mcp --region=us-central1
```