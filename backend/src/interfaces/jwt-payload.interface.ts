export interface JwtPayload {
  sub: string; // User ID
  email: string; // User email
  role: string; // User role
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

export interface AccessTokenPayload extends JwtPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
  tokenId?: string; // Refresh token ID in database
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
