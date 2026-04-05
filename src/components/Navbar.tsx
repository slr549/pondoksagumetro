import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, User, LogOut } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";

const navLinks = [
  { to: "/", label: "Beranda" },
  { to: "/menu", label: "Menu" },
  { to: "/about", label: "Tentang Kami" },
  { to: "/contact", label: "Kontak" },
];

export default function Navbar() {
  const { totalItems } = useCart();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-xl font-bold text-foreground">
          Pondok Sagu<span className="text-gradient"> Metro</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"}`}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
              <User className="h-5 w-5" />
            </Link>
          ) : (
            <Link to="/login" className="hidden rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary hover:text-primary-foreground md:block">
              Masuk
            </Link>
          )}

          <Link to="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-primary hover:text-primary-foreground">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground tabular-nums">
                {totalItems}
              </motion.span>
            )}
          </Link>

          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground md:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }} className="overflow-hidden border-t border-border bg-background md:hidden">
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${location.pathname === link.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"}`}>
                  {link.label}
                </Link>
              ))}
              {!user && (
                <Link to="/login" onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary">
                  Masuk / Daftar
                </Link>
              )}
              {user && (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary">
                    Dashboard
                  </Link>
                  <button onClick={() => { signOut(); setMobileOpen(false); }}
                    className="rounded-lg px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-secondary">
                    Keluar
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
