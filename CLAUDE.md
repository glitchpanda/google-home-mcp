# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build
```bash
npm run build         # Compile TypeScript to dist/
```

### Development
```bash
npm run dev          # Run TypeScript directly with tsx
```

### Running
```bash
npm start            # Run compiled JavaScript from dist/
```

**Note**: There are no test or lint commands configured in this project.

## Architecture Overview

This is an MCP (Model Context Protocol) server that enables Claude to interact with Google Home devices through the Google HomeGraph API.

### Core Components

1. **MCP Server** (`src/index.ts`): Main entry point implementing the MCP protocol
   - Uses `@modelcontextprotocol/sdk` for server implementation
   - Communicates via stdio transport
   - Exposes tools for Google Home integration

2. **Authentication** (`src/auth.ts`): OAuth2 authentication with Google
   - Manages credentials from `credentials.json`
   - Stores tokens in `token.json`
   - Handles OAuth2 flow for Google API access

### Key Files

- `credentials.json`: Google OAuth2 credentials (not in repo, must be added)
- `token.json`: Stored authentication tokens (generated after first auth)
- `dist/`: Compiled JavaScript output (generated by build)

### Available MCP Tools

- `get_auth_url`: Generate Google OAuth URL
- `authenticate`: Complete OAuth flow with authorization code
- `list_devices`: List all Google Home devices
- `execute_command`: Execute commands on devices
- `query_devices`: Query device states
- `get_device_states`: Get detailed device states

### Authentication Flow

1. First run requires OAuth2 setup:
   - Call `get_auth_url` to get authorization URL
   - User visits URL and authorizes
   - Call `authenticate` with the returned code
   - Token is saved for future use

### Deployment

The project includes Google Cloud deployment configuration:
- `deploy-gcp.sh`: Deployment script for GCP
- `google-home-mcp.service`: Systemd service configuration
- `Dockerfile` and `docker-compose.yml`: Container deployment options
- See `DEPLOY-GCP.md` for detailed deployment instructions