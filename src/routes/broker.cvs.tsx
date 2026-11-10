import { useBrokerLanguage } from "@/lib/broker-i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrokerSite } from "@/components/BrokerSite";
import { BrokerCvDialog } from "@/components/BrokerCvDialog";
import { BrokerFacePhoto } from "@/components/BrokerFacePhoto";
import { useAgency } from "@/lib/agency";
import { shortSkillsForPreview } from "@/lib/cv-skills";
import { listPublicCvs } from "@/lib/public-cvs.functions";
import {
  whatsappLink,
  callLink,
  experienceLabel,
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
      { property: "og:description", content: "Live list of available workers with WhatsApp and call contact." },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CvsPage,
});

export function CvsPage() {
  const agency = useAgency();
  const { t, language } = useBrokerLanguage();
  const [cvs, setCvs] = useState<PublicCv[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("ALL");
  const [selected, setSelected] = useState<{ cv: PublicCv; index: number } | null>(null);


  useEffect(() => {
    listPublicCvs()
      .then(setCvs)
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not load CVs"))
      .finally(() => setLoading(false));
  }, []);

  const countries = useMemo(
    () => CV_COUNTRIES.filter((c) => cvs.some((cv) => cv.country === c)),
    [cvs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cvs.filter(
      (c) =>
        (country === "ALL" || c.country === country) &&
        (!q ||
          [c.name, c.code, c.position, c.nationality, c.experienceCountry ?? "", COUNTRY_NAME[c.country] ?? c.country, t(COUNTRY_NAME[c.country] ?? c.country)]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }, [cvs, query, country, language]);

  return (
    <BrokerSite>
      <h1 className="text-2xl font-bold">{t("Available CVs")}</h1>
      <p className="mt-2 text-sm text-agency-secondary">
         {t("Only workers currently available are shown. Reserved workers are removed automatically.")}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[16px] border border-agency-border bg-agency-surface p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-agency-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search name, code, position…")}
            className="w-full rounded-2xl border border-agency-border py-2.5 ps-9 pe-3 text-sm outline-none focus:border-agency-primary"
          />
        </div>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-2xl border border-agency-border px-3 py-2.5 text-sm outline-none focus:border-agency-primary"
        >
          <option value="ALL">{t("All countries")}</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {t(COUNTRY_NAME[c] ?? c)}
            </option>
          ))}
        </select>
        <div className="rounded-2xl bg-agency-muted px-3 py-2 text-sm font-medium text-agency-secondary">
          {filtered.length} {t(filtered.length === 1 ? "worker" : "workers")}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-agency-subtle">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("Loading CVs…")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-[16px] border border-agency-border bg-agency-surface p-12 text-center text-sm text-agency-secondary">
          {t("No workers match this search right now. Please contact us and we will send fresh CVs.")}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((cv, i) => (
            <article
              key={cv.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelected({ cv, index: i })}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelected({ cv, index: i });
                }
              }}
              className="flex cursor-pointer flex-col rounded-[16px] border border-agency-border bg-agency-surface p-5 shadow-sm transition hover:border-agency-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-agency-primary"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-2xl bg-agency-primary/10 px-3 py-1 text-xs font-semibold text-agency-primary">
                  {t(COUNTRY_NAME[cv.country] ?? cv.country)}
                </span>
                <span className="font-mono text-xs text-agency-subtle">{cv.code}</span>
              </div>

              {cv.photoUrl ? (
                <BrokerFacePhoto
                  src={cv.photoUrl}
                  alt={`${cv.name}, ${cv.position}`}
                  className="mt-4 h-56 w-full rounded-2xl"
                />
              ) : null}

              <h2 className="mt-3 text-lg font-semibold leading-tight">{cv.name}</h2>
              <div className="mt-1 text-sm text-agency-secondary">{t(cv.position)}</div>
              <div className="mt-1 text-sm text-agency-subtle">{t("Experience")}: {cv.experienceYears ? `${cv.experienceYears} ${t("year(s)")}${cv.experienceCountry ? ` ${t("in")} ${t(cv.experienceCountry)}` : ""}` : t("No overseas experience")}</div>
              {cv.age ? <div className="text-sm text-agency-subtle">{t("Age")}: {cv.age}</div> : null}
              {cv.languages.length ? (
                <div className="text-sm text-agency-subtle">{t("Languages")}: {cv.languages.map(t).join(", ")}</div>
              ) : null}
              {cv.skills.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {shortSkillsForPreview(cv.position, cv.skills).slice(0, 5).map((s) => (
                    <span key={s} className="rounded-2xl bg-agency-muted px-2 py-1 text-xs text-agency-secondary">
                      {t(s)}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex gap-2">
                <a
                  href={whatsappLink(cv, i, agency.phones, agency.greeting)}
                  target="_blank"
                  rel="noopener"
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-agency-social px-3 py-2.5 text-sm font-semibold text-agency-on-primary"
                >
                  <MessageCircle className="h-4 w-4" /> {t("WhatsApp")}
                </a>
                <a
                  href={callLink(cv, i, agency.phones)}
                  onClick={(e) => e.stopPropagation()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-agency-primary px-3 py-2.5 text-sm font-semibold text-agency-on-primary"
                >
                  <Phone className="h-4 w-4" /> {t("Call")}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <BrokerCvDialog cv={selected.cv} index={selected.index} onClose={() => setSelected(null)} />
      ) : null}
    </BrokerSite>

  );
}
