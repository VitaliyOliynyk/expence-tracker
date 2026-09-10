"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  centsToUnits,
  createTransactionSchema,
  TRANSACTION_TYPES,
  type CreateTransactionFormValues,
  type CreateTransactionInput,
  type TransactionDto,
} from "@expence/types";
import { TRANSACTION_TYPE_LABELS } from "@/entities/transaction";
import { useCategories } from "@/hooks/use-categories";
import { ApiRequestError } from "@/lib/api-client";
import { dateInputToIso, isoToDateInput, todayDateInput } from "@/lib/date";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTransaction, useUpdateTransaction } from "../api/use-upsert-transaction";

type TransactionFormDialogProps = {
  /** Brak = tworzenie nowej transakcji. */
  transaction?: TransactionDto;
  trigger: ReactNode;
};

/** Dodawanie i edycja transakcji w jednym dialogu. */
export function TransactionFormDialog({ transaction, trigger }: TransactionFormDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edytuj transakcje" : "Nowa transakcja"}</DialogTitle>
          <DialogDescription>
            {transaction ? "Zmien dane transakcji i zapisz." : "Dodaj przychod albo wydatek."}
          </DialogDescription>
        </DialogHeader>
        {/* Formularz montujemy dopiero po otwarciu - kazde otwarcie startuje od swiezych wartosci. */}
        {open ? <TransactionForm transaction={transaction} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

const FORM_FIELDS = ["type", "amount", "categoryId", "date", "description"] as const;
type FormField = (typeof FORM_FIELDS)[number];

function isFormField(name: string): name is FormField {
  return (FORM_FIELDS as readonly string[]).includes(name);
}

function toFormValues(transaction?: TransactionDto): CreateTransactionFormValues {
  return {
    type: transaction?.type ?? "EXPENSE",
    amount: transaction
      ? centsToUnits(transaction.amountCents).toFixed(2).replace(".", ",")
      : "",
    categoryId: transaction?.category.id ?? "",
    date: transaction?.date ?? dateInputToIso(todayDateInput()),
    description: transaction?.description ?? "",
  };
}

function TransactionForm({
  transaction,
  onDone,
}: {
  transaction?: TransactionDto;
  onDone: () => void;
}) {
  const categories = useCategories();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();

  // Trzy parametry: formularz trzyma z.input (kwota jako tekst), resolver oddaje z.infer.
  const form = useForm<CreateTransactionFormValues, unknown, CreateTransactionInput>({
    resolver: standardSchemaResolver(createTransactionSchema),
    defaultValues: toFormValues(transaction),
  });

  const onSubmit = form.handleSubmit(async () => {
    const values = form.getValues();
    const input: CreateTransactionFormValues = {
      ...values,
      description: values.description?.trim() ? values.description : null,
    };

    try {
      if (transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, input });
      } else {
        await createTransaction.mutateAsync(input);
      }
      onDone();
    } catch (error) {
      if (error instanceof ApiRequestError && error.fields) {
        for (const [name, messages] of Object.entries(error.fields)) {
          if (isFormField(name) && messages[0]) form.setError(name, { message: messages[0] });
        }
      }
      form.setError("root", {
        message: error instanceof Error ? error.message : "Nie udalo sie zapisac transakcji",
      });
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typ</FormLabel>
              <FormControl>
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  {TRANSACTION_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={field.value === type}
                      variant={field.value === type ? "default" : "outline"}
                      onClick={() => field.onChange(type)}
                    >
                      {TRANSACTION_TYPE_LABELS[type]}
                    </Button>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kwota (PLN)</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="0,00"
                    autoComplete="off"
                    {...field}
                    value={String(field.value ?? "")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={isoToDateInput(field.value)}
                    onChange={(event) => field.onChange(dateInputToIso(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kategoria</FormLabel>
              <Select value={field.value} onValueChange={field.onChange} disabled={!categories.data}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={categories.isPending ? "Ladowanie..." : "Wybierz kategorie"}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.data?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opis (opcjonalnie)</FormLabel>
              <FormControl>
                <Input placeholder="np. Zakupy spozywcze" {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root ? (
          <Alert variant="destructive">
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Anuluj
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
