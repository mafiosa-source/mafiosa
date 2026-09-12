import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, MessageCircle, Phone, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrokerSite } from "@/components/BrokerSite";
import {
  listAvailableCvs,
  cvFileLink,
  whatsappLink,
  callLink,
  CV_COUNTRIES,
  COUNTRY_NAME,
  type PublicCv,
} from "@/lib/public-cvs";

export const Route = createFileRoute("/broker/cvs")({
  head: () => ({
    meta: [
      { title: "Available CVs · Broker Recruitment Agency Qatar" },
      {
        name: "description",
        content:
          "Browse currently available domestic and skilled worker CVs from the Philippines, Kenya, Ethiopia, Nigeria, Tanzania, Uganda and India.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Available worker CVs · Broker Recruitment Agency" },
      { property: "og:description", content: "Live list of available workers with CV downloads and WhatsApp contact." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CvsPage,
});

function CvsPage() {
  const [cvs, setCvs] = useState<PublicCv[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");

  useEffect(() => {
    listAvailableCvs()
      .then(setCvs)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not load CVs"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cvs.filter(
      (c) =>
        (country === "ALL" || c.country === country) &&
        (!q ||
          [c.name, c.id, c.position, c.experience ?? "", COUNTRY_NAME[c.country] ?? c.country]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [cvs, query, country]);

  async function openCv(cv: PublicCv) {
    if (!cv.cvUrl) return toast.error("This CV file is not uploaded yet");
    try {
      const url = await cvFileLink(cv.cvUrl);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the CV file");
    }
  }

  return (
    <BrokerSite>
      <h1 className="text-2xl font-bold">Available CVs</h1>
      <p className="mt-2 text-sm text-slate-600">
        Only workers currently available are shown. Reserved workers are removed automatically.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[16px] border border-slate-200 bg-white p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID, position…"
            className="w-full rounded-2xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#0b5fff]"
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#0b5fff]"
        >
          <option value="ALL">All countries</option>
          {CV_COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {COUNTRY_NAME[c]} ({c})
            </option>
          ))}
        </select>
        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          {filtered.length} {filtered.length === 1 ? "worker" : "workers"}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading CVs…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-[16px] border border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
          No workers match this search right now. Please contact us and we will send fresh CVs.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cv, i) => (
            <article key={cv.id} className="flex flex-col rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="rounded-2xl bg-[#0b5fff]/10 px-3 py-1 text-xs font-semibold text-[#0b5fff]">
                  {COUNTRY_NAME[cv.country] ?? cv.country}
                </span>
                <span className="font-mono text-xs text-slate-500">{cv.id}</span>
              </div>
              <h2 className="mt-3 text-lg font-semibold leading-tight">{cv.name}</h2>
              <div className="mt-1 text-sm text-slate-700">{cv.position}</div>
              {cv.experience ? (
                <div className="mt-1 text-sm text-slate-500">Experience: {cv.experience}</div>
              ) : null}

              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={() => void openCv(cv)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#0b5fff] px-4 py-2.5 text-sm font-semibold text-[#0b5fff] hover:bg-[#0b5fff]/5"
                >
                  <FileText className="h-4 w-4" /> View CV
                </button>
                <div className="flex gap-2">
                  <a
                    href={whatsappLink(cv, i)}
                    target="_blank"
                    rel="noopener"
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                  <a
                    href={callLink(cv, i)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0b5fff] px-3 py-2.5 text-sm font-semibold text-white"
                  >
                    <Phone className="h-4 w-4" /> Call
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </BrokerSite>
  );
}
