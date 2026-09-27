import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Serves /apple-icon so browsers stop 404ing on apple-touch-icon. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#020617',
          borderRadius: 36,
          border: '3px solid #22381b',
          color: '#a3e635',
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: '-0.06em',
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
