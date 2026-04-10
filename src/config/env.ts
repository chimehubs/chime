type RequiredEnv = {
  VITE_API_URL: string;
  VITE_APP_NAME: string;
  VITE_FEATURE_FLAGS?: string;
  VITE_LOG_LEVEL?: string;
  VITE_IS_PRODUCTION?: boolean;
  VITE_SITE_URL?: string;
};

const DEFAULT_SITE_URL = 'https://chimehub.netlify.app';

function getEnv(): RequiredEnv {
  // Vite exposes env via import.meta.env
  const env = (import.meta as any).env;
  const resolvedSiteUrl =
    env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : DEFAULT_SITE_URL);

  const fallbackApiUrl = `${resolvedSiteUrl}/api`;

  const vars: RequiredEnv = {
    VITE_API_URL: env.VITE_API_URL || fallbackApiUrl,
    VITE_APP_NAME: env.VITE_APP_NAME || 'chimahub',
    VITE_FEATURE_FLAGS: env.VITE_FEATURE_FLAGS,
    VITE_LOG_LEVEL: env.VITE_LOG_LEVEL || 'warn',
    VITE_IS_PRODUCTION: env.VITE_IS_PRODUCTION || env.MODE === 'production',
    VITE_SITE_URL: env.VITE_SITE_URL || DEFAULT_SITE_URL,
  };

  if (!vars.VITE_API_URL) {
    throw new Error('Missing required env variable: VITE_API_URL');
  }

  return vars;
}

export const ENV = getEnv();

// Disable console in production to prevent logging sensitive data
if (ENV.VITE_IS_PRODUCTION && ENV.VITE_LOG_LEVEL === 'error') {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
}

export default ENV;
