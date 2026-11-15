{ // bloc isolé : aucune variable ne fuit vers les autres cartes
/*
 * Aventure Pixel Card (FR)
 * Petit jeu de plateforme en pixels pour Home Assistant, avec deux héros originaux :
 *   - « dino » : un petit dinosaure vert dans la jungle (os à ramasser, piment = souffle de feu)
 *   - « cube » : un aventurier tout en cubes dans un monde de blocs (gemmes, pioche à lancer)
 * Niveaux générés à l'infini, difficulté croissante, commandes tactiles et clavier,
 * meilleur score mémorisé (et facultativement envoyé dans un input_number).
 * Style verre, thème clair/sombre automatique, éditeur visuel, textes en français.
 */
const CARD_VERSION = "1.1.0";

/* === NUANCE COMMUNE v2 (cartes Johan854) === */
const GV_NUANCES = [["braise", "Braise (rouge)", "#e0524f"], ["ocean", "Océan (bleu)", "#2f8fd8"], ["lagon", "Lagon (turquoise)", "#1fb5a8"], ["foret", "Forêt (vert)", "#3fae5a"], ["lavande", "Lavande (violet)", "#8a63d8"], ["framboise", "Framboise (rose)", "#e05597"], ["ambre", "Ambre (orange)", "#e8902c"], ["ardoise", "Ardoise (neutre)", "#7d8595"]];
const GV_DEFAULTS = { nuance: "theme", intensite: 1 };
const gvAccent = (c) => {
  const p = c && c.nuance_perso;
  if (c && c.nuance === "perso") {
    if (Array.isArray(p) && p.length === 3) return "#" + p.map((v) => Math.max(0, Math.min(255, Math.round(+v || 0))).toString(16).padStart(2, "0")).join("");
    if (typeof p === "string" && /^#?[0-9a-f]{6}$/i.test(p.trim())) return "#" + p.trim().replace("#", "");
  }
  const n = GV_NUANCES.find((x) => x[0] === (c && c.nuance));
  return n ? n[2] : "var(--carte-nuance)";
};
const gvStyle = (c, dark) => {
  const i = Number(c && c.intensite), ai = Number.isFinite(i) ? Math.max(0, Math.min(2, i)) : 1;
  const m = (pct, base) => `color-mix(in srgb,var(--acc-ui) ${+(pct * ai).toFixed(1)}%,${base})`;
  const bg = dark ? `linear-gradient(160deg,${m(5, "#1b1e32")} 0%,${m(11, "#1f1b2c")} 55%,${m(22, "#1c1620")} 100%)`
    : `linear-gradient(160deg,${m(2, "#f8f9fd")} 0%,${m(5, "#eef1f8")} 55%,${m(11, "#f8f8fa")} 100%)`;
  return `--acc-ui:${gvAccent(c)};--g-bg-x:${bg};--acc-ui-x:color-mix(in srgb,var(--acc-ui) ${dark ? "80%,#fff" : "82%,#000"})`;
};
const GV_FIELDS = [
  { name: "nuance", selector: { select: { mode: "dropdown", options: [{ value: "theme", label: "Selon le thème (couleurs d'origine)" }, ...GV_NUANCES.map((n) => ({ value: n[0], label: n[1] })), { value: "perso", label: "Personnalisée" }] } } },
  { name: "nuance_perso", selector: { color_rgb: {} } },
  { name: "intensite", selector: { number: { min: 0, max: 2, step: 0.1, mode: "slider" } } }];
const GV_LABELS = { nuance: "Nuance de couleur", nuance_perso: "Couleur personnalisée (nuance « Personnalisée »)", intensite: "Intensité de la nuance" };
/* === FIN NUANCE COMMUNE === */

const DEFAULTS = {
  name: "", hero: "dino", player: "", theme: "auto", ...GV_DEFAULTS,
  difficulty: "normal", // facile | normal | difficile
  lives: 3,
  sound: true,
  light_entity: "", // lumière qui clignote quand un niveau est terminé
  best_score_entity: "", // input_number qui garde le meilleur score
  unlock_entity: "", // compteur d'étoiles bonus : le jeu n'est jouable que s'il en reste (rien n'est dépensé)
  unlock_min: 1,
};

/* ---------- Écran et tuiles ---------- */
const VW = 256, VH = 144, T = 16, ROWS = 9;

/* ---------- Sprites (16×16, une lettre = une couleur, « . » = transparent) ---------- */
const SPR = {
  dino: [[
    "........dddddd..",
    ".......dggggggd.",
    ".......ggwkggggd",
    ".......gggggggggd",
    ".......gggggggrr",
    ".......ggggggg..",
    "d.....gggg......",
    "dd...ggggggg.g..",
    "ddg.gggggyyggg..",
    ".dgggggggyygg...",
    "..gggggggyyg....",
    "...ggggggyyg....",
    "....ggggggg.....",
    ".....gg..gg.....",
    ".....gg..gg.....",
    "....ggg..ggg....",
  ], [
    "........dddddd..",
    ".......dggggggd.",
    ".......ggwkggggd",
    ".......gggggggggd",
    ".......gggggggrr",
    ".......ggggggg..",
    "d.....gggg......",
    "dd...ggggggg.g..",
    "ddg.gggggyyggg..",
    ".dgggggggyygg...",
    "..gggggggyyg....",
    "...ggggggyyg....",
    "....ggggggg.....",
    "....gg....gg....",
    "...gg......gg...",
    "...gg......gg...",
  ]],
  cube: [[
    "....hhhhhhhh....",
    "....hhhhhhhh....",
    "....hssssssh....",
    "....sessssess...",
    "....ssssssss....",
    "....sssmmsss....",
    ".....ssssss.....",
    "...oooooooooo...",
    "..soooOOOOooos..",
    "..soooooooooos..",
    "..s.oooooooo.s..",
    "....pppppppp....",
    "....pppppppp....",
    "....ppp..ppp....",
    "....ppp..ppp....",
    "....bbb..bbb....",
  ], [
    "....hhhhhhhh....",
    "....hhhhhhhh....",
    "....hssssssh....",
    "....sessssess...",
    "....ssssssss....",
    "....sssmmsss....",
    ".....ssssss.....",
    "...oooooooooo...",
    "..soooOOOOooos..",
    "..soooooooooos..",
    "..s.oooooooo.s..",
    "....pppppppp....",
    "...ppp...ppp....",
    "...ppp....ppp...",
    "..bbb.....bbb...",
    "..bbb......bbb..",
  ]],
  beetle: [[
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "......kkkk......",
    "....kmmmmmmk....",
    "...kmmMmmMmmk...",
    "..kmmmmmmmmmmk..",
    "..kmMmmmmmmMmk..",
    ".wkmmmmmmmmmmk..",
    ".kkkkkkkkkkkkkk.",
    "..k.k..k..k.k...",
    ".k..k..k..k..k..",
    "................",
  ]],
  bird: [[
    "................",
    "................",
    "................",
    ".pp.........pp..",
    "..ppp......ppp..",
    "...pppp..pppp...",
    "....pppppppp....",
    "....ppwkppppyy..",
    "...ppppppppyyy..",
    "......pppp......",
    ".......pp.......",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "....pppppppp....",
    "....ppwkppppyy..",
    "...ppppppppyyy..",
    "...pppp..pppp...",
    "..ppp......ppp..",
    ".pp.........pp..",
    "................",
    "................",
    "................",
    "................",
  ]],
  slime: [[
    "................",
    "................",
    "................",
    "................",
    "................",
    "...llllllllll...",
    "...lLLLLLLLLl...",
    "...lLLLLLLLLl...",
    "...lLkkLLkkLl...",
    "...lLkwLLkwLl...",
    "...lLLLLLLLLl...",
    "...lLLLkkLLLl...",
    "...lLLLLLLLLl...",
    "...llllllllll...",
    "................",
    "................",
  ]],
  bat: [[
    "................",
    "................",
    "................",
    "................",
    "kk....k..k....kk",
    "kkk...kkkk...kkk",
    "kkkkkkkkkkkkkkkk",
    ".kkkkkrkkrkkkkk.",
    "..kk.kkkkkk.kk..",
    "......kkkk......",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], [
    "................",
    "................",
    "................",
    "................",
    "................",
    "......k..k......",
    "......kkkk......",
    "....kkrkkrkk....",
    "..kkkkkkkkkkkk..",
    ".kkkk.kkkk.kkkk.",
    "kkk....kk....kkk",
    "kk............kk",
    "................",
    "................",
    "................",
    "................",
  ]],
  bone: [[
    "........",
    ".ww..ww.",
    ".wwwwww.",
    "..wwww..",
    "..wwww..",
    ".wwwwww.",
    ".ww..ww.",
    "........",
  ]],
  gem: [[
    "...cc...",
    "..cCCc..",
    ".cCCCCc.",
    "cCCwCCCc",
    ".cCCCCc.",
    "..cCCc..",
    "...cc...",
    "........",
  ]],
  pepper: [[
    "......g.",
    ".....g..",
    "...rrrr.",
    "..rrrRr.",
    ".rrrRr..",
    "rrrrr...",
    "rrr.....",
    "........",
  ]],
  pick: [[
    ".aaaaa..",
    "a.....a.",
    "....w...",
    "...w....",
    "..w.....",
    ".w......",
    "w.......",
    "........",
  ]],
  heart: [[
    ".rr.rr..",
    "rrrrrrr.",
    "rrrrrrr.",
    ".rrrrr..",
    "..rrr...",
    "...r....",
    "........",
    "........",
  ]],
};
const PAL = {
  dino: { g: "#4caf50", d: "#2e7d32", w: "#ffffff", k: "#1b1b1b", y: "#f3e08a", r: "#c0392b" },
  cube: { h: "#c9952e", s: "#f0bf8f", e: "#26324a", m: "#a5583a", o: "#e8732c", O: "#b8531a", p: "#3f5f3d", b: "#5b3a22" },
  beetle: { k: "#2b1a10", m: "#8e4a1c", M: "#c97a35", w: "#ffffff" },
  bird: { p: "#7a5ab8", w: "#ffffff", k: "#111111", y: "#f2b134" },
  slime: { l: "#2f8f3a", L: "#6ad46a", k: "#103010", w: "#ffffff" },
  bat: { k: "#3a2f4a", r: "#ff4d4d" },
  bone: { w: "#f7f2e6" }, gem: { c: "#178fa8", C: "#55e0f2", w: "#ffffff" },
  pepper: { r: "#e53935", R: "#ff8a65", g: "#43a047" }, pick: { a: "#9aa4b2", w: "#8d5a2b" }, heart: { r: "#ff4d6d" },
};
const THEMES = {
  dino: { title: "Dino des fougères", hero: "Rex", sky: ["#8fd3ff", "#d8f3ff"], far: "#9ccc9c", near: "#5aa05a", top: "#5cbf3a", top2: "#3e9a2a", dirt: "#8b5a2b", dirt2: "#6e4420", brick: "#b97a3f", brick2: "#8b5a2b", walker: "beetle", flyer: "bird", item: "bone", power: "pepper", shot: "#ff7b1a", itemName: "os" },
  cube: { title: "Aventure en cubes", hero: "Bloc", sky: ["#6fb7ff", "#bfe3ff"], far: "#86b0d8", near: "#5f8f5f", top: "#62b33a", top2: "#4a8f2a", dirt: "#8a6038", dirt2: "#6f4a2a", brick: "#8f8f8f", brick2: "#6a6a6a", walker: "slime", flyer: "bat", item: "gem", power: "pick", shot: "#c8ced6", itemName: "gemmes" },
};
const DIFF = { facile: { speed: 0.75, gaps: 0.6, enemies: 0.6 }, normal: { speed: 1, gaps: 1, enemies: 1 }, difficile: { speed: 1.25, gaps: 1.3, enemies: 1.4 } };

function bake(rows, pal, flip) {
  const w = rows[0].length, h = rows.length;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  rows.forEach((r, j) => { for (let i = 0; i < w; i++) { const ch = r[i]; if (ch && ch !== "." && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(flip ? w - 1 - i : i, j, 1, 1); } } });
  return c;
}
const BAKED = {};
function sprite(name, palName, frame, flip) {
  const k = name + "|" + palName + "|" + frame + "|" + (flip ? 1 : 0);
  if (!BAKED[k]) { const fr = SPR[name][frame % SPR[name].length].map((r) => r.padEnd(SPR[name][0][0].length, ".").slice(0, Math.max(8, SPR[name][0][0].length))); BAKED[k] = bake(fr, PAL[palName], flip); }
  return BAKED[k];
}
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------- Petits sons (Web Audio, sans fichier) ---------- */
let AC = null;
let ACTIVE = null; // dernière carte touchée : c'est elle qui reçoit le clavier
function bip(freq, dur, type = "square", vol = 0.05, slide = 0) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur);
  } catch (e) { /* pas de son */ }
}

/* ---------- Le jeu ---------- */
class Game {
  constructor(canvas, cfg, cb) {
    this.cv = canvas; this.ctx = canvas.getContext("2d"); this.ctx.imageSmoothingEnabled = false;
    this.cfg = cfg; this.cb = cb; this.th = THEMES[cfg.hero] || THEMES.dino; this.df = DIFF[cfg.difficulty] || DIFF.normal;
    this.keys = { l: false, r: false, j: false, f: false }; this.jPrev = false; this.fPrev = false;
    this.state = "titre"; this.level = 1; this.score = 0; this.items = 0; this.lives = cfg.lives; this.t = 0;
    this.build();
  }
  build() {
    const r = rng(this.level * 7919 + (this.cfg.hero === "cube" ? 31 : 17)), lv = this.level, df = this.df;
    const W = 80 + Math.min(lv, 10) * 12; this.W = W;
    const map = Array.from({ length: ROWS }, () => Array(W).fill("."));
    const items = [], enemies = [];
    const ground = (x, top) => { for (let y = top; y < ROWS; y++) map[y][x] = "#"; };
    let x = 0, top = 7, apresTrou = false;
    while (x < 8) ground(x++, top);
    const pGap = Math.min(0.12 + lv * 0.02, 0.28) * df.gaps, pEn = Math.min(0.25 + lv * 0.05, 0.6) * df.enemies;
    while (x < W - 14) {
      const k = r();
      if (k < pGap && x > 10 && !apresTrou) { // trou : 2 ou 3 cases au plus, jamais deux trous à la suite
        const g = 2 + (r() < 0.3 + lv * 0.05 ? 1 : 0); for (let i = 0; i < g; i++) x++;
        items.push({ x: (x - g / 2) * T, y: (top - 2) * T, got: false });
        apresTrou = true;
        continue;
      }
      // pas de marche qui monte juste après un trou
      if (k < pGap + 0.15 && !apresTrou) { const nt = Math.max(5, Math.min(7, top + (r() < 0.5 ? -1 : 1))); top = nt; }
      apresTrou = false;
      const len = 4 + Math.floor(r() * 6);
      for (let i = 0; i < len && x < W - 14; i++, x++) {
        ground(x, top);
        if (i === 2 && r() < 0.35 && top >= 6) { // plateforme et bloc surprise
          const py = top - 3;
          for (let j = 0; j < 3; j++) if (x + j < W - 14) map[py][x + j] = j === 1 && r() < 0.6 ? "?" : "=";
          items.push({ x: (x + 1) * T + 4, y: (py - 1) * T + 4, got: false });
        } else if (r() < 0.18) items.push({ x: x * T + 4, y: (top - 1 - Math.floor(r() * 2)) * T + 4, got: false });
        if (i > 1 && r() < pEn * 0.22 && x > 14) enemies.push({ kind: "walk", x: x * T, y: (top - 1) * T, vx: -0.45 * df.speed, alive: true, dead: 0 });
      }
      if (r() < pEn * 0.25 && x > 20) enemies.push({ kind: "fly", x: x * T, y: (2 + Math.floor(r() * 3)) * T, bx: x * T, ph: r() * 6, alive: true, dead: 0 });
    }
    while (x < W) ground(x++, top);
    this.goal = (W - 6) * T; this.goalTop = top;
    this.map = map; this.its = items; this.ens = enemies; this.shots = []; this.parts = []; this.powers = [];
    this.p = { x: 2 * T, y: 5 * T, vx: 0, vy: 0, w: 10, h: 15, ground: false, face: 1, power: false, inv: 0, walk: 0 };
    this.cam = 0; this.won = 0;
  }
  solid(tx, ty) { if (tx < 0 || tx >= this.W) return true; if (ty < 0) return false; if (ty >= ROWS) return false; const c = this.map[ty][tx]; return c === "#" || c === "=" || c === "?" || c === "u"; }
  collide(o, dx, dy) {
    o.x += dx;
    let x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 0.01) / T), y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) { if (dx > 0) o.x = tx * T - o.w; else if (dx < 0) o.x = (tx + 1) * T; o.vx = 0; o.hitX = true; }
    o.y += dy;
    x0 = Math.floor(o.x / T); x1 = Math.floor((o.x + o.w - 0.01) / T); y0 = Math.floor(o.y / T); y1 = Math.floor((o.y + o.h - 0.01) / T);
    o.ground = false;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) {
      if (dy > 0) { o.y = ty * T - o.h; o.ground = true; o.vy = 0; } else if (dy < 0) { o.y = (ty + 1) * T; o.vy = 0; if (o === this.p) this.bump(tx, ty); }
    }
  }
  bump(tx, ty) {
    if (ty < 0 || ty >= ROWS || this.map[ty][tx] !== "?") return;
    this.map[ty][tx] = "u"; this.score += 50; this.snd(660, 0.12);
    this.powers.push({ x: tx * T + 4, y: ty * T - 10, vy: -1.5, t: 0 });
  }
  snd(f, d, t, v, s) { if (this.cfg.sound) bip(f, d, t, v, s); }
  hurt() {
    const p = this.p; if (p.inv > 0 || this.state !== "jeu") return;
    if (p.power) { p.power = false; p.inv = 90; this.snd(220, 0.25, "sawtooth", 0.05, -120); return; }
    this.die();
  }
  die() {
    this.lives--; this.snd(330, 0.5, "triangle", 0.07, -260);
    this.state = this.lives > 0 ? "perdu" : "fin"; this.t = 0;
    this.cb && this.cb(this.state === "fin" ? "fin" : "vie");
  }
  start() {
    if (this.state === "titre" || this.state === "fin") { this.level = 1; this.score = 0; this.items = 0; this.lives = this.cfg.lives; this.build(); }
    else if (this.state === "perdu") this.build();
    else if (this.state === "gagne") { this.level++; this.build(); }
    Object.keys(this.keys).forEach((k) => { this.keys[k] = false; }); this.jPrev = false; this.fPrev = false;
    this.state = "jeu"; this.t = 0;
  }
  step() {
    this.t++;
    if (this.state !== "jeu") { this.parts.forEach((q) => { q.x += q.vx; q.y += q.vy; q.vy += 0.15; q.l--; }); this.parts = this.parts.filter((q) => q.l > 0); return; }
    const p = this.p, k = this.keys, sp = 1.6;
    // déplacements
    const ax = (k.r ? 1 : 0) - (k.l ? 1 : 0);
    if (ax) { p.vx += ax * 0.25; p.face = ax; } else p.vx *= p.ground ? 0.75 : 0.95;
    p.vx = Math.max(-sp, Math.min(sp, p.vx)); if (Math.abs(p.vx) < 0.05) p.vx = 0;
    if (k.j && !this.jPrev && p.ground) { p.vy = -6.0; this.snd(520, 0.12, "square", 0.04, 260); }
    if (!k.j && p.vy < -2) p.vy += 0.5; // saut plus court si on relâche
    this.jPrev = k.j;
    p.vy = Math.min(p.vy + 0.28, 6);
    p.hitX = false; this.collide(p, p.vx, p.vy);
    p.walk = p.ground && Math.abs(p.vx) > 0.2 ? p.walk + Math.abs(p.vx) : 0;
    if (p.inv > 0) p.inv--;
    if (p.y > ROWS * T + 20) { this.die(); return; }
    // tir
    if (k.f && !this.fPrev && p.power && this.shots.length < 2) { this.shots.push({ x: p.x + (p.face > 0 ? p.w : -6), y: p.y + 5, vx: 3.2 * p.face, vy: 0, w: 6, h: 6, l: 90 }); this.snd(900, 0.08, "square", 0.04, -400); }
    this.fPrev = k.f;
    this.shots.forEach((s) => { s.vy = Math.min(s.vy + 0.25, 4); s.hitX = false; const vy = s.vy; this.collide(s, s.vx, s.vy); if (s.ground) s.vy = -2.6; else if (vy < 0 && s.vy === 0) s.vy = 0; if (s.hitX) s.l = 0; s.l--; });
    this.shots = this.shots.filter((s) => s.l > 0);
    // objets
    this.its.forEach((it) => { if (!it.got && Math.abs(it.x + 4 - (p.x + p.w / 2)) < 10 && Math.abs(it.y + 4 - (p.y + p.h / 2)) < 12) { it.got = true; this.items++; this.score += 10; this.snd(1046, 0.08, "square", 0.035, 300); this.puff(it.x + 4, it.y + 4, "#fff6c0", 5); } });
    this.powers.forEach((pw) => { pw.t++; if (pw.t < 12) pw.y += pw.vy; if (!pw.got && Math.abs(pw.x + 4 - (p.x + p.w / 2)) < 11 && Math.abs(pw.y + 4 - (p.y + p.h / 2)) < 13) { pw.got = true; p.power = true; this.score += 100; this.snd(784, 0.3, "triangle", 0.06, 500); } });
    // ennemis
    const vis0 = this.cam - 40, vis1 = this.cam + VW + 60;
    this.ens.forEach((e) => {
      if (!e.alive) { e.dead++; return; }
      if (e.x < vis0 - 200 || e.x > vis1) return;
      if (e.kind === "walk") {
        const o = { x: e.x + 2, y: e.y + 6, w: 12, h: 10, vx: e.vx, vy: e.vy || 0 };
        o.vy = Math.min(o.vy + 0.28, 6); o.hitX = false; this.collide(o, e.vx, o.vy);
        if (o.hitX) e.vx = -e.vx;
        else if (o.ground) { const ahead = Math.floor((o.x + (e.vx > 0 ? o.w + 1 : -1)) / T), below = Math.floor((o.y + o.h + 1) / T); if (!this.solid(ahead, below)) e.vx = -e.vx; }
        e.x = o.x - 2; e.y = o.y - 6; e.vy = o.vy;
        if (e.y > ROWS * T) e.alive = false;
      } else { e.ph += 0.05; e.x = e.bx + Math.sin(e.ph) * 28 * this.df.speed; e.y += Math.cos(e.ph * 2) * 0.3; }
      const hb = e.kind === "walk" ? { x: e.x + 2, y: e.y + 6, w: 12, h: 10 } : { x: e.x + 2, y: e.y + 4, w: 12, h: 8 };
      this.shots.forEach((s) => { if (s.l > 0 && s.x < hb.x + hb.w && s.x + s.w > hb.x && s.y < hb.y + hb.h && s.y + s.h > hb.y) { s.l = 0; this.kill(e, 100); } });
      if (!e.alive) return;
      if (p.x < hb.x + hb.w && p.x + p.w > hb.x && p.y < hb.y + hb.h && p.y + p.h > hb.y) {
        if (p.vy > 0.5 && p.y + p.h - p.vy <= hb.y + 4) { this.kill(e, 100); p.vy = k.j ? -5.6 : -3.4; }
        else this.hurt();
      }
    });
    this.ens = this.ens.filter((e) => e.alive || e.dead < 20);
    this.parts.forEach((q) => { q.x += q.vx; q.y += q.vy; q.vy += 0.15; q.l--; }); this.parts = this.parts.filter((q) => q.l > 0);
    // caméra et arrivée
    this.cam = Math.max(0, Math.min(this.W * T - VW, p.x - VW * 0.4));
    if (p.x >= this.goal) { this.state = "gagne"; this.t = 0; this.score += 500 + this.lives * 50; this.snd(523, 0.15); setTimeout(() => this.snd(659, 0.15), 150); setTimeout(() => this.snd(784, 0.3), 300); this.cb && this.cb("niveau"); }
  }
  kill(e, pts) { e.alive = false; this.score += pts; this.snd(300, 0.12, "square", 0.05, -150); this.puff(e.x + 8, e.y + 10, "#ffffff", 8); }
  puff(x, y, c, n) { for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 2.4, l: 22, c }); }
  draw() {
    const c = this.ctx, th = this.th, cam = Math.round(this.cam);
    // ciel et décor lointain (parallaxe)
    const g = c.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    if (this.cfg.hero === "cube") {
      c.fillStyle = "rgba(255,255,255,.85)";
      for (let i = 0; i < 8; i++) { const x = ((i * 97 - cam * 0.2) % (VW + 80) + VW + 80) % (VW + 80) - 40, y = 14 + (i * 23) % 30; c.fillRect(x, y, 32, 8); c.fillRect(x + 8, y - 6, 16, 6); }
      c.fillStyle = th.far; for (let i = 0; i < 12; i++) { const x = ((i * 53 - cam * 0.35) % (VW + 60) + VW + 60) % (VW + 60) - 30, h = 20 + (i * 17) % 26; c.fillRect(x, VH - 40 - h, 26, h + 40); }
    } else {
      c.fillStyle = "#f6c453"; c.beginPath(); c.arc(210, 26, 12, 0, 7); c.fill();
      c.fillStyle = th.far; for (let i = 0; i < 9; i++) { const x = ((i * 70 - cam * 0.3) % (VW + 120) + VW + 120) % (VW + 120) - 60; c.beginPath(); c.moveTo(x, VH - 30); c.lineTo(x + 40, VH - 78 - (i % 3) * 10); c.lineTo(x + 80, VH - 30); c.fill(); }
      c.fillStyle = th.near; for (let i = 0; i < 10; i++) { const x = ((i * 61 - cam * 0.55) % (VW + 80) + VW + 80) % (VW + 80) - 40; c.fillRect(x + 8, VH - 64, 4, 34); c.beginPath(); c.ellipse(x + 10, VH - 66, 16, 7, 0, 0, 7); c.fill(); }
    }
    // tuiles visibles
    const x0 = Math.floor(cam / T), x1 = Math.min(this.W - 1, x0 + VW / T + 1);
    for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
      const ch = this.map[ty][tx]; if (ch === ".") continue;
      const X = tx * T - cam, Y = ty * T;
      if (ch === "#") {
        const top = ty === 0 || this.map[ty - 1][tx] === ".";
        c.fillStyle = th.dirt; c.fillRect(X, Y, T, T);
        c.fillStyle = th.dirt2; c.fillRect(X + ((tx * 5) % 11), Y + ((ty * 7) % 11), 3, 3); c.fillRect(X + ((tx * 3 + 6) % 12), Y + ((tx + ty * 3) % 12), 2, 2);
        if (top) { c.fillStyle = th.top; c.fillRect(X, Y, T, 5); c.fillStyle = th.top2; for (let i = 0; i < T; i += 4) c.fillRect(X + i, Y + 5, 2, (i + tx) % 8 ? 2 : 3); }
      } else if (ch === "=") {
        c.fillStyle = th.brick; c.fillRect(X, Y, T, T); c.fillStyle = th.brick2;
        c.fillRect(X, Y + 7, T, 1); c.fillRect(X, Y + 15, T, 1); c.fillRect(X + 7, Y, 1, 7); c.fillRect(X + 3, Y + 8, 1, 7); c.fillRect(X + 12, Y + 8, 1, 7);
      } else {
        // bloc surprise : caisse en bois marquée d'une étoile (vide une fois ouverte)
        const used = ch === "u";
        c.fillStyle = used ? "#8a7d6c" : "#c98b45"; c.fillRect(X, Y, T, T);
        c.fillStyle = used ? "#6e6356" : "#8f5a26"; c.fillRect(X, Y, T, 2); c.fillRect(X, Y + 14, T, 2); c.fillRect(X, Y, 2, T); c.fillRect(X + 14, Y, 2, T);
        c.fillRect(X + 2, Y + 7, 12, 1);
        if (!used) { const b = Math.sin(this.t / 8) > 0 ? "#fff3b0" : "#ffd54f"; c.fillStyle = b; c.fillRect(X + 7, Y + 3, 2, 10); c.fillRect(X + 3, Y + 7, 10, 2); c.fillRect(X + 5, Y + 5, 6, 6); }
      }
    }
    // arrivée : mât et drapeau
    const gx = this.goal - cam, gy = this.goalTop * T;
    if (gx > -20 && gx < VW + 20) { c.fillStyle = "#e9e9e9"; c.fillRect(gx + 7, gy - 72, 2, 72); c.fillStyle = "#ffd54f"; c.fillRect(gx + 6, gy - 75, 4, 4); const wv = Math.sin(this.t / 6) > 0 ? 1 : 0; c.fillStyle = this.cfg.hero === "cube" ? "#55e0f2" : "#ff7b1a"; c.fillRect(gx + 9, gy - 70 + wv, 14, 9); }
    // objets
    const itemName = th.item;
    this.its.forEach((it) => { if (it.got) return; const X = it.x - cam; if (X < -10 || X > VW) return; c.drawImage(sprite(itemName, itemName, 0, false), Math.round(X), Math.round(it.y + Math.sin((this.t + it.x) / 10) * 1.5)); });
    this.powers.forEach((pw) => { if (pw.got) return; const X = pw.x - cam; c.drawImage(sprite(th.power, th.power, 0, false), Math.round(X), Math.round(pw.y + Math.sin(this.t / 6))); });
    // ennemis
    this.ens.forEach((e) => {
      const X = Math.round(e.x - cam); if (X < -20 || X > VW + 4) return;
      const name = e.kind === "walk" ? th.walker : th.flyer, fr = Math.floor(this.t / 10) % 2;
      if (!e.alive) { c.save(); c.globalAlpha = 1 - e.dead / 20; c.drawImage(sprite(name, name, 0, false), X, Math.round(e.y) + 4, 16, 10); c.restore(); return; }
      c.drawImage(sprite(name, name, e.kind === "walk" ? 0 : fr, e.kind === "walk" ? e.vx > 0 : false), X, Math.round(e.y));
    });
    // tirs
    this.shots.forEach((s) => { const X = s.x - cam; c.fillStyle = th.shot; c.fillRect(Math.round(X), Math.round(s.y), 6, 6); c.fillStyle = "#fff6c0"; c.fillRect(Math.round(X) + 2, Math.round(s.y) + 2, 2, 2); });
    // héros
    const p = this.p;
    if (!(p.inv > 0 && Math.floor(this.t / 4) % 2)) {
      const fr = p.ground ? (Math.floor(p.walk / 6) % 2) : 1;
      const hx = Math.round(p.x - cam - 3), hy = Math.round(p.y - 1);
      if (p.power) { c.fillStyle = this.cfg.hero === "cube" ? "rgba(85,224,242,.35)" : "rgba(255,123,26,.35)"; c.fillRect(hx - 1, hy - 1, 18, 18); }
      c.drawImage(sprite(this.cfg.hero === "cube" ? "cube" : "dino", this.cfg.hero === "cube" ? "cube" : "dino", fr, p.face < 0), hx, hy);
    }
    this.parts.forEach((q) => { c.fillStyle = q.c; c.fillRect(Math.round(q.x - cam), Math.round(q.y), 2, 2); });
  }
}

/* ---------- La carte ---------- */
class AventurePixelCard extends HTMLElement {
  static getConfigElement() { return document.createElement("aventure-pixel-card-editor"); }
  static getStubConfig() { return { ...DEFAULTS }; }
  constructor() { super(); this.attachShadow({ mode: "open" }); this._built = false; }
  setConfig(config) {
    this._config = { ...DEFAULTS, ...(config || {}) };
    if (!THEMES[this._config.hero]) this._config.hero = "dino";
    const n = Number(this._config.lives); this._config.lives = Number.isFinite(n) && n >= 1 && n <= 9 ? Math.round(n) : 3;
    this._built = false; if (this.isConnected) this._build();
  }
  set hass(h) {
    this._hass = h;
    if (!this._built && this._config) this._build();
    if (this._card) {
      const d = this._isDark(); this._card.className = d ? "dark" : "light"; this._card.setAttribute("style", gvStyle(this._config, d)); this._updBest();
      // verrou des étoiles : on rafraîchit l'écran d'accueil / de fin si l'état change
      const lk = this._locked() + "|" + this._stars();
      if (lk !== this._lockSig) { this._lockSig = lk; const g = this._game; if (g && (g.state === "titre" || g.state === "fin") && !this.shadowRoot.getElementById("msg").hidden) this._msg(this._lastMsg || "titre"); }
    }
  }
  getCardSize() { return 6; }
  connectedCallback() { if (this._config && !this._built) this._build(); this._startLoop(); }
  disconnectedCallback() { this._stopLoop(); this._built = false; }
  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true; if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    return typeof dm === "boolean" ? dm : !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  _locked() {
    const e = this._config.unlock_entity; if (!e) return false;
    const s = this._hass && this._hass.states[e];
    const v = s ? Number(s.state) : NaN;
    return !(Number.isFinite(v) && v >= (Number(this._config.unlock_min) || 1));
  }
  _stars() { const s = this._hass && this._config.unlock_entity && this._hass.states[this._config.unlock_entity]; const v = s ? Number(s.state) : NaN; return Number.isFinite(v) ? v : 0; }
  _storeKey() { return "aventure-pixel-best-" + this._config.hero + "-" + (this._config.player || "x"); }
  _best() {
    let b = 0; try { b = Number(localStorage.getItem(this._storeKey())) || 0; } catch (e) { /* stockage indisponible */ }
    const s = this._config.best_score_entity && this._hass && this._hass.states[this._config.best_score_entity];
    if (s && !isNaN(Number(s.state))) b = Math.max(b, Number(s.state));
    return b;
  }
  _saveBest(score) {
    if (score <= this._best()) return false;
    try { localStorage.setItem(this._storeKey(), String(score)); } catch (e) { /* stockage indisponible */ }
    const ent = this._config.best_score_entity;
    if (ent && this._hass) this._hass.callService(ent.split(".")[0], "set_value", { entity_id: ent, value: score });
    return true;
  }
  _updBest() { const el = this.shadowRoot.getElementById("best"); if (el) el.textContent = this._best(); }
  _build() {
    const c = this._config; if (!c) return;
    this._stopLoop();
    const th = THEMES[c.hero], dark = this._isDark();
    const title = c.name || th.title, who = c.player ? `${c.player} & ${th.hero}` : th.hero;
    this.shadowRoot.innerHTML = `<style>
      * { box-sizing:border-box; }
      ha-card.dark { --tx:#f4f6fb; --mu:#a9afc0; --bg:var(--g-bg-x,linear-gradient(160deg,#1b1e32 0%,#1f1b2c 55%,#1c1620 100%)); --bd:rgba(255,255,255,.14); --sh:0 .6em 2em rgba(0,0,0,.35); --gl:rgba(255,255,255,.07); --glb:rgba(255,255,255,.13); --fi:rgba(255,255,255,.1); --fib:rgba(255,255,255,.18); }
      ha-card.light { --tx:#1c2030; --mu:#5d6477; --bg:var(--g-bg-x,linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8f8fa 100%)); --bd:rgba(20,24,40,.12); --sh:0 .4em 1.4em rgba(20,24,40,.12); --gl:rgba(255,255,255,.7); --glb:rgba(20,24,40,.1); --fi:rgba(20,24,40,.06); --fib:rgba(20,24,40,.14); }
      ha-card { --ac:var(--acc-ui-x,${c.hero === "cube" ? "#1fb5a8" : "#3fae5a"}); display:flex; flex-direction:column; gap:10px; padding:14px; color:var(--tx); border-radius:24px; border:1px solid var(--bd); background:var(--bg); box-shadow:var(--sh); overflow:hidden; user-select:none; -webkit-user-select:none; }
      .head { display:flex; align-items:center; justify-content:space-between; gap:.6em; }
      .head b { font-size:1.1em; font-weight:650; } .head small { display:block; font-size:.8em; color:var(--mu); font-weight:600; }
      .best { font-size:.78em; color:var(--mu); text-align:right; } .best b { display:block; font-size:1.25em; color:var(--ac); }
      .hud { display:grid; grid-template-columns:repeat(4,1fr); gap:6px; }
      .hud div { padding:.35em .5em; border-radius:.8em; background:var(--gl); border:1px solid var(--glb); text-align:center; font-size:.72em; color:var(--mu); }
      .hud b { display:block; font-size:1.35em; color:var(--tx); font-variant-numeric:tabular-nums; }
      .screen { position:relative; border-radius:16px; overflow:hidden; border:1px solid var(--glb); background:#000; aspect-ratio:16/9; touch-action:none; outline:none; }
      canvas { width:100%; height:100%; display:block; image-rendering:pixelated; image-rendering:crisp-edges; }
      .msg { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.4em; text-align:center; color:#fff; background:rgba(10,12,24,.55); cursor:pointer; padding:1em; }
      .msg[hidden] { display:none; } .msg b { font-size:1.4em; text-shadow:0 2px 0 rgba(0,0,0,.4); } .msg span { font-size:.85em; opacity:.9; }
      .msg .go { margin-top:.4em; padding:.5em 1.2em; border-radius:2em; background:var(--ac); color:#fff; font-weight:700; }
      .msg .go.lock { background:rgba(255,255,255,.18); color:#fff; } .msg span { max-width:30em; }
      .pad { display:flex; justify-content:space-between; gap:10px; touch-action:none; }
      .pad div { display:flex; gap:8px; }
      .pad button { font:inherit; color:var(--tx); width:3.4em; height:3.4em; border-radius:50%; border:1px solid var(--fib); background:var(--fi); font-size:1.05em; font-weight:700; display:grid; place-items:center; touch-action:none; -webkit-tap-highlight-color:transparent; cursor:pointer; }
      .pad button.on { background:var(--ac); color:#fff; border-color:var(--ac); }
      .pad button.big { width:4em; height:4em; } .pad button.fire[disabled] { opacity:.35; }
      .keys { font-size:.72em; color:var(--mu); text-align:center; }
      @media (hover:hover) and (pointer:fine) { .pad { display:none; } }
      @media (hover:none), (pointer:coarse) { .keys { display:none; } }
    </style>
    <ha-card class="${dark ? "dark" : "light"}" style="${gvStyle(c, dark)}">
      <div class="head"><div><b></b><small></small></div><div class="best">Meilleur score<b id="best">0</b></div></div>
      <div class="hud"><div>Score<b id="sc">0</b></div><div id="itl">Os<b id="it">0</b></div><div>Vies<b id="lv">3</b></div><div>Niveau<b id="nv">1</b></div></div>
      <div class="screen" tabindex="0"><canvas width="${VW}" height="${VH}"></canvas>
        <div class="msg" id="msg"><b id="m1"></b><span id="m2"></span><span class="go" id="m3">Jouer</span></div></div>
      <div class="pad"><div><button data-k="l" aria-label="Gauche">◀</button><button data-k="r" aria-label="Droite">▶</button></div>
        <div><button data-k="f" class="fire" aria-label="Tirer">✸</button><button data-k="j" class="big" aria-label="Sauter">▲</button></div></div>
      <div class="keys">Clavier : ← → (ou Q / D) pour avancer · Espace ou ↑ pour sauter · X pour tirer · P pour la pause</div>
    </ha-card>`;
    const r = this.shadowRoot;
    r.querySelector(".head b").textContent = title; r.querySelector(".head small").textContent = who;
    r.getElementById("itl").firstChild.textContent = th.itemName.charAt(0).toUpperCase() + th.itemName.slice(1);
    this._card = r.querySelector("ha-card");
    this._card.addEventListener("pointerdown", () => { ACTIVE = this; });
    this._screen = r.querySelector(".screen");
    this._game = new Game(r.querySelector("canvas"), c, (ev) => this._event(ev));
    this._msg("titre");
    // commandes tactiles
    r.querySelectorAll(".pad button").forEach((b) => {
      const k = b.dataset.k;
      const on = (e) => { e.preventDefault(); this._unlock(); this._game.keys[k] = true; b.classList.add("on"); if (k === "j" && this._game.state !== "jeu" && !r.getElementById("msg").hidden) this._go(); };
      const off = (e) => { e.preventDefault(); this._game.keys[k] = false; b.classList.remove("on"); };
      b.addEventListener("pointerdown", on); ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => b.addEventListener(ev, off));
      b.addEventListener("contextmenu", (e) => e.preventDefault());
    });
    r.getElementById("msg").addEventListener("click", () => { this._unlock(); this._go(); });
    // balayage vers le haut sur l'écran = saut
    let sy = null;
    this._screen.addEventListener("pointerdown", (e) => { sy = e.clientY; this._screen.focus({ preventScroll: true }); });
    this._screen.addEventListener("pointerup", (e) => { if (sy !== null && sy - e.clientY > 25 && this._game.state === "jeu") { this._game.keys.j = true; setTimeout(() => { this._game.keys.j = false; }, 160); } sy = null; });
    // clavier
    this._kd = (e) => this._key(e, true); this._ku = (e) => this._key(e, false);
    window.addEventListener("keydown", this._kd); window.addEventListener("keyup", this._ku);
    this._built = true; this._updBest(); this._hud();
    this._io = new IntersectionObserver((en) => { this._visible = en[0] && en[0].isIntersecting; if (!this._visible && this._game.state === "jeu") this._pause(); });
    this._io.observe(this._screen);
    this._startLoop();
  }
  _unlock() { if (this._config.sound) bip(1, 0.01, "sine", 0.0001); }
  _key(e, down) {
    if (!this._game || !this._visible || (ACTIVE && ACTIVE !== this)) return;
    const map = { ArrowLeft: "l", KeyA: "l", KeyQ: "l", ArrowRight: "r", KeyD: "r", Space: "j", ArrowUp: "j", KeyW: "j", KeyZ: "j", KeyX: "f", ShiftLeft: "f", ShiftRight: "f" };
    const tag = (e.composedPath && e.composedPath()[0] && e.composedPath()[0].tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    if (down && (e.code === "KeyP" || e.code === "Escape")) { if (this._game.state === "jeu") this._pause(); else if (this._game.state === "pause") this._go(); return; }
    if (down && (e.code === "Enter" || e.code === "Space") && this._game.state !== "jeu" && !this.shadowRoot.getElementById("msg").hidden) { e.preventDefault(); this._unlock(); this._go(); return; }
    const k = map[e.code]; if (!k) return;
    if (!down) { this._game.keys[k] = false; return; }
    if (this._game.state !== "jeu") return;
    e.preventDefault(); this._game.keys[k] = true;
  }
  _pause() { if (this._game.state !== "jeu") return; this._game.state = "pause"; Object.keys(this._game.keys).forEach((k) => { this._game.keys[k] = false; }); this._msg("pause"); }
  _go() {
    const g = this._game;
    if (g.state === "pause") { g.state = "jeu"; this._msg(null); return; }
    if (g.state === "jeu") return;
    if ((g.state === "titre" || g.state === "fin") && this._locked()) return; // nouvelle partie : il faut des étoiles
    ACTIVE = this; g.start(); this._msg(null); this._hud(); this._screen.focus({ preventScroll: true });
  }
  _event(ev) {
    const g = this._game;
    if (ev === "niveau") {
      const le = this._config.light_entity;
      if (le && this._hass) this._hass.callService("light", "turn_on", { entity_id: le, flash: "short" });
      setTimeout(() => { if (g.state === "gagne") this._msg("gagne"); }, 700);
    } else if (ev === "vie") setTimeout(() => { if (g.state === "perdu") this._msg("perdu"); }, 700);
    else if (ev === "fin") { const rec = this._saveBest(g.score); this._updBest(); setTimeout(() => { if (g.state === "fin") this._msg(rec ? "record" : "fin"); }, 900); }
  }
  _msg(kind) {
    const r = this.shadowRoot, m = r.getElementById("msg"), g = this._game, th = THEMES[this._config.hero];
    if (!kind) { m.hidden = true; return; }
    this._lastMsg = kind;
    Object.keys(g.keys).forEach((k) => { g.keys[k] = false; }); r.querySelectorAll(".pad button.on").forEach((b) => b.classList.remove("on"));
    const tx = {
      titre: [th.title, `Aide ${th.hero} à ramasser des ${th.itemName} jusqu'au drapeau. Saute sur les ennemis, cogne les caisses à étoile pour pouvoir tirer.`, "Jouer"],
      pause: ["Pause", "Le jeu attend sagement.", "Reprendre"],
      perdu: ["Aïe !", `Encore ${g.lives} vie${g.lives > 1 ? "s" : ""}.`, "Réessayer"],
      gagne: [`Niveau ${g.level} réussi !`, `Score : ${g.score}`, "Niveau suivant"],
      fin: ["Partie terminée", `Score : ${g.score} · Niveau ${g.level}`, "Rejouer"],
      record: ["Nouveau record !", `Score : ${g.score} · Niveau ${g.level}`, "Rejouer"],
    }[kind];
    if ((kind === "titre" || kind === "fin" || kind === "record") && this._locked()) {
      const mn = Number(this._config.unlock_min) || 1, n = this._stars();
      tx[1] = `${kind === "titre" ? "" : tx[1] + " — "}Il faut au moins ${mn} étoile${mn > 1 ? "s" : ""} bonus pour lancer une partie (tu en as ${n}). Jouer ne dépense pas d'étoile.`;
      tx[2] = "Verrouillé";
    }
    r.getElementById("m1").textContent = tx[0]; r.getElementById("m2").textContent = tx[1]; r.getElementById("m3").textContent = tx[2];
    r.getElementById("m3").classList.toggle("lock", tx[2] === "Verrouillé");
    m.hidden = false;
  }
  _hud() {
    const g = this._game, r = this.shadowRoot; if (!g) return;
    const set = (id, v) => { const el = r.getElementById(id); if (el && el.textContent !== String(v)) el.textContent = v; };
    set("sc", g.score); set("it", g.items); set("lv", Math.max(0, g.lives)); set("nv", g.level);
    const fb = r.querySelector(".pad .fire"); if (fb) fb.disabled = !g.p.power;
  }
  _startLoop() {
    if (this._raf || !this._game) return;
    let last = performance.now(), acc = 0;
    const loop = (now) => {
      this._raf = requestAnimationFrame(loop);
      if (document.hidden) { last = now; if (this._game.state === "jeu") this._pause(); return; }
      acc += Math.min(100, now - last); last = now;
      let n = 0; while (acc >= 1000 / 60 && n < 5) { this._game.step(); acc -= 1000 / 60; n++; }
      if (n) { this._game.draw(); this._hud(); }
    };
    this._raf = requestAnimationFrame(loop);
  }
  _stopLoop() {
    if (this._raf) cancelAnimationFrame(this._raf); this._raf = null;
    if (this._kd) { window.removeEventListener("keydown", this._kd); window.removeEventListener("keyup", this._ku); this._kd = null; }
    if (this._io) { this._io.disconnect(); this._io = null; }
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = { ...GV_LABELS, name: "Titre (facultatif)", hero: "Héros", player: "Prénom du joueur (facultatif)", difficulty: "Difficulté", lives: "Nombre de vies", sound: "Sons", light_entity: "Lumière qui clignote à chaque niveau réussi (facultatif)", best_score_entity: "input_number du meilleur score (facultatif)", unlock_entity: "Étoiles bonus nécessaires pour jouer : compteur (facultatif, rien n'est dépensé)", unlock_min: "Étoiles minimum pour jouer", theme: "Thème" };
class AventurePixelCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...DEFAULTS, ...config }; if (!this._form) this._build(); else this._form.data = this._config; }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _build() {
    const el = document.createElement("ha-form");
    el.hass = this._hass; el.data = this._config; el.computeLabel = (s) => LABELS[s.name] || s.name;
    el.schema = [
      { type: "grid", name: "", schema: [
        { name: "hero", selector: { select: { mode: "dropdown", options: [{ value: "dino", label: "Petit dinosaure (jungle)" }, { value: "cube", label: "Aventurier en cubes (monde de blocs)" }] } } },
        { name: "player", selector: { text: {} } }] },
      { name: "name", selector: { text: {} } },
      { type: "grid", name: "", schema: [
        { name: "difficulty", selector: { select: { mode: "dropdown", options: [{ value: "facile", label: "Facile" }, { value: "normal", label: "Normal" }, { value: "difficile", label: "Difficile" }] } } },
        { name: "lives", selector: { number: { min: 1, max: 9, step: 1, mode: "box" } } }] },
      { type: "grid", name: "", schema: [
        { name: "sound", selector: { boolean: {} } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [{ value: "auto", label: "Automatique" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }] } } }] },
      { name: "light_entity", selector: { entity: { domain: "light" } } },
      { name: "best_score_entity", selector: { entity: { domain: ["input_number", "number"] } } },
      { type: "grid", name: "", schema: [
        { name: "unlock_entity", selector: { entity: { domain: ["counter", "input_number", "number", "sensor"] } } },
        { name: "unlock_min", selector: { number: { min: 1, max: 20, step: 1, mode: "box" } } }] },
      { type: "expandable", name: "", title: "Nuance de couleur", schema: GV_FIELDS },
    ];
    el.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const cfg = { ...ev.detail.value };
      ["name", "player", "light_entity", "best_score_entity", "unlock_entity"].forEach((k) => { if (!cfg[k]) delete cfg[k]; });
      this._config = cfg;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
    });
    this._form = el; this.appendChild(el);
  }
}

if (!customElements.get("aventure-pixel-card")) {
  customElements.define("aventure-pixel-card", AventurePixelCard);
  customElements.define("aventure-pixel-card-editor", AventurePixelCardEditor);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "aventure-pixel-card", name: "Aventure Pixel (FR)", description: "Petit jeu de plateforme en pixels : dinosaure ou aventurier en cubes, commandes tactiles et clavier.", preview: true });
}
console.info(`%c AVENTURE-PIXEL %c v${CARD_VERSION} `, "color:#fff;background:#3fae5a;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px", "color:#3fae5a;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px");
}
