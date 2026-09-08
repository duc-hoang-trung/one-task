import { createContext, useContext } from 'react'
import type { LangSetting } from '../lib/types'
import { en } from './en'
import { vi, type Key } from './vi'

export type Lang = 'vi' | 'en'
export type { Key }

const dicts: Record<Lang, Record<Key, string>> = { vi, en }

export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'vi'
  const l = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase()
  return l.startsWith('vi') ? 'vi' : 'en'
}

export function resolveLang(setting: LangSetting | undefined): Lang {
  return !setting || setting === 'auto' ? detectLang() : setting
}

export type Vars = Record<string, string | number>

export function translate(lang: Lang, key: Key, vars?: Vars): string {
  let s: string = dicts[lang][key] ?? dicts.vi[key] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}

export const LangContext = createContext<Lang>('vi')

export function useT() {
  const lang = useContext(LangContext)
  const t = (key: Key, vars?: Vars) => translate(lang, key, vars)
  return { t, lang }
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Thứ 3 · 08/09" / "Tue · 08 Sep" */
export function fmtDate(lang: Lang, iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = translate(lang, `dow.${date.getDay()}` as Key)
  if (lang === 'vi') return `${dow} · ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
  return `${dow} · ${d} ${MONTHS_EN[m - 1].slice(0, 3)}`
}

export function fmtMonth(lang: Lang, y: number, m: number): string {
  return translate(lang, 'month', { m, y, mname: MONTHS_EN[m - 1] })
}
