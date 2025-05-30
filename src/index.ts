#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { google, homegraph_v1 } from 'googleapis';
import { GoogleAuth } from './auth.js';

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

class GoogleHomeMCP {
  private server: Server;
  private auth: GoogleAuth;
  private homegraph: homegraph_v1.Homegraph | null = null;

  constructor() {
    this.server = new Server(
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

    this.auth = new GoogleAuth();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
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

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

  async start(): Promise<void> {
    try {
      await this.auth.initialize();
    } catch (error) {
      console.error('Warning: Could not initialize Google Auth. You will need to authenticate.');
    }

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Home MCP server started');
  }
}

const mcp = new GoogleHomeMCP();
mcp.start().catch(console.error);