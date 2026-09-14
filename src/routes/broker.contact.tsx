import { createFileRoute } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, Mail, Clock, Users } from "lucide-react";
import { BrokerSite } from "@/components/BrokerSite";
import { AGENCY_ADDRESS, AGENCY_MAP_URL, AGENCY_PHONES, WHATSAPP_GROUP_URL } from "@/lib/public-cvs";

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
      <a
        href={WHATSAPP_GROUP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#25D366] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#20bd5a]"
      >
        <Users className="h-4 w-4" /> Join WhatsApp Group
      </a>
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
           <a href={AGENCY_MAP_URL} target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-[#0b5fff]">
             {AGENCY_ADDRESS}
           </a>
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm">
          <Mail className="h-5 w-5 text-[#0b5fff]" />
          <div className="mt-2 font-semibold">Email</div>
          <p className="text-slate-600">info@alhakeemgroup.com</p>
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm">
          <Clock className="h-5 w-5 text-[#0b5fff]" />
          <div className="mt-2 font-semibold">Working hours</div>
           <p className="text-slate-600">Saturday – Thursday, 8:00 am – 12:00 pm and 4:00 pm – 8:00 pm</p>
        </div>
      </div>
    </BrokerSite>
  );
}
