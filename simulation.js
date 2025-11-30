window.App = {
	sim: null,
	render: null,
	ui: null
};

window.App.BodySchema = {
	mass: { default: 1, label: 'Mass', tip: 'Body mass. Set to -1 for a fixed body.', type: 'number', constraint: 'mass' },
	radius: { default: 2, label: 'Radius', tip: 'Body radius for collisions.', type: 'number', constraint: 'positive' },
	restitution: { default: 1.0, label: 'Restit. Coeff.', tip: 'Collision elasticity (0-1).', type: 'number', constraint: 'non-negative' },
	x: { default: 0, label: 'Position X', tip: 'Current X coordinate.', type: 'number', constraint: 'default', prec: 2 },
	y: { default: 0, label: 'Position Y', tip: 'Current Y coordinate.', type: 'number', constraint: 'default', prec: 2 },
	vx: { default: 0, label: 'Velocity X', tip: 'Current velocity on X axis.', type: 'number', constraint: 'default', prec: 3 },
	vy: { default: 0, label: 'Velocity Y', tip: 'Current velocity on Y axis.', type: 'number', constraint: 'default', prec: 3 },
	ax: { default: 0, label: 'Acc X', tip: 'Constant acceleration on X axis.', type: 'number', constraint: 'default', prec: 3, inputId: 'newAX', internal: 'startAx' },
	ay: { default: 0, label: 'Acc Y', tip: 'Constant acceleration on Y axis.', type: 'number', constraint: 'default', prec: 3, inputId: 'newAY', internal: 'startAy' },
	charge: { default: 0, label: 'Charge (e)', tip: 'Body electric charge.', type: 'number', constraint: 'default' },
	magMoment: { default: 0, label: 'Mag. Moment', tip: 'Body magnetic moment.', type: 'number', constraint: 'default' },
	rotationSpeed: { default: 0, label: 'Rot. Speed', tip: 'Body rotation speed.', type: 'number', constraint: 'default', prec: 3 },
	temperature: { default: 0, label: 'Temp.', tip: 'Body temperature (currently visual only).', type: 'number', constraint: 'non-negative', prec: 0 },
	youngModulus: { default: 0, label: 'Young\'s Mod.', tip: 'Material Young\'s modulus.', type: 'number', constraint: 'non-negative', prec: 0 },
	friction: { default: 0.5, label: 'Friction Coeff.', tip: 'Friction coefficient during collisions.', type: 'number', constraint: 'non-negative' },
	lifetime: { default: -1, label: 'Lifetime', tip: 'Body lifetime in simulation ticks. -1 for infinite.', type: 'number', constraint: 'lifetime', prec: 0 },
	name: { default: "Body", label: 'Name', type: 'string' },
	color: { default: null, label: 'Color', type: 'color' }
};

class Body {
	constructor(config = {}) {
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
					const m = this.mass ?? 1;
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
	}
};

const Simulation = {
	bodies: [],
	periodicZones: [],
	viscosityZones: [],
	elasticBonds: [],
	solidBarriers: [],
	G: 0.5,
	c: 50.0,
	Ke: 10.0,
	Km: 5.0,
	dt: 0.25,
	paused: true,
	maxRadius: 0,
	
	enableGravity: true,
	enableElectricity: false,
	enableMagnetism: false,
	enableCollision: false,
	
	formulaFields: [],
	
	showTrails: true,
	trailLength: 80,
	trailStep: 3,
	tickCount: 0,

	init: function() {
		this.reset();
	},

	reset: function() {
		this.bodies = [];
		this.periodicZones = [];
		this.viscosityZones = [];
		this.elasticBonds = [];
		this.solidBarriers = [];
		this.fieldZones = [];
		this.formulaFields = [];
	},
	
	addBody: function(config) {
		const newBody = new Body({
			name: `Body ${this.bodies.length + 1}`,
			...config
		});
		this.bodies.push(newBody);
	},
	
	removeBody: function(index) {
		if (index >= 0 && index < this.bodies.length) {
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

	addPeriodicZone: function(x, y, w, h, color, type) {
		this.periodicZones.push({
			id: Date.now() + Math.random(),
			name: `Zone ${this.periodicZones.length + 1}`,
			x: x,
			y: y,
			width: w,
			height: h,
			color: color || '#e67e22',
			type: type || 'center',
			enabled: true
		});
	},

	removePeriodicZone: function(id) {
		this.periodicZones = this.periodicZones.filter(z => z.id !== id);
	},

	addViscosityZone: function(x, y, w, h, viscosity, color) {
		this.viscosityZones.push({
			id: Date.now() + Math.random(),
			name: `Viscosity ${this.viscosityZones.length + 1}`,
			x: x,
			y: y,
			width: w,
			height: h,
			viscosity: viscosity || 0.5,
			color: color || '#3498db',
			enabled: true
		});
	},

	removeViscosityZone: function(id) {
		this.viscosityZones = this.viscosityZones.filter(z => z.id !== id);
	},
	
	addElasticBond: function(b1Idx, b2Idx, config = {}) {
		if (b1Idx === b2Idx || b1Idx < 0 || b2Idx < 0) return;
		
		const b1 = this.bodies[b1Idx];
		const b2 = this.bodies[b2Idx];
		const dist = Math.sqrt((b2.x - b1.x)**2 + (b2.y - b1.y)**2);

		if (typeof config === 'number') {
			const stiffness = config;
			const length = arguments[3];
			const damping = arguments[4];
			config = { stiffness: stiffness };
			if (typeof length === 'number') config.length = length;
			if (typeof damping === 'number') config.damping = damping;
		}

		const defaults = {
			stiffness: 0.5,
			damping: 0.1,
			length: dist,
			color: '#ffffff',
			name: `Bond ${this.elasticBonds.length + 1}`,
			type: 'spring',
			nonLinearity: 1.0,
			breakTension: -1,
			activeAmp: 0,
			activeFreq: 0
		};
		
		const settings = { ...defaults, ...config };
		if (settings.length < 0) settings.length = dist;

		this.elasticBonds.push({
			id: Date.now() + Math.random(),
			body1: b1Idx,
			body2: b2Idx,
			enabled: true,
			...settings
		});
	},

	removeElasticBond: function(id) {
		const index = this.elasticBonds.findIndex(b => b.id === id);
		if (index !== -1) {
			this.elasticBonds.splice(index, 1);
		}
	},
	
	addSolidBarrier: function(x1, y1, x2, y2, restitution, color, name, friction) {
		this.solidBarriers.push({
			id: Date.now() + Math.random(),
			name: name || `Wall ${this.solidBarriers.length + 1}`,
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2,
			restitution: restitution || 0.8,
			friction: friction !== undefined ? friction : 0.5,
			color: color || '#8e44ad',
			enabled: true
		});
	},

	removeSolidBarrier: function(id) {
		this.solidBarriers = this.solidBarriers.filter(b => b.id !== id);
	},
	
	addFieldZone: function(x, y, w, h, fx, fy, color, name) {
		this.fieldZones.push({
			id: Date.now() + Math.random(),
			name: name || `Field ${this.fieldZones.length + 1}`,
			x: x,
			y: y,
			width: w,
			height: h,
			fx: fx || 0,
			fy: fy || 0.1,
			color: color || '#27ae60',
			enabled: true
		});
	},
	
	removeFieldZone: function(id) {
		this.fieldZones = this.fieldZones.filter(z => z.id !== id);
	},
	
	calculateFormulaField: function(x, y) {
		let totalEx = 0;
		let totalEy = 0;
		const G = this.G;
		const c = this.c;
		const Ke = this.Ke;
		const Km = this.Km;
		const t = this.tickCount * this.dt;
		
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

		return { Ex: totalEx, Ey: totalEy };
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
	
	computeExternalForces: function(body) {
		body.ax = body.startAx;
		body.ay = body.startAy;
		
		if (body.charge !== 0) {
			const field = this.calculateFormulaField(body.x, body.y);
			body.ax += (body.charge * field.Ex) / body.mass;
			body.ay += (body.charge * field.Ey) / body.mass;
		}
		
		for (const z of this.viscosityZones) {
			if (!z.enabled) continue;
			if (body.x >= z.x && body.x <= z.x + z.width &&
				body.y >= z.y && body.y <= z.y + z.height) {
				const fx = -body.vx * z.viscosity;
				const fy = -body.vy * z.viscosity;
				body.ax += fx / body.mass;
				body.ay += fy / body.mass;
			}
		}

		for (const z of this.fieldZones) {
			if (!z.enabled) continue;
			if (body.x >= z.x && body.x <= z.x + z.width &&
				body.y >= z.y && body.y <= z.y + z.height) {
				body.ax += z.fx;
				body.ay += z.fy;
			}
		}
	},
	
	computeBonds: function(bodies, dt) {
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
				const phase = bond.activeFreq * this.tickCount * dt * 0.1;
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
			
			const invM1 = b1.mass === -1 ? 0 : 1.0 / b1.mass;
			const invM2 = b2.mass === -1 ? 0 : 1.0 / b2.mass;
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
	
	applyImpulseResponse: function(b1, b2, nx, ny) {
		const r1x = b1.radius * nx;
		const r1y = b1.radius * ny;
		const r2x = -b2.radius * nx;
		const r2y = -b2.radius * ny;

		const v1x = b1.vx - b1.rotationSpeed * r1y;
		const v1y = b1.vy + b1.rotationSpeed * r1x;
		const v2x = b2.vx - b2.rotationSpeed * r2y;
		const v2y = b2.vy + b2.rotationSpeed * r2x;

		const rvx = v2x - v1x;
		const rvy = v2y - v1y;
		const vn = rvx * nx + rvy * ny;

		if (vn < 0) {
			const e = Math.min(b1.restitution, b2.restitution);
			const invM1 = b1.mass === -1 ? 0 : 1 / b1.mass;
			const invM2 = b2.mass === -1 ? 0 : 1 / b2.mass;
			const i1 = b1.mass === -1 ? 0 : 1 / (0.5 * b1.mass * b1.radius * b1.radius);
			const i2 = b2.mass === -1 ? 0 : 1 / (0.5 * b2.mass * b2.radius * b2.radius);

			const jnVal = -(1 + e) * vn / (invM1 + invM2);
			const jnx = jnVal * nx;
			const jny = jnVal * ny;

			const tx = -ny;
			const ty = nx;
			const vt = rvx * tx + rvy * ty;
			
			const massTan = invM1 + invM2 + (b1.radius * b1.radius * i1) + (b2.radius * b2.radius * i2);
			let jtVal = -vt / massTan;

			const avgFriction = (b1.friction + b2.friction) / 2;
			const maxFric = avgFriction * Math.abs(jnVal);
			
			if (jtVal > maxFric) jtVal = maxFric;
			else if (jtVal < -maxFric) jtVal = -maxFric;

			const jtx = jtVal * tx;
			const jty = jtVal * ty;

			const Jx = jnx + jtx;
			const Jy = jny + jty;

			if (b1.mass !== -1) {
				b1.vx += Jx * invM1;
				b1.vy += Jy * invM1;
				const torque = (r1x * jty - r1y * jtx);
				b1.rotationSpeed += torque * i1;
			}
			if (b2.mass !== -1) {
				b2.vx -= Jx * invM2;
				b2.vy -= Jy * invM2;
				const torque = (r2x * -jty - r2y * -jtx);
				b2.rotationSpeed += torque * i2;
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
				const dummyBarrierBody = {
					x: b.x - nx * (b.radius + overlap),
					y: b.y - ny * (b.radius + overlap),
					vx: 0, vy: 0,
					mass: -1, 
					radius: 0,
					rotationSpeed: 0,
					restitution: barrier.restitution,
					friction: barrier.friction
				};
				this.applyImpulseResponse(b, dummyBarrierBody, nx, ny);
			}
		}
	},
	
	resolvePeriodic: function(b, prevX, prevY) {
		let didWrap = false;
		for (const z of this.periodicZones) {
			if (!z.enabled) continue;

			const left = z.x;
			const right = z.x + z.width;
			const top = z.y;
			const bottom = z.y + z.height;
			const offset = (z.type === 'radius') ? b.radius : 0;
			
			const inY = (prevY >= top - offset && prevY <= bottom + offset);
			
			if (inY) {
				if (prevX <= right + offset && b.x > right + offset) {
					b.x -= z.width;
					didWrap = true;
				} else if (prevX >= left - offset && b.x < left - offset) {
					b.x += z.width;
					didWrap = true;
				}
			}
			
			const inX = (prevX >= left - offset && prevX <= right + offset);
			
			if (inX) {
				if (prevY <= bottom + offset && b.y > bottom + offset) {
					b.y -= z.height;
					didWrap = true;
				} else if (prevY >= top - offset && b.y < top - offset) {
					b.y += z.height;
					didWrap = true;
				}
			}
		}
		return didWrap;
	},
	
	resolveCollision: function(b1, b2, nx, ny, dist, overlap) {
		const avgYoung = (b1.youngModulus + b2.youngModulus) / 2;
		let fx = 0, fy = 0;
		
		if (avgYoung > 0) {
			const effectiveRadius = (b1.radius * b2.radius) / (b1.radius + b2.radius);
			const contactWidth = 2 * Math.sqrt(effectiveRadius * overlap);
			const penetrationForce = avgYoung * overlap * contactWidth;
			
			fx -= penetrationForce * nx;
			fy -= penetrationForce * ny;
		}

		const r1x = b1.radius * nx;
		const r1y = b1.radius * ny;
		const r2x = -b2.radius * nx;
		const r2y = -b2.radius * ny;

		const v1x = b1.vx - b1.rotationSpeed * r1y;
		const v1y = b1.vy + b1.rotationSpeed * r1x;
		const v2x = b2.vx - b2.rotationSpeed * r2y;
		const v2y = b2.vy + b2.rotationSpeed * r2x;

		const rvx = v2x - v1x;
		const rvy = v2y - v1y;
		
		const vn = rvx * nx + rvy * ny;

		if (vn < 0) {
			const e = Math.min(b1.restitution, b2.restitution);
			const invM1 = b1.mass === -1 ? 0 : 1 / b1.mass;
			const invM2 = b2.mass === -1 ? 0 : 1 / b2.mass;
			
			const jnVal = -(1 + e) * vn / (invM1 + invM2);
			const jnx = jnVal * nx;
			const jny = jnVal * ny;

			const tx = -ny;
			const ty = nx;
			const vt = rvx * tx + rvy * ty;

			const i1 = b1.mass === -1 ? 0 : 1 / (0.5 * b1.mass * b1.radius * b1.radius);
			const i2 = b2.mass === -1 ? 0 : 1 / (0.5 * b2.mass * b2.radius * b2.radius);
			
			const massTan = invM1 + invM2 + (b1.radius * b1.radius * i1) + (b2.radius * b2.radius * i2);
			let jtVal = -vt / massTan;

			const avgFriction = (b1.friction + b2.friction) / 2;
			const maxFric = avgFriction * Math.abs(jnVal);
			
			if (jtVal > maxFric) jtVal = maxFric;
			else if (jtVal < -maxFric) jtVal = -maxFric;

			const jtx = jtVal * tx;
			const jty = jtVal * ty;
			const Jx = jnx + jtx;
			const Jy = jny + jty;

			if (b1.mass !== -1) {
				b1.vx += Jx * invM1;
				b1.vy += Jy * invM1;
				const torque = (r1x * jty - r1y * jtx);
				b1.rotationSpeed += torque * i1;
			}
			if (b2.mass !== -1) {
				b2.vx -= Jx * invM2;
				b2.vy -= Jy * invM2;
				const torque = (r2x * -jty - r2y * -jtx);
				b2.rotationSpeed += torque * i2;
			}

			const correctionPercent = 0.8;
			const slop = 0.01;
			const totalInvMass = invM1 + invM2;
			if (totalInvMass > 0) {
				const correctionMag = Math.max(0, overlap - slop) / totalInvMass * correctionPercent;
				const cx = correctionMag * nx;
				const cy = correctionMag * ny;

				if (b1.mass !== -1) {
					b1.x -= cx * invM1;
					b1.y -= cy * invM1;
				}
				if (b2.mass !== -1) {
					b2.x += cx * invM2;
					b2.y += cy * invM2;
				}
			}
		}

		return { fx, fy };
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
					b1.ax += fx / b1.mass;
					b1.ay += fy / b1.mass;
				}
				if (b2.mass !== -1) {
					b2.ax -= fx / b2.mass;
					b2.ay -= fy / b2.mass;
				}
			}
		}
	},
	
	integrateBody: function(b, dt) {
		if (b.mass === -1) {
			b.vx = 0; b.vy = 0; b.ax = 0; b.ay = 0;
			return false;
		}

		b.vx += b.ax * dt;
		b.vy += b.ay * dt;

		const c2 = this.c * this.c;
		const vSq = b.vx*b.vx + b.vy*b.vy;
		if (vSq > c2) {
			const v = Math.sqrt(vSq);
			const ratio = (this.c * 0.999) / v;
			b.vx *= ratio;
			b.vy *= ratio;
		}

		const prevX = b.x;
		const prevY = b.y;

		b.x += b.vx * dt;
		b.y += b.vy * dt;
		
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
	
	update: function(force = false) {
		if (this.paused && !force) return;

		const bodies = this.bodies;
		let count = bodies.length;
		const dt = this.dt;

		this.tickCount++;

		for (let i = 0; i < count; i++) {
			if (bodies[i].mass === -1) {
				bodies[i].ax = 0; bodies[i].ay = 0; bodies[i].vx = 0; bodies[i].vy = 0;
				continue;
			}
			this.computeExternalForces(bodies[i]);
		}

		this.computeBonds(bodies, dt);
		this.computeInteractions(bodies);
	
		for (let i = 0; i < count; i++) {
			const b = bodies[i];
			
			if (b.lifetime > 0) {
				b.lifetime--;
			}
			
			if (b.lifetime === 0) {
				bodies.splice(i, 1);
				count--; i--;
				continue;
			}

			this.integrateBody(b, dt);

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
		const tempBodies = JSON.parse(JSON.stringify(this.bodies));
		if (!tempBodies[bodyIndex]) return [];
		
		const predictedPath = [];
		const count = tempBodies.length;
		const dt = stepDt;

		for (let step = 0; step < numSteps; step++) {
			for (let i = 0; i < count; i++) {
				if (tempBodies[i].mass === -1) {
					tempBodies[i].ax = 0;
					tempBodies[i].ay = 0;
					continue;
				}
				this.computeExternalForces(tempBodies[i]);
			}

			this.computeBonds(tempBodies, dt);
			this.computeInteractions(tempBodies);

			let targetJumped = false;

			for (let i = 0; i < count; i++) {
				const b = tempBodies[i];
				const wrapped = this.integrateBody(b, dt);

				if (i === bodyIndex && wrapped) {
					targetJumped = true;
				}
			}
			
			const targetBody = tempBodies[bodyIndex];
			predictedPath.push({ x: targetBody.x, y: targetBody.y, jump: targetJumped });
		}

		return predictedPath;
	},
	
	zeroVelocities: function() {
		for (let b of this.bodies) {
			b.vx = 0;
			b.vy = 0;
			b.path = [];
		}
	},

	reverseTime: function() {
		for (let b of this.bodies) {
			b.vx = -b.vx;
			b.vy = -b.vy;
			b.path = [];
		}
	},
	
	cullDistant: function(minX, maxX, minY, maxY) {
		this.bodies = this.bodies.filter(b => {
			return b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY;
		});
	},

	snapToGrid: function(gridSize) {
		for (let b of this.bodies) {
			b.x = Math.round(b.x / gridSize) * gridSize;
			b.y = Math.round(b.y / gridSize) * gridSize;
			b.path = [];
		}
	},

	killRotation: function() {
		for (let b of this.bodies) {
			b.rotationSpeed = 0;
		}
	},

	scatterPositions: function(minX, minY, width, height) {
		for (let b of this.bodies) {
			b.x = minX + Math.random() * width;
			b.y = minY + Math.random() * height;
			b.path = [];
		}
	},

	equalizeMasses: function() {
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
			}
		}
	},
};

window.App.sim = Simulation;
Simulation.init();