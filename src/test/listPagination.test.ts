import { describe, expect, it } from "vitest";
import { getListPaginationItems } from "@/utils/listPagination";

describe("getListPaginationItems", () => {
  it("mostra todas as paginas quando a lista e curta", () => {
    expect(getListPaginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("mostra as primeiras paginas e a ultima no inicio", () => {
    expect(getListPaginationItems(1, 41)).toEqual([
      1,
      2,
      3,
      4,
      5,
      "ellipsis-end",
      41,
    ]);
  });

  it("mostra paginas vizinhas e os extremos no meio", () => {
    expect(getListPaginationItems(20, 41)).toEqual([
      1,
      "ellipsis-start",
      19,
      20,
      21,
      "ellipsis-end",
      41,
    ]);
  });

  it("mostra a primeira pagina e as ultimas paginas no fim", () => {
    expect(getListPaginationItems(41, 41)).toEqual([
      1,
      "ellipsis-start",
      37,
      38,
      39,
      40,
      41,
    ]);
  });
});
