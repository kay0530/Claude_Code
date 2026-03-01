import { PublicClientApplication } from '@azure/msal-browser';

/** Default scopes for Microsoft Graph calendar access */
export const DEFAULT_SCOPES = ['Calendars.ReadWrite', 'Calendars.ReadWrite.Shared', 'User.Read'];

/** localStorage keys for Azure AD config */
export const STORAGE_KEYS = {
  clientId: 'om-dispatch-azure-client-id',
  tenantId: 'om-dispatch-azure-tenant-id',
};

/**
 * Create an MSAL PublicClientApplication instance.
 * @param {string} clientId - Azure AD application (client) ID
 * @param {string} tenantId - Azure AD tenant (directory) ID
 * @param {string} [redirectUri] - Redirect URI (defaults to current page origin + pathname)
 * @returns {PublicClientApplication}
 */
export function createMsalInstance(clientId, tenantId, redirectUri) {
  const config = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      redirectUri: redirectUri || window.location.origin + window.location.pathname,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: false,
    },
  };

  return new PublicClientApplication(config);
}

/**
 * Login via popup and return the account.
 * @param {PublicClientApplication} msalInstance
 * @param {string[]} [scopes] - Scopes to request
 * @returns {Promise<import('@azure/msal-browser').AccountInfo>}
 */
export async function login(msalInstance, scopes = DEFAULT_SCOPES) {
  const response = await msalInstance.loginPopup({
    scopes,
    prompt: 'select_account',
  });
  return response.account;
}

/**
 * Logout via popup.
 * @param {PublicClientApplication} msalInstance
 * @param {import('@azure/msal-browser').AccountInfo} [account]
 * @returns {Promise<void>}
 */
export async function logout(msalInstance, account) {
  await msalInstance.logoutPopup({
    account: account || msalInstance.getActiveAccount(),
  });
}

/**
 * Silently acquire an access token, falling back to popup if needed.
 * @param {PublicClientApplication} msalInstance
 * @param {import('@azure/msal-browser').AccountInfo} account
 * @param {string[]} [scopes] - Scopes to request
 * @returns {Promise<string>} Access token
 */
export async function getAccessToken(msalInstance, account, scopes = DEFAULT_SCOPES) {
  try {
    const response = await msalInstance.acquireTokenSilent({ scopes, account });
    return response.accessToken;
  } catch {
    // Silent acquisition failed — fall back to popup
    const response = await msalInstance.acquireTokenPopup({ scopes, account });
    return response.accessToken;
  }
}

/**
 * Read Azure AD config from localStorage.
 * @returns {{ clientId: string|null, tenantId: string|null }}
 */
export function loadAzureConfig() {
  return {
    clientId: localStorage.getItem(STORAGE_KEYS.clientId),
    tenantId: localStorage.getItem(STORAGE_KEYS.tenantId),
  };
}

/**
 * Save Azure AD config to localStorage.
 * @param {string} clientId
 * @param {string} tenantId
 */
export function saveAzureConfig(clientId, tenantId) {
  localStorage.setItem(STORAGE_KEYS.clientId, clientId);
  localStorage.setItem(STORAGE_KEYS.tenantId, tenantId);
}
