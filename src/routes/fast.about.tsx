import { createFileRoute } from "@tanstack/react-router";
import { AboutPage } from "@/routes/broker.about";

const TITLE = "About Fast Recruitment Agency · Licensed by Ministry of Labour";
const DESC = "Licensed recruitment agency in Doha, Qatar. View available worker CVs and contact us on WhatsApp.";
const URL = "https://mafiosa.lovable.app/fast/about";

export const Route = createFileRoute("/fast/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:image", content: "https://mafiosa.lovable.app/fast-logo-og.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://mafiosa.lovable.app/fast-logo-og.png" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: AboutPage,
});
