import React, { createContext, useContext } from 'react';

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  bg: string;
  bgHeader: string;
  bgSection: string;
  border: string;
  borderLight: string;
  text: string;
  textMuted: string;
  textDim: string;
  textBright: string;
  accent: string;
  accentLight: string;
  buttonBg: string;
  buttonBorder: string;
  highlightBg: string;
  hoverBg: string;
  playingBg: string;
  codeBg: string;
  codeText: string;
}

export const darkColors: ThemeColors = {
  bg: '#0d1117',
  bgHeader: '#010409',
  bgSection: '#161b22',
  border: '#21262d',
  borderLight: '#30363d',
  text: '#c9d1d9',
  textMuted: '#8b949e',
  textDim: '#6e7681',
  textBright: '#f0f6fc',
  accent: '#58a6ff',
  accentLight: '#79c0ff',
  buttonBg: '#21262d',
  buttonBorder: '#30363d',
  highlightBg: 'rgba(88, 166, 255, 0.08)',
  hoverBg: 'rgba(88, 166, 255, 0.04)',
  playingBg: '#238636',
  codeBg: '#161b22',
  codeText: '#79c0ff',
};

export const lightColors: ThemeColors = {
  bg: '#ffffff',
  bgHeader: '#f6f8fa',
  bgSection: '#f6f8fa',
  border: '#d0d7de',
  borderLight: '#d0d7de',
  text: '#24292f',
  textMuted: '#57606a',
  textDim: '#6e7781',
  textBright: '#24292f',
  accent: '#0969da',
  accentLight: '#0969da',
  buttonBg: '#f6f8fa',
  buttonBorder: '#d0d7de',
  highlightBg: 'rgba(9, 105, 218, 0.08)',
  hoverBg: 'rgba(9, 105, 218, 0.04)',
  playingBg: '#1a7f37',
  codeBg: '#f6f8fa',
  codeText: '#0550ae',
};

interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  colors: darkColors,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);
