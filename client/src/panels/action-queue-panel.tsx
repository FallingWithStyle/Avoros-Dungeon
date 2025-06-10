/**
 * File: action-queue-panel.tsx
 * Responsibility: Displays and manages the combat action queue in the tactical view
 * Notes: Shows queued actions and allows cancellation of pending actions
 */
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { combatSystem } from "@shared/combat-system";
import { Clock, X } from "lucide-react";