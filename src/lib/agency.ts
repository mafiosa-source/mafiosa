import { useRouterState } from "@tanstack/react-router";
import brokerLogo from "@/assets/broker-logo.jpg.asset.json";

export type AgencyKey = "broker" | "fast";
export type Agency = {
  key: AgencyKey; base: "/broker" | "/fast"; name: string; greeting: string;
  logo: string; phones: readonly string[]; whatsappGroup: string;
};

export const AGENCIES: Record<AgencyKey, Agency> = {
  broker: { key: "broker", base: "/broker", name: "Broker Recruitment Agency", greeting: "Hello Broker", logo: brokerLogo.url, phones: ["+97455830003", "+97466772778"], whatsappGroup: "https://chat.whatsapp.com/GExPmgL1ySzH1JvuRTORkt" },
  fast: { key: "fast", base: "/fast", name: "Fast Recruitment Agency", greeting: "Hello Fast", logo: "/fast-logo.png", phones: ["+97451100557", "+97477200023", "+97477388837"], whatsappGroup: "https://chat.whatsapp.com/GYEhF3awA1o38jzyg0bNEe" },
};

export function agencyForPath(pathname: string): Agency {
  return pathname === "/fast" || pathname.startsWith("/fast/") ? AGENCIES.fast : AGENCIES.broker;
}

export function useAgency(): Agency {
  return agencyForPath(useRouterState({ select: (s) => s.location.pathname }));
}
