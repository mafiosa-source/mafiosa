# Broker public website updates

## What will change
- Make every `/broker` page bypass the internal sign-in while keeping the finance system protected.
- Update CV cards so photos use a top-aligned portrait crop, with lightweight face-aware positioning when the browser supports it and a reliable top-crop fallback.
- Make each CV card open a full candidate preview. Keep phone, passport, address, and other private recruitment data out of the public response.
- Add a **View PDF** action that opens a print-ready public CV view built only from the approved public fields.
- Add Bangladesh to the shared country list used by recruitment and the Broker website.
- Update the office hours, full Al Sadd address, clickable Google Maps pin, and WhatsApp group button across the relevant Broker pages/footer.

## Security and data protection
- Preserve all existing candidate and finance records; no tables or files will be deleted.
- Lock anonymous access to the retired website-only `cvs` table and `cv-pdfs` storage bucket. The live Broker page already reads safe fields from available recruitment candidates, so this removes unused exposure without changing the new public website.
- Keep `/broker` publicly accessible while limiting public candidate responses and printable CVs to non-sensitive fields.

## Verification
- Check the public Broker home, CV list, CV modal/PDF view, About, and Contact pages while signed out.
- Check desktop and mobile layouts, image positioning, card clicks, contact links, and that internal pages still require sign-in.
