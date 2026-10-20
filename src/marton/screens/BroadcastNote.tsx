import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { cx } from '../ui';

// 방송 추가 지시사항: 전단 인식("수산물 행사만" → 수산물만 인식)과 원고 작성에 함께 쓰인다.
// 전단 올리기 화면과 방송 만들기 화면이 같은 값을 쓰도록 기기에 저장한다
const KEY = 'marton-broadcast-note';
export const loadBroadcastNote = () => { try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; } };
const storeNote = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* 저장 불가 */ } };

const EXAMPLES = ['수산물 행사만', '축산물 행사만', '과일·채소만', '1+1 상품만', '행사카드 할인 강조', '오늘 하루만 강조', '어르신도 알아듣게 또박또박'];

export function useBroadcastNote() {
  const [note, setNote] = useState(loadBroadcastNote);
  const save = (v: string) => { setNote(v); storeNote(v); };
  return [note, save] as const;
}

/** 전단 첨부 바로 밑에 두는 "추가 지시사항" 칸 */
export default function BroadcastNote({ note, onChange }: { note: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2 rounded-2xl border-2 border-pink-100 bg-white p-3">
      <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800" htmlFor="broadcast-note">
        <Pencil className="size-4 text-pink-600" />추가 지시사항 <span className="font-normal text-slate-400">(인식·원고에 반영)</span>
      </label>
      <textarea id="broadcast-note" rows={3} maxLength={500} value={note} onChange={e => onChange(e.target.value)} aria-label="추가 지시사항"
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] leading-relaxed outline-none focus:border-pink-500"
        placeholder={'전단을 올리기 전에 먼저 적어 주세요.\n예: 수산물 행사만 / 한우를 제일 먼저 길게 / 행사카드 할인 두 번 강조'} />
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map(x => (
          <button key={x} type="button" onClick={() => onChange(note.trim() ? `${note.trim()}\n${x}` : x)}
            className={cx('rounded-full border px-2.5 py-1 text-xs font-semibold', note.includes(x) ? 'border-pink-300 bg-pink-50 text-pink-700' : 'border-slate-200 bg-white text-slate-600 active:bg-slate-100')}>+ {x}</button>
        ))}
        {note && <button type="button" onClick={() => onChange('')} className="rounded-full px-2.5 py-1 text-xs font-semibold text-slate-400">지우기</button>}
      </div>
      <p className="text-xs text-slate-500">"수산물 행사만"처럼 쓰면 전단에서 그 상품만 인식하고, 원고도 이 지시대로 씁니다. 가격을 지어내거나 점포명·매대 위치를 넣는 지시는 반영하지 않습니다.</p>
    </div>
  );
}
