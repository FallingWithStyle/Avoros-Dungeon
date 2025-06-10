/**
 * File: crawler-mode.tsx
 * Responsibility: Main crawler mode page that handles crawler selection and game view routing
 * Notes: Switches between sponsor view, crawler selection, and active crawler view
 */
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import CrawlerSelection from "@/components/crawler-selection";
import SponsorView from "@/views/sponsor-view";
import CrawlerView from "@/views/crawler-view";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CrawlerWithDetails } from "@shared/schema";
import CrawlerView from "@/views/crawler-view";

interface CrawlerModeProps {
  crawlerId: string;
}

export default function CrawlerMode({ crawlerId }: CrawlerModeProps) {
  return <CrawlerView crawlerId={crawlerId} />;
}