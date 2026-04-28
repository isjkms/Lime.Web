"use client";
import { signOut as authSignOut } from "@/lib/auth-client";
import { deleteMe } from "@/lib/api/users";

export async function deleteAccount(): Promise<void> {
  await deleteMe();
}

export async function signOut(): Promise<void> {
  await authSignOut();
}
