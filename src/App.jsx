import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AuthStatusScreen from '@/components/AuthStatusScreen';
import { isCognitoMode, resetLoginAttempts } from '@/lib/cognitoSession';
import DecisionLog from './pages/DecisionLog';
import ResourceTaskPulse from './pages/ResourceTaskPulse';
import AssumptionLog from './pages/AssumptionLog';
import ResourceCalendarPage from './pages/ResourceCalendarPage';
import ProjectResources from './pages/ProjectResources';
import AppSettings from './pages/AppSettings';
import ChangeRegister from './pages/ChangeRegister';
import ChangeRegisterHub from './pages/ChangeRegisterHub';
import AIAssistant from './pages/AIAssistant';
import LearnSupport from './pages/LearnSupport';
import Financials from './pages/Financials';
import SprintManagement from './pages/SprintManagement';
import Testing from './pages/Testing';
import Requirements from './pages/Requirements';
import ResourceManagementHub from './pages/ResourceManagementHub';
import Account from './pages/Account';
import Favorites from './pages/Favorites';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const ProjectsPage = Pages.Projects;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, postLoginPath, checkAppState, logout } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    const signInAgain = () => { resetLoginAttempts(); navigateToLogin('/'); };
    const signOut = () => { logout(); };
    switch (authError.type) {
      case 'auth_required':
        // Redirect to the sign-in page
        navigateToLogin();
        return (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        );
      case 'user_not_registered':
        return <UserNotRegisteredError onSignOut={signOut} />;
      case 'login_error':
        return <AuthStatusScreen title="Sign-in didn't complete" message={authError.message}
          actions={[{ label: 'Sign in again', onClick: signInAgain, primary: true }]} />;
      case 'service_unavailable':
        return <AuthStatusScreen title={authError.title || 'Sign-in is temporarily unavailable'} message={authError.message}
          actions={[{ label: 'Try again', onClick: checkAppState, primary: true }]} />;
      case 'network_error':
        return <AuthStatusScreen title="Can't reach Project Hub" message={authError.message}
          actions={[{ label: 'Try again', onClick: checkAppState, primary: true }]} />;
      case 'user_disabled':
        return <AuthStatusScreen title="Your access is disabled" message={authError.message}
          actions={[{ label: 'Sign out', onClick: signOut, primary: true }]} />;
      case 'account_conflict':
        return <AuthStatusScreen title="We couldn't link your sign-in" message={authError.message}
          actions={[{ label: 'Sign out', onClick: signOut, primary: true }]} />;
      case 'startup_error':
      case 'account_error':
      default:
        return <AuthStatusScreen title="Project Hub could not start" message={authError.message}
          actions={[{ label: 'Try again', onClick: checkAppState, primary: true }, ...(isCognitoMode() ? [{ label: 'Sign out', onClick: signOut }] : [])]} />;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      {ProjectsPage && (
        <Route path="/portfolios/:portfolioId" element={<LayoutWrapper currentPageName="Projects"><ProjectsPage /></LayoutWrapper>} />
      )}
      {ProjectsPage && (
        <Route path="/programs/:programId" element={<LayoutWrapper currentPageName="Projects"><ProjectsPage /></LayoutWrapper>} />
      )}
      {ProjectsPage && (
        <Route path="/projects/:projectId" element={<LayoutWrapper currentPageName="Projects"><ProjectsPage /></LayoutWrapper>} />
      )}
      {ProjectsPage && (
        <Route path="/projects/:projectId/:projectTab" element={<LayoutWrapper currentPageName="Projects"><ProjectsPage /></LayoutWrapper>} />
      )}
      <Route path="/DecisionLog" element={<LayoutWrapper currentPageName="DecisionLog"><DecisionLog /></LayoutWrapper>} />
      <Route path="/AssumptionLog" element={<LayoutWrapper currentPageName="AssumptionLog"><AssumptionLog /></LayoutWrapper>} />
      <Route path="/ResourceTaskPulse" element={<LayoutWrapper currentPageName="ResourceTaskPulse"><ResourceTaskPulse /></LayoutWrapper>} />
      <Route path="/ResourceCalendarPage" element={<LayoutWrapper currentPageName="ResourceCalendarPage"><ResourceCalendarPage /></LayoutWrapper>} />
      <Route path="/ProjectResources" element={<LayoutWrapper currentPageName="ProjectResources"><ProjectResources /></LayoutWrapper>} />
      <Route path="/AppSettings" element={<LayoutWrapper currentPageName="AppSettings"><AppSettings /></LayoutWrapper>} />
      <Route path="/ChangeRegister" element={<LayoutWrapper currentPageName="ChangeRegister"><ChangeRegister /></LayoutWrapper>} />
      <Route path="/ChangeRegisterHub" element={<LayoutWrapper currentPageName="ChangeRegisterHub"><ChangeRegisterHub /></LayoutWrapper>} />
      <Route path="/AIAssistant" element={<LayoutWrapper currentPageName="AIAssistant"><AIAssistant /></LayoutWrapper>} />
      <Route path="/LearnSupport" element={<LayoutWrapper currentPageName="LearnSupport"><LearnSupport /></LayoutWrapper>} />
      <Route path="/Financials" element={<LayoutWrapper currentPageName="Financials"><Financials /></LayoutWrapper>} />
      <Route path="/SprintManagement" element={<LayoutWrapper currentPageName="SprintManagement"><SprintManagement /></LayoutWrapper>} />
      <Route path="/Testing" element={<LayoutWrapper currentPageName="Testing"><Testing /></LayoutWrapper>} />
      <Route path="/Requirements" element={<LayoutWrapper currentPageName="Requirements"><Requirements /></LayoutWrapper>} />
      <Route path="/Favorites" element={<LayoutWrapper currentPageName="Favorites"><Favorites /></LayoutWrapper>} />
      <Route path="/ResourceManagementHub" element={<LayoutWrapper currentPageName="ResourceManagementHub"><ResourceManagementHub /></LayoutWrapper>} />
      <Route path="/Account" element={<LayoutWrapper currentPageName="Account"><Account /></LayoutWrapper>} />
      <Route path="/auth/callback" element={<Navigate to={postLoginPath || '/'} replace />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App