import { useAuth } from '../../context/AuthContext';

export default function Header({ onToggleSidebar }) {
  const { isAuthenticated, account, loading, error, login, logout } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 fixed top-0 left-0 right-0 z-30">
      <button
        onClick={onToggleSidebar}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 mr-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-800">O&M ディスパッチ</h1>
      </div>

      {/* MS365 connection status indicator */}
      <div className="ml-auto flex items-center">
        {loading ? (
          <span className="text-xs text-gray-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            接続中...
          </span>
        ) : error ? (
          <span className="text-xs text-red-500 max-w-[200px] truncate" title={error}>
            {error}
          </span>
        ) : isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-xs text-gray-600 hidden sm:inline max-w-[150px] truncate">
              {account?.name || account?.username}
            </span>
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ログアウト
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
            MS365 連携
          </button>
        )}
      </div>
    </header>
  );
}
