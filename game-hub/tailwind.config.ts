import type { Config } from 'tailwindcss';
import { colors, fonts, glow } from './src/design/tokens';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors, fontFamily: fonts, boxShadow: glow } },
  plugins: [],
} satisfies Config;
