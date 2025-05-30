# Deployment Guide for Google Home MCP Server

This guide explains how to deploy the Google Home MCP server for remote access from Claude Desktop and Claude web.

## Architecture

The server runs as a WebSocket server with HTTP endpoints, allowing:
- Claude Desktop to connect via WebSocket
- Claude web to connect via WebSocket
- Authentication via Bearer token
- CORS support for web access

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Create `.env` file:
```bash
PORT=3000
AUTH_TOKEN=your-secret-token-here
```

4. Run the server:
```bash
npm run start:server
```

## Deployment Options

### Option 1: Using Docker

1. Build and run with Docker Compose:
```bash
docker-compose up -d
```

2. Check logs:
```bash
docker-compose logs -f
```

### Option 2: Cloud Deployment (Heroku, Railway, Render)

1. Set environment variables:
   - `PORT` (usually auto-set by platform)
   - `AUTH_TOKEN` (generate a secure token)

2. Deploy the application (platform-specific)

3. Note your deployment URL (e.g., `https://your-app.herokuapp.com`)

### Option 3: VPS Deployment

1. SSH to your server
2. Clone the repository
3. Install Node.js 20+
4. Run with PM2:
```bash
npm install -g pm2
npm install
npm run build
pm2 start dist/server.js --name google-home-mcp
pm2 save
pm2 startup
```

## Configuration

### For Claude Desktop

Add to your Claude Desktop config (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "google-home-remote": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/client",
        "ws://your-server:3000/mcp",
        "--header",
        "Authorization: Bearer your-secret-token"
      ]
    }
  }
}
```

For HTTPS deployments, use `wss://` instead of `ws://`.

### For Claude Web

Claude web will automatically connect to MCP servers that are properly configured. Ensure:
1. Your server is accessible via HTTPS
2. CORS is properly configured (already done in the code)
3. Authentication token is set

## Security Considerations

1. **Authentication Token**: 
   - Generate a strong token: `openssl rand -hex 32`
   - Never commit tokens to git
   - Rotate tokens regularly

2. **HTTPS**:
   - Always use HTTPS in production
   - Use services like Cloudflare for SSL if needed

3. **Firewall**:
   - Only expose port 3000 (or your chosen port)
   - Consider IP whitelisting if possible

## First Time Setup

1. After deployment, you'll need to authenticate with Google:
   - Use the `get_auth_url` tool to get the OAuth URL
   - Visit the URL and authorize
   - Use the `authenticate` tool with the code

2. The token will be saved and persisted across restarts

## Monitoring

- Health check endpoint: `GET /health`
- WebSocket endpoint: `/mcp`

Example health check:
```bash
curl https://your-server.com/health
```

## Troubleshooting

1. **Connection refused**: Check firewall and ensure server is running
2. **401 Unauthorized**: Verify AUTH_TOKEN matches in client and server
3. **CORS errors**: Ensure you're using HTTPS in production
4. **WebSocket errors**: Check that WebSocket traffic is allowed by your hosting provider

## Environment Variables

- `PORT`: Server port (default: 3000)
- `AUTH_TOKEN`: Bearer token for authentication
- `NODE_ENV`: Set to 'production' in production