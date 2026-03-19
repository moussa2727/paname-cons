export interface TokenPayload {
  sub: string; // User ID (subject)
  email: string; // User email
  role: string; // User role
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

export interface AccessTokenPayload extends TokenPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
  type: 'refresh';
}
