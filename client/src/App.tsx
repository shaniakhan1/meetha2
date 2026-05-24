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
import { useAuth } from "./_core/hooks/useAuth";

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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/onboarding">
        {() => <ProtectedRoute component={Onboarding} />}
      </Route>
      <Route path="/generate">
        {() => <ProtectedRoute component={Generate} />}
      </Route>
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} />}
      </Route>
      <Route path="/sign-in" component={SignIn} />
      <Route path="/auth/callback" component={AuthCallback} />
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
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
