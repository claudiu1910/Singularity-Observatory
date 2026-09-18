export type AccessTier = "academic" | "observatory" | "independent";

export interface AccessRequest {
  name: string;
  email: string;
  organization: string;
  tier: AccessTier;
  useCase: string;
  products: string[];
}

export interface AccessRequestResult {
  requestId: string;
}

export const TIERS: Array<{
  id: AccessTier;
  label: string;
  description: string;
  quota: string;
  tokenPrefix: string;
}> = [
  {
    id: "academic",
    label: "Academic Institution",
    description: "Universities and research groups",
    quota: "50k API calls / day",
    tokenPrefix: "sgl_acad",
  },
  {
    id: "observatory",
    label: "Observatory Facility",
    description: "Telescope operators & consortia",
    quota: "Unmetered ingest · priority alerts",
    tokenPrefix: "sgl_obs",
  },
  {
    id: "independent",
    label: "Independent Researcher",
    description: "Citizen scientists & freelancers",
    quota: "5k API calls / day",
    tokenPrefix: "sgl_ind",
  },
];

/**
 * Submits an access request.
 *
 * Integration point: there is no backend yet, so this only simulates network
 * latency and returns a local reference. Replace the body with a call to your
 * API route (e.g. `fetch("/api/access", { method: "POST", body: JSON.stringify(request) })`).
 */
export async function submitAccessRequest(request: AccessRequest): Promise<AccessRequestResult> {
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const stamp = Date.now().toString(36).toUpperCase();
  return { requestId: `SGL-${request.tier.slice(0, 3).toUpperCase()}-${stamp}` };
}
