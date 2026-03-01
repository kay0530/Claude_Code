import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { CalendarProvider } from './context/CalendarContext';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import DashboardView from './components/dashboard/DashboardView';
import MemberListView from './components/members/MemberListView';
import JobListView from './components/jobs/JobListView';
import JobCreateForm from './components/jobs/JobCreateForm';
import CalendarView from './components/calendar/CalendarView';
import DispatchView from './components/dispatch/DispatchView';
import FeedbackHistory from './components/feedback/FeedbackHistory';
import SettingsView from './components/settings/SettingsView';

// Placeholder for views not yet implemented
function PlaceholderView({ title }) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-700">{title}</h2>
        <p className="text-gray-500 mt-1">このページは実装中です</p>
      </div>
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [, setViewParams] = useState({});

  function navigate(view, params = {}) {
    setActiveView(view);
    setViewParams(params);
  }

  function renderView() {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onNavigate={navigate} />;
      case 'jobs':
        return <JobListView onNavigate={navigate} />;
      case 'job-create':
        return <JobCreateForm onNavigate={navigate} />;
      case 'dispatch':
        return <DispatchView onNavigate={navigate} />;
      case 'calendar':
        return <CalendarView onNavigate={navigate} />;
      case 'members':
        return <MemberListView />;
      case 'feedback':
        return <FeedbackHistory onNavigate={navigate} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <PlaceholderView title="ダッシュボード" />;
    }
  }

  return (
    <AppProvider>
      <AuthProvider>
        <CalendarProvider>
          <MainLayout activeView={activeView} onNavigate={navigate}>
            {renderView()}
          </MainLayout>
        </CalendarProvider>
      </AuthProvider>
    </AppProvider>
  );
}
