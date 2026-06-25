import Link from 'next/link';

export const metadata = {
  title: '이용약관 | 다잇다',
};

const SECTIONS = [
  {
    title: '제1조 (목적)',
    content: `본 약관은 다잇다(이하 "회사")가 제공하는 식품 마켓, 푸드 미디어, 커뮤니티 등 모든 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: '제2조 (정의)',
    content: `① "서비스"란 회사가 제공하는 다잇다 플랫폼 내 모든 기능(식품 마켓, 푸드 미디어, 커뮤니티 등)을 말합니다.\n② "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.\n③ "회원"이란 회사에 개인정보를 제공하여 회원 등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.\n④ "판매자"란 서비스 내 식품 마켓에 상품을 등록하여 판매 활동을 하는 회원을 말합니다.`,
  },
  {
    title: '제3조 (약관의 효력 및 변경)',
    content: `① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.\n② 회사는 필요한 경우 관련법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.\n③ 약관이 변경되는 경우 회사는 변경 사항을 시행 일자 7일 전부터 서비스 공지사항에 게시합니다. 단, 이용자에게 불리한 변경의 경우에는 30일 전부터 공지합니다.`,
  },
  {
    title: '제4조 (회원가입)',
    content: `① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.\n② 회사는 다음 각 호에 해당하는 신청에 대해서는 승낙하지 않을 수 있습니다.\n  - 타인의 명의를 사용하여 신청한 경우\n  - 허위 정보를 기재하거나, 회사가 제시하는 내용을 기재하지 않은 경우\n  - 만 14세 미만인 경우`,
  },
  {
    title: '제5조 (서비스의 제공 및 변경)',
    content: `① 회사는 다음과 같은 서비스를 제공합니다.\n  - 식품 마켓: 신선식품, 주방용품 등 구매 및 판매\n  - 푸드 미디어: 레시피 영상 업로드 및 시청\n  - 커뮤니티: 게시글 작성, 댓글, 좋아요 등 소통 기능\n② 회사는 서비스의 내용을 변경할 경우 이를 이용자에게 사전 고지합니다.\n③ 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 하나, 시스템 점검 등의 경우 일시 중단될 수 있습니다.`,
  },
  {
    title: '제6조 (이용자의 의무)',
    content: `이용자는 다음 행위를 하여서는 안 됩니다.\n  - 타인의 개인정보를 무단으로 수집, 저장, 공개하는 행위\n  - 회사의 서비스를 이용하여 얻은 정보를 무단으로 복제, 유통, 조장하는 행위\n  - 회사 및 제3자의 저작권 등 지적재산권을 침해하는 행위\n  - 음란물, 폭력적인 내용, 혐오 발언 등 불법적인 콘텐츠를 게시하는 행위\n  - 서비스의 안정적인 운영을 방해하는 행위`,
  },
  {
    title: '제7조 (저작권 및 콘텐츠)',
    content: `① 이용자가 서비스 내에 게시한 콘텐츠(게시글, 댓글, 영상, 이미지 등)의 저작권은 해당 이용자에게 귀속됩니다.\n② 이용자는 서비스에 콘텐츠를 게시함으로써 회사에게 해당 콘텐츠를 서비스 운영, 홍보 등의 목적으로 사용할 수 있는 비독점적 라이선스를 부여합니다.\n③ 회사가 작성한 저작물에 대한 저작권은 회사에 귀속됩니다.`,
  },
  {
    title: '제8조 (면책조항)',
    content: `① 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.\n② 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.\n③ 회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대해 책임을 지지 않습니다.`,
  },
  {
    title: '제9조 (분쟁 해결)',
    content: `① 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 피해 보상 처리를 위한 절차를 마련합니다.\n② 서비스 이용 관련 분쟁은 대한민국 법을 준거법으로 하며, 서울중앙지방법원을 제1심 관할 법원으로 합니다.`,
  },
  {
    title: '부칙',
    content: `본 약관은 2026년 1월 1일부터 시행됩니다.`,
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#EDE8E2] dark:bg-[#0a0a0a] pt-20">
      <div className="max-w-3xl mx-auto px-6 py-14">
        {/* 헤더 */}
        <div className="mb-12">
          <Link href="/" className="inline-flex items-center gap-1.5 text-stone-400 dark:text-white/30 text-sm hover:text-stone-900 dark:hover:text-white transition mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            홈으로
          </Link>
          <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-bold text-stone-900 dark:text-white mb-4">이용약관</h1>
          <p className="text-stone-400 dark:text-white/35 text-sm">최종 업데이트: 2026년 1월 1일</p>
        </div>

        {/* 안내 박스 */}
        <div className="rounded-2xl border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 p-5 mb-10">
          <p className="text-stone-500 dark:text-white/50 text-sm leading-relaxed">
            다잇다 서비스를 이용하시기 전에 본 이용약관을 주의 깊게 읽어주시기 바랍니다.
            서비스에 접속하거나 이용함으로써 본 약관에 동의하는 것으로 간주됩니다.
          </p>
        </div>

        {/* 약관 본문 */}
        <div className="flex flex-col gap-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-stone-900 dark:text-white font-semibold text-base mb-3">{s.title}</h2>
              <p className="text-stone-500 dark:text-white/45 text-sm leading-[1.9] whitespace-pre-wrap">{s.content}</p>
            </section>
          ))}
        </div>

        {/* 하단 링크 */}
        <div className="mt-14 pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-stone-300 dark:text-white/20 text-xs">© 2026 Da-itda. All rights reserved.</p>
          <Link href="/privacy" className="text-stone-400 dark:text-white/40 text-sm hover:text-stone-900 dark:hover:text-white transition">
            개인정보처리방침 →
          </Link>
        </div>
      </div>
    </main>
  );
}
