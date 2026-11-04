/**
 * Envio de e-mail transacional (Resend). Sem RESEND_API_KEY/EMAIL_REMETENTE
 * o envio é apenas registrado no log do servidor — o portal nunca falha por
 * causa do e-mail (cadastre as variáveis na Vercel para ativar de verdade).
 */

export type Mensagem = {
  para: string;
  nome?: string;
  assunto: string;
  texto: string;
};

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

export async function enviarEmail(m: Mensagem): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE;
  if (!chave || !remetente) {
    console.log(
      `[e-mail modo log] para=${m.para} assunto="${m.assunto}"\n${m.texto}`,
    );
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remetente,
        to: m.para,
        subject: m.assunto,
        text: m.nome ? `Olá, ${m.nome.split(" ")[0]}.\n\n${m.texto}` : m.texto,
      }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
