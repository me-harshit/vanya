import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Features } from "./pages/Features";
import { Help } from "./pages/Help";
import { Home } from "./pages/Home";
import { HowItWorks } from "./pages/HowItWorks";
import { Privacy, Refunds, Terms } from "./pages/Legal";
import { NotFound } from "./pages/NotFound";
import { Offers } from "./pages/Offers";
import { Operators } from "./pages/Operators";
import { RouteDetail, RoutesPage } from "./pages/Routes";

// Scroll to top on page change, or to the #section when a hash is present.
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/routes/:slug" element={<RouteDetail />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/operators" element={<Operators />} />
          <Route path="/about" element={<About />} />
          <Route path="/help" element={<Help />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  );
}
