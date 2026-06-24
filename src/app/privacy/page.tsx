import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | 다잇다',
};

const SECTIONS = [
  {
    title: '1. 수집하는 개인정보 항목',
    content: `회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.\n\n■ 회원가입 시\n  - 필수: 이메일 주소, 비밀번호\n  - 선택: 이름(닉네임), 프로필 사진\n\n■ 소셜 로그인 시 (Google, Kakao 등)\n  - 소셜 계정에서 제공하는 이메일, 프로필 정보\n\n■ 서비스 이용 중 자동 수집\n  - 접속 IP, 쿠키, 접속 일시, 서비스 이용 기록`,
  },
  {
    title: '2. 개인정보 수집 및 이용 목적',
    content: `회사는 수집한 개인정보를 다음 목적으로만 이용합니다.\n\n  - 회원 식별 및 본인 확인\n  - 서비스 제공 및 운영 (마켓, 미디어, 커뮤니티)\n  - 맞춤형 콘텐츠 및 상품 추천\n  - 고객 상담 및 불만 처리\n  - 서비스 개선 및 신규 기능 개발\n  - 법령상 의무 이행`,
  },
  {
    title: '3. 개인정보 보유 및 이용 기간',
    content: `회원 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.\n\n  - 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)\n  - 소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)\n  - 접속에 관한 기록: 3개월 (통신비밀보호법)`,
  },
  {
    title: '4. 개인정보의 제3자 제공',
    content: `회사는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.\n\n  - 이용자가 사전에 동의한 경우\n  - 법령에 의거하거나 수사 기관의 요구가 있는 경우`,
  },
  {
    title: '5. 개인정보 처리 위탁',
    content: `회사는 서비스 향상을 위해 다음과 같이 개인정보 처리를 위탁합니다.\n\n  - Supabase Inc. — 서버 운영, 데이터베이스 관리\n  - Vercel Inc. — 서비스 호스팅\n  - Google LLC — 소셜 로그인 (OAuth)\n  - Kakao Corp. — 소셜 로그인 (OAuth)`,
  },
  {
    title: '6. 이용자의 권리',
    content: `이용자는 언제든지 다음 권리를 행사할 수 있습니다.\n\n  - 개인정보 열람 요청\n  - 개인정보 정정·삭제 요청\n  - 개인정보 처리 정지 요청\n  - 회원 탈퇴 (개인정보 삭제)\n\n위 권리는 서비스 내 [계정 설정] 메뉴 또는 이메일(support@da-itda.com)을 통해 행사하실 수 있습니다.`,
  },
  {
    title: '7. 쿠키(Cookie) 사용',
    content: `회사는 이용자에게 최적화된 서비스를 제공하기 위해 쿠키를 사용합니다. 쿠키는 브라우저 설정을 통해 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.`,
  },
  {
    title: '8. 개인정보 보호 책임자',
    content: `개인정보 처리에 관한 업무를 총괄하고 개인정보 처리와 관련한 이용자의 불만 처리 및 피해 구제를 위하여 아래와 같이 개인정보 보호 책임자를 지정합니다.\n\n  - 이름: 다잇다 운영팀\n  - 이메일: privacy@da-itda.com\n  - 처리 시간: 영업일 기준 3일 이내 답변`,
  },
  {
    title: '9. 개인정보 처리방침 변경',
    content: `본 개인정보 처리방침은 법령, 정책 또는 회사 내부 방침에 따라 변경될 수 있습니다. 변경 시 서비스 공지사항을 통해 사전 고지합니다.\n\n시행일: 2026년 1월 1일`,
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* 헤더 */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-1.5 text-white/30 text-sm hover:text-white transition mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-white mb-4">개인정보처리방침</h1>
          <p className="text-white/35 text-sm">최종 업데이트: 2026년 1월 1일</p>
        </div>

        {/* 안내 박스 */}
        <div className="rounded-2xl border border-white/8 bg-white/3 p-5 mb-10">
          <p className="text-white/50 text-sm leading-relaxed">
            다잇다(이하 "회사")는 이용자의 개인정보를 중요시하며, 개인정보보호법 등 관련 법령을 준수합니다.
            본 방침을 통해 수집하는 개인정보의 항목, 이용 목적, 보유 기간 등을 안내드립니다.
          </p>
        </div>

        {/* 본문 */}
        <div className="flex flex-col gap-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-white font-semibold text-base mb-3">{s.title}</h2>
              <p className="text-white/45 text-sm leading-[1.9] whitespace-pre-wrap">{s.content}</p>
            </section>
          ))}
        </div>

        {/* 하단 */}
        <div className="mt-14 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-white/20 text-xs">© 2026 Da-itda. All rights reserved.</p>
          <Link href="/terms" className="text-white/40 text-sm hover:text-white transition">
            이용약관 →
          </Link>
        </div>
      </div>
    </main>
  );
}
