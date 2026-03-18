/**
 * Generates invite links that work correctly in all environments:
 * - localhost when running locally
 * - actual domain when hosted on Vercel or any other host
 */
export function getInviteLink(inviteCode: string): string {
  if (typeof window === 'undefined') {
    // Server side — use NEXTAUTH_URL env or fallback
    const base = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';
    return `${base}/join/${inviteCode}`;
  }

  // Client side — always use the actual current origin
  // This automatically gives localhost:3000 locally
  // and https://yourapp.vercel.app in production
  return `${window.location.origin}/join/${inviteCode}`;
}