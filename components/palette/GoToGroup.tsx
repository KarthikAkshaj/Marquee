"use client";

import { Command } from "cmdk";
import { FileUp, Home, Settings } from "lucide-react";
import { GroupHeading } from "@/components/add/GroupHeading";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { categoryStyle } from "@/lib/categories";
import type { PaletteLink } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { LinkRow } from "./LinkRow";

type GoToGroupProps = {
  links: PaletteLink[];
  counts: ReadonlyMap<string, number> | null;
  active: string;
  onChoose: (value: string) => void;
};

function LinkIcon({ link }: { link: PaletteLink }) {
  if (link.category) {
    return <CategoryIcon name={link.category.icon} className={cn("size-3.75", categoryStyle(link.category.color).text)} />;
  }
  const Icon = link.href === "/home" ? Home : link.href === "/import" ? FileUp : Settings;
  return <Icon aria-hidden className="size-3.75" strokeWidth={1.8} />;
}

/** "Go to": home, each shelf with its count, and the settings tabs. */
export function GoToGroup({ links, counts, active, onChoose }: GoToGroupProps) {
  if (links.length === 0) return null;
  return (
    <Command.Group heading={<GroupHeading>Go to</GroupHeading>}>
      {links.map((link) => (
        <LinkRow
          key={link.value}
          value={link.value}
          label={link.label}
          icon={<LinkIcon link={link} />}
          hint="go"
          detail={link.category && counts ? String(counts.get(link.category.id) ?? 0) : undefined}
          selected={link.value === active}
          onSelect={() => onChoose(link.value)}
        />
      ))}
    </Command.Group>
  );
}
