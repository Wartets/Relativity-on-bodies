window.App = {
	sim: null,
	render: null,
	ui: null
};

class Body {
	constructor(mass, x, y, vx, vy, color, name, ax = 0, ay = 0, 
				charge = 0, magMoment = 0, restitution = 1.0, 
				lifetime = -1, temperature = 0, rotationSpeed = 0, youngModulus = 0) {
		this.mass = mass;
		this.x = x;
		this.y = y;
		this.vx = vx;
		this.vy = vy;
		this.ax = ax;
		this.ay = ay;
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
	}
};

const Simulation = {
	bodies: [],
	G: 0.5,
	c: 50.0,
	Ke: 10.0,
	Km: 5.0,
	dt: 1.0,
	paused: false,
	maxRadius: 0,
	
	enableGravity: true,
	enableElectricity: false,
	enableMagnetism: false,
	enableCollision: false,
	
	showTrails: true,
	trailLength: 100,
	trailStep: 2,
	tickCount: 0,

	init: function() {
		this.reset();
	},

	reset: function() {
		this.bodies = [];
		this.addBody(2000, 0, 0, 0, 0, `hsl(${Math.random() * 360}, 70%, 60%)`);
	},

	addBody: function(m, x, y, vx, vy, col, name, ax = 0, ay = 0,
					 charge = 0, magMoment = 0, restitution = 1.0, 
					 lifetime = -1, temperature = 0, rotationSpeed = 0, youngModulus = 0) {
		const newName = name || `Body ${this.bodies.length + 1}`;
		this.bodies.push(new Body(m, x, y, vx, vy, col, newName, ax, ay,
								  charge, magMoment, restitution, 
								  lifetime, temperature, rotationSpeed, youngModulus));
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

	update: function() {
		if (this.paused) return;

		const bodies = this.bodies;
		let count = bodies.length;
		const c2 = this.c * this.c;
		const dt = this.dt;

		this.tickCount++;

		for (let i = 0; i < count; i++) {
			bodies[i].ax = 0;
			bodies[i].ay = 0;
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

			b.x += b.vx * dt;
			b.y += b.vy * dt;
			
			// Mise à jour de l'angle de rotation
			if (b.rotationSpeed !== 0) {
				if (typeof b.angle === 'undefined') {
					b.angle = 0;
				}
				b.angle += b.rotationSpeed * dt;
			}

			if (this.showTrails && (this.tickCount % this.trailStep === 0)) {
				b.path.push({x: b.x, y: b.y});
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

		for (let step = 0; step < numSteps; step++) {
			for (let i = 0; i < tempBodies.length; i++) {
				tempBodies[i].ax = 0;
				tempBodies[i].ay = 0;
			}

			for (let i = 0; i < tempBodies.length; i++) {
				for (let j = i + 1; j < tempBodies.length; j++) {
					const b1 = tempBodies[i];
					const b2 = tempBodies[j];

					const dx = b2.x - b1.x;
					const dy = b2.y - b1.y;
					const distSq = dx*dx + dy*dy;
					if (distSq === 0) continue;
					const dist = Math.sqrt(distSq);

					if (this.enableCollision && dist < (b1.radius + b2.radius) * 0.5) continue;

					let f_total = 0;

					if (this.enableGravity) {
						f_total += (this.G * b1.mass * b2.mass) / distSq;
					}

					if (this.enableElectricity && b1.charge !== 0 && b2.charge !== 0) {
						f_total -= (this.Ke * b1.charge * b2.charge) / distSq;
					}

					if (this.enableMagnetism && b1.magMoment !== 0 && b2.magMoment !== 0) {
						f_total -= (this.Km * b1.magMoment * b2.magMoment) / (distSq * dist);
					}

					const fx = f_total * (dx / dist);
					const fy = f_total * (dy / dist);

					b1.ax += fx / b1.mass;
					b1.ay += fy / b1.mass;
					b2.ax -= fx / b2.mass;
					b2.ay -= fy / b2.mass;
				}
			}

			for (let i = 0; i < tempBodies.length; i++) {
				const b = tempBodies[i];
				b.vx += b.ax * stepDt;
				b.vy += b.ay * stepDt;
				
				const vSq = b.vx*b.vx + b.vy*b.vy;
				if (vSq > c2) {
					const v = Math.sqrt(vSq);
					const ratio = (this.c * 0.999) / v;
					b.vx *= ratio;
					b.vy *= ratio;
				}
				
				b.x += b.vx * stepDt;
				b.y += b.vy * stepDt;
			}
			
			const targetBody = tempBodies[bodyIndex];
			predictedPath.push({ x: targetBody.x, y: targetBody.y });
		}

		return predictedPath;
	},
};

window.App.sim = Simulation;
Simulation.init();