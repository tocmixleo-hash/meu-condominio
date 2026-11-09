// Monta folhas de contato das capturas de /tmp/render para revisão visual.
const sharp = require("/home/z/my-project/node_modules/sharp");

const DESKTOP = [
  ["visual-01-login", "01 login"],
  ["visual-02-dashboard", "02 dashboard"],
  ["visual-03-reservas-galeria", "03 reservas galeria"],
  ["visual-04-modal-reserva", "04 modal reserva"],
  ["visual-05-reservas-lista", "05 reservas lista"],
  ["visual-06-faq", "06 faq"],
  ["visual-07-encomendas", "07 encomendas"],
  ["visual-08-reservas-gestao", "08 reservas gestao"],
];
const MOBILE = [
  ["visual-09-login-mobile", "09 login mob"],
  ["visual-10-dashboard-mobile", "10 dashboard mob"],
  ["visual-11-reservas-mobile", "11 reservas mob"],
  ["visual-12-modal-mobile", "12 modal mob"],
  ["visual-13-menu-mobile", "13 menu mob"],
  ["visual-14-faq-mobile", "14 faq mob"],
];

async function folha(lista, saida, largura) {
  const tiles = [];
  const textos = [];
  let pos = 0;
  for (const [arq, rotulo] of lista) {
    const buf = await sharp(`/tmp/render/${arq}.png`)
      .resize(largura - 15, 380, { fit: "inside" })
      .png()
      .toBuffer();
    const m = await sharp(buf).metadata();
    tiles.push({
      input: buf,
      left: (pos % 2) * largura + 5,
      top: Math.floor(pos / 2) * (m.height + 30) + 25,
    });
    textos.push({
      input: Buffer.from(
        `<svg width="${largura}" height="22"><text x="${largura / 2}" y="17" font-size="15" text-anchor="middle" font-family="sans-serif">${rotulo}</text></svg>`,
      ),
      left: (pos % 2) * largura + 5,
      top: Math.floor(pos / 2) * (m.height + 30) + 2,
    });
    pos++;
  }
  const linhas = Math.ceil(pos / 2);
  const alturaMax = Math.max(...tiles.map((t) => t.top), (linhas - 1) * 410 + 25);
  const svg = Buffer.from(
    `<svg width="${largura * 2 + 10}" height="${alturaMax + 420}"><rect width="100%" height="100%" fill="white"/></svg>`,
  );
  await sharp(svg)
    .composite([...tiles, ...textos])
    .jpeg({ quality: 72 })
    .toFile(saida);
  console.log("ok", saida);
}

(async () => {
  await folha(DESKTOP, "/tmp/render/folha-desktop.jpg", 620);
  await folha(MOBILE, "/tmp/render/folha-mobile.jpg", 500);
})();
