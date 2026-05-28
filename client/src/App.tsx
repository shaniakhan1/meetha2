import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Onboarding from "./pages/Onboarding";
import Generate from "./pages/Generate";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import Preview from "./pages/Preview";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Templates from "./pages/Templates";
import Admin from "./pages/Admin";
import { useAuth } from "./_core/hooks/useAuth";
import CookieBanner from "./components/CookieBanner";
import { trpc } from "./lib/trpc";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <p className="font-sans text-xs tracking-widest uppercase text-charcoal-soft">
            Loading
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/sign-in" />;
  }

  return <Component />;
}

/** Hard gate: blocks /generate and /templates until lora_status === 'ready'. */
function TrainingGatedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const profileQuery = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return false;
      // Only poll while actively training — lora_status is the single source of truth.
      if (d.lora_status === "training") return 15_000;
      return false;
    },
  });

  if (authLoading || (isAuthenticated && profileQuery.isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/sign-in" />;
  }

  const profile = profileQuery.data;
  // Source of truth: lora_status === 'ready' means the model is trained and generation is unlocked.
  // We do NOT gate on uploaded_photo_count — it's unreliable (can be 0 for users trained before
  // the column existed, or for users whose profile row was created by the upsert fallback).
  const isReady = profile?.lora_status === "ready";
  const isTraining = profile?.lora_status === "training";
  // needsUpload: no profile yet, or profile exists but no training started or failed
  const needsUpload = !profile || (!isReady && !isTraining);

  // No photos yet — send them back to onboarding to upload
  if (needsUpload) {
    return <Redirect to="/onboarding" />;
  }

  // Photos uploaded but not ready — show training wall
  if (isTraining) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-8 text-center">
        <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-gold mb-6">Visual Identity Model</p>
        <h1 className="font-serif text-3xl font-light text-charcoal mb-4 leading-tight">
          Your model is<br />still training.
        </h1>
        <p className="font-sans text-sm font-light text-charcoal-soft leading-relaxed mb-8 max-w-xs">
          Meetha is learning your face, your coloring, and your visual essence. This usually takes 10–20 minutes.
        </p>
        <div className="w-16 h-px bg-gold/40 mb-8" />
        <p className="font-sans text-xs text-charcoal-soft/60 leading-relaxed max-w-xs">
          You will be notified when your Visual Identity is ready to generate.
        </p>
        <div className="mt-10">
          <div className="w-6 h-6 border border-gold/40 border-t-gold rounded-full animate-spin mx-auto" />
        </div>
        <button
          onClick={() => window.history.back()}
          className="mt-12 font-sans text-xs tracking-widest uppercase text-charcoal-soft/50 hover:text-charcoal-soft transition-colors"
        >
          Back
        </button>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding">
        {() => <ProtectedRoute component={Onboarding} />}
      </Route>
      <Route path="/generate">
        {() => <TrainingGatedRoute component={Generate} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/sign-in" component={SignIn} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/preview" component={Preview} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/templates">
        {() => <TrainingGatedRoute component={Templates} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} />}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                fontFamily: "Inter, sans-serif",
                fontSize: "13px",
                letterSpacing: "0.02em",
                background: "oklch(22% 0.010 60)",
                color: "oklch(97% 0.012 80)",
                border: "none",
                borderRadius: "2px",
              },
            }}
          />
          <Router />
          <CookieBanner />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
