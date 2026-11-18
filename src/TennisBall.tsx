export default function TennisBall({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M6 4.9c2.5 2.2 4 4.6 4 7.1s-1.5 4.9-4 7.1M18 4.9c-2.5 2.2-4 4.6-4 7.1s1.5 4.9 4 7.1" stroke="currentColor" strokeWidth="1.5"/></svg>;
}
