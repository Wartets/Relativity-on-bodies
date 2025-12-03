const bondPresets = {
	"spring": { stiffness: 0.8, damping: 0.05, type: 'spring', name: 'Spring', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
	"rope": { stiffness: 8.0, damping: 0.8, type: 'rope', name: 'Rope', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
	"rod": { stiffness: 50.0, damping: 1.0, type: 'spring', name: 'Rod', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
	"chain": { stiffness: 15.0, damping: 0.5, type: 'rope', name: 'Chain', nonLinearity: 1.2, breakTension: -1, activeAmp: 0, activeFreq: 0 },
	"muscle": { stiffness: 2.0, damping: 0.2, type: 'spring', name: 'Muscle', nonLinearity: 1, breakTension: -1, activeAmp: 0.3, activeFreq: 2.0 },
	"weak": { stiffness: 1.0, damping: 0.1, type: 'spring', name: 'Weak Link', nonLinearity: 1, breakTension: 30, activeAmp: 0, activeFreq: 0 }
};

(function() {
	const rnd = (min, max) => min + Math.random() * (max - min);
	const rndInt = (min, max) => Math.floor(rnd(min, max));
	const logRad = (m) => Math.max(2, Math.log(m) * 2);

		window.App.objectPresets = {
		"Star: Red Giant": (S) => {
			const m = rnd(60000, 90000) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: logRad(m) * 3,
				charge: rnd(-5, 5),
				magMoment: rnd(50, 150),
				rotationSpeed: rnd(0.001, 0.005),
				friction: 0.5,
				temperature: rndInt(3000, 4500),
				specificHeat: 20000,
				absorptionFactor: 0.9,
				criticalTemp: 100000,
				transitionFactor: 0.01,
				e_base: 0.2,
				e_min: 0.1,
				Y_base: 100,
				Y_min: 10,
				color: `hsl(${rndInt(0, 20)}, 100%, 60%)`
			};
		},
		"Star: Yellow Dwarf (Sun)": (S) => {
			const m = rnd(20000, 30000) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: logRad(m),
				charge: 0,
				magMoment: rnd(10, 50),
				rotationSpeed: rnd(0.01, 0.03),
				friction: 0.5,
				temperature: rndInt(5500, 6000),
				specificHeat: 15000,
				absorptionFactor: 0.9,
				criticalTemp: 200000,
				transitionFactor: 0.01,
				e_base: 0.5,
				e_min: 0.1,
				Y_base: 1000,
				Y_min: 10,
				color: `hsl(${rndInt(45, 60)}, 100%, 70%)`
			};
		},
		"Star: White Dwarf": (S) => {
			const m = rnd(15000, 25000) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: logRad(m) * 0.5,
				charge: rnd(0, 10),
				magMoment: rnd(100, 300),
				rotationSpeed: rnd(0.1, 0.5),
				friction: 0.4,
				temperature: rndInt(15000, 30000),
				specificHeat: 1000,
				absorptionFactor: 0.7,
				criticalTemp: 500000,
				transitionFactor: 0.001,
				e_base: 0.9,
				e_min: 0.5,
				Y_base: 50000,
				Y_min: 10000,
				color: `hsl(${rndInt(190, 220)}, 50%, 90%)`
			};
		},
		"Star: Neutron": (S) => {
			const m = rnd(35000, 50000) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: 4,
				charge: rnd(50, 100) / Math.sqrt(S.units.sim.Ke),
				magMoment: rnd(2000, 5000) / Math.sqrt(S.Km),
				rotationSpeed: rnd(2.0, 5.0),
				friction: 0.1,
				temperature: rndInt(500000, 1000000),
				specificHeat: 100,
				absorptionFactor: 0.8,
				criticalTemp: 1e9,
				transitionFactor: 0.001,
				e_base: 0.95,
				e_min: 0.9,
				Y_base: 200000,
				Y_min: 150000,
				color: '#ffffff'
			};
		},
		"Black Hole (Simulated)": (S) => {
			const m = rnd(150000, 300000) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: 2,
				charge: 0,
				magMoment: 0,
				rotationSpeed: rnd(1.0, 10.0),
				friction: 0,
				temperature: 0,
				specificHeat: 1000,
				absorptionFactor: 1.0,
				criticalTemp: 1e12,
				transitionFactor: 0.001,
				e_base: 0,
				e_min: 0,
				Y_base: 1000000,
				Y_min: 1000000,
				color: '#000000'
			};
		},
		"Planet: Gas Giant": (S) => {
			const m = rnd(1000, 2500) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: logRad(m) * 1.2,
				charge: rnd(-2, 2),
				magMoment: rnd(20, 80),
				rotationSpeed: rnd(0.05, 0.15),
				friction: 0.2,
				temperature: rndInt(100, 160),
				specificHeat: 14000,
				absorptionFactor: 0.5,
				criticalTemp: 100,
				transitionFactor: 0.1,
				e_base: 0.7,
				e_min: 0.2,
				Y_base: 100,
				Y_min: 0,
				color: `hsl(${rndInt(25, 45)}, 80%, ${rndInt(50, 70)}%)`
			};
		},
		"Planet: Rocky (Habitable)": (S) => {
			const m = rnd(80, 150) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: logRad(m),
				charge: 0,
				magMoment: rnd(2, 10),
				rotationSpeed: rnd(0.1, 0.3),
				friction: 0.8,
				temperature: rndInt(250, 320),
				specificHeat: 800,
				absorptionFactor: 0.7,
				criticalTemp: 1500,
				transitionFactor: 0.01,
				e_base: 0.5,
				e_min: 0.1,
				Y_base: 3000,
				Y_min: 100,
				color: `hsl(${rndInt(100, 140)}, 60%, 50%)`
			};
		},
		"Planet: Molten": (S) => {
			const m = rnd(60, 120) / (S.units.sim.G * 2);
			return {
				mass: m,
				radius: logRad(m),
				charge: rnd(0, 5),
				magMoment: rnd(1, 5),
				rotationSpeed: rnd(0.05, 0.1),
				friction: 0.6,
				temperature: rndInt(800, 1500),
				specificHeat: 1000,
				absorptionFactor: 0.8,
				criticalTemp: 1500,
				transitionFactor: 0.01,
				e_base: 0.3,
				e_min: 0.1,
				Y_base: 1000,
				Y_min: 100,
				color: `hsl(${rndInt(0, 20)}, 80%, 40%)`
			};
		},
		"Particle: Electron": (S) => ({
			mass: 0.5,
			radius: 2,
			charge: -20 / Math.sqrt(S.units.sim.Ke),
			magMoment: 5 / Math.sqrt(S.Km),
			rotationSpeed: 8.0,
			friction: 0.0,
			temperature: 0,
			specificHeat: 1,
			absorptionFactor: 0.5,
			criticalTemp: 1e9,
			transitionFactor: 0.01,
			e_base: 1.0,
			e_min: 1.0,
			Y_base: 0,
			Y_min: 0,
			color: '#ffff00'
		}),
		"Particle: Proton": (S) => ({
			mass: 50,
			radius: 4,
			charge: 20 / Math.sqrt(S.units.sim.Ke),
			magMoment: 2 / Math.sqrt(S.Km),
			rotationSpeed: 1.0,
			friction: 0.1,
			temperature: 0,
			specificHeat: 1,
			absorptionFactor: 0.5,
			criticalTemp: 1e9,
			transitionFactor: 0.01,
			e_base: 1.0,
			e_min: 1.0,
			Y_base: 0,
			Y_min: 0,
			color: '#ff3333'
		}),
		"Particle: Neutron": (S) => ({
			mass: 50.1,
			radius: 4,
			charge: 0,
			magMoment: -3 / Math.sqrt(S.Km),
			rotationSpeed: 1.0,
			friction: 0.1,
			temperature: 0,
			specificHeat: 1,
			absorptionFactor: 0.5,
			criticalTemp: 1e9,
			transitionFactor: 0.01,
			e_base: 1.0,
			e_min: 1.0,
			Y_base: 0,
			Y_min: 0,
			color: '#aaaaaa'
		}),
		"Ball: Billiard": (S) => ({
			mass: 10,
			radius: 5,
			charge: 0,
			magMoment: 0,
			rotationSpeed: 0,
			friction: 0.2,
			temperature: 293,
			specificHeat: 1500,
			absorptionFactor: 0.2,
			criticalTemp: 450,
			transitionFactor: 0.05,
			e_base: 0.98,
			e_min: 0.2,
			Y_base: 15000,
			Y_min: 100,
			color: `hsl(${rndInt(0, 360)}, 80%, 50%)`
		}),
		"Ball: Pétanque": (S) => ({
			mass: 40,
			radius: 5,
			charge: 0,
			magMoment: rnd(0, 0.5),
			rotationSpeed: 0,
			friction: 0.9,
			temperature: 293,
			specificHeat: 450,
			absorptionFactor: 0.4,
			criticalTemp: 1800,
			transitionFactor: 0.005,
			e_base: 0.25,
			e_min: 0.1,
			Y_base: 50000,
			Y_min: 500,
			color: '#71706e'
		}),
		"Ball: Tennis": (S) => ({
			mass: 3,
			radius: 4,
			charge: rnd(0, 2),
			magMoment: 0,
			rotationSpeed: 0,
			friction: 0.7,
			temperature: 293,
			specificHeat: 2000,
			absorptionFactor: 0.6,
			criticalTemp: 450,
			transitionFactor: 0.02,
			e_base: 0.85,
			e_min: 0.1,
			Y_base: 2000,
			Y_min: 50,
			color: '#ccff00'
		}),
		"Object: Soap Bubble": (S) => ({
			mass: 0.1,
			radius: 10,
			charge: rnd(1, 3),
			magMoment: 0,
			rotationSpeed: rnd(0.1, 0.5),
			friction: 0.05,
			temperature: 288,
			specificHeat: 4200,
			absorptionFactor: 0.1,
			criticalTemp: 373,
			transitionFactor: 0.1,
			e_base: 0.8,
			e_min: 0.05,
			Y_base: 10,
			Y_min: 0,
			color: 'rgba(200, 240, 255, 0.6)'
		}),
		"Object: Magnet": (S) => ({
			mass: 25,
			radius: 6,
			charge: 0,
			magMoment: rnd(80, 120) / Math.sqrt(S.Km),
			rotationSpeed: 0,
			friction: 0.5,
			temperature: 293,
			specificHeat: 450,
			absorptionFactor: 0.5,
			criticalTemp: 1043,
			transitionFactor: 0.01,
			e_base: 0.5,
			e_min: 0.1,
			Y_base: 10000,
			Y_min: 200,
			color: '#ff0000'
		})
	};

	window.App.presets = [
		{
			name: "Solar System",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.periodicZones = [];
				sim.enableGravity = true;
				sim.enableElectricity = false;
				sim.enableCollision = true;

				const starMass = 25000;
				const starRadius = Math.log(starMass) * 2;
				sim.addBody({
					mass: starMass, x: 0, y: 0, vx: 0, vy: 0, radius: starRadius, 
					color: '#ffeeb0', name: 'Sun', friction: 0.5, rotationSpeed: 0.02,
					temperature: 6000, e_base: 1.0, Y_base: 5000, specificHeat: 10000, 
					absorptionFactor: 0.9, criticalTemp: 1000000, transitionFactor: 0.001, 
					e_min: 0.2, Y_min: 100
				});

				const count = 8;
				let dist = 300;

				for(let i=0; i<count; i++) {
					const angle = Math.random() * Math.PI * 2;
					const isGasGiant = i > 3;
					const mass = isGasGiant ? Math.random() * 150 + 80 : Math.random() * 20 + 5;
					const radius = Math.max(2, Math.log(mass) * 2);
					const radiusGap = isGasGiant ? 220 : 100;
					
					dist += radiusGap + Math.random() * 40;
					
					const speed = Math.sqrt((sim.units.sim.G * starMass) / dist);
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
					const planetProps = isGasGiant ? {
						temperature: 150, e_base: 0.4, Y_base: 200, specificHeat: 3000,
						absorptionFactor: 0.8, criticalTemp: 5000, e_min: 0.1, Y_min: 10
					} : {
						temperature: 290, e_base: 0.6, Y_base: 8000, specificHeat: 800,
						absorptionFactor: 0.4, criticalTemp: 2500, e_min: 0.1, Y_min: 100
					};
					sim.addBody({ mass, x, y, vx, vy, radius, color, name, ...planetProps });

					if (mass > 60) {
						const moons = Math.floor(Math.random() * 2) + 1;
						for (let m = 0; m < moons; m++) {
							const mDist = 25 + m * 12 + Math.random() * 5 + Math.sqrt(mass);
							const mSpeed = Math.sqrt((sim.units.sim.G * mass) / mDist);
							const mAngle = Math.random() * Math.PI * 2;
							const clockwise = Math.random() > 0.5 ? 1 : -1;
							
							const mx = x + Math.cos(mAngle) * mDist;
							const my = y + Math.sin(mAngle) * mDist;
							
							const mvx = vx - Math.sin(mAngle) * mSpeed * clockwise;
							const mvy = vy + Math.cos(mAngle) * mSpeed * clockwise;
							
							const moonMass = Math.random() * 1.5 + 0.5;
							const moonRad = Math.max(2, Math.log(moonMass) * 2);
							sim.addBody({ 
								mass: moonMass, x: mx, y: my, vx: mvx, vy: mvy, 
								radius: moonRad, color: '#d1d1d1', name: `${name}-m${m+1}`,
								temperature: 120, e_base: 0.7, Y_base: 6000, specificHeat: 700,
								absorptionFactor: 0.5, criticalTemp: 1500, e_min: 0.2, Y_min: 80
							});
						}
					}
				}
			}
		},
		{
			name: "Binary Star System",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.periodicZones = [];
				sim.enableGravity = true;
				sim.enableCollision = true;
				
				const mass = 15000;
				const radius = Math.log(mass) * 2;
				const dist = 400;
				const v = Math.sqrt((sim.units.sim.G * mass) / (4 * dist)); 

				const starProps = {
					friction: 0.5, rotationSpeed: 0.01, temperature: 5000, e_base: 1.0, 
					Y_base: 4000, specificHeat: 8000, absorptionFactor: 0.9, 
					criticalTemp: 800000, transitionFactor: 0.001, e_min: 0.2, Y_min: 100
				};
				sim.addBody({ mass, x: -dist, y: 0, vx: 0, vy: v, radius, color: '#ffcc00', name: 'Star A', ...starProps });
				sim.addBody({ mass, x: dist, y: 0, vx: 0, vy: -v, radius, color: '#ffaa00', name: 'Star B', ...starProps });
				
				for (let i = 0; i < 40; i++) {
					const d = dist * 2 + Math.random() * 500;
					const angle = Math.random() * Math.PI * 2;
					const asteroidMass = Math.random() * 5 + 1;
					const astRad = Math.max(2, Math.log(asteroidMass) * 2);
					
					const speed = Math.sqrt((sim.units.sim.G * 2 * mass) / d);
					
					const x = Math.cos(angle) * d;
					const y = Math.sin(angle) * d;
					const vx = -Math.sin(angle) * speed;
					const vy = Math.cos(angle) * speed;
					
					sim.addBody({ 
						mass: asteroidMass, x, y, vx, vy, radius: astRad, color: '#888', name: `Asteroid ${i}`,
						temperature: 180, e_base: 0.7, Y_base: 5000, specificHeat: 600,
						absorptionFactor: 0.6, criticalTemp: 1800, e_min: 0.2, Y_min: 50
					});
				}
			}
		},
		{
			name: "Random Cloud",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = true;
				sim.enableCollision = true;
				
				for (let i = 0; i < 40; i++) {
					const x = (Math.random() - 0.5) * 1200;
					const y = (Math.random() - 0.5) * 800;
					const vx = (Math.random() - 0.5) * 1.5;
					const vy = (Math.random() - 0.5) * 1.5;
					const mass = Math.random() * 40 + 5;
					const radius = Math.max(2, Math.log(mass) * 2);
					const color = `hsl(${Math.random() * 360}, 60%, 60%)`;
					sim.addBody({
						mass, x, y, vx, vy, radius, color, name: `Body ${i}`,
						temperature: 200, e_base: 0.5, Y_base: 1000, specificHeat: 700,
						absorptionFactor: 0.5, criticalTemp: 1500, e_min: 0.1, Y_min: 20
					});
				}
			}
		},
		{
			name: "Galaxy Collision",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = true;
				
				const createGalaxy = (cx, cy, cvx, cvy, numStars, radius, colorBase) => {
					const coreMass = 15000;
					const coreRad = Math.log(coreMass) * 2;
					sim.addBody({
						mass: coreMass, x: cx, y: cy, vx: cvx, vy: cvy, radius: coreRad, 
						color: '#fff', name: 'Core', friction: 0.5,
						temperature: 8000, e_base: 0.5, Y_base: 20000, specificHeat: 12000,
						absorptionFactor: 0.95, criticalTemp: 2000000, e_min: 0.1, Y_min: 500
					});
					
					for(let i=0; i<numStars; i++) {
						const angle = Math.random() * Math.PI * 2;
						const dist = 60 + Math.random() * radius;
						const velocity = Math.sqrt((sim.units.sim.G * coreMass) / dist);
						
						const x = cx + Math.cos(angle) * dist;
						const y = cy + Math.sin(angle) * dist;
						
						const vx = cvx - Math.sin(angle) * velocity;
						const vy = cvy + Math.cos(angle) * velocity;
						
						const starMass = Math.random() * 2 + 1;
						const starRad = Math.max(2, Math.log(starMass) * 2);
						sim.addBody({
							mass: starMass, x: x, y: y, vx: vx, vy: vy, radius: starRad, 
							color: `hsl(${colorBase + Math.random()*40}, 70%, 70%)`, name: 'Star',
							temperature: 5500, e_base: 0.8, Y_base: 3000, specificHeat: 5000,
							absorptionFactor: 0.9, criticalTemp: 1000000, e_min: 0.2, Y_min: 100
						});
					}
				};
				
				createGalaxy(-400, 0, 1.0, 0.5, 50, 350, 200);
				createGalaxy(400, 0, -1.0, -0.5, 50, 350, 0);
			}
		},
		{
			name: "Artificial Gravity Box",
			init: function(sim) {
				sim.bodies = [];
				sim.enableGravity = false;
				sim.enableCollision = true;
				sim.enableElectricity = false;
				
				sim.addFieldZone(-350, -500, 700, 800, 0, 0.3, 'rgba(46, 204, 113, 0.8)', 'Gravity Field');
				
				sim.addSolidBarrier(-350, 300, 350, 300, 0.8, '#e74c3c', 'Floor');
				sim.addSolidBarrier(-350, -300, -350, 300, 0.8, '#c0392b', 'Wall L');
				sim.addSolidBarrier(350, -300, 350, 300, 0.8, '#c0392b', 'Wall R');
				sim.addSolidBarrier(-200, 100, 200, 200, 0.7, '#8e44ad', 'Bouncer');

				for (let i = 0; i < 4; i++) {
					const m = 20 + Math.random() * 30;
					const r = Math.max(2, Math.log(m) * 2);
					sim.addBody({
						mass: m, x: -250 + Math.random() * 500, y: -250 + Math.random() * 100, 
						vx: (Math.random() - 0.5) * 0.1, vy: (Math.random() - 0.5) * 0.1, 
						radius: r, color: `hsl(${Math.random() * 360}, 70%, 60%)`, name: `Ball ${i}`,
						friction: 0.5, temperature: 293, e_base: 0.9, Y_base: 15000, 
						specificHeat: 450, absorptionFactor: 0.1, criticalTemp: 1600, 
						transitionFactor: 0.01, e_min: 0.2, Y_min: 100
					});
				}
			}
		},
		{
			name: "Lattice Structure",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = false;
				
				const rows = 7;
				const cols = 7;
				const spacing = 80;
				const startX = -(cols * spacing) / 2;
				const startY = -(rows * spacing) / 2;
				
				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						const x = startX + c * spacing;
						const y = startY + r * spacing;
						
						let fixed = (r === 0);
						const color = fixed ? '#555' : '#3498db';
						const mass = fixed ? -1 : 30;
						
						sim.addBody({
							mass, x, y, radius: 5, color, name: `Node ${r}-${c}`,
							temperature: 293, e_base: 0.6, Y_base: 10000, specificHeat: 500,
							absorptionFactor: 0.2, criticalTemp: 1700, e_min: 0.1, Y_min: 100
						});
					}
				}
				
				const getIdx = (r, c) => r * cols + c;
				
				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						const idx = getIdx(r, c);
						
						if (c < cols - 1) sim.addElasticBond(idx, getIdx(r, c+1), 40, spacing, 1.0);
						if (r < rows - 1) sim.addElasticBond(idx, getIdx(r+1, c), 40, spacing, 1.0);
						if (c < cols - 1 && r < rows - 1) {
							 sim.addElasticBond(idx, getIdx(r+1, c+1), 40, spacing * Math.sqrt(2), 1.0);
							 sim.addElasticBond(getIdx(r, c+1), getIdx(r+1, c), 40, spacing * Math.sqrt(2), 1.0);
						}
					}
				}
			}
		},
		{
			name: "Hydrogen (Bohr)",
			init: function(sim) {
				sim.bodies = [];
				sim.enableGravity = false;
				sim.enableElectricity = true;
				sim.enableCollision = false;
				
				sim.addBody({
					mass: 20000, x: 0, y: 0, radius: 15, color: '#e74c3c', name: 'Proton',
					charge: 50, friction: 0.5, temperature: 10000, e_base: 1.0, Y_base: 0
				});

				const orbitR = 200;
				const electronMass = 10;
				const electronCharge = -10;
				
				const force = (sim.units.sim.Ke * Math.abs(50 * electronCharge)) / (orbitR * orbitR);
				const velocity = Math.sqrt((force * orbitR) / electronMass);

				sim.addBody({
					mass: electronMass, x: orbitR, y: 0, vy: velocity, radius: 5, color: '#3498db', name: 'Electron',
					charge: electronCharge, friction: 0.1, temperature: 100, e_base: 1.0, Y_base: 0
				});
			}
		},
		{
			name: "Viscosity Stream",
			init: function(sim) {
				sim.bodies = [];
				sim.enableGravity = false;
				sim.enableCollision = true;
				
				sim.addViscosityZone(-100, -300, 200, 600, 0.8, 'rgba(52, 152, 219, 0.3)');
				sim.addSolidBarrier(-100, -100, 100, 100, 1.0, '#fff', 'Obstacle');
				
				for(let i=0; i<50; i++) {
					sim.addBody({
						mass: 5, x: -500 - Math.random() * 200, y: (Math.random() - 0.5) * 400, 
						vx: 15 + Math.random() * 5, radius: 3, color: '#2ecc71', name: `Particle ${i}`,
						temperature: 293, e_base: 0.8, Y_base: 100
					});
				}
			}
		},
		{
			name: "Gas Chamber (Periodic)",
			init: function(sim) {
				sim.bodies = [];
				sim.enableGravity = false;
				sim.enableCollision = true;
				
				const w = 600;
				const h = 400;
				sim.addPeriodicZone(-w/2, -h/2, w, h, '#e67e22', 'center');
				
				for(let i=0; i<80; i++) {
					sim.addBody({
						mass: 5, x: (Math.random() - 0.5) * (w - 20), y: (Math.random() - 0.5) * (h - 20), 
						vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, 
						radius: 5, color: `hsl(${Math.random() * 60 + 200}, 80%, 60%)`, name: `Mol ${i}`,
						friction: 0.1, temperature: 350, e_base: 0.2, Y_base: 0,
						specificHeat: 2000, absorptionFactor: 0.9, e_min: 0.1, Y_min: 0
					});
				}
			}
		},
		{
			name: "Electromagnetic Trap",
			init: function(sim) {
				sim.bodies = [];
				sim.enableGravity = false;
				sim.enableElectricity = true;
				sim.enableMagnetism = true;
				
				sim.addBody({
					mass: 5000, x: 0, y: 0, radius: 20, color: '#f1c40f', name: 'Core +',
					charge: 200, friction: 0.5, temperature: 500, e_base: 1.0, Y_base: 10000
				});
				
				const count = 12;
				const r = 250;
				const v = -5;
				for(let i=0; i<count; i++) {
					const angle = (i / count) * Math.PI * 2;
					sim.addBody({
						mass: 1000, x: Math.cos(angle) * r, y: Math.sin(angle) * r, 
						vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, radius: 10,
						color: '#e74c3c', name: `Magnet ${i}`, charge: -200, magMoment: 200, 
						friction: 0.5, temperature: 320, e_base: 1.0, Y_base: 20000
					});
				}
				
				for(let i=0; i<20; i++) {
					sim.addBody({
						mass: 10, x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 100, 
						vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, 
						radius: 3, color: '#3498db', name: `Electron ${i}`, charge: -5,
						friction: 0.1, temperature: 100, e_base: 1.0, Y_base: 0
					});
				}
			}
		},
		{
			name: "Newton's Cradle",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = false;
				sim.enableCollision = true;

				const balls = 5;
				const radius = 20;
				const spacing = radius * 2 + 0.1;
				const stringLen = 200;
				const startX = -((balls - 1) * spacing) / 2;
				const y = 100;

				for (let i = 0; i < balls; i++) {
					const x = startX + i * spacing;
					
					sim.addBody({ mass: -1, x: x, y: y - stringLen, radius: 1, color: '#555', name: 'Anchor' });
					
					let bx = x;
					let by = y;
					let vx = 0;
					
					if (i === 0) {
						bx = x - Math.sqrt(2)*100;
						by = y - Math.sqrt(2)*100;
					}
					
					sim.addBody({
						mass: 5, x: bx, y: by, vx: vx, radius: radius, color: '#ccc', name: `Ball ${i}`, 
						friction: 0.1, e_base: 1.0, Y_base: 20000, temperature: 293,
						specificHeat: 450, absorptionFactor: 0.01, criticalTemp: 1600,
						e_min: 0.8, Y_min: 18000
					});
					
					sim.addElasticBond(i*2, i*2+1, {
						type: 'chain', stiffness: 100, damping: 5000,
						length: stringLen, color: '#fff'
					});
				}
				sim.addFieldZone(-600, -300, 1200, 700, 0, 1, 'rgba(10, 200, 20, 0.8)', 'Gravity Field');
			}
		},
		{
			name: "Soft Body Jelly",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = false;
				sim.enableCollision = true;

				const rows = 6;
				const cols = 6;
				const spacing = 120;
				const startX = -(cols * spacing) / 2;
				const startY = -500;

				const getIdx = (r, c) => r * cols + c;

				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						sim.addBody({
							mass: 20, x: startX + c*spacing, y: startY + r*spacing, radius: 8, 
							color: '#e74c3c', name: 'Node', friction: 0.5, e_base: 0.5, Y_base: 500,
							temperature: 293, specificHeat: 3000, absorptionFactor: 0.8,
							criticalTemp: 400, e_min: 0.1, Y_min: 50
						});
					}
				}

				const k = 2000;
				const d = 5000;

				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						const idx = getIdx(r, c);
						if (c < cols - 1) sim.addElasticBond(idx, getIdx(r, c+1), k, spacing, d);
						if (r < rows - 1) sim.addElasticBond(idx, getIdx(r+1, c), k, spacing, d);
						if (c < cols - 1 && r < rows - 1) {
							sim.addElasticBond(idx, getIdx(r+1, c+1), k, spacing * 1.414, d);
							sim.addElasticBond(getIdx(r, c+1), getIdx(r+1, c), k, spacing * 1.414, d);
						}
					}
				}
			}
		},
		{
			name: "Muscle Crawler",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = false;
				sim.enableCollision = true;

				const groundY = 200;
				sim.addSolidBarrier(-600, groundY, 600, groundY, 0.5, '#fff', 'Floor');
				sim.addSolidBarrier(-600, groundY+1, 600, groundY, 0.5, '#fff', 'Floor 2');

				const segments = 6;
				const spacing = 40;
				const startX = -100;
				const y = groundY - 30;
				const bodyProps = {
					e_base: 0.4, Y_base: 2000, temperature: 310, specificHeat: 3500,
					absorptionFactor: 0.7, criticalTemp: 350
				};

				for(let i=0; i<segments; i++) {
					sim.addBody({ mass: 10, x: startX + i*spacing, y: y, radius: 10, color: '#f1c40f', name: `Node ${i}`, ...bodyProps });
					
					if (i > 0) {
						sim.addElasticBond(i-1, i, { stiffness: 500, damping: 200, length: spacing, type: 'spring' });
						if (i > 1) {
							sim.addElasticBond(i-2, i, {
								stiffness: 50, damping: 10, length: spacing * 1.8, type: 'spring',
								activeAmp: 0.2, activeFreq: 10*15.0 + i * 2, color: '#e74c3c', name: 'Muscle'
							});
						}
					}
					
					sim.addBody({ mass: 5, x: startX + i*spacing, y: y + 25, radius: 5, color: '#888', name: `Foot ${i}`, ...bodyProps });
					sim.addElasticBond(i*2, i*2+1, { stiffness: 80, damping: 2, length: 25 });
					if (i > 0) {
						sim.addElasticBond((i-1)*2+1, i*2+1, { stiffness: 5, damping: 5, length: spacing });
					}
				}
				
				sim.addFieldZone(-600, -300, 1200, 700, 0, 1, 'rgba(10, 200, 20, 0.8)', 'Gravity Field');
			}
		},
		{
			name: "Breakable Tower",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = false;
				sim.enableCollision = true;

				sim.addSolidBarrier(-600, 300, 600, 300, 0.5, '#fff', 'Floor');

				const rows = 10;
				const cols = 4;
				const w = 40;
				const h = 40;
				const startX = 100;
				const startY = 280;

				const getIdx = (r, c) => r * cols + c;

				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						const fixed = (r === 0);
						sim.addBody({
							mass: fixed ? -1 : 10, x: startX + c*w, y: startY - r*h, radius: 5, 
							color: '#ecf0f1', name: 'Brick', e_base: 0.4, Y_base: 5000, temperature: 293
						});
					}
				}

				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						const idx = getIdx(r, c);
						const config = { stiffness: 200, damping: 2, breakTension: 150, color: '#95a5a6' };
						
						if (c < cols - 1) sim.addElasticBond(idx, getIdx(r, c+1), { ...config, length: w });
						if (r < rows - 1) sim.addElasticBond(idx, getIdx(r+1, c), { ...config, length: h });
						if (c < cols - 1 && r < rows - 1) {
							sim.addElasticBond(idx, getIdx(r+1, c+1), { ...config, length: Math.sqrt(w*w+h*h), stiffness: 100 });
							sim.addElasticBond(getIdx(r, c+1), getIdx(r+1, c), { ...config, length: Math.sqrt(w*w+h*h), stiffness: 100 });
						}
					}
				}

				sim.addBody({
					mass: 300, x: -300, y: 0, vx: 30, radius: 25, color: '#2c3e50', name: 'Wrecking Ball',
					e_base: 0.6, Y_base: 50000, temperature: 293
				});
				
				sim.addFieldZone(-600, -300, 1200, 700, 0, 0.1, 'rgba(10, 200, 20, 0.8)', 'Gravity Field');
			}
		},
		{
			name: "Cloth Simulation",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = false;
				sim.enableCollision = false;

				const rows = 8;
				const cols = 7;
				const spacing = 30;
				const startX = -(cols * spacing) / 2;
				const startY = -200;

				const getIdx = (r, c) => r * cols + c;

				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						const fixed = (r === 0); 
						sim.addBody({
							mass: fixed ? -1 : 2, x: startX + c*spacing, y: startY + r*spacing, 
							radius: 3, color: '#fff', name: `Node ${r}-${c}`,
							e_base: 0.3, Y_base: 100, temperature: 293
						});
					}
				}

				const config = { stiffness: 400, damping: 5, type: 'rope', color: 'rgba(255,255,255,0.3)' };

				for(let r=0; r<rows; r++) {
					for(let c=0; c<cols; c++) {
						const idx = getIdx(r, c);
						if (c < cols - 1) sim.addElasticBond(idx, getIdx(r, c+1), { ...config, length: spacing });
						if (r < rows - 1) sim.addElasticBond(idx, getIdx(r+1, c), { ...config, length: spacing });
					}
				}
				
				sim.addFieldZone(-175, -270, 320, 350, 0, 0.1, 'rgba(10, 200, 20, 0.8)', 'Gravity Field');
			}
		},
		{
			name: "Chain Link",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.enableGravity = false;
				sim.enableCollision = false;
				
				const segments = 15;
				const len = 30;
				
				sim.addBody({ mass: -1, x: 0, y: -250, radius: 10, color: '#fff', name: 'Anchor' });
				
				const linkProps = { e_base: 0.5, Y_base: 40000, temperature: 293 };
				for(let i=1; i<=segments; i++) {
					sim.addBody({
						mass: 5, x: i * 5, y: -250 + i * len, radius: 5, 
						color: '#bdc3c7', name: `Link ${i}`, ...linkProps
					});
					sim.addElasticBond(i-1, i, {
						type: 'chain', length: len, stiffness: 800,
						damping: 2, nonLinearity: 1.5, color: '#7f8c8d'
					});
				}
				
				sim.addBody({ 
					mass: 50, x: segments * 5, y: -250 + (segments + 1) * len, 
					radius: 20, color: '#e67e22', name: 'Weight', ...linkProps
				});
				sim.addElasticBond(segments, segments + 1, { type: 'chain', length: len, stiffness: 800, damping: 200 });
				
				sim.addFieldZone(-1000, -1000, 2000, 2000, 0, 0.1, 'rgba(10, 200, 20, 0.8)', 'Gravity Field');
			}
		},
		{
			name: "Figure-8 Orbit",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.periodicZones = [];
				sim.enableGravity = true;
				sim.enableCollision = false;
				sim.enableElectricity = false;

				const m = 1000;
				const scale = 200;
				const vScale = Math.sqrt((sim.units.sim.G * m) / scale);
				
				const p1x = 0.97000436 * scale;
				const p1y = -0.24308753 * scale;
				const v3x = 0.93240737 * vScale;
				const v3y = 0.86473146 * vScale;
				const v1x = -0.5 * v3x;
				const v1y = -0.5 * v3y;

				const bodyProps = { temperature: 800, e_base: 0.7, Y_base: 6000 };
				sim.addBody({ mass: m, x: p1x, y: p1y, vx: v1x, vy: v1y, radius: 10, color: '#3498db', name: 'Body 1', ...bodyProps });
				sim.addBody({ mass: m, x: -p1x, y: -p1y, vx: v1x, vy: v1y, radius: 10, color: '#e74c3c', name: 'Body 2', ...bodyProps });
				sim.addBody({ mass: m, x: 0, y: 0, vx: v3x, vy: v3y, radius: 10, color: '#f1c40f', name: 'Body 3', ...bodyProps });
			}
		},
		{
			name: "Quadrupole Trap",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.periodicZones = [];
				sim.enableGravity = false;
				sim.enableCollision = true;
				sim.enableElectricity = true;

				const dist = 250;
				const q = 4000;
				const r = 20;
				const fixedProps = { friction: 0.5, e_base: 1.0, temperature: 293 };

				sim.addBody({ mass: -1, x: dist, y: dist, radius: r, color: '#e74c3c', name: 'Fix +', charge: q, ...fixedProps });
				sim.addBody({ mass: -1, x: -dist, y: -dist, radius: r, color: '#e74c3c', name: 'Fix +', charge: q, ...fixedProps });
				sim.addBody({ mass: -1, x: -dist, y: dist, radius: r, color: '#3498db', name: 'Fix -', charge: -q, ...fixedProps });
				sim.addBody({ mass: -1, x: dist, y: -dist, radius: r, color: '#3498db', name: 'Fix -', charge: -q, ...fixedProps });

				for(let i=0; i<70; i++) {
					const bx = (Math.random() - 0.5) * 200;
					const by = (Math.random() - 0.5) * 200;
					const vx = (Math.random() - 0.5) * 2;
					const vy = (Math.random() - 0.5) * 2;
					sim.addBody({
						mass: 1, x: bx, y: by, vx: vx, vy: vy, radius: 2, color: '#fff', name: 'Ion', 
						charge: 10, friction: 0.1, e_base: 1.0, temperature: 500, Y_base: 0
					});
				}
			}
		},
		{
			name: "Spiral Galaxy",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.periodicZones = [];
				sim.enableGravity = true;
				sim.enableCollision = false;

				const bhMass = 50000;
				sim.addBody({
					mass: bhMass, x: 0, y: 0, radius: 8, color: '#fff', name: 'Black Hole',
					temperature: 1, e_base: 0, Y_base: 1e9, absorptionFactor: 1.0
				});

				const stars = 60;
				const arms = 3;
				const armOffset = Math.PI * 2 / arms;

				for(let i=0; i<stars; i++) {
					const dist = 100 + Math.random() * 450;
					const arm = i % arms;
					const angle = arm * armOffset + (dist / 100) + (Math.random()-0.5)*0.5;
					
					const speed = Math.sqrt(sim.units.sim.G * bhMass / dist);
					const x = Math.cos(angle) * dist;
					const y = Math.sin(angle) * dist;
					const vx = -Math.sin(angle) * speed;
					const vy = Math.cos(angle) * speed;

					const hue = 200 + Math.random() * 60;
					const color = `hsl(${hue}, 80%, 70%)`;
					sim.addBody({
						mass: Math.random()*3+1, x, y, vx, vy, radius: Math.random()*2+1, color, name: 'Star',
						temperature: 6000, e_base: 0.8, Y_base: 3000
					});
				}
			}
		},
		{
			name: "Lagrange Points L4/L5",
			init: function(sim) {
				sim.bodies = [];
				sim.elasticBonds = [];
				sim.periodicZones = [];
				sim.enableGravity = true;
				sim.enableCollision = false;

				const M1 = 10000; 
				const M2 = 300;   
				const R = 300;
				
				const centerMass = M1 + M2;
				const angularVel = Math.sqrt(sim.units.sim.G * centerMass / (R*R*R));
				
				const x1 = -R * (M2 / centerMass);
				const x2 = R * (M1 / centerMass);
				
				const vy1 = x1 * angularVel;
				const vy2 = x2 * angularVel;

				sim.addBody({
					mass: M1, x: x1, y: 0, vy: vy1, radius: 20, color: '#f1c40f', name: 'Sun',
					temperature: 6000, e_base: 1.0, Y_base: 5000
				});
				sim.addBody({
					mass: M2, x: x2, y: 0, vy: vy2, radius: 10, color: '#3498db', name: 'Planet',
					temperature: 300, e_base: 0.6, Y_base: 8000
				});

				const l4x = x1 + R * Math.cos(Math.PI/3);
				const l4y = R * Math.sin(Math.PI/3);
				const l5x = x1 + R * Math.cos(-Math.PI/3);
				const l5y = R * Math.sin(-Math.PI/3);

				const createTrojans = (cx, cy, label) => {
					for(let i=0; i<25; i++) {
						const angle = Math.atan2(cy, cx);
						const d = Math.sqrt(cx*cx + cy*cy);
						const vel = d * angularVel;
						
						const vX = -Math.sin(angle) * vel;
						const vY = Math.cos(angle) * vel;
						
						const offX = (Math.random()-0.5) * 17;
						const offY = (Math.random()-0.5) * 17;
						
						sim.addBody({
							mass: 0.01, x: cx+offX, y: cy+offY, 
							vx: vX + (Math.random()-0.5)*0.4, vy: vY + (Math.random()-0.5)*0.4, 
							radius: 0.2, color: '#95a5a6', name: label,
							temperature: 150, e_base: 0.7, Y_base: 5000
						});
					}
				};

				createTrojans(l4x, l4y, 'L4 Trojan');
				createTrojans(l5x, l5y, 'L5 Trojan');
			}
		}
	];
	
})();