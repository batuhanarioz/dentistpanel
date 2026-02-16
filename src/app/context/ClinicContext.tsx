"use client";

import { createContext, useContext } from "react";
import type { UserRole, WorkingHours } from "@/types/database";
import { DEFAULT_WORKING_HOURS } from "@/constants/days";

export interface ClinicContextValue {
  clinicId: string | null;
  clinicName: string | null;
  clinicSlug: string | null;
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  isAdmin: boolean; // ADMIN veya SUPER_ADMIN
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  workingHours: WorkingHours;
  planId: string | null;
  credits: number;
  trialEndsAt: string | null;
  automationsEnabled: boolean;
  n8nWorkflowId: string | null;
  n8nWorkflows: Array<{ id: string; name: string; enabled: boolean }>;
}

const defaultValue: ClinicContextValue = {
  clinicId: null,
  clinicName: null,
  clinicSlug: null,
  userRole: null,
  isSuperAdmin: false,
  isAdmin: false,
  userId: null,
  userName: null,
  userEmail: null,
  workingHours: DEFAULT_WORKING_HOURS,
  planId: null,
  credits: 0,
  trialEndsAt: null,
  automationsEnabled: false,
  n8nWorkflowId: null,
  n8nWorkflows: [],
};

export const ClinicContext = createContext<ClinicContextValue>(defaultValue);

export function useClinic() {
  return useContext(ClinicContext);
}
