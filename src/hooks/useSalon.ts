import { useSyncExternalStore } from "react";
import { getState, subscribe } from "../lib/salonStore";
import type { SalonDB } from "../types";

export function useSalonDB(): SalonDB {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useCustomers() {
  return useSalonDB().customers;
}

export function useCustomer(customerId: string | undefined) {
  const customers = useCustomers();
  return customerId ? customers.find((c) => c.id === customerId) : undefined;
}

export function useReservations() {
  return useSalonDB().reservations;
}

export function useServiceRecords(customerId?: string) {
  const records = useSalonDB().serviceRecords;
  return customerId ? records.filter((r) => r.customerId === customerId) : records;
}

export function useMenu() {
  return useSalonDB().menu;
}

export function useShopInfo() {
  return useSalonDB().shopInfo;
}
