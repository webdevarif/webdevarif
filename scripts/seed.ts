import { config } from "dotenv";
import { hash } from "bcryptjs";
import postgres from "postgres";

config({ path: "apps/web/.env" });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const USERS = [
  {
    username: "webdevarif",
    email: "arifcpam@gmail.com",
    fullName: "Arif Hossin",
    company: "Web Genius Plus",
    password: "Arif00313632972",
  },
];

async function main() {
  const sql = postgres(url!, { prepare: false });

  for (const user of USERS) {
    const passwordHash = await hash(user.password, 12);

    await sql`
      INSERT INTO users (username, email, full_name, company, password_hash)
      VALUES (${user.username}, ${user.email}, ${user.fullName}, ${user.company}, ${passwordHash})
      ON CONFLICT (email) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        company = EXCLUDED.company,
        password_hash = EXCLUDED.password_hash,
        updated_at = now()
    `;

    console.log(`Seeded user: ${user.email} (password: ${user.password})`);
  }

  console.log("\nDone! Change your password after first login.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
