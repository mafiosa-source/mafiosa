import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Phone, MessageCircle, MapPin, Mail, Users, Languages } from "lucide-react";
import brokerLogo from "@/assets/broker-logo.jpg.asset.json";
import { AGENCY_ADDRESS, AGENCY_MAP_URL, AGENCY_PHONES, WHATSAPP_GROUP_URL } from "@/lib/public-cvs";
import { Button } from "@/components/ui/button";
import { useBrokerLanguage } from "@/lib/broker-i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/broker", label: "Home" },
  { to: "/broker/cvs", label: "Available CVs" },
  { to: "/broker/about", label: "About" },
  { to: "/broker/contact", label: "Contact" },
];

export function BrokerSite({ children }: { children: ReactNode }) {
  const { t, language, setLanguage } = useBrokerLanguage();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div lang={language} dir={language === "ar" ? "rtl" : "ltr"} className="broker-site min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/broker" className="flex min-w-0 items-center gap-3">
            <img src={brokerLogo.url} alt="Broker Recruitment Agency logo" className="h-[42px] w-[42px] shrink-0 rounded-2xl object-contain" />
            <span>
              <span className="block text-[18px] font-extrabold leading-tight text-broker-heading md:text-[22px]">{t("Broker Recruitment Agency")}</span>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {t("Licensed by Ministry of Labour")}
              </span>
            </span>
          </Link>
          <nav className="ms-auto flex w-full flex-wrap md:w-auto items-center gap-1">
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
                  {t(n.label)}
                </Link>
              );
            })}
            <a
              href={WHATSAPP_GROUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ms-1 inline-flex items-center gap-2 rounded-md bg-[#25D366] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a]"
            >
              <Users className="h-4 w-4" /> {t("Join WhatsApp Group")}
            </a>
            <Button type="button" variant="outline" onClick={() => setLanguage(language === "en" ? "ar" : "en")} aria-label={language === "en" ? "Switch to Arabic" : "Switch to English"} className="h-9 shrink-0 border-slate-200 bg-white text-broker-heading hover:bg-slate-100" dir="ltr">
              <Languages aria-hidden="true" /> <span lang="en" className={language === "en" ? "font-extrabold" : "font-normal"}>EN</span><span aria-hidden="true">|</span><span lang="ar" className={language === "ar" ? "font-extrabold" : "font-normal"}>عربي</span>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mt-10 border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div>
            <div className="font-semibold text-slate-900">{t("Broker Recruitment Agency")}</div>
            <p className="mt-2 text-slate-600">
              {t("Licensed by the Ministry of Labour, State of Qatar. Domestic and skilled worker recruitment.")}
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900">{t("Contact")}</div>
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
                  {t("WhatsApp us")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-900">{t("Office")}</div>
            <ul className="mt-2 space-y-2 text-slate-600">
              <li>
                <a
                  href={AGENCY_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-[#0b5fff]"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0b5fff]" /> {t(AGENCY_ADDRESS)}
                </a>
              </li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#0b5fff]" /> info@alhakeemgroup.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {t("Broker Recruitment Agency")} · {t("Licensed by Ministry of Labour")}
        </div>
      </footer>
    </div>
  );
}
