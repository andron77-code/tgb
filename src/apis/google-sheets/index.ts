import { logger } from "../../helpers";
import crypto from 'crypto'

export type GoogleServiceAccountJsonObjectKey = {
    type: string;
    project_id: string;
    private_key_id: string;
    private_key: string;
    client_email: string;
    client_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_x509_cert_url: string;
    universe_domain: string;
};

interface ITableSheetManager {
    getListData: (listName: string) => Promise<any[][]>;
    setListData: (listName: string, data: any[][], range?: string) => Promise<unknown>;
}

export default class GoogleSheetsClient {
    private googleServiceAccountJsonObjectKey: GoogleServiceAccountJsonObjectKey;
    private cachedAccessToken: string | null = null;
    private tokenExpiresAt: number = 0;

    private sheetsApiUri: string = `https://sheets.googleapis.com/v4/spreadsheets`;

    private sheetsData: Record<string, unknown> = {};

    constructor(
        googleServiceAccountJsonObjectKey: GoogleServiceAccountJsonObjectKey,
    ) {
        this.googleServiceAccountJsonObjectKey = googleServiceAccountJsonObjectKey;
    }

    private generateGoogleApiJWT(): string {

        const { client_email: clientEmail = '', private_key: privateKey, private_key_id: kid } = this.googleServiceAccountJsonObjectKey;
        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid,
        };

        const now = Math.floor(Date.now() / 1000);

        const payload = {
            iss: clientEmail,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: now + (3600),
        };

        const encodedHeader = globalThis.btoa(JSON.stringify(header));
        const encodedPayload = globalThis.btoa(JSON.stringify(payload));
        const unsignedToken = `${encodedHeader}.${encodedPayload}`;

        let sign;

        try {
            sign = crypto.createSign('RSA-SHA256');
            sign.update(unsignedToken);
            sign.end();
        } catch (error) {
            logger.error('Error in signing token', error);
            throw error;
        }

        const signature = sign.sign(privateKey, 'base64');
        return `${unsignedToken}.${signature}`;
    }

    private async getAccessToken(): Promise<string> {
        // Check if cached token is still valid (with 5 minute buffer)
        const now = Math.floor(Date.now() / 1000);
        if (this.cachedAccessToken && this.tokenExpiresAt > now + 300) {
            // logger.log('Using cached google api access token');
            return this.cachedAccessToken;
        }

        logger.log('Getting google api access token');
        const jwt = this.generateGoogleApiJWT();
        const params = new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        });

        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        const data = (await res.json()) as { access_token?: string; expires_in?: number };
        if (!res.ok) throw new Error(JSON.stringify(data));
        if (!data.access_token) throw new Error('No access_token in response');

        // Cache the token with expiration time
        this.cachedAccessToken = data.access_token;
        this.tokenExpiresAt = now + (data.expires_in || 3600);

        return data.access_token;
    }

    private async query(method: 'GET' | 'POST' | 'PUT', apiUrl: string, body?: unknown): Promise<unknown> {
        const accessToken = await this.getAccessToken();

        try {
            const fetchOptions: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            };
            if (method !== 'GET' && body !== undefined) {
                fetchOptions.body = JSON.stringify(body);
            }
            const response = await fetch(apiUrl, fetchOptions);
            return response.json();
        } catch (error) {
            throw error;
        }
    }

    public createTableSheetManager<T>(spreadSheetId: string): ITableSheetManager {

        this.query('GET', `${this.sheetsApiUri}/${spreadSheetId}`)
            .then(res => {
                this.sheetsData[spreadSheetId] = res;
                console.log('result data sheets: ', JSON.stringify(res, null, 4));
            })


        return {
            getListData: async (listName: string): Promise<any[][]> => {

                if (!spreadSheetId) throw new Error('No spreadSheetId provided');

                const urlGet = `${this.sheetsApiUri}/${spreadSheetId}/values/${listName}`;
                return this.query('GET', urlGet) as any;
            },
            setListData: async (listName: string, data: any[][], range?: string): Promise<unknown> => {

                if (!spreadSheetId) throw new Error('No spreadSheetId provided');

                const fullRange = range ? `${listName}!${range}` : listName;
                const urlPut = `${this.sheetsApiUri}/${spreadSheetId}/values/${fullRange}?valueInputOption=RAW`;

                return this.query('PUT', urlPut, { values: data });
            }
        }
    }
}
