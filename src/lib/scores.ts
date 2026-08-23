import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";

const MAX_BOARD = 8;
const MAX_KEEP = 64;

export type ScoreRow = {
  name: string;
  score: number;
  wave: number;
  at: number;
};

const Submit = z.object({
  name: z.string().max(8),
  score: z.number().int().positive().max(9_999_999),
  wave: z.number().int().min(1).max(999),
  at: z.number().int().nonnegative(),
});

function tag(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3) || "ACE";
}

async function topScores(): Promise<ScoreRow[]> {
  const sql = await getSql();
  return sql<ScoreRow>`
    select name, score, wave, at
    from scores
    order by score desc, at desc
    limit ${MAX_BOARD}
  `;
}

export const listScores = createServerFn({ method: "GET" }).handler(async () => {
  return topScores();
});

export const submitScore = createServerFn({ method: "POST" })
  .validator((input: unknown) => Submit.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const name = tag(data.name);
    await sql`
      insert into scores (name, score, wave, at)
      values (${name}, ${data.score}, ${data.wave}, ${data.at})
    `;
    await sql`
      delete from scores
      where id not in (
        select id from (
          select id from scores order by score desc, at desc limit ${MAX_KEEP}
        ) keep
      )
    `;
    return topScores();
  });
