// 画面遷移とゲーム進行
import type { ManifoldToplevel } from 'manifold-3d';
import { Snapshotter, Viewer3D } from '../render/viewer3d';
import { ADV_KINDS, KIND_LABEL, ORTHO_KINDS, makeQuestion, type Kind, type Level, type Mode, type Option, type Question } from '../quiz/generator';
import { dimsOf } from '../quiz/ortho';
import { getBuilt } from '../quiz/shapeCache';
import { history, type Rec } from '../storage/history';
import { SHAPES, CATEGORY_LABEL, type Category } from '../shapes';
import { projectHLR } from '../geometry/hlr';
import { viewFrame, VIEWS, type ViewName } from '../geometry/frame';
import { drawingSVG } from '../render/svg2d';

interface Settings { mode: Mode; level: Level; count: number; lock: boolean }

const MODE_LABEL: Record<Mode, string> = { section: '断面', view: '矢視', ortho: '三面図', adv: '応用', mix: 'ミックス' };
const MODE_KINDS: Record<Mode, Kind[] | undefined> = { section: ['section'], view: ['view'], ortho: ORTHO_KINDS, adv: ADV_KINDS, mix: undefined };
const HINT_LABEL: Partial<Record<Kind, string>> = { section: 'ヒント：切断線', view: 'ヒント：透視', aux: 'ヒント：透視', points: 'ヒント：切断面', rotate: 'ヒント：回転を見る' };
const SECTION_KINDS: Kind[] = ['section', 'points'];
const LEVEL_LABEL: Record<Level, string> = { 1: 'やさしい', 2: 'ふつう', 3: 'むずかしい', 4: 'エキスパート' };
const SKEY = 'kukan-trainer.settings';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const fmtSec = (ms: number) => (ms / 1000).toFixed(1) + '秒';

export class App {
  private viewer: Viewer3D;
  private stage: HTMLElement;
  private settings: Settings;
  // ゲーム状態
  private q: Question | null = null;
  private nextQ: Question | null = null;
  private idx = 0;
  private score = 0;
  private streak = 0;
  private okCount = 0;
  private nAnswered = 0;
  private totalMs = 0;
  private qStart = 0;
  private answered = false;
  private mistakes: { q: Question; chosen: number }[] = [];
  private timer = 0;
  private hintUsed = false;
  private board: HTMLElement;
  private snap: Snapshotter | null = null;
  private imgCache = new WeakMap<object, string>();

  constructor(private root: HTMLElement, private w: ManifoldToplevel) {
    this.stage = document.createElement('div');
    this.stage.className = 'stage';
    this.viewer = new Viewer3D(this.stage);
    this.board = document.createElement('div');
    this.board.className = 'board';
    this.board.hidden = true;
    this.stage.appendChild(this.board);
    this.warmup();
    let s: Partial<Settings> = {};
    try { s = JSON.parse(localStorage.getItem(SKEY) ?? '{}'); } catch { /* noop */ }
    this.settings = { mode: 'section', level: 1, count: 10, lock: false, ...s };
    this.home();
  }

  /** 空き時間に全形状の寸法を求めておく（三面図問題の誤答候補選びを速くする） */
  private warmup() {
    const ids = SHAPES.slice();
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb) : setTimeout(cb, 30));
    const step = () => {
      const t0 = performance.now();
      while (ids.length && performance.now() - t0 < 12) dimsOf(this.w, ids.shift()!);
      if (ids.length) idle(step);
    };
    idle(step);
  }

  private optImage(o: Option) {
    let url = this.imgCache.get(o.mesh!);
    if (!url) {
      this.snap ??= new Snapshotter();
      url = this.snap.render(o.mesh!);
      this.imgCache.set(o.mesh!, url);
    }
    return `<img class="snap" src="${url}" alt="">`;
  }

  private figOf(o: Option) {
    return o.svg ?? this.optImage(o);
  }

  private showBoard(on: boolean) {
    this.board.hidden = !on;
  }

  private saveSettings() {
    try { localStorage.setItem(SKEY, JSON.stringify(this.settings)); } catch { /* noop */ }
  }

  private mountStage(slot: HTMLElement) {
    slot.replaceWith(this.stage);
    this.viewer.resize();
  }

  // ---------------- ホーム ----------------
  home() {
    clearInterval(this.timer);
    const st = this.settings;
    const seg = <T extends string | number>(name: string, vals: T[], label: (v: T) => string, cur: T) =>
      `<div class="seg" data-name="${name}">${vals.map((v) => `<button class="${v === cur ? 'on' : ''}" data-v="${v}">${label(v)}</button>`).join('')}</div>`;
    const total = history.recs.length;
    const acc = total ? Math.round((100 * history.recs.filter((r) => r.ok).length) / total) : 0;
    this.root.innerHTML = `
      <div class="screen home">
        <header class="hero">
          <h1>空間認識トレーナー</h1>
          <p>断面と矢視をすばやく正確に。全${SHAPES.length}形状</p>
        </header>
        <section class="card">
          <h2>モード</h2>
          ${seg('mode', ['section', 'view', 'ortho', 'adv', 'mix'] as Mode[], (v) => MODE_LABEL[v], st.mode)}
          <h2>難易度</h2>
          ${seg('level', [1, 2, 3, 4] as Level[], (v) => LEVEL_LABEL[v], st.level)}
          <h2>問題数</h2>
          ${seg('count', [10, 20, 0], (v) => (v ? `${v}問` : 'エンドレス'), st.count)}
          <label class="chk"><input type="checkbox" id="lock" ${st.lock ? 'checked' : ''}> 回答前は3Dを回転させない（上級）</label>
          <button class="primary big" id="start">スタート</button>
          <p class="best">ベスト：${history.best(this.bestKey()) || '—'} 点</p>
        </section>
        <nav class="links">
          <button id="stats">成績<small>${total}問・正答率${acc}%</small></button>
          <button id="gallery">形状ギャラリー<small>三面図で予習</small></button>
          <button id="help">遊び方</button>
        </nav>
      </div>`;
    this.root.querySelectorAll<HTMLElement>('.seg').forEach((el) =>
      el.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest('button');
        if (!b) return;
        const name = el.dataset.name as keyof Settings;
        const v = b.dataset.v!;
        (this.settings as unknown as Record<string, unknown>)[name] = name === 'mode' ? v : Number(v);
        this.saveSettings();
        this.home();
      }),
    );
    this.root.querySelector<HTMLInputElement>('#lock')!.onchange = (e) => {
      this.settings.lock = (e.target as HTMLInputElement).checked;
      this.saveSettings();
    };
    this.root.querySelector('#start')!.addEventListener('click', () => this.startGame());
    this.root.querySelector('#stats')!.addEventListener('click', () => this.stats());
    this.root.querySelector('#gallery')!.addEventListener('click', () => this.gallery());
    this.root.querySelector('#help')!.addEventListener('click', () => this.help());
  }

  private bestKey() {
    const s = this.settings;
    return `${s.mode}-${s.level}-${s.count}`;
  }

  // ---------------- ゲーム ----------------
  private startGame() {
    this.idx = 0; this.nAnswered = 0; this.score = 0; this.streak = 0; this.okCount = 0; this.totalMs = 0;
    this.mistakes = [];
    this.nextQ = null;
    this.root.innerHTML = `
      <div class="screen game">
        <header class="bar">
          <button class="icon" id="quit" aria-label="終了">✕</button>
          <div class="prog" id="prog"></div>
          <div class="score"><span id="score">0</span>点</div>
          <div class="time" id="time">0.0</div>
        </header>
        <div class="stage-slot"></div>
        <div class="tools">
          <span class="badge" id="tag"></span>
          <button class="chip hint" id="hint"></button>
          <button class="chip" id="reset">視点リセット</button>
        </div>
        <p class="prompt" id="prompt"></p>
        <div class="opts" id="opts"></div>
        <div class="feedback" id="fb"></div>
      </div>`;
    this.mountStage(this.root.querySelector('.stage-slot')!);
    this.root.querySelector('#quit')!.addEventListener('click', () => (this.nAnswered > 0 ? this.result() : this.home()));
    this.root.querySelector('#reset')!.addEventListener('click', () => this.viewer.resetCamera());
    this.root.querySelector('#hint')!.addEventListener('click', () => this.useHint());
    this.nextQuestion();
  }

  private gen(): Question {
    return makeQuestion(this.w, this.settings.mode, this.settings.level, history.weights(MODE_KINDS[this.settings.mode]));
  }

  private nextQuestion() {
    const { count } = this.settings;
    if (count && this.idx >= count) return this.result();
    const q = (this.q = this.nextQ ?? this.gen());
    this.nextQ = null;
    this.answered = false;
    this.hintUsed = false;
    window.scrollTo(0, 0); // 回答後にスクロールした位置から戻す
    const b = getBuilt(this.w, q.shape);
    if (q.showModel) {
      this.viewer.setShape(b.mesh);
      if (q.kind === 'section') {
        this.viewer.addPlane(q.frame, q.d!);
        this.viewer.addViewArrow(q.frame);
      } else if (q.kind === 'view' || q.kind === 'aux') this.viewer.addViewArrow(q.frame, 'A');
      else if (q.kind === 'points') {
        this.viewer.addPoints(q.points!, ['P', 'Q', 'R']);
        this.viewer.addViewArrow(q.frame);
      } else if (q.kind === 'rotate') {
        this.viewer.addRotationIndicator(q.rots!);
        this.viewer.addViewArrow(q.frame, 'A');
      }
    } else this.viewer.clear();
    this.board.innerHTML = q.board ?? '';
    this.showBoard(!!q.board);
    this.viewer.setInteractive(!this.settings.lock);
    const hint = this.root.querySelector<HTMLButtonElement>('#hint')!;
    hint.hidden = !HINT_LABEL[q.kind];
    hint.disabled = false;
    hint.textContent = (HINT_LABEL[q.kind] ?? '') + '（得点½）';
    const $ = (id: string) => this.root.querySelector<HTMLElement>('#' + id)!;
    $('prog').textContent = count ? `${this.idx + 1} / ${count}` : `${this.idx + 1}問目`;
    // 三面図→立体では形状名が答えになるので伏せる
    $('tag').textContent = `${KIND_LABEL[q.kind]}｜${CATEGORY_LABEL[q.shape.cat]}${q.kind === 'ortho3d' ? '' : '｜' + q.shape.name}`;
    $('prompt').textContent = q.prompt;
    $('fb').innerHTML = '';
    const opts = $('opts');
    opts.className = 'opts' + (q.options.length === 3 ? ' three' : '');
    opts.innerHTML = q.options.map((o, i) => `<button class="opt" data-i="${i}"><span class="lbl">${o.label ?? 'ABCD'[i]}</span>${this.figOf(o)}<span class="note"></span></button>`).join('');
    opts.querySelectorAll<HTMLButtonElement>('.opt').forEach((b) => b.addEventListener('click', () => this.answer(Number(b.dataset.i))));
    this.qStart = performance.now();
    clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      if (!this.answered) $('time').textContent = ((performance.now() - this.qStart) / 1000).toFixed(1);
    }, 100);
  }

  private useHint() {
    const q = this.q;
    if (!q || this.answered || this.hintUsed) return;
    this.hintUsed = true;
    if (q.kind === 'section') this.viewer.showCutLines(q.polys!, q.frame, q.d!);
    if (q.kind === 'view' || q.kind === 'aux') this.viewer.setXray(true);
    if (q.kind === 'points') this.viewer.addPlane(q.frame, q.d!);
    if (q.kind === 'rotate') this.viewer.animateRotation(q.rots!);
    const b = this.root.querySelector<HTMLButtonElement>('#hint')!;
    b.disabled = true;
    b.textContent = 'ヒント使用中';
  }

  private answer(i: number) {
    if (this.answered || !this.q) return;
    this.answered = true;
    const q = this.q;
    const ms = performance.now() - this.qStart;
    const ok = i === q.answer;
    this.totalMs += ms;
    this.nAnswered++;
    let gained = 0;
    if (ok) {
      this.streak++;
      this.okCount++;
      gained = 100 + Math.max(0, Math.round(50 * (1 - ms / 20000))) + Math.min(50, (this.streak - 1) * 10);
      if (this.hintUsed) gained = Math.round(gained / 2);
      this.score += gained;
    } else {
      this.streak = 0;
      this.mistakes.push({ q, chosen: i });
      navigator.vibrate?.(120);
    }
    const rec: Rec = { t: Date.now(), k: q.kind, s: q.shape.id, c: q.shape.cat, lv: this.settings.level, ok, ms: Math.round(ms), h: this.hintUsed || undefined };
    history.add(rec);
    // 選択肢に解説を表示
    this.root.querySelectorAll<HTMLElement>('.opt').forEach((el, j) => {
      el.classList.add(j === q.answer ? 'correct' : j === i ? 'wrong' : 'dim');
      el.querySelector('.note')!.textContent = q.options[j].note;
      (el as HTMLButtonElement).disabled = true;
    });
    this.root.querySelector('#score')!.textContent = String(this.score);
    this.root.querySelector('#time')!.textContent = (ms / 1000).toFixed(1);
    const fb = this.root.querySelector<HTMLElement>('#fb')!;
    fb.innerHTML = `
      <div class="res ${ok ? 'ok' : 'ng'}">${ok ? `正解！ +${gained}${this.streak > 1 ? `（${this.streak}連続）` : ''}${this.hintUsed ? '（ヒント使用）' : ''}` : '不正解'}</div>
      ${q.kind === 'ortho3d' ? `<div class="reveal-name">正解：${esc(q.shape.name)}</div>` : ''}
      <div class="row">
        <button class="chip" id="again">${SECTION_KINDS.includes(q.kind) ? '切断の様子を再生' : q.kind === 'rotate' ? '回転を再生' : q.board ? '図面 ⇄ 3D' : 'その方向から見る'}</button>
        <button class="primary" id="next">次へ ▶</button>
      </div>`;
    const show = () => {
      if (SECTION_KINDS.includes(q.kind)) this.viewer.revealSection(getBuilt(this.w, q.shape).m, q.frame, q.d!);
      else if (q.kind === 'ortho3d') this.viewer.resetCamera();
      else if (q.kind === 'rotate') {
        // 回転させてから、指定の方向へ視点を移す
        if (this.viewer.rotated) this.viewer.flyTo(q.frame, 1);
        else this.viewer.animateRotation(q.rots!, () => this.viewer.flyTo(q.frame, 1));
      }
      else this.viewer.flyTo(q.frame, 1);
    };
    this.viewer.setInteractive(true);
    this.viewer.setXray(false);
    if (!q.showModel) {
      // 図面から出題した問題は、答え合わせで立体を表示
      this.viewer.setShape(getBuilt(this.w, q.shape).mesh);
      this.showBoard(false);
    }
    show();
    fb.querySelector('#again')!.addEventListener('click', () => {
      if (SECTION_KINDS.includes(q.kind)) {
        this.viewer.setShape(getBuilt(this.w, q.shape).mesh);
        setTimeout(show, 50);
      } else if (q.kind === 'rotate') {
        this.viewer.resetCamera();
        this.viewer.animateRotation(q.rots!, () => this.viewer.flyTo(q.frame, 1));
      } else if (q.board) this.showBoard(this.board.hidden === true);
      else show();
    });
    fb.querySelector('#next')!.addEventListener('click', () => {
      this.idx++;
      this.nextQuestion();
    });
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // 次の問題を先に作っておく（アニメーションの後）
    setTimeout(() => { if (this.answered && !this.nextQ) this.nextQ = this.gen(); }, 900);
  }

  // ---------------- 結果 ----------------
  private result() {
    clearInterval(this.timer);
    const n = this.nAnswered;
    const s = this.settings;
    const isBest = n > 0 && history.endSession({ t: Date.now(), mode: s.mode, lv: s.level, n, ok: this.okCount, score: this.score, ms: Math.round(this.totalMs) }, this.bestKey());
    this.root.innerHTML = `
      <div class="screen result">
        <h1>結果</h1>
        <div class="big-score">${this.score}<small>点</small></div>
        ${isBest ? '<div class="best-badge">ベスト更新！</div>' : ''}
        <div class="kpis">
          <div><b>${this.okCount}/${n}</b><span>正解</span></div>
          <div><b>${n ? Math.round((100 * this.okCount) / n) : 0}%</b><span>正答率</span></div>
          <div><b>${n ? fmtSec(this.totalMs / n) : '—'}</b><span>平均時間</span></div>
        </div>
        ${this.mistakes.length ? `<h2>間違えた問題</h2><div class="miss">${this.mistakes.map(({ q, chosen }) => `
          <div class="miss-item"><div class="mi-h">${KIND_LABEL[q.kind]}｜${esc(q.shape.name)}</div>
            ${q.board ? `<div class="mi-board">${q.board}</div>` : ''}
            <div class="mi-figs"><div><span>あなた${q.options[chosen].label ? '：' + q.options[chosen].label : ''}</span>${this.figOf(q.options[chosen])}<em>${esc(q.options[chosen].note)}</em></div>
            <div><span>正解${q.options[q.answer].label ? '：' + q.options[q.answer].label : ''}</span>${this.figOf(q.options[q.answer])}${q.kind === 'wrongview' ? `<em>${esc(q.options[q.answer].note)}</em>` : ''}</div></div></div>`).join('')}</div>` : '<p class="perfect">全問正解！</p>'}
        <div class="row">
          <button class="primary big" id="again">もう一度</button>
          <button class="big" id="home">ホーム</button>
        </div>
      </div>`;
    this.root.querySelector('#again')!.addEventListener('click', () => this.startGame());
    this.root.querySelector('#home')!.addEventListener('click', () => this.home());
  }

  // ---------------- 成績 ----------------
  private stats() {
    const recs = history.recs;
    const agg = <K extends string>(key: (r: Rec) => K) => {
      const m = new Map<K, { n: number; ok: number; ms: number }>();
      for (const r of recs) {
        const k = key(r);
        const a = m.get(k) ?? { n: 0, ok: 0, ms: 0 };
        a.n++; if (r.ok) a.ok++; a.ms += r.ms;
        m.set(k, a);
      }
      return m;
    };
    const bar = (label: string, a?: { n: number; ok: number; ms: number }) => {
      const p = a && a.n ? Math.round((100 * a.ok) / a.n) : 0;
      return `<div class="bar-row"><span class="bl">${label}</span><div class="bt"><div class="bf" style="width:${p}%"></div></div><span class="bv">${a?.n ? `${p}%` : '—'}</span><span class="bn">${a?.n ? `${a.n}問 ${fmtSec(a.ms / a.n)}` : ''}</span></div>`;
    };
    const byKind = agg((r) => r.k);
    const byCat = agg((r) => r.c);
    const byShape = agg((r) => r.s);
    const weak = [...byShape.entries()].filter(([, a]) => a.n >= 2 && a.ok < a.n)
      .sort((x, y) => x[1].ok / x[1].n - y[1].ok / y[1].n).slice(0, 8);
    const sess = history.sessions.slice(-20);
    const maxS = Math.max(1, ...sess.map((s) => s.score));
    this.root.innerHTML = `
      <div class="screen stats">
        <header class="bar"><button class="icon" id="back">←</button><h1>成績</h1><span></span></header>
        <section class="card"><h2>問題タイプ別</h2>${(Object.keys(KIND_LABEL) as Kind[]).map((k) => bar(KIND_LABEL[k], byKind.get(k))).join('')}</section>
        <section class="card"><h2>形状カテゴリ別</h2>${(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => bar(CATEGORY_LABEL[c], byCat.get(c))).join('')}</section>
        <section class="card"><h2>苦手な形状</h2>${weak.length ? weak.map(([id, a]) => bar(esc(SHAPES.find((s) => s.id === id)?.name ?? id), a)).join('') : '<p class="muted">まだデータがありません</p>'}</section>
        <section class="card"><h2>最近のスコア</h2>
          ${sess.length ? `<div class="spark">${sess.map((s) => `<div title="${s.score}" style="height:${Math.max(4, (100 * s.score) / maxS)}%"></div>`).join('')}</div>` : '<p class="muted">まだデータがありません</p>'}
        </section>
        <button class="danger" id="reset">記録をリセット</button>
      </div>`;
    this.root.querySelector('#back')!.addEventListener('click', () => this.home());
    this.root.querySelector('#reset')!.addEventListener('click', () => {
      if (confirm('すべての学習記録を削除しますか？')) { history.reset(); this.stats(); }
    });
  }

  // ---------------- ギャラリー ----------------
  private gallery(selected?: string) {
    const cats = Object.keys(CATEGORY_LABEL) as Category[];
    this.root.innerHTML = `
      <div class="screen gallery">
        <header class="bar"><button class="icon" id="back">←</button><h1>形状ギャラリー</h1><span></span></header>
        <div class="stage-slot"></div>
        <div class="tools"><span class="badge" id="gname"></span><button class="chip" id="reset">視点リセット</button></div>
        <div class="views" id="views"></div>
        <div class="glist">${cats.map((c) => `<h2>${CATEGORY_LABEL[c]}</h2><div class="gchips">${SHAPES.filter((s) => s.cat === c).map((s) => `<button class="gchip" data-id="${s.id}">${esc(s.name)}<i>${'★'.repeat(s.diff)}</i></button>`).join('')}</div>`).join('')}</div>
      </div>`;
    this.mountStage(this.root.querySelector('.stage-slot')!);
    this.viewer.setInteractive(true);
    this.showBoard(false);
    this.root.querySelector('#back')!.addEventListener('click', () => this.home());
    this.root.querySelector('#reset')!.addEventListener('click', () => this.viewer.resetCamera());
    const show = (id: string) => {
      const def = SHAPES.find((s) => s.id === id)!;
      const b = getBuilt(this.w, def);
      this.viewer.setShape(b.mesh);
      this.root.querySelector('#gname')!.textContent = `${def.id}｜${def.name}`;
      const span = b.bb.size * 1.12;
      // 第三角法の配置：平面図を上、正面図を左下、右側面図を右下
      const v = (n: ViewName) => `<button class="vfig" data-v="${n}"><span>${VIEWS[n].label}</span>${drawingSVG(projectHLR(b.mesh, viewFrame(n)), span)}</button>`;
      this.root.querySelector('#views')!.innerHTML = `<div class="third">${v('top')}<div></div>${v('front')}${v('right')}</div>`;
      this.root.querySelectorAll<HTMLElement>('.vfig').forEach((el) => el.addEventListener('click', () => this.viewer.flyTo(viewFrame(el.dataset.v as ViewName), 1)));
      this.root.querySelectorAll('.gchip').forEach((el) => el.classList.toggle('on', (el as HTMLElement).dataset.id === id));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    this.root.querySelectorAll<HTMLElement>('.gchip').forEach((el) => el.addEventListener('click', () => show(el.dataset.id!)));
    show(selected ?? SHAPES[0].id);
  }

  private help() {
    this.root.innerHTML = `
      <div class="screen help">
        <header class="bar"><button class="icon" id="back">←</button><h1>遊び方</h1><span></span></header>
        <section class="card">
          <h2>断面当て</h2>
          <p>赤い面で立体を切ったとき、<b>矢印の向きに見た断面</b>を4つから選びます。斜線（ハッチング）の部分が切り口です。回答後、手前側が外れて切り口がオレンジ色で表示されます。</p>
          <h2>矢視当て</h2>
          <p><b>矢印Aの方向から見た図</b>を選びます。図は<b>第三角法</b>の考え方で、見えない稜線は<b>隠れ線（破線）</b>で描かれています。</p>
          <h2>三面図（3形式）</h2>
          <p><b>三面図→立体</b>：第三角法の三面図（平面図は上、右側面図は右）に合う立体を選びます。<br>
          <b>不足する1面</b>：2つの図から「？」に入る図を選びます。<br>
          <b>誤り探し</b>：立体と三面図を見比べ、誤っている図を1つ選びます。</p>
          <h2>ヒント</h2>
          <p>断面当てでは<b>切断線</b>（切断面と立体表面の交わる線のうち見える部分）、矢視当てでは<b>透視表示</b>が出ます。使うとその問題の得点が半分になり、苦手として記録されます。</p>
          <h2>応用（3形式）</h2>
          <p><b>回転後の図</b>：立体を指定の軸まわりに回したあとの図を選びます。軸は空間に固定した X・Y・Z 軸で、<b>右ねじの向きが＋</b>（軸の＋側から見て反時計回り）です。エキスパートでは2回続けて回します。<br>
          <b>斜め矢視</b>：斜面に直交する方向など、軸に平行でない方向から見た図（補助投影図）を選びます。<br>
          <b>3点を通る断面</b>：切断面は表示されません。赤い点P・Q・Rを通る平面を自分で思い描いて断面を選びます。</p>
          <h2>エキスパート</h2>
          <p>上級部品（複合角の穴、Y字管、クランク軸など）が多く出て、誤答の変形もより小さく紛らわしくなります。</p>
          <h2>座標系</h2>
          <p>Z軸が上です。正面図は −Y側から +Y方向を、平面図は上から、右側面図は +X側から見た図です。</p>
          <h2>操作</h2>
          <p>1本指で回転、2本指でズーム・移動ができます。</p>
          <h2>スコア</h2>
          <p>正解100点＋速さボーナス（最大50点）＋連続正解ボーナス。間違えた形状はあとで出やすくなります。</p>
        </section>
      </div>`;
    this.root.querySelector('#back')!.addEventListener('click', () => this.home());
  }
}
