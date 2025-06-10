/**
 * File: crawler-card.tsx
 * Responsibility: Displays detailed crawler information including stats, health, and location in a card format
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getAvatarUrl } from "@/lib/avatarUtils";
import { Zap, Heart, Shield, Coins, MapPin } from "lucide-react";
import type { CrawlerWithDetails } from "@shared/schema";