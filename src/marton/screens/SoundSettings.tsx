import { useRef, useState } from 'react';
import { Music, Play, RotateCcw, Upload } from 'lucide-react';
import { COUPON_ARRIVED, MAX_SOUND_BYTES, SOUND_KINDS, SOUND_LABEL, birthdayMessage, type StoreSound, type StoreSoundKind } from '../shared';
import { api } from '../api';
import { alert, callPhrase, celebrateBirthday, loadPrefs } from '../alerts';
import { Section } from '../ui';

const HINT: Record<StoreSoundKind, string> = {
  birthday: '생일날 축하 음성 전에 나옵니다 (최대 30초)',
  coupon: '커피쿠폰이 도착하면 나옵니다 (최대 6초)',
  call: '요청·방송·중회·소비기한 호출 때 나옵니다 (최대 6초)',
};
const readDataUrl = (f: File) => new Promise<string>((ok, fail) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = fail; r.readAsDataURL(f); });

/** 점장·부점장: 앱 소리 바꾸기 — 올린 소리는 모든 직원 휴대폰에 적용 */
export default function SoundSettings({ sounds, myName, myDept, onError, onToast }: {
  sounds: StoreSound[]; myName: string; myDept: string; onError: (m: string) => void; onToast: (m: string) => void;
}) {
  const [busy, setBusy] = useState<StoreSoundKind | null>(null);
  const inputs = useRef<Partial<Record<StoreSoundKind, HTMLInputElement | null>>>({});

  const upload = async (kind: StoreSoundKind, f?: File) => {
    if (!f) return;
    if (f.size > MAX_SOUND_BYTES) return onError('소리 파일은 1.5MB까지 올릴 수 있습니다. 짧게 자르거나 낮은 음질(128kbps)로 저장해 주세요.');
    if (!/\.(mp3|m4a|aac|wav|ogg)$/i.test(f.name)) return onError('MP3·M4A·WAV·OGG 소리 파일을 올려 주세요.');
    setBusy(kind);
    try {
      await api('/sounds', { kind, name: f.name, data: await readDataUrl(f) });
      onToast(`${SOUND_LABEL[kind]} 소리를 바꿨습니다. 모든 직원 휴대폰에 적용됩니다.`);
    } catch (e) { onError((e as Error).message); } finally { setBusy(null); }
  };
  const reset = async (kind: StoreSoundKind) => {
    setBusy(kind);
    try { await api(`/sounds/${kind}/reset`, {}); onToast(`${SOUND_LABEL[kind]} 소리를 기본 소리로 되돌렸습니다.`); }
    catch (e) { onError((e as Error).message); } finally { setBusy(null); }
  };
  const preview = (kind: StoreSoundKind) => {
    const prefs = { ...loadPrefs(), sound: true, call: true };
    if (kind === 'birthday') void celebrateBirthday(birthdayMessage(myName));
    else if (kind === 'coupon') void alert({ title: `☕ ${COUPON_ARRIVED}`, body: '미리 듣기', urgent: false, tag: 'test', prefs, tone: 'coupon', announce: COUPON_ARRIVED });
    else void alert({ title: '호출음 미리 듣기', body: '미리 듣기', urgent: false, tag: 'test', prefs, tone: 'call', announce: callPhrase(myDept, '미리 듣기') });
  };

  return (
    <Section title="앱 소리 바꾸기">
      <div className="space-y-3 rounded-2xl bg-white p-4">
        <p className="text-xs leading-relaxed text-slate-500">
          MP3 등 소리 파일(1.5MB까지)을 올리면 모든 직원 휴대폰의 소리가 바뀝니다.
          가요 등 저작권이 있는 음악은 사용 허락을 받은 경우에만 올려 주세요. 무료 음원이나 직접 녹음한 축하 메시지도 좋습니다.
        </p>
        {SOUND_KINDS.map(kind => {
          const cur = sounds.find(x => x.kind === kind);
          return (
            <div key={kind} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <Music className="size-4 text-slate-500" />
                <span className="font-bold text-slate-900">{SOUND_LABEL[kind]}</span>
                <span className="ml-auto min-w-0 truncate text-xs text-slate-500">{cur ? cur.name : '기본 소리'}</span>
              </div>
              <p className="text-xs text-slate-400">{HINT[kind]}</p>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button onClick={() => preview(kind)} className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 py-2 text-slate-700"><Play className="size-3.5" />듣기</button>
                <button onClick={() => inputs.current[kind]?.click()} disabled={busy === kind} className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 py-2 text-white disabled:opacity-50"><Upload className="size-3.5" />{busy === kind ? '올리는 중…' : '파일 올리기'}</button>
                <button onClick={() => reset(kind)} disabled={!cur || busy === kind} className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 py-2 text-slate-700 disabled:opacity-40"><RotateCcw className="size-3.5" />기본으로</button>
              </div>
              <input ref={el => { inputs.current[kind] = el; }} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg" hidden onChange={e => { void upload(kind, e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          );
        })}
      </div>
    </Section>
  );
}
