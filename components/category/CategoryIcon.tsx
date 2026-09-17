import {
  BookOpen,
  Clapperboard,
  Drama,
  Film,
  Gamepad2,
  Ghost,
  Headphones,
  Heart,
  Library,
  Mic,
  Music,
  Podcast,
  Popcorn,
  Rocket,
  Sparkles,
  Swords,
  Trophy,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { isCategoryIcon, type CategoryIcon as IconName } from "@/lib/categories";

const ICONS: Record<IconName, LucideIcon> = {
  sparkles: Sparkles,
  clapperboard: Clapperboard,
  tv: Tv,
  "gamepad-2": Gamepad2,
  film: Film,
  popcorn: Popcorn,
  drama: Drama,
  "book-open": BookOpen,
  library: Library,
  music: Music,
  headphones: Headphones,
  mic: Mic,
  podcast: Podcast,
  swords: Swords,
  ghost: Ghost,
  rocket: Rocket,
  heart: Heart,
  trophy: Trophy,
};

/** A category's stored icon name drawn with lucide (1.5–1.8px stroke). Unknown names fall back to a clapperboard. */
export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[isCategoryIcon(name) ? name : "clapperboard"];
  return <Icon aria-hidden className={className} strokeWidth={1.8} />;
}
