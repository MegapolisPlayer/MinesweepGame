let array = [];
let revealedArray = [];
let flagArray = [];
let mineCountArray = [];

let arraySizeX;
let arraySizeY;
let amountMines;

let canvasContext;
let canvasSizeX;
let canvasSizeY;

let boxSizeX;
let boxSizeY;

let mineImage;
let flagImage;

let firstClick;
let clickMode;
let clickAllowed;

let nocturne;
let pressedKeys = [];
let isEEEnabled;

//easter egg suppression tag
let IGNORE_EASTER_EGG = false;

async function loadImage(filename) {
	let temp;
	const promise = new Promise((resolve) => {
		temp = new Image();
		temp.src = "assets/"+filename;
		temp.addEventListener("load", resolve);
	});
	await promise;
	return temp;
}

function getNeighborIds(id) {
	let xc = (id%arraySizeX);
	let yc = Math.trunc(id/arraySizeX);
	let arr = [];

	for(let x = -1; x <= 1; x++) {
		for(let y = -1; y <= 1; y++) {
			if(x == 0 && y == 0) continue;

			if((xc+x) >= 0 && (xc+x) < arraySizeX && (yc+y) >= 0 && (yc+y) < arraySizeY) {
				arr.push((yc+y)*arraySizeX+(xc+x));
			}
		}
	}

	return arr;
}

function generateMineArray() {
	array = Array(arraySizeX*arraySizeY).fill(false);
	clickedArray = Array(arraySizeX*arraySizeY).fill(false);
	flagArray = Array(arraySizeX*arraySizeY).fill(false);
	mineCountArray = Array(arraySizeX*arraySizeY).fill(0);

	let minesMade = 0;
	do {
		let id = Math.trunc(Math.random()*array.length);
		if(!array[id]) {
			array[id] = true;
			minesMade++;
			let neighbors = getNeighborIds(id);
			for (n of neighbors) {
				mineCountArray[n] += 1;
			}
		}
	}
	while(minesMade != amountMines);
}

function modeClear() { 
	clickMode = "clear"; 
	document.getElementById("mode").textContent = "Clear (reveal tiles)";
}
function modeFlag() { 
	clickMode = "flag";
	document.getElementById("mode").textContent = "Flag (select which tiles are mines)";
}

function checkWin() {
	//if only mines are unrevealed
	for(let i = 0; i < array.length; i++) {
		if(array[i] != !revealedArray[i]) {
			return;
		}
	}
	win();
}

//EE-specific messages

function win() {
	document.getElementById("name").textContent = "You won minesweeper!";
	clickAllowed = false;
	drawField();
}

function lose() {
	document.getElementById("name").textContent = "Game over.";
	clickAllowed = false;
	drawField();
}

function reveal(id) {
	if(flagArray[id]) return; //do not reveal if is flagged

	//https://www.reddit.com/r/Minesweeper/comments/v481jm/i_want_to_know_how_the_tiles_open_up_when_clicked/
	revealedArray[id] = true;

	if(mineCountArray[id] != 0) { return; }

	for(n of getNeighborIds(id)) {
		//dont reveal flagged ones
		if(!revealedArray[n] && !flagArray[id]) {
			revealedArray[n] = true;
			reveal(n);
		}
	}
}

function drawField(drawMinesOverride = false) {
	canvasContext.clearRect(0, 0, canvasSizeX, canvasSizeY);
	for(let i = 0; i < array.length; i++) {

		if(revealedArray[i]) {
			canvasContext.fillStyle = "#808080";
			canvasContext.fillRect(boxSizeX*(i%arraySizeX), boxSizeY*Math.trunc(i/arraySizeX), boxSizeX, boxSizeY);
			if(mineCountArray[i] > 0) {
				canvasContext.fillStyle = "#000080";
				canvasContext.fillText(mineCountArray[i], boxSizeX*(i%arraySizeX)+boxSizeX*0.5, boxSizeY*Math.trunc(i/arraySizeX)+boxSizeY*0.5, boxSizeX);
			}
		}
		else {
			canvasContext.fillStyle = "#cccccc";
			canvasContext.fillRect(boxSizeX*(i%arraySizeX), boxSizeY*Math.trunc(i/arraySizeX), boxSizeX, boxSizeY);
			if(flagArray[i]) {
				canvasContext.drawImage(flagImage, boxSizeX*(i%arraySizeX), boxSizeY*Math.trunc(i/arraySizeX), boxSizeX, boxSizeY);
			}
		}

		if(array[i] && (!clickAllowed || drawMinesOverride)) {
			canvasContext.drawImage(mineImage, boxSizeX*(i%arraySizeX), boxSizeY*Math.trunc(i/arraySizeX), boxSizeX, boxSizeY);
		}

		canvasContext.strokeStyle = "#000000";
		canvasContext.strokeRect(boxSizeX*(i%arraySizeX), boxSizeY*Math.trunc(i/arraySizeX), boxSizeX, boxSizeY);
	}
}

function canvasOnClickListener(e) {
	if(!clickAllowed) return;

	let mouseX = Math.trunc((e.pageX - e.target.offsetLeft)/boxSizeX);
	let mouseY = Math.trunc((e.pageY - e.target.offsetTop)/boxSizeY);
	let id = mouseY*arraySizeX+mouseX;

	console.log("Clicked on tile ", mouseX, mouseY, id);
	console.log("Clicked with button ", e.button);

	if(clickMode == "clear" && e.button != 2) {
		//click on unflagged mine
		if(array[id] && !flagArray[id]) {
			if(firstClick) {
				//first click not a loss - move mine
				do {
					let nid = Math.trunc(Math.random()*array.length);
					if(!array[nid]) {
						array[nid] = true;
						let neighbors = getNeighborIds(nid);
						for (n of neighbors) {
							mineCountArray[n] += 1;
						}
						break;
					}
				}
				while(true);

				array[id] = false;
				let neighbors = getNeighborIds(id);
				for (n of neighbors) {
					mineCountArray[n] -= 1;
				}

				reveal(id);

				firstClick = false;

				drawField();

				return;
			}
			//clicked on mine, oops
			lose();
		}
		else {
			reveal(id);
			checkWin();
		}
	}
	else if(clickMode == "flag" || e.button == 2) {
		flagArray[id] = !flagArray[id]; //toggle
	}
	else {
		console.error("What are you doing?");
	}
	
	drawField();

	firstClick = false;
}

function makeCanvas() {
	let elem = document.getElementById("main");
	let elemBounds = elem.getBoundingClientRect();

	canvasSizeX = elemBounds.width;
	canvasSizeY = elemBounds.height;
	elem.width = canvasSizeX;
	elem.height = canvasSizeY;

	canvasContext = elem.getContext("2d");
	canvasContext.fillStyle = "#000000";
	canvasContext.textAlign = "center";
	canvasContext.textBaseline = "middle"; //vertical align

	elem.addEventListener("mousedown", canvasOnClickListener);
	elem.addEventListener("contextmenu", e => { e.preventDefault(); return false; });
}

//init

async function init(x, y, amount) {
	mineImage = await loadImage("bomb.png");
	flagImage = await loadImage("flag.png");

	arraySizeX = x;
	arraySizeY = y;
	amountMines = amount;

	firstClick = true;
	clickAllowed = true;

	generateMineArray();
	makeCanvas();

	boxSizeX = canvasSizeX/arraySizeX;
	boxSizeY = canvasSizeY/arraySizeY;
	canvasContext.font = "normal "+(30/arraySizeX)+"vw sans-serif";

	document.getElementById("mineamount").textContent = amountMines;

	modeClear();

	drawField();
}

function reset() {
	array = [];
	revealedArray = [];
	flagArray = [];	
	mineCountArray = [];

	document.getElementById("name").textContent = "Minesweeper";

	generateMineArray();

	firstClick = true;
	clickAllowed = true;

	boxSizeX = canvasSizeX/arraySizeX;
	boxSizeY = canvasSizeY/arraySizeY;
	canvasContext.font = "normal "+(30/arraySizeX)+"vw sans-serif";

	document.getElementById("mineamount").textContent = amountMines;

	modeClear();

	drawField();
}

function changeSettings() {
	let newx = "NaN";
	do {
		newx = window.prompt("Enter new X size (5 to 100): ");
		if(newx == null) return;
	}
	while(isNaN(newx));
	arraySizeX = Math.min(Math.max(5, newx), 100);

	let newy = "NaN";
	do {
		newy = window.prompt("Enter new Y size (5 to 100): ");
		if(newy == null) return;
	}
	while(isNaN(newy));
	arraySizeY = Math.min(Math.max(5, newy), 100);

	//amount of mines square root of size
	amountMines = Math.sqrt(newx*newy);

	reset();
}

init(10, 10, 10);
