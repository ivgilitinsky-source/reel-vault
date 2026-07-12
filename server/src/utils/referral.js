import crypto from 'crypto';

export function generateReferralCode() {
  return crypto.randomBytes(5).toString('hex');
}
