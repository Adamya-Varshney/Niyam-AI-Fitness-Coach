import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "./pages/NotFound.tsx";
import Onboard from "./routes/Onboard.tsx";
import Chat from "./routes/Chat.tsx";
import Dashboard from "./routes/Dashboard.tsx";
import Profile from "./routes/Profile.tsx";
import ProfileSetup from "./routes/ProfileSetup.tsx";
import Auth from "./routes/Auth.tsx";
import ResetPassword from "./routes/ResetPassword.tsx";
import { UserProvider, useUser } from "./lib/user-context";
import { AppNav } from "./components/AppNav";
import { SectionPager } from "./components/SectionPager";
import { RequireAuth } from "./components/RequireAuth";
import { useOnboardingStatus } from "./lib/use-onboarding-status";

const queryClient = new QueryClient();

function RootRedirect() {
  const { userId, loading } = useUser();
  const onboarding = useOnboardingStatus();
  if (loading) return null;
  if (!userId) return <Navigate to="/auth" replace />;
  if (onboarding === "loading") return null;
  return <Navigate to={onboarding === "complete" ? "/chat" : "/onboard"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UserProvider>
        <BrowserRouter>
          <AppNav />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboard" element={<RequireAuth><Onboard /></RequireAuth>} />
            <Route path="/chat" element={<RequireAuth requireOnboarded><Chat /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth requireOnboarded><Dashboard /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth requireOnboarded><Profile /></RequireAuth>} />
            <Route path="/profile/setup" element={<RequireAuth><ProfileSetup /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
