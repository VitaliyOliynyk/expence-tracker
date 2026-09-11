"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatAmount, type TransactionDto } from "@expence/types";
import { formatDate } from "@/lib/date";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { useDeleteTransaction } from "../api/use-delete-transaction";

export function DeleteTransactionButton({ transaction }: { transaction: TransactionDto }) {
  const [open, setOpen] = useState(false);
  const deleteTransaction = useDeleteTransaction();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) deleteTransaction.reset();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Usun transakcje">
          <Trash2 />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Usunac transakcje?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction.description || "Transakcja bez opisu"} z dnia {formatDate(transaction.date)}{" "}
            na kwote {formatAmount(transaction.amountCents)} zostanie usunieta na stale.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deleteTransaction.isError ? (
          <Alert variant="destructive">
            <AlertDescription>{deleteTransaction.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTransaction.isPending}>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteTransaction.isPending}
            onClick={(event) => {
              // Dialog zamykamy dopiero po sukcesie - blad ma zostac widoczny.
              event.preventDefault();
              deleteTransaction.mutate(transaction.id, { onSuccess: () => setOpen(false) });
            }}
          >
            {deleteTransaction.isPending ? "Usuwanie..." : "Usun"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
