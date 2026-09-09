export default function CategoriesPage() {
  // TODO: lista + formularz kategorii na hookach z @/hooks/use-categories.
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Kategorie</h1>
      <p className="text-sm text-muted-foreground">
        Widok do uzupelnienia - dane dostepne przez hook <code>useCategories()</code>.
      </p>
    </div>
  );
}
