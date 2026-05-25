<script lang="ts">
	import { onMount } from 'svelte'
	import AppFooter from './lib/components/AppFooter.svelte'
	import AppHeader from './lib/components/AppHeader.svelte'
	import RunPanel from './lib/components/RunPanel.svelte'
	import StarListPanel from './lib/components/StarListPanel.svelte'
	import { createRandomizerController } from './lib/randomizer-controller.svelte'

	const randomizer = createRandomizerController()

	onMount(() => randomizer.mount())
</script>

<svelte:head>
	<title>SM64 Star Randomizer</title>
	<meta name="description" content="Generate random Super Mario 64 stars for runs and practice." />
</svelte:head>

<main class="container">
	<AppHeader />

	<div class="layout">
		<StarListPanel
			groupedStars={randomizer.groupedStars}
			initialized={randomizer.initialized}
			loadError={randomizer.loadError}
			selectedTemplate={randomizer.selectedTemplate}
			templateName={randomizer.templateName}
			templates={randomizer.templates}
			toggleAllChecked={randomizer.toggleAllChecked}
			toggleAllIndeterminate={randomizer.toggleAllIndeterminate}
			onClearPractice={randomizer.clearPractice}
			onDeleteTemplate={randomizer.deleteCurrentTemplate}
			onSaveTemplate={randomizer.saveCurrentTemplate}
			onTemplateChange={randomizer.handleTemplateChange}
			onTemplateNameChange={randomizer.handleTemplateNameChange}
			onToggleAllStars={randomizer.toggleAllStars}
			onTogglePractice={randomizer.togglePractice}
			onToggleStar={randomizer.toggleStar} />

		<RunPanel
			currentStarDifficulty={randomizer.currentStar?.difficulty ?? null}
			difficultyWeights={randomizer.difficultyWeights}
			initialized={randomizer.initialized}
			keybinds={randomizer.keybinds}
			loadError={randomizer.loadError}
			runActive={randomizer.runActive}
			runMaxStars={randomizer.runMaxStars}
			runOrderByStage={randomizer.runOrderByStage}
			runStatus={randomizer.runStatus}
			runTimer={randomizer.runTimer}
			selectedVoice={randomizer.selectedVoice}
			starDisplay={randomizer.starDisplay}
			voices={randomizer.voices}
			onDifficultyWeightChange={randomizer.updateDifficultyWeight}
			onEndRun={randomizer.endRunFlow}
			onKeybindChange={randomizer.updateKeybind}
			onPickNext={randomizer.pickRandomStar}
			onPracticeAndPickNext={randomizer.practiceAndPickNext}
			onSkipStar={randomizer.skipStar}
			onRunMaxStarsChange={randomizer.updateRunMaxStars}
			onRunOrderByStageChange={randomizer.updateRunOrderByStage}
			onStartRun={randomizer.startRunFlow}
			onVoiceChange={randomizer.updateVoice} />
	</div>

	<AppFooter />
</main>
