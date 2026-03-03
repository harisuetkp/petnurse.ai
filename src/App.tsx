import { lazy, Suspense, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ScrollToTop } from "./components/ScrollToTop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { ActivePetProvider } from "./contexts/ActivePetContext";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { LanguagePicker } from "./components/LanguagePicker";
import { Loader2 } from "lucide-react";

// Lazy load pages
const HomePage = lazy(() => import("./pages/HomePage"));
const TriagePage = lazy(() => import("./pages/TriagePage"));
const TimelinePage = lazy(() => import("./pages/TimelinePage"));
const CarePage = lazy(() => import("./pages/CarePage"));
const PetsPage = lazy(() => import("./pages/PetsPage"));
const ClinicFinderPage = lazy(() => import("./pages/ClinicFinderPage"));
const PremiumPage = lazy(() => import("./pages/PremiumPage"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccessPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const InfluencerPage = lazy(() => import("./pages/InfluencerPage"));
const CustomerStoriesPage = lazy(() => import("./pages/CustomerStoriesPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const SymptomsIndexPage = lazy(() => import("./pages/SymptomsIndexPage"));
const SymptomPage = lazy(() => import("./pages/SymptomPage"));
const ToxinsIndexPage = lazy(() => import("./pages/ToxinsIndexPage"));
const ToxinPage = lazy(() => import("./pages/ToxinPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const DebugPage = lazy(() => import("./pages/DebugPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000,
      gcTime: 300000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function AppRoutes() {
  const { hasSelectedLanguage, setLanguage } = useLanguage();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => { });
      SplashScreen.hide().catch(() => { });
      CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public SEO routes — no language gate */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
          <Route path="/symptoms" element={<SymptomsIndexPage />} />
          <Route path="/symptoms/:slug" element={<SymptomPage />} />
          <Route path="/toxins" element={<ToxinsIndexPage />} />
          <Route path="/toxins/:slug" element={<ToxinPage />} />

          {/* All other routes require language selection */}
          <Route
            path="*"
            element={
              !hasSelectedLanguage ? (
                <LanguagePicker onSelect={setLanguage} />
              ) : (
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/timeline" element={<TimelinePage />} />
                    <Route path="/triage" element={<TriagePage />} />
                    <Route path="/care" element={<CarePage />} />
                    <Route path="/pets" element={<PetsPage />} />
                    <Route path="/clinic-finder" element={<ClinicFinderPage />} />
                    <Route path="/premium" element={<PremiumPage />} />
                    <Route path="/payment-success" element={<PaymentSuccessPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms-of-service" element={<TermsOfServicePage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/influencer" element={<InfluencerPage />} />
                    <Route path="/reviews" element={<CustomerStoriesPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/debug" element={<DebugPage />} />
                  </Route>
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              )
            }
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ActivePetProvider>
          <TooltipProvider delayDuration={300} skipDelayDuration={100}>
            <UpdatePrompt />
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </ActivePetProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
