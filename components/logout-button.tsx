"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/(auth)/login/actions";
import { Loader2, LogOut } from "lucide-react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => logout())}
    >
      {isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <LogOut />
      )}
      Sair
    </Button>
  );
}
