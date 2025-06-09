import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import Dashboard from "@/pages/dashboard";
import Merchants from "@/pages/merchants";
import Agents from "@/pages/agents";
import Transactions from "@/pages/transactions";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import { useState } from "react";

function Router() {
  const [globalSearch, setGlobalSearch] = useState("");

  const getPageInfo = (pathname: string) => {
    switch (pathname) {
      case "/":
        return {
          title: "Dashboard",
          subtitle: "Overview of your payment operations"
        };
      case "/merchants":
        return {
          title: "Merchants",
          subtitle: "Manage merchant profiles and settings"
        };
      case "/agents":
        return {
          title: "Agents",
          subtitle: "Manage agent accounts and permissions"
        };
      case "/transactions":
        return {
          title: "Transactions",
          subtitle: "View and track all payment transactions"
        };
      case "/reports":
        return {
          title: "Reports",
          subtitle: "Generate detailed analytics and reports"
        };
      default:
        return {
          title: "Dashboard",
          subtitle: "Overview of your payment operations"
        };
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Switch>
          <Route path="/">
            {() => {
              const pageInfo = getPageInfo("/");
              return (
                <>
                  <Header 
                    title={pageInfo.title} 
                    subtitle={pageInfo.subtitle}
                    onSearch={setGlobalSearch}
                  />
                  <main className="flex-1 overflow-auto bg-gray-50">
                    <Dashboard />
                  </main>
                </>
              );
            }}
          </Route>
          <Route path="/merchants">
            {() => {
              const pageInfo = getPageInfo("/merchants");
              return (
                <>
                  <Header 
                    title={pageInfo.title} 
                    subtitle={pageInfo.subtitle}
                    onSearch={setGlobalSearch}
                  />
                  <main className="flex-1 overflow-auto bg-gray-50">
                    <Merchants />
                  </main>
                </>
              );
            }}
          </Route>
          <Route path="/agents">
            {() => {
              const pageInfo = getPageInfo("/agents");
              return (
                <>
                  <Header 
                    title={pageInfo.title} 
                    subtitle={pageInfo.subtitle}
                    onSearch={setGlobalSearch}
                  />
                  <main className="flex-1 overflow-auto bg-gray-50">
                    <Agents />
                  </main>
                </>
              );
            }}
          </Route>
          <Route path="/transactions">
            {() => {
              const pageInfo = getPageInfo("/transactions");
              return (
                <>
                  <Header 
                    title={pageInfo.title} 
                    subtitle={pageInfo.subtitle}
                    onSearch={setGlobalSearch}
                  />
                  <main className="flex-1 overflow-auto bg-gray-50">
                    <Transactions />
                  </main>
                </>
              );
            }}
          </Route>
          <Route path="/reports">
            {() => {
              const pageInfo = getPageInfo("/reports");
              return (
                <>
                  <Header 
                    title={pageInfo.title} 
                    subtitle={pageInfo.subtitle}
                    onSearch={setGlobalSearch}
                  />
                  <main className="flex-1 overflow-auto bg-gray-50">
                    <Reports />
                  </main>
                </>
              );
            }}
          </Route>
          <Route>
            <div className="flex-1">
              <NotFound />
            </div>
          </Route>
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50">
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
