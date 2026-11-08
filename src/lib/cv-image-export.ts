/** Render only the CV at its paper width, irrespective of the viewport. */
export async function createCvJpg(element: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  await Promise.all(Array.from(element.querySelectorAll("img")).map(async (image) => {
    await image.decode();
    if (!image.naturalWidth) throw new Error("A CV image could not be loaded.");
  }));
  const { default: html2canvas } = await import("html2canvas-pro");
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    windowWidth: 1280,
    scrollX: 0,
    scrollY: 0,
    onclone: (document) => {
      const cv = document.querySelector<HTMLElement>("[data-cv-export]");
      if (cv) {
        cv.style.width = "200mm";
        cv.style.maxWidth = "none";
        cv.style.margin = "0";
      }
    },
  });
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new Error("Could not create the CV image.")),
    "image/jpeg", 0.95,
  ));
}

export function downloadCvJpg(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function deliverCvJpg(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: "image/jpeg" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  downloadCvJpg(blob, filename);
}