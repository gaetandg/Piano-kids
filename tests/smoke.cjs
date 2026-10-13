// Test de fumée : parcourt les écrans principaux dans Chromium (format téléphone)
// et vérifie qu'il n'y a pas d'erreur JavaScript. Fait des captures d'écran.
// Lancer : npx http-server -p 8080 -c-1 &  puis  node tests/smoke.cjs [dossier-captures]
const { chromium } = require(process.env.PW_PATH || 'playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:8080/';
const OUT = process.argv[2] || path.join(__dirname, 'screens');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
  });
  const errors = [];
  const run = async (name, viewport, fn) => {
    const ctx = await browser.newContext({
      viewport,
      deviceScaleFactor: 2,
      hasTouch: true,
      isMobile: true,
      permissions: ['microphone'],
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[${name}] ${e.stack || e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] console: ${m.text()}`));
    await page.goto(BASE);
    await page.waitForTimeout(400);
    try {
      await fn(page, (n) => page.screenshot({ path: path.join(OUT, `${name}-${n}.png`) }));
    } catch (e) {
      errors.push(`[${name}] ${e.message}`);
      await page.screenshot({ path: path.join(OUT, `${name}-ERROR.png`) });
    }
    await ctx.close();
  };

  const portrait = { width: 400, height: 860 };
  const landscape = { width: 860, height: 400 };

  for (const [name, vp] of [
    ['p', portrait],
    ['l', landscape],
  ]) {
    await run(name, vp, async (page, shot) => {
      await shot('01-welcome');
      await page.fill('.name-input', 'Léa');
      await page.click('text=C’est parti');
      await page.waitForTimeout(400);
      await shot('02-hub');
      // première planète
      await page.click('.planet-card >> nth=0');
      await page.waitForTimeout(300);
      await shot('03-planet');
      await page.click('.mission >> nth=0');
      await page.waitForTimeout(800);
      await shot('04-intro');
      for (let i = 0; i < 4; i++) {
        await page.click('text=Suivant');
        await page.waitForTimeout(250);
      }
      await shot('05-intro-try');
      await page.goBack();
      await page.waitForTimeout(300);

      // Tout débloquer pour voir les jeux
      await page.evaluate(() => {
        const d = JSON.parse(localStorage.getItem('pianoKids.v1'));
        d.settings.unlockAll = true;
        d.profiles[0].inputMode = 'screen';
        localStorage.setItem('pianoKids.v1', JSON.stringify(d));
      });
      await page.reload();
      await page.waitForTimeout(400);
      const games = [
        'p1-highlow',
        'p1-black23',
        'p2-finddo',
        'p2-rhythm',
        'p3-name',
        'p3-play',
        'p3-simon',
        'p3-song2',
        'p4-intro',
        'p6-song3',
      ];
      for (const g of games) {
        await page.evaluate((id) => {
          history.pushState({ name: 'game', params: { mission: id } }, '');
          dispatchEvent(new PopStateEvent('popstate', { state: { name: 'game', params: { mission: id } } }));
        }, g);
        await page.waitForTimeout(g === 'p3-name' || g === 'p1-highlow' ? 2500 : 900);
        await shot('game-' + g);
      }
      // jouer quelques touches dans la chanson
      const keys = await page.$$('.key.white');
      if (keys.length) {
        await keys[0].tap();
        await page.waitForTimeout(200);
      }
      for (const scr of ['songs', 'free', 'album']) {
        await page.evaluate((s) => {
          history.pushState({ name: s, params: {} }, '');
          dispatchEvent(new PopStateEvent('popstate', { state: { name: s, params: {} } }));
        }, scr);
        await page.waitForTimeout(500);
        if (scr === 'free') {
          const k = await page.$$('.key.white');
          await k[2].tap();
          await page.waitForTimeout(150);
        }
        await shot('screen-' + scr);
      }
      await page.evaluate(() => {
        history.pushState({ name: 'stickerGuide', params: {} }, '');
        dispatchEvent(new PopStateEvent('popstate', { state: { name: 'stickerGuide', params: {} } }));
      });
      await page.waitForTimeout(300);
      await shot('screen-stickers');
    });
  }

  await browser.close();
  if (errors.length) {
    console.log('ERREURS :\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('OK, aucune erreur. Captures dans', OUT);
})();
