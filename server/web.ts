// Node 서버와 Cloudflare Worker가 같이 쓰는 웹 응답 조각

/** 마트ON 화면 HTML: 설치 앱 정보(매니페스트·아이콘)를 직접 넣어 설치 버튼·스토어 패키징 도구가 JS 없이도 인식하게 한다 */
export function martonHtml(indexHtml: string) {
  return indexHtml
    .replace(/<title>[^<]*<\/title>/, '<title>마트ON</title>')
    .replace('</head>', [
      '<link rel="manifest" href="/marton/manifest.webmanifest" />',
      '<meta name="theme-color" content="#1d4ed8" />',
      '<meta name="description" content="말하면 연결하고, 찍으면 알려주고, 요청하면 처리되는 매장 AI" />',
      '<link rel="icon" type="image/png" href="/marton/favicon-48.png" />',
      '<link rel="apple-touch-icon" href="/marton/apple-touch-icon.png" />',
      '<meta name="apple-mobile-web-app-capable" content="yes" />',
      '<meta name="mobile-web-app-capable" content="yes" />',
      '<meta name="apple-mobile-web-app-title" content="마트ON" />',
      '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
      '</head>',
    ].join('\n'));
}

export const isMartonPage = (pathname: string) => pathname === '/marton' || pathname === '/marton/';

/** 안드로이드 앱(TWA) 패키지와 웹 주소 연결 — 주소창 없는 전체화면 앱으로 실행. 설정이 없으면 null */
export function assetLinks(pkg?: string, sha256?: string) {
  const fingerprints = (sha256 || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!pkg || !fingerprints.length) return null;
  return [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: fingerprints },
  }];
}
