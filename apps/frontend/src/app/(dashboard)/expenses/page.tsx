import { ExpenseForm } from "@/components/expenses/expense-form";
import { ExpenseList } from "@/components/expenses/expense-list";

export default function ExpensesPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Nowy wydatek</h1>
        <ExpenseForm />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Historia</h2>
        <ExpenseList />
      </section>
    </div>
  );
}
