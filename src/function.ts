import { Request, Response } from '@google-cloud/functions-framework';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { google, homegraph_v1 } from 'googleapis';
import { GoogleAuth } from './auth.js';
import * as functions from '@google-cloud/functions-framework';

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

class GoogleHomeMCPFunction {
  private auth: GoogleAuth;
  private homegraph: homegraph_v1.Homegraph | null = null;
  private server: Server;

  constructor() {
    this.auth = new GoogleAuth();
    this.server = this.createServer();
    this.initialize();
  }

  private async initialize() {
    try {
      await this.auth.initialize();
    } catch (error) {
      console.error('Warning: Could not initialize Google Auth. You will need to authenticate.');
    }
  }

  private createServer(): Server {
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

  async handleRequest(request: any): Promise<any> {
    // Handle MCP protocol requests
    if (request.method === 'tools/list') {
      return this.server.listTools();
    } else if (request.method === 'tools/call') {
      return this.server.callTool(request.params);
    }
    
    throw new Error(`Unknown method: ${request.method}`);
  }
}

// Initialize the MCP function handler
const mcpFunction = new GoogleHomeMCPFunction();

// Google Cloud Function entry point
functions.http('googleHomeMCP', async (req: Request, res: Response) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  // Check auth token
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.AUTH_TOKEN || 'your-secret-token';
  
  if (authHeader !== `Bearer ${expectedToken}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Health check
  if (req.path === '/health') {
    res.json({ status: 'ok', service: 'google-home-mcp' });
    return;
  }

  try {
    // Handle MCP requests
    const result = await mcpFunction.handleRequest(req.body);
    res.json(result);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});