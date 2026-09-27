import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/items";
import type { PaletteCategory } from "@/lib/palette";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ loading }: { loading?: string }) => <span data-loading={loading} />,
}));

const { PosterRow } = await import("./PosterRow");

const series: PaletteCategory = { id: "s", name: "Series", slug: "series", color: "violet", icon: "tv", kind: "series" };

const poster = (index: number) =>
  ({
    id: String(index),
    category_id: "s",
    title: `Title ${index}`,
    rating: null,
    accent_color: null,
    cover_url: `https://image.tmdb.org/t/p/w500/${index}.jpg`,
  }) as Item;

function loadingOf(eager?: number) {
  const { container } = render(
    <PosterRow id="row" title="Recently finished" note="" empty="" items={[0, 1, 2, 3].map(poster)} shelves={[series]} eager={eager} />,
  );
  return [...container.querySelectorAll<HTMLElement>("[data-loading]")].map((cover) => cover.dataset.loading);
}

describe("PosterRow", () => {
  afterEach(cleanup);

  it("loads the posters it's told are in the first screenful at once", () => {
    expect(loadingOf(2)).toEqual(["eager", "eager", "lazy", "lazy"]);
  });

  it("lets every poster wait when the row sits further down", () => {
    expect(loadingOf()).toEqual(["lazy", "lazy", "lazy", "lazy"]);
  });
});
