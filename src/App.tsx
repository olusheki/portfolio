import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const SEO = () => (
  <Helmet>
    <title>Daniel Olusheki | Portfolio</title>
    <meta name="description" content="Portfolio of Daniel Olusheki, Computer Science and Biology student at Brandeis University. Featuring the Charles River Museum project and bioinformatic research." />
    <meta name="keywords" content="Daniel Olusheki, Brandeis, CS, Biology, Portfolio, Software Engineering" />
    <link rel="canonical" href="https://danielasc22.github.io/portfolio/" />
    <script type="application/ld+json">
      {`
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Daniel Olusheki",
          "url": "https://danielasc22.github.io/portfolio/"
        }
      `}
    </script>
  </Helmet>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    {/* 3. Wrapped everything in HelmetProvider and added <SEO /> */}
    <HelmetProvider>
      <SEO />
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/portfolio/">
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;