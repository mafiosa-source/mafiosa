import { createFileRoute } from "@tanstack/react-router";
import { BrokerSite } from "@/components/BrokerSite";

export const Route = createFileRoute("/broker/about")({
  head: () => ({
    meta: [
      { title: "About Broker Recruitment Agency · Licensed Qatar Manpower" },
      {
        name: "description",
        content:
          "Broker Recruitment Agency is a Ministry of Labour licensed manpower company in Doha, Qatar, supplying domestic and skilled workers.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "About Broker Recruitment Agency" },
      {
        property: "og:description",
        content: "A licensed Qatar recruitment agency supplying screened domestic and skilled workers.",
      },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <BrokerSite>
      <h1 className="text-2xl font-bold">About us</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-700">
          <p>
            Broker Recruitment Agency is a manpower recruitment company based in Doha, Qatar, licensed by the Ministry
            of Labour. We work with families, households and companies to place domestic and skilled workers who are
            properly documented and prepared for work in Qatar.
          </p>
          <p className="mt-4">
            Every worker we present has been interviewed by our partner agency, has a valid passport, and comes with a
            clear CV covering experience, languages and skills. We handle the paperwork end to end: visa, medical, POLO
            or embassy requirements where applicable, contract signing and arrival.
          </p>
        </div>
        <div className="rounded-[16px] border border-slate-200 bg-white p-6">
          <h2 className="font-semibold">How the process works</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            {[
              "Tell us the position, nationality and budget you need.",
              "We send shortlisted CVs for your review.",
              "You select a worker and we prepare the contract.",
              "Visa, medical and travel documents are processed.",
              "The worker arrives in Qatar and joins your household or company.",
            ].map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0b5fff] text-xs font-semibold text-white">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </BrokerSite>
  );
}
