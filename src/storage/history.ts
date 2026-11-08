// 学習記録（端末の localStorage。個人利用なのでサーバ不要）
import type { Category } from '../shapes';
import type { Kind } from '../quiz/generator';

export interface Rec {
  t: number; // 回答時刻
  k: Kind;
  h?: boolean; // ヒント使用
  s: string; // 形状 ID
  c: Category;
  lv: number;
  ok: boolean;
  ms: number;
}
export interface Session { t: number; mode: string; lv: number; n: number; ok: number; score: number; ms: number }
interface Data { v: 1; recs: Rec[]; sessions: Session[]; best: Record<string, number> }

const KEY = 'kukan-trainer.v1';
const empty = (): Data => ({ v: 1, recs: [], sessions: [], best: {} });

function load(): Data {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) ?? '') as Data;
    return d && d.v === 1 ? d : empty();
  } catch {
    return empty();
  }
}
let data = load();
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch { /* 保存できない環境では無視 */ }
};

export const history = {
  get recs() { return data.recs; },
  get sessions() { return data.sessions; },
  best(key: string) { return data.best[key] ?? 0; },
  add(r: Rec) {
    data.recs.push(r);
    if (data.recs.length > 5000) data.recs.splice(0, data.recs.length - 5000);
    save();
  },
  endSession(s: Session, key: string) {
    data.sessions.push(s);
    if (data.sessions.length > 300) data.sessions.shift();
    const isBest = s.score > (data.best[key] ?? 0);
    if (isBest) data.best[key] = s.score;
    save();
    return isBest;
  },
  /** 苦手な形状ほど出やすくする重み（直近の誤答で増、正答で減） */
  weights(kinds?: Kind[]) {
    const w = new Map<string, number>();
    for (const r of data.recs.slice(-600)) {
      if (kinds && !kinds.includes(r.k)) continue;
      const cur = w.get(r.s) ?? 1;
      w.set(r.s, Math.min(6, Math.max(0.4, r.ok && !r.h ? cur * 0.8 : cur + (r.ok ? 0.5 : 2))));
    }
    return w;
  },
  exportJSON: () => JSON.stringify(data),
  reset() {
    data = empty();
    save();
  },
};
