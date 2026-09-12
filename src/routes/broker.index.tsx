import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Globe2, Users, ArrowRight, BadgeCheck } from "lucide-react";
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

function BrokerHome() {
  return (
    <BrokerSite>
      <section className="rounded-[16px] bg-gradient-to-br from-[#0b5fff] to-[#0a3ea8] px-6 py-12 text-white sm:px-10">
        <span className="inline-flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-1 text-xs font-medium">
          <BadgeCheck className="h-4 w-4" /> Licensed by Ministry of Labour
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          Reliable domestic and skilled workers for families and companies in Qatar
        </h1>
        <p className="mt-4 max-w-2xl text-white/85">
          We recruit, screen and document workers from the Philippines, Kenya, Ethiopia, Nigeria, Tanzania, Uganda and
          India — with full Ministry of Labour compliance.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/broker/cvs"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#0b5fff]"
          >
            View available CVs <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/broker/contact"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/40 px-5 py-3 text-sm font-semibold text-white"
          >
            Talk to us
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Fully licensed", text: "Operating under a Ministry of Labour recruitment licence." },
          { icon: Globe2, title: "7 source countries", text: "Trusted partner agencies across Africa and Asia." },
          { icon: Users, title: "Screened workers", text: "Verified passports, experience checks and clear CVs." },
        ].map((c) => (
          <div key={c.title} className="rounded-[16px] border border-slate-200 bg-white p-6">
            <c.icon className="h-6 w-6 text-[#0b5fff]" />
            <div className="mt-3 font-semibold">{c.title}</div>
            <p className="mt-1 text-sm text-slate-600">{c.text}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 rounded-[16px] border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Where our workers come from</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CV_COUNTRIES.map((c) => (
            <span key={c} className="rounded-2xl bg-slate-100 px-3 py-1.5 text-sm text-slate-700">
              {COUNTRY_NAME[c]} <span className="text-slate-400">({c})</span>
            </span>
          ))}
        </div>
      </section>
    </BrokerSite>
  );
}
