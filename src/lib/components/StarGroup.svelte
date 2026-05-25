<script lang="ts">
	import type { CourseGroup } from '../types'

	type Props = {
		group: CourseGroup
		onToggleStar: (id: number) => void
		onTogglePractice: (id: number) => void
	}

	let { group, onToggleStar, onTogglePractice }: Props = $props()

	function formatStarTime(time: number) {
		return `${String(Math.floor(time / 60000)).padStart(2, '0')}:${String(Math.floor(time / 1000) % 60).padStart(2, '0')}`
	}
</script>

<div class="course-group">
	<div class="course-header">{group.course}</div>

	{#each group.stars as star}
		<div class:inactive={!star.active} class:done={star.done} class:practice={star.practice} class="star-item">
			<input
				id={`star-toggle-${star.id}`}
				type="checkbox"
				checked={star.active}
				onchange={() => onToggleStar(star.id)} />
			<label class="star-name" for={`star-toggle-${star.id}`}>{star.name}</label>
			<span class="practice-badge">practice</span>
			<span class="star-meta">
				<span class="star-diff" data-diff={star.difficulty}>
					{#each [1, 2, 3, 4, 5] as dot}
						<span class:filled={dot <= star.difficulty} class="diff-dot">●</span>
					{/each}
				</span>

				{#if star.time > 0}
					<span class="star-time">{formatStarTime(star.time)}</span>
				{/if}

				<button
					type="button"
					class:active={star.practice}
					class="practice-btn"
					title="Toggle practice"
					onclick={() => onTogglePractice(star.id)}>
					📝
				</button>
			</span>
		</div>
	{/each}
</div>
