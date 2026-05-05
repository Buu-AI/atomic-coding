export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getServerPrivyAppId(): string {
  return getRequiredEnv("PRIVY_APP_ID");
}

export function getServerPrivyAppSecret(): string {
  return getRequiredEnv("PRIVY_APP_SECRET");
}
