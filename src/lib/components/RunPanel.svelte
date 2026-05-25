<script lang="ts">
	import type { KeyBindings } from '../types'

	type Props = {
		currentStarDifficulty: number | null
		difficultyWeights: number[]
		initialized: boolean
		keybinds: KeyBindings
		loadError: string
		runActive: boolean
		runMaxStars: number | undefined
		runOrderByStage: boolean
		runStatus: string
		runTimer: string
		selectedVoice: string
		starDisplay: string
		voices: SpeechSynthesisVoice[]
		onDifficultyWeightChange: (index: number, value: string) => void
		onEndRun: () => void
		onKeybindChange: (action: keyof KeyBindings, code: string) => void
		onPickNext: () => void
		onPracticeAndPickNext: () => void
		onSkipStar: () => void
		onRunMaxStarsChange: (value: number | undefined) => void
		onRunOrderByStageChange: (value: boolean) => void
		onStartRun: () => void
		onVoiceChange: (value: string) => void
	}

	let {
		currentStarDifficulty,
		difficultyWeights,
		initialized,
		keybinds,
		loadError,
		runActive,
		runMaxStars,
		runOrderByStage,
		runStatus,
		runTimer,
		selectedVoice,
		starDisplay,
		voices,
		onDifficultyWeightChange,
		onEndRun,
		onKeybindChange,
		onPickNext,
		onPracticeAndPickNext,
		onSkipStar,
		onRunMaxStarsChange,
		onRunOrderByStageChange,
		onStartRun,
		onVoiceChange,
	}: Props = $props()

	let rebindingAction = $state<keyof KeyBindings | null>(null)

	$effect(() => {
		if (rebindingAction === null) return

		const handler = (event: KeyboardEvent) => {
			event.preventDefault()
			event.stopPropagation()
			if (event.code !== 'Escape') {
				onKeybindChange(rebindingAction!, event.code)
			}
			rebindingAction = null
		}

		window.addEventListener('keydown', handler, { capture: true })
		return () => window.removeEventListener('keydown', handler, { capture: true })
	})

	function formatKeyCode(code: string): string {
		if (code.startsWith('Key')) return code.slice(3)
		if (code.startsWith('Digit')) return code.slice(5)
		const arrows: Record<string, string> = {
			ArrowUp: '↑',
			ArrowDown: '↓',
			ArrowLeft: '←',
			ArrowRight: '→',
		}
		return arrows[code] ?? code
	}

	const KEYBIND_LABELS: Record<keyof KeyBindings, string> = {
		pickNext: 'Next Star',
		skipStar: 'Skip Star',
		practiceAndPickNext: 'Mark Practice & Next',
	}
</script>

<section class="panel run-panel">
	<div class="star-display">
		{#if !initialized && !loadError}
			Loading stars…
		{:else}
			{starDisplay}
			{#if currentStarDifficulty !== null}
				<div class="star-difficulty">
					{#each { length: 5 } as _, i}
						<span class={`dw${i + 1}`} class:dim={i >= currentStarDifficulty}>●</span>
					{/each}
				</div>
			{/if}
		{/if}
	</div>

	<div class="run-timer">{runTimer}</div>
	<div class="run-status">{runStatus}</div>

	<div class="run-options">
		<div class="run-option-row">
			<label for="runMaxStars">Stars</label>
			<input
				id="runMaxStars"
				type="number"
				min="1"
				placeholder="All"
				value={runMaxStars ?? ''}
				oninput={(event) => {
					const value = (event.currentTarget as HTMLInputElement).value
					onRunMaxStarsChange(value ? Number(value) : undefined)
				}} />
		</div>

		<div class="run-option-row checkbox-row">
			<label for="runOrderByStage">Order by stage</label>
			<input
				id="runOrderByStage"
				type="checkbox"
				checked={runOrderByStage}
				onchange={(event) => onRunOrderByStageChange((event.currentTarget as HTMLInputElement).checked)} />
		</div>

		<div class="diff-weights">
			<span class="diff-weights-label">Difficulty weights</span>

			{#each difficultyWeights as weight, index}
				<div class="diff-weight-row">
					<span class={`diff-weight-label dw${index + 1}`}>●</span>
					<input
						type="range"
						min="0"
						max="5"
						value={weight}
						oninput={(event) =>
							onDifficultyWeightChange(index, (event.currentTarget as HTMLInputElement).value)} />
					<span class="diff-weight-val">{weight}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="run-buttons">
		<button type="button" disabled={!initialized || !!loadError || runActive} onclick={onStartRun}>
			▶ Start Run
		</button>
		<button type="button" class="outline secondary" disabled={!runActive} onclick={onEndRun}>■ End Run</button>
	</div>

	<hr />

	<label for="voices">Voice</label>
	<select
		id="voices"
		value={selectedVoice}
		disabled={voices.length === 0}
		onchange={(event) => onVoiceChange((event.currentTarget as HTMLSelectElement).value)}>
		{#if voices.length === 0}
			<option value="">No English voices available</option>
		{:else}
			{#each voices as voice}
				<option value={voice.name}>{voice.name} ({voice.lang})</option>
			{/each}
		{/if}
	</select>

	<div class="pick-buttons">
		<button type="button" class="pick-btn" disabled={!initialized || !!loadError} onclick={onPickNext}>
			🎲 Next Star
		</button>
		<button type="button" class="pick-btn secondary outline" disabled={!runActive} onclick={onSkipStar}>
			⏭ Skip Star
		</button>
		<button
			type="button"
			class="pick-btn secondary outline"
			disabled={!initialized || !!loadError}
			onclick={onPracticeAndPickNext}>
			📝 Mark Practice &amp; Next
		</button>
	</div>

	<hr />

	<details class="keybinds-panel">
		<summary>Keybinds</summary>
		<div class="keybinds-list">
			{#each Object.keys(KEYBIND_LABELS) as action (action)}
				{@const key = action as keyof KeyBindings}
				<div class="keybind-row">
					<span class="keybind-label">{KEYBIND_LABELS[key]}</span>
					<button
						type="button"
						class="keybind-btn outline secondary"
						class:listening={rebindingAction === key}
						onclick={() => (rebindingAction = rebindingAction === key ? null : key)}>
						{rebindingAction === key ? 'Press a key…' : formatKeyCode(keybinds[key])}
					</button>
				</div>
			{/each}
		</div>
	</details>
</section>
