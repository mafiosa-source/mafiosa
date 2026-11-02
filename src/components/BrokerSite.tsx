import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Phone, MessageCircle, MapPin, Mail, Users, Languages } from "lucide-react";
import { agencyOfficeAddress, useAgency } from "@/lib/agency";
import { AGENCY_MAP_URL } from "@/lib/public-cvs";
import { Button } from "@/components/ui/button";
import { useBrokerLanguage } from "@/lib/broker-i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "", label: "Home" },
  { to: "/cvs", label: "Available CVs" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export function BrokerSite({ children }: { children: ReactNode }) {
  const { t, language, setLanguage } = useBrokerLanguage();
  const agency = useAgency();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div lang={language} dir={language === "ar" ? "rtl" : "ltr"} className={cn("broker-site min-h-screen bg-agency-background text-agency-foreground", agency.key === "fast" && "fast-site")}>
      <header className="sticky top-0 z-30 border-b border-agency-border bg-agency-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link to={agency.base as "/broker"} className="flex min-w-0 items-center gap-3">
            <img src={agency.logo} alt={`${agency.name} logo`} className={cn("shrink-0 object-contain", agency.key === "fast" ? "h-[64px] w-[120px] md:h-[76px] md:w-[160px]" : "h-[42px] w-[42px] rounded-2xl")} />
            <span>
              <span className="block text-[18px] font-extrabold leading-tight text-agency-heading md:text-[22px]">{t(agency.name)}</span>
              <span className="block text-[11px] font-medium uppercase tracking-wide text-agency-subtle">
                {t("Licensed by Ministry of Labour")}
              </span>
            </span>
          </Link>
          <nav className="ms-auto flex w-full flex-wrap md:w-auto items-center gap-1">
            {NAV.map((n) => {
              const to = `${agency.base}${n.to}` as "/broker";
              const active = n.to === "" ? pathname === agency.base || pathname === `${agency.base}/` : pathname.startsWith(to);
              return (
                <Link
                  key={n.to}
                  to={to}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-agency-primary text-agency-on-primary" : "text-agency-secondary hover:bg-agency-muted",
                  )}
                >
                  {t(n.label)}
                </Link>
              );
            })}
            <div className="flex flex-wrap items-center gap-1">
            <a
              href={agency.whatsappGroup}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-agency-social px-3 py-2 text-sm font-semibold text-agency-on-primary transition-colors hover:bg-agency-social-hover"
            >
              <Users className="h-4 w-4" /> {t("Join WhatsApp Group")}
            </a>
            <Button type="button" variant="outline" onClick={() => setLanguage(language === "en" ? "ar" : "en")} aria-label={language === "en" ? "Switch to Arabic" : "Switch to English"} className="h-9 shrink-0 border-agency-border bg-agency-surface text-agency-heading hover:bg-agency-muted" dir="ltr">
              <Languages aria-hidden="true" /> <span lang="en" className={language === "en" ? "font-extrabold" : "font-normal"}>EN</span><span aria-hidden="true">|</span><span lang="ar" className={language === "ar" ? "font-extrabold" : "font-normal"}>عربي</span>
            </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="mt-10 border-t border-agency-border bg-agency-surface">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div>
            <div className="font-semibold text-agency-foreground">{t(agency.name)}</div>
            <p className="mt-2 text-agency-secondary">
              {t("Licensed by the Ministry of Labour, State of Qatar. Domestic and skilled worker recruitment.")}
            </p>
          </div>
          <div>
            <div className="font-semibold text-agency-foreground">{t("Contact")}</div>
            <ul className="mt-2 space-y-2 text-agency-secondary">
              {agency.phones.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-agency-primary" />
                  <a href={`tel:${p}`} dir="ltr" className="hover:text-agency-primary">{p}</a>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-agency-primary" />
                <a href={`https://wa.me/${agency.phones[0].replace("+", "")}`} className="hover:text-agency-primary">
                  {t("WhatsApp us")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-agency-foreground">{t("Office")}</div>
            <ul className="mt-2 space-y-2 text-agency-secondary">
              <li>
                <a
                  href={AGENCY_MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 hover:text-agency-primary"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-agency-primary" /> {t(agencyOfficeAddress(agency))}
                </a>
              </li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-agency-primary" /> info@alhakeemgroup.com</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-agency-muted py-4 text-center text-xs text-agency-subtle">
          © {new Date().getFullYear()} {t(agency.name)} · {t("Licensed by Ministry of Labour")}
        </div>
      </footer>
    </div>
  );
}
