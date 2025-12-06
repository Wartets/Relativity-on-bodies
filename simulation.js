window.App = {
	sim: null,
	render: null,
	ui: null,
	ActionHistory: {
		history: [],
		redoStack: [],
		maxSize: 50,
		isExecuting: false,
		onChange: null,

		execute: function(action) {
			if (this.isExecuting) return;

			action.execute();
			
			this.history.push(action);
			if (this.history.length > this.maxSize) {
				this.history.shift();
			}
			this.redoStack = [];
			if (this.onChange) this.onChange();
		},

		undo: function() {
			if (this.history.length === 0) return;
			const action = this.history.pop();
			
			this.isExecuting = true;
			try {
				action.undo();
			} finally {
				this.isExecuting = false;
			}
			
			this.redoStack.push(action);
			if (this.onChange) this.onChange();
		},

		redo: function() {
			if (this.redoStack.length === 0) return;
			const action = this.redoStack.pop();
			
			this.isExecuting = true;
			try {
				action.execute();
			} finally {
				this.isExecuting = false;
			}
			
			this.history.push(action);
			if (this.onChange) this.onChange();
		},
		
		clear: function() {
			this.history = [];
			this.redoStack = [];
			if (this.onChange) this.onChange();
		}
	},
	VectorPool: {
		pool: [],
		get: function(x = 0, y = 0) {
			if (this.pool.length > 0) {
				const v = this.pool.pop();
				v.x = x;
				v.y = y;
				return v;
			}
			return { x, y };
		},
		release: function(v) {
			this.pool.push(v);
		}
	}
};

window.App.BodySchema = {
	mass: { default: 1, label: 'Mass', tip: 'Body mass. Set to -1 for a fixed body.', type: 'number', constraint: 'mass' },
	radius: { default: 2, label: 'Radius', tip: 'Body radius for collisions.', type: 'number', constraint: 'positive' },
	x: { default: 0, label: 'Position X', tip: 'Current X coordinate.', type: 'number', constraint: 'default', prec: 2 },
	y: { default: 0, label: 'Position Y', tip: 'Current Y coordinate.', type: 'number', constraint: 'default', prec: 2 },
	vx: { default: 0, label: 'Velocity X', tip: 'Current velocity on X axis.', type: 'number', constraint: 'default', prec: 3 },
	vy: { default: 0, label: 'Velocity Y', tip: 'Current velocity on Y axis.', type: 'number', constraint: 'default', prec: 3 },
	ax: { default: 0, label: 'Acc X', tip: 'Constant acceleration on X axis.', type: 'number', constraint: 'default', prec: 3, inputId: 'newAX', internal: 'startAx' },
	ay: { default: 0, label: 'Acc Y', tip: 'Constant acceleration on Y axis.', type: 'number', constraint: 'default', prec: 3, inputId: 'newAY', internal: 'startAy' },
	charge: { default: 0, label: 'Charge (e)', tip: 'Body electric charge.', type: 'number', constraint: 'default' },
	magMoment: { default: 0, label: 'Mag. Moment', tip: 'Body magnetic moment.', type: 'number', constraint: 'default' },
	rotationSpeed: { default: 0, label: 'Rot. Speed', tip: 'Body rotation speed.', type: 'number', constraint: 'default', prec: 3 },
	friction: { default: 0.5, label: 'Friction Coeff.', tip: 'Friction coefficient during collisions.', type: 'number', constraint: 'non-negative' },
	lifetime: { default: -1, label: 'Lifetime', tip: 'Body lifetime in simulation ticks. -1 for infinite.', type: 'number', constraint: 'lifetime', prec: 0 },
	integrity: { default: 10000, label: 'Integrity', tip: 'Structural integrity. Threshold for fragmentation from collisions or tidal forces.', type: 'number', constraint: 'positive', prec: 0 },
	
	temperature: { default: 293, label: 'Temp. (K)', tip: 'Body temperature in Kelvin.', type: 'number', constraint: 'non-negative', prec: 0 },
	specificHeat: { default: 1000, label: 'Heat Cap.', tip: 'Specific Heat Capacity (J/kg·K).', type: 'number', constraint: 'positive', prec: 0, inputId: 'newSpecificHeat' },
	absorptionFactor: { default: 0.5, label: 'Absorp. Fact.', tip: 'Collision energy to heat conversion factor (0-1).', type: 'number', constraint: 'non-negative', inputId: 'newAbsorptionFactor' },
	criticalTemp: { default: 1000, label: 'Crit. Temp (K)', tip: 'Temperature for material property change.', type: 'number', constraint: 'non-negative', prec: 0, inputId: 'newCriticalTemp' },
	transitionFactor: { default: 0.01, label: 'Trans. Fact.', tip: 'Softness of property change around critical temp.', type: 'number', constraint: 'default', inputId: 'newTransitionFactor' },
	
	e_base: { default: 1.0, label: 'Restit. (Cold)', tip: 'Base restitution coefficient (solid state).', type: 'number', constraint: 'non-negative', inputId: 'newE_base' },
	e_min: { default: 0.1, label: 'Restit. (Hot)', tip: 'Minimum restitution coefficient (liquid state).', type: 'number', constraint: 'non-negative', inputId: 'newE_min' },
	Y_base: { default: 0, label: 'Young\'s M. (Cold)', tip: 'Base Young\'s Modulus (solid state).', type: 'number', constraint: 'non-negative', prec: 0, inputId: 'newY_base' },
	Y_min: { default: 0, label: 'Young\'s M. (Hot)', tip: 'Minimum Young\'s Modulus (liquid state).', type: 'number', constraint: 'non-negative', prec: 0, inputId: 'newY_min' },

	name: { default: "Body", label: 'Name', type: 'string' },
	color: { default: null, label: 'Color', type: 'color' }
};

window.App.BodyPool = {
	pool: [],

	get: function() {
		if (this.pool.length > 0) {
			return this.pool.pop();
		}
		return new Body();
	},

	release: function(body) {
		this.pool.push(body);
	},

	initBody: function(config = {}) {
		const body = this.get();
		body.init(config);
		return body;
	}
};

class Body {
	constructor() {
	}

	init(config = {}) {
		const schema = window.App.BodySchema;
		
		this.id = config.id !== undefined ? config.id : null;

		Object.keys(schema).forEach(key => {
			const def = schema[key];
			const targetKey = def.internal || key;
			
			if (config[key] !== undefined) {
				this[targetKey] = config[key];
			} else if (config[targetKey] !== undefined) {
				this[targetKey] = config[targetKey];
			} else {
				if (key === 'color' && !def.default) {
					this[targetKey] = `hsl(${Math.random() * 360}, 70%, 60%)`;
				} else if (key === 'radius' && (!config.radius || config.radius <= 0)) {
					const m = config.mass ?? schema.mass.default;
					this[targetKey] = (m > 1 ? Math.max(2, Math.log(m) * 2) : 2);
				} else {
					this[targetKey] = def.default;
				}
			}
		});

		this.active = config.active !== undefined ? config.active : true;
		this.ax = 0;
		this.ay = 0;
		this.path = [];
		this.angle = 0;
		this.fragCooldown = config.fragCooldown || 0;
		
		this.e_current = this.e_base;
		this.Y_current = this.Y_base;
		
		this.invMass = (this.mass === -1) ? 0 : 1 / this.mass;
	}

	clone() {
		const newBody = window.App.BodyPool.get();
		Object.assign(newBody, this);
		newBody.path = [];
		return newBody;
	}
};

window.App.QuadTree = class QuadTree {
	constructor(x, y, w, h, maxBodies = 1, depth = 0) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.maxBodies = maxBodies;
		this.depth = depth;
		this.bodies = [];
		this.nodes = [];
		this.mass = 0;
		this.comX = 0;
		this.comY = 0;
		this.charge = 0;
		this.magMoment = 0;
	}

	insert(body) {
		if (this.nodes.length > 0) {
			const index = this.getIndex(body);
			if (index !== -1) {
				this.nodes[index].insert(body);
				return;
			}
		}

		this.bodies.push(body);

		if (this.bodies.length > this.maxBodies && this.depth < 64) {
			if (this.nodes.length === 0) {
				this.split();
			}

			let i = 0;
			while (i < this.bodies.length) {
				const b = this.bodies[i];
				const index = this.getIndex(b);
				if (index !== -1) {
					this.nodes[index].insert(b);
					this.bodies.splice(i, 1);
				} else {
					i++;
				}
			}
		}
	}

	getIndex(body) {
		const vMid = this.x + this.w / 2;
		const hMid = this.y + this.h / 2;
		const top = body.y < hMid;
		const bottom = body.y >= hMid;

		if (body.x < vMid) {
			if (top) return 0;
			if (bottom) return 2;
		} else if (body.x >= vMid) {
			if (top) return 1;
			if (bottom) return 3;
		}
		return -1;
	}

	split() {
		const subW = this.w / 2;
		const subH = this.h / 2;
		const x = this.x;
		const y = this.y;

		this.nodes[0] = new window.App.QuadTree(x, y, subW, subH, this.maxBodies, this.depth + 1);
		this.nodes[1] = new window.App.QuadTree(x + subW, y, subW, subH, this.maxBodies, this.depth + 1);
		this.nodes[2] = new window.App.QuadTree(x, y + subH, subW, subH, this.maxBodies, this.depth + 1);
		this.nodes[3] = new window.App.QuadTree(x + subW, y + subH, subW, subH, this.maxBodies, this.depth + 1);
	}

	calculateMultipoles() {
		let totalMass = 0;
		let totalMassX = 0;
		let totalMassY = 0;
		let totalCharge = 0;
		let totalMag = 0;

		if (this.nodes.length > 0) {
			for (let i = 0; i < this.nodes.length; i++) {
				this.nodes[i].calculateMultipoles();
				const n = this.nodes[i];
				if (n.mass > 0) {
					totalMass += n.mass;
					totalMassX += n.comX * n.mass;
					totalMassY += n.comY * n.mass;
				}
				totalCharge += n.charge;
				totalMag += n.magMoment;
			}
		}

		for (let i = 0; i < this.bodies.length; i++) {
			const b = this.bodies[i];
			const m = b.mass === -1 ? 1 : b.mass;
			if (m > 0) {
				totalMass += m;
				totalMassX += b.x * m;
				totalMassY += b.y * m;
			}
			totalCharge += b.charge;
			totalMag += b.magMoment;
		}

		this.mass = totalMass;
		this.charge = totalCharge;
		this.magMoment = totalMag;

		if (totalMass > 0) {
			this.comX = totalMassX / totalMass;
			this.comY = totalMassY / totalMass;
		} else {
			this.comX = this.x + this.w / 2;
			this.comY = this.y + this.h / 2;
		}
	}
};

const Simulation = {
	bodies: {},
	nextBodyId: 0,
	periodicZones: [],
	viscosityZones: [],
	thermalZones: [],
	annihilationZones: [],
	chaosZones: [],
	vortexZones: [],
	nullZones: [],
	elasticBonds: [],
	solidBarriers: [],
	fieldZones: [],
	
	T_ambient: 3.0,
	fragmentLifetime: 1000,
	dt: 0.25,
	
	useBarnesHut: true,
	barnesHutTheta: 0.5,
	quadTree: null,
	
	units: {
		SI: {
			c: 299792458,				// Speed of light (m/s)
			h: 6.62607015e-34,			// Planck constant (J⋅s)
			e: 1.602176634e-19,			// Elementary charge (C)
			kB: 1.380649e-23,			// Boltzmann constant (J/K)
			NA: 6.02214076e23,			// Avogadro constant (1/mol)
			G: 6.67430e-11,				// Gravitational constant (m³/kg⋅s²)
			alpha: 7.2973525693e-3,		// Fine-structure constant

			get h_bar() { return this.h / (2 * Math.PI); },
			get Ke() { return (this.alpha * this.h_bar * this.c) / (this.e ** 2); },
			get epsilon0() { return 1 / (4 * Math.PI * this.Ke); },
			get mu0() { return 4 * Math.PI * this.Ke / (this.c ** 2); },
		},

		sim: {
			c: 50,			// Speed limit
			G: 0.5,			// Gravity strength
			h: 1e-15,		// Simulation scale
			Ke: 10,			// Electric strength
			kB: 10e-23,		// Thermodynamics scale
			NA: 6.022e23,	// Amount scale
			Kcd: 56,		// Luminous intensity scale
			
			
			get sigma() { return (2 * Math.pow(Math.PI, 5) * Math.pow(this.kB, 4)) / (15 * Math.pow(this.h, 3) * Math.pow(this.c, 2)); },
			get Km() { return this.Ke / (this.c ** 2); },
			get e() { return window.App.sim.units.SI.e / window.App.sim.units.Q0; },
		},

		// Scaling Factors (SI = Sim * Factor)
		get T0() { return Math.sqrt((this.SI.G / this.sim.G * this.SI.h / this.sim.h) / Math.pow(this.SI.c / this.sim.c, 5)); },
		get L0() { return (this.SI.c * this.T0) / this.sim.c; },
		get M0() { return (this.sim.G / this.SI.G) * (this.L0**3 / this.T0**2); },
		get Q0() { return Math.sqrt( (this.sim.Ke / this.SI.Ke) * (this.M0 * this.L0**3) / (this.T0**2) ); },
		get K0() { return (this.sim.kB / this.SI.kB) * (this.M0 * this.L0**2) / (this.T0**2);},
		get N0() { return this.sim.NA / this.SI.NA; },
		get I0() { return this.sim.Kcd; },
		get A0() { return this.Q0 / this.T0; },
	},

	paused: true,
	maxRadius: 0,
	grid: {},
	cellSize: 50,
	
	objectConfigs: {
		periodicZone: {
			arrayName: 'periodicZones', typeName: 'PeriodicZone', idPrefix: 'Zone',
			defaults: function(x, y, w, h, color, type, shape = 'rectangle') {
				const zone = { shape, x, y, color: color || '#e67e22', type: type || 'center', enabled: true };
				if (shape === 'circle') { zone.radius = w; } else { zone.width = w; zone.height = h; }
				return zone;
			}
		},
		viscosityZone: {
			arrayName: 'viscosityZones', typeName: 'ViscosityZone', idPrefix: 'Viscosity',
			defaults: function(x, y, w, h, viscosity, color, shape = 'rectangle') {
				const zone = { shape, x, y, viscosity: viscosity || 0.5, color: color || '#3498db', enabled: true };
				if (shape === 'circle') { zone.radius = w; } else { zone.width = w; zone.height = h; }
				return zone;
			}
		},
		elasticBond: {
			arrayName: 'elasticBonds', typeName: 'ElasticBond', idPrefix: 'Bond',
			defaults: function(b1Id, b2Id, config = {}, length, damping) {
				if (b1Id === b2Id || !this.bodies[b1Id] || !this.bodies[b2Id]) return null;
				const b1 = this.bodies[b1Id];
				const b2 = this.bodies[b2Id];
				const dist = Math.sqrt(Math.pow(b2.x - b1.x, 2) + Math.pow(b2.y - b1.y, 2));

				let effectiveConfig = config;
				if (typeof config === 'number') {
					effectiveConfig = { stiffness: config };
					if (typeof length === 'number') effectiveConfig.length = length;
					if (typeof damping === 'number') effectiveConfig.damping = damping;
				}

				const defaults = { stiffness: 0.5, damping: 0.1, length: dist, color: '#ffffff', type: 'spring', nonLinearity: 1.0, breakTension: -1, activeAmp: 0, activeFreq: 0 };
				const settings = { ...defaults, ...effectiveConfig };
				if (settings.length < 0) settings.length = dist;
				
				return { name: config.name, body1: b1Id, body2: b2Id, enabled: true, ...settings };
			}
		},
		solidBarrier: {
			arrayName: 'solidBarriers', typeName: 'SolidBarrier', idPrefix: 'Wall',
			defaults: function(x1, y1, x2, y2, restitution, color, name, friction) {
				return { name, x1, y1, x2, y2, restitution: restitution || 0.8, friction: friction !== undefined ? friction : 0.5, color: color || '#8e44ad', enabled: true };
			}
		},
		fieldZone: {
			arrayName: 'fieldZones', typeName: 'FieldZone', idPrefix: 'Field',
			defaults: function(x, y, w, h, fx, fy, color, name, shape = 'rectangle') {
				const zone = { name, shape, x, y, fx: fx || 0, fy: fy || 0.1, color: color || '#27ae60', enabled: true };
				if (shape === 'circle') { zone.radius = w; } else { zone.width = w; zone.height = h; }
				return zone;
			}
		},
		thermalZone: {
			arrayName: 'thermalZones', typeName: 'ThermalZone', idPrefix: 'Thermal',
			defaults: function(x, y, w, h, temperature, heatTransferCoefficient, color, shape = 'rectangle') {
				const zone = { shape, x, y, temperature: Math.max(0, temperature || 500), heatTransferCoefficient: heatTransferCoefficient || 0.1, color: color || '#e74c3c', enabled: true };
				if (shape === 'circle') { zone.radius = w; } else { zone.width = w; zone.height = h; }
				return zone;
			}
		},
		annihilationZone: {
			arrayName: 'annihilationZones', typeName: 'AnnihilationZone', idPrefix: 'Annihilation',
			defaults: function(x, y, w, h, particleBurst, color, shape = 'rectangle') {
				const zone = { shape, x, y, particleBurst: particleBurst || false, color: color || '#9b59b6', enabled: true };
				if (shape === 'circle') { zone.radius = w; } else { zone.width = w; zone.height = h; }
				return zone;
			}
		},
		chaosZone: {
			arrayName: 'chaosZones', typeName: 'ChaosZone', idPrefix: 'Chaos',
			defaults: function(x, y, w, h, strength, frequency, color, shape = 'rectangle') {
				const zone = { shape, x, y, strength: strength || 0.1, frequency: frequency || 1.0, scale: 20.0, seed: Math.random() * 10000, color: color || '#f39c12', enabled: true };
				if (shape === 'circle') { zone.radius = w; } else { zone.width = w; zone.height = h; }
				return zone;
			}
		},
		vortexZone: {
			arrayName: 'vortexZones', typeName: 'VortexZone', idPrefix: 'Vortex',
			defaults: function(x, y, radius, strength, color) {
				return { shape: 'circle', x, y, radius: radius || 100, strength: strength || 1.0, color: color || '#1abc9c', enabled: true };
			}
		},
		nullZone: {
			arrayName: 'nullZones', typeName: 'NullZone', idPrefix: 'Null',
			defaults: function(x, y, w, h, config, color, shape = 'rectangle') {
				const zone = {
					shape, x, y, color: color || '#7f8c8d', enabled: true,
					nullifyGravity: config ? config.nullifyGravity : true,
					nullifyElectricity: config ? config.nullifyElectricity : false,
					nullifyMagnetism: config ? config.nullifyMagnetism : false,
				};
				if (shape === 'circle') { zone.radius = w; } else { zone.width = w; zone.height = h; }
				return zone;
			}
		}
	},
	
	enableGravity: true,
	enableElectricity: false,
	enableMagnetism: false,
	enableCollision: false,
	enableThermodynamics: false,
	
	enableFragmentation: false,
	fragmentationQueue: [],
	
	formulaFields: [],
	
	showTrails: true,
	trailLength: 80,
	trailStep: 3,
	tickCount: 0,

	init: function() {
		this.enablePhysicalColors = false;
		this.reset();
		
		Object.keys(this.objectConfigs).forEach(typeKey => {
			this._createHistoryManagedObjectApi(typeKey);
		});
	},

	reset: function() {
		this.bodies = {};
		this.nextBodyId = 0;
		this.periodicZones = [];
		this.viscosityZones = [];
		this.thermalZones = [];
		this.annihilationZones = [];
		this.chaosZones = [];
		this.vortexZones = [];
		this.nullZones = [];
		this.elasticBonds = [];
		this.solidBarriers = [];
		this.fieldZones = [];
		this.formulaFields = [];
		this.grid = {};
		this.collisionResult = { fx: 0, fy: 0 };
		this.fieldResult = { Ex: 0, Ey: 0 };
		this.fragmentationQueue = [];
		this.tickCount = 0;
		this.simTime = 0;
		if (window.App.ActionHistory) {
			window.App.ActionHistory.clear();
		}
	},
	
	_addObject: function(typeKey, ...args) {
		const config = this.objectConfigs[typeKey];
		if (!config) return;

		const array = this[config.arrayName];
		const newObjectData = config.defaults.apply(this, args);
		
		if (!newObjectData) return;

		const newObject = {
			...newObjectData,
			id: Date.now() + Math.random(),
			name: newObjectData.name || `${config.idPrefix} ${array.length + 1}`
		};
		
		array.push(newObject);
		return newObject.id;
	},

	_removeObject: function(typeKey, id) {
		const config = this.objectConfigs[typeKey];
		if (!config) return;

		const array = this[config.arrayName];
		const index = array.findIndex(o => o.id === id);
		if (index !== -1) {
			array.splice(index, 1);
		}
	},
	
	_createHistoryManagedObjectApi: function(typeKey) {
		const config = this.objectConfigs[typeKey];
		const { typeName, arrayName } = config;

		this[`add${typeName}`] = function(...args) {
			this._addWithHistory(
				() => this._addObject(typeKey, ...args),
				(id) => this._removeObject(typeKey, id)
			);
		};

		this[`remove${typeName}`] = function(id) {
			this._removeWithHistory(id, this[arrayName], (idToRemove) => this._removeObject(typeKey, idToRemove));
		};
	},
	
	_addWithHistory: function(addFunc, removeFunc) {
		if (window.App.ActionHistory.isExecuting) {
			addFunc();
			return;
		}
		let objectId;
		const action = {
			execute: () => { objectId = addFunc(); },
			undo: () => { if (objectId) removeFunc(objectId); }
		};
		window.App.ActionHistory.execute(action);
	},
	
	_removeWithHistory: function(id, objectArray, removeFunc) {
		if (window.App.ActionHistory.isExecuting) {
			removeFunc(id);
			return;
		}
		const objectIndex = objectArray.findIndex(o => o.id === id);
		if (objectIndex === -1) return;
		const removedObject = { ...objectArray[objectIndex] };

		const action = {
			execute: () => removeFunc(id),
			undo: () => objectArray.splice(objectIndex, 0, removedObject)
		};
		window.App.ActionHistory.execute(action);
	},
	
	_addBody: function(config) {
		const id = this.nextBodyId++;
		const newBodyConfig = {
			...config,
			id: id,
			name: config.name || `Body ${id + 1}`
		};
		const newBody = window.App.BodyPool.initBody(newBodyConfig);
		this.bodies[id] = newBody;
		return id;
	},

	addBody: function(config) {
		if (window.App.ActionHistory.isExecuting) {
			this._addBody(config);
			return;
		}

		const sim = this;
		let bodyId;
		let fullConfig;

		const action = {
			execute: function() {
				const configToUse = fullConfig || config;
				bodyId = sim._addBody(configToUse);
				
				if (!fullConfig) {
					fullConfig = { ...sim.bodies[bodyId] };
				}
			},
			undo: function() {
				sim._removeBody(bodyId);
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_removeBody: function(bodyId) {
		const bodyToRemove = this.bodies[bodyId];
		if (bodyToRemove) {
			window.App.BodyPool.release(bodyToRemove);
			delete this.bodies[bodyId];
			
			for (let i = this.elasticBonds.length - 1; i >= 0; i--) {
				const b = this.elasticBonds[i];
				if (b.body1 === bodyId || b.body2 === bodyId) {
					this.elasticBonds.splice(i, 1);
				}
			}
		}
	},

	removeBody: function(bodyId) {
		if (window.App.ActionHistory.isExecuting) {
			this._removeBody(bodyId);
			return;
		}
		if (!this.bodies[bodyId]) return;

		const sim = this;
		const removedBody = this.bodies[bodyId].clone();
		const removedBonds = [];
		this.elasticBonds.forEach((b, index) => {
			if (b.body1 === bodyId || b.body2 === bodyId) {
				removedBonds.push({ bond: { ...b }, index });
			}
		});

		const action = {
			execute: function() {
				sim._removeBody(bodyId);
			},
			undo: function() {
				sim.bodies[bodyId] = removedBody;
				
				removedBonds.sort((a, b) => a.index - b.index);
				
				removedBonds.forEach(item => {
					sim.elasticBonds.splice(item.index, 0, item.bond);
				});
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	seededRandomHash: function(...args) {
		const str = args.join(',');
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash |= 0;
		}
		return Math.sin(hash);
	},
	
	isBodyInNullZone: function(body, forceType) {
		for (const z of this.nullZones) {
			if (!z.enabled) continue;
			if (
				(forceType === 'gravity' && !z.nullifyGravity) ||
				(forceType === 'electricity' && !z.nullifyElectricity) ||
				(forceType === 'magnetism' && !z.nullifyMagnetism)
			) continue;

			let isInside = false;
			if (z.shape === 'circle') {
				const dx = body.x - z.x;
				const dy = body.y - z.y;
				isInside = (dx * dx + dy * dy) <= (z.radius * z.radius);
			} else {
				const x_in = (z.width === 'inf') || (body.x >= z.x && body.x <= z.x + z.width);
				const y_in = (z.height === 'inf') || (body.y >= z.y && body.y <= z.y + z.height);
				isInside = x_in && y_in;
			}
			if (isInside) return true;
		}
		return false;
	},
	
	lerp: function(a, b, t) {
		return a * (1 - t) + b * t;
	},
	
	calculateFormulaField: function(x, y, time) {
		let totalEx = 0;
		let totalEy = 0;
		const G = this.units.sim.G;
		const c = this.units.sim.c;
		const Ke = this.units.sim.Ke;
		const Km = this.units.sim.Km;
		const t = (time !== undefined) ? time : (this.tickCount * this.dt);
		
		for (const field of this.formulaFields) {
			if (!field.enabled || field.errorX || field.errorY) continue;
			
			const vars = { x, y, G, c, Ke, Km, t, PI: Math.PI, E: Math.E };

			try {
				const Ex = field.funcEx(vars);
				const Ey = field.funcEy(vars);
				
				if (typeof Ex === 'number' && !isNaN(Ex)) totalEx += Ex;
				if (typeof Ey === 'number' && !isNaN(Ey)) totalEy += Ey;
				
			} catch (e) {
			}
		}

		this.fieldResult.Ex = totalEx;
		this.fieldResult.Ey = totalEy;
		return this.fieldResult;
	},
	
	compileFormula: function(formula) {
		if (!formula || typeof formula !== 'string' || formula.trim() === '') {
			return { func: () => 0, error: null };
		}
		
		let code = formula.trim();
		
		code = code.replace(/\^/g, '**');
		code = code.replace(/\bpi\b/g, 'PI');
		code = code.replace(/\bln\b/g, 'log');
		
		const mathProps = Object.getOwnPropertyNames(Math);
		const reservedVars = ['Ke', 'Km', 'PI', 'E'];
		const allReserved = [...mathProps, ...reservedVars].sort((a, b) => b.length - a.length);
		
		const tokens = [];
		const mask = (val) => {
			const id = `_TOKEN_${tokens.length}_`;
			tokens.push(val);
			return id;
		};
		
		allReserved.forEach(word => {
			if (word.length > 1 || word === 'E') {
				const regex = new RegExp(`\\b${word}\\b`, 'g');
				code = code.replace(regex, () => mask(word));
			}
		});
		
		code = code.replace(/([)\]])\s*([(\[])/g, '$1*$2');
		
		code = code.replace(/([a-zA-Z0-9)\]_])\s+(?=[a-zA-Z0-9(\[_])/g, '$1*');
		
		tokens.forEach((val, i) => {
			code = code.split(`_TOKEN_${i}_`).join(val);
		});
		
		try {
			const mathKeys = Object.getOwnPropertyNames(Math).filter(k => k !== 'PI' && k !== 'E').join(',');
			const varsKeys = "x, y, G, c, Ke, Km, t";
			
			const funcBody = `
				"use strict";
				const { ${mathKeys}, PI, E } = Math;
				const { ${varsKeys} } = vars;
				return (${code});
			`;
			
			const func = new Function('vars', funcBody);
			
			const testVars = { x: 1, y: 1, G: this.units.sim.G, c: this.units.sim.c, Ke: this.units.sim.Ke, Km: this.units.sim.Km, t: 0 };
			const result = func(testVars);
			
			if (typeof result !== 'number' || isNaN(result)) {
				return { func: () => 0, error: "Result is not a number" };
			}
			
			return { func: func, error: null };
			
		} catch (e) {
			return { func: () => 0, error: e.message };
		}
	},
	
	computeExternalForces: function(body, time) {
		body.ax = body.startAx;
		body.ay = body.startAy;
		
		if (body.charge !== 0) {
			const field = this.calculateFormulaField(body.x, body.y, time);
			body.ax += (body.charge * field.Ex) * body.invMass;
			body.ay += (body.charge * field.Ey) * body.invMass;
		}
		
		for (const z of this.viscosityZones) {
			if (!z.enabled) continue;
			let isInside = false;
			if (z.shape === 'circle') {
				const dx = body.x - z.x;
				const dy = body.y - z.y;
				isInside = (dx * dx + dy * dy) <= (z.radius * z.radius);
			} else {
				const x_in = (z.width === 'inf') || (body.x >= z.x && body.x <= z.x + z.width);
				const y_in = (z.height === 'inf') || (body.y >= z.y && body.y <= z.y + z.height);
				isInside = x_in && y_in;
			}
			
			if (isInside) {
				const fx = -body.vx * z.viscosity;
				const fy = -body.vy * z.viscosity;
				body.ax += fx * body.invMass;
				body.ay += fy * body.invMass;
			}
		}

		for (const z of this.chaosZones) {
			if (!z.enabled) continue;
			let isInside = false;
			if (z.shape === 'circle') {
				const dx = body.x - z.x;
				const dy = body.y - z.y;
				isInside = (dx * dx + dy * dy) <= (z.radius * z.radius);
			} else {
				const x_in = (z.width === 'inf') || (body.x >= z.x && body.x <= z.x + z.width);
				const y_in = (z.height === 'inf') || (body.y >= z.y && body.y <= z.y + z.height);
				isInside = x_in && y_in;
			}
			
			if (isInside) {
				const t = (time !== undefined) ? time : (this.tickCount * this.dt);
				const timeStep = Math.floor(t * z.frequency);
				const spatialScale = z.scale || 20.0;

				const x_norm = body.x / spatialScale;
				const y_norm = body.y / spatialScale;

				const x0 = Math.floor(x_norm);
				const y0 = Math.floor(y_norm);

				const tx = x_norm - x0;
				const ty = y_norm - y0;

				const smoothTx = tx * tx * (3.0 - 2.0 * tx);
				const smoothTy = ty * ty * (3.0 - 2.0 * ty);

				const v00x = this.seededRandomHash(z.seed, timeStep, x0, y0);
				const v00y = this.seededRandomHash(z.seed + 1, timeStep, x0, y0);
				const v10x = this.seededRandomHash(z.seed, timeStep, x0 + 1, y0);
				const v10y = this.seededRandomHash(z.seed + 1, timeStep, x0 + 1, y0);
				const v01x = this.seededRandomHash(z.seed, timeStep, x0, y0 + 1);
				const v01y = this.seededRandomHash(z.seed + 1, timeStep, x0, y0 + 1);
				const v11x = this.seededRandomHash(z.seed, timeStep, x0 + 1, y0 + 1);
				const v11y = this.seededRandomHash(z.seed + 1, timeStep, x0 + 1, y0 + 1);

				const topX = this.lerp(v00x, v10x, smoothTx);
				const topY = this.lerp(v00y, v10y, smoothTx);
				const bottomX = this.lerp(v01x, v11x, smoothTx);
				const bottomY = this.lerp(v01y, v11y, smoothTx);

				const fx = this.lerp(topX, bottomX, smoothTy) * z.strength;
				const fy = this.lerp(topY, bottomY, smoothTy) * z.strength;

				body.ax += fx;
				body.ay += fy;
			}
		}

		for (const z of this.vortexZones) {
			if (!z.enabled) continue;
			const dx = body.x - z.x;
			const dy = body.y - z.y;
			const distSq = dx * dx + dy * dy;

			if (distSq > 0 && distSq < z.radius * z.radius) {
				const dist = Math.sqrt(distSq);
				const force = z.strength / (dist + 10);
				
				const radialPull = -force * 0.5;
				const tangentialSpeed = force;
				
				const ax = (dx / dist) * radialPull - (dy / dist) * tangentialSpeed;
				const ay = (dy / dist) * radialPull + (dx / dist) * tangentialSpeed;

				body.ax += ax;
				body.ay += ay;
			}
		}

		for (const z of this.fieldZones) {
			if (!z.enabled) continue;
			let isInside = false;
			if (z.shape === 'circle') {
				const dx = body.x - z.x;
				const dy = body.y - z.y;
				isInside = (dx * dx + dy * dy) <= (z.radius * z.radius);
			} else {
				const x_in = (z.width === 'inf') || (body.x >= z.x && body.x <= z.x + z.width);
				const y_in = (z.height === 'inf') || (body.y >= z.y && body.y <= z.y + z.height);
				isInside = x_in && y_in;
			}

			if (isInside) {
				body.ax += z.fx;
				body.ay += z.fy;
			}
		}
	},
	
	computeBonds: function(bodies, dt, time) {
		for (let i = this.elasticBonds.length - 1; i >= 0; i--) {
			const bond = this.elasticBonds[i];
			if (!bond.enabled) continue;
			
			const b1 = bodies[bond.body1];
			const b2 = bodies[bond.body2];
			if (!b1 || !b2 || !b1.active || !b2.active) continue;

			if (b1.mass === -1 && b2.mass === -1) continue;

			const dx = b2.x - b1.x;
			const dy = b2.y - b1.y;
			const dist = Math.sqrt(dx*dx + dy*dy);
			if (dist === 0) continue;

			let targetLen = bond.length;
			if (bond.activeAmp !== 0 && bond.activeFreq !== 0) {
				const currentTime = (time !== undefined) ? time : (this.tickCount * this.dt);
				const phase = bond.activeFreq * currentTime * 0.1;
				targetLen = bond.length * (1 + bond.activeAmp * Math.sin(phase));
			}

			const displacement = dist - targetLen;
			
			if (bond.type === 'rope' || bond.type === 'chain') {
				if (displacement <= 0) continue;
			}

			let forceMag = 0;
			
			if (bond.nonLinearity !== 1 && bond.nonLinearity > 0) {
				const sign = displacement >= 0 ? 1 : -1;
				forceMag = bond.stiffness * sign * Math.pow(Math.abs(displacement), bond.nonLinearity);
			} else {
				forceMag = bond.stiffness * displacement;
			}
			
			const invM1 = b1.invMass;
			const invM2 = b2.invMass;
			const totalInvMass = invM1 + invM2;
			
			if (totalInvMass > 0 && dt > 0) {
				const maxForce = (Math.abs(displacement) * 0.8) / (totalInvMass * dt * dt);
				if (Math.abs(forceMag) > maxForce) {
					forceMag = Math.sign(forceMag) * maxForce;
				}
			}
			
			if (bond.breakTension > 0 && forceMag > bond.breakTension) {
				if (bodies === this.bodies) {
					this.elasticBonds.splice(i, 1);
				}
				continue;
			}

			const nx = dx / dist;
			const ny = dy / dist;

			const dvx = b2.vx - b1.vx;
			const dvy = b2.vy - b1.vy;
			const relVel = dvx * nx + dvy * ny;
			
			let dampForce = bond.damping * relVel;
			
			if (totalInvMass > 0 && dt > 0) {
				const maxDamp = Math.abs(relVel) / (totalInvMass * dt);
				if (Math.abs(dampForce) > maxDamp) {
					dampForce = Math.sign(dampForce) * maxDamp;
				}
			}

			const totalForce = forceMag + dampForce;
			
			const fx = totalForce * nx;
			const fy = totalForce * ny;

			if (b1.mass !== -1) {
				b1.ax += fx * invM1;
				b1.ay += fy * invM1;
			}
			if (b2.mass !== -1) {
				b2.ax -= fx * invM2;
				b2.ay -= fy * invM2;
			}
		}
	},
	
	resolveBarriers: function(b, prevX, prevY) {
		if (!this.enableCollision) return;

		for (const barrier of this.solidBarriers) {
			if (!barrier.enabled) continue;
			
			const bx1 = barrier.x1;
			const by1 = barrier.y1;
			const bx2 = barrier.x2;
			const by2 = barrier.y2;
			
			let collisionDetected = false;
			let nx = 0, ny = 0, dist = 0, overlap = 0;
			
			const den = (bx1 - bx2) * (prevY - b.y) - (by1 - by2) * (prevX - b.x);
			if (den !== 0) {
				const t = ((bx1 - prevX) * (prevY - b.y) - (by1 - prevY) * (prevX - b.x)) / den;
				const u = -((bx1 - bx2) * (by1 - prevY) - (by1 - by2) * (bx1 - prevX)) / den;
				
				if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
					collisionDetected = true;
					const segX = bx2 - bx1;
					const segY = by2 - by1;
					const segLen = Math.sqrt(segX*segX + segY*segY);
					nx = -segY / segLen;
					ny = segX / segLen;
					
					const approach = (b.x - prevX)*nx + (b.y - prevY)*ny;
					if (approach > 0) {
						nx = -nx; ny = -ny;
					}
					
					const ix = bx1 + t * segX;
					const iy = by1 + t * segY;
					b.x = ix + nx * (b.radius + 0.01);
					b.y = iy + ny * (b.radius + 0.01);
				}
			}

			if (!collisionDetected) {
				const segX = bx2 - bx1;
				const segY = by2 - by1;
				const segLenSq = segX*segX + segY*segY;
				
				if (segLenSq > 0) {
					const dot = ((b.x - bx1) * segX + (b.y - by1) * segY) / segLenSq;
					const tClamped = Math.max(0, Math.min(1, dot));
					
					const closestX = bx1 + tClamped * segX;
					const closestY = by1 + tClamped * segY;
					
					const distX = b.x - closestX;
					const distY = b.y - closestY;
					const distSq = distX*distX + distY*distY;
					dist = Math.sqrt(distSq);
					
					if (dist < b.radius) {
						collisionDetected = true;
						nx = distX / dist;
						ny = distY / dist;
						overlap = b.radius - dist;
						b.x += nx * overlap;
						b.y += ny * overlap;
					}
				}
			}
			
			if (collisionDetected) {
				const rcpX = -nx * b.radius;
				const rcpY = -ny * b.radius;
				
				const vpX = b.vx - b.rotationSpeed * rcpY;
				const vpY = b.vy + b.rotationSpeed * rcpX;
				
				const vn = vpX * nx + vpY * ny;
				
				if (vn < 0) {
					const e = Math.min(b.e_current, barrier.restitution);
					
					const jnVal = -(1 + e) * vn / b.invMass;
					const jnx = jnVal * nx;
					const jny = jnVal * ny;
					
					const tx = -ny;
					const ty = nx;
					const vt = vpX * tx + vpY * ty;
					
					const i1 = (b.invMass === 0) ? 0 : (2 * b.invMass) / (b.radius * b.radius);
					
					const massTan = b.invMass + (b.radius * b.radius * i1);
					let jtVal = -vt / massTan;
					
					const avgFriction = (b.friction + barrier.friction) * 0.5;
					const maxFric = avgFriction * Math.abs(jnVal);
					
					if (jtVal > maxFric) jtVal = maxFric;
					else if (jtVal < -maxFric) jtVal = -maxFric;
					
					const jtx = jtVal * tx;
					const jty = jtVal * ty;
					
					b.vx += (jnx + jtx) * b.invMass;
					b.vy += (jny + jty) * b.invMass;
					
					const torque = (rcpX * jty - rcpY * jtx);
					b.rotationSpeed += torque * i1;
				}
			}
		}
	},
	
	resolvePeriodic: function(b, prevX, prevY) {
		let didWrap = false;
		for (const z of this.periodicZones) {
			if (!z.enabled) continue;
			
			const offset = (z.type === 'radius') ? b.radius : 0;

			if (z.shape === 'circle') {
				const dx = b.x - z.x;
				const dy = b.y - z.y;
				const distSq = dx*dx + dy*dy;
				const dist = Math.sqrt(distSq);
				
				const prevDx = prevX - z.x;
				const prevDy = prevY - z.y;
				const prevDist = Math.sqrt(prevDx*prevDx + prevDy*prevDy);
				
				const innerLimit = z.radius - offset;
				const outerLimit = z.radius + offset;

				if (prevDist <= innerLimit && dist > innerLimit) {
					b.x = 2 * z.x - b.x;
					b.y = 2 * z.y - b.y;
					didWrap = true;
				} else if (prevDist >= outerLimit && dist < outerLimit) {
					b.x = 2 * z.x - b.x;
					b.y = 2 * z.y - b.y;
					didWrap = true;
				}
			} else {
				if (z.width !== 'inf') {
					const left = z.x;
					const right = z.x + z.width;
					const width = z.width;
					
					if (b.x > prevX) {
						if (prevX <= right - offset && b.x > right - offset) {
							b.x -= (width - 2 * offset);
							didWrap = true;
						} else if (prevX <= left - offset && b.x > left - offset) {
							b.x += (width + 2 * offset);
							didWrap = true;
						}
					} else if (b.x < prevX) {
						if (prevX >= left + offset && b.x < left + offset) {
							b.x += (width - 2 * offset);
							didWrap = true;
						} else if (prevX >= right + offset && b.x < right + offset) {
							b.x -= (width + 2 * offset);
							didWrap = true;
						}
					}
				}

				if (z.height !== 'inf') {
					const top = z.y;
					const bottom = z.y + z.height;
					const height = z.height;
					
					if (b.y > prevY) {
						if (prevY <= bottom - offset && b.y > bottom - offset) {
							b.y -= (height - 2 * offset);
							didWrap = true;
						} else if (prevY <= top - offset && b.y > top - offset) {
							b.y += (height + 2 * offset);
							didWrap = true;
						}
					} else if (b.y < prevY) {
						if (prevY >= top + offset && b.y < top + offset) {
							b.y += (height - 2 * offset);
							didWrap = true;
						} else if (prevY >= bottom + offset && b.y < bottom + offset) {
							b.y -= (height + 2 * offset);
							didWrap = true;
						}
					}
				}
			}
		}
		return didWrap;
	},
	
	updateThermoProperties: function(body) {
		if (!this.enableThermodynamics || body.mass <= 0) return;

		const S = 1 / (1 + Math.exp(body.transitionFactor * (body.temperature - body.criticalTemp)));

		body.e_current = body.e_min + (body.e_base - body.e_min) * S;
		body.Y_current = body.Y_min + (body.Y_base - body.Y_min) * S;
	},
	
	resolveCollision: function(b1, b2, nx, ny, dist, overlap) {
		const r1 = b1.radius;
		const r2 = b2.radius;
		const im1 = b1.invMass;
		const im2 = b2.invMass;
		const m1_dynamic = b1.mass !== -1;
		const m2_dynamic = b2.mass !== -1;

		const avgYoung = (b1.Y_current + b2.Y_current) * 0.5;
		let fx = 0, fy = 0;
		
		if (avgYoung > 0) {
			const effectiveRadius = (r1 * r2) / (r1 + r2);
			const contactWidth = 2 * Math.sqrt(effectiveRadius * overlap);
			const penetrationForce = avgYoung * overlap * contactWidth;
			
			fx -= penetrationForce * nx;
			fy -= penetrationForce * ny;
		}

		const r1x = r1 * nx;
		const r1y = r1 * ny;
		const r2x = -r2 * nx;
		const r2y = -r2 * ny;
		
		const w1 = b1.rotationSpeed;
		const w2 = b2.rotationSpeed;

		const v1x = b1.vx - w1 * r1y;
		const v1y = b1.vy + w1 * r1x;
		const v2x = b2.vx - w2 * r2y;
		const v2y = b2.vy + w2 * r2x;

		const rvx = v2x - v1x;
		const rvy = v2y - v1y;
		
		const vn = rvx * nx + rvy * ny;

		if (vn < 0) {
			const e = Math.min(b1.e_current, b2.e_current);
			
			const jnVal = -(1 + e) * vn / (im1 + im2);
			const jnx = jnVal * nx;
			const jny = jnVal * ny;

			const tx = -ny;
			const ty = nx;
			const vt = rvx * tx + rvy * ty;

			const i1 = (im1 === 0) ? 0 : (2 * im1) / (r1 * r1);
			const i2 = (im2 === 0) ? 0 : (2 * im2) / (r2 * r2);
			
			const massTan = im1 + im2 + (r1 * r1 * i1) + (r2 * r2 * i2);
			let jtVal = -vt / massTan;

			const avgFriction = (b1.friction + b2.friction) * 0.5;
			const maxFric = avgFriction * Math.abs(jnVal);
			
			if (jtVal > maxFric) jtVal = maxFric;
			else if (jtVal < -maxFric) jtVal = -maxFric;

			const jtx = jtVal * tx;
			const jty = jtVal * ty;
			const Jx = jnx + jtx;
			const Jy = jny + jty;

			if (m1_dynamic) {
				b1.vx += Jx * im1;
				b1.vy += Jy * im1;
				const torque = (r1x * jty - r1y * jtx);
				b1.rotationSpeed += torque * i1;
			}
			if (m2_dynamic) {
				b2.vx -= Jx * im2;
				b2.vy -= Jy * im2;
				const torque = (r2x * -jty - r2y * -jtx);
				b2.rotationSpeed += torque * i2;
			}
			
			if (this.enableFragmentation) {
				const impulse = Math.abs(jnVal);
				
				let effIntegrity1 = b1.integrity;
				let effIntegrity2 = b2.integrity;

				if (this.enableThermodynamics) {
					if (b1.Y_base > 0) effIntegrity1 *= (b1.Y_current / b1.Y_base);
					if (b2.Y_base > 0) effIntegrity2 *= (b2.Y_current / b2.Y_base);
				}

				if (m1_dynamic && b1.fragCooldown <= 0 && impulse > effIntegrity1) this.fragmentationQueue.push(b1);
				if (m2_dynamic && b2.fragCooldown <= 0 && impulse > effIntegrity2) this.fragmentationQueue.push(b2);
			}
			
			if (this.enableThermodynamics && b1.mass > 0 && b2.mass > 0) {
				const mu = (b1.mass * b2.mass) / (b1.mass + b2.mass);
				const e_avg = (b1.e_current + b2.e_current) * 0.5;
				const delta_E = 0.5 * mu * (vn * vn) * (1 - e_avg * e_avg);
				
				const Y_sum = b1.Y_current + b2.Y_current;
				if (Y_sum > 0) {
					const invYSum = 1.0 / Y_sum;
					const ratio1 = b2.Y_current * invYSum;
					const ratio2 = b1.Y_current * invYSum;
					
					const Q1 = delta_E * ratio1 * b1.absorptionFactor;
					const Q2 = delta_E * ratio2 * b2.absorptionFactor;
					
					if (b1.specificHeat > 0) {
						b1.temperature += Q1 * im1 / b1.specificHeat;
						this.updateThermoProperties(b1);
					}
					if (b2.specificHeat > 0) {
						b2.temperature += Q2 * im2 / b2.specificHeat;
						this.updateThermoProperties(b2);
					}
				}
			}

			const correctionPercent = 0.8;
			const slop = 0.01;
			const totalInvMass = im1 + im2;
			if (totalInvMass > 0) {
				const correctionMag = Math.max(0, overlap - slop) / totalInvMass * correctionPercent;
				const cx = correctionMag * nx;
				const cy = correctionMag * ny;

				if (m1_dynamic) {
					b1.x -= cx * im1;
					b1.y -= cy * im1;
				}
				if (m2_dynamic) {
					b2.x += cx * im2;
					b2.y += cy * im2;
				}
			}
		}

		this.collisionResult.fx = fx;
		this.collisionResult.fy = fy;
		return this.collisionResult;
	},
	
	computeInteractions: function(bodies) {
		const bodyArray = Object.values(bodies);
		const count = bodyArray.length;
		for (let i = 0; i < count; i++) {
			for (let j = i + 1; j < count; j++) {
				const b1 = bodyArray[i];
				const b2 = bodyArray[j];

				const dx = b2.x - b1.x;
				const dy = b2.y - b1.y;
				const distSq = dx*dx + dy*dy;
				const dist = Math.sqrt(distSq);
				const minDist = b1.radius + b2.radius;

				const nx = dx / dist;
				const ny = dy / dist;

				let f_total = 0;

				if (this.enableGravity) {
					const m1 = b1.mass === -1 ? 1 : b1.mass; 
					const m2 = b2.mass === -1 ? 1 : b2.mass; 
					f_total += (this.units.sim.G * m1 * m2) / distSq;
				}

				if (this.enableElectricity && b1.charge !== 0 && b2.charge !== 0) {
					f_total -= (this.units.sim.Ke * b1.charge * b2.charge) / distSq;
				}

				if (this.enableMagnetism && b1.magMoment !== 0 && b2.magMoment !== 0) {
					f_total -= (this.units.sim.Km * b1.magMoment * b2.magMoment) / (distSq * distSq);
				}

				let fx = f_total * nx;
				let fy = f_total * ny;

				if (this.enableCollision && dist < minDist) {
					const overlap = minDist - dist;
					const forces = this.resolveCollision(b1, b2, nx, ny, dist, overlap);
					fx += forces.fx;
					fy += forces.fy;
				}

				if (b1.mass !== -1) {
					b1.ax += fx * b1.invMass;
					b1.ay += fy * b1.invMass;
				}
				if (b2.mass !== -1) {
					b2.ax -= fx * b2.invMass;
					b2.ay -= fy * b2.invMass;
				}
			}
		}
	},
	
	integrateBody: function(b, dt) {
		if (b.mass === -1) {
			b.vx = 0; b.vy = 0; b.ax = 0; b.ay = 0;
			return false;
		}

		b.vx += b.ax * 0.5 * dt;
		b.vy += b.ay * 0.5 * dt;

		const c = this.units.sim.c;
		const c2 = c * c;
		const vSq = b.vx*b.vx + b.vy*b.vy;
		
		if (vSq > c2) {
			const v = Math.sqrt(vSq);
			const ratio = (c * 0.999) / v;
			b.vx *= ratio;
			b.vy *= ratio;
		}

		const prevX = b.x;
		const prevY = b.y;

		b.x = prevX + b.vx * dt;
		b.y = prevY + b.vy * dt;
		
		this.resolveBarriers(b, prevX, prevY);
		const wrapped = this.resolvePeriodic(b, prevX, prevY);
		if (wrapped) {
			b.path = [];
		}
		
		if (b.rotationSpeed !== 0) {
			if (typeof b.angle === 'undefined') b.angle = 0;
			b.angle += b.rotationSpeed * dt;
		}

		return wrapped;
	},
	
	finalizeVelocity: function(b, dt) {
		if (b.mass === -1) return;

		b.vx += b.ax * 0.5 * dt;
		b.vy += b.ay * 0.5 * dt;

		const c = this.units.sim.c;
		const c2 = c * c;
		const vSq = b.vx*b.vx + b.vy*b.vy;

		if (vSq > c2) {
			const v = Math.sqrt(vSq);
			const ratio = (c * 0.999) / v;
			b.vx *= ratio;
			b.vy *= ratio;
		}
	},
	
	updateGrid: function() {
		this.grid = {};
		const bodyArray = Object.values(this.bodies);
		const numBodies = bodyArray.length;
		if (numBodies === 0) {
			this.cellSize = 50;
			return;
		}
	
		let maxR = 0;
		for (let i = 0; i < numBodies; i++) {
			const b = bodyArray[i];
			if (!b.active) continue;
			if (b.radius > maxR) {
				maxR = b.radius;
			}
		}
	
		this.cellSize = Math.max(50, maxR * 2.1);
		const cellSize = this.cellSize;
	
		for (let i = 0; i < numBodies; i++) {
			const b = bodyArray[i];
			if (!b.active) continue;
			const gridX = Math.floor(b.x / cellSize);
			const gridY = Math.floor(b.y / cellSize);
			const key = `${gridX},${gridY}`;
			if (!this.grid[key]) {
				this.grid[key] = [];
			}
			this.grid[key].push(b.id);
		}
	},
	
	computeLongRangeInteractions: function(bodies) {
		if (!this.enableGravity && !this.enableElectricity && !this.enableMagnetism) return;

		const bodyArray = Object.values(bodies);
		const G = this.units.sim.G;
		const Ke = this.units.sim.Ke;
		const Km = this.units.sim.Km;
		const enableGrav = this.enableGravity;
		const enableElec = this.enableElectricity;
		const enableMag = this.enableMagnetism;
		const enableFrag = this.enableFragmentation;
		const theta = this.barnesHutTheta;

		if (this.useBarnesHut) {
			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			for (const b of bodyArray) {
				if (!b.active) continue;
				if (b.x < minX) minX = b.x;
				if (b.x > maxX) maxX = b.x;
				if (b.y < minY) minY = b.y;
				if (b.y > maxY) maxY = b.y;
			}

			const padding = 100;
			const w = (maxX - minX) + padding * 2;
			const h = (maxY - minY) + padding * 2;
			const size = Math.max(w, h);
			
			this.quadTree = new window.App.QuadTree(minX - padding, minY - padding, size, size);
			for (const b of bodyArray) {
				if (b.active && (b.mass !== 0 || b.charge !== 0 || b.magMoment !== 0)) {
					this.quadTree.insert(b);
				}
			}
			this.quadTree.calculateMultipoles();

			const processNode = (b1, node) => {
				const dx = node.comX - b1.x;
				const dy = node.comY - b1.y;
				const distSq = dx * dx + dy * dy;
				const dist = Math.sqrt(distSq);
				
				if (dist < 1e-9) return;

				const s = node.w;
				const isLeaf = node.nodes.length === 0;

				if (isLeaf || (s / dist < theta)) {
					if (isLeaf) {
						for (const b2 of node.bodies) {
							if (b1 === b2) continue;
							
							const pdx = b2.x - b1.x;
							const pdy = b2.y - b1.y;
							const pDistSq = pdx*pdx + pdy*pdy;
							if (pDistSq < 1e-9) continue;
							const pDist = Math.sqrt(pDistSq);
							const invPDist = 1.0 / pDist;
							const invPDistSq = invPDist * invPDist;

							let f_total = 0;
							const m1 = b1.mass === -1 ? 1 : b1.mass;
							const m2 = b2.mass === -1 ? 1 : b2.mass;

							if (enableGrav && !this.isBodyInNullZone(b1, 'gravity')) {
								f_total += (G * m1 * m2) * invPDistSq;
								
								if (enableFrag && b1.mass !== -1 && b1.fragCooldown <= 0) {
									let effIntegrity1 = b1.integrity;
									if (this.enableThermodynamics && b1.Y_base > 0) effIntegrity1 *= (b1.Y_current / b1.Y_base);
									const tidalForce = (2 * G * m2 * m1 * b1.radius) / (pDistSq * pDist);
									if (tidalForce > effIntegrity1) this.fragmentationQueue.push(b1);
								}
							}
							if (enableElec && !this.isBodyInNullZone(b1, 'electricity')) {
								f_total -= (Ke * b1.charge * b2.charge) * invPDistSq;
							}
							if (enableMag && !this.isBodyInNullZone(b1, 'magnetism')) {
								f_total -= (Km * b1.magMoment * b2.magMoment) * (invPDistSq * invPDist);
							}

							const f_eff = f_total * invPDist;
							b1.ax += f_eff * pdx * b1.invMass;
							b1.ay += f_eff * pdy * b1.invMass;
						}
					} else {
						let f_total = 0;
						const m1 = b1.mass === -1 ? 1 : b1.mass;
						const invDist = 1.0 / dist;
						const invDistSq = invDist * invDist;

						if (enableGrav && node.mass > 0 && !this.isBodyInNullZone(b1, 'gravity')) {
							f_total += (G * m1 * node.mass) * invDistSq;
						}
						if (enableElec && node.charge !== 0 && !this.isBodyInNullZone(b1, 'electricity')) {
							f_total -= (Ke * b1.charge * node.charge) * invDistSq;
						}
						if (enableMag && node.magMoment !== 0 && !this.isBodyInNullZone(b1, 'magnetism')) {
							f_total -= (Km * b1.magMoment * node.magMoment) * (invDistSq * invDist);
						}

						const f_eff = f_total * invDist;
						b1.ax += f_eff * dx * b1.invMass;
						b1.ay += f_eff * dy * b1.invMass;
					}
				} else {
					for (const child of node.nodes) {
						if (child.mass > 0 || child.charge !== 0 || child.magMoment !== 0) {
							processNode(b1, child);
						}
					}
				}
			};

			for (const b1 of bodyArray) {
				if (!b1.active || b1.mass === -1) continue;
				processNode(b1, this.quadTree);
			}

		} else {
			const count = bodyArray.length;
			for (let i = 0; i < count; i++) {
				const b1 = bodyArray[i];
				if (!b1.active) continue;
				const m1 = b1.mass === -1 ? 1 : b1.mass;
				if (m1 === 0 && b1.charge === 0 && b1.magMoment === 0) continue;

				const x1 = b1.x;
				const y1 = b1.y;
				const q1 = b1.charge;
				const mag1 = b1.magMoment;
				const invM1 = b1.invMass;
				const dynamic1 = b1.mass !== -1;
				
				let fx1 = 0;
				let fy1 = 0;

				for (let j = i + 1; j < count; j++) {
					const b2 = bodyArray[j];
					if (!b2.active) continue;
					const dx = b2.x - x1;
					const dy = b2.y - y1;
					const distSq = dx*dx + dy*dy;
		
					if (distSq < 1e-9) continue;

					const dist = Math.sqrt(distSq);
					const invDist = 1.0 / dist;
					const invDistSq = invDist * invDist;
		
					let f_total = 0;
					const m2 = b2.mass === -1 ? 1 : b2.mass; 
		
					if (enableGrav) {
						if (!this.isBodyInNullZone(b1, 'gravity') && !this.isBodyInNullZone(b2, 'gravity')) {
							f_total += (G * m1 * m2) * invDistSq;

							if (enableFrag) {
								let effIntegrity1 = b1.integrity;
								let effIntegrity2 = b2.integrity;

								if (this.enableThermodynamics) {
									if (b1.Y_base > 0) effIntegrity1 *= (b1.Y_current / b1.Y_base);
									if (b2.Y_base > 0) effIntegrity2 *= (b2.Y_current / b2.Y_base);
								}

								if (dynamic1 && b1.fragCooldown <= 0) {
									const tidalForce = (2 * G * m2 * m1 * b1.radius) / (distSq * dist);
									if (tidalForce > effIntegrity1) this.fragmentationQueue.push(b1);
								}
								if (b2.mass !== -1 && b2.fragCooldown <= 0) {
									const tidalForce = (2 * G * m1 * m2 * b2.radius) / (distSq * dist);
									if (tidalForce > effIntegrity2) this.fragmentationQueue.push(b2);
								}
							}
						}
					}
		
					if (enableElec && q1 !== 0 && b2.charge !== 0) {
						if (!this.isBodyInNullZone(b1, 'electricity') && !this.isBodyInNullZone(b2, 'electricity')) {
							f_total -= (Ke * q1 * b2.charge) * invDistSq;
						}
					}
		
					if (enableMag && mag1 !== 0 && b2.magMoment !== 0) {
						if (!this.isBodyInNullZone(b1, 'magnetism') && !this.isBodyInNullZone(b2, 'magnetism')) {
							f_total -= (Km * mag1 * b2.magMoment) * (invDistSq * invDist);
						}
					}
					
					if (f_total !== 0) {
						const f_eff = f_total * invDist;
						const fx = f_eff * dx;
						const fy = f_eff * dy;
			
						if (dynamic1) {
							fx1 += fx;
							fy1 += fy;
						}
						if (b2.mass !== -1) {
							b2.ax -= fx * b2.invMass;
							b2.ay -= fy * b2.invMass;
						}
					}
				}
				
				if (dynamic1) {
					b1.ax += fx1 * invM1;
					b1.ay += fy1 * invM1;
				}
			}
		}
	},
	
	computeShortRangeInteractions: function(bodies, grid) {
		if (!this.enableCollision) return;
		
		const activeGrid = grid || this.grid;
		const cellSize = this.cellSize;
		const bodyArray = Object.values(bodies);
		const count = bodyArray.length;
		
		for (let i = 0; i < count; i++) {
			const b1 = bodyArray[i];
			if (!b1.active) continue;
			const r1 = b1.radius;
			const x1 = b1.x;
			const y1 = b1.y;

			const gridX = Math.floor(x1 / cellSize);
			const gridY = Math.floor(y1 / cellSize);
	
			for (let x = gridX - 1; x <= gridX + 1; x++) {
				for (let y = gridY - 1; y <= gridY + 1; y++) {
					const key = `${x},${y}`;
					const cell = activeGrid[key];
					if (cell) {
						const cellLen = cell.length;
						for (let k = 0; k < cellLen; k++) {
							const b2_id = cell[k];
							if (b1.id >= b2_id) continue;
							
							const b2 = bodies[b2_id];
							const dx = b2.x - x1;
							const dy = b2.y - y1;
							const distSq = dx*dx + dy*dy;
							const radSum = r1 + b2.radius;
							const minDistSq = radSum * radSum;
							
							if (distSq < minDistSq) {
								const dist = Math.sqrt(distSq);
								const invDist = dist > 0 ? 1.0 / dist : 0;
								const nx = dist > 0 ? dx * invDist : 1;
								const ny = dist > 0 ? dy * invDist : 0;
								const overlap = radSum - dist;
								
								const forces = this.resolveCollision(b1, b2, nx, ny, dist, overlap);
	
								const fx = forces.fx;
								const fy = forces.fy;
								
								if (b1.mass !== -1) {
									b1.ax += fx * b1.invMass;
									b1.ay += fy * b1.invMass;
								}
								if (b2.mass !== -1) {
									b2.ax -= fx * b2.invMass;
									b2.ay -= fy * b2.invMass;
								}
							}
						}
					}
				}
			}
		}
	},
	
	processFragmentationQueue: function() {
		if (this.fragmentationQueue.length === 0) return;

		const queue = [...new Set(this.fragmentationQueue)];
		this.fragmentationQueue = [];

		for (const b of queue) {
			if (!b.active) continue;
			if (b.fragCooldown > 0) continue; 
			
			const id = b.id;
			if (!this.bodies[id]) continue;

			if (b.mass > 1) {
				const numFragments = Math.max(2, Math.min(5, Math.floor(Math.log(b.mass))));
				let remainingMass = b.mass;
				
				for (let i = 0; i < numFragments; i++) {
					const ratio = (i === numFragments - 1) ? 1 : (Math.random() * 0.4 + 0.1);
					const fragMass = remainingMass * ratio;
					remainingMass -= fragMass;
					
					if (fragMass < 0.1) continue;

					const r = Math.max(2, Math.pow(fragMass, 1/3)); 

					const angle = Math.random() * Math.PI * 2;
					const offsetDir = Math.random(); 
					const dist = b.radius * 0.3 + (Math.random() * b.radius * 0.6);
					
					const speed = Math.random() * 3 + 1;

					this._addBody({
						x: b.x + Math.cos(angle) * dist,
						y: b.y + Math.sin(angle) * dist,
						vx: b.vx + Math.cos(angle) * speed,
						vy: b.vy + Math.sin(angle) * speed,
						mass: fragMass,
						radius: r,
						color: b.color,
						integrity: b.integrity * 0.8,
						fragCooldown: 60,
						temperature: b.temperature + 50,
						lifetime: this.fragmentLifetime
					});
				}
			}
			
			this._removeBody(id);
		}
	},
	
	update: function(force = false, dtOverride = null) {
		if (this.paused && !force) return;

		const bodies = this.bodies;
		const bodyArray = Object.values(bodies);
		const dt = dtOverride !== null ? dtOverride : this.dt;

		this.tickCount++;
		this.simTime += dt;
		const currentTime = this.simTime;
		const bodiesToRemove = [];

		for (const b of bodyArray) {
			if (!b.active) continue;
			if (b.fragCooldown > 0) b.fragCooldown--;
			
			if (b.mass === -1) {
				b.ax = 0; b.ay = 0; b.vx = 0; b.vy = 0;
				continue;
			}
			
			this.integrateBody(b, dt);
		}

		this.updateGrid();

		for (const b of bodyArray) {
			if (!b.active || b.mass === -1) continue;
			this.computeExternalForces(b, currentTime);
		}

		this.computeBonds(bodies, dt, currentTime);
		this.computeLongRangeInteractions(bodies);
		this.computeShortRangeInteractions(bodies);

		for (const b of bodyArray) {
			if (!b.active) continue;

			this.finalizeVelocity(b, dt);
			
			if (b.lifetime > 0) {
				b.lifetime--;
			}
			
			if (b.lifetime === 0) {
				bodiesToRemove.push(b.id);
				continue;
			}

			let annihilated = false;
			for (const z of this.annihilationZones) {
				if (!z.enabled) continue;
				let isInside = false;
				if (z.shape === 'circle') {
					const dx = b.x - z.x;
					const dy = b.y - z.y;
					isInside = (dx * dx + dy * dy) <= (z.radius * z.radius);
				} else {
					const x_in = (z.width === 'inf') || (b.x >= z.x && b.x <= z.x + z.width);
					const y_in = (z.height === 'inf') || (b.y >= z.y && b.y <= z.y + z.height);
					isInside = x_in && y_in;
				}

				if (isInside) {
					if (z.particleBurst && b.mass > 0) {
						const numParticles = Math.max(2, Math.min(10, Math.floor(b.mass / 100)));
						const particleMass = b.mass / numParticles / 2;
						const particleRadius = Math.max(1, b.radius / numParticles);
						const speedBoost = Math.sqrt(b.vx*b.vx + b.vy*b.vy) + 1;

						for (let k = 0; k < numParticles; k++) {
							const angle = Math.random() * 2 * Math.PI;
							const speed = (Math.random() * 5 + 1) * speedBoost;
							this.addBody({
								x: b.x, y: b.y,
								vx: b.vx + Math.cos(angle) * speed,
								vy: b.vy + Math.sin(angle) * speed,
								mass: particleMass,
								radius: particleRadius,
								lifetime: Math.floor(Math.random() * 50) + 20,
								color: b.color,
								temperature: b.temperature + 500,
								e_base: 0.1,
								friction: 0.1
							});
						}
					}
					bodiesToRemove.push(b.id);
					annihilated = true;
					break; 
				}
			}
			if (annihilated) continue;
			
			if (this.enableThermodynamics && b.mass > 0 && b.specificHeat > 0) {
				const A = 4 * Math.PI * b.radius * b.radius;
				let P_rad = 0;

				if (this.T_ambient !== -1) {
					P_rad = this.units.sim.sigma * A * (Math.pow(b.temperature, 4) - Math.pow(this.T_ambient, 4));
				} else {
					P_rad = this.units.sim.sigma * A * Math.pow(b.temperature, 4);
				}

				const dE_wanted = P_rad * dt;
				let dE_max = 0;

				if (this.T_ambient !== -1) {
					dE_max = b.mass * b.specificHeat * (b.temperature - this.T_ambient);
				} else {
					dE_max = b.mass * b.specificHeat * b.temperature;
				}
				
				const dE_effective = Math.min(dE_wanted, dE_max);
				
				if (dE_effective > 0) {
					b.temperature -= dE_effective * b.invMass / b.specificHeat;
					if (b.temperature < 0) b.temperature = 0;
					this.updateThermoProperties(b);
				}

				const activeThermalZones = [];
				for (const z of this.thermalZones) {
					if (!z.enabled) continue;
					let isInside = false;
					if (z.shape === 'circle') {
						const dx = b.x - z.x;
						const dy = b.y - z.y;
						isInside = (dx * dx + dy * dy) <= (z.radius * z.radius);
					} else {
						const x_in = (z.width === 'inf') || (b.x >= z.x && b.x <= z.x + z.width);
						const y_in = (z.height === 'inf') || (b.y >= z.y && b.y <= z.y + z.height);
						isInside = x_in && y_in;
					}

					if (isInside) {
						activeThermalZones.push(z);
					}
				}

				if (activeThermalZones.length > 0) {
					let avgTemp = 0;
					let avgHtc = 0;
					for (const zone of activeThermalZones) {
						avgTemp += zone.temperature;
						avgHtc += zone.heatTransferCoefficient;
					}
					avgTemp /= activeThermalZones.length;
					avgHtc /= activeThermalZones.length;
					
					const dT = (avgTemp - b.temperature) * (1 - Math.exp(-avgHtc * dt));
					b.temperature += dT;
					if (b.temperature < 0) b.temperature = 0;
					this.updateThermoProperties(b);
				}
			}

			if (this.showTrails && (this.tickCount % this.trailStep === 0)) {
				if (b.path.length === 0 || 
					(Math.abs(b.x - b.path[b.path.length-1].x) < 1000 && 
					Math.abs(b.y - b.path[b.path.length-1].y) < 1000)) {
					b.path.push({x: b.x, y: b.y});
				}
				if (b.path.length > this.trailLength) {
					b.path.shift();
				}
			} else if (!this.showTrails && b.path.length > 0) {
				b.path = [];
			}
		}

		if (bodiesToRemove.length > 0) {
			for (const id of bodiesToRemove) {
				const bodyToRemove = this.bodies[id];
				if (bodyToRemove) {
					window.App.BodyPool.release(bodyToRemove);
					delete this.bodies[id];
				}
			}
		}

		this.maxRadius = Object.values(this.bodies).reduce((max, b) => Math.max(max, Math.sqrt(b.x*b.x + b.y*b.y)), 0);

		if (this.enableFragmentation) {
			this.processFragmentationQueue();
		}
	},
	
	predictPath: function(bodyId, numSteps, stepDt) {
		if (!this.bodies[bodyId] || !this.bodies[bodyId].active) return [];
		
		const tempBodies = {};
		for (const id in this.bodies) {
			tempBodies[id] = this.bodies[id].clone();
		}

		const predictedPath = [];
		let currentTargetId = bodyId;
		const dt = stepDt;
		const cellSize = this.cellSize;

		const originalQueue = this.fragmentationQueue;
		this.fragmentationQueue = [];

		try {
			for (let step = 0; step < numSteps; step++) {
				const predictedTime = (this.tickCount + 1 + step) * dt;
				const tempBodyArray = Object.values(tempBodies);

				let targetJumped = false;
				let targetAnnihilated = false;
				let targetFragmented = false;

				for (const b of tempBodyArray) {
					if (!b.active) continue;
					if (b.mass === -1) {
						b.ax = 0; b.ay = 0;
						continue;
					}
					
					const wrapped = this.integrateBody(b, dt);
					if (b.id === currentTargetId && wrapped) {
						targetJumped = true;
					}
				}

				const tempGrid = {};
				for (const b of tempBodyArray) {
					if (!b.active) continue;
					const gridX = Math.floor(b.x / cellSize);
					const gridY = Math.floor(b.y / cellSize);
					const key = `${gridX},${gridY}`;
					if (!tempGrid[key]) {
						tempGrid[key] = [];
					}
					tempGrid[key].push(b.id);
				}

				for (const b of tempBodyArray) {
					if (!b.active || b.mass === -1) continue;
					this.computeExternalForces(b, predictedTime);
				}

				this.computeBonds(tempBodies, dt, predictedTime);
				this.computeLongRangeInteractions(tempBodies);
				this.computeShortRangeInteractions(tempBodies, tempGrid);

				if (this.enableFragmentation) {
					const targetClone = tempBodies[currentTargetId];
					if (this.fragmentationQueue.includes(targetClone)) {
						targetFragmented = true;
					}
					this.fragmentationQueue.length = 0;
				}

				const bodiesToAnnihilate = [];
				for (const b of tempBodyArray) {
					if (!b.active) continue;
					
					this.finalizeVelocity(b, dt);

					for (const z of this.annihilationZones) {
						if (!z.enabled) continue;
						let isInside = false;
						if (z.shape === 'circle') {
							const dx = b.x - z.x;
							const dy = b.y - z.y;
							isInside = (dx * dx + dy * dy) <= (z.radius * z.radius);
						} else {
							const x_in = (z.width === 'inf') || (b.x >= z.x && b.x <= z.x + z.width);
							const y_in = (z.height === 'inf') || (b.y >= z.y && b.y <= z.y + z.height);
							isInside = x_in && y_in;
						}

						if (isInside) {
							if (b.id === currentTargetId) {
								targetAnnihilated = true;
							}
							bodiesToAnnihilate.push(b.id);
							break;
						}
					}
				}

				if (bodiesToAnnihilate.length > 0) {
					for (const id of bodiesToAnnihilate) {
						delete tempBodies[id];
					}
				}
				
				if (targetFragmented || targetAnnihilated) {
					break;
				}
				
				const targetBody = tempBodies[currentTargetId];
				if (!targetBody) break;
				predictedPath.push({ x: targetBody.x, y: targetBody.y, jump: targetJumped });
			}
		} finally {
			this.fragmentationQueue = originalQueue;
		}
		
		Object.values(tempBodies).forEach(b => window.App.BodyPool.release(b));

		return predictedPath;
	},
	
	_zeroVelocities: function() {
		for (const b of Object.values(this.bodies)) {
			b.vx = 0;
			b.vy = 0;
			b.path = [];
		}
	},

	zeroVelocities: function() {
		if (window.App.ActionHistory.isExecuting) {
			this._zeroVelocities();
			return;
		}
		const sim = this;
		const originalStates = {};
		for (const id in this.bodies) {
			const b = this.bodies[id];
			originalStates[id] = { vx: b.vx, vy: b.vy, path: [...b.path] };
		}

		const action = {
			execute: () => sim._zeroVelocities(),
			undo: () => {
				for (const id in sim.bodies) {
					if (originalStates[id]) {
						const b = sim.bodies[id];
						b.vx = originalStates[id].vx;
						b.vy = originalStates[id].vy;
						b.path = originalStates[id].path;
					}
				}
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_reverseTime: function() {
		for (const b of Object.values(this.bodies)) {
			b.vx = -b.vx;
			b.vy = -b.vy;
			b.path = [];
		}
	},

	reverseTime: function() {
		if (window.App.ActionHistory.isExecuting) {
			this._reverseTime();
			return;
		}
		const sim = this;
		const action = {
			execute: () => sim._reverseTime(),
			undo: () => sim._reverseTime()
		};
		window.App.ActionHistory.execute(action);
	},
	
	_cullDistant: function(minX, maxX, minY, maxY) {
		const idsToRemove = [];
		for (const id in this.bodies) {
			const b = this.bodies[id];
			if (!(b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY)) {
				idsToRemove.push(id);
			}
		}

		for (const id of idsToRemove) {
			this._removeBody(id);
		}
	},

	cullDistant: function(minX, maxX, minY, maxY) {
		if (window.App.ActionHistory.isExecuting) {
			this._cullDistant(minX, maxX, minY, maxY);
			return;
		}
		const sim = this;
		const originalBodies = {};
		for (const id in this.bodies) {
			originalBodies[id] = this.bodies[id].clone();
		}
		const originalBonds = this.elasticBonds.map(b => ({ ...b }));

		const action = {
			execute: () => {
				sim._cullDistant(minX, maxX, minY, maxY);
			},
			undo: () => {
				Object.values(sim.bodies).forEach(b => window.App.BodyPool.release(b));
				sim.bodies = originalBodies;
				sim.elasticBonds = originalBonds;
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_snapToGrid: function(gridSize) {
		for (const b of Object.values(this.bodies)) {
			b.x = Math.round(b.x / gridSize) * gridSize;
			b.y = Math.round(b.y / gridSize) * gridSize;
			b.path = [];
		}
	},

	snapToGrid: function(gridSize) {
		if (window.App.ActionHistory.isExecuting) {
			this._snapToGrid(gridSize);
			return;
		}
		const sim = this;
		const originalStates = {};
		for (const id in this.bodies) {
			const b = this.bodies[id];
			originalStates[id] = { x: b.x, y: b.y, path: [...b.path] };
		}
		const action = {
			execute: () => sim._snapToGrid(gridSize),
			undo: () => {
				for (const id in sim.bodies) {
					if (originalStates[id]) {
						const b = sim.bodies[id];
						b.x = originalStates[id].x;
						b.y = originalStates[id].y;
						b.path = originalStates[id].path;
					}
				}
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_killRotation: function() {
		for (const b of Object.values(this.bodies)) {
			b.rotationSpeed = 0;
		}
	},

	killRotation: function() {
		if (window.App.ActionHistory.isExecuting) {
			this._killRotation();
			return;
		}
		const sim = this;
		const originalSpeeds = {};
		for (const id in this.bodies) {
			originalSpeeds[id] = this.bodies[id].rotationSpeed;
		}

		const action = {
			execute: () => sim._killRotation(),
			undo: () => {
				for (const id in sim.bodies) {
					if (originalSpeeds.hasOwnProperty(id)) {
						sim.bodies[id].rotationSpeed = originalSpeeds[id];
					}
				}
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_scatterPositions: function(minX, minY, width, height) {
		for (const b of Object.values(this.bodies)) {
			b.x = minX + Math.random() * width;
			b.y = minY + Math.random() * height;
			b.path = [];
		}
	},

	scatterPositions: function(minX, minY, width, height) {
		if (window.App.ActionHistory.isExecuting) {
			this._scatterPositions(minX, minY, width, height);
			return;
		}
		const sim = this;
		const originalStates = {};
		for (const id in this.bodies) {
			const b = this.bodies[id];
			originalStates[id] = { x: b.x, y: b.y, path: [...b.path] };
		}
		const action = {
			execute: () => sim._scatterPositions(minX, minY, width, height),
			undo: () => {
				for (const id in sim.bodies) {
					if (originalStates[id]) {
						const b = sim.bodies[id];
						b.x = originalStates[id].x;
						b.y = originalStates[id].y;
						b.path = originalStates[id].path;
					}
				}
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_equalizeMasses: function() {
		let totalMass = 0;
		let count = 0;
		for (const b of Object.values(this.bodies)) {
			if (b.mass !== -1 && b.active) {
				totalMass += b.mass;
				count++;
			}
		}
		if (count === 0) return;
		const avg = totalMass / count;
		for (const b of Object.values(this.bodies)) {
			if (b.mass !== -1 && b.active) {
				b.mass = avg;
				b.invMass = 1 / avg;
			}
		}
	},

	equalizeMasses: function() {
		if (window.App.ActionHistory.isExecuting) {
			this._equalizeMasses();
			return;
		}
		const sim = this;
		const originalMasses = {};
		for (const id in this.bodies) {
			const b = this.bodies[id];
			originalMasses[id] = { mass: b.mass, invMass: b.invMass };
		}

		const action = {
			execute: () => sim._equalizeMasses(),
			undo: () => {
				for (const id in sim.bodies) {
					if (originalMasses[id]) {
						const b = sim.bodies[id];
						b.mass = originalMasses[id].mass;
						b.invMass = originalMasses[id].invMass;
					}
				}
			}
		};
		window.App.ActionHistory.execute(action);
	},
};

window.App.sim = Simulation;
Simulation.init();