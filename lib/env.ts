type RequiredEnvKey = "MONGODB_URI" | "JWT_SECRET" | "JWT_EXPIRES_IN";

const REQUIRED_ENV_KEYS: RequiredEnvKey[] = [
  "MONGODB_URI",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
];

function readEnv() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Please check .env.local before starting the server.",
    );
  }

  return {
    MONGODB_URI: process.env.MONGODB_URI as string,
    JWT_SECRET: process.env.JWT_SECRET as string,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN as string,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME ?? "drawsystem_token",
    BOOTSTRAP_SUPER_KEY: process.env.BOOTSTRAP_SUPER_KEY,
    NODE_ENV: process.env.NODE_ENV ?? "development",
  };
}

export const env = readEnv();
