import { Routes, Route } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { Home } from "./pages/Home";
import { Pricing } from "./pages/Pricing";
import { Privacy } from "./pages/Privacy";
import { Terms } from "./pages/Terms";
import { Signup } from "./pages/Signup";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <SiteHeader />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
