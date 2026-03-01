import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ProtectedRoute } from '@/components/protected-route';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { LoginPage } from '@/pages/login';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { ContactsPage } from '@/pages/contacts/contacts-page';
import { PipelinePage } from '@/pages/pipeline/pipeline-page';
import { TeamPage } from '@/pages/team/team-page';
import { AcceptInvitePage } from '@/pages/team/accept-invite-page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/accept-invite/:token"
              element={<AcceptInvitePage />}
            />
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/pipeline" element={<PipelinePage />} />
                <Route path="/team" element={<TeamPage />} />
                <Route
                  path="*"
                  element={<Navigate to="/dashboard" replace />}
                />
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
