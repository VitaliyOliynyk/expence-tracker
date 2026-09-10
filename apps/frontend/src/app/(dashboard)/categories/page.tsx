import { CategoryForm } from "@/components/categories/category-form";
import { CategoryList } from "@/components/categories/category-list";

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Nowa kategoria</h1>
        <CategoryForm />
      </section>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Wszystkie kategorie</h2>
        <CategoryList />
      </section>
    </div>
  );
}
