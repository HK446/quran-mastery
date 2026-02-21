export interface Ayah {
  verse_key: string;
  surah: number;
  ayah: number;
  text_indopak: string;
  page_13line: number;
  line_numbers: number[];
  global_order: number;
  juz_number: number;
  ruku_global: number;
  ruku_in_juz: number;
  is_ruku_start: boolean;
  is_page_start: boolean;
  is_page_end: boolean;
}

export type RangeType = 'ayah' | 'ruku' | 'juz';

export interface AyahRange {
  type: 'ayah';
  start: { surah: number; ayah: number };
  end: { surah: number; ayah: number };
}

export interface RukuRange {
  type: 'ruku';
  start: { juz: number; ruku: number };
  end: { juz: number; ruku: number };
}

export interface JuzRange {
  type: 'juz';
  start: number;
  end: number;
}

export type TestPoolRange = AyahRange | RukuRange | JuzRange;

export interface RangeSelection {
  ranges: TestPoolRange[];
}

export interface Attempt {
  id: number;
  ayah_key: string;
  question_type: string;
  page_13line: number;
  juz_number: number;
  ruku_in_juz: number;
  correct: boolean;
  timestamp: string;
}

export type QuizVariant = 'normal' | 'speedrun' | 'highscore';

export interface Question {
  id: string;
  text: string;
  arabic?: string;
  options?: string[];
  answer: string | string[];
  ayah: Ayah;
  type: string;
}
