import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { LecturerDashboard } from './pages/LecturerDashboard.js';
import { StudentDashboard } from './pages/StudentDashboard.js';
import { KaprodiDashboard } from './pages/KaprodiDashboard.js';
import { AdminMasterData } from './pages/AdminMasterData.js';
import { StorageSyncPage } from './pages/StorageSyncPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { EvaluationsPage } from './pages/EvaluationsPage.js';
import { AuditLogsPage } from './pages/AuditLogsPage.js';
import { SessionDetailPage } from './pages/SessionDetailPage.js';
import { RefreshCw } from 'lucide-react';

function MainApp() {
  const { user, activeRole, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<string>('default');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Set default page when activeRole changes
  useEffect(() => {
    if (activeRole === 'MAHASISWA') {
      setCurrentPage('student-dashboard');
    } else if (activeRole === 'DOSEN') {
      setCurrentPage('lecturer-dashboard');
    } else if (activeRole === 'KAPRODI') {
      setCurrentPage('kaprodi-dashboard');
    } else if (activeRole === 'ADMINISTRATOR') {
      setCurrentPage('admin-master');
    }
  }, [activeRole]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <span className="text-sm font-semibold tracking-wide">Memuat Portal SIAP-KULIAH...</span>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderContent = () => {
    if (currentPage === 'session-detail' && selectedSessionId) {
      return (
        <SessionDetailPage
          sessionId={selectedSessionId}
          onBack={() => setCurrentPage(activeRole === 'DOSEN' ? 'lecturer-dashboard' : 'student-dashboard')}
        />
      );
    }

    switch (currentPage) {
      case 'student-dashboard':
      case 'student-history':
        return <StudentDashboard />;
      case 'lecturer-dashboard':
        return (
          <LecturerDashboard
            onSelectSession={(sessId) => {
              setSelectedSessionId(sessId);
              setCurrentPage('session-detail');
            }}
          />
        );
      case 'kaprodi-dashboard':
        return <KaprodiDashboard />;
      case 'admin-master':
        return <AdminMasterData />;
      case 'storage-sync':
        return <StorageSyncPage />;
      case 'lecturer-reports':
        return <ReportsPage />;
      case 'evaluations':
        return <EvaluationsPage />;
      case 'audit-logs':
        return <AuditLogsPage />;
      default:
        if (activeRole === 'MAHASISWA') return <StudentDashboard />;
        if (activeRole === 'DOSEN') return <LecturerDashboard onSelectSession={(id) => { setSelectedSessionId(id); setCurrentPage('session-detail'); }} />;
        if (activeRole === 'KAPRODI') return <KaprodiDashboard />;
        return <AdminMasterData />;
    }
  };

  return (
    <AppLayout activePage={currentPage} onNavigate={(page) => setCurrentPage(page)}>
      {renderContent()}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
