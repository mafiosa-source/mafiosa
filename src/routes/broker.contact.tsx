import { createFileRoute } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, Mail, Clock } from "lucide-react";
import { BrokerSite } from "@/components/BrokerSite";
import { AGENCY_PHONES } from "@/lib/public-cvs";

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

function ContactPage() {
  return (
    <BrokerSite>
      <h1 className="text-2xl font-bold">Contact us</h1>
      <p className="mt-2 text-sm text-slate-600">
        Send us a message on WhatsApp with the position and nationality you need, and we will reply with available CVs.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {AGENCY_PHONES.map((p) => (
          <div key={p} className="rounded-[16px] border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">Recruitment line</div>
            <div className="mt-1 text-lg font-semibold">{p}</div>
            <div className="mt-4 flex gap-2">
              <a
                href={`https://wa.me/${p.replace("+", "")}?text=${encodeURIComponent("Hello Broker, I would like to request CVs")}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <a
                href={`tel:${p}`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0b5fff] px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Phone className="h-4 w-4" /> Call
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm">
          <MapPin className="h-5 w-5 text-[#0b5fff]" />
          <div className="mt-2 font-semibold">Office</div>
          <p className="text-slate-600">Doha, Qatar</p>
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm">
          <Mail className="h-5 w-5 text-[#0b5fff]" />
          <div className="mt-2 font-semibold">Email</div>
          <p className="text-slate-600">info@alhakeemgroup.com</p>
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm">
          <Clock className="h-5 w-5 text-[#0b5fff]" />
          <div className="mt-2 font-semibold">Working hours</div>
          <p className="text-slate-600">Saturday – Thursday, 8:00 – 18:00</p>
        </div>
      </div>
    </BrokerSite>
  );
}
