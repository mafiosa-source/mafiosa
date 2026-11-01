import { useBrokerLanguage } from "@/lib/broker-i18n";
import { Button } from "@/components/ui/button";
import { FileText, MessageCircle, Phone, X } from "lucide-react";
import { BrokerFacePhoto } from "@/components/BrokerFacePhoto";
import { useAgency } from "@/lib/agency";
import fastLetterhead from "@/assets/letterheads/fast-letterhead-doc.png";
import { printPublicCv } from "@/lib/public-cv-print";
import { COUNTRY_NAME, callLink, whatsappLink, type PublicCv } from "@/lib/public-cvs";

export function BrokerCvDialog({
  cv,
  index,
  onClose,
}: {
  cv: PublicCv;
  index: number;
  onClose: () => void;
}) {
  const agency = useAgency();
  const { t, language } = useBrokerLanguage();
  const facts: Array<[string, string]> = [
    ["Reference", cv.code],
    ["Country", COUNTRY_NAME[cv.country] ?? cv.country],
    ["Nationality", cv.nationality],
    ["Position", cv.position],
    ["Experience", cv.experienceYears ? `${cv.experienceYears} ${t("year(s)")}${cv.experienceCountry ? ` ${t("in")} ${t(cv.experienceCountry)}` : ""}` : t("No overseas experience")],
    ["Age", cv.age ? String(cv.age) : ""],
    ["Marital status", cv.maritalStatus ?? ""],
    ["Children", cv.childrenCount ? String(cv.childrenCount) : ""],
    ["Religion", cv.religion ?? ""],
    ["Height", cv.height ?? ""],
    ["Weight", cv.weight ?? ""],
    ["Education", cv.education ?? ""],
  ].filter((f): f is [string, string] => Boolean(f[1]));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-agency-foreground/60 p-4 py-10"
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      role="dialog"
      aria-modal="true"
      aria-label={`${cv.name} — ${t("Available CVs")}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-[16px] bg-agency-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {agency.key === "fast" ? <img src={fastLetterhead} alt="FAST letterhead" className="mb-5 block h-auto w-full" /> : null}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-agency-foreground">{cv.name}</h2>
            <div className="mt-1 text-sm font-semibold text-agency-primary">{t(cv.position)}</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            aria-label={t("Close")}
            className="rounded-2xl p-2 text-agency-subtle hover:bg-agency-muted"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[200px_1fr]">
          {cv.photoUrl ? (
            <BrokerFacePhoto
              src={cv.photoUrl}
              alt={`${cv.name}, ${cv.position}`}
              className="h-64 w-full rounded-2xl border border-agency-border sm:h-56"
            />
          ) : (
            <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-agency-border text-sm text-agency-subtle">
              {t("No photo")}
            </div>
          )}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-agency-muted py-1">
                <dt className="text-agency-subtle">{t(label)}</dt>
                <dd className="text-end font-medium text-agency-foreground">{t(value)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {cv.languages.length ? (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-agency-foreground">{t("Languages")}</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {cv.languages.map((l) => (
                <span key={l} className="rounded-2xl bg-agency-muted px-2 py-1 text-xs text-agency-secondary">
                  {t(l)}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {cv.skills.length ? (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-agency-foreground">{t("Skills & experience")}</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {cv.skills.map((s) => (
                <span key={s} className="rounded-2xl bg-agency-muted px-2 py-1 text-xs text-agency-secondary">
                  {t(s)}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => printPublicCv(cv, agency.key === "fast" ? "fast_letterhead" : "broker_letterhead")}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-agency-primary bg-agency-surface px-3 py-2.5 text-sm font-semibold text-agency-primary hover:bg-agency-muted hover:text-agency-primary"
          >
            <FileText className="h-4 w-4" /> {t("View PDF")}
          </Button>
          <a
            href={whatsappLink(cv, index, agency.phones, agency.greeting)}
            target="_blank"
            rel="noopener"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-agency-social px-3 py-2.5 text-sm font-semibold text-agency-on-primary"
          >
            <MessageCircle className="h-4 w-4" /> {t("WhatsApp")}
          </a>
          <a
            href={callLink(cv, index, agency.phones)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-agency-primary px-3 py-2.5 text-sm font-semibold text-agency-on-primary"
          >
            <Phone className="h-4 w-4" /> {t("Call")}
          </a>
        </div>
      </div>
    </div>
  );
}
