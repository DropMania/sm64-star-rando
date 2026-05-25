export type Star = {
	course: string
	courseTTS?: string
	id: number
	name: string
	difficulty: number
	time: number
	active: boolean
	done?: boolean
	practice?: boolean
}

export type TemplateMap = Record<string, number[]>

export type CourseGroup = {
	course: string
	stars: Star[]
}

export type RunOptions = {
	maxStars?: number
	orderByStage?: boolean
	difficultyWeights?: number[]
}

export type PickResult = { type: 'no-run' } | { type: 'complete' } | { type: 'picked'; star: Star }

export type KeyBindings = {
	pickNext: string
	skipStar: string
	practiceAndPickNext: string
}
