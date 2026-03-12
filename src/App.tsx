import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import CheckPill from "./pages/CheckPill";
import Results from "./pages/Results";
import History from "./pages/History";
import Education from "./pages/Education";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import NearbyHelpMap from "./pages/NearbyHelpMap";
import Contribute from "./pages/Contribute";
import ApiDocs from "./pages/ApiDocs";
import Trends from "./pages/Trends";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/check" element={<CheckPill />} />
            <Route path="/results/:reportId" element={<Results />} />
            <Route path="/history" element={<History />} />
            <Route path="/education" element={<Education />} />
            <Route path="/education/:slug" element={<Education />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/nearby-help" element={<NearbyHelpMap />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
