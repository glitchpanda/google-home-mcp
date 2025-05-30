#!/usr/bin/env node
import express from 'express';
import { WebSocketServer } from 'ws';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// WebSocket transport will be implemented directly
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { google, homegraph_v1 } from 'googleapis';
import { GoogleAuth } from './auth.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const ExecuteCommandSchema = z.object({
  command: z.string().describe('The command to execute on Google Home devices'),
  devices: z.array(z.string()).optional().describe('Optional list of device IDs to target'),
});

const QueryDevicesSchema = z.object({
  devices: z.array(z.string()).optional().describe('Optional list of device IDs to query'),
});

const GetDeviceStatesSchema = z.object({
  deviceIds: z.array(z.string()).describe('List of device IDs to get states for'),
});

class GoogleHomeMCPServer {
  private auth: GoogleAuth;
  private homegraph: homegraph_v1.Homegraph | null = null;

  constructor() {
    this.auth = new GoogleAuth();
  }

  async createServer() {
    const server = new Server(
      {
        name: 'google-home-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers(server);
    return server;
  }

  private setupHandlers(server: Server): void {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'execute_command',
            description: 'Execute a command on Google Home devices',
            inputSchema: ExecuteCommandSchema,
          },
          {
            name: 'query_devices',
            description: 'Query the state of Google Home devices',
            inputSchema: QueryDevicesSchema,
          },
          {
            name: 'get_device_states',
            description: 'Get detailed states of specific devices',
            inputSchema: GetDeviceStatesSchema,
          },
          {
            name: 'list_devices',
            description: 'List all available Google Home devices',
            inputSchema: z.object({}),
          },
          {
            name: 'get_auth_url',
            description: 'Get the Google OAuth URL for authentication',
            inputSchema: z.object({}),
          },
          {
            name: 'authenticate',
            description: 'Authenticate with Google using an authorization code',
            inputSchema: z.object({
              code: z.string().describe('The authorization code from Google OAuth'),
            }),
          },
        ],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_auth_url': {
            if (!this.auth.isAuthenticated()) {
              const authUrl = this.auth.getAuthUrl();
              return {
                content: [
                  {
                    type: 'text',
                    text: `Please visit this URL to authorize the application:\n${authUrl}`,
                  },
                ],
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: 'Already authenticated with Google.',
                },
              ],
            };
          }

          case 'authenticate': {
            const { code } = z.object({ code: z.string() }).parse(args);
            await this.auth.getTokenFromCode(code);
            this.homegraph = google.homegraph({
              version: 'v1',
              auth: this.auth.getClient(),
            });
            return {
              content: [
                {
                  type: 'text',
                  text: 'Successfully authenticated with Google!',
                },
              ],
            };
          }

          case 'execute_command': {
            if (!this.auth.isAuthenticated()) {
              throw new Error('Not authenticated. Please authenticate first.');
            }
            
            const { command, devices } = ExecuteCommandSchema.parse(args);
            
            if (!this.homegraph) {
              this.homegraph = google.homegraph({
                version: 'v1',
                auth: this.auth.getClient(),
              });
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `Command "${command}" would be executed on devices: ${devices?.join(', ') || 'all devices'}`,
                },
              ],
            };
          }

          case 'query_devices': {
            if (!this.auth.isAuthenticated()) {
              throw new Error('Not authenticated. Please authenticate first.');
            }

            const { devices } = QueryDevicesSchema.parse(args);
            
            if (!this.homegraph) {
              this.homegraph = google.homegraph({
                version: 'v1',
                auth: this.auth.getClient(),
              });
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `Querying devices: ${devices?.join(', ') || 'all devices'}`,
                },
              ],
            };
          }

          case 'get_device_states': {
            if (!this.auth.isAuthenticated()) {
              throw new Error('Not authenticated. Please authenticate first.');
            }

            const { deviceIds } = GetDeviceStatesSchema.parse(args);
            
            if (!this.homegraph) {
              this.homegraph = google.homegraph({
                version: 'v1',
                auth: this.auth.getClient(),
              });
            }

            return {
              content: [
                {
                  type: 'text',
                  text: `Getting states for devices: ${deviceIds.join(', ')}`,
                },
              ],
            };
          }

          case 'list_devices': {
            if (!this.auth.isAuthenticated()) {
              throw new Error('Not authenticated. Please authenticate first.');
            }

            if (!this.homegraph) {
              this.homegraph = google.homegraph({
                version: 'v1',
                auth: this.auth.getClient(),
              });
            }

            return {
              content: [
                {
                  type: 'text',
                  text: 'Device listing would be implemented here',
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  async initialize() {
    try {
      await this.auth.initialize();
    } catch (error) {
      console.error('Warning: Could not initialize Google Auth. You will need to authenticate.');
    }
  }
}

async function main() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Enable CORS for Claude web
  app.use(cors());
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'google-home-mcp' });
  });

  // Simple auth check (you should implement proper auth)
  const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-secret-token';
  
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  const server = app.listen(port, () => {
    console.log(`🚀 Google Home MCP server listening on port ${port}`);
  });

  // WebSocket server for MCP
  const wss = new WebSocketServer({ 
    server,
    path: '/mcp'
  });

  const mcpServer = new GoogleHomeMCPServer();
  await mcpServer.initialize();

  wss.on('connection', async (ws) => {
    console.log('New WebSocket connection established');
    
    // For now, we'll implement a simple request-response pattern
    // In production, you'd want to use the official MCP WebSocket transport
    const server = await mcpServer.createServer();
    
    ws.on('message', async (data) => {
      try {
        const request = JSON.parse(data.toString());
        // Handle MCP requests here
        // This is a simplified implementation
        ws.send(JSON.stringify({ 
          jsonrpc: '2.0',
          id: request.id,
          result: { message: 'MCP server connected' }
        }));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
    // Send initial connection message
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'connection.ready',
      params: {}
    }));
  });
}

main().catch(console.error);