import App from '@/App';

/** Landing is public and session-free — statically generate for Edge CDN / low TTFB. */
export const dynamic = 'force-static';
export const revalidate = false;

export default function Home() {
  return <App />;
}
