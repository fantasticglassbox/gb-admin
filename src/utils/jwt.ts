// JWT utility functions
export interface JWTPayload {
  id: string;
  tid: string;
  role: string;
  exp: number;
  device_id?: string;
}

/**
 * Decode JWT token payload without verification
 * Note: This is for client-side extraction only, server still validates the token
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode base64
    const decodedPayload = atob(paddedPayload);
    
    // Parse JSON
    const parsedPayload = JSON.parse(decodedPayload);
    
    return parsedPayload as JWTPayload;
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    return null;
  }
};

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Get tid (tenant/parent ID) from JWT token
 */
export const getTidFromToken = (token: string): string | null => {
  const payload = decodeJWT(token);
  return payload?.tid || null;
};

/**
 * Get role from JWT token
 */
export const getRoleFromToken = (token: string): string | null => {
  const payload = decodeJWT(token);
  return payload?.role || null;
};
