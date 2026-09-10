import { Suspense } from "react";
import { Plus } from "lucide-react";
import { TransactionFilters } from "@/features/transaction/filter";
import { TransactionFormDialog } from "@/features/transaction/upsert";
import { TransactionsSummary } from "@/widgets/transactions-summary";
import { TransactionsTable } from "@/widgets/transactions-table";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Transakcje</h1>
          <p className="text-sm text-muted-foreground">Przychody i wydatki w jednym miejscu.</p>
        </div>
        <TransactionFormDialog
          trigger={
            <Button>
              <Plus />
              Nowa transakcja
            </Button>
          }
        />
      </div>

      {/* Filtry, podsumowanie i tabela czytaja stan z URL (useSearchParams) - wymagaja granicy Suspense. */}
      <Suspense fallback={null}>
        <TransactionFilters />
        <TransactionsSummary />
        <TransactionsTable />
      </Suspense>
    </div>
  );
}
