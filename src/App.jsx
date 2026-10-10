import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
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
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    } else if (authError.type === 'startup_error' || authError.type === 'account_error') {
      return (
        <div className="fixed inset-0 flex items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Project Hub could not start</h1>
            <p className="mt-2 text-sm text-slate-600">{authError.message}</p>
          </div>
        </div>
      );
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