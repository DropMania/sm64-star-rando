import { STARS } from './stars'
import type { PickResult, RunOptions, Star } from './types'

let queue: Star[] | null = null
let total = 0
let skipped = 0

export function isRunActive() {
	return queue !== null
}

export function getQueue() {
	return queue
}

export function getTotal() {
	return total
}

export function getPickedCount() {
	return queue !== null ? total - queue.length - skipped : 0
}

function weightedSample(arr: Star[], weights: number[]) {
	// Exclude difficulties with weight 0
	const eligible = arr.filter((s) => weights[s.difficulty - 1] > 0)
	// Assign each star a score: U^(1/w) — higher weight → higher expected score
	return eligible
		.map((s) => ({ s, key: Math.random() ** (1 / weights[s.difficulty - 1]) }))
		.sort((a, b) => b.key - a.key)
		.map(({ s }) => s)
}

export function startRun({ maxStars = 0, orderByStage = false, difficultyWeights = [5, 5, 5, 5, 5] }: RunOptions = {}) {
	const active = STARS.filter((s) => s.active)
	if (active.length === 0) return false
	STARS.forEach((s) => (s.done = false))
	queue = weightedSample(active, difficultyWeights)
	if (maxStars > 0 && maxStars < queue.length) queue = queue.slice(0, maxStars)
	if (queue.length === 0) return false
	if (orderByStage) {
		queue.sort((a, b) => b.id - a.id)
	}
	total = queue.length
	skipped = 0
	return true
}

export function endRun() {
	queue = null
	total = 0
	skipped = 0
	STARS.forEach((s) => (s.done = false))
}

export function pickNext(): PickResult {
	if (queue === null) return { type: 'no-run' }
	if (queue.length === 0) return { type: 'complete' }
	const star = queue.pop()
	if (!star) return { type: 'complete' }
	star.done = true
	return { type: 'picked', star }
}

export function skipNext(): PickResult {
	if (queue === null) return { type: 'no-run' }
	if (queue.length === 0) return { type: 'complete' }
	const star = queue.pop()
	if (!star) return { type: 'complete' }
	star.done = true
	skipped++
	return { type: 'picked', star }
}
