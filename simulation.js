window.App = {
	sim: null,
	render: null,
	ui: null
};

class Body {
	constructor(mass, x, y, vx, vy, color, name, startAx = 0, startAy = 0, 
				charge = 0, magMoment = 0, restitution = 1.0, 
				lifetime = -1, temperature = 0, rotationSpeed = 0, youngModulus = 0) {
		this.mass = mass;
		this.x = x;
		this.y = y;
		this.vx = vx;
		this.vy = vy;
		this.ax = 0;
		this.ay = 0;
		this.startAx = startAx;
		this.startAy = startAy;
		this.radius = Math.max(2, Math.log(mass) * 2);
		this.color = color || `hsl(${Math.random() * 360}, 70%, 60%)`;
		this.path = [];
		this.name = name || "Body";
		
		this.charge = charge;
		this.magMoment = magMoment;
		this.restitution = restitution;
		this.lifetime = lifetime;
		this.temperature = temperature;
		this.rotationSpeed = rotationSpeed;
		this.youngModulus = youngModulus;
		this.angle = 0;
	}
};

const Simulation = {
	bodies: [],
	periodicZones: [],
	G: 0.5,
	c: 50.0,
	Ke: 10.0,
	Km: 5.0,
	dt: 0.5,
	paused: true,
	maxRadius: 0,
	
	enableGravity: true,
	enableElectricity: false,
	enableMagnetism: false,
	enableCollision: false,
	
	formulaFields: [],
	
	showTrails: true,
	trailLength: 100,
	trailStep: 2,
	tickCount: 0,

	init: function() {
		this.reset();
	},

	reset: function() {
		this.bodies = [];
		this.periodicZones = [];
	},

	addBody: function(m, x, y, vx, vy, col, name, ax = 0, ay = 0,
					 charge = 0, magMoment = 0, restitution = 1.0, 
					 lifetime = -1, temperature = 0, rotationSpeed = 0, youngModulus = 0) {
		const newName = name || `Body ${this.bodies.length + 1}`;
		const newBody = new Body(m, x, y, vx, vy, col, newName, ax, ay,
								  charge, magMoment, restitution, 
								  lifetime, temperature, rotationSpeed, youngModulus);
		newBody.startAx = ax;
		newBody.startAy = ay;
		this.bodies.push(newBody);
	},
	
	removeBody: function(index) {
		if (index >= 0 && index < this.bodies.length) {
			this.bodies.splice(index, 1);
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
			type: type || 'center'
		});
	},

	removePeriodicZone: function(id) {
		this.periodicZones = this.periodicZones.filter(z => z.id !== id);
	},
	
	createSolarSystem: function() {
		this.bodies = [];
		const starMass = 25000;
		this.addBody(starMass, 0.01, 0.01, 0, 0, '#ffeeb0', 'Star', 0, 0, 0, 0, 1, -1, 6000, 0.02);

		const count = 8;
		let dist = 300;

		for(let i=0; i<count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const isGasGiant = i > 3;
			const mass = isGasGiant ? Math.random() * 150 + 80 : Math.random() * 20 + 5;
			const radiusGap = isGasGiant ? 220 : 100;
			
			dist += radiusGap + Math.random() * 40;
			
			const speed = Math.sqrt((this.G * starMass) / dist);
			const x = Math.cos(angle) * dist;
			const y = Math.sin(angle) * dist;
			const vx = -Math.sin(angle) * speed;
			const vy = Math.cos(angle) * speed;
			
			let color;
			if (i === 2) color = '#4da6ff'; 
			else if (i === 3) color = '#c95b42';
			else if (isGasGiant) color = `hsl(${Math.random() * 50 + 20}, 70%, 60%)`;
			else color = `hsl(${Math.random() * 40}, 30%, 60%)`;

			const name = `Planet ${i+1}`;
			this.addBody(mass, x, y, vx, vy, color, name);

			if (mass > 60) {
				const moons = Math.floor(Math.random() * 4) + 1;
				for (let m = 0; m < moons; m++) {
					const mDist = 25 + m * 12 + Math.random() * 5 + Math.sqrt(mass);
					const mSpeed = Math.sqrt((this.G * mass) / mDist);
					const mAngle = Math.random() * Math.PI * 2;
					const clockwise = Math.random() > 0.5 ? 1 : -1;
					
					const mx = x + Math.cos(mAngle) * mDist;
					const my = y + Math.sin(mAngle) * mDist;
					
					const mvx = vx - Math.sin(mAngle) * mSpeed * clockwise;
					const mvy = vy + Math.cos(mAngle) * mSpeed * clockwise;
					
					this.addBody(Math.random() * 1.5 + 0.5, mx, my, mvx, mvy, '#d1d1d1', `${name}-m${m+1}`);
				}
			}
		}
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
		
		const sanitized = formula
			.replace(/sin/g, 'Math.sin')
			.replace(/cos/g, 'Math.cos')
			.replace(/tan/g, 'Math.tan')
			.replace(/log/g, 'Math.log')
			.replace(/pow/g, 'Math.pow')
			.replace(/abs/g, 'Math.abs')
			.replace(/sqrt/g, 'Math.sqrt')
			.replace(/PI/g, 'vars.PI') 
			.replace(/E/g, 'vars.E'); 
		
		const allowedVars = ['x', 'y', 'G', 'c', 'Ke', 'Km', 't', 'PI', 'E']; 
		
		try {
			const code = `
				"use strict";
				const { x, y, G, c, Ke, Km, t, PI, E } = vars;
				return (${sanitized});
			`;
			const func = new Function('vars', code);

			const testVars = { x: 1, y: 1, G: this.G, c: this.c, Ke: this.Ke, Km: this.Km, t: 0, PI: Math.PI, E: Math.E };
			const result = func(testVars);
			if (typeof result !== 'number' || isNaN(result)) {
				return { func: () => 0, error: "Formula must return a number." };
			}
			
			return { func: func, error: null };

		} catch (e) {
			return { func: () => 0, error: e.message };
		}
	},
	
	update: function() {
		if (this.paused) return;

		const bodies = this.bodies;
		let count = bodies.length;
		const c2 = this.c * this.c;
		const dt = this.dt;

		this.tickCount++;

		for (let i = 0; i < count; i++) {
			bodies[i].ax = bodies[i].startAx;
			bodies[i].ay = bodies[i].startAy;
			
			if (bodies[i].charge !== 0) {
				const field = this.calculateFormulaField(bodies[i].x, bodies[i].y);
				bodies[i].ax += (bodies[i].charge * field.Ex) / bodies[i].mass;
				bodies[i].ay += (bodies[i].charge * field.Ey) / bodies[i].mass;
			}
		}

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
					f_total += (this.G * b1.mass * b2.mass) / distSq;
				}

				if (this.enableElectricity && b1.charge !== 0 && b2.charge !== 0) {
					const f_elec = -(this.Ke * b1.charge * b2.charge) / distSq;
					f_total += f_elec; 
				}

				if (this.enableMagnetism && b1.magMoment !== 0 && b2.magMoment !== 0) {
					const f_mag = -(this.Km * b1.magMoment * b2.magMoment) / (distSq * dist);
					f_total += f_mag;
				}

				let fx = f_total * nx;
				let fy = f_total * ny;

				if (this.enableCollision && dist < minDist) {
					const overlap = minDist - dist;
					
					const avgYoung = (b1.youngModulus + b2.youngModulus) / 2;
					if (avgYoung > 0) {
						const penetrationForce = avgYoung * overlap * 0.05 * Math.min(b1.mass, b2.mass);
						fx -= penetrationForce * nx;
						fy -= penetrationForce * ny;
					}

					const dvx = b2.vx - b1.vx;
					const dvy = b2.vy - b1.vy;
					const vn = dvx * nx + dvy * ny;

					if (vn < 0) {
						const e = Math.min(b1.restitution, b2.restitution);
						
						const invMass1 = 1 / b1.mass;
						const invMass2 = 1 / b2.mass;
						
						const j_numerator = -(1 + e) * vn;
						const j_denominator = invMass1 + invMass2;
						
						const j_normal = j_numerator / j_denominator;

						const f_impulse = j_normal / dt; 
						fx -= f_impulse * nx;
						fy -= f_impulse * ny;
						
						const tx = -ny;
						const ty = nx;
						
						const vt1 = (b1.vx * tx + b1.vy * ty) + b1.rotationSpeed * b1.radius;
						const vt2 = (b2.vx * tx + b2.vy * ty) - b2.rotationSpeed * b2.radius;
						const relVt = vt2 - vt1;

						const frictionCoeff = 0.5; 
						
						const j_tangent = -relVt / (invMass1 + invMass2);
						
						const j_friction_max = Math.abs(j_normal) * frictionCoeff;
						const j_final_tangent = Math.max(-j_friction_max, Math.min(j_tangent, j_friction_max));
						
						const f_friction = j_final_tangent / dt;

						fx += f_friction * tx;
						fy += f_friction * ty;
						
						const invInertia1 = 2 / (b1.mass * b1.radius * b1.radius); 
						const invInertia2 = 2 / (b2.mass * b2.radius * b2.radius);
						
						b1.rotationSpeed += (j_final_tangent * b1.radius * invInertia1);
						b2.rotationSpeed -= (j_final_tangent * b2.radius * invInertia2);
					}
				}

				b1.ax += fx / b1.mass;
				b1.ay += fy / b1.mass;
				b2.ax -= fx / b2.mass;
				b2.ay -= fy / b2.mass;
			}
		}
	
		for (let i = 0; i < count; i++) {
			const b = bodies[i];
			
			if (b.lifetime > 0) {
				b.lifetime--;
			}
			
			if (b.lifetime === 0) {
				bodies.splice(i, 1);
				count--;
				i--;
				continue;
			}

			b.vx += b.ax * dt;
			b.vy += b.ay * dt;

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
			
			for (const z of this.periodicZones) {
				const left = z.x;
				const right = z.x + z.width;
				const top = z.y;
				const bottom = z.y + z.height;
				const offset = (z.type === 'radius') ? b.radius : 0;
				
				if (b.y + offset >= top && b.y - offset <= bottom) {
					const wasInX = (prevX >= left && prevX <= right);
					
					if (wasInX) {
						if (b.vx > 0 && b.x + offset >= right) {
							b.x -= z.width;
							b.path = [];
						} else if (b.vx < 0 && b.x - offset <= left) {
							b.x += z.width;
							b.path = [];
						}
					} else {
						if (b.vx > 0 && b.x + offset >= left && prevX + offset < left) {
							b.x = right + offset + 0.01;
							b.path = [];
						} else if (b.vx < 0 && b.x - offset <= right && prevX - offset > right) {
							b.x = left - offset - 0.01;
							b.path = [];
						}
					}
				}
				
				if (b.x + offset >= left && b.x - offset <= right) {
					const wasInY = (prevY >= top && prevY <= bottom);
					
					if (wasInY) {
						if (b.vy > 0 && b.y + offset >= bottom) {
							b.y -= z.height;
							b.path = [];
						} else if (b.vy < 0 && b.y - offset <= top) {
							b.y += z.height;
							b.path = [];
						}
					} else {
						if (b.vy > 0 && b.y + offset >= top && prevY + offset < top) {
							b.y = bottom + offset + 0.01;
							b.path = [];
						} else if (b.vy < 0 && b.y - offset <= bottom && prevY - offset > bottom) {
							b.y = top - offset - 0.01;
							b.path = [];
						}
					}
				}
			}
			
			if (b.rotationSpeed !== 0) {
				if (typeof b.angle === 'undefined') {
					b.angle = 0;
				}
				b.angle += b.rotationSpeed * dt;
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
		const tempBodies = JSON.parse(JSON.stringify(this.bodies));
		if (!tempBodies[bodyIndex]) return [];
		const c2 = this.c * this.c;

		const predictedPath = [];
		const count = tempBodies.length;
		const dt = stepDt;

		for (let step = 0; step < numSteps; step++) {
			for (let i = 0; i < count; i++) {
				tempBodies[i].ax = tempBodies[i].startAx;
				tempBodies[i].ay = tempBodies[i].startAy;
				
				if (tempBodies[i].charge !== 0) {
					const field = this.calculateFormulaField(tempBodies[i].x, tempBodies[i].y);
					tempBodies[i].ax += (tempBodies[i].charge * field.Ex) / tempBodies[i].mass;
					tempBodies[i].ay += (tempBodies[i].charge * field.Ey) / tempBodies[i].mass;
				}
			}

			for (let i = 0; i < count; i++) {
				for (let j = i + 1; j < count; j++) {
					const b1 = tempBodies[i];
					const b2 = tempBodies[j];

					const dx = b2.x - b1.x;
					const dy = b2.y - b1.y;
					const distSq = dx*dx + dy*dy;
					if (distSq === 0) continue;
					const dist = Math.sqrt(distSq);
					const minDist = b1.radius + b2.radius;

					const nx = dx / dist;
					const ny = dy / dist;
					
					let f_total = 0;

					if (this.enableGravity) {
						f_total += (this.G * b1.mass * b2.mass) / distSq;
					}

					if (this.enableElectricity && b1.charge !== 0 && b2.charge !== 0) {
						const f_elec = -(this.Ke * b1.charge * b2.charge) / distSq;
						f_total += f_elec; 
					}

					if (this.enableMagnetism && b1.magMoment !== 0 && b2.magMoment !== 0) {
						const f_mag = -(this.Km * b1.magMoment * b2.magMoment) / (distSq * dist);
						f_total += f_mag;
					}

					let fx = f_total * nx;
					let fy = f_total * ny;
					
					if (this.enableCollision && dist < minDist) {
						const overlap = minDist - dist;
						const avgYoung = (b1.youngModulus + b2.youngModulus) / 2;
						if (avgYoung > 0) {
							const penetrationForce = avgYoung * overlap * 0.05 * Math.min(b1.mass, b2.mass);
							fx -= penetrationForce * nx;
							fy -= penetrationForce * ny;
						}
						
						const dvx = b2.vx - b1.vx;
						const dvy = b2.vy - b1.vy;
						const vn = dvx * nx + dvy * ny; 

						if (vn < 0) { 
							const e = Math.min(b1.restitution, b2.restitution);
							const invMass1 = 1 / b1.mass;
							const invMass2 = 1 / b2.mass;
							const j_numerator = -(1 + e) * vn;
							const j_denominator = invMass1 + invMass2;
							const j_normal = j_numerator / j_denominator; 
							const f_impulse = j_normal / dt; 
							fx -= f_impulse * nx;
							fy -= f_impulse * ny;
							
							const tx = -ny;
							const ty = nx;
							const vt1 = (b1.vx * tx + b1.vy * ty) + b1.rotationSpeed * b1.radius;
							const vt2 = (b2.vx * tx + b2.vy * ty) - b2.rotationSpeed * b2.radius;
							const relVt = vt2 - vt1;
							const frictionCoeff = 0.5; 
							const j_tangent = -relVt / (invMass1 + invMass2);
							const j_friction_max = Math.abs(j_normal) * frictionCoeff;
							const j_final_tangent = Math.max(-j_friction_max, Math.min(j_tangent, j_friction_max));
							const f_friction = j_final_tangent / dt;

							fx += f_friction * tx;
							fy += f_friction * ty;
							
							const invInertia1 = 2 / (b1.mass * b1.radius * b1.radius); 
							const invInertia2 = 2 / (b2.mass * b2.radius * b2.radius);
							
							b1.rotationSpeed += (j_final_tangent * b1.radius * invInertia1);
							b2.rotationSpeed -= (j_final_tangent * b2.radius * invInertia2);
						}
					}

					b1.ax += fx / b1.mass;
					b1.ay += fy / b1.mass;
					b2.ax -= fx / b2.mass;
					b2.ay -= fy / b2.mass;
				}
			}

			let targetJumped = false;

			for (let i = 0; i < count; i++) {
				const b = tempBodies[i];
				b.vx += b.ax * dt;
				b.vy += b.ay * dt;
				
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
				
				if (b.rotationSpeed !== 0 && typeof b.angle === 'undefined') {
					b.angle = 0;
				}
				if (typeof b.angle !== 'undefined') {
					b.angle += b.rotationSpeed * dt;
				}

				let didWrap = false;
				for (const z of this.periodicZones) {
					const left = z.x;
					const right = z.x + z.width;
					const top = z.y;
					const bottom = z.y + z.height;
					const offset = (z.type === 'radius') ? b.radius : 0;
					
					if (b.y + offset >= top && b.y - offset <= bottom) {
						const wasInX = (prevX >= left && prevX <= right);
						
						if (wasInX) {
							if (b.vx > 0 && b.x + offset >= right) {
								b.x -= z.width;
								didWrap = true;
							} else if (b.vx < 0 && b.x - offset <= left) {
								b.x += z.width;
								didWrap = true;
							}
						} else {
							if (b.vx > 0 && b.x + offset >= left && prevX + offset < left) {
								b.x = right + offset + 0.01;
								didWrap = true;
							} else if (b.vx < 0 && b.x - offset <= right && prevX - offset > right) {
								b.x = left - offset - 0.01;
								didWrap = true;
							}
						}
					}
					
					if (b.x + offset >= left && b.x - offset <= right) {
						const wasInY = (prevY >= top && prevY <= bottom);
						
						if (wasInY) {
							if (b.vy > 0 && b.y + offset >= bottom) {
								b.y -= z.height;
								didWrap = true;
							} else if (b.vy < 0 && b.y - offset <= top) {
								b.y += z.height;
								didWrap = true;
							}
						} else {
							if (b.vy > 0 && b.y + offset >= top && prevY + offset < top) {
								b.y = bottom + offset + 0.01;
								didWrap = true;
							} else if (b.vy < 0 && b.y - offset <= bottom && prevY - offset > bottom) {
								b.y = top - offset - 0.01;
								didWrap = true;
							}
						}
					}
				}

				if (i === bodyIndex && didWrap) {
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
};

window.App.sim = Simulation;
Simulation.init();