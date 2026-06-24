import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    // 클라이언트 페이지로 code 전달 (PKCE verifier는 브라우저에만 있음)
    return NextResponse.redirect(
      `${origin}/auth/callback/exchange?code=${code}&next=${encodeURIComponent(next)}`
    );
  }

  return NextResponse.redirect(`${origin}/auth/login?error=인증에 실패했습니다`);
}
