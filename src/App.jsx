import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { ConfirmDialogHost } from "@/components/ui/confirm-dialog"
import GlobalLoader from '@/components/GlobalLoader';
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
import Home from './pages/Home';
import BillingBanner from '@/components/BillingBanner';
import ScopeBar from '@/components/ScopeBar';
import TimezoneSync from '@/components/TimezoneSync';

// Home is the landing page and ships with the app; every other page downloads the first time it's opened.
const DecisionLog = lazy(() => import('./pages/DecisionLog'));
const ResourceTaskPulse = lazy(() => import('./pages/ResourceTaskPulse'));
const AssumptionLog = lazy(() => import('./pages/AssumptionLog'));
const ResourceCalendarPage = lazy(() => import('./pages/ResourceCalendarPage'));
const ProjectResources = lazy(() => import('./pages/ProjectResources'));
const AppSettings = lazy(() => import('./pages/AppSettings'));
const ChangeRegister = lazy(() => import('./pages/ChangeRegister'));
const ChangeRegisterHub = lazy(() => import('./pages/ChangeRegisterHub'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const LearnSupport = lazy(() => import('./pages/LearnSupport'));
const Financials = lazy(() => import('./pages/Financials'));
const SprintManagement = lazy(() => import('./pages/SprintManagement'));
const Testing = lazy(() => import('./pages/Testing'));
const Requirements = lazy(() => import('./pages/Requirements'));
const ResourceManagementHub = lazy(() => import('./pages/ResourceManagementHub'));
const Account = lazy(() => import('./pages/Account'));
const PlatformAdmin = lazy(() => import('./pages/PlatformAdmin'));

const { Pages, Layout } = pagesConfig;
const ProjectsPage = Pages.Projects;

const PageLoading = () => (
  <div className="h-full min-h-[50vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

// The billing bar and, on module pages, the global scope bar sit above the page, which gets the rest of the screen.
// Pages built as full-screen (h-screen / min-h-screen) are sized to that remaining space, so nothing hides under the bars.
const LayoutWrapper = ({ children, currentPageName }) => (
  <div className="h-screen flex flex-col">
    <BillingBanner />
    <ScopeBar />
    <TimezoneSync />
    <div className="flex-1 min-h-0 overflow-auto [&>.h-screen]:h-full [&>.min-h-screen]:min-h-full">
      <Suspense fallback={<PageLoading />}>
        {Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : children}
      </Suspense>
    </div>
  </div>
);

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, postLoginPath, checkAppState, logout } = useAuth();

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

  // Platform admins only ever see the admin portal, never an account's workspace.
  // Local mode is exempt: its single dev user is both platform admin and account owner.
  if (user?.is_platform_admin && isCognitoMode()) {
    return (
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/admin" element={<PlatformAdmin />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Render the main app
  return (
    <Routes>
      {/* Home is the person's own workspace; the portfolio/program/project directory stays at /Projects. */}
      <Route path="/" element={<LayoutWrapper currentPageName="Home"><Home /></LayoutWrapper>} />
      {/* My Work was folded into Home; old links land there. */}
      <Route path="/MyWork" element={<Navigate to="/" replace />} />
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
      {/* Favorites live on the home page; old links land there. */}
      <Route path="/Favorites" element={<Navigate to="/" replace />} />
      <Route path="/ResourceManagementHub" element={<LayoutWrapper currentPageName="ResourceManagementHub"><ResourceManagementHub /></LayoutWrapper>} />
      <Route path="/Account" element={<LayoutWrapper currentPageName="Account"><Account /></LayoutWrapper>} />
      <Route path="/admin" element={<Suspense fallback={<PageLoading />}><PlatformAdmin /></Suspense>} />
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
        <ConfirmDialogHost />
        <GlobalLoader />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App