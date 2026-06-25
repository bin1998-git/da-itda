import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#EDE8E2',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* 배경 glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(251,191,36,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* 로고 마크 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 48,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #FBBF24 0%, #F97316 100%)',
              width: 80,
              height: 80,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(251,191,36,0.4)',
            }}
          >
            <svg width={48} height={48} viewBox="0 0 24 24" fill="white">
              <path d="M12 2C9.5 5 9 7.5 10.5 9.5C9 9.5 7 8 8 5.5C5.5 8 5 11 7 13.5C8.5 16 10.2 17.5 12 17.5C13.8 17.5 15.5 16 17 13.5C19 11 18.5 8 16 5.5C17 8 15 9.5 13.5 9.5C15 7.5 14.5 5 12 2Z" />
            </svg>
          </div>
          {/* 워드마크 */}
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: 64, fontWeight: 900, color: '#1C1917', letterSpacing: '-2px' }}>다</span>
            <span style={{ fontSize: 64, fontWeight: 900, color: '#F59E0B', letterSpacing: '-2px' }}>잇</span>
            <span style={{ fontSize: 64, fontWeight: 900, color: '#1C1917', letterSpacing: '-2px' }}>다</span>
          </div>
        </div>

        {/* 메인 카피 */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#1C1917',
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: 24,
          }}
        >
          맛있는 모든 것을 하나로
        </div>

        {/* 서브 카피 */}
        <div
          style={{
            fontSize: 24,
            color: '#78716C',
            textAlign: 'center',
          }}
        >
          식품 마켓 · 레시피 영상 · 푸드 커뮤니티
        </div>

        {/* 하단 태그 */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            display: 'flex',
            gap: 16,
          }}
        >
          {['🛒 식품 마켓', '🎬 푸드 미디어', '💬 커뮤니티'].map((tag) => (
            <div
              key={tag}
              style={{
                background: 'rgba(0,0,0,0.06)',
                padding: '8px 20px',
                borderRadius: 24,
                fontSize: 18,
                color: '#57534E',
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
