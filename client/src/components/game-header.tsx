/**
 * File: game-header.tsx
 * Responsibility: Displays the main game header with crawler stats and current status
 * Notes: Shows essential crawler information in a compact header format
 */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatarUtils";
import { Shield, Zap, Heart, Coins, MapPin } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";