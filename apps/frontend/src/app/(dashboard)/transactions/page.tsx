import { Suspense } from "react";
import { Plus } from "lucide-react";
import { TransactionFilters } from "@/features/transaction/filter";
import { TransactionFormDialog } from "@/features/transaction/upsert";
import { PageBody, PageHeader } from "@/widgets/app-shell";
import { CategoryBreakdown } from "@/widgets/category-breakdown";
import { TransactionsSummary } from "@/widgets/transactions-summary";
import { TransactionsTable } from "@/widgets/transactions-table";
import { Button } from "@/components/ui/button";

export default function TransactionsPage() {
  return (
    <>
      <PageHeader
        title="Transakcje"
        description="Przychody i wydatki w jednym miejscu."
        actions={
          <TransactionFormDialog
            trigger={
              <Button size="lg">
                <Plus />
                Nowa transakcja
              </Button>
            }
          />
        }
      />

      {/* Filtry, podsumowanie, tabela i panel kategorii czytaja stan z URL (useSearchParams) - wymagaja granicy Suspense. */}
      <Suspense fallback={null}>
        <PageBody>
          <TransactionsSummary />
          <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <section aria-labelledby="history-heading" className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-col gap-4">
                <h2 id="history-heading" className="text-xl font-bold tracking-tight">
                  Historia
                </h2>
                <TransactionFilters />
              </div>
              <TransactionsTable />
            </section>
            <CategoryBreakdown />
          </div>
        </PageBody>
      </Suspense>
    </>
  );
}
