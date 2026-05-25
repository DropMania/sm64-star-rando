const synth = window.speechSynthesis
const VOICE_KEY = 'sm64-voice'

export function initVoices(selectEl) {
	const saved = localStorage.getItem(VOICE_KEY)

	function populate() {
		const voices = synth.getVoices().filter((v) => v.lang.startsWith('en'))
		if (voices.length === 0) return false
		selectEl.innerHTML = ''
		voices.forEach((voice) => {
			const option = document.createElement('option')
			option.value = voice.name
			option.textContent = `${voice.name} (${voice.lang})`
			if (saved && voice.name === saved) option.selected = true
			selectEl.appendChild(option)
		})
		return true
	}

	if (!populate()) {
		synth.onvoiceschanged = populate
	}

	selectEl.addEventListener('change', () => {
		localStorage.setItem(VOICE_KEY, selectEl.value)
	})
}

export function speak(text, voiceName) {
	const utterance = new SpeechSynthesisUtterance(text)
	if (voiceName) {
		utterance.voice = synth.getVoices().find((v) => v.name === voiceName) ?? null
	}
	synth.speak(utterance)
}
