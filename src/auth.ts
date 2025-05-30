import { OAuth2Client } from 'google-auth-library';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface Credentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

export class GoogleAuth {
  private oauth2Client: OAuth2Client | null = null;
  private credentialsPath: string;
  private tokenPath: string;

  constructor() {
    this.credentialsPath = path.join(__dirname, '../credentials.json');
    this.tokenPath = path.join(__dirname, '../token.json');
  }

  async initialize(): Promise<void> {
    try {
      // Check if credentials are provided via environment variable first
      const envCredentials = process.env.GOOGLE_CREDENTIALS;
      let credentials;
      
      if (envCredentials) {
        credentials = JSON.parse(envCredentials);
      } else {
        // Try to read from file
        try {
          const credentialsContent = await fs.readFile(this.credentialsPath, 'utf-8');
          credentials = JSON.parse(credentialsContent);
        } catch (error) {
          console.log('No credentials file found. Please set GOOGLE_CREDENTIALS environment variable or provide credentials.json');
          return;
        }
      }
      
      const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
      
      this.oauth2Client = new OAuth2Client(
        client_id,
        client_secret,
        redirect_uris[0]
      );

      try {
        const tokenContent = await fs.readFile(this.tokenPath, 'utf-8');
        const token = JSON.parse(tokenContent);
        this.oauth2Client.setCredentials(token);
      } catch (error) {
        console.log('No token found, authorization required');
      }
    } catch (error) {
      console.error(`Failed to initialize Google Auth: ${error}`);
    }
  }

  getAuthUrl(): string {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const scopes = [
      'https://www.googleapis.com/auth/homegraph',
      'https://www.googleapis.com/auth/assistant-sdk-prototype'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  async getTokenFromCode(code: string): Promise<void> {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    
    await fs.writeFile(this.tokenPath, JSON.stringify(tokens, null, 2));
  }

  getClient(): OAuth2Client {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    return this.oauth2Client;
  }

  isAuthenticated(): boolean {
    return !!(this.oauth2Client && this.oauth2Client.credentials.access_token);
  }
}