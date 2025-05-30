# Google Home MCP Server

MCP (Model Context Protocol) server for integrating Google Home with Claude.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up Google Cloud credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable the HomeGraph API
   - Create OAuth 2.0 credentials
   - Download the credentials JSON and save as `credentials.json` in the project root

3. Build the project:
```bash
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "google-home": {
      "command": "node",
      "args": ["/path/to/google-home-mcp/dist/index.js"]
    }
  }
}
```

### Available Tools

- `get_auth_url` - Get Google OAuth URL for authentication
- `authenticate` - Authenticate with authorization code
- `list_devices` - List all Google Home devices
- `execute_command` - Execute commands on devices
- `query_devices` - Query device states
- `get_device_states` - Get detailed device states

## First Time Setup

1. Use the `get_auth_url` tool to get the authentication URL
2. Visit the URL and authorize the application
3. Copy the authorization code
4. Use the `authenticate` tool with the code

## Development

```bash
npm run dev
```

## License

MIT