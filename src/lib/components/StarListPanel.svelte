<script lang="ts">
	import StarGroup from './StarGroup.svelte'
	import type { CourseGroup, TemplateMap } from '../types'

	type Props = {
		groupedStars: CourseGroup[]
		initialized: boolean
		loadError: string
		selectedTemplate: string
		templateName: string
		templates: TemplateMap
		toggleAllChecked: boolean
		toggleAllIndeterminate: boolean
		onClearPractice: () => void
		onDeleteTemplate: () => void
		onSaveTemplate: () => void
		onTemplateChange: (name: string) => void
		onTemplateNameChange: (value: string) => void
		onToggleAllStars: (checked: boolean) => void
		onTogglePractice: (id: number) => void
		onToggleStar: (id: number) => void
	}

	let {
		groupedStars,
		initialized,
		loadError,
		selectedTemplate,
		templateName,
		templates,
		toggleAllChecked,
		toggleAllIndeterminate,
		onClearPractice,
		onDeleteTemplate,
		onSaveTemplate,
		onTemplateChange,
		onTemplateNameChange,
		onToggleAllStars,
		onTogglePractice,
		onToggleStar,
	}: Props = $props()

	let toggleAllInput: HTMLInputElement | null = null

	$effect(() => {
		if (toggleAllInput) {
			toggleAllInput.indeterminate = toggleAllIndeterminate
		}
	})
</script>

<section class="panel star-panel">
	<div class="panel-controls">
		<div class="control-row">
			<select
				aria-label="Saved templates"
				value={selectedTemplate}
				onchange={(event) => onTemplateChange((event.currentTarget as HTMLSelectElement).value)}
			>
				{#each Object.keys(templates) as name}
					<option value={name}>{name}</option>
				{/each}
			</select>
			<button
				type="button"
				class="outline secondary icon-btn"
				title="Delete template"
				disabled={selectedTemplate === 'all'}
				onclick={onDeleteTemplate}
			>
				✕
			</button>
		</div>

		<div class="control-row">
			<input
				type="text"
				placeholder="New template name…"
				value={templateName}
				oninput={(event) => onTemplateNameChange((event.currentTarget as HTMLInputElement).value)}
				onkeydown={(event) => {
					if (event.key === 'Enter') onSaveTemplate()
				}}
			/>
			<button type="button" class="outline" onclick={onSaveTemplate}>Save</button>
		</div>

		<div class="toggle-all-row">
			<label class="toggle-all-label" for="toggle-all-stars">
				<input
					bind:this={toggleAllInput}
					id="toggle-all-stars"
					type="checkbox"
					checked={toggleAllChecked}
					onchange={(event) => onToggleAllStars((event.currentTarget as HTMLInputElement).checked)}
				/>
				<span>Select all</span>
			</label>
			<button
				type="button"
				class="outline secondary icon-btn"
				title="Clear all practice tags"
				onclick={onClearPractice}
			>
				🗑
			</button>
		</div>
	</div>

	<div class="star-list">
		{#if loadError}
			<p class="error-state">{loadError}</p>
		{:else if !initialized}
			<p class="loading-state">Loading stars…</p>
		{:else}
			{#each groupedStars as group}
				<StarGroup {group} {onTogglePractice} {onToggleStar} />
			{/each}
		{/if}
	</div>
</section>
