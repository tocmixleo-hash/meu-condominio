#!/usr/bin/env node
/**
 * Espera o deploy do Vercel (via status do GitHub) concluir para o commit dado.
 * Uso: node scripts/aguardar-deploy.mjs <sha-curto>
 */
const SHA = process.argv[2];
const REPO = "tocmixleo-hash/meu-condominio";
const token = (await import("node:fs")).readFileSync("/tmp/gh_token", "utf8").trim();

if (!SHA) {
  console.error("Informe o sha do commit");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "User-Agent": "meu-condominio-deploy-check",
};

const deadline = Date.now() + 10 * 60 * 1000; // 10 min
let ultimo = "";

while (Date.now() < deadline) {
  const r = await fetch(
    `https://api.github.com/repos/${REPO}/commits/${SHA}/check-runs`,
    { headers },
  );
  if (r.ok) {
    const d = await r.json();
    const runs = d.check_runs ?? [];
    if (runs.length) {
      for (const c of runs) {
        const linha = `${c.name}: ${c.status}${c.conclusion ? `/${c.conclusion}` : ""}`;
        if (linha !== ultimo) console.log(linha);
      }
      ultimo = runs.map((c) => `${c.name}: ${c.status}/${c.conclusion ?? "-"}`).join(" | ");
      const pendente = runs.some((c) => c.status !== "completed");
      const falhou = runs.some((c) => c.conclusion && !["SUCCESS", "NEUTRAL", "SKIPPED"].includes(c.conclusion));
      if (!pendente && !falhou) {
        console.log("DEPLOY OK");
        process.exit(0);
      }
      if (falhou) {
        console.log("DEPLOY FALHOU");
        process.exit(1);
      }
    }
  } else {
    console.log(`check-runs: HTTP ${r.status} (seguindo)`);
  }
  await new Promise((r) => setTimeout(r, 15000));
}
console.log("TIMEOUT aguardando deploy");
process.exit(1);
