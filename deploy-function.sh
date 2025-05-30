#!/bin/bash

# Google Cloud Function deployment script

PROJECT_ID="eastern-store-461408-g8"  # Your project ID from credentials
FUNCTION_NAME="google-home-mcp"
REGION="us-central1"
ENTRY_POINT="googleHomeMCP"

echo "🚀 Deploying Google Home MCP to Google Cloud Functions..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "📦 Enabling required APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Build the project
echo "🔨 Building project..."
npm run build

# Deploy function
echo "☁️ Deploying function..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --runtime=nodejs20 \
    --region=$REGION \
    --source=. \
    --entry-point=$ENTRY_POINT \
    --trigger-http \
    --allow-unauthenticated \
    --set-env-vars="AUTH_TOKEN=${AUTH_TOKEN:-$(openssl rand -hex 32)}" \
    --memory=256MB \
    --timeout=60s

# Get the function URL
echo "✅ Deployment complete!"
echo ""
echo "Function URL:"
gcloud functions describe $FUNCTION_NAME --region=$REGION --gen2 --format='value(serviceConfig.uri)'
echo ""
echo "⚠️  Save the AUTH_TOKEN for Claude configuration!"