import { ACTION_MENU_PRESETS } from './actionMenuPresets.js'

/**
 * @param {string} pathname
 */
function findRouteRule(pathname) {
  return ACTION_MENU_ROUTE_RULES.find((entry) => entry.match(pathname))
}

/**
 * Правила сопоставления pathname → preset.
 * Первое совпавшее правило побеждает — более специфичные правила выше.
 *
 * @type {{ groupId: string, presetKey: keyof typeof ACTION_MENU_PRESETS, match: (pathname: string) => boolean }[]}
 */
export const ACTION_MENU_ROUTE_RULES = [
  {
    groupId: 'home',
    presetKey: 'home',
    match: (pathname) => pathname === '/',
  },
  {
    groupId: 'transactions',
    presetKey: 'transactions',
    match: (pathname) => pathname === '/transactions',
  },
  {
    groupId: 'transactionsSub',
    presetKey: 'transactionsSub',
    match: (pathname) =>
      pathname.startsWith('/transactions/') && pathname !== '/transactions',
  },
  {
    groupId: 'settings',
    presetKey: 'settings',
    match: (pathname) => pathname === '/settings' || pathname.startsWith('/settings/'),
  },
  {
    groupId: 'accounts',
    presetKey: 'accounts',
    match: (pathname) =>
      pathname === '/accounts' ||
      pathname.startsWith('/accounts/') ||
      pathname.startsWith('/products/'),
  },
]

const DEFAULT_PRESET_KEY = 'default'

/**
 * @param {string} pathname
 * @returns {string}
 */
export function resolveActionMenuGroupId(pathname) {
  return findRouteRule(pathname)?.groupId ?? 'default'
}

/**
 * @param {string} pathname
 * @returns {keyof typeof ACTION_MENU_PRESETS}
 */
export function resolveActionMenuPresetKey(pathname) {
  return findRouteRule(pathname)?.presetKey ?? DEFAULT_PRESET_KEY
}

/**
 * @param {string} pathname
 * @returns {import('./actionMenuPresets.js').ActionMenuItem[]}
 */
export function getActionMenuItems(pathname) {
  const presetKey = resolveActionMenuPresetKey(pathname)
  const items = ACTION_MENU_PRESETS[presetKey]

  if (!items?.length) {
    return ACTION_MENU_PRESETS[DEFAULT_PRESET_KEY]
  }

  return items
}
