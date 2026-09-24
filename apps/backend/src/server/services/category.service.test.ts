import type { Category } from "@expence/db";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CategoryInUseError,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "@/server/services/category.service";

// Serwis wola prisma bezposrednio - podmieniamy klienta, zeby test nie potrzebowal bazy.
const prismaMock = vi.hoisted(() => ({
  category: {
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
}));
vi.mock("@expence/db", () => ({ prisma: prismaMock }));

const USER_ID = "01a08d61-0000-7000-8000-000000000001";
const CATEGORY_ID = "01a08d61-6efb-760c-bd2f-6711e0d26375";

function categoryRecord(overrides: Partial<Category> = {}): Category {
  return {
    id: CATEGORY_ID,
    userId: USER_ID,
    name: "Jedzenie",
    color: "#ef4444",
    icon: "utensils",
    createdAt: new Date("2026-09-01T08:00:00.000Z"),
    ...overrides,
  };
}

/** Blad w ksztalcie `Prisma.PrismaClientKnownRequestError` - serwis sprawdza tylko `code`. */
function prismaError(code: string): Error & { code: string } {
  return Object.assign(new Error(`Blad Prismy ${code}`), { code });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("listCategories", () => {
  it("pobiera tylko kategorie uzytkownika, posortowane po nazwie", async () => {
    prismaMock.category.findMany.mockResolvedValue([]);

    await listCategories(USER_ID);

    expect(prismaMock.category.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { name: "asc" },
    });
  });

  it("mapuje rekordy na DTO bez userId", async () => {
    prismaMock.category.findMany.mockResolvedValue([
      categoryRecord(),
      categoryRecord({ id: "01a08d61-6efb-760c-bd2f-6711e0d26376", name: "Paliwo", icon: null }),
    ]);

    const result = await listCategories(USER_ID);

    expect(result).toEqual([
      {
        id: CATEGORY_ID,
        name: "Jedzenie",
        color: "#ef4444",
        icon: "utensils",
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "01a08d61-6efb-760c-bd2f-6711e0d26376",
        name: "Paliwo",
        color: "#ef4444",
        icon: null,
        createdAt: "2026-09-01T08:00:00.000Z",
      },
    ]);
  });

  it("zwraca pusta liste, gdy uzytkownik nie ma kategorii", async () => {
    prismaMock.category.findMany.mockResolvedValue([]);

    await expect(listCategories(USER_ID)).resolves.toEqual([]);
  });
});

describe("createCategory", () => {
  it("zapisuje kategorie z userId z argumentu i zwraca DTO", async () => {
    prismaMock.category.create.mockResolvedValue(categoryRecord());

    const result = await createCategory(USER_ID, {
      name: "Jedzenie",
      color: "#ef4444",
      icon: "utensils",
    });

    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, name: "Jedzenie", color: "#ef4444", icon: "utensils" },
    });
    expect(result).toEqual({
      id: CATEGORY_ID,
      name: "Jedzenie",
      color: "#ef4444",
      icon: "utensils",
      createdAt: "2026-09-01T08:00:00.000Z",
    });
  });

  it.each([
    ["pominieta", undefined],
    ["null", null],
  ])("zapisuje icon jako null, gdy ikona jest %s", async (_opis, icon) => {
    prismaMock.category.create.mockResolvedValue(categoryRecord({ icon: null }));

    await createCategory(USER_ID, { name: "Jedzenie", color: "#ef4444", icon });

    expect(prismaMock.category.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, name: "Jedzenie", color: "#ef4444", icon: null },
    });
  });

  it("przepuszcza blad Prismy (np. duplikat nazwy P2002)", async () => {
    const error = prismaError("P2002");
    prismaMock.category.create.mockRejectedValue(error);

    await expect(createCategory(USER_ID, { name: "Jedzenie", color: "#ef4444" })).rejects.toBe(
      error,
    );
  });
});

describe("updateCategory", () => {
  it("zaweza aktualizacje i odczyt do id oraz userId", async () => {
    prismaMock.category.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.category.findFirst.mockResolvedValue(categoryRecord({ name: "Zakupy" }));

    const result = await updateCategory(USER_ID, CATEGORY_ID, { name: "Zakupy" });

    expect(prismaMock.category.updateMany).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
      data: { name: "Zakupy" },
    });
    expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
    });
    expect(result).toEqual({
      id: CATEGORY_ID,
      name: "Zakupy",
      color: "#ef4444",
      icon: "utensils",
      createdAt: "2026-09-01T08:00:00.000Z",
    });
  });

  it.each([
    ["tylko nazwa", { name: "Zakupy" }, { name: "Zakupy" }],
    ["tylko kolor", { color: "#22c55e" }, { color: "#22c55e" }],
    ["tylko ikona", { icon: "car" }, { icon: "car" }],
    ["ikona null usuwa ikone", { icon: null }, { icon: null }],
    [
      "wszystkie pola",
      { name: "A", color: "#000000", icon: "x" },
      { name: "A", color: "#000000", icon: "x" },
    ],
    ["puste wejscie", {}, {}],
  ])("zmienia tylko podane pola: %s", async (_opis, input, data) => {
    prismaMock.category.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.category.findFirst.mockResolvedValue(categoryRecord());

    await updateCategory(USER_ID, CATEGORY_ID, input);

    expect(prismaMock.category.updateMany).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
      data,
    });
  });

  it("zwraca null bez odczytu, gdy kategorii nie ma albo jest cudza (count 0)", async () => {
    prismaMock.category.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateCategory(USER_ID, CATEGORY_ID, { name: "Zakupy" });

    expect(result).toBeNull();
    expect(prismaMock.category.findFirst).not.toHaveBeenCalled();
  });

  it("zwraca null, gdy kategoria zniknela miedzy aktualizacja a odczytem", async () => {
    prismaMock.category.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.category.findFirst.mockResolvedValue(null);

    await expect(updateCategory(USER_ID, CATEGORY_ID, { name: "Zakupy" })).resolves.toBeNull();
  });
});

describe("deleteCategory", () => {
  it("usuwa kategorie zawezona do id oraz userId i zwraca true", async () => {
    prismaMock.category.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteCategory(USER_ID, CATEGORY_ID)).resolves.toBe(true);
    expect(prismaMock.category.deleteMany).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
    });
  });

  it("zwraca false, gdy kategorii nie ma albo jest cudza (count 0)", async () => {
    prismaMock.category.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteCategory(USER_ID, CATEGORY_ID)).resolves.toBe(false);
  });

  it("zamienia P2003 (kategoria ma transakcje) na CategoryInUseError", async () => {
    prismaMock.category.deleteMany.mockRejectedValue(prismaError("P2003"));

    const promise = deleteCategory(USER_ID, CATEGORY_ID);

    await expect(promise).rejects.toBeInstanceOf(CategoryInUseError);
    await expect(promise).rejects.toThrow(`Kategoria ${CATEGORY_ID} ma przypisane transakcje`);
  });

  it.each([
    ["inny kod Prismy", prismaError("P1001")],
    ["blad bez kodu", new Error("Polaczenie zerwane")],
  ])("przepuszcza pozostale bledy bez zmian: %s", async (_opis, error) => {
    prismaMock.category.deleteMany.mockRejectedValue(error);

    await expect(deleteCategory(USER_ID, CATEGORY_ID)).rejects.toBe(error);
  });
});
