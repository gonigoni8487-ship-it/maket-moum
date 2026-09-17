import type { ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import AppShell from "./components/AppShell";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Reservations from "./pages/Reservations";
import Stats from "./pages/Stats";
import AITools from "./pages/AITools";
import SettingsPage from "./pages/SettingsPage";

function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <PageWrapper key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:customerId" element={<CustomerDetail />} />
          <Route path="/reservations" element={<Reservations />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/ai" element={<AITools />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </PageWrapper>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <Router>
      <AppShell>
        <AnimatedRoutes />
      </AppShell>
    </Router>
  );
}
