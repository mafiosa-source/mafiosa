import { FileText, MessageCircle, Phone, X } from "lucide-react";
import { BrokerFacePhoto } from "@/components/BrokerFacePhoto";
import { printPublicCv } from "@/lib/public-cv-print";
import { COUNTRY_NAME, callLink, experienceLabel, whatsappLink, type PublicCv } from "@/lib/public-cvs";

export function BrokerCvDialog({
  cv,
  index,
  onClose,
}: {
  cv: PublicCv;
  index: number;
  onClose: () => void;
}) {
  const facts: Array<[string, string]> = [
    ["Reference", cv.code],
    ["Country", COUNTRY_NAME[cv.country] ?? cv.country],
    ["Nationality", cv.nationality],
    ["Position", cv.position],
    ["Experience", experienceLabel(cv)],
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={`${cv.name} full CV`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-[16px] bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{cv.name}</h2>
            <div className="mt-1 text-sm font-semibold text-[#0b5fff]">{cv.position}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[200px_1fr]">
          {cv.photoUrl ? (
            <BrokerFacePhoto
              src={cv.photoUrl}
              alt={`${cv.name}, ${cv.position}`}
              className="h-64 w-full rounded-2xl border border-slate-200 sm:h-56"
            />
          ) : (
            <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
              No photo
            </div>
          )}

          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {facts.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-slate-100 py-1">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {cv.languages.length ? (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">Languages</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {cv.languages.map((l) => (
                <span key={l} className="rounded-2xl bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {l}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {cv.skills.length ? (
          <section className="mt-5">
            <h3 className="text-sm font-semibold text-slate-900">Skills &amp; experience</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {cv.skills.map((s) => (
                <span key={s} className="rounded-2xl bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {s}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => printPublicCv(cv)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#0b5fff] px-3 py-2.5 text-sm font-semibold text-[#0b5fff] hover:bg-[#0b5fff]/5"
          >
            <FileText className="h-4 w-4" /> View PDF
          </button>
          <a
            href={whatsappLink(cv, index)}
            target="_blank"
            rel="noopener"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-3 py-2.5 text-sm font-semibold text-white"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a
            href={callLink(cv, index)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0b5fff] px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Phone className="h-4 w-4" /> Call
          </a>
        </div>
      </div>
    </div>
  );
}
