<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public Broker localization lives in a shared translation context scoped to Broker routes; it restores English/LTR on exit so the internal ERP is unaffected.
- Store only the public site's language preference in browser storage; business and finance records remain cloud-backed.
- Keep the existing ERP public PDF layout unchanged by website language selection because it is the shared bilingual document format.
- Public agency colors are scoped through shared semantic tokens on the agency site wrapper, so FAST branding cannot change Broker or ERP styling.
- FAST public CV previews and printouts import the same letterhead asset as the ERP CV page, preventing header drift.
- POLO scanned-name corrections retain original OCR names separately, so display edits cannot break ledger matching or change recruitment records.
- Bulk signing and reversal use atomic invoker database functions with row locks; unsigned deletion is an auditable cancellation and signed reversal posts compensating ledger entries, preserving proof and history.
- CV profession rules are shared in a browser-safe skills helper; source-based skills and experience summaries use the existing cloud skills array so no schema change or existing-record rewrite is required.
- Public worker cards and CV dialogs share the preview skill formatter; full ERP and printable CV skills remain untouched to preserve source detail.
- CV JPG export renders the shared preview at paper width in the browser and prepares the file before downloading, preserving the selected letterhead and mobile download activation.
- CV remarks generation uses reviewed profile facts through an authenticated server function; preview summaries are ephemeral and existing candidate records change only through explicit form saving.
