import { STARS } from './stars'
import type { TemplateMap } from './types'

const STORAGE_KEY = 'sm64-templates'

export function loadTemplates(): TemplateMap {
	const defaults = { all: STARS.map((s) => s.id) }
	const stored = localStorage.getItem(STORAGE_KEY)
	if (!stored) return defaults
	try {
		const parsed = JSON.parse(stored) as TemplateMap
		parsed.all = defaults.all
		return parsed
	} catch {
		return defaults
	}
}

export function saveTemplates(templates: TemplateMap) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

export function applyTemplate(templates: TemplateMap, name: string) {
	const ids = templates[name] ?? []
	STARS.forEach((s) => (s.active = ids.includes(s.id)))
}
