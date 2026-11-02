import { useBrokerLanguage } from "@/lib/broker-i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, Mail, Clock, Users } from "lucide-react";
import { agencyOfficeAddress, useAgency } from "@/lib/agency";
import { BrokerSite } from "@/components/BrokerSite";
import { AGENCY_MAP_URL } from "@/lib/public-cvs";

export const Route = createFileRoute("/broker/contact")({
  head: () => ({
    meta: [
      { title: "Contact Broker Recruitment Agency · Doha, Qatar" },
      {
        name: "description",
        content: "Call or WhatsApp Broker Recruitment Agency in Doha, Qatar to request domestic or skilled worker CVs.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Contact Broker Recruitment Agency" },
      { property: "og:description", content: "Reach our Doha office by phone or WhatsApp for worker recruitment." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

export function ContactPage() {
  const { t } = useBrokerLanguage();
  const agency = useAgency();
  return (
    <BrokerSite>
      <h1 className="text-2xl font-bold">{t("Contact us")}</h1>
      <p className="mt-2 text-sm text-agency-secondary">
        {t("Send us a message on WhatsApp with the position and nationality you need, and we will reply with available CVs.")}
      </p>
      <a
        href={agency.whatsappGroup}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-agency-social px-5 py-3 text-sm font-semibold text-agency-on-primary transition-colors hover:bg-agency-social-hover"
      >
        <Users className="h-4 w-4" /> {t("Join WhatsApp Group")}
      </a>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agency.phones.map((p) => (
          <div key={p} className="rounded-[16px] border border-agency-border bg-agency-surface p-6">
            <div className="text-sm text-agency-subtle">{t("Recruitment line")}</div>
            <div className="mt-1 text-lg font-semibold">{p}</div>
            <div className="mt-4 flex gap-2">
              <a
                href={`https://wa.me/${p.replace("+", "")}?text=${encodeURIComponent(`${agency.greeting}, I would like to request CVs`)}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-agency-social px-4 py-2.5 text-sm font-semibold text-agency-on-primary"
              >
                <MessageCircle className="h-4 w-4" /> {t("WhatsApp")}
              </a>
              <a
                href={`tel:${p}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-agency-primary px-4 py-2.5 text-sm font-semibold text-agency-on-primary"
              >
                <Phone className="h-4 w-4" /> {t("Call")}
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[16px] border border-agency-border bg-agency-surface p-6 text-sm">
          <MapPin className="h-5 w-5 text-agency-primary" />
          <div className="mt-2 font-semibold">{t("Office")}</div>
           <a href={AGENCY_MAP_URL} target="_blank" rel="noopener noreferrer" className="text-agency-secondary hover:text-agency-primary">
             {t(agencyOfficeAddress(agency))}
           </a>
        </div>
        <div className="rounded-[16px] border border-agency-border bg-agency-surface p-6 text-sm">
          <Mail className="h-5 w-5 text-agency-primary" />
          <div className="mt-2 font-semibold">{t("Email")}</div>
          <p className="text-agency-secondary">info@alhakeemgroup.com</p>
        </div>
        <div className="rounded-[16px] border border-agency-border bg-agency-surface p-6 text-sm">
          <Clock className="h-5 w-5 text-agency-primary" />
          <div className="mt-2 font-semibold">{t("Working hours")}</div>
           <p className="text-agency-secondary">{t("Saturday – Thursday, 8:00 am – 12:00 pm and 4:00 pm – 8:00 pm")}</p>
        </div>
      </div>
    </BrokerSite>
  );
}
