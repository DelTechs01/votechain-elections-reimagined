import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeProvider";
import Web3Provider from "@/context/Web3Context";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Index from "@/pages/Index";
import Elections from "@/pages/Elections";
import Vote from "@/pages/Vote";
import Admin from "@/pages/Admin";
import KYC from "@/pages/KYC";
import NotFound from "@/pages/NotFound";
import ElectionDetails from "./pages/ElectionDetails";
import { motion, AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <Web3Provider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/elections" element={<Elections />} />
                      <Route path="/elections/:id" element={<ElectionDetails />} />
                      <Route path="/vote" element={<Navigate to="/elections" replace />} /> {/* Redirect /vote to /elections */}
                      <Route path="/vote/:electionId" element={<Vote />} />
                      <Route path="/admin" element={<Admin />} />
                      <Route path="/kyc" element={<KYC />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </motion.div>
                </AnimatePresence>
              </main>
              <Footer />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </Web3Provider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;