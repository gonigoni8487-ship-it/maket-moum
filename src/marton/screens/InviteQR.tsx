import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Printer, QrCode } from 'lucide-react';
import { Section } from '../ui';

/** 직원 초대: 휴대폰 카메라로 찍으면 마트ON 설치 화면으로 이동 */
export default function InviteQR({ onToast }: { onToast: (m: string) => void }) {
  const url = `${window.location.origin}/marton/`;
  const [src, setSrc] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } }).then(setSrc, () => setSrc(''));
  }, [url]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); onToast('설치 주소를 복사했습니다.'); } catch { onToast(url); }
  };

  // 조회실·휴게실 게시용 안내문 인쇄
  const print = () => {
    const w = window.open('', '_blank');
    if (!w || !src) return;
    const d = w.document;
    d.title = '마트ON 설치 안내';
    const wrap = d.createElement('div');
    wrap.style.cssText = 'font-family:system-ui,sans-serif;text-align:center;padding:40px';
    const h = d.createElement('h1'); h.textContent = '마트ON 설치 안내'; h.style.fontSize = '40px';
    const img = d.createElement('img'); img.src = src; img.style.width = '360px';
    const steps = d.createElement('ol');
    steps.style.cssText = 'text-align:left;display:inline-block;font-size:20px;line-height:1.8';
    [
      '휴대폰 카메라로 QR을 찍어 접속',
      '안드로이드: 메뉴 ⋮ → "앱 설치" / 아이폰: 공유 → "홈 화면에 추가"',
      '홈 화면의 마트ON 실행 → 사번·이름·부서로 로그인',
      '"푸시 알림 켜기"를 눌러 허용',
    ].forEach(t => { const li = d.createElement('li'); li.textContent = t; steps.appendChild(li); });
    const link = d.createElement('p'); link.textContent = url; link.style.cssText = 'font-size:18px;color:#475569';
    wrap.append(h, img, link, steps);
    d.body.appendChild(wrap);
    img.onload = () => w.print();
  };

  return (
    <Section title="직원 초대 QR">
      <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
        {src ? <img src={src} alt="마트ON 설치 QR" className="size-28 shrink-0 rounded-lg" /> : <QrCode className="size-28 text-slate-300" />}
        <div className="min-w-0 space-y-2 text-sm">
          <p className="text-slate-600">휴대폰 카메라로 찍으면 설치 화면으로 이동합니다. 조회실에 인쇄해 붙여 두세요.</p>
          <p className="truncate font-mono text-xs text-slate-500">{url}</p>
          <div className="flex gap-2">
            <button onClick={copy} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"><Copy className="size-3.5" />주소 복사</button>
            <button onClick={print} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Printer className="size-3.5" />안내문 인쇄</button>
          </div>
        </div>
      </div>
    </Section>
  );
}
