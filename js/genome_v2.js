// genome_v2.js
// Written by Carlos Venegas
// Last modified on 12/13/18

const DISABLED = {
    newNeuron: 0,
    newSynapse: 0,
    randomWeight: 0,
    randomBias: 0,
    randomThreshold: 0
  }
  
  const SLOW = {
    newNeuron: 0.1,
    newSynapse: 0.1,
    randomWeight: 0.3,
    randomBias: 0.1,
    randomThreshold: 0.1
  }
  
  const MEDIUM = {
    newNeuron: 0.3,
    newSynapse: 0.3,
    randomWeight: 0.3,
    randomBias: 0.3,
    randomThreshold: 0.3
  }
  
  const FAST = {
    newNeuron: 0.5,
    newSynapse: 0.5,
    randomWeight: 0.5,
    randomBias: 0.5,
    randomThreshold: 0.5
  }

class Genome {

    constructor() {
      this.inputNeuronGenes = []; // input type
      this.outputNeuronGenes = []; // output type
      this.neuronGenes = [];  // hidden type
      this.synapseGenes = [];
    }
  
    // initializeGenes takes a genePool and adds all the synapse genes (edges) and their associated neuron genes
    // (source and target nodes) from genePool to the current genome. It creates a genome with default topology.
    initializeGenes(genePool) {
      for (let i = 0; i < genePool.synapseGenes.length; i++) {
        this.addSynapseGene(genePool.synapseGenes[i]);
        this.addNeuronGene(genePool.synapseGenes[i].from);
        this.addNeuronGene(genePool.synapseGenes[i].to);
      }
    }

    // crossover creates a new genome from the two received genomes.
    // If both parents have the same synapse gene, inherit it. If only of them has it, inherit it randomly.
    static crossover(genome1, genome2) {
        var newGenome = new Genome();
        var allSynapseGenes = genome1.combineSynapseGenesNoRepeat(genome2);

        // order edges from lower layers to higher
        allSynapseGenes.sort(function(a,b){return a.from.layer - b.from.layer}); // check if in correct order!!!!!*******
        
        for (let i = 0; i < allSynapseGenes.length; i++) {
            // If both genomes have synapse i, inherit it.
            if (genome1.containsSynapseGene(allSynapseGenes[i]) && genome2.containsSynapseGene(allSynapseGenes[i])) {
                newGenome.addNeuronGene(allSynapseGenes[i].from);
                newGenome.addNeuronGene(allSynapseGenes[i].to);
                newGenome.addSynapseGene(allSynapseGenes[i]);
            } else if (random(1) < 0.5) { // Inherit randomly otherwise (flip a coin).
                if (newGenome.containsNeuronGene(allSynapseGenes[i].from)) { // Check if origin neuron exists, so we can add a new outgoing edge from it.
                    newGenome.addNeuronGene(allSynapseGenes[i].to);
                    newGenome.addSynapseGene(allSynapseGenes[i]); 
                }
            }
        }

        return newGenome;
    }

    // mutate receives the mutation rates and the genePool, and performs randomly 2 types of mutations:
    // Add synapse mutation: selects randomly two neuron genes of my genome and joins them (if not already joined).
    // Add neuron mutation: selects randomly a synapse gene of my genome and adds a new neuron gene in between.
    mutate(newSynapseMutationRate, newNeuronMutationRate, genePool) {

        if (random(1) < newSynapseMutationRate) {
            // select randomly two nodes from my neuron genes.
            let allGenes = this.getAllNeuronGenes()
            // n1 and n2 neuron genes belong to my genome
            let n1 = random(allGenes);
            let n2 = null;
            do {
                n2 = random(allGenes);
            } while(n1.id == n2.id);

            this.mutateAddSynapse(n1, n2, genePool);
            
        }
        if (random(1) < newNeuronMutationRate) {
            // select randomly which synpase to mutate.
            let s1 = random(this.synapseGenes);

            this.mutateAddNeuron(s1, genePool);
        }
    }

    // mutateAddSynapse looks for the (ng1, ng2) synapse in my genome and if it does not exist, it is created and
    // added to both genePool and my genome.
    // It receives NeuronGene objects ng1 and ng2 as parameters.
    mutateAddSynapse(ng1, ng2, genePool) {

        // cannot add synapse between neuron genes in same layer.
        if (ng1.layer == ng2.layer) {
            return;
        } 
        if (ng1.layer > ng2.layer) {
            let temp = ng2;
            ng2 = ng1;
            ng1 = temp;
        }

        // Check if synapse gene already exists in gene pool.
        let sg = genePool.getSynapseGene(ng1, ng2);
        
        // Create (ng1, ng2) synapse if it does not exist and add it to the gene pool.
        if (sg === null) { 
            let newSg = new SynapseGene(ng1, ng2);
            // New mutations are added to gene pool first
            genePool.addSynapseGene(newSg);
            this.addSynapseGene(newSg);
        } else {
            // Add synapse gene if it does not already exist in current genome.
            if (!this.containsSynapseGene(sg)) {
                this.addSynapseGene(sg);
            }
        }

    }

    // mutateAddNeuron receives a synapse gene sg and adds a new neuron in between neuron genes sg.from and sg.to.
    // It removes the synapse gene sg from my genome, creates a new neuron gene newNg, and adds new synapses for 
    // connecting (sg.from, newNg) and (newNg, sg.to).
    mutateAddNeuron(sg, genePool) {
        var newLayerIndex = sg.from.layer + 1;
        // split edge
        var ng1 = sg.from;
        var ng2 = sg.to;

        // If edge crosses 1 layer, add new layer in between.
        if (sg.length === 1) {
            genePool.addLayer(newLayerIndex); // addLayer method updates the layer numbering for all nodes on layer > newLayerIndex
        }

        // Remove sg from my synapseGenes.
        this.removeSynapseGene(sg);
        
        // Add new node in between ng1 and ng2.
        // All neurons created at this point are of type HIDDEN.
        var newNg = new NeuronGene(newLayerIndex, NODETYPE.HIDDEN);
        genePool.addNeuronGene(newNg);
        this.addNeuronGene(newNg);

        // create new edges
        var sg1 = new SynapseGene(ng1, newNg);
        var sg2 = new SynapseGene(newNg, ng2);
        genePool.addSynapseGene(sg1);
        genePool.addSynapseGene(sg2);
        this.addSynapseGene(sg1);
        this.addSynapseGene(sg2);
    }

    // getAllNeuronGenes returns an array containing all neuron genes in my genome. It assumes each 
    // single neuron is only present in one of the subsets (does not check for repeats).
    getAllNeuronGenes() {
        var allNeuronGenes = [];
        for (let itm of this.inputNeuronGenes) {
            allNeuronGenes.push(itm);
        }
        for (let itm of this.outputNeuronGenes) {
            allNeuronGenes.push(itm);
        }
        for (let itm of this.neuronGenes) {
            allNeuronGenes.push(itm);
        }
        return allNeuronGenes;
    }
    
    // addNeuronGene receives a NeuronGene object and adds it to my genome.
    addNeuronGene(ng) {
        if (!this.containsNeuronGene(ng)) { // avoids duplicates
            if (ng.type == NODETYPE.INPUT) {
                this.inputNeuronGenes.push(ng);
            } else if (ng.type == NODETYPE.OUTPUT) {
                this.outputNeuronGenes.push(ng);
            } else {
                this.neuronGenes.push(ng);
            }
        }
    }
  
    // addSynapseGene receives a SynapseGene object and adds it to my genome.
    addSynapseGene(sg) {
        if (!this.containsSynapseGene(sg)) { // avoids duplicates
            this.synapseGenes.push(sg);
        }
    }

    // removeSynapseGene receives a SynapseGene object and removes it from my genome.
    removeSynapseGene(sg) {
        for (let i = this.synapseGenes.length - 1; i >= 0; i--) {
            if (sg.id === this.synapseGenes[i].id) {
                this.synapseGenes.splice(i, 1);
            }
        }
    }

    // containsSynapseGene receives a SynapseGene object and returns true if it exists in my genome. 
    // It returns false otherwise.
    containsSynapseGene(sg) {
        for (let i = 0; i < this.synapseGenes.length; i++) {
            if (sg.id === this.synapseGenes[i].id) {
                return true;
            }
        }
        return false;
    }

    // containsNeuronGene receives a NeuronGene object and returns true if it exists in my genome. 
    // It returns false otherwise.
    containsNeuronGene(ng) {
        for (let i = 0; i < this.inputNeuronGenes.length; i++) {
            if (ng.id === this.inputNeuronGenes[i].id) {
                return true;
            }
        }
        for (let i = 0; i < this.outputNeuronGenes.length; i++) {
            if (ng.id === this.outputNeuronGenes[i].id) {
                return true;
            }
        }
        for (let i = 0; i < this.neuronGenes.length; i++) {
            if (ng.id === this.neuronGenes[i].id) {
                return true;
            }
        }
        return false;
    }

    // combineSynapseGenesNoRepeat receives a Genome object and returns a combined array of my synapseGenes and 
    // received genome's synapseGenes. 
    combineSynapseGenesNoRepeat(genome) {
        var combined = [];
        combined = combined.concat(this.synapseGenes);

        for (let i = 0; i < genome.synapseGenes.length; i++) {
            let present = false;
            for (let j = 0; j < combined.length; j++) {
                if (genome.synapseGenes[i].id === combined[j].id) {
                    present = true;
                    break;
                }
            }
            if (!present) {
                combined.push(genome.synapseGenes[i]);
            }
        }
        return combined;
    }

    // combineNeuronGenesNoRepeat receives a Genome object and returns a combined array of my neuronGenes and 
    // received genome's neuronGenes.
    combineNeuronGenesNoRepeat(genome) {
        var combined = [];
        combined = combined.concat(this.getAllNeuronGenes());

        var gNeurons = genome.getAllNeuronGenes();
        for (let i = 0; i < gNeurons.length; i++) {
            if (!this.containsNeuronGene(gNeurons[i])) {
                combined.push(gNeurons[i]);
            }
        }
        return combined;
    }

    // getSynapseGeneById receives an id and checks if a SynapseGene with that id exists in my genome. 
    getSynapseGeneById(id) {
        for (let i = 0; i < this.synapseGenes.length; i++) {
          if (this.synapseGenes[i].id == id) {
            return s;
          }
        }
        return null;
    }

    // getMaxSynapseLength returns the max length of all synapses in my genome.
    getMaxSynapseLength() {
        var maxLength = 0;
        for (let s of this.synapseGenes) {
            if (s.length > maxLength) {
                maxLength = s.length;
            }
        }
        return maxLength;
    }
  
  }