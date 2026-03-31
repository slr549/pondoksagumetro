import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { action } = await req.json();

  if (action === "delete") {
    const userId = "8c57017a-7fdf-478b-8392-b77fe5a25146";
    // Delete user roles, profile, then auth user
    await supabase.from("user_roles").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    const { error } = await supabase.auth.admin.deleteUser(userId);
    return Response.json({ success: !error, error: error?.message });
  }

  if (action === "create") {
    // Create user
    const { data, error } = await supabase.auth.admin.createUser({
      email: "rakiraihanazhar156@gmail.com",
      password: "AdminPSG1379",
      email_confirm: true,
      user_metadata: { full_name: "Raki" },
    });
    if (error) return Response.json({ success: false, error: error.message });

    // Add admin role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: data.user.id, role: "admin" });

    return Response.json({ success: true, userId: data.user.id, roleError: roleError?.message });
  }

  return Response.json({ error: "Invalid action" });
});
