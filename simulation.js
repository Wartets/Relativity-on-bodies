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

		this.ax = 0;
		this.ay = 0;
		this.path = [];
		this.angle = 0;
		
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

const Simulation = {
	bodies: [],
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
	G: 0.5,
	c: 50.0,
	Ke: 10.0,
	Km: 5.0,
	dt: 0.25,
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
			defaults: function(b1Idx, b2Idx, config = {}, length, damping) {
				if (b1Idx === b2Idx || b1Idx < 0 || b2Idx < 0 || !this.bodies[b1Idx] || !this.bodies[b2Idx]) return null;
				const b1 = this.bodies[b1Idx];
				const b2 = this.bodies[b2Idx];
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
				
				return { name: config.name, body1: b1Idx, body2: b2Idx, enabled: true, ...settings };
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
	T_ambient: 3.0,
	sigma: 0.0001,
	
	formulaFields: [],
	
	showTrails: true,
	trailLength: 80,
	trailStep: 3,
	tickCount: 0,

	init: function() {
		this.reset();
		
		Object.keys(this.objectConfigs).forEach(typeKey => {
			this._createHistoryManagedObjectApi(typeKey);
		});
	},

	reset: function() {
		this.bodies = [];
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
		const newBody = window.App.BodyPool.initBody({
			name: `Body ${this.bodies.length + 1}`,
			...config
		});
		this.bodies.push(newBody);
		return this.bodies.length - 1;
	},

	addBody: function(config) {
		if (window.App.ActionHistory.isExecuting) {
			this._addBody(config);
			return;
		}

		const sim = this;
		let bodyIndex;
		let fullConfig;

		const action = {
			execute: function() {
				const configToUse = fullConfig || config;
				bodyIndex = sim._addBody(configToUse);
				
				if (!fullConfig) {
					fullConfig = { ...sim.bodies[bodyIndex] };
				}
			},
			undo: function() {
				sim._removeBody(bodyIndex);
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_removeBody: function(index) {
		if (index >= 0 && index < this.bodies.length) {
			const bodyToRemove = this.bodies[index];
			window.App.BodyPool.release(bodyToRemove);
			
			this.bodies.splice(index, 1);
			
			for (let i = this.elasticBonds.length - 1; i >= 0; i--) {
				const b = this.elasticBonds[i];
				if (b.body1 === index || b.body2 === index) {
					this.elasticBonds.splice(i, 1);
				} else {
					if (b.body1 > index) b.body1--;
					if (b.body2 > index) b.body2--;
				}
			}
		}
	},

	removeBody: function(index) {
		if (window.App.ActionHistory.isExecuting) {
			this._removeBody(index);
			return;
		}
		if (index < 0 || index >= this.bodies.length) return;

		const sim = this;
		const removedBody = this.bodies[index].clone();
		const removedBonds = [];
		this.elasticBonds.forEach(b => {
			if (b.body1 === index || b.body2 === index) {
				removedBonds.push({ ...b });
			}
		});

		const action = {
			execute: function() {
				sim._removeBody(index);
			},
			undo: function() {
				sim.bodies.splice(index, 0, removedBody);

				for (let i = 0; i < sim.elasticBonds.length; i++) {
					const b = sim.elasticBonds[i];
					if (b.body1 >= index) b.body1++;
					if (b.body2 >= index) b.body2++;
				}
				
				removedBonds.forEach(bondConfig => {
					sim.elasticBonds.push(bondConfig);
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
		const G = this.G;
		const c = this.c;
		const Ke = this.Ke;
		const Km = this.Km;
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
			
			const testVars = { x: 1, y: 1, G: 1, c: 1, Ke: 1, Km: 1, t: 0 };
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
			if (!b1 || !b2) continue;

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

			if (z.shape === 'circle') {
				const dx = b.x - z.x;
				const dy = b.y - z.y;
				const dist = Math.sqrt(dx*dx + dy*dy);
				
				const prevDx = prevX - z.x;
				const prevDy = prevY - z.y;
				const prevDist = Math.sqrt(prevDx*prevDx + prevDy*prevDy);

				const boundaryDist = (z.type === 'radius') ? z.radius - b.radius : z.radius;

				if (boundaryDist > 0 && dist > boundaryDist && prevDist <= boundaryDist) {
					const nx = dx / dist;
					const ny = dy / dist;

					if (z.type === 'radius') {
						const wrapDist = z.radius - b.radius;
						b.x = z.x - wrapDist * nx;
						b.y = z.y - wrapDist * ny;
					} else {
						b.x -= 2 * dx;
						b.y -= 2 * dy;
					}
					didWrap = true;
				}
			} else {
				const left = z.x;
				const right = z.x + z.width;
				const top = z.y;
				const bottom = z.y + z.height;
				const offset = (z.type === 'radius') ? b.radius : 0;

				const inYRange = (z.height === 'inf') || (prevY + offset > top && prevY - offset < bottom);
				if (z.width !== 'inf' && inYRange) {
					if (prevX + offset <= right && b.x + offset > right) {
						if (z.type === 'radius') {
							b.x = left + b.radius;
						} else {
							b.x -= z.width;
						}
						didWrap = true;
					} else if (prevX - offset >= left && b.x - offset < left) {
						if (z.type === 'radius') {
							b.x = right - b.radius;
						} else {
							b.x += z.width;
						}
						didWrap = true;
					}
				}

				const inXRange = (z.width === 'inf') || (prevX + offset > left && prevX - offset < right);
				if (z.height !== 'inf' && inXRange) {
					if (prevY + offset <= bottom && b.y + offset > bottom) {
						if (z.type === 'radius') {
							b.y = top + b.radius;
						} else {
							b.y -= z.height;
						}
						didWrap = true;
					} else if (prevY - offset >= top && b.y - offset < top) {
						if (z.type === 'radius') {
							b.y = bottom - b.radius;
						} else {
							b.y += z.height;
						}
						didWrap = true;
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
		const count = bodies.length;
		for (let i = 0; i < count; i++) {
			for (let j = i + 1; j < count; j++) {
				const b1 = bodies[i];
				const b2 = bodies[j];

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
					f_total += (this.G * m1 * m2) / distSq;
				}

				if (this.enableElectricity && b1.charge !== 0 && b2.charge !== 0) {
					f_total -= (this.Ke * b1.charge * b2.charge) / distSq;
				}

				if (this.enableMagnetism && b1.magMoment !== 0 && b2.magMoment !== 0) {
					f_total -= (this.Km * b1.magMoment * b2.magMoment) / (distSq * dist);
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

		let vx = b.vx + b.ax * dt;
		let vy = b.vy + b.ay * dt;

		const c = this.c;
		const c2 = c * c;
		const vSq = vx*vx + vy*vy;
		
		if (vSq > c2) {
			const v = Math.sqrt(vSq);
			const ratio = (c * 0.999) / v;
			vx *= ratio;
			vy *= ratio;
		}

		const prevX = b.x;
		const prevY = b.y;

		b.x = prevX + vx * dt;
		b.y = prevY + vy * dt;
		b.vx = vx;
		b.vy = vy;
		
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
	
	updateGrid: function() {
		this.grid = {};
		const bodies = this.bodies;
		const numBodies = bodies.length;
		if (numBodies === 0) {
			this.cellSize = 50;
			return;
		}
	
		let maxR = 0;
		for (let i = 0; i < numBodies; i++) {
			if (bodies[i].radius > maxR) {
				maxR = bodies[i].radius;
			}
		}
	
		this.cellSize = Math.max(50, maxR * 2.1);
		const cellSize = this.cellSize;
	
		for (let i = 0; i < numBodies; i++) {
			const b = bodies[i];
			const gridX = Math.floor(b.x / cellSize);
			const gridY = Math.floor(b.y / cellSize);
			const key = `${gridX},${gridY}`;
			if (!this.grid[key]) {
				this.grid[key] = [];
			}
			this.grid[key].push(i);
		}
	},
	
	computeLongRangeInteractions: function(bodies) {
		if (!this.enableGravity && !this.enableElectricity && !this.enableMagnetism) return;
	
		const count = bodies.length;
		const G = this.G;
		const Ke = this.Ke;
		const Km = this.Km;
		const enableGrav = this.enableGravity;
		const enableElec = this.enableElectricity;
		const enableMag = this.enableMagnetism;

		for (let i = 0; i < count; i++) {
			const b1 = bodies[i];
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
				const b2 = bodies[j];
				const dx = b2.x - x1;
				const dy = b2.y - y1;
				const distSq = dx*dx + dy*dy;
	
				if (distSq < 1e-9) continue;

				const dist = Math.sqrt(distSq);
				const invDist = 1.0 / dist;
				const invDistSq = invDist * invDist;
	
				let f_total = 0;
	
				if (enableGrav) {
					if (!this.isBodyInNullZone(b1, 'gravity') && !this.isBodyInNullZone(b2, 'gravity')) {
						const m2 = b2.mass === -1 ? 1 : b2.mass; 
						f_total += (G * m1 * m2) * invDistSq;
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
	},
	
	computeShortRangeInteractions: function(bodies, grid) {
		if (!this.enableCollision) return;
		
		const activeGrid = grid || this.grid;
		const cellSize = this.cellSize;
		const count = bodies.length;
		
		for (let i = 0; i < count; i++) {
			const b1 = bodies[i];
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
							const j = cell[k];
							if (i >= j) continue;
							
							const b2 = bodies[j];
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
	
	update: function(force = false) {
		if (this.paused && !force) return;

		this.updateGrid();

		const bodies = this.bodies;
		let count = bodies.length;
		const dt = this.dt;

		this.tickCount++;
		const currentTime = this.tickCount * dt;

		for (let i = 0; i < count; i++) {
			if (bodies[i].mass === -1) {
				bodies[i].ax = 0; bodies[i].ay = 0; bodies[i].vx = 0; bodies[i].vy = 0;
				continue;
			}
			this.computeExternalForces(bodies[i], currentTime);
		}

		this.computeBonds(bodies, dt, currentTime);
		this.computeLongRangeInteractions(bodies);
		this.computeShortRangeInteractions(bodies);

		for (let i = 0; i < count; i++) {
			const b = bodies[i];
			
			if (b.lifetime > 0) {
				b.lifetime--;
			}
			
			if (b.lifetime === 0) {
				window.App.BodyPool.release(b);
				bodies.splice(i, 1);
				count--; i--;
				continue;
			}

			this.integrateBody(b, dt);
			
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
					window.App.BodyPool.release(b);
					bodies.splice(i, 1);
					count--; i--;
					annihilated = true;
					break; 
				}
			}
			if (annihilated) continue;
			
			if (this.enableThermodynamics && b.mass > 0 && b.specificHeat > 0) {
				const A = 4 * Math.PI * b.radius * b.radius;
				let P_rad = 0;

				if (this.T_ambient !== -1) {
					P_rad = this.sigma * A * (Math.pow(b.temperature, 4) - Math.pow(this.T_ambient, 4));
				} else {
					P_rad = this.sigma * A * Math.pow(b.temperature, 4);
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

		this.maxRadius = bodies.reduce((max, b) => Math.max(max, Math.sqrt(b.x*b.x + b.y*b.y)), 0);
	},
	
	predictPath: function(bodyIndex, numSteps, stepDt) {
		if (!this.bodies[bodyIndex]) return [];
		
		const tempBodies = this.bodies.map(b => b.clone());
		const predictedPath = [];
		let count = tempBodies.length;
		let currentTargetIndex = bodyIndex;
		const dt = stepDt;
		const cellSize = this.cellSize;

		for (let step = 0; step < numSteps; step++) {
			const predictedTime = (this.tickCount + 1 + step) * dt;
			for (let i = 0; i < count; i++) {
				if (tempBodies[i].mass === -1) {
					tempBodies[i].ax = 0;
					tempBodies[i].ay = 0;
					continue;
				}
				this.computeExternalForces(tempBodies[i], predictedTime);
			}

			this.computeBonds(tempBodies, dt, predictedTime);

			const tempGrid = {};
			for (let i = 0; i < count; i++) {
				const b = tempBodies[i];
				const gridX = Math.floor(b.x / cellSize);
				const gridY = Math.floor(b.y / cellSize);
				const key = `${gridX},${gridY}`;
				if (!tempGrid[key]) {
					tempGrid[key] = [];
				}
				tempGrid[key].push(i);
			}
	
			this.computeLongRangeInteractions(tempBodies);
			this.computeShortRangeInteractions(tempBodies, tempGrid);

			let targetJumped = false;
			let targetAnnihilated = false;

			for (let i = 0; i < count; i++) {
				const b = tempBodies[i];
				const wrapped = this.integrateBody(b, dt);

				if (i === currentTargetIndex && wrapped) {
					targetJumped = true;
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
						if (i === currentTargetIndex) {
							targetAnnihilated = true;
						} else if (i < currentTargetIndex) {
							currentTargetIndex--;
						}
						
						tempBodies.splice(i, 1);
						count--;
						i--;
						annihilated = true;
						break;
					}
				}
				if (annihilated) continue;
			}
			
			if (targetAnnihilated) {
				break;
			}
			
			const targetBody = tempBodies[currentTargetIndex];
			if (!targetBody) break;
			predictedPath.push({ x: targetBody.x, y: targetBody.y, jump: targetJumped });
		}

		tempBodies.forEach(b => window.App.BodyPool.release(b));

		return predictedPath;
	},
	
	_zeroVelocities: function() {
		for (let b of this.bodies) {
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
		const originalStates = this.bodies.map(b => ({ vx: b.vx, vy: b.vy, path: [...b.path] }));
		const action = {
			execute: () => sim._zeroVelocities(),
			undo: () => {
				sim.bodies.forEach((b, i) => {
					if (originalStates[i]) {
						b.vx = originalStates[i].vx;
						b.vy = originalStates[i].vy;
						b.path = originalStates[i].path;
					}
				});
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_reverseTime: function() {
		for (let b of this.bodies) {
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
		const indicesToRemove = [];
		this.bodies.forEach((b, index) => {
			if (!(b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY)) {
				indicesToRemove.push(index);
			}
		});

		for (let i = indicesToRemove.length - 1; i >= 0; i--) {
			this._removeBody(indicesToRemove[i]);
		}
	},

	cullDistant: function(minX, maxX, minY, maxY) {
		if (window.App.ActionHistory.isExecuting) {
			this._cullDistant(minX, maxX, minY, maxY);
			return;
		}
		const sim = this;
		const originalBodies = this.bodies.map(b => b.clone());
		const originalBonds = this.elasticBonds.map(b => ({ ...b }));

		const action = {
			execute: () => {
				sim._cullDistant(minX, maxX, minY, maxY);
			},
			undo: () => {
				sim.bodies.forEach(b => window.App.BodyPool.release(b));
				sim.bodies = originalBodies;
				sim.elasticBonds = originalBonds;
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_snapToGrid: function(gridSize) {
		for (let b of this.bodies) {
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
		const originalStates = this.bodies.map(b => ({ x: b.x, y: b.y, path: [...b.path] }));
		const action = {
			execute: () => sim._snapToGrid(gridSize),
			undo: () => {
				sim.bodies.forEach((b, i) => {
					if (originalStates[i]) {
						b.x = originalStates[i].x;
						b.y = originalStates[i].y;
						b.path = originalStates[i].path;
					}
				});
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_killRotation: function() {
		for (let b of this.bodies) {
			b.rotationSpeed = 0;
		}
	},

	killRotation: function() {
		if (window.App.ActionHistory.isExecuting) {
			this._killRotation();
			return;
		}
		const sim = this;
		const originalSpeeds = this.bodies.map(b => b.rotationSpeed);
		const action = {
			execute: () => sim._killRotation(),
			undo: () => {
				sim.bodies.forEach((b, i) => {
					b.rotationSpeed = originalSpeeds[i];
				});
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_scatterPositions: function(minX, minY, width, height) {
		for (let b of this.bodies) {
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
		const originalStates = this.bodies.map(b => ({ x: b.x, y: b.y, path: [...b.path] }));
		const action = {
			execute: () => sim._scatterPositions(minX, minY, width, height),
			undo: () => {
				sim.bodies.forEach((b, i) => {
					if (originalStates[i]) {
						b.x = originalStates[i].x;
						b.y = originalStates[i].y;
						b.path = originalStates[i].path;
					}
				});
			}
		};
		window.App.ActionHistory.execute(action);
	},
	
	_equalizeMasses: function() {
		let totalMass = 0;
		let count = 0;
		for (let b of this.bodies) {
			if (b.mass !== -1) {
				totalMass += b.mass;
				count++;
			}
		}
		if (count === 0) return;
		const avg = totalMass / count;
		for (let b of this.bodies) {
			if (b.mass !== -1) {
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
		const originalMasses = this.bodies.map(b => ({ mass: b.mass, invMass: b.invMass }));
		const action = {
			execute: () => sim._equalizeMasses(),
			undo: () => {
				sim.bodies.forEach((b, i) => {
					if (originalMasses[i]) {
						b.mass = originalMasses[i].mass;
						b.invMass = originalMasses[i].invMass;
					}
				});
			}
		};
		window.App.ActionHistory.execute(action);
	},
};

window.App.sim = Simulation;
Simulation.init();