import { useRef, useState } from "react";

type FaceDetectorResult = { boundingBox: { x: number; y: number; width: number; height: number } };
type FaceDetectorInstance = { detect: (image: HTMLImageElement) => Promise<FaceDetectorResult[]> };
type FaceDetectorConstructor = new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorInstance;

export function BrokerFacePhoto({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [position, setPosition] = useState("50% 15%");

  async function alignToFace() {
    const image = imageRef.current;
    const Detector = (globalThis as typeof globalThis & { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
    if (!image || !Detector) return;

    try {
      const faces = await new Detector({ fastMode: true, maxDetectedFaces: 1 }).detect(image);
      const face = faces[0]?.boundingBox;
      if (!face || !image.naturalWidth || !image.naturalHeight) return;
      const x = ((face.x + face.width / 2) / image.naturalWidth) * 100;
      const y = Math.max(8, Math.min(38, ((face.y + face.height / 2) / image.naturalHeight) * 100));
      setPosition(`${x}% ${y}%`);
    } catch {
      setPosition("50% 15%");
    }
  }

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      loading="lazy"
      onLoad={() => void alignToFace()}
      className={`object-cover object-top ${className}`}
      style={{ objectPosition: position }}
    />
  );
}