import { Ayah, TestPoolRange } from "./types";

export function get_ayahs_between_verse_keys(ayahs: Ayah[], startKey: string, endKey: string): Ayah[] {
  const startAyah = ayahs.find(a => a.verse_key === startKey);
  const endAyah = ayahs.find(a => a.verse_key === endKey);
  if (!startAyah || !endAyah) return [];
  if (startAyah.global_order > endAyah.global_order) return [];
  return ayahs.filter(a => a.global_order >= startAyah.global_order && a.global_order <= endAyah.global_order);
}

export function get_ayahs_for_ruku(ayahs: Ayah[], juz: number, ruku_in_juz: number): Ayah[] {
  return ayahs.filter(a => a.juz_number === juz && a.ruku_in_juz === ruku_in_juz);
}

export function get_ayahs_between_rukus(ayahs: Ayah[], startJuz: number, startRuku: number, endJuz: number, endRuku: number): Ayah[] {
  const startRukuAyahs = get_ayahs_for_ruku(ayahs, startJuz, startRuku);
  const endRukuAyahs = get_ayahs_for_ruku(ayahs, endJuz, endRuku);
  if (startRukuAyahs.length === 0 || endRukuAyahs.length === 0) return [];
  
  const startOrder = startRukuAyahs[0].global_order;
  const endOrder = endRukuAyahs[endRukuAyahs.length - 1].global_order;
  if (startOrder > endOrder) return [];
  return ayahs.filter(a => a.global_order >= startOrder && a.global_order <= endOrder);
}

export function get_ayahs_for_juz_range(ayahs: Ayah[], startJuz: number, endJuz: number): Ayah[] {
  if (startJuz > endJuz) return [];
  return ayahs.filter(a => a.juz_number >= startJuz && a.juz_number <= endJuz);
}

export function buildTestPool(ayahs: Ayah[], ranges: TestPoolRange[]): Ayah[] {
  const poolMap = new Map<string, Ayah>();
  ranges.forEach(range => {
    let rangeAyahs: Ayah[] = [];
    if (range.type === 'ayah') {
      const startKey = `${range.start.surah}:${range.start.ayah}`;
      const endKey = `${range.end.surah}:${range.end.ayah}`;
      rangeAyahs = get_ayahs_between_verse_keys(ayahs, startKey, endKey);
    } else if (range.type === 'ruku') {
      rangeAyahs = get_ayahs_between_rukus(ayahs, range.start.juz, range.start.ruku, range.end.juz, range.end.ruku);
    } else if (range.type === 'juz') {
      rangeAyahs = get_ayahs_for_juz_range(ayahs, range.start, range.end);
    }
    rangeAyahs.forEach(a => poolMap.set(a.verse_key, a));
  });
  return Array.from(poolMap.values()).sort((a, b) => a.global_order - b.global_order);
}

export function getNextAyah(ayahs: Ayah[], current: Ayah): Ayah | undefined {
  return ayahs.find(a => a.global_order === current.global_order + 1);
}

export function getPrevAyah(ayahs: Ayah[], current: Ayah): Ayah | undefined {
  return ayahs.find(a => a.global_order === current.global_order - 1);
}

export function getFirstAyahOfPage(ayahs: Ayah[], page: number): Ayah | undefined {
  return ayahs.find(a => a.page_13line === page && a.is_page_start);
}

export function getLastAyahOfPage(ayahs: Ayah[], page: number): Ayah | undefined {
  return ayahs.find(a => a.page_13line === page && a.is_page_end);
}

export function getFirstAyahOfRuku(ayahs: Ayah[], rukuGlobal: number): Ayah | undefined {
  return ayahs.find(a => a.ruku_global === rukuGlobal && a.is_ruku_start);
}

export function getLastAyahOfRuku(ayahs: Ayah[], rukuGlobal: number): Ayah | undefined {
  // A bit more complex since is_ruku_end isn't in the schema, but we can find the one before the next ruku start
  const nextRukuStart = ayahs.find(a => a.ruku_global === rukuGlobal + 1 && a.is_ruku_start);
  if (nextRukuStart) {
    return getPrevAyah(ayahs, nextRukuStart);
  }
  // If it's the last ruku, find the last ayah of that ruku
  const rukuAyahs = ayahs.filter(a => a.ruku_global === rukuGlobal);
  return rukuAyahs[rukuAyahs.length - 1];
}

export function getNearestRukuBoundary(ayahs: Ayah[], current: Ayah, direction: 'forward' | 'backward'): Ayah {
  if (direction === 'forward') {
    const nextRuku = ayahs.find(a => a.global_order > current.global_order && a.is_ruku_start);
    if (nextRuku) return getPrevAyah(ayahs, nextRuku) || current;
    return ayahs[ayahs.length - 1];
  } else {
    const prevRuku = [...ayahs].reverse().find(a => a.global_order < current.global_order && a.is_ruku_start);
    return prevRuku || ayahs[0];
  }
}
