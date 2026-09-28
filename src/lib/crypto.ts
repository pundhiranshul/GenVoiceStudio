import crypto from 'crypto';

const SECRET = process.env.URL_SIGNING_SECRET || 'default-insecure-secret-please-change-in-production';
const ALGORITHM = 'aes-256-gcm';

export function encryptPayload(payload: any): string {
  const key = crypto.createHash('sha256').update(SECRET).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return Buffer.from(`${iv.toString('hex')}.${encrypted}.${authTag}`).toString('base64url');
}

export function decryptPayload(token: string): any {
  const key = crypto.createHash('sha256').update(SECRET).digest();
  const decoded = Buffer.from(token, 'base64url').toString('utf8');
  const [ivHex, encryptedHex, authTagHex] = decoded.split('.');
  
  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error('Invalid token format');
  }
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}
