// 프로필 사진 공개 화면: /profile/ (로그인 없이 누구나 프로필 사진 화면만)
// 마트ON 앱(/marton/)과 주소 범위를 나눠서, 휴대폰에 마트ON이 설치돼 있어도 링크가 마트ON 첫 화면으로 빨려 들어가지 않는다
import { useCallback, useEffect, useState } from 'react';
import { cx } from './ui';
import ProfilePhoto from './screens/ProfilePhoto';

export const isProfilePath = (pathname: string) => pathname === '/profile' || pathname.startsWith('/profile/');

export default function ProfileApp() {
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const onError = useCallback((msg: string) => {
    setToast({ msg, error: true });
    window.setTimeout(() => setToast(t => (t?.msg === msg ? null : t)), 3500);
  }, []);

  useEffect(() => {
    document.title = '프로필 사진 만들기';
    // 운영 서버는 HTML에 이미 넣어 보내므로 없을 때(개발 서버)만 추가
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/profile/manifest.webmanifest';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <>
      <ProfilePhoto aiEnabled standalone onClose={() => { window.location.href = '/profile/'; }} onError={onError} />
      {toast && (
        <div className={cx('fixed inset-x-4 bottom-6 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-center text-sm font-semibold text-white shadow-lg', toast.error ? 'bg-red-600' : 'bg-slate-900')}>
          {toast.msg}
        </div>
      )}
    </>
  );
}
