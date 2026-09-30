"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlausibleDateOfBirth } from "@/lib/age";

function fail(message: string): never {
  redirect(`/onboarding/school?error=${encodeURIComponent(message)}`);
}

/** Creates the account's one program. Also records date of birth if missing. */
export async function createProgram(formData: FormData) {
  const schoolId = String(formData.get("school_id") ?? "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim();
  if (!schoolId) fail("Pick your school.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding/school");

  if (dateOfBirth) {
    if (!isPlausibleDateOfBirth(dateOfBirth)) fail("Enter a valid date of birth.");
    const { error } = await supabase.from("profiles").update({ date_of_birth: dateOfBirth }).eq("id", user.id);
    if (error) fail(error.message);
  }

  const { data: school, error: schoolError } = await supabase
    .from("schools")
    .select("id, name, nickname")
    .eq("id", schoolId)
    .maybeSingle();
  if (schoolError || !school) fail("That school isn't in the list.");

  const { error } = await supabase.from("programs").insert({
    account_id: user.id,
    school_id: school.id,
    name: `${school.name} ${school.nickname}`,
  });
  if (error) {
    // Unique index: one program per account. They already have one.
    if (error.code === "23505") redirect("/program");
    fail(error.message);
  }
  redirect("/program");
}
