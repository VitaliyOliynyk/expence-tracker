import { CategoryForm } from "@/components/categories/category-form";
import { CategoryList } from "@/components/categories/category-list";
import { PageBody, PageHeader } from "@/widgets/app-shell";

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Kategorie" description="Kategorie porzadkuja przychody i wydatki." />
      <PageBody>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="categories-heading" className="flex min-w-0 flex-col gap-4">
            <h2 id="categories-heading" className="text-xl font-bold tracking-tight">
              Wszystkie kategorie
            </h2>
            <CategoryList />
          </section>
          <section
            aria-labelledby="new-category-heading"
            className="flex flex-col gap-5 rounded-[1.75rem] bg-sidebar p-6"
          >
            <h2 id="new-category-heading" className="text-lg font-bold tracking-tight">
              Nowa kategoria
            </h2>
            <CategoryForm />
          </section>
        </div>
      </PageBody>
    </>
  );
}
