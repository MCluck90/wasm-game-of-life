import { Universe, Cell } from 'wasm-game-of-life';
import { memory } from 'wasm-game-of-life/wasm_game_of_life_bg';

const fps = new class {
	constructor() {
		this.fps = document.getElementById('fps');
		this.frames = [];
		this.lastFrameTimeStamp = performance.now();
	}

	render() {
		// Convert the delta time since the last frame render into a measure
		// of frames per second.
		const now = performance.now();
		const delta = now - this.lastFrameTimeStamp;
		this.lastFrameTimeStamp = now;
		const fps = 1 / delta * 1000;

		// Save only the latest 100 timings.
		this.frames.push(fps);
		if (this.frames.length > 100) {
			this.frames.shift();
		}

		// Find the max, min, and mean of our 100 latest timings.
		let min = Infinity;
		let max = -Infinity;
		let sum = 0;
		for (let frame of this.frames) {
			sum += frame;
			min = Math.min(min, frame);
			max = Math.max(max, frame);
		}
		let mean = sum / this.frames.length;

		// Render the statistics.
		this.fps.textContent = `
Frames per Second:
				 latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
			`.trim();
	}
}

const CELL_SIZE = 5; // px
const GRID_COLOR = '#CCCCCC';
const DEAD_COLOR = '#FFFFFF';
const ALIVE_COLOR = '#000000';

const ticksPerFrameEl = document.getElementById('ticks-per-frame');
let animationId = null;
let ticksPerFrame = ticksPerFrameEl.value;

// Construct the universe, and get its width and height
const universe = Universe.new();
const width = universe.width();
const height = universe.height();

// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = document.getElementById('game-of-life-canvas');
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

const ctx = canvas.getContext('2d');

const renderLoop = () => {
	fps.render();
	for (let i = 0; i < ticksPerFrame; i++) {
		universe.tick();
	}

	drawGrid();
	drawCells();

	animationId = requestAnimationFrame(renderLoop);
};

const getIndex = (row, column) => row * width + column;

const drawGrid = () => {
	ctx.beginPath();
	ctx.strokeStyle = GRID_COLOR;

	// Vertical lines
	for (let i = 0; i <= width; i++) {
		ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
		ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
	}

	// Horizontal lines
	for (let i = 0; i <= width; i++) {
		ctx.moveTo(0,														i * (CELL_SIZE + 1) + 1);
		ctx.lineTo((CELL_SIZE + 1) * width + 1, i * (CELL_SIZE + 1) + 1);
	}

	ctx.stroke();
};

const drawCells = () => {
	const cellsPtr = universe.cells();
	const cells = new Uint8Array(memory.buffer, cellsPtr, width * height);

	ctx.beginPath();

	// Alive cells
	ctx.fillStyle = ALIVE_COLOR;
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < height; col++) {
			const idx = getIndex(row, col);
			if (cells[idx] !== Cell.Alive) {
				continue;
			}

			ctx.fillRect(
				col * (CELL_SIZE + 1) + 1,
				row * (CELL_SIZE + 1) + 1,
				CELL_SIZE,
				CELL_SIZE,
			);
		}
	}

	// Dead cells
	ctx.fillStyle = DEAD_COLOR;
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < height; col++) {
			const idx = getIndex(row, col);
			if (cells[idx] !== Cell.Dead) {
				continue;
			}

			ctx.fillRect(
				col * (CELL_SIZE + 1) + 1,
				row * (CELL_SIZE + 1) + 1,
				CELL_SIZE,
				CELL_SIZE,
			);
		}
	}

	ctx.stroke();
};

const isPaused = () => animationId === null;

const playPauseButton = document.getElementById('play-pause');

const play = () => {
	playPauseButton.textContent = '⏸';
	renderLoop();
};

const pause = () => {
	playPauseButton.textContent = '▶';
	cancelAnimationFrame(animationId);
	animationId = null;
};

playPauseButton.addEventListener('click', _ => {
	if (isPaused()) {
		play();
	} else {
		pause();
	}
});

canvas.addEventListener('click', event => {
	const boundingRect = canvas.getBoundingClientRect();

	const scaleX = canvas.width / boundingRect.width;
	const scaleY = canvas.height / boundingRect.height;

	const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
	const canvasTop = (event.clientY - boundingRect.top) * scaleY;

	const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
	const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

	if (event.ctrlKey) {
		universe.create_glider(row, col);
	} else {
		universe.toggle_cell(row, col);
	}

	drawGrid();
	drawCells();
});

ticksPerFrameEl.addEventListener('input', _ => {
	ticksPerFrame = ticksPerFrameEl.value;
});

document.getElementById('clear').addEventListener('click', _ => {
	universe.set_width(universe.width());
	drawGrid();
	drawCells();
});

document.getElementById('new').addEventListener('click', _ => {
	universe.randomize_cells();
	drawGrid();
	drawCells();
});

drawGrid();
drawCells();
pause();