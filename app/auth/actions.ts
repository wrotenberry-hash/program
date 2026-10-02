"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/origin";
import { isMinor, isPlausibleDateOfBirth } from "@/lib/age";
import { flags } from "@/lib/flags";

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function fail(path: string, message: string): never {
  const url = new URL(path, "http://x");
  url.searchParams.set("error", message);
  redirect(url.pathname + url.search);
}

export async function signUp(formData: FormData) {
  const email = str(formData, "email");
  const password = str(formData, "password");
  const displayName = str(formData, "display_name");
  const dateOfBirth = str(formData, "date_of_birth");

  if (!email || !password) fail("/signup", "Email and password are required.");
  if (password.length < 8) fail("/signup", "Password must be at least 8 characters.");
  if (!isPlausibleDateOfBirth(dateOfBirth)) fail("/signup", "Enter a valid date of birth.");
  // The database refuses the program too (FEATURE_ADULTS_ONLY); this just says so before an account exists.
  if (flags.adultsOnly && isMinor(dateOfBirth)) fail("/signup", "Program is for players 18 and older.");

  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding/school`,
      data: { display_name: displayName, date_of_birth: dateOfBirth },
    },
  });
  if (error) fail("/signup", error.message);

  // With email confirmation on, no session yet: send them to their inbox.
  if (!data.session) redirect("/signup/check-email");
  redirect("/onboarding/school");
}

export async function signIn(formData: FormData) {
  const email = str(formData, "email");
  const password = str(formData, "password");
  const next = str(formData, "next") || "/program";
  if (!email || !password) fail("/login", "Email and password are required.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail("/login", error.message);
  redirect(next.startsWith("/") ? next : "/program");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=/onboarding/school` },
  });
  if (error || !data.url) fail("/login", error?.message ?? "Google sign-in is not available yet.");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
