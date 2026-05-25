import { endRun, getPickedCount, getQueue, getTotal, pickNext, skipNext, startRun } from './run'
import { STARS, loadStars, loadStarsFromSheet } from './stars'
import { applyTemplate, loadTemplates, saveTemplates } from './templates'
import type { CourseGroup, KeyBindings, PickResult, Star, TemplateMap } from './types'

const PRACTICE_KEY = 'sm64-practice-stars'
const VOICE_KEY = 'sm64-voice'
const KEYBINDS_KEY = 'sm64-keybinds'

const DEFAULT_KEYBINDS: KeyBindings = {
	pickNext: 'Space',
	skipStar: 'KeyS',
	practiceAndPickNext: 'KeyP',
}
const starsSource: Star[] = STARS

function groupStarsByCourse(list: Star[]): CourseGroup[] {
	const courseMap = new Map<string, Star[]>()

	for (const star of list) {
		const courseStars = courseMap.get(star.course)
		if (courseStars) {
			courseStars.push(star)
			continue
		}

		courseMap.set(star.course, [star])
	}

	return Array.from(courseMap, ([course, courseStars]) => ({
		course,
		stars: courseStars,
	}))
}

function formatTime(ms: number) {
	const totalSeconds = Math.floor(ms / 1000)
	const hours = Math.floor(totalSeconds / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	const centiseconds = Math.floor((ms % 1000) / 10)

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
	}

	return `${minutes}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`
}

export function createRandomizerController() {
	return new RandomizerController()
}

class RandomizerController {
	stars = $state<Star[]>([])
	templates = $state<TemplateMap>({ all: [] })
	selectedTemplate = $state('all')
	templateName = $state('')
	starDisplay = $state('')
	runTimer = $state('0:00.00')
	runStatus = $state('')
	runMaxStars = $state<number | undefined>(undefined)
	runOrderByStage = $state(false)
	difficultyWeights = $state([5, 5, 5, 5, 5])
	currentStar = $state<Star | null>(null)
	keybinds = $state<KeyBindings>({ ...DEFAULT_KEYBINDS })
	voices = $state<SpeechSynthesisVoice[]>([])
	selectedVoice = $state('')
	initialized = $state(false)
	loadError = $state('')
	runActive = $state(false)
	timerInterval = $state<number | null>(null)
	timerStart = $state<number | null>(null)

	groupedStars = $derived.by<CourseGroup[]>(() => groupStarsByCourse(this.stars))
	activeCount = $derived(this.stars.filter((star) => star.active).length)
	toggleAllChecked = $derived(this.stars.length > 0 && this.activeCount === this.stars.length)
	toggleAllIndeterminate = $derived(this.activeCount > 0 && this.activeCount < this.stars.length)

	refreshStars = () => {
		this.stars = [...starsSource]
	}

	loadPractice = () => {
		try {
			const raw = localStorage.getItem(PRACTICE_KEY)
			if (!raw) return

			const ids = new Set<number>(JSON.parse(raw) as number[])
			for (const star of starsSource) {
				star.practice = ids.has(star.id)
			}
		} catch {
			for (const star of starsSource) {
				star.practice = false
			}
		}
	}

	savePractice = () => {
		const ids = starsSource.filter((star) => star.practice).map((star) => star.id)
		localStorage.setItem(PRACTICE_KEY, JSON.stringify(ids))
	}

	setPractice = (id: number, value: boolean) => {
		const star = starsSource.find((entry) => entry.id === id)
		if (!star) return

		star.practice = value
		this.savePractice()
		this.refreshStars()
	}

	togglePractice = (id: number) => {
		const star = starsSource.find((entry) => entry.id === id)
		if (!star) return

		this.setPractice(id, !star.practice)
	}

	toggleStar = (id: number) => {
		const star = starsSource.find((entry) => entry.id === id)
		if (!star) return

		star.active = !star.active
		this.refreshStars()
	}

	toggleAllStars = (checked: boolean) => {
		for (const star of starsSource) {
			star.active = checked
		}

		this.refreshStars()
	}

	clearPractice = () => {
		let changed = false

		for (const star of starsSource) {
			if (!star.practice) continue
			star.practice = false
			changed = true
		}

		if (!changed) return

		this.savePractice()
		this.refreshStars()
	}

	saveCurrentTemplate = () => {
		const name = this.templateName.trim()
		if (!name) {
			alert('Please enter a template name.')
			return
		}

		this.templates[name] = starsSource.filter((star) => star.active).map((star) => star.id)
		saveTemplates(this.templates)
		this.selectedTemplate = name
		this.templateName = ''
		this.templates = { ...this.templates }
	}

	deleteCurrentTemplate = () => {
		if (this.selectedTemplate === 'all') return
		if (!confirm(`Delete template "${this.selectedTemplate}"?`)) return

		delete this.templates[this.selectedTemplate]
		saveTemplates(this.templates)
		this.selectedTemplate = 'all'
		applyTemplate(this.templates, this.selectedTemplate)
		this.templates = { ...this.templates }
		this.refreshStars()
	}

	handleTemplateChange = (name: string) => {
		this.selectedTemplate = name
		applyTemplate(this.templates, name)
		this.refreshStars()
	}

	handleTemplateNameChange = (value: string) => {
		this.templateName = value
	}

	stopTimer = () => {
		if (this.timerInterval === null) return

		window.clearInterval(this.timerInterval)
		this.timerInterval = null
	}

	startTimer = () => {
		this.stopTimer()
		this.timerStart = Date.now()
		this.runTimer = '0:00.00'
		this.timerInterval = window.setInterval(() => {
			if (this.timerStart === null) return
			this.runTimer = formatTime(Date.now() - this.timerStart)
		}, 100)
	}

	clearTimer = () => {
		this.stopTimer()
		this.timerStart = null
		this.runTimer = '0:00.00'
	}

	updateRunState = () => {
		const queue = getQueue()
		this.runActive = queue !== null

		if (queue !== null) {
			this.runStatus = `Run in progress: ${getPickedCount()} / ${getTotal()} stars picked`
			return
		}

		this.runStatus = ''
	}

	speakText = (text: string) => {
		const synth = window.speechSynthesis
		const utterance = new SpeechSynthesisUtterance(text)

		if (this.selectedVoice) {
			utterance.voice = synth.getVoices().find((voice) => voice.name === this.selectedVoice) ?? null
		}

		synth.speak(utterance)
	}

	populateVoices = () => {
		const available = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith('en'))
		if (available.length === 0) return

		const saved = localStorage.getItem(VOICE_KEY)
		this.voices = available

		if (saved && available.some((voice) => voice.name === saved)) {
			this.selectedVoice = saved
			return
		}

		if (this.selectedVoice && available.some((voice) => voice.name === this.selectedVoice)) {
			return
		}

		this.selectedVoice = available[0].name
		localStorage.setItem(VOICE_KEY, this.selectedVoice)
	}

	updateVoice = (name: string) => {
		this.selectedVoice = name
		localStorage.setItem(VOICE_KEY, name)
	}

	loadKeybinds = () => {
		try {
			const raw = localStorage.getItem(KEYBINDS_KEY)
			if (!raw) return
			this.keybinds = { ...DEFAULT_KEYBINDS, ...(JSON.parse(raw) as Partial<KeyBindings>) }
		} catch {
			this.keybinds = { ...DEFAULT_KEYBINDS }
		}
	}

	updateKeybind = (action: keyof KeyBindings, code: string) => {
		this.keybinds = { ...this.keybinds, [action]: code }
		localStorage.setItem(KEYBINDS_KEY, JSON.stringify(this.keybinds))
	}

	pickRandomStar = () => {
		if (this.runActive) {
			const result = pickNext() as PickResult

			if (result.type === 'complete') {
				this.currentStar = null
				const finalTime = this.timerStart === null ? '' : formatTime(Date.now() - this.timerStart)

				this.stopTimer()
				endRun()
				this.starDisplay = 'Run complete! 🎉'
				if (finalTime) {
					this.runTimer = finalTime
				}

				this.speakText('Run complete! Congratulations!')
				this.refreshStars()
				this.updateRunState()
				return
			}

			if (result.type === 'picked') {
				this.currentStar = result.star
				this.starDisplay = `${result.star.course}: ${result.star.name}`
				this.speakText(`${result.star.courseTTS ?? result.star.course}: ${result.star.name}`)
				this.refreshStars()
				this.updateRunState()
			}

			return
		}

		const activeStars = starsSource.filter((star) => star.active)
		if (activeStars.length === 0) {
			alert('No active stars to pick from!')
			return
		}

		const star = activeStars[Math.floor(Math.random() * activeStars.length)]
		this.currentStar = star
		this.starDisplay = `${star.course}: ${star.name}`
		this.speakText(`${star.courseTTS ?? star.course}: ${star.name}`)
	}

	practiceAndPickNext = () => {
		if (this.currentStar) {
			this.setPractice(this.currentStar.id, true)
		}

		this.pickRandomStar()
	}

	skipStar = () => {
		if (!this.runActive) return

		const result = skipNext() as PickResult

		if (result.type === 'complete') {
			this.currentStar = null
			const finalTime = this.timerStart === null ? '' : formatTime(Date.now() - this.timerStart)

			this.stopTimer()
			endRun()
			this.starDisplay = 'Run complete! 🎉'
			if (finalTime) {
				this.runTimer = finalTime
			}

			this.speakText('Run complete! Congratulations!')
			this.refreshStars()
			this.updateRunState()
			return
		}

		if (result.type === 'picked') {
			this.currentStar = result.star
			this.starDisplay = `${result.star.course}: ${result.star.name}`
			this.speakText(`${result.star.courseTTS ?? result.star.course}: ${result.star.name}`)
			this.refreshStars()
			this.updateRunState()
		}
	}

	startRunFlow = () => {
		const started = startRun({
			maxStars: this.runMaxStars ?? 0,
			orderByStage: this.runOrderByStage,
			difficultyWeights: this.difficultyWeights,
		})

		if (!started) {
			alert('No active stars match the selected options!')
			return
		}

		this.refreshStars()
		this.startTimer()
		this.updateRunState()
		this.pickRandomStar()
	}

	endRunFlow = () => {
		this.currentStar = null
		this.starDisplay = ''
		endRun()
		this.clearTimer()
		this.refreshStars()
		this.updateRunState()
	}

	updateDifficultyWeight = (index: number, value: string) => {
		this.difficultyWeights[index] = Number(value)
		this.difficultyWeights = [...this.difficultyWeights]
	}

	updateRunMaxStars = (value: number | undefined) => {
		this.runMaxStars = value
	}

	updateRunOrderByStage = (value: boolean) => {
		this.runOrderByStage = value
	}

	handleKeydown = (event: KeyboardEvent) => {
		const target = event.target
		if (target instanceof HTMLElement) {
			const tag = target.tagName.toLowerCase()
			if (target.isContentEditable || ['button', 'input', 'select', 'textarea'].includes(tag)) {
				return
			}
		}

		if (event.code === this.keybinds.pickNext) {
			event.preventDefault()
			this.pickRandomStar()
		}

		if (event.code === this.keybinds.skipStar) {
			event.preventDefault()
			this.skipStar()
		}

		if (event.code === this.keybinds.practiceAndPickNext) {
			event.preventDefault()
			this.practiceAndPickNext()
		}
	}

	initializeApp = async () => {
		this.loadError = ''
		starsSource.length = 0

		try {
			await loadStarsFromSheet()
		} catch (error) {
			console.error('Failed to load stars from sheet, falling back to defaults', error)
			starsSource.length = 0
			await loadStars()
		}

		this.loadKeybinds()
		this.loadPractice()
		this.templates = loadTemplates()
		this.selectedTemplate = this.templates.all ? 'all' : (Object.keys(this.templates)[0] ?? 'all')
		applyTemplate(this.templates, this.selectedTemplate)
		this.refreshStars()
		this.populateVoices()
		this.updateRunState()
		this.initialized = true
	}

	mount = () => {
		let cancelled = false
		const synth = window.speechSynthesis

		const setup = async () => {
			try {
				await this.initializeApp()
				if (cancelled) return
			} catch (error) {
				console.error('Failed to initialize app', error)
				this.loadError = 'Failed to load stars.'
			}
		}

		void setup()

		window.addEventListener('keydown', this.handleKeydown)
		synth.addEventListener('voiceschanged', this.populateVoices)

		return () => {
			cancelled = true
			window.removeEventListener('keydown', this.handleKeydown)
			synth.removeEventListener('voiceschanged', this.populateVoices)
			this.stopTimer()
		}
	}
}
