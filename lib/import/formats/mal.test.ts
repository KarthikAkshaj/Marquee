import { describe, expect, it } from "vitest";
import { parseImport } from "@/lib/import/parse";
import { malToText } from "./mal";

describe("malToText", () => {
  it("reads anime and manga with their list status, named or numbered", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" ?>
      <myanimelist>
        <myinfo><user_name>someone</user_name><user_total_watching>1</user_total_watching></myinfo>
        <anime><series_animedb_id>52991</series_animedb_id><series_title><![CDATA[Sousou no Frieren]]></series_title><my_status>Completed</my_status></anime>
        <anime><series_title><![CDATA[Monster]]></series_title><my_status>On-Hold</my_status></anime>
        <anime><series_title><![CDATA[Pluto]]></series_title><my_status>6</my_status></anime>
        <manga><manga_title><![CDATA[Berserk]]></manga_title><my_status>Reading</my_status></manga>
      </myanimelist>`;
    expect(parseImport(malToText(xml) ?? "").titles.map(({ title, status }) => [title, status])).toEqual([
      ["Sousou no Frieren", "completed"],
      ["Monster", "in_progress"],
      ["Pluto", "planned"],
      ["Berserk", "in_progress"],
    ]);
  });

  it("returns null for XML that isn't a MyAnimeList export, or isn't XML", () => {
    expect(malToText("<rss><channel><item><title>News</title></item></channel></rss>")).toBeNull();
    expect(malToText("<anime><oops")).toBeNull();
  });
});
