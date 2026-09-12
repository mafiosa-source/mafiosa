import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Phone, MessageCircle, MapPin, Mail } from "lucide-react";
import brokerLogo from "@/assets/broker-logo.jpg.asset.json";
import { AGENCY_PHONES } from "@/lib/public-cvs";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/broker", label: "Home" },
  { to: "/broker/cvs", label: "Available CVs" },
  { to: "/broker/about", label: "About" },
  { to: "/broker/contact", label: "Contact" },
];

export function BrokerSite({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/broker" className="flex items-center gap-3">
            <img src={brokerLogo.url} alt="Broker Recruitment Agency logo" className="h-11 w-11 rounded-2xl object-contain" />
            <span>
              <span className="block text-base font-bold leading-tight text-[#0b5fff]">Broker Recruitment Agency</span>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Licensed by Ministry of Labour
              </span>
            </span>
          </Link>
          <nav className="ml-auto flex flex-wrap items-center gap-1">
            {NAV.map((n) => {
              const active = n.to === "/broker" ? pathname === "/broker" : pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-[#0b5fff] text-white" : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div>
            <div className="font-semibold text-slate-900">Broker Recruitment Agency</div>
            <p className="mt-2 text-slate-600">
              Licensed by the Ministry of Labour, State of Qatar. Domestic and skilled worker recruitment.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Contact</div>
            <ul className="mt-2 space-y-2 text-slate-600">
              {AGENCY_PHONES.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-[#0b5fff]" />
                  <a href={`tel:${p}`} className="hover:text-[#0b5fff]">{p}</a>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#0b5fff]" />
                <a href={`https://wa.me/${AGENCY_PHONES[0].replace("+", "")}`} className="hover:text-[#0b5fff]">
                  WhatsApp us
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Office</div>
            <ul className="mt-2 space-y-2 text-slate-600">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#0b5fff]" /> Doha, Qatar</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#0b5fff]" /> info@alhakeemgroup.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Broker Recruitment Agency · Licensed by Ministry of Labour
        </div>
      </footer>
    </div>
  );
}
