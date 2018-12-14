// vehicle_v4.js
// Written by Aaron Seibel
// Last modified on 12/13/18

// Vehicle class definition.
// A vehicle is an abstraction of some generic creature.
// Each vehicle is equipped with a set of sensors and effectors that are connected according to its neural circuit.
// Each instance of Vehicle will have a size, color, signal according to its population and neural circuit according to its genome.
class Vehicle {

  constructor(x, y, population) {
    this.population = population
    this.id = 0;
    this.genome = {};
    this.fitnessScore = 0;
    
    // setup physical properties
    this.body = new Body(this, x, y, population.agentSize, 1.5*population.agentSize, random(0, 2*PI), 0, config.motorFrontBackPlacement);
    this.color = population.color;

    // setup sensors; create 2 for each type of sensor.
    this.sensors = [];
    var len = population.sensorTypes.length;
    for (let i = 0; i < len; i++) {
      this.addSensor(new Sensor(this.body, "LEFT", (PI/6 * (len-1)) * (-1*PI/4 + 2*i/len), population.sensorTypes[i]));
      this.addSensor(new Sensor(this.body, "RIGHT", -(PI/6 * (len-1)) * (-1*PI/4 + 2*i/len), population.sensorTypes[i]));
    }
    
    // setup effectors
    this.effectors = [];
    this.addEffector(new Effector(this.body, "LEFT"));
    this.addEffector(new Effector(this.body, "RIGHT"));

    // setup signal
    if (population.signal != null) {
      this.addSignal(new Signal(0, this.body.axisOffsetY, 1, 1, population.signal));    
    }

    // setup Neural Circuit
    this.brain = new NeuralCircuit(this.body);
  }

  // Vehicle.addSensor takes as input a sensor object and adds it to Vehicle's 'sensors' array
  // Also adds the object as a child of the Vehicle's Body property for rendering purposes
  addSensor(s) {
    this.sensors.push(s);
    this.body.addChild(s);
  }

  // Vehicle.addEffector takes as input an effector object and adds it to Vehicle's 'effectors' array
  // Also adds the object as a child of the Vehicle's Body property for rendering purposes
  // *Note: a vehicle will always have exactly 2 effectors
  addEffector(e) {
    this.effectors.push(e);
    this.body.addChild(e);
  }

  // Vehicle.setSignal takes as input a Signal object and sets it as the Vehicle's signal property
  // Also adds the object as a child of the Vehicle's Body property for rendering purposes.
  addSignal(s) {
    this.signal = s;
    this.body.addChild(s);
  }

  // connectNeuralCircuit is a utility function that adds Neurons to the Vehicle's Neural Circuit
  // for each of its effectors and sensors. It also adds synapses to the Neural Circuit according to the genome.
  connectNeuralCircuit() {
    // Create neurons and synapses in brain. Initialize layers.
    this.brain.layers = [];

    // initialize layers of NC
    for (var i = 0; i < this.population.genePool.layers.length; i++) {
      this.brain.layers.push([]); // push empty array
    }

    // Add sensor neurons corresponding to sensors in vehicle.
    for (let i = 0; i < this.genome.inputNeuronGenes.length; i++) {
      var n = new SensorNeuron(this.brain, this.genome.inputNeuronGenes[i], this.sensors[i]); // equal number of inputNeuronGenes and sensors.
      //neuron.layer = gene.layer; // copied layer
      this.brain.addNeuron(n);
      this.sensors[i].neuron = n;
    }

    // Add effector neurons corresponding to effectors in vehicle.
    for (let i = 0; i < this.genome.outputNeuronGenes.length; i++) {
      var n = new EffectorNeuron(this.brain, this.genome.outputNeuronGenes[i], this.effectors[i]);
      this.brain.addNeuron(n);
      this.effectors[i].neuron = n;
    }

    // Add hidden neurons.
    for (let i = 0; i < this.genome.neuronGenes.length; i++) {
      this.brain.addNeuron(new Neuron(this.brain, this.genome.neuronGenes[i]));
    }

    // Add synapses.
    for (let i = 0; i < this.genome.synapseGenes.length; i++) {
      this.brain.addSynapse(new Synapse(this.brain, this.genome.synapseGenes[i]));
    }

    // Adjust position of hidden nodes for rendering
    for (var l = 1; l < this.brain.layers.length - 1; l++) {
      for (var i = 0; i < this.brain.layers[l].length; i++) {
        var y = this.brain.layers[0][0].y - (this.brain.layers[0][0].y - this.brain.layers[this.brain.layers.length-1][0].y) * (this.brain.layers[l][i].layer) / (this.brain.layers.length-1);
        var x = -this.body.width * (-1 + 2 * ((i + 1)/(this.brain.layers[l].length + 1)));
        this.brain.layers[l][i].adjustPosition(x, y);
      } 
    }

    this.body.addChild(this.brain);
  }

  update() {
    
    // update position
    this.drive();
    
    // process inputs
    this.brain.process();
    
    // update fitness score
    this.fitness();
  }

  // Vehicle.drive updates the position of the vehicle based on the velocity of each effector
  drive() {
    var dL, dR, dAvg, theta, r;
    var EL, ER;
    EL = this.effectors[0]; ER = this.effectors[1];

    // calculate distance traveled by each effector
    dL = EL.velocity * deltaT;
    dR = ER.velocity * deltaT;

    // adjust for random noise
    dL *= (1 + config.environmentNoise * randomGaussian());
    dR *= (1 + config.environmentNoise * randomGaussian());

    // calculate distance traveled and steering angle
    dAvg = (dL + dR) / 2;
    theta = (dL - dR) / (abs(EL.x) + abs(ER.x));

    // reward vehicles in traffic for forward movement
    if (this.population.tag == "traffic") {
      if (dAvg > 0) {
        this.fitnessScore += dAvg;
      }

    // reward conservative movement for certain vehicle types
    } else if (this.population.tag == "predator" || this.population.tag == "prey" || this.population.tag == "food") {
      this.fitnessScore += (1 - abs(dAvg));
    }

    // translate and rotate about pivot
    if (theta != 0) { // drive in an arc
      r = dAvg / theta;
      this.body.pivot.add(createVector(r * (1 - cos(theta)), -r * sin(theta)).rotate(this.body.angle));
      this.body.angle += theta;
    } else { // drive straight forward
      this.body.pivot.add(createVector(0, -dAvg).rotate(this.body.angle));
    }

    // Update position
    this.body.position = p5.Vector.add(this.body.pivot, createVector(this.body.axisOffsetX, this.body.axisOffsetY).rotate(this.body.angle));    
    this.body.borders();
  }

  eat() {
    for (let s of world.signals) {
      let d = p5.Vector.dist(this.body.position, s.position);
      if (d < this.body.width) {
        s.consume(this);
        if (s.type == SIGNAL_TYPE.FOOD) {
          this.fitnessScore += 200;
        } else if (s.type == SIGNAL_TYPE.HAZARD) {
          this.fitnessScore -= 100;
        }
      }
    }
  }

  // Vehicle.fitness adjusts the fitness score of the vehicle based on the type of population that it is a member of
  fitness() {

    var d, closest;

    // Traffic navigation
    if (this.population.tag == "traffic") {
      for (let v of this.population.vehicles) {
        if (v != this) {
          d = p5.Vector.dist(v.body.position, this.body.position);
          if (d < 2 * this.body.width) { // collision detected
            this.fitnessScore -= 20;
          }
        }
      }

    // Food finder
    } else if (this.population.tag == "food") {
      this.eat();

    // Prey
    } else if (this.population.tag == "prey") {
      for (let p of world.populations) {
        if (p.tag == "predator") {
          closest = Infinity;
          for (let v of p) {
            d = p5.Vector.dist(v.body.position, this.body.position);
            if (d < closest) {
              closest = d;
            }
            if (d < 2 * this.body.width) { // collision detected
              this.fitnessScore -= 20;
            }            
          }
          this.fitnessScore += closest/2;
        }
      }
      
    // Predator
    } else if (this.population.tag == "predator") {
      for (let p of world.populations) {
        if (p.tag == "prey") {
          for (let v of p) {
            d = p5.Vector.dist(v.body.position, this.body.position);
            if (d < 2 * this.body.width) { // collision detected
              this.fitnessScore += 20;
            }            
          }
        }
      }

    // Cluster
    } else if (this.population.tag == "cluster") {
      for (let p of world.populations) {
        if (p == this.population) {
          closest = Infinity;
          for (let v of p.vehicles) {
            d = p5.Vector.dist(v.body.position, this.body.position);
            if (d < closest) {
              closest = d;
            }     
          }
          this.fitnessScore += 100 / closest;
        }
      }


    }

  }

  // Vehicle.render displays the vehicle to the canvas using functions from the p5 library
  render() {
    push();
    stroke(0);  // Black
    fill(this.color);
    this.body.render();
    pop();
  }

  /***************** genetics (Carlos) *****************/

  // mate function creates a new genome from a normal crossover of current object's genome and the partner's genome.
  static mate(parent1, parent2) {
    var child = new Vehicle(random(canvasWidth), random(canvasHeight), parent1.population);

    // create new genome
    child.genome = new Genome();
    child.genome = Genome.crossover(parent1.genome, parent2.genome);
    
    // random structural mutations
    child.genome.mutate(child.population.newSynapseMutationRate, child.population.newNeuronMutationRate, child.population.genePool);

    // Construct new neural circuit structure according to the genome.
    child.connectNeuralCircuit();

    // Inherit weights, biases, and thresholds of child's synapses from parents's brains.
    for (let i = 0; i < child.brain.synapses.length; i++) {
      let syn = child.brain.synapses[i];
      let s1 = parent1.brain.getSynapseById(syn.id);
      let s2 = parent2.brain.getSynapseById(syn.id);
      
      if (s1 != null && s2 != null) { // Inherited from both. Average them.
          syn.weight = (s1.weight + s2.weight) / 2;
          // pre synapse
          syn.pre.threshold = (s1.pre.threshold + s2.pre.threshold) / 2;
          syn.pre.bias = (s1.pre.bias + s2.pre.bias) / 2;
          // post synapse
          syn.post.threshold = (s1.post.threshold + s2.post.threshold) / 2;
          syn.post.bias = (s1.post.bias + s2.post.bias) / 2;

      } else if (s1 != null) { // Inherited from parent1.
          syn.weight = s1.weight;
          // pre synapse
          syn.pre.threshold = s1.pre.threshold;
          syn.pre.bias = s1.pre.bias;
          // post synapse
          syn.post.threshold = s1.post.threshold;
          syn.post.bias = s1.post.bias;

      } else if (s2 != null) { // Inherited from parent2.
          syn.weight = s2.weight;
          // pre synapse
          syn.pre.threshold = s2.pre.threshold;
          syn.pre.bias = s2.pre.bias;
          // post synapse
          syn.post.threshold = s2.post.threshold;
          syn.post.bias = s2.post.bias;

      } else { // Not inherited from any parent.
          syn.weight = random(-1, 1);
          // pre synapse
          syn.pre.threshold = random(0, 1);
          syn.pre.bias = random(-1, 1);
          // post synapse
          syn.post.threshold = random(0, 1);
          syn.post.bias = random(-1, 1);
      }
    }

    return child;
  }

}

// Sensor class definition
// A sensor is responsible for detecting the signals in a Vehicle's environment.
// Each sensor has a specific type, and it can only detect signals of the same type.
class Sensor {

  constructor(parent, side, angle, type) {
    this.parent = parent;
    this.neuron = {};
    this.type = type;
    this.angle = angle;
    this.y = parent.axisOffsetY - parent.height * config.sensorFrontBackPlacement;
    if (side == "LEFT" ) {
      this.x = -this.parent.width * config.sensorSeparation;
    } else if (side == "RIGHT") {
      this.x = this.parent.width * config.sensorSeparation;
    }
  }

  // Sensor.sense checks the distance between the Sensor and every signal of the same type in the Environment.
  // If the distance is less than the signal radius, then the sensor detects the signal, and its activation increases as the distance
  // to the signal decreases.
  sense() {
    var a, r, d;

    // Check all signals in the environment and add sensor activation
    a = 0;
    for (let s of world.signals) {
      if (this.type == s.type) {
        r = s.radius * config.signalRadius;
        d = p5.Vector.dist(createVector(this.x, this.y).rotate(this.parent.angle).add(this.parent.pivot), s.position);
        if (d < s.radius) {
          a += s.intensity * config.signalIntensity * (1 - d/r);
        }
      }      
    }

    // React to signals of all vehicles in all populations of environment
    for (let p of world.populations) {
      for (let v of p.vehicles) {
        // if this is not me
        if (this.parent != v.body && v.signal != null) {
          if (this.type == v.signal.type) {
            r = v.signal.radius * config.signalRadius
            d = p5.Vector.dist(createVector(this.x, this.y).rotate(this.parent.angle).add(this.parent.pivot), v.body.position);
            if (d < r) {
              a += v.signal.intensity * config.signalIntensity * (1 - d/r);
            }
          }
        }
      }
    }
    
    this.neuron.activation = a;
  }

  // Sensor.render displays the sensor to the canvas using functions from the p5 library.
  render(r) {
    push();
    noFill();
    strokeWeight(r / 10);
    translate(this.x, this.y);
    rotate(this.angle);
    if (this.type == SIGNAL_TYPE.LIGHT) {
      stroke(255, 255, 0);
      line(0, 0, 0, -0.5 * r);
      arc(0, -0.75 * r, 0.4 * r, 0.5 * r, 0, PI);
    } else if (this.type == SIGNAL_TYPE.FOOD) {
      stroke(0, 255, 0);
      line(0, 0, 0, -0.5 * r);
      line(-0.2 * r, -0.5 * r, 0.2 * r, -0.5 * r);
      line(-0.2 * r, -0.5 * r, -0.2 * r, -0.75 * r);
      line(0.2 * r, -0.5 * r, 0.2 * r, -0.75 * r);
    } else if (this.type == SIGNAL_TYPE.HAZARD) {
      stroke(255, 0, 0);
      line(0, 0, 0, -0.5 * r);
      line(0, -0.5 * r, -0.2 * r, -0.75 * r);
      line(0, -0.5 * r, 0.2 * r, -0.75 * r);
    }
    pop();
  }
}

// Effector class definition
// An effector is responsible for the movement of a Vehicle. It is modeled as a motorized wheel, where an increase in the activation
// of the motor corresponds to a higher velocity.
class Effector {

  constructor(parent, side) {
    this.parent = parent;
    this.neuron = {};
    this.y = 0; 
    if (side == "LEFT" ) {
      this.x = -config.motorSeparation * parent.width;
    } else if (side == "RIGHT") {
      this.x = config.motorSeparation * parent.width;
    }
    this.velocity = 0;    
  }

  // Effector.update adjusts the Effector's velocity according to the activation of the associated neuron in the Vehilce's 
  // Neural Circuit. Velocity is also adjusted for friction.
  update() {
    this.velocity += config.motorSpeed * this.neuron.activation * deltaT / (this.parent.mass * config.massScale);
    this.velocity -= this.velocity * config.motorFriction;
    }

  // Effector.render displays the effector to the canvas using functions from p5 library
  render(r) {
    rect(this.x, this.y, 0.3*r, 0.6*r);
  }
}