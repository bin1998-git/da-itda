import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #FBBF24 0%, #F97316 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 40,
        }}
      >
        <svg width={110} height={110} viewBox="0 0 24 24" fill="white">
          <path d="M12 2C9.5 5 9 7.5 10.5 9.5C9 9.5 7 8 8 5.5C5.5 8 5 11 7 13.5C8.5 16 10.2 17.5 12 17.5C13.8 17.5 15.5 16 17 13.5C19 11 18.5 8 16 5.5C17 8 15 9.5 13.5 9.5C15 7.5 14.5 5 12 2Z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
