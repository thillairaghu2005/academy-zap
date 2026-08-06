export type TrustSignalKind = "verified" | "security" | "freshness" | "community";

export interface TrustSignal {
  id: string;
  kind: TrustSignalKind;
  label: string;
  detail: string;
  href?: string;
}

export interface TrustMetric {
  label: string;
  value: string;
}

export interface TrustSnapshot {
  signals: TrustSignal[];
  metrics: TrustMetric[];
  partner_labels: string[];
}
