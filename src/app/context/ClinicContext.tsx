"use client";

import { createContext, useContext } from "react";
import type { UserRole, WorkingHours } from "../types/database";
import { DEFAULT_WORKING_HOURS } from "../types/database";

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
};

export const ClinicContext = createContext<ClinicContextValue>(defaultValue);

export function useClinic() {
  return useContext(ClinicContext);
}
