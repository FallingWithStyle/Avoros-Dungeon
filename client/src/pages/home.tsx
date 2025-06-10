/**
 * File: home.tsx
 * Responsibility: Default home page displaying the sponsor dashboard view
 * Notes: Simple wrapper that renders the SponsorView component for the main application interface
 */

import SponsorView from "@/views/sponsor-view";

export default function Home() {
  return <SponsorView />;
}