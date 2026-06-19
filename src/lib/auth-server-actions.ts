import { createServerFn } from "@tanstack/react-start";

export const ensureUserExistsAndHasPassword = createServerFn({ method: "POST" })
  .validator((d: { email: string; name: string; department: string }) => d)
  .handler(async ({ data: { email, name, department } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = `JumiaReferralHub2026!`;

    try {
      // 1. Check if user exists in public.profiles first to find their auth ID
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Database error querying profiles: ${profileError.message}`);
      }

      if (profile?.id) {
        // User exists! Let's update their password via Supabase Admin API
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          profile.id,
          { password: password }
        );
        if (updateError) {
          throw new Error(`Failed to update password for existing user: ${updateError.message}`);
        }
        return { success: true, message: "User password updated" };
      }

      // 2. User does not exist in profiles. Let's create the user via Supabase Admin
      const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // auto-confirm the email so no email is sent
        user_metadata: {
          name,
          department,
        },
      });

      if (createError) {
        // Fallback: if user already exists in auth but not profiles, list users to find them
        if (createError.message?.toLowerCase().includes("already") || createError.status === 422) {
          const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
          if (listError) {
            throw new Error(`Failed to find user ID: ${listError.message}`);
          }
          const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (user) {
            const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
              user.id,
              { password: password }
            );
            if (updateError) {
              throw new Error(`Failed to update password: ${updateError.message}`);
            }
            return { success: true, message: "User password updated" };
          }
        }
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      return { success: true, message: "User created successfully" };
    } catch (err: any) {
      console.error("[ensureUserExistsAndHasPassword] Error:", err);
      throw new Error(err.message || "An unexpected error occurred during admin user setup.");
    }
  });
