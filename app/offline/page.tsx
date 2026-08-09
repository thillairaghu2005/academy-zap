import { OfflineIndex } from "@/components/offline/offline-index";

export const metadata = {
  title: "Offline",
  description: "Read course material saved on this device.",
  alternates: { canonical: "/offline" },
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return <OfflineIndex />;
}
