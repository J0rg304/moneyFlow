import { useEffect, useState } from 'react';
export type Theme = 'light' | 'dark' | 'system';
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try { const saved = localStorage.getItem('moneyflow-theme'); return saved === 'light' || saved === 'dark' ? saved : 'system'; } catch { return 'system'; }
  });
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#121b18' : '#f6f8f7');
    };
    apply();
    try { localStorage.setItem('moneyflow-theme', theme); } catch { /* The choice still works for this session. */ }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return [theme, setTheme] as const;
}
