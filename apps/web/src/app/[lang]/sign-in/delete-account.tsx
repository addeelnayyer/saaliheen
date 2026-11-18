"use client";

// Deleting an Account on the Sign-in page (#68): "Delete Account" opens a
// modal dialog that says what deleting does; confirming deletes the Account
// and everything tied to it at once (its sign-ins with Google and Apple, and
// its sessions on every device), with no grace period, and signs the person
// out. Better Auth only deletes for a session made in the last day: an older
// one is asked to sign in again first. The dialog is shadcn/ui's AlertDialog
// (#301): it closes by its buttons, Escape or a click outside, as a native
// modal <dialog> did.

import { useState } from "react";
import { accountClient } from "@/account/client";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { STRINGS } from "../strings";
import { ACCOUNT_BUTTON } from "./account-button";
import styles from "./sign-in.module.css";

export function DeleteAccount() {
  const [status, setStatus] = useState<"idle" | "deleting" | "failed">("idle");
  const confirm = async () => {
    setStatus("deleting");
    // On success the session answer refreshes, and the panel shows signing in again.
    const { error } = await accountClient.deleteUser();
    setStatus(error ? "failed" : "idle");
  };
  return (
    <AlertDialog onOpenChange={() => setStatus("idle")}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" className={`${ACCOUNT_BUTTON} bg-transparent text-destructive hover:bg-(--madani-bg)`}>
          {STRINGS.deleteAccount}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{STRINGS.deleteAccountTitle}</AlertDialogTitle>
        <AlertDialogDescription>{STRINGS.deleteAccountWarning}</AlertDialogDescription>
        {status === "failed" && (
          <p role="alert" className={`${styles.error} ${styles.inDialog}`}>
            {STRINGS.deleteAccountFailed}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel variant="secondary" className={ACCOUNT_BUTTON}>
            {STRINGS.cancel}
          </AlertDialogCancel>
          {/* Not AlertDialogAction, which would close the dialog before the deletion answers. */}
          <Button
            variant="destructive"
            className={`${ACCOUNT_BUTTON} border-destructive hover:bg-destructive hover:opacity-90 disabled:pointer-events-auto disabled:cursor-progress disabled:opacity-60`}
            disabled={status === "deleting"}
            onClick={confirm}
          >
            {STRINGS.deleteAccount}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
