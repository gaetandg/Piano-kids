// Tour complet : joue toutes les missions des planètes demandées en mode « écran », sans faute,
// vérifie les étoiles et prend des captures. Le robot « entend » les notes jouées par l'app
// (fréquences des oscillateurs) pour les jeux à l'oreille.
// Lancer : npx http-server -p 8080 -c-1 &  puis
//   node tests/planets.cjs p1 p2 …   [--port] (portrait seulement)   [--only=id1,id2]
const { chromium } = require(process.env.PW_PATH || 'playwright');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE || 'http://localhost:8080/';
const OUT = path.join(__dirname, 'screens', 'planets') + '/';
const PLANETS = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const NAMES = { Do: 0, 'Do♯': 1, Ré: 2, 'Ré♯': 3, Mi: 4, Fa: 5, 'Fa♯': 6, Sol: 7, 'Sol♯': 8, La: 9, 'La♯': 10, Si: 11 };
const FLATS = { Do: 0, 'Ré♭': 1, Ré: 2, 'Mi♭': 3, Mi: 4, Fa: 5, 'Sol♭': 6, Sol: 7, 'La♭': 8, La: 9, 'Si♭': 10, Si: 11 };
const ALL = { ...NAMES, ...FLATS };
const WHITE = [0, 2, 4, 5, 7, 9, 11];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const results = [];
  let failed = 0;
  const viewports = [
    { width: 412, height: 880, tag: 'port' },
    { width: 880, height: 412, tag: 'land' },
  ].filter((v) => !process.argv.includes('--port') || v.tag === 'port');
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__f = [];
      const d = Object.getOwnPropertyDescriptor(AudioParam.prototype, 'value');
      Object.defineProperty(AudioParam.prototype, 'value', {
        get() {
          return d.get.call(this);
        },
        set(v) {
          if (v > 25 && v < 5000) window.__f.push({ t: performance.now(), v });
          d.set.call(this, v);
        },
      });
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.stack || e.message));
    page.on('console', (m) => m.type() === 'warning' && errors.push('warn: ' + m.text()));
    await page.goto(BASE);
    await page.fill('.name-input', 'Tom');
    await page.click('text=C’est parti');
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('pianoKids.v1'));
      d.settings.voice = false;
      d.settings.unlockAll = true;
      d.profiles[0].inputMode = 'screen';
      localStorage.setItem('pianoKids.v1', JSON.stringify(d));
    });
    await page.reload();
    await page.click('.profile-card >> nth=0');
    await page.waitForTimeout(300);

    const missions = await page.evaluate(async (ids) => {
      const c = await import('/js/curriculum.js');
      return c.PLANETS.filter((p) => ids.includes(p.id)).flatMap((p) => p.missions);
    }, PLANETS);

    const goGame = (id) =>
      page.evaluate((mid) => {
        history.pushState({ name: 'game', params: { mission: mid } }, '');
        dispatchEvent(new PopStateEvent('popstate', { state: { name: 'game', params: { mission: mid } } }));
      }, id);
    const keys = () => page.$$eval('.keyboard .key', (ks) => ks.map((k) => +k.dataset.midi));
    const tapMidi = async (m) => {
      const el = await page.$(`.keyboard .key[data-midi="${m}"]`);
      if (!el) throw new Error('touche absente ' + m);
      await el.tap();
    };
    const tapPc = async (p) => {
      const ms = await keys();
      const m = ms.find((x) => x % 12 === p && x >= 60) ?? ms.find((x) => x % 12 === p);
      await tapMidi(m);
    };
    // lit la note dessinée sur la portée (dans `sel`)
    const readStaff = (sel, clef) =>
      page.$eval(
        sel,
        (box, [WHITE, base]) => {
          const ls = [...box.querySelectorAll('svg > line.st-line')].slice(0, 5).map((l) => +l.getAttribute('y1'));
          const gap = ls[1] - ls[0];
          const cy = +box.querySelector('.sn-head').getAttribute('cy');
          const step = Math.round(base + ((ls[4] - cy) * 2) / gap);
          const oct = Math.floor(step / 7);
          const acc = box.querySelector('.st-acc');
          const shift = !acc ? 0 : acc.textContent === '♭' ? -1 : 1;
          return 60 + 12 * oct + WHITE[((step % 7) + 7) % 7] + shift;
        },
        [WHITE, clef === 'fa' ? -10 : 2],
      );
    const clearHeard = () => page.evaluate(() => (window.__f = []));
    // notes entendues : une note = un groupe d'oscillateurs créés au même instant (on garde la plus grave)
    const heard = () =>
      page.evaluate(() => {
        const out = [];
        let g = null;
        for (const e of window.__f) {
          if (g && e.t - g.t < 4) g.v = Math.min(g.v, e.v);
          else out.push((g = { t: e.t, v: e.v }));
        }
        return out.map((x) => Math.round(69 + 12 * Math.log2(x.v / 440)));
      });
    const bubbleText = () => page.textContent('.bubble').catch(() => '');
    const done = () => page.$('.modal .result');
    const stars = () => page.$$eval('.modal .stars.big .star.on', (s) => s.length);
    // attend qu'un nouveau tour commence (le compteur change), puis joue
    const eachRound = async (play) => {
      let last = '';
      for (let r = 0; r < 600 && !(await done()); r++) {
        const c = await page.textContent('.counter').catch(() => '');
        if (c === last || !c) {
          await page.waitForTimeout(100);
          continue;
        }
        last = c;
        await play(c);
      }
    };

    for (const m of missions.filter((x) => !ONLY || ONLY.split(',').includes(x.id))) {
      await goGame(m.id);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}${m.id}-${vp.tag}.png` });
      try {
        if (m.type === 'intro') {
          for (let i = 0; i < m.slides.length; i++) {
            const s = m.slides[i];
            if ((s.staff || s.img) && vp.tag === 'port') await page.screenshot({ path: `${OUT}${m.id}-s${i}.png` });
            if (s.try && s.try.seq) for (const p of s.try.seq) (await tapPc(p), await page.waitForTimeout(150));
            if (s.try && s.try.chord) for (const x of s.try.chord) (await tapMidi(x), await page.waitForTimeout(150));
            if (s.try && s.try.any) for (let k = 0; k < (s.try.count || 1); k++) (await tapPc(0), await page.waitForTimeout(250));
            if (s.try) await page.waitForTimeout(800);
            await page.click(i === m.slides.length - 1 ? 'button:has-text("Terminer")' : 'button:has-text("Suivant")');
            await page.waitForTimeout(200);
          }
        } else if (m.type === 'playnote' || m.type === 'namenote') {
          await eachRound(async () => {
            await page.waitForTimeout(200);
            if (m.type === 'playnote') {
              let t;
              if (m.ear) {
                await page.waitForTimeout(700);
                const hs = await heard();
                t = hs[hs.length - 1];
                await clearHeard();
              } else if (m.chord) {
                // accord : on joue toutes les touches montrées
                const ts = await page.$$eval('.keyboard .key.target', (k) => k.map((x) => +x.dataset.midi));
                for (const x of ts) (await tapMidi(x), await page.waitForTimeout(90));
                return;
              } else if (m.display === 'staff') t = await readStaff('.staff-box', m.clef);
              else {
                const name = (await page.textContent('.note-bubble')).trim();
                const key = Object.keys(ALL).find((k) => k.toUpperCase() === name);
                t = m.notes.find((x) => ALL[key] === x % 12);
              }
              await tapMidi(t);
            } else {
              const t =
                m.display === 'staff'
                  ? await readStaff('.staff-box', m.clef)
                  : +(await page.getAttribute('.keyboard .key.mystery', 'data-midi'));
              const table = m.flats ? FLATS : NAMES;
              const name = Object.keys(table).find((k) => table[k] === t % 12);
              await page.click(`.choice:text-is("${name}")`);
            }
          });
        } else if (m.type === 'findkey' && m.findAll) {
          const ms = (await keys()).filter((x) => x % 12 === m.findAll.pc);
          for (const x of ms) (await tapMidi(x), await page.waitForTimeout(250));
        } else if (m.type === 'findkey') {
          let last = '';
          for (let r = 0; r < 400 && !(await done()); r++) {
            const c = await page.textContent('.counter').catch(() => '');
            const txt = await page.textContent('.big-prompt').catch(() => '');
            if (c + txt === last || !txt) {
              await page.waitForTimeout(150);
              continue;
            }
            await page.waitForTimeout(150);
            last = c + txt;
            const pr = m.prompts.find((q) => q.text === txt);
            const ms = await keys();
            const t = ms.find(
              (x) =>
                pr.pcs.includes(x % 12) &&
                (pr.min == null || x >= pr.min) &&
                (pr.max == null || x <= pr.max) &&
                (pr.zone !== 'middle' || x === 60) &&
                (pr.zone !== 'low' || x < 60) &&
                (pr.zone !== 'high' || x > 60),
            );
            await tapMidi(t);
          }
        } else if (m.type === 'highlow' || m.type === 'samediff' || m.type === 'listen') {
          // jeux d'écoute : deux réponses, on décide d'après ce que l'app a joué
          await eachRound(async () => {
            await clearHeard();
            await page.waitForTimeout(m.type === 'listen' ? 2600 : 1900);
            const hs = await heard();
            let sel;
            if (m.type === 'highlow') sel = hs.length >= 2 && hs[1] > hs[0] ? '.hl-btn.high' : '.hl-btn.low';
            else if (m.type === 'samediff') sel = hs.length >= 2 && hs[0] === hs[1] ? '.hl-btn.same' : '.hl-btn.diff';
            else sel = await page.evaluate(() => '.hl-btn.' + document.querySelector('.listen-game')._answer);
            // le jeu n'accepte la réponse qu'une fois l'exemple fini : on réessaie
            for (let k = 0; k < 30; k++) {
              await page.click(sel);
              await page.waitForTimeout(300);
              if (/^(Oui|Non)/.test(await bubbleText())) break;
            }
          });
        } else if (m.type === 'simon') {
          for (let r = 0; r < 600 && !(await done()); r++) {
            const t = await bubbleText();
            if (/^(Écoute|Bip bip)/.test(t)) {
              await clearHeard();
              while (!(await bubbleText()).startsWith('À toi') && !(await done())) await page.waitForTimeout(80);
              if (await done()) break;
              const hs = await heard();
              for (const x of hs) (await tapMidi(x), await page.waitForTimeout(150));
              await page.waitForTimeout(300);
            } else await page.waitForTimeout(80);
          }
        } else if (m.type === 'compose') {
          const black = m.mode === 'black';
          const tune = black
            ? [61, 63, 66, 68, 70, 68, 66, 63, 61, 63, 66, 68]
            : [64, 62, 65, 64, 67, 65, 62, 64, 65, 62, 64, 62, 60];
          const melodyFor = (n) => (black ? tune.slice(0, n) : [...tune.slice(0, n - 1), 60]);
          if (m.mode === 'answer') {
            for (let r = 0; r < (m.rounds || m.questions.length); r++) {
              for (let k = 0; k < 200 && !(await bubbleText()).startsWith('À toi'); k++) await page.waitForTimeout(100);
              for (const x of melodyFor(m.len)) (await tapMidi(x), await page.waitForTimeout(180));
              for (let k = 0; k < 200 && (await bubbleText()).startsWith('À toi'); k++) await page.waitForTimeout(100);
            }
          } else {
            await page.waitForTimeout(600);
            for (const x of melodyFor(m.len)) (await tapMidi(x), await page.waitForTimeout(180));
            await page.waitForSelector('button:has-text("Terminer")', { timeout: 20000 });
            await page.click('button:has-text("Terminer")');
          }
        } else if (m.type === 'chord') {
          // les 3 notes de l'accord affiché ; on réessaie tant que Cosmo chante encore
          await eachRound(async () => {
            for (let k = 0; k < 40; k++) {
              const ns = await page.evaluate(() => document.querySelector('.chord-card')._notes);
              for (const x of ns) (await tapMidi(x), await page.waitForTimeout(120));
              await page.waitForTimeout(300);
              if (/Bravo|Super|Parfait|Ça sonne|Boum|orchestre/.test(await bubbleText()) || (await done())) break;
              await page.waitForTimeout(400);
            }
          });
        } else if (m.type === 'rain') {
          // vitesse tortue : la note attend, on joue la touche montrée
          for (let k = 0; k < 600 && !(await done()); k++) {
            const t = await page.$('.keyboard .key.target');
            if (t) await t.tap().catch(() => {});
            await page.waitForTimeout(200);
          }
        } else if (m.type === 'rhythm') {
          results.push(`${vp.tag} ${m.id} (rhythm) ignoré (voir tests/rain.cjs pour le rythme)`);
          continue;
        } else if (m.type === 'song') {
          const notes = await page.evaluate(
            async (id) => (await import('/js/songs.js')).getSong(id).notes.map((n) => n.midi),
            m.song,
          );
          await page.waitForTimeout(300);
          for (let k = 0; k < notes.length; k++) {
            await tapMidi(notes[k]);
            await page.waitForTimeout(70);
            if (k === 5 && vp.tag === 'port') await page.screenshot({ path: `${OUT}${m.id}-mid.png` });
          }
        }
        await page.waitForSelector('.modal .result', { timeout: 8000 });
        await page.waitForTimeout(1600);
        const st = m.type === 'intro' ? '-' : await stars();
        if (st !== '-' && st !== 3) failed++;
        results.push(`${vp.tag} ${m.id} (${m.type}) → ${st}`);
      } catch (e) {
        failed++;
        await page.screenshot({ path: `${OUT}${m.id}-${vp.tag}-ERR.png` });
        results.push(`${vp.tag} ${m.id} ✘ ${e.message.split('\n')[0]}`);
      }
    }
    if (errors.length) {
      failed++;
      results.push(vp.tag + ' ERREURS: ' + errors.join(' | '));
    }
    await ctx.close();
  }
  console.log(results.join('\n'));
  console.log(failed ? `\n${failed} problème(s)` : '\nTout est OK');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
