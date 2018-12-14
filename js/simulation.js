// simulation.js
// Last modified on 12/13/18

document.addEventListener('DOMContentLoaded', function() {
  var elems = document.querySelectorAll('select');
  var instances = M.FormSelect.init(elems, {});
  UISetup();
});

// Simulations modules. A set of objects defining initial presets for simulations. 
const TRAFFIC_MODULE = {
  envSettings: {numLights: 0, numFood: 0, numHazard: 0},
  numPopulations: 1,
  traits: [TRAFFIC]
}

const FOOD_FINDER_MODULE = {
  envSettings: {numLights: 0, numFood: 15, numHazard: 10},
  numPopulations: 1,
  traits: [FOOD_FINDER]
}

const PREDATOR_PREY_MODULE = {
  envSettings: {numLights: 0, numFood: 0, numHazard: 0},
  numPopulations: 2,
  traits: [PREDATOR, PREY]
}

// const EXPLORATION_MODULE = {
//   envSettings: {numLights: 6, numFood: 6, numHazard: 6},
//   numPopulations: 1,
//   traits: [EXPLORER]
// }

const CLUSTER_MODULE = {
  envSettings: {numLights: 0, numFood: 0, numHazard: 0},
  numPopulations: 3,
  traits: [CLUSTER1, CLUSTER2, CLUSTER3]
}

var config = {
  fps: 60,
  simulationSpeed: 1, // factor applied to deltaT to control simulation speed

  renderNeuralCircuit: true,
  renderFields: false, // turn on/off the circles around signals

  environmentNoise: 0.1,  // Controls amount of random noise calculated into vehicle movement. Ranges from 0 to 1
  signalRadius: 1,  // slider
  signalIntensity: 1, // slider

  massScale: 1, // (default = 0.1)
  motorSpeed: 100,  // default = 100
  motorFriction: 0.1, // ranges from 0 to 1 (default = 0.1)
  motorFrontBackPlacement: -0.9,  // slides motors back / forward (ranges from -1 to 1) (default = -0.9)
  motorSeparation: 1.3, // slides motors closer together / farther apart (ranges from 0 to 1.5ish) (default = 1.3)
  sensorFrontBackPlacement: 0.9, // slides sensors back/ forward (ranges from 1 to -1) (default = 0.9)
  sensorSeparation: 0.75, // slides sensors closer together/ farther apart (ranges from 0 to 1) (default = 0.75)

  randomizeNC: false,
  populationSize: 5,
  generationLifespan: Infinity,
  numberCopied: 2,

  mutationRate: SLOW,
  simModule: TRAFFIC_MODULE
};

var simCanvas;
var canvasWidth, canvasHeight;

var paused = false;

var world;
var deltaT = config.simulationSpeed / config.fps;
var generationTimer = 0;
var newGeneration = false;

function setup() {
  canvasWidth = document.getElementById("simulation-canvas").clientWidth;
  canvasHeight = window.innerHeight;
  simCanvas = createCanvas(canvasWidth, canvasHeight);
  simCanvas.parent("simulation-canvas");

  frameRate(config.fps);
  rectMode(RADIUS);
  angleMode(RADIANS);

  // Initialize simulation with default settings
  Reset();
}

function draw() {
  background(245);

  world.update();
  world.render();

  displayMouseCoordinates()
  displayFPS();
  displayGeneration();
}

// runModule receives a simModule objet and sets up the populations accordingly.
function runModule(simModule) {

  // Setup environment
  world.setup(simModule.envSettings);

  // Setup populations
  for (let i = 0; i < simModule.numPopulations; i++) {
    var p = new Population(config.populationSize, simModule.traits[i], config.mutationRate);
    p.populate();
    world.populations.push(p);
  }
}

// Draws mouse (x, y) coordinates in bottom left corner of the canvas
function displayMouseCoordinates() {
  text("(" + mouseX.toFixed(0) + ", " + mouseY.toFixed(0) + ")", 0.005*canvasWidth, 0.965*canvasHeight, 100, 50);
}

// Draws the current framerate in the top left corner of the canvas
function displayFPS() {
  text("fps: " + frameRate().toFixed(0), 0.005*canvasWidth, 0.005*canvasHeight, 100, 50);
}

// Draws the current generation in the top right corner of the canvas
function displayGeneration() {
  text("Generation: " + world.generation.toString(), canvasWidth - 100, 0.005*canvasHeight, 100, 50)
}

function windowResized() {
  canvasWidth = document.getElementById("simulation-canvas").clientWidth;
  canvasHeight = window.innerHeight;
  resizeCanvas(canvasWidth, canvasHeight);


}
