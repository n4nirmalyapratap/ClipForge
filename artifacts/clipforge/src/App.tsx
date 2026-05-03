import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/main-layout";

import Dashboard from "@/pages/dashboard";
import JobsList from "@/pages/jobs/index";
import NewJob from "@/pages/jobs/new";
import JobDetail from "@/pages/jobs/[id]";
import ClipsList from "@/pages/clips/index";
import AccountsList from "@/pages/accounts/index";
import Settings from "@/pages/settings/index";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/jobs" component={JobsList} />
      <Route path="/jobs/new" component={NewJob} />
      <Route path="/jobs/:id" component={JobDetail} />
      <Route path="/clips" component={ClipsList} />
      <Route path="/accounts" component={AccountsList} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <MainLayout>
            <Router />
          </MainLayout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
