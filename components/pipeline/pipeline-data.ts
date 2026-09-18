export type NodeKind = "station" | "stage" | "sink";

export interface FlowNode {
  id: string;
  label: string;
  sub: string;
  kind: NodeKind;
  description: string;
  throughput: string;
  /** Simulated processing latency in seconds, summed for end-to-end alert latency. */
  latencyS: number;
  tags: string[];
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
}

const station = (id: string, label: string, sub: string): FlowNode => ({
  id,
  label,
  sub,
  kind: "station",
  description: `${label} records dual-polarisation voltages at 230 GHz, time-stamped by a hydrogen maser, and streams them as raw VLBI packets.`,
  throughput: "32 Gbit/s",
  latencyS: 2,
  tags: ["Mark 6", "H-maser", "230 GHz"],
});

export const NODES: FlowNode[] = [
  station("alma", "ALMA", "Chile"),
  station("sma", "SMA", "Hawaiʻi"),
  station("jcmt", "JCMT", "Hawaiʻi"),
  station("iram", "IRAM", "Spain"),
  station("spt", "SPT", "South Pole"),
  {
    id: "ingest",
    label: "VLBI Ingest",
    sub: "Raw packets · correlator",
    kind: "stage",
    description:
      "Packets from every station are aligned against a common clock model and cross-correlated into complex visibilities for each baseline.",
    throughput: "160 Gbit/s",
    latencyS: 18,
    tags: ["DiFX", "Delay model", "Visibilities"],
  },
  {
    id: "calibrate",
    label: "Calibration",
    sub: "Phase · gain · RFI",
    kind: "stage",
    description:
      "Fringe-fitting, atmospheric phase correction, amplitude gain solutions and RFI flagging turn raw visibilities into science-ready data.",
    throughput: "4.1 TB / run",
    latencyS: 26,
    tags: ["Fringe fit", "Self-cal", "RFI flags"],
  },
  {
    id: "raytrace",
    label: "GR Ray Tracing",
    sub: "Kerr geodesics",
    kind: "stage",
    description:
      "General-relativistic ray tracing forward-models photon rings and accretion flows, then fits spin, inclination and mass to the data.",
    throughput: "1.2 M rays/s",
    latencyS: 31,
    tags: ["GPU", "Kerr metric", "MCMC"],
  },
  {
    id: "alerts",
    label: "Alert Dissemination",
    sub: "Classifier · broker",
    kind: "stage",
    description:
      "Significant changes are classified, scored and published to subscribers within seconds, with full provenance back to raw packets.",
    throughput: "≈ 400 alerts / night",
    latencyS: 7,
    tags: ["Kafka", "VOEvent", "Provenance"],
  },
  {
    id: "gcn",
    label: "GCN notices",
    sub: "Community broadcast",
    kind: "sink",
    description: "Machine-readable notices for the multi-messenger community, so other observatories can follow up.",
    throughput: "push",
    latencyS: 1,
    tags: ["VOEvent", "Kafka"],
  },
  {
    id: "hooks",
    label: "Webhooks",
    sub: "Your pipelines",
    kind: "sink",
    description: "Signed HTTP callbacks into your own analysis pipelines, notebooks or chat channels.",
    throughput: "push",
    latencyS: 1,
    tags: ["HMAC", "Retries"],
  },
  {
    id: "archive",
    label: "Data lake",
    sub: "Versioned archive",
    kind: "sink",
    description: "Every product lands in the versioned data lake with lineage, ready for re-analysis.",
    throughput: "14.2 PB",
    latencyS: 1,
    tags: ["Parquet", "FITS", "Lineage"],
  },
];

export const STATION_IDS = ["alma", "sma", "jcmt", "iram", "spt"];
export const SINK_IDS = ["gcn", "hooks", "archive"];

export const EDGES: FlowEdge[] = [
  ...STATION_IDS.map((s) => ({ id: `${s}-ingest`, from: s, to: "ingest" })),
  { id: "ingest-calibrate", from: "ingest", to: "calibrate" },
  { id: "calibrate-raytrace", from: "calibrate", to: "raytrace" },
  { id: "raytrace-alerts", from: "raytrace", to: "alerts" },
  ...SINK_IDS.map((s) => ({ id: `alerts-${s}`, from: "alerts", to: s })),
];

export type Orientation = "horizontal" | "vertical";

export interface LaidOutNode {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const VIEWBOX: Record<Orientation, { w: number; h: number }> = {
  horizontal: { w: 1180, h: 440 },
  vertical: { w: 420, h: 1040 },
};

/** Node centres and sizes for each orientation, in viewBox units. */
export function layout(orientation: Orientation): Record<string, LaidOutNode> {
  const out: Record<string, LaidOutNode> = {};
  if (orientation === "horizontal") {
    STATION_IDS.forEach((id, i) => (out[id] = { x: 80, y: 60 + i * 80, w: 110, h: 38 }));
    const stageX = { ingest: 320, calibrate: 530, raytrace: 740, alerts: 945 };
    Object.entries(stageX).forEach(([id, x]) => (out[id] = { x, y: 220, w: 160, h: 68 }));
    SINK_IDS.forEach((id, i) => (out[id] = { x: 1110, y: 120 + i * 100, w: 120, h: 38 }));
  } else {
    STATION_IDS.forEach((id, i) => (out[id] = { x: 50 + i * 80, y: 50, w: 72, h: 38 }));
    const stageY = { ingest: 220, calibrate: 400, raytrace: 580, alerts: 760 };
    Object.entries(stageY).forEach(([id, y]) => (out[id] = { x: 210, y, w: 200, h: 68 }));
    SINK_IDS.forEach((id, i) => (out[id] = { x: 80 + i * 130, y: 940, w: 116, h: 38 }));
  }
  return out;
}

export function edgePath(a: LaidOutNode, b: LaidOutNode, orientation: Orientation) {
  if (orientation === "horizontal") {
    const x1 = a.x + a.w / 2;
    const x2 = b.x - b.w / 2;
    const mx = (x1 + x2) / 2;
    return `M${x1},${a.y} C${mx},${a.y} ${mx},${b.y} ${x2},${b.y}`;
  }
  const y1 = a.y + a.h / 2;
  const y2 = b.y - b.h / 2;
  const my = (y1 + y2) / 2;
  return `M${a.x},${y1} C${a.x},${my} ${b.x},${my} ${b.x},${y2}`;
}
