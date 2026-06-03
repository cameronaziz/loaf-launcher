import {
  AuthProvider,
  AuthProviderAbstract,
} from '@gitroom/backend/services/auth/providers.interface';

@AuthProvider({ provider: 'ZOHO' })
export class ZohoProvider extends AuthProviderAbstract {
  generateLink(): string {
    return (
      `https://accounts.zoho.com/oauth/v2/auth` +
      `?client_id=${process.env.ZOHO_CLIENT_ID}` +
      `&response_type=code` +
      `&scope=openid+profile+email` +
      `&redirect_uri=${encodeURIComponent(`${process.env.FRONTEND_URL}/settings`)}` +
      `&access_type=online`
    );
  }

  async getToken(code: string, _redirectUri?: string): Promise<string> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      redirect_uri: `${process.env.FRONTEND_URL}/settings`,
      code,
    });

    const { access_token } = await (
      await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    ).json();

    return access_token;
  }

  async getUser(access_token: string): Promise<{ email: string; id: string }> {
    const data = await (
      await fetch('https://accounts.zoho.com/oauth/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })
    ).json();

    return {
      email: data.email,
      id: String(data.sub),
    };
  }
}
