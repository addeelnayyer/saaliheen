"use client";

// Delete in the Supplication editor and on the Speakers page (#202): its
// button opens a confirmation, shadcn/ui's AlertDialog (#300), that names what
// is deleted and says what deleting does; its "Delete for good" deletes, and
// "Cancel", Escape or the button's own focus coming back leaves things as
// they were.

import type { ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  /** The button that opens the confirmation. */
  children: ReactElement;
  /** The confirmation's title: what is deleted. */
  title: string;
  /** What deleting it does. */
  description: string;
  onDelete: () => void;
}

export function DeleteConfirmation({ children, title, description, onDelete }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete}>Delete for good</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
