const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const getAppUrl = () => {
  const configuredUrl = String(import.meta.env.VITE_APP_URL || "").trim();

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return trimTrailingSlash(window.location.origin);
};
