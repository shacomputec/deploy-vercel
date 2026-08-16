"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { RolePicker, type LoginRole } from "@/components/auth/role-picker";

/** The guided portal sign-in: pick who you are (Super Admin → Admin → Staff →
 * Headteacher/Teacher/Other, plus Student & Parent), see what that role can
 * access, then sign in with the right credential mode automatically. */
export function PortalSignIn() {
  const [role, setRole] = useState<LoginRole | null>(null);
  return (
    <div className="space-y-5">
      <RolePicker selected={role} onSelect={setRole} />
      <div className="border-t border-slate-100 pt-4">
        <LoginForm presetRole={role} />
      </div>
    </div>
  );
}
