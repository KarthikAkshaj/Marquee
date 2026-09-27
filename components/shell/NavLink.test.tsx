import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/home";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children?: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { NavLink } = await import("./NavLink");

function linkAt(path: string, props: { href: string; match?: string }) {
  pathname = path;
  render(<NavLink {...props}>Link</NavLink>);
  return screen.getByRole("link", { name: "Link" });
}

describe("NavLink", () => {
  afterEach(cleanup);

  it("is current on its own page and on anything under it", () => {
    expect(linkAt("/import", { href: "/import" })).toHaveAttribute("aria-current", "page");
    cleanup();
    expect(linkAt("/import/review", { href: "/import" })).toHaveAttribute("aria-current", "page");
    cleanup();
    // A shared prefix isn't the same section.
    expect(linkAt("/imports", { href: "/import" })).not.toHaveAttribute("aria-current");
  });

  it("can open one page of a section and stay current on all of it", () => {
    const link = linkAt("/settings/data", { href: "/settings/profile", match: "/settings" });
    expect(link).toHaveAttribute("href", "/settings/profile");
    expect(link).toHaveAttribute("aria-current", "page");
    cleanup();
    expect(linkAt("/home", { href: "/settings/profile", match: "/settings" })).not.toHaveAttribute("aria-current");
  });
});
