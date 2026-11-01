import { useBrokerLanguage } from "@/lib/broker-i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Globe2, Users, ArrowRight, BadgeCheck, MessageCircle } from "lucide-react";
import { useAgency } from "@/lib/agency";
import { BrokerSite } from "@/components/BrokerSite";
import { CV_COUNTRIES, COUNTRY_NAME } from "@/lib/public-cvs";

export const Route = createFileRoute("/broker/")({
  head: () => ({
    meta: [
      { title: "Broker Recruitment Agency · Licensed Manpower Recruitment in Qatar" },
      {
        name: "description",
        content:
          "Broker Recruitment Agency, licensed by the Ministry of Labour in Qatar. Browse available domestic and skilled worker CVs from Africa and Asia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Broker Recruitment Agency · Licensed by Ministry of Labour" },
      {
        property: "og:description",
        content: "Licensed recruitment agency in Doha, Qatar. View available worker CVs and contact us on WhatsApp.",
      },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrokerHome,
});

export function BrokerHome() {
  const { t } = useBrokerLanguage();
  const agency = useAgency();
  return (
    <BrokerSite>
      <section className="rounded-[16px] bg-gradient-to-br from-agency-primary to-agency-hero-end px-6 py-12 text-agency-on-primary sm:px-10">
        <span className="inline-flex items-center gap-2 rounded-2xl bg-agency-surface/15 px-3 py-1 text-xs font-medium">
          <BadgeCheck className="h-4 w-4" /> {t("Licensed by Ministry of Labour")}
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          {t("Reliable domestic and skilled workers for families and companies in Qatar")}
        </h1>
        <p className="mt-4 max-w-2xl text-agency-on-primary/85">
          {t("We recruit, screen and document workers from the Philippines, Kenya, Ethiopia, Nigeria, Tanzania, Uganda and India — with full Ministry of Labour compliance.")}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to={`${agency.base}/cvs` as "/broker/cvs"}
            className="inline-flex items-center gap-2 rounded-2xl bg-agency-surface px-5 py-3 text-sm font-semibold text-agency-primary"
          >
            {t("View available CVs")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <Link
            to={`${agency.base}/contact` as "/broker/contact"}
            className="inline-flex items-center gap-2 rounded-2xl border border-agency-surface/40 px-5 py-3 text-sm font-semibold text-agency-on-primary"
          >
            {t("Talk to us")}
          </Link>
          <a
            href={agency.whatsappGroup}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-agency-social px-5 py-3 text-sm font-semibold text-agency-on-primary"
          >
            <MessageCircle className="h-4 w-4" /> {t("Join WhatsApp Group")}
          </a>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Fully licensed", text: "Operating under a Ministry of Labour recruitment licence." },
          { icon: Globe2, title: "7 source countries", text: "Trusted partner agencies across Africa and Asia." },
          { icon: Users, title: "Screened workers", text: "Verified passports, experience checks and clear CVs." },
        ].map((c) => (
          <div key={c.title} className="rounded-[16px] border border-agency-border bg-agency-surface p-6">
            <c.icon className="h-6 w-6 text-agency-primary" />
            <div className="mt-3 font-semibold">{t(c.title)}</div>
            <p className="mt-1 text-sm text-agency-secondary">{t(c.text)}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[16px] border border-agency-border bg-agency-surface p-6">
        <h2 className="text-lg font-semibold">{t("Where our workers come from")}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CV_COUNTRIES.map((c) => (
            <span key={c} className="rounded-2xl bg-agency-muted px-3 py-1.5 text-sm text-agency-secondary">
              {t(COUNTRY_NAME[c] ?? c)} <span className="text-agency-subtle">({c})</span>
            </span>
          ))}
        </div>
      </section>
    </BrokerSite>
  );
}
