import { STARS, loadStarsFromSheet } from './stars.js'
import { loadTemplates, saveTemplates, applyTemplate } from './templates.js'
import { isRunActive, getQueue, getTotal, startRun, endRun, pickNext } from './run.js'
import { initVoices, speak } from './speech.js'
import { renderStarList, toggleStar, toggleAllStars } from './starList.js'

// ── Practice state ────────────────────────────────────────────────────────────

let currentStar = null
function loadPractice() {
	try {
		const raw = localStorage.getItem('sm64-practice-stars')
		if (raw) {
			const ids = JSON.parse(raw)
			ids.forEach((id) => {
				const star = STARS.find((s) => s.id === id)
				if (star) star.practice = true
			})
		}
	} catch {}
}

function savePractice() {
	const ids = STARS.filter((s) => s.practice).map((s) => s.id)
	localStorage.setItem('sm64-practice-stars', JSON.stringify(ids))
}

function setPractice(id, value) {
	const star = STARS.find((s) => s.id === id)
	if (!star) return
	star.practice = value
	savePractice()
	const el = document.getElementById(`star-${id}`)
	if (el) {
		el.classList.toggle('practice', value)
		const btn = el.querySelector('.practice-btn')
		if (btn) btn.classList.toggle('active', value)
	}
}

function togglePractice(id) {
	const star = STARS.find((s) => s.id === id)
	if (!star) return
	setPractice(id, !star.practice)
}

// ── Template state ────────────────────────────────────────────────────────────

let templates = loadTemplates()

function renderTemplateSelect(selected) {
	const sel = document.getElementById('templateSelect')
	sel.innerHTML = ''
	Object.keys(templates).forEach((name) => {
		const opt = document.createElement('option')
		opt.value = name
		opt.textContent = name
		if (name === selected) opt.selected = true
		sel.appendChild(opt)
	})
	updateDeleteBtn()
}

function updateDeleteBtn() {
	const selected = document.getElementById('templateSelect').value
	document.getElementById('deleteTemplateBtn').disabled = selected === 'all'
}

function onSaveTemplate() {
	const input = document.getElementById('templateName')
	const name = input.value.trim()
	if (!name) {
		alert('Please enter a template name.')
		return
	}
	templates[name] = STARS.filter((s) => s.active).map((s) => s.id)
	saveTemplates(templates)
	renderTemplateSelect(name)
	input.value = ''
}

function onDeleteTemplate() {
	const name = document.getElementById('templateSelect').value
	if (name === 'all') return
	if (!confirm(`Delete template "${name}"?`)) return
	delete templates[name]
	saveTemplates(templates)
	applyTemplate(templates, 'all')
	renderStarList(toggleStar)
	renderTemplateSelect('all')
}

// ── Run timer ─────────────────────────────────────────────────────────────────

let timerInterval = null
let timerStart = null

function formatTime(ms) {
	const totalS = Math.floor(ms / 1000)
	const h = Math.floor(totalS / 3600)
	const m = Math.floor((totalS % 3600) / 60)
	const s = totalS % 60
	const msRemaining = Math.floor((ms % 1000) / 10)
	if (h > 0)
		return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(msRemaining).padStart(2, '0')}`
	return `${m}:${String(s).padStart(2, '0')}.${String(msRemaining).padStart(2, '0')}`
}

function startTimer() {
	timerStart = Date.now()
	const el = document.getElementById('runTimer')
	el.textContent = '0:00.00'
	timerInterval = setInterval(() => {
		el.textContent = formatTime(Date.now() - timerStart)
	}, 100)
}

function stopTimer() {
	clearInterval(timerInterval)
	timerInterval = null
}

function clearTimer() {
	stopTimer()
	timerStart = null
	document.getElementById('runTimer').textContent = '0:00.00'
}

// ── Run UI ────────────────────────────────────────────────────────────────────

function updateRunUI() {
	const status = document.getElementById('runStatus')
	const startBtn = document.getElementById('startRunBtn')
	const endBtn = document.getElementById('endRunBtn')
	const queue = getQueue()
	if (queue !== null) {
		const picked = getTotal() - queue.length
		status.textContent = `Run in progress: ${picked} / ${getTotal()} stars picked`
		startBtn.disabled = true
		endBtn.disabled = false
	} else {
		status.textContent = ''
		startBtn.disabled = false
		endBtn.disabled = true
	}
}

function onStartRun() {
	const maxStars = parseInt(document.getElementById('runMaxStars').value, 10) || 0
	const orderByStage = document.getElementById('runOrderByStage').checked
	const difficultyWeights = [1, 2, 3, 4, 5].map((i) => parseInt(document.getElementById(`diffWeight${i}`).value, 10))
	if (!startRun({ maxStars, orderByStage, difficultyWeights })) {
		alert('No active stars match the selected options!')
		return
	}
	renderStarList(toggleStar, togglePractice)
	startTimer()
	updateRunUI()
	pickRandomStar()
}

function onEndRun() {
	currentStar = null
	endRun()
	document.getElementById('starDisplay').textContent = ''
	clearTimer()
	renderStarList(toggleStar, togglePractice)
	updateRunUI()
}

// ── Pick ──────────────────────────────────────────────────────────────────────

function pickRandomStar() {
	if (isRunActive()) {
		const result = pickNext()
		if (result.type === 'complete') {
			currentStar = null
			const finalTime = timerStart ? formatTime(Date.now() - timerStart) : ''
			stopTimer()
			endRun()
			document.getElementById('starDisplay').textContent = 'Run complete! 🎉'
			if (finalTime) document.getElementById('runTimer').textContent = finalTime
			speak('Run complete! Congratulations!', document.getElementById('voices').value)
			renderStarList(toggleStar, togglePractice)
			updateRunUI()
			return
		}
		const { star } = result
		currentStar = star
		const el = document.getElementById(`star-${star.id}`)
		if (el) el.classList.add('done')
		document.getElementById('starDisplay').textContent = `${star.course}: ${star.name}`
		speak(`${star.courseTTS ?? star.course}: ${star.name}`, document.getElementById('voices').value)
		updateRunUI()
		return
	}
	const active = STARS.filter((s) => s.active)
	if (active.length === 0) {
		alert('No active stars to pick from!')
		return
	}
	const star = active[Math.floor(Math.random() * active.length)]
	currentStar = star
	document.getElementById('starDisplay').textContent = `${star.course}: ${star.name}`
	speak(`${star.courseTTS ?? star.course}: ${star.name}`, document.getElementById('voices').value)
}

function practiceAndPickNext() {
	if (currentStar) {
		setPractice(currentStar.id, true)
	}
	pickRandomStar()
}

// ── Init ──────────────────────────────────────────────────────────────────────

;(async () => {
	try {
		await loadStarsFromSheet()
	} catch (e) {
		console.error('Failed to load stars from sheet, falling back to defaults', e)
		await loadStars()
	}

	loadPractice()
	renderTemplateSelect()
	renderStarList(toggleStar, togglePractice)
	initVoices(document.getElementById('voices'))
	updateRunUI()
	document.getElementById('runTimer').textContent = '0:00.00'

	document.getElementById('templateSelect').addEventListener('change', (e) => {
		applyTemplate(templates, e.target.value)
		renderStarList(toggleStar, togglePractice)
		updateDeleteBtn()
	})
	document.getElementById('deleteTemplateBtn').addEventListener('click', onDeleteTemplate)
	document.getElementById('saveTemplateBtn').addEventListener('click', onSaveTemplate)
	document.getElementById('toggleAllCheckbox').addEventListener('change', (e) => {
		toggleAllStars(e.target.checked)
	})
	document.getElementById('practicePickBtn').addEventListener('click', practiceAndPickNext)
	document.getElementById('clearPracticeBtn').addEventListener('click', () => {
		STARS.forEach((star) => {
			if (star.practice) setPractice(star.id, false)
		})
	})
	document.getElementById('startRunBtn').addEventListener('click', onStartRun)
	document.getElementById('endRunBtn').addEventListener('click', onEndRun)
	document.getElementById('pickStarBtn').addEventListener('click', pickRandomStar)

	for (let i = 1; i <= 5; i++) {
		document.getElementById(`diffWeight${i}`).addEventListener('input', (e) => {
			document.getElementById(`diffWeight${i}Val`).textContent = e.target.value
		})
	}
	document.addEventListener('keydown', (e) => {
		if (document.activeElement.tagName.toLowerCase() === 'input') return
		if (e.code === 'Space') {
			e.preventDefault()
			pickRandomStar()
		}
		if (e.code === 'KeyP') {
			e.preventDefault()
			practiceAndPickNext()
		}
	})
})()
