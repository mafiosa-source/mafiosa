import { createFileRoute } from "@tanstack/react-router";
import { BrokerHome } from "@/routes/broker.index";

const TITLE = "Fast Recruitment Agency - Licensed by Ministry of Labour";
const DESC = "Licensed recruitment agency in Doha, Qatar. View available worker CVs and contact us on WhatsApp.";
const URL = "https://mafiosa.lovable.app/fast";

export const Route = createFileRoute("/fast/")({
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
  component: BrokerHome,
});
