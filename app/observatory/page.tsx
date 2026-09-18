import type { Metadata } from "next";

import { ObservatorySandbox } from "@/components/observatory/observatory-sandbox";

export const metadata: Metadata = {
  title: "Observatory",
  description: "Interactive black hole sandbox: tune spin, disk temperature, inclination and relativistic beaming in real time.",
};

export default function ObservatoryPage() {
  return <ObservatorySandbox />;
}
