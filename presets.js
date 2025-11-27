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
            sim.addBody(starMass, 0, 0, 0, 0, '#ffeeb0', 'Sun', 0, 0, 0, 0, 1, -1, 6000, 0.02);

            const count = 8;
            let dist = 300;

            for(let i=0; i<count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const isGasGiant = i > 3;
                const mass = isGasGiant ? Math.random() * 150 + 80 : Math.random() * 20 + 5;
                const radiusGap = isGasGiant ? 220 : 100;
                
                dist += radiusGap + Math.random() * 40;
                
                const speed = Math.sqrt((sim.G * starMass) / dist);
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
                sim.addBody(mass, x, y, vx, vy, color, name);

                if (mass > 60) {
                    const moons = Math.floor(Math.random() * 2) + 1;
                    for (let m = 0; m < moons; m++) {
                        const mDist = 25 + m * 12 + Math.random() * 5 + Math.sqrt(mass);
                        const mSpeed = Math.sqrt((sim.G * mass) / mDist);
                        const mAngle = Math.random() * Math.PI * 2;
                        const clockwise = Math.random() > 0.5 ? 1 : -1;
                        
                        const mx = x + Math.cos(mAngle) * mDist;
                        const my = y + Math.sin(mAngle) * mDist;
                        
                        const mvx = vx - Math.sin(mAngle) * mSpeed * clockwise;
                        const mvy = vy + Math.cos(mAngle) * mSpeed * clockwise;
                        
                        sim.addBody(Math.random() * 1.5 + 0.5, mx, my, mvx, mvy, '#d1d1d1', `${name}-m${m+1}`);
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
            const dist = 400;
            const v = Math.sqrt((sim.G * mass) / (4 * dist)); 

            sim.addBody(mass, -dist, 0, 0, v, '#ffcc00', 'Star A', 0, 0, 0, 0, 1, -1, 5000, 0.01);
            sim.addBody(mass, dist, 0, 0, -v, '#ffaa00', 'Star B', 0, 0, 0, 0, 1, -1, 5000, 0.01);
            
            for (let i = 0; i < 40; i++) {
                const d = dist * 2 + Math.random() * 500;
                const angle = Math.random() * Math.PI * 2;
                const asteroidMass = Math.random() * 5 + 1;
                
                const speed = Math.sqrt((sim.G * 2 * mass) / d);
                
                const x = Math.cos(angle) * d;
                const y = Math.sin(angle) * d;
                const vx = -Math.sin(angle) * speed;
                const vy = Math.cos(angle) * speed;
                
                sim.addBody(asteroidMass, x, y, vx, vy, '#888', `Asteroid ${i}`);
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
                const color = `hsl(${Math.random() * 360}, 60%, 60%)`;
                sim.addBody(mass, x, y, vx, vy, color, `Body ${i}`);
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
                sim.addBody(coreMass, cx, cy, cvx, cvy, '#fff', 'Core', 0, 0, 0, 0, 0.5);
                
                for(let i=0; i<numStars; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 60 + Math.random() * radius;
                    const velocity = Math.sqrt((sim.G * coreMass) / dist);
                    
                    const x = cx + Math.cos(angle) * dist;
                    const y = cy + Math.sin(angle) * dist;
                    
                    const vx = cvx - Math.sin(angle) * velocity;
                    const vy = cvy + Math.cos(angle) * velocity;
                    
                    sim.addBody(Math.random() * 2 + 1, x, y, vx, vy, `hsl(${colorBase + Math.random()*40}, 70%, 70%)`, 'Star');
                }
            };
            
            createGalaxy(-400, 0, 1.0, 0.5, 50, 350, 200);
            createGalaxy(400, 0, -1.0, -0.5, 50, 350, 0);
        }
    },
    {
        name: "Newton's Cradle",
        init: function(sim) {
            sim.bodies = [];
            sim.elasticBonds = [];
            sim.enableGravity = true; 
            sim.enableCollision = true;
            
            const pivotY = -300;
            const startX = -120;
            const gap = 60;
            const stringLen = 300;
            
            for(let i=0; i<5; i++) {
                const bx = startX + i * gap;
                const by = pivotY; 
                
                sim.addBody(1e9, bx, by, 0, 0, '#444', 'Pivot', 0, 0, 0, 0, 0); 
                const pivotIdx = sim.bodies.length - 1;
                sim.bodies[pivotIdx].lifetime = -1; 
                
                let ballX = bx;
                let ballY = pivotY + stringLen;
                
                if (i === 0) {
                    ballX -= 180;
                    ballY -= 60;
                }
                
                sim.addBody(50, ballX, ballY, 0, 0, '#e74c3c', 'Ball');
                const ballIdx = sim.bodies.length - 1;
                sim.bodies[ballIdx].restitution = 1.0;
                
                sim.addElasticBond(pivotIdx, ballIdx, 50, stringLen, 0.1, '#fff', 'String');
            }
        }
    },
    {
        name: "Lattice Structure",
        init: function(sim) {
            sim.bodies = [];
            sim.elasticBonds = [];
            sim.enableGravity = false;
            sim.enableCollision = true;
            
            const rows = 5;
            const cols = 5;
            const spacing = 60;
            const startX = -(cols * spacing) / 2;
            const startY = -(rows * spacing) / 2;
            
            for(let r=0; r<rows; r++) {
                for(let c=0; c<cols; c++) {
                    const x = startX + c * spacing;
                    const y = startY + r * spacing;
                    
                    let fixed = (r === 0);
                    const mass = fixed ? 1e9 : 30;
                    const color = fixed ? '#555' : '#3498db';
                    
                    sim.addBody(mass, x, y, 0, 0, color, `Node ${r}-${c}`);
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
        name: "Electron Orbit (Bohr)",
        init: function(sim) {
            sim.bodies = [];
            sim.enableGravity = false;
            sim.enableElectricity = true;
            sim.enableCollision = false;
            
            sim.addBody(20000, 0, 0, 0, 0, '#e74c3c', 'Proton', 0, 0, 50);

            const orbitR = 200;
            const electronMass = 10;
            const electronCharge = -10;
            
            const force = (sim.Ke * Math.abs(50 * electronCharge)) / (orbitR * orbitR);
            const velocity = Math.sqrt((force * orbitR) / electronMass);

            sim.addBody(electronMass, orbitR, 0, 0, velocity, '#3498db', 'Electron', 0, 0, electronCharge);
        }
    }
];