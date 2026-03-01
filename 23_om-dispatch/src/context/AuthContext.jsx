/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { MsalProvider } from '@azure/msal-react';
import {
  createMsalInstance,
  login as msalLogin,
  logout as msalLogout,
  getAccessToken,
  loadAzureConfig,
  DEFAULT_SCOPES,
} from '../services/msalService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [account, setAccount] = useState(null);
  const [msalInstance, setMsalInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const initRef = useRef(false);

  // Initialize MSAL on mount
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      const { clientId, tenantId } = loadAzureConfig();

      if (!clientId || !tenantId) {
        setLoading(false);
        return;
      }

      try {
        const instance = createMsalInstance(clientId, tenantId);
        await instance.initialize();

        // Check for existing accounts (already logged in)
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          instance.setActiveAccount(accounts[0]);
          setAccount(accounts[0]);
          setIsAuthenticated(true);
        }

        setMsalInstance(instance);
      } catch (err) {
        console.error('MSAL initialization failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // Login
  const login = useCallback(async () => {
    const { clientId, tenantId } = loadAzureConfig();

    if (!clientId || !tenantId) {
      setError('Azure AD Client ID and Tenant ID must be configured in Settings.');
      return;
    }

    setError(null);

    try {
      let instance = msalInstance;

      // Create instance if not yet initialized (config was just saved)
      if (!instance) {
        instance = createMsalInstance(clientId, tenantId);
        await instance.initialize();
        setMsalInstance(instance);
      }

      const acct = await msalLogin(instance);
      instance.setActiveAccount(acct);
      setAccount(acct);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.message);
    }
  }, [msalInstance]);

  // Logout
  const logout = useCallback(async () => {
    if (!msalInstance) return;

    try {
      await msalLogout(msalInstance, account);
      setAccount(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError(err.message);
    }
  }, [msalInstance, account]);

  // Get access token for Graph API
  const getToken = useCallback(async () => {
    if (!msalInstance || !account) {
      throw new Error('Not authenticated');
    }
    return getAccessToken(msalInstance, account, DEFAULT_SCOPES);
  }, [msalInstance, account]);

  const value = {
    isAuthenticated,
    account,
    msalInstance,
    loading,
    error,
    login,
    logout,
    getToken,
  };

  // Wrap children with MsalProvider when instance is available
  const content = (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

  if (msalInstance) {
    return (
      <MsalProvider instance={msalInstance}>
        {content}
      </MsalProvider>
    );
  }

  return content;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
