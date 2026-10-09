// 소통 커피쿠폰 이미지 (PNG). 매장 자체 쿠폰이라 커피 브랜드 로고는 쓰지 않고, 사용처는 글자로만 적는다.
import type { Coupon } from './shared';

const W = 1080;
const H = 600;
const STUB = 330; // 오른쪽 떼는 쪽 너비

const date = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** 쿠폰 한 장을 그려 PNG data URL로 돌려준다 */
export function couponImage(c: Coupon): string {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  const font = (size: number, weight = 700) => `${weight} ${size}px "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
  const used = Boolean(c.usedAt);

  // 바탕: 크림색 종이 + 커피색 띠
  g.fillStyle = '#f3e9dc';
  roundRect(g, 0, 0, W, H, 36);
  g.fill();
  g.save();
  roundRect(g, 0, 0, W, H, 36);
  g.clip();
  g.fillStyle = used ? '#8a7f75' : '#4a2c1d';
  g.fillRect(0, 0, W - STUB, 120);
  g.fillStyle = used ? '#b8afa6' : '#c8956b';
  g.fillRect(W - STUB, 0, STUB, H);
  // 커피잔 물결 무늬
  g.strokeStyle = 'rgba(74,44,29,0.08)';
  g.lineWidth = 3;
  for (let y = 170; y < H; y += 46) {
    g.beginPath();
    for (let x = 0; x <= W - STUB; x += 10) g.lineTo(x, y + Math.sin(x / 40) * 8);
    g.stroke();
  }
  g.restore();

  // 떼는 선 (점선 + 반원 홈)
  g.setLineDash([14, 12]);
  g.strokeStyle = '#4a2c1d';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(W - STUB, 40);
  g.lineTo(W - STUB, H - 40);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#ffffff';
  [0, H].forEach(y => { g.beginPath(); g.arc(W - STUB, y, 28, 0, Math.PI * 2); g.fill(); });

  // 왼쪽: 제목·내용
  g.fillStyle = '#f3e9dc';
  g.font = font(30, 600);
  g.fillText(`${c.from.title ?? '점장'} 소통쿠폰`, 48, 52);
  g.font = font(54, 800);
  g.fillText('소통 커피쿠폰', 48, 104);

  g.fillStyle = '#4a2c1d';
  g.font = font(96, 900);
  g.fillText(c.item, 48, 250);
  g.font = font(32, 600);
  g.fillText(`사용처  ${c.place}`, 52, 320);
  g.fillText(`받는 분  ${c.to.name} (${c.to.dept}${c.to.level ? ` · ${c.to.level} 담당` : ''})`, 52, 368);
  g.fillText(`보낸 분  ${c.from.name} ${c.from.title ?? ''}`.trim(), 52, 416);
  if (c.message) {
    g.font = font(30, 500);
    g.fillStyle = '#7a4a2e';
    g.fillText(`“${c.message.slice(0, 32)}”`, 52, 476);
  }
  g.fillStyle = '#7a6a5e';
  g.font = font(26, 500);
  g.fillText(`유효기간 ${date(c.createdAt)} ~ ${date(c.expiresAt)}  ·  1장에 1잔`, 52, H - 44);

  // 오른쪽: 순서 번호·쿠폰 번호
  g.textAlign = 'center';
  const cx = W - STUB / 2;
  g.fillStyle = '#ffffff';
  g.font = font(34, 700);
  g.fillText('쿠폰', cx, 130);
  g.font = font(120, 900);
  g.fillText(String(c.no), cx, 270);
  g.font = font(36, 700);
  g.fillText(`/ ${c.total}장`, cx, 322);
  g.font = font(24, 600);
  g.fillText('No.', cx, 420);
  g.font = `700 28px ui-monospace, Menlo, monospace`;
  g.fillText(c.serial, cx, 458);

  // 사용 완료 도장
  if (used) {
    g.save();
    g.translate((W - STUB) / 2 + 60, H / 2 + 10);
    g.rotate(-0.22);
    g.strokeStyle = '#c2410c';
    g.fillStyle = '#c2410c';
    g.lineWidth = 8;
    roundRect(g, -230, -70, 460, 140, 24);
    g.stroke();
    g.font = font(64, 900);
    g.fillText('사용 완료', 0, 10);
    g.font = font(28, 700);
    const u = new Date(c.usedAt!);
    g.fillText(`${date(c.usedAt!)} ${String(u.getHours()).padStart(2, '0')}:${String(u.getMinutes()).padStart(2, '0')}`, 0, 52);
    g.restore();
  }
  return canvas.toDataURL('image/png');
}
