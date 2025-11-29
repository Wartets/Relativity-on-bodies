document.addEventListener('DOMContentLoaded', () => {
	const Sim = window.App.sim;
	const Render = window.App.render;
	let maxZIndex = 100;
	let draggedItemIndex = null;

	const inputsToParse = ['newMass', 'newRadius', 'newRestitution', 'newX', 'newY', 'newCharge', 'newVX', 'newVY', 'newMagMoment', 'newAX', 'newAY', 'newRotationSpeed', 'newTemperature', 'newYoungModulus', 'newFriction', 'newLifetime'];

	const evaluateMathExpression = (expr) => {
		if (typeof expr !== 'string' || expr.trim() === '') return expr;

		try {
			const sanitizedExpr = expr.toLowerCase()
				.replace(/\^/g, '**')
				.replace(/pi/g, 'Math.PI')
				.replace(/e/g, 'Math.E')
				.replace(/,/g, '.');

			if (/[a-df-z]/g.test(sanitizedExpr)) {
				return expr;
			}

			const result = new Function('return ' + sanitizedExpr)();
			
			if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
				return result;
			}
		} catch (e) {
		}

		return expr;
	};

	const formatVal = (val, prec = 2) => {
		if (typeof val !== 'number' || isNaN(val)) return val;
		const abs = Math.abs(val);
		if (val !== 0 && (abs >= 10000 || abs < 0.0001)) {
			return val.toExponential(prec);
		}
		return parseFloat(val.toFixed(prec));
	};

	const addMathParsing = (input) => {
		input.addEventListener('change', () => {
			const result = evaluateMathExpression(input.value);
			if (typeof result === 'number' && parseFloat(input.value) !== result) {
				input.value = formatVal(result, 4);
				input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
			}
		});
	};

	const setupDraggable = (panelEl, headerEl, neighbors = []) => {
		let isDragging = false;
		let offsetX = 0, offsetY = 0;

		const startDrag = (clientX, clientY) => {
			maxZIndex++;
			panelEl.style.zIndex = maxZIndex;
			isDragging = true;
			const rect = panelEl.getBoundingClientRect();
			offsetX = clientX - rect.left;
			offsetY = clientY - rect.top;
			headerEl.style.cursor = 'grabbing';
			panelEl.style.right = 'auto';
			panelEl.style.left = rect.left + 'px';
		};

		const moveDrag = (clientX, clientY) => {
			if (isDragging) {
				let newX = clientX - offsetX;
				let newY = clientY - offsetY;
				
				const isMobile = window.innerWidth < 600;
				const frameMargin = isMobile ? 0 : 20;
				const snapThreshold = isMobile ? 10 : 20;
				
				const winW = window.innerWidth;
				const winH = window.innerHeight;
				const pW = panelEl.offsetWidth;
				const pH = panelEl.offsetHeight;

				if (Math.abs(newX - frameMargin) < snapThreshold) newX = frameMargin;
				else if (Math.abs((newX + pW) - (winW - frameMargin)) < snapThreshold) newX = winW - frameMargin - pW;

				if (Math.abs(newY - frameMargin) < snapThreshold) newY = frameMargin;
				else if (Math.abs((newY + pH) - (winH - frameMargin)) < snapThreshold) newY = winH - frameMargin - pH;

				neighbors.forEach(neighbor => {
					const nRect = neighbor.getBoundingClientRect();
					
					if (Math.abs(newX - (nRect.left + nRect.width)) < snapThreshold) newX = nRect.left + nRect.width;
					if (Math.abs((newX + pW) - nRect.left) < snapThreshold) newX = nRect.left - pW;
					if (Math.abs(newX - nRect.left) < snapThreshold) newX = nRect.left;
					if (Math.abs((newX + pW) - (nRect.left + nRect.width)) < snapThreshold) newX = nRect.left + nRect.width - pW;

					if (Math.abs(newY - (nRect.top + nRect.height)) < snapThreshold) newY = nRect.top + nRect.height;
					if (Math.abs((newY + pH) - nRect.top) < snapThreshold) newY = nRect.top - pH;
					if (Math.abs(newY - nRect.top) < snapThreshold) newY = nRect.top;
					if (Math.abs((newY + pH) - (nRect.top + nRect.height)) < snapThreshold) newY = nRect.top + nRect.height - pH;
				});

				newX = Math.max(0, Math.min(winW - pW, newX));
				newY = Math.max(0, Math.min(winH - pH, newY));

				panelEl.style.left = newX + 'px';
				panelEl.style.top = newY + 'px';
			}
		};

		const endDrag = () => {
			isDragging = false;
			headerEl.style.cursor = 'grab';
		};

		panelEl.addEventListener('mousedown', () => {
			maxZIndex++;
			panelEl.style.zIndex = maxZIndex;
		});
		
		panelEl.addEventListener('touchstart', () => {
			maxZIndex++;
			panelEl.style.zIndex = maxZIndex;
		}, {passive: true});

		headerEl.addEventListener('mousedown', (e) => {
			if(e.target.closest('button')) return; 
			startDrag(e.clientX, e.clientY);
		});

		window.addEventListener('mousemove', (e) => {
			moveDrag(e.clientX, e.clientY);
		});

		window.addEventListener('mouseup', endDrag);

		headerEl.addEventListener('touchstart', (e) => {
			if(e.target.closest('button')) return;
			e.preventDefault();
			const touch = e.touches[0];
			startDrag(touch.clientX, touch.clientY);
		}, {passive: false});

		window.addEventListener('touchmove', (e) => {
			if(isDragging) {
				e.preventDefault();
				const touch = e.touches[0];
				moveDrag(touch.clientX, touch.clientY);
			}
		}, {passive: false});

		window.addEventListener('touchend', endDrag);
	};

	const toggleBtn = document.getElementById('togglePanelBtn');
	
	const panel = document.getElementById('controlPanel');
	const header = document.getElementById('panelHeader');
	const toolsPanel = document.getElementById('toolsPanel');
	const toolsHeader = document.getElementById('toolsHeader');
	
	const toggleInjBtn = document.getElementById('toggleInjectionBtn');
	const injContent = document.getElementById('injectionContent');
	
	const toggleDisplayBtn = document.getElementById('toggleDisplayBtn');
	const displayContent = document.getElementById('displayContent');
	
	const bodiesContainer = document.getElementById('bodiesListContainer');
	const bodyCountLabel = document.getElementById('bodyCount');

	const toggleBodiesBtn = document.getElementById('toggleBodiesBtn');
	const bodiesHeader = document.getElementById('bodiesHeader');
	
	const toggleViscosityZoneBtn = document.getElementById('toggleViscosityZoneBtn');
	const viscosityZonesListContainer = document.getElementById('viscosityZonesListContainer');
	
	const toggleZoneDrawBtn = document.getElementById('toggleZoneDrawBtn');
	const zonesListContainer = document.getElementById('zonesListContainer');
	
	const toggleBondToolBtn = document.getElementById('toggleBondToolBtn');
	const bondsListContainer = document.getElementById('bondsListContainer');
	
	const toggleFieldZoneToolBtn = document.getElementById('toggleFieldZoneToolBtn');
	const fieldZonesListContainer = document.getElementById('fieldZonesListContainer');
	
	const toggleFieldDefBtn = document.getElementById('toggleFieldDefBtn');
	const fieldDefContent = document.getElementById('fieldDefContent');
	const fieldsListContainer = document.getElementById('fieldsListContainer');
	
	const toggleBarrierToolBtn = document.getElementById('toggleBarrierToolBtn');
	const barriersListContainer = document.getElementById('barriersListContainer');
	
	const bondToolBtn = document.getElementById('toggleBondToolBtn');
	
	const playBtn = document.getElementById('playPauseBtn');
	
	const toggleToolsBtn = document.getElementById('toggleToolsBtn');
	
	const generateRandomParameters = (setDefault = false, onlyKinematics = false) => {
		const bodies = Sim.bodies;
		let totalMass = 0;
		let comX = 0;
		let comY = 0;

		if (bodies.length > 0) {
			bodies.forEach(b => {
				totalMass += b.mass;
				comX += b.x * b.mass;
				comY += b.y * b.mass;
			});
			comX /= totalMass;
			comY /= totalMass;
		}

		const zoom = Render.zoom;
		const viewW = Render.width / zoom;
		const viewH = Render.height / zoom;
		const centerX = -Render.camX / zoom;
		const centerY = -Render.camY / zoom;
		
		const marginX = viewW * 0.1;
		const marginY = viewH * 0.1;
		const rangeX = (viewW / 2) - marginX;
		const rangeY = (viewH / 2) - marginY;

		let x, y, vx, vy;

		if (setDefault) {
			x = 10; 
			y = 10;
			vx = 0;
			vy = 0;
		} else {
			x = centerX + (Math.random() - 0.5) * 2 * rangeX;
			y = centerY + (Math.random() - 0.5) * 2 * rangeY;
			
			if (totalMass > 0) {
				const dx = x - comX;
				const dy = y - comY;
				const dist = Math.sqrt(dx*dx + dy*dy);
				
				if (dist > 0.01) {
					const v = Math.sqrt((Sim.G * totalMass) / dist);
					
					const angle = Math.atan2(dy, dx);
					const dir = Math.random() > 0.5 ? 1 : -1;
					
					vx = -Math.sin(angle) * v * dir;
					vy = Math.cos(angle) * v * dir;
					
					vx += (Math.random() - 0.5) * v * 0.2;
					vy += (Math.random() - 0.5) * v * 0.2;
				} else {
					vx = (Math.random() - 0.5) * 2;
					vy = (Math.random() - 0.5) * 2;
				}
			} else {
				vx = (Math.random() - 0.5) * 2;
				vy = (Math.random() - 0.5) * 2;
			}
		}

		document.getElementById('newX').value = formatVal(x, 2);
		document.getElementById('newY').value = formatVal(y, 2);
		document.getElementById('newVX').value = formatVal(vx, 3);
		document.getElementById('newVY').value = formatVal(vy, 3);
		document.getElementById('newAX').value = 0;
		document.getElementById('newAY').value = 0;

		if (!onlyKinematics) {
			const mass = setDefault ? 2000 : Math.floor(Math.random() * 800) + 100;
			const radius = Math.max(2, Math.log(mass) * 2);
			const charge = parseFloat(((Math.random() - 0.5) * 10).toFixed(2));
			const magMoment = parseFloat(((Math.random() - 0.5) * 20).toFixed(2));
			const restitution = parseFloat((Math.random() * 0.2).toFixed(3));
			const temperature = Math.floor(Math.random() * 1000) + 100;
			const rotationSpeed = (Math.random() - 0.5) * 0.2;
			const youngModulus = Math.floor(Math.random() * 1000) + 100;
			const friction = setDefault ? 0.5 : parseFloat((Math.random() * 0.8 + 0.1).toFixed(2));

			document.getElementById('newMass').value = formatVal(mass, 2);
			document.getElementById('newRadius').value = formatVal(radius, 2);
			document.getElementById('newCharge').value = formatVal(charge, 2);
			document.getElementById('newMagMoment').value = formatVal(magMoment, 2);
			document.getElementById('newRestitution').value = formatVal(restitution, 2);
			document.getElementById('newLifetime').value = -1;
			document.getElementById('newTemperature').value = formatVal(temperature, 0);
			document.getElementById('newRotationSpeed').value = formatVal(rotationSpeed, 3);
			document.getElementById('newYoungModulus').value = formatVal(youngModulus, 0);
			document.getElementById('newFriction').value = formatVal(friction, 2);
			
			const presetSelect = document.getElementById('presetSelect');
			if (presetSelect) {
				presetSelect.value = "";
				delete presetSelect.dataset.color;
			}
		}
	};
	
	const initPresets = () => {
		const presetSelect = document.getElementById('presetSelect');
		if (!presetSelect) return;

		const rnd = (min, max) => min + Math.random() * (max - min);
		const rndInt = (min, max) => Math.floor(rnd(min, max));
		const logRad = (m) => Math.max(2, Math.log(m) * 2);

		const presets = {
			"Star: Red Giant": (S) => {
				const m = rnd(60000, 90000) / (S.G * 2);
				return {
					mass: m,
					radius: logRad(m) * 3,
					charge: rnd(-5, 5),
					magMoment: rnd(50, 150),
					restitution: 0.2,
					temperature: rndInt(3000, 4500),
					youngModulus: rnd(100, 500),
					rotationSpeed: rnd(0.001, 0.005),
					friction: 0.5,
					color: `hsl(${rndInt(0, 20)}, 100%, 60%)`
				};
			},
			"Star: Yellow Dwarf (Sun)": (S) => {
				const m = rnd(20000, 30000) / (S.G * 2);
				return {
					mass: m,
					radius: logRad(m),
					charge: 0,
					magMoment: rnd(10, 50),
					restitution: 0.5,
					temperature: rndInt(5500, 6000),
					youngModulus: rnd(1000, 2000),
					rotationSpeed: rnd(0.01, 0.03),
					friction: 0.5,
					color: `hsl(${rndInt(45, 60)}, 100%, 70%)`
				};
			},
			"Star: White Dwarf": (S) => {
				const m = rnd(15000, 25000) / (S.G * 2);
				return {
					mass: m,
					radius: logRad(m) * 0.5,
					charge: rnd(0, 10),
					magMoment: rnd(100, 300),
					restitution: 0.9,
					temperature: rndInt(15000, 30000),
					youngModulus: rnd(50000, 80000),
					rotationSpeed: rnd(0.1, 0.5),
					friction: 0.4,
					color: `hsl(${rndInt(190, 220)}, 50%, 90%)`
				};
			},
			"Star: Neutron": (S) => {
				const m = rnd(35000, 50000) / (S.G * 2);
				return {
					mass: m,
					radius: 4,
					charge: rnd(50, 100) / Math.sqrt(S.Ke),
					magMoment: rnd(2000, 5000) / Math.sqrt(S.Km),
					restitution: 0.95,
					temperature: rndInt(500000, 1000000),
					youngModulus: 200000,
					rotationSpeed: rnd(2.0, 5.0),
					friction: 0.1,
					color: '#ffffff'
				};
			},
			"Black Hole (Simulated)": (S) => {
				const m = rnd(150000, 300000) / (S.G * 2);
				return {
					mass: m,
					radius: 2,
					charge: 0,
					magMoment: 0,
					restitution: 0,
					temperature: 0,
					youngModulus: 1000000,
					rotationSpeed: rnd(1.0, 10.0),
					friction: 0,
					color: '#000000'
				};
			},
			"Planet: Gas Giant": (S) => {
				const m = rnd(1000, 2500) / (S.G * 2);
				return {
					mass: m,
					radius: logRad(m) * 1.2,
					charge: rnd(-2, 2),
					magMoment: rnd(20, 80),
					restitution: 0.7,
					temperature: rndInt(100, 160),
					youngModulus: rnd(100, 300),
					rotationSpeed: rnd(0.05, 0.15),
					friction: 0.2,
					color: `hsl(${rndInt(25, 45)}, 80%, ${rndInt(50, 70)}%)`
				};
			},
			"Planet: Rocky (Habitable)": (S) => {
				const m = rnd(80, 150) / (S.G * 2);
				return {
					mass: m,
					radius: logRad(m),
					charge: 0,
					magMoment: rnd(2, 10),
					restitution: 0.5,
					temperature: rndInt(250, 320),
					youngModulus: rnd(3000, 6000),
					rotationSpeed: rnd(0.1, 0.3),
					friction: 0.8,
					color: `hsl(${rndInt(100, 140)}, 60%, 50%)`
				};
			},
			"Planet: Molten": (S) => {
				const m = rnd(60, 120) / (S.G * 2);
				return {
					mass: m,
					radius: logRad(m),
					charge: rnd(0, 5),
					magMoment: rnd(1, 5),
					restitution: 0.3,
					temperature: rndInt(800, 1500),
					youngModulus: rnd(1000, 2000),
					rotationSpeed: rnd(0.05, 0.1),
					friction: 0.6,
					color: `hsl(${rndInt(0, 20)}, 80%, 40%)`
				};
			},
			"Particle: Electron": (S) => ({
				mass: 0.5,
				radius: 2,
				charge: -20 / Math.sqrt(S.Ke),
				magMoment: 5 / Math.sqrt(S.Km),
				restitution: 1.0,
				temperature: 0,
				youngModulus: 0,
				rotationSpeed: 8.0,
				friction: 0.0,
				color: '#ffff00'
			}),
			"Particle: Proton": (S) => ({
				mass: 50,
				radius: 4,
				charge: 20 / Math.sqrt(S.Ke),
				magMoment: 2 / Math.sqrt(S.Km),
				restitution: 1.0,
				temperature: 0,
				youngModulus: 0,
				rotationSpeed: 1.0,
				friction: 0.1,
				color: '#ff3333'
			}),
			"Particle: Neutron": (S) => ({
				mass: 50.1,
				radius: 4,
				charge: 0,
				magMoment: -3 / Math.sqrt(S.Km),
				restitution: 1.0,
				temperature: 0,
				youngModulus: 0,
				rotationSpeed: 1.0,
				friction: 0.1,
				color: '#aaaaaa'
			}),
			"Ball: Billiard": (S) => ({
				mass: 10,
				radius: 5,
				charge: 0,
				magMoment: 0,
				restitution: 0.98,
				temperature: 20,
				youngModulus: 15000,
				rotationSpeed: 0,
				friction: 0.2,
				color: `hsl(${rndInt(0, 360)}, 80%, 50%)`
			}),
			"Ball: Pétanque": (S) => ({
				mass: 40,
				radius: 5,
				charge: 0,
				magMoment: rnd(0, 0.5),
				restitution: 0.25,
				temperature: 25,
				youngModulus: 50000,
				rotationSpeed: 0,
				friction: 0.9,
				color: '#71706e'
			}),
			"Ball: Tennis": (S) => ({
				mass: 3,
				radius: 4,
				charge: rnd(0, 2),
				magMoment: 0,
				restitution: 0.85,
				temperature: 20,
				youngModulus: 2000,
				rotationSpeed: 0,
				friction: 0.7,
				color: '#ccff00'
			}),
			"Object: Soap Bubble": (S) => ({
				mass: 0.1,
				radius: 10,
				charge: rnd(1, 3),
				magMoment: 0,
				restitution: 0.8,
				temperature: 15,
				youngModulus: 10,
				rotationSpeed: rnd(0.1, 0.5),
				friction: 0.05,
				color: 'rgba(200, 240, 255, 0.6)'
			}),
			"Object: Magnet": (S) => ({
				mass: 25,
				radius: 6,
				charge: 0,
				magMoment: rnd(80, 120) / Math.sqrt(S.Km),
				restitution: 0.5,
				temperature: 20,
				youngModulus: 10000,
				rotationSpeed: 0,
				friction: 0.5,
				color: '#ff0000'
			})
		};

		Object.keys(presets).forEach(key => {
			const opt = document.createElement('option');
			opt.value = key;
			opt.textContent = key;
			presetSelect.appendChild(opt);
		});

		presetSelect.addEventListener('change', () => {
			const key = presetSelect.value;
			if (key && presets[key]) {
				const params = presets[key](Sim);
				
				document.getElementById('newMass').value = formatVal(params.mass, 2);
				document.getElementById('newRadius').value = formatVal(params.radius, 2);
				document.getElementById('newCharge').value = formatVal(params.charge, 2);
				document.getElementById('newMagMoment').value = formatVal(params.magMoment, 2);
				document.getElementById('newRestitution').value = formatVal(params.restitution, 2);
				document.getElementById('newTemperature').value = formatVal(params.temperature, 0);
				document.getElementById('newRotationSpeed').value = formatVal(params.rotationSpeed, 3);
				document.getElementById('newYoungModulus').value = formatVal(params.youngModulus, 0);
				document.getElementById('newFriction').value = formatVal(params.friction, 2);
				
				if (params.color) {
					presetSelect.dataset.color = params.color;
				} else {
					delete presetSelect.dataset.color;
				}
			}
		});

		const inputIds = ['newMass', 'newRadius', 'newX', 'newY', 'newVX', 'newVY', 'newAX', 'newAY', 
			'newCharge', 'newMagMoment', 'newRestitution', 'newLifetime', 
			'newTemperature', 'newRotationSpeed', 'newYoungModulus', 'newFriction'];
		
		inputIds.forEach(id => {
			const el = document.getElementById(id);
			if(el) {
				el.addEventListener('input', () => {
					presetSelect.value = "";
					delete presetSelect.dataset.color;
				});
			}
		});
	};
	
	const initSimPresets = () => {
		const select = document.getElementById('simPresetSelect');
		const loadBtn = document.getElementById('loadSimPresetBtn');
		
		if (!window.App.presets || window.App.presets.length === 0 || !select) return;
		
		select.innerHTML = '';
		window.App.presets.forEach((preset, index) => {
			const opt = document.createElement('option');
			opt.value = index;
			opt.textContent = preset.name;
			select.appendChild(opt);
		});
		
		loadBtn.addEventListener('click', () => {
			const idx = parseInt(select.value, 10);
			if (window.App.presets[idx]) {
				Sim.reset();
				window.App.presets[idx].init(Sim);
				
				const updateCheck = (id, val) => {
					const el = document.getElementById(id);
					if(el) el.checked = val;
				};
				updateCheck('gravBox', Sim.enableGravity);
				updateCheck('elecBox', Sim.enableElectricity);
				updateCheck('magBox', Sim.enableMagnetism);
				updateCheck('colBox', Sim.enableCollision);

				refreshBodyList();
				refreshZoneList();
				refreshViscosityZoneList();
				refreshElasticBondList();
				refreshSolidBarrierList();
				refreshFieldZoneList();
				refreshFieldList();
				Render.draw();
			}
		});
	};
	
	const initBodySorting = () => {
		const sortContainer = document.getElementById('bodySortContainer');
		if (!sortContainer) return;

		const sortParams = [
			{ label: 'Custom (Drag)', key: '' },
			{ label: 'Name', key: 'name' },
			{ label: 'Mass', key: 'mass' },
			{ label: 'Radius', key: 'radius' },
			{ label: 'Pos X', key: 'x' },
			{ label: 'Pos Y', key: 'y' },
			{ label: 'Vel X', key: 'vx' },
			{ label: 'Vel Y', key: 'vy' },
			{ label: 'Charge', key: 'charge' },
			{ label: 'Temp', key: 'temperature' },
			{ label: 'Color', key: 'color' }
		];

		let optionsHtml = sortParams.map(p => `<option value="${p.key}">${p.label}</option>`).join('');
		sortContainer.innerHTML = `
			<select id="bodySortSelect" class="sort-select">${optionsHtml}</select>
			<button id="bodySortDirBtn" class="btn secondary" style="width: 30px; padding: 4px;" title="Reverse Order">
				<i class="fa-solid fa-arrow-down-a-z"></i>
			</button>
		`;

		const sortSelect = document.getElementById('bodySortSelect');
		const sortDirBtn = document.getElementById('bodySortDirBtn');
		let sortAsc = true;

		const applySort = () => {
			const key = sortSelect.value;
			if (!key) return;

			// Sauvegarder la sélection
			const selectedBody = Render.selectedBodyIdx !== -1 ? Sim.bodies[Render.selectedBodyIdx] : null;

			Sim.bodies.sort((a, b) => {
				let valA = a[key];
				let valB = b[key];

				if (typeof valA === 'string') {
					valA = valA.toLowerCase();
					valB = valB.toLowerCase();
					return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
				}
				
				return sortAsc ? (valA - valB) : (valB - valA);
			});

			if (selectedBody) {
				Render.selectedBodyIdx = Sim.bodies.indexOf(selectedBody);
			}

			refreshBodyList();
		};

		sortSelect.addEventListener('change', applySort);
		
		sortDirBtn.addEventListener('click', () => {
			sortAsc = !sortAsc;
			sortDirBtn.innerHTML = sortAsc ? '<i class="fa-solid fa-arrow-down-a-z"></i>' : '<i class="fa-solid fa-arrow-down-z-a"></i>';
			applySort();
		});
	};
	
	const bondPresets = {
		"spring": { stiffness: 0.8, damping: 0.05, type: 'spring', name: 'Spring', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"rope": { stiffness: 8.0, damping: 0.8, type: 'rope', name: 'Rope', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"rod": { stiffness: 50.0, damping: 1.0, type: 'spring', name: 'Rod', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"chain": { stiffness: 15.0, damping: 0.5, type: 'rope', name: 'Chain', nonLinearity: 1.2, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"muscle": { stiffness: 2.0, damping: 0.2, type: 'spring', name: 'Muscle', nonLinearity: 1, breakTension: -1, activeAmp: 0.3, activeFreq: 2.0 },
		"weak": { stiffness: 1.0, damping: 0.1, type: 'spring', name: 'Weak Link', nonLinearity: 1, breakTension: 30, activeAmp: 0, activeFreq: 0 }
	};
	
	const injectCurrentBody = () => {
		const m = parseFloat(document.getElementById('newMass').value);
		const x = parseFloat(document.getElementById('newX').value);
		const y = parseFloat(document.getElementById('newY').value);
		const vx = parseFloat(document.getElementById('newVX').value);
		const vy = parseFloat(document.getElementById('newVY').value);
		const radius = parseFloat(document.getElementById('newRadius').value);
		const ax = parseFloat(document.getElementById('newAX').value) || 0;
		const ay = parseFloat(document.getElementById('newAY').value) || 0;
		
		const charge = parseFloat(document.getElementById('newCharge').value) || 0;
		const magMoment = parseFloat(document.getElementById('newMagMoment').value) || 0;
		const restitution = parseFloat(document.getElementById('newRestitution').value) || 1.0;
		const lifetime = parseFloat(document.getElementById('newLifetime').value) || -1;
		const temperature = parseFloat(document.getElementById('newTemperature').value) || 0;
		const rotationSpeed = parseFloat(document.getElementById('newRotationSpeed').value) || 0;
		const youngModulus = parseFloat(document.getElementById('newYoungModulus').value) || 0;
		const friction = parseFloat(document.getElementById('newFriction').value) || 0.5;
		
		const presetColor = document.getElementById('presetSelect').dataset.color || null;

		Sim.addBody(m, x, y, vx, vy, radius, presetColor, null, ax, ay, 
					charge, magMoment, restitution, 
					lifetime, temperature, rotationSpeed, youngModulus, friction);
	};
	
	const bindRange = (idInput, idDisplay, obj, prop, isFloat = false, prec = 1) => {
		const el = document.getElementById(idInput);
		const disp = document.getElementById(idDisplay);
		if (!el) return;

		el.value = obj[prop];
		if (disp) disp.textContent = isFloat ? obj[prop].toFixed(prec) : obj[prop];

		el.addEventListener('input', () => {
			const val = parseFloat(el.value);
			obj[prop] = val;
			if (disp) disp.textContent = isFloat ? val.toFixed(prec) : val;
		});
	};

	const bindToggle = (idInput, obj, prop, callback) => {
		const el = document.getElementById(idInput);
		if (!el) return;

		el.checked = obj[prop];

		el.addEventListener('change', (e) => {
			obj[prop] = e.target.checked;
			if (callback) callback(e.target.checked);
		});
	};
	
	const toggleFieldDefinition = () => {
		fieldDefContent.classList.toggle('hidden-content');
		toggleFieldDefBtn.innerHTML = fieldDefContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
	};

	const toggleBodiesList = () => {
		bodiesContainer.classList.toggle('hidden-content');
		const sortContainer = document.getElementById('bodySortContainer');
		if (sortContainer) {
			sortContainer.classList.toggle('hidden-content');
		}
		if (toggleBodiesBtn) {
			toggleBodiesBtn.innerHTML = bodiesContainer.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
		}
	};
	
	const setupInjectionPreview = () => {
		const injInputs = ['newMass', 'newRadius', 'newX', 'newY'];
		const addBtn = document.getElementById('addBodyBtn');
		
		const updatePreview = () => {
			const m = parseFloat(document.getElementById('newMass').value) || 0;
			let r = parseFloat(document.getElementById('newRadius').value);
			if (isNaN(r) || r <= 0) {
				r = m > 1 ? Math.max(2, Math.log(m) * 2) : 2;
			}
			const x = parseFloat(document.getElementById('newX').value) || 0;
			const y = parseFloat(document.getElementById('newY').value) || 0;
			const color = document.getElementById('presetSelect').dataset.color;
			
			Render.previewBody = { x, y, radius: r, color };
			Render.showInjectionPreview = true;
		};
		
		const hidePreview = () => {
			Render.showInjectionPreview = false;
		};

		injInputs.forEach(id => {
			const el = document.getElementById(id);
			if (el) {
				el.addEventListener('focus', updatePreview);
				el.addEventListener('input', updatePreview);
				el.addEventListener('blur', hidePreview);
			}
		});

		if (addBtn) {
			addBtn.addEventListener('mouseover', updatePreview);
			addBtn.addEventListener('mouseout', hidePreview);
		}
	};
	
	const originalReset = Sim.reset.bind(Sim);
	const originalAddBody = Sim.addBody.bind(Sim);
	const originalRemoveBody = Sim.removeBody.bind(Sim);
	
	setupDraggable(panel, header, [toolsPanel]);
	setupDraggable(toolsPanel, toolsHeader, [panel]);
	
	document.getElementById('zeroVelBtn').addEventListener('click', () => {
		Sim.zeroVelocities();
		if (window.App.ui && window.App.ui.syncInputs) {
			window.App.ui.syncInputs();
		}
	});

	document.getElementById('reverseVelBtn').addEventListener('click', () => {
		Sim.reverseTime();
		if (window.App.ui && window.App.ui.syncInputs) {
			window.App.ui.syncInputs();
		}
	});

	document.getElementById('cullBtn').addEventListener('click', () => {
		const z = Render.zoom;
		const w = Render.width;
		const h = Render.height;
		
		const minX = (-w / 2 - Render.camX) / z;
		const maxX = (w / 2 - Render.camX) / z;
		const minY = (-h / 2 - Render.camY) / z;
		const maxY = (h / 2 - Render.camY) / z;

		Sim.cullDistant(minX, maxX, minY, maxY);
		refreshBodyList();
	});

	document.getElementById('snapBtn').addEventListener('click', () => {
		Sim.snapToGrid(50);
		if (window.App.ui && window.App.ui.syncInputs) window.App.ui.syncInputs();
	});

	document.getElementById('killRotBtn').addEventListener('click', () => {
		Sim.killRotation();
		if (window.App.ui && window.App.ui.syncInputs) window.App.ui.syncInputs();
	});

	document.getElementById('scatterBtn').addEventListener('click', () => {
		const zoom = Render.zoom;
		const w = Render.width / zoom;
		const h = Render.height / zoom;
		const x = -Render.camX / zoom - w/2;
		const y = -Render.camY / zoom - h/2;
		
		Sim.scatterPositions(x + w*0.1, y + h*0.1, w*0.8, h*0.8);
		if (window.App.ui && window.App.ui.syncInputs) window.App.ui.syncInputs();
	});

	document.getElementById('equalMassBtn').addEventListener('click', () => {
		Sim.equalizeMasses();
		refreshBodyList();
		if (window.App.ui && window.App.ui.syncInputs) window.App.ui.syncInputs();
	});

	document.getElementById('addFieldBtn').addEventListener('click', () => {
		const newField = {
			name: `Field ${Sim.formulaFields.length + 1}`,
			formulaX: '0', 
			formulaY: '0', 
			color: '#f1c40f',
			enabled: true
		};
		
		const compiledX = Sim.compileFormula(newField.formulaX);
		newField.funcEx = compiledX.func;
		newField.errorX = compiledX.error;
		
		const compiledY = Sim.compileFormula(newField.formulaY);
		newField.funcEy = compiledY.func;
		newField.errorY = compiledY.error;
		
		Sim.formulaFields.push(newField);
		refreshFieldList();
		
		if (fieldDefContent.classList.contains('hidden-content')) {
			toggleFieldDefBtn.click();
		}
	});

	document.getElementById('randomizeBtn').addEventListener('click', () => generateRandomParameters(false));

	document.getElementById('resetBtn').addEventListener('click', () => {
		Sim.reset();
		Sim.paused = true;
		
		playBtn.innerHTML = '<i class="fa-solid fa-play"></i> RESUME';
		playBtn.classList.remove('primary');
		playBtn.style.color = "#aaa";
		
		generateRandomParameters(true);
		injectCurrentBody();
		generateRandomParameters(false);
		
		refreshBodyList();
		refreshFieldList();
		Render.draw(); 
	});
	
	document.getElementById('addBodyBtn').addEventListener('click', () => {
		injectCurrentBody();
		const presetSelect = document.getElementById('presetSelect');
		if (presetSelect && presetSelect.value) {
			generateRandomParameters(false, true);
		} else {
			generateRandomParameters(false, false);
		}
	});
	
	document.addEventListener('dblclick', (e) => {
		e.preventDefault();
	}, { passive: false });
	
	toggleBtn.addEventListener('click', () => {
		panel.classList.toggle('collapsed');
		toggleBtn.innerHTML = panel.classList.contains('collapsed') ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-minus"></i>';
	});
	
	toggleToolsBtn.addEventListener('click', () => {
		const willExpand = toolsPanel.classList.contains('collapsed');
		toolsPanel.classList.toggle('collapsed');
		
		if (willExpand) {
			toggleToolsBtn.innerHTML = '<i class="fa-solid fa-minus"></i>';
			
			if (window.innerWidth > 600) {
				const rect = toolsPanel.getBoundingClientRect();
				if (rect.right > window.innerWidth) {
					if (toolsPanel.style.left) {
						const newLeft = window.innerWidth - rect.width - 20;
						toolsPanel.style.left = Math.max(0, newLeft) + 'px';
					} else {
						toolsPanel.style.right = '20px';
						toolsPanel.style.left = 'auto';
					}
				}
			}
		} else {
			toggleToolsBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
		}
	});

	toggleInjBtn.addEventListener('click', () => {
		injContent.classList.toggle('hidden-content');
		toggleInjBtn.innerHTML = injContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
	});
	
	toggleViscosityZoneBtn.addEventListener('click', () => {
		if (Render.drawMode === 'viscosity') {
			Render.drawMode = 'none';
			toggleViscosityZoneBtn.innerHTML = '<i class="fa-solid fa-water"></i> Draw Viscosity (Off)';
			toggleViscosityZoneBtn.classList.remove('primary');
			toggleViscosityZoneBtn.classList.add('secondary');
			Render.canvas.style.cursor = 'default';
		} else {
			Render.drawMode = 'viscosity';
			toggleViscosityZoneBtn.innerHTML = '<i class="fa-solid fa-water"></i> Draw Viscosity (On)';
			toggleViscosityZoneBtn.classList.remove('secondary');
			toggleViscosityZoneBtn.classList.add('primary');
			
			if (toggleZoneDrawBtn) {
				toggleZoneDrawBtn.innerHTML = '<i class="fa-solid fa-pen-ruler"></i> Draw Zone (Off)';
				toggleZoneDrawBtn.classList.remove('primary');
				toggleZoneDrawBtn.classList.add('secondary');
			}
			Render.canvas.style.cursor = 'crosshair';
		}
	});
	
	toggleZoneDrawBtn.addEventListener('click', () => {
		if (Render.drawMode === 'periodic') {
			Render.drawMode = 'none';
			toggleZoneDrawBtn.innerHTML = '<i class="fa-solid fa-pen-ruler"></i> Draw Zone (Off)';
			toggleZoneDrawBtn.classList.remove('primary');
			toggleZoneDrawBtn.classList.add('secondary');
			Render.canvas.style.cursor = 'default';
		} else {
			Render.drawMode = 'periodic';
			toggleZoneDrawBtn.innerHTML = '<i class="fa-solid fa-pen-ruler"></i> Draw Zone (On)';
			toggleZoneDrawBtn.classList.remove('secondary');
			toggleZoneDrawBtn.classList.add('primary');
			Render.canvas.style.cursor = 'crosshair';
		}
	});

	playBtn.addEventListener('click', () => {
		Sim.paused = !Sim.paused;
		if(Sim.paused) {
			playBtn.innerHTML = '<i class="fa-solid fa-play"></i> RESUME';
			playBtn.classList.remove('primary');
			playBtn.style.color = "#aaa";
		} else {
			playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> PAUSE';
			playBtn.classList.add('primary');
			playBtn.style.color = "";
		}
	});
	
	if (toggleDisplayBtn) {
		toggleDisplayBtn.addEventListener('click', () => {
			displayContent.classList.toggle('hidden-content');
			toggleDisplayBtn.innerHTML = displayContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
		});
	}
	
	if (toggleBodiesBtn) {
		toggleBodiesBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			toggleBodiesList();
		});
	}
	
	if (bodiesHeader) {
		bodiesHeader.addEventListener('click', toggleBodiesList);
	}
	
	if (toggleZoneDrawBtn) {
		toggleZoneDrawBtn.addEventListener('click', () => {
			if (Render.drawMode === 'viscosity') {
				toggleViscosityZoneBtn.innerHTML = '<i class="fa-solid fa-water"></i> Draw Viscosity (Off)';
				toggleViscosityZoneBtn.classList.remove('primary');
				toggleViscosityZoneBtn.classList.add('secondary');
			}
		});
	}
	
	if (toggleBarrierToolBtn) {
		toggleBarrierToolBtn.addEventListener('click', () => {
			if (Render.drawMode === 'barrier') {
				Render.drawMode = 'none';
				toggleBarrierToolBtn.innerHTML = '<i class="fa-solid fa-road"></i> Draw Barrier (Off)';
				toggleBarrierToolBtn.classList.remove('primary');
				toggleBarrierToolBtn.classList.add('secondary');
				Render.canvas.style.cursor = 'default';
			} else {
				Render.drawMode = 'barrier';
				toggleBarrierToolBtn.innerHTML = '<i class="fa-solid fa-road"></i> Draw Barrier (On)';
				toggleBarrierToolBtn.classList.remove('secondary');
				toggleBarrierToolBtn.classList.add('primary');
				
				if (toggleBondToolBtn) {
					toggleBondToolBtn.innerHTML = '<i class="fa-solid fa-link"></i> Link Bodies (Off)';
					toggleBondToolBtn.classList.remove('primary');
					toggleBondToolBtn.classList.add('secondary');
				}
				if (toggleViscosityZoneBtn) {
					toggleViscosityZoneBtn.innerHTML = '<i class="fa-solid fa-water"></i> Draw Viscosity (Off)';
					toggleViscosityZoneBtn.classList.remove('primary');
					toggleViscosityZoneBtn.classList.add('secondary');
				}
				if (toggleZoneDrawBtn) {
					toggleZoneDrawBtn.innerHTML = '<i class="fa-solid fa-pen-ruler"></i> Draw Zone (Off)';
					toggleZoneDrawBtn.classList.remove('primary');
					toggleZoneDrawBtn.classList.add('secondary');
				}
				
				Render.canvas.style.cursor = 'crosshair';
			}
		});
		
		if (toggleBondToolBtn) {
			toggleBondToolBtn.addEventListener('click', () => {
				if (Render.drawMode === 'bond') {
					toggleBarrierToolBtn.innerHTML = '<i class="fa-solid fa-road"></i> Draw Barrier (Off)';
					toggleBarrierToolBtn.classList.remove('primary');
					toggleBarrierToolBtn.classList.add('secondary');
				}
			});
		}
		if (toggleViscosityZoneBtn) {
			toggleViscosityZoneBtn.addEventListener('click', () => {
				if (Render.drawMode === 'viscosity') {
					toggleBarrierToolBtn.innerHTML = '<i class="fa-solid fa-road"></i> Draw Barrier (Off)';
					toggleBarrierToolBtn.classList.remove('primary');
					toggleBarrierToolBtn.classList.add('secondary');
				}
			});
		}
		if (toggleZoneDrawBtn) {
			toggleZoneDrawBtn.addEventListener('click', () => {
				if (Render.drawMode === 'periodic') {
					toggleBarrierToolBtn.innerHTML = '<i class="fa-solid fa-road"></i> Draw Barrier (Off)';
					toggleBarrierToolBtn.classList.remove('primary');
					toggleBarrierToolBtn.classList.add('secondary');
				}
			});
		}
	}

	if (toggleFieldZoneToolBtn) {
		toggleFieldZoneToolBtn.addEventListener('click', () => {
			if (Render.drawMode === 'field') {
				Render.drawMode = 'none';
				toggleFieldZoneToolBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Draw Field (Off)';
				toggleFieldZoneToolBtn.classList.remove('primary');
				toggleFieldZoneToolBtn.classList.add('secondary');
				Render.canvas.style.cursor = 'default';
			} else {
				Render.drawMode = 'field';
				toggleFieldZoneToolBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Draw Field (On)';
				toggleFieldZoneToolBtn.classList.remove('secondary');
				toggleFieldZoneToolBtn.classList.add('primary');
				
				if (toggleViscosityZoneBtn) {
					toggleViscosityZoneBtn.innerHTML = '<i class="fa-solid fa-water"></i> Draw Viscosity (Off)';
					toggleViscosityZoneBtn.classList.remove('primary');
					toggleViscosityZoneBtn.classList.add('secondary');
				}
				if (toggleZoneDrawBtn) {
					toggleZoneDrawBtn.innerHTML = '<i class="fa-solid fa-pen-ruler"></i> Draw Zone (Off)';
					toggleZoneDrawBtn.classList.remove('primary');
					toggleZoneDrawBtn.classList.add('secondary');
				}
				if (toggleBondToolBtn) {
					toggleBondToolBtn.innerHTML = '<i class="fa-solid fa-link"></i> Link Bodies (Off)';
					toggleBondToolBtn.classList.remove('primary');
					toggleBondToolBtn.classList.add('secondary');
				}
				if (toggleBarrierToolBtn) {
					toggleBarrierToolBtn.innerHTML = '<i class="fa-solid fa-road"></i> Draw Barrier (Off)';
					toggleBarrierToolBtn.classList.remove('primary');
					toggleBarrierToolBtn.classList.add('secondary');
				}
				
				Render.canvas.style.cursor = 'crosshair';
			}
		});

		// Desactivation croisée pour les autres boutons
		if (toggleViscosityZoneBtn) {
			toggleViscosityZoneBtn.addEventListener('click', () => {
				if (Render.drawMode === 'viscosity') {
					toggleFieldZoneToolBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Draw Field (Off)';
					toggleFieldZoneToolBtn.classList.remove('primary');
					toggleFieldZoneToolBtn.classList.add('secondary');
				}
			});
		}
		if (toggleZoneDrawBtn) {
			toggleZoneDrawBtn.addEventListener('click', () => {
				if (Render.drawMode === 'periodic') {
					toggleFieldZoneToolBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Draw Field (Off)';
					toggleFieldZoneToolBtn.classList.remove('primary');
					toggleFieldZoneToolBtn.classList.add('secondary');
				}
			});
		}
		if (toggleBondToolBtn) {
			toggleBondToolBtn.addEventListener('click', () => {
				if (Render.drawMode === 'bond') {
					toggleFieldZoneToolBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Draw Field (Off)';
					toggleFieldZoneToolBtn.classList.remove('primary');
					toggleFieldZoneToolBtn.classList.add('secondary');
				}
			});
		}
		if (toggleBarrierToolBtn) {
			toggleBarrierToolBtn.addEventListener('click', () => {
				if (Render.drawMode === 'barrier') {
					toggleFieldZoneToolBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Draw Field (Off)';
					toggleFieldZoneToolBtn.classList.remove('primary');
					toggleFieldZoneToolBtn.classList.add('secondary');
				}
			});
		}
	}

	if (toggleBondToolBtn) {
		toggleBondToolBtn.addEventListener('click', () => {
			if (Render.drawMode === 'bond') {
				Render.drawMode = 'none';
				toggleBondToolBtn.innerHTML = '<i class="fa-solid fa-link"></i> Link Bodies (Off)';
				toggleBondToolBtn.classList.remove('primary');
				toggleBondToolBtn.classList.add('secondary');
				Render.canvas.style.cursor = 'default';
			} else {
				Render.drawMode = 'bond';
				toggleBondToolBtn.innerHTML = '<i class="fa-solid fa-link"></i> Link Bodies (On)';
				toggleBondToolBtn.classList.remove('secondary');
				toggleBondToolBtn.classList.add('primary');
				
				if (toggleViscosityZoneBtn) {
					toggleViscosityZoneBtn.innerHTML = '<i class="fa-solid fa-water"></i> Draw Viscosity (Off)';
					toggleViscosityZoneBtn.classList.remove('primary');
					toggleViscosityZoneBtn.classList.add('secondary');
				}
				if (toggleZoneDrawBtn) {
					toggleZoneDrawBtn.innerHTML = '<i class="fa-solid fa-pen-ruler"></i> Draw Zone (Off)';
					toggleZoneDrawBtn.classList.remove('primary');
					toggleZoneDrawBtn.classList.add('secondary');
				}
				
				Render.canvas.style.cursor = 'crosshair';
			}
		});
		
		if (toggleViscosityZoneBtn) {
			toggleViscosityZoneBtn.addEventListener('click', () => {
				if (Render.drawMode === 'viscosity') {
					toggleBondToolBtn.innerHTML = '<i class="fa-solid fa-link"></i> Link Bodies (Off)';
					toggleBondToolBtn.classList.remove('primary');
					toggleBondToolBtn.classList.add('secondary');
				}
			});
		}
		
		if (toggleZoneDrawBtn) {
			toggleZoneDrawBtn.addEventListener('click', () => {
				if (Render.drawMode === 'periodic') {
					toggleBondToolBtn.innerHTML = '<i class="fa-solid fa-link"></i> Link Bodies (Off)';
					toggleBondToolBtn.classList.remove('primary');
					toggleBondToolBtn.classList.add('secondary');
				}
			});
		}
	}

	if (bondToolBtn) {
		const presetContainer = document.createElement('div');
		presetContainer.style.marginBottom = '8px';
		presetContainer.innerHTML = `
			<div class="control-row" style="margin-bottom:4px;"><label>Bond Preset</label></div>
			<select id="bondPresetSelect" style="width:100%; padding:6px; background:var(--input-bg); border:1px solid var(--input-border); color:var(--text-primary); border-radius:3px; outline:none; font-family:var(--font-ui); font-size:11px;">
				<option value="spring">Spring (Default)</option>
				<option value="rope">Rope (Tension only)</option>
				<option value="rod">Rigid Rod</option>
				<option value="chain">Chain (Non-linear)</option>
				<option value="muscle">Muscle (Active)</option>
				<option value="weak">Weak Link (Breakable)</option>
			</select>
		`;
		
		bondToolBtn.parentNode.insertBefore(presetContainer, bondToolBtn.nextSibling.nextSibling); // Insert after divider-sub if present
	}
	
	if (toggleFieldDefBtn) {
		toggleFieldDefBtn.addEventListener('click', toggleFieldDefinition);
	}
	
	if (fieldDefContent.classList.contains('hidden-content')) {
		toggleFieldDefBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
	} else {
		toggleFieldDefBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
	}
	
	function createBodyCard(body, index) {
		const div = document.createElement('div');
		div.className = 'body-card';
		div.style.borderLeftColor = body.color;
		div.dataset.index = index;
		div.setAttribute('draggable', 'true');

		div.innerHTML = `
			<div class="card-header">
				<span class="body-id">
					<div class="body-color-wrapper">
						<span class="body-color-dot" style="background-color: ${body.color}; box-shadow: 0 0 5px ${body.color}"></span>
						<input type="color" class="color-input-hidden" value="${body.color.startsWith('#') ? body.color : '#ffffff'}">
					</div>
					<input type="text" class="body-name-input" value="${body.name}">
				</span>
				<button class="btn-delete" title="Supprimer"><i class="fa-solid fa-trash"></i></button>
			</div>
			<div class="card-grid">
				<div class="mini-input-group"><label>Mass</label><input type="text" class="inp-mass" value="${body.mass}"></div>
				<div class="mini-input-group"><label>Radius</label><input type="text" class="inp-radius" value="${body.radius}"></div>
				<div class="mini-input-group"><label>Restitution</label><input type="text" class="inp-restitution" value="${body.restitution}"></div>
				<div class="mini-input-group"><label>Position X</label><input type="text" class="inp-x" value="${body.x}"></div>
				<div class="mini-input-group"><label>Position Y</label><input type="text" class="inp-y" value="${body.y}"></div>
				<div class="mini-input-group"><label>Charge (e)</label><input type="text" class="inp-charge" value="${body.charge}"></div>
				<div class="mini-input-group"><label>Velocity X</label><input type="text" class="inp-vx" value="${body.vx}"></div>
				<div class="mini-input-group"><label>Velocity Y</label><input type="text" class="inp-vy" value="${body.vy}"></div>
				<div class="mini-input-group"><label>Mag Moment</label><input type="text" class="inp-magMoment" value="${body.magMoment}"></div>
				<div class="mini-input-group"><label>Start Acc X</label><input type="text" class="inp-start-ax" value="${body.startAx}"></div>
				<div class="mini-input-group"><label>Start Acc Y</label><input type="text" class="inp-start-ay" value="${body.startAy}"></div>
				<div class="mini-input-group"><label>Rotation Speed</label><input type="text" class="inp-rotSpeed" value="${body.rotationSpeed}"></div>
				<div class="mini-input-group"><label>Temperature</label><input type="text" class="inp-temp" value="${body.temperature}"></div>
				<div class="mini-input-group"><label>Young's Mod.</label><input type="text" class="inp-youngMod" value="${body.youngModulus}"></div>
				<div class="mini-input-group"><label>Friction</label><input type="text" class="inp-friction" value="${body.friction}"></div>
				<div class="mini-input-group"><label>Lifetime</label><input type="text" class="inp-lifetime" value="${body.lifetime}"></div>
			</div>
		`;

		const nameInput = div.querySelector('.body-name-input');
		nameInput.addEventListener('change', (e) => {
			body.name = e.target.value;
		});
		
		nameInput.addEventListener('mousedown', (e) => e.stopPropagation());

		const colorInput = div.querySelector('.color-input-hidden');
		const colorDot = div.querySelector('.body-color-dot');
		
		colorInput.addEventListener('input', (e) => {
			body.color = e.target.value;
			colorDot.style.backgroundColor = body.color;
			colorDot.style.boxShadow = `0 0 5px ${body.color}`;
			div.style.borderLeftColor = body.color;
		});
		colorInput.addEventListener('mousedown', (e) => e.stopPropagation());

		div.querySelector('.btn-delete').addEventListener('click', (e) => {
			e.stopPropagation();
			Sim.bodies.splice(index, 1);
			refreshBodyList();
		});

		const inpMass = div.querySelector('.inp-mass');
		const inpRadius = div.querySelector('.inp-radius');
		const inpX = div.querySelector('.inp-x');
		const inpY = div.querySelector('.inp-y');
		const inpVX = div.querySelector('.inp-vx');
		const inpVY = div.querySelector('.inp-vy');
		const inpAX = div.querySelector('.inp-start-ax');
		const inpAY = div.querySelector('.inp-start-ay');
		
		const inpCharge = div.querySelector('.inp-charge');
		const inpMagMoment = div.querySelector('.inp-magMoment');
		const inpRestitution = div.querySelector('.inp-restitution');
		const inpLifetime = div.querySelector('.inp-lifetime');
		const inpTemp = div.querySelector('.inp-temp');
		const inpRotSpeed = div.querySelector('.inp-rotSpeed');
		const inpYoungMod = div.querySelector('.inp-youngMod');
		const inpFriction = div.querySelector('.inp-friction');

		const updatePhysics = () => {
			const rawMass = parseFloat(inpMass.value);
			body.mass = (rawMass === -1 || rawMass > 0) ? rawMass : 1;
			if (body.mass !== rawMass) inpMass.value = body.mass;

			const rawRadius = parseFloat(inpRadius.value);
			body.radius = rawRadius > 0.1 ? rawRadius : 2;
			if (body.radius !== rawRadius) inpRadius.value = body.radius;

			body.x = parseFloat(inpX.value) || 0;
			body.y = parseFloat(inpY.value) || 0;
			body.vx = parseFloat(inpVX.value) || 0;
			body.vy = parseFloat(inpVY.value) || 0;
			body.startAx = parseFloat(inpAX.value) || 0;
			body.startAy = parseFloat(inpAY.value) || 0;
			
			body.charge = parseFloat(inpCharge.value) || 0;
			body.magMoment = parseFloat(inpMagMoment.value) || 0;

			const rawRestitution = parseFloat(inpRestitution.value);
			body.restitution = rawRestitution >= 0 ? rawRestitution : 1.0;
			if (body.restitution !== rawRestitution) inpRestitution.value = body.restitution;

			const rawLifetime = parseFloat(inpLifetime.value);
			body.lifetime = (rawLifetime >= -1) ? rawLifetime : -1;
			if (body.lifetime !== rawLifetime) inpLifetime.value = body.lifetime;
			
			const rawTemp = parseFloat(inpTemp.value);
			body.temperature = rawTemp >= 0 ? rawTemp : 0;
			if (body.temperature !== rawTemp) inpTemp.value = body.temperature;

			body.rotationSpeed = parseFloat(inpRotSpeed.value) || 0;
			
			const rawYoung = parseFloat(inpYoungMod.value);
			body.youngModulus = rawYoung >= 0 ? rawYoung : 0;
			if (body.youngModulus !== rawYoung) inpYoungMod.value = body.youngModulus;

			const rawFriction = parseFloat(inpFriction.value);
			body.friction = rawFriction >= 0 ? rawFriction : 0.5;
			if (body.friction !== rawFriction) inpFriction.value = body.friction;
		};

		[inpMass, inpRadius, inpX, inpY, inpVX, inpVY, inpAX, inpAY,
		 inpCharge, inpMagMoment, inpRestitution, inpLifetime, inpTemp, 
		 inpRotSpeed, inpYoungMod, inpFriction].forEach(inp => {
			addMathParsing(inp);
			inp.addEventListener('change', updatePhysics);
			inp.addEventListener('mousedown', (e) => e.stopPropagation());
		});
		
		div.addEventListener('dragstart', (e) => {
			if (e.target !== div) {
				e.preventDefault();
				return;
			}
			draggedItemIndex = index;
			div.classList.add('dragging');
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', index);
		});

		div.addEventListener('dragend', () => {
			div.classList.remove('dragging');
			draggedItemIndex = null;
		});

		div.addEventListener('dragover', (e) => {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';
		});

		div.addEventListener('drop', (e) => {
			e.preventDefault();
			if (draggedItemIndex === null || draggedItemIndex === index) return;

			const targetIndex = index;
			const movedBody = Sim.bodies[draggedItemIndex];
			Sim.bodies.splice(draggedItemIndex, 1);
			Sim.bodies.splice(targetIndex, 0, movedBody);
			
			if (Render.selectedBodyIdx === draggedItemIndex) {
				Render.selectedBodyIdx = targetIndex;
			} else if (draggedItemIndex < targetIndex && Render.selectedBodyIdx > draggedItemIndex && Render.selectedBodyIdx <= targetIndex) {
				Render.selectedBodyIdx--;
			} else if (draggedItemIndex > targetIndex && Render.selectedBodyIdx < draggedItemIndex && Render.selectedBodyIdx >= targetIndex) {
				Render.selectedBodyIdx++;
			}

			refreshBodyList();
		});

		return div;
	}
	
	function refreshBodyList() {
		bodiesContainer.innerHTML = '';
		bodyCountLabel.textContent = Sim.bodies.length;
		
		Sim.bodies.forEach((body, index) => {
			const card = createBodyCard(body, index);
			card.addEventListener('click', (e) => {
				if (e.target.tagName !== 'INPUT' && !e.target.closest('.btn-delete')) {
					Render.selectedBodyIdx = index;
					window.App.ui.highlightBody(index);
				}
			});
			bodiesContainer.appendChild(card);
		});
		
		if (Render.selectedBodyIdx !== -1) {
			window.App.ui.highlightBody(Render.selectedBodyIdx);
		}
	}
	
	function createFieldCard(field, index) {
		const div = document.createElement('div');
		div.className = 'field-card';
		
		if (Render.selectedFormulaFieldIdx === index) {
			div.style.backgroundColor = 'rgba(45, 140, 240, 0.15)';
			div.style.borderColor = 'var(--accent)';
		}

		div.addEventListener('click', (e) => {
			if (e.target.tagName !== 'INPUT' && !e.target.closest('button') && !e.target.classList.contains('toggle-switch')) {
				Render.selectedFormulaFieldIdx = index;
				refreshFieldList();
			}
		});

		const renderErrors = () => {
			const errorXEl = div.querySelector('.error-x');
			const errorYEl = div.querySelector('.error-y');
			
			errorXEl.textContent = field.errorX || '';
			errorYEl.textContent = field.errorY || '';
			
			errorXEl.style.display = field.errorX ? 'block' : 'none';
			errorYEl.style.display = field.errorY ? 'block' : 'none';
		};
		
		const updateField = () => {
			field.name = div.querySelector('.inp-field-name').value;
			field.formulaX = div.querySelector('.inp-formula-x').value;
			field.formulaY = div.querySelector('.inp-formula-y').value;
			
			const compiledX = Sim.compileFormula(field.formulaX);
			field.funcEx = compiledX.func;
			field.errorX = compiledX.error;

			const compiledY = Sim.compileFormula(field.formulaY);
			field.funcEy = compiledY.func;
			field.errorY = compiledY.error;
			
			renderErrors();
		};

		div.innerHTML = `
			<div class="field-card-header">
				<div style="display: flex; align-items: center; gap: 5px;">
					<input type="color" class="field-color" value="${field.color || '#f1c40f'}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
					<input type="text" class="inp-field-name" value="${field.name}" style="background:transparent; border:none; color:var(--accent); font-weight:bold; width:120px;">
				</div>
				<div style="display:flex; align-items:center; gap:8px;">
					<label class="toggle-row" style="margin:0;">
						<input type="checkbox" class="inp-field-enabled" ${field.enabled ? 'checked' : ''}>
						<div class="toggle-switch" style="transform:scale(0.8);"></div>
					</label>
					<button class="btn-delete" title="Remove Field"><i class="fa-solid fa-trash"></i></button>
				</div>
			</div>
			
			<div class="field-input-group" style="margin-top: 5px;">
				<label>E_x Formula (vars: x, y, G, c, Ke, Km, t, PI, E)</label>
				<input type="text" class="inp-formula-x" value="${field.formulaX}">
				<div class="tech-desc error-x" style="display:none; color: var(--danger); margin-left: 0; padding-left: 5px; border-left-color: var(--danger);"></div>
			</div>
			<div class="field-input-group">
				<label>E_y Formula (vars: x, y, G, c, Ke, Km, t, PI, E)</label>
				<input type="text" class="inp-formula-y" value="${field.formulaY}">
				<div class="tech-desc error-y" style="display:none; color: var(--danger); margin-left: 0; padding-left: 5px; border-left-color: var(--danger);"></div>
			</div>
		`;
		
		renderErrors();

		div.querySelector('.field-color').addEventListener('input', (e) => {
			field.color = e.target.value;
		});

		div.querySelector('.inp-field-enabled').addEventListener('change', (e) => {
			field.enabled = e.target.checked;
		});

		div.querySelector('.inp-field-name').addEventListener('change', updateField);
		div.querySelector('.inp-field-name').addEventListener('click', (e) => e.stopPropagation());
		
		div.querySelector('.inp-formula-x').addEventListener('input', updateField);
		div.querySelector('.inp-formula-y').addEventListener('input', updateField);
		
		div.querySelector('.btn-delete').addEventListener('click', (e) => {
			e.stopPropagation();
			Sim.formulaFields.splice(index, 1);
			if (Render.selectedFormulaFieldIdx === index) Render.selectedFormulaFieldIdx = -1;
			refreshFieldList();
		});

		return div;
	}
	
	function refreshFieldList() {
		fieldsListContainer.innerHTML = '';
		Sim.formulaFields.forEach((field, index) => {
			if (!field.funcEx || !field.funcEy) {
				const compiledX = Sim.compileFormula(field.formulaX);
				field.funcEx = compiledX.func;
				field.errorX = compiledX.error;
				
				const compiledY = Sim.compileFormula(field.formulaY);
				field.funcEy = compiledY.func;
				field.errorY = compiledY.error;
			}
			
			const card = createFieldCard(field, index);
			fieldsListContainer.appendChild(card);
		});
	}
	
	function refreshViscosityZoneList() {
		viscosityZonesListContainer.innerHTML = '';
		Sim.viscosityZones.forEach((zone) => {
			const div = document.createElement('div');
			div.className = 'zone-card';
			if (Render.selectedViscosityZoneId === zone.id) {
				div.classList.add('active');
			}
			
			div.addEventListener('click', (e) => {
				if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && !e.target.closest('button') && !e.target.classList.contains('toggle-switch')) {
					Render.selectedViscosityZoneId = zone.id;
					refreshViscosityZoneList();
				}
			});

			div.innerHTML = `
				<div class="zone-header">
					<div style="display: flex; align-items: center; gap: 5px;">
						<input type="color" class="zone-color" value="${zone.color || '#3498db'}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
						<input type="text" class="zone-name" value="${zone.name}">
					</div>
					<div style="display:flex; align-items:center; gap:8px;">
						<label class="toggle-row" style="margin:0;">
							<input type="checkbox" class="inp-zone-enabled" ${zone.enabled ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.8);"></div>
						</label>
						<button class="btn-delete" title="Remove Zone"><i class="fa-solid fa-trash"></i></button>
					</div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr;">
					<div class="mini-input-group"><label>Position X</label><input type="number" class="inp-zx" value="${zone.x.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Position Y</label><input type="number" class="inp-zy" value="${zone.y.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Width</label><input type="number" class="inp-zw" value="${zone.width.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Height</label><input type="number" class="inp-zh" value="${zone.height.toFixed(1)}"></div>
				</div>
				<div class="mini-input-group" style="margin-top:4px;">
					<label>Viscosity Coeff.</label>
					<input type="number" class="inp-zvis" value="${zone.viscosity.toFixed(2)}" step="0.01">
				</div>
			`;
			
			const enabledInput = div.querySelector('.inp-zone-enabled');
			enabledInput.addEventListener('change', (e) => { zone.enabled = e.target.checked; });

			const colorInput = div.querySelector('.zone-color');
			colorInput.addEventListener('input', (e) => { zone.color = e.target.value; });

			const nameInput = div.querySelector('.zone-name');
			nameInput.addEventListener('change', (e) => { zone.name = e.target.value; });
			
			const inpX = div.querySelector('.inp-zx');
			const inpY = div.querySelector('.inp-zy');
			const inpW = div.querySelector('.inp-zw');
			const inpH = div.querySelector('.inp-zh');
			const inpVis = div.querySelector('.inp-zvis');
			
			const updateZone = () => {
				zone.x = parseFloat(inpX.value) || 0;
				zone.y = parseFloat(inpY.value) || 0;
				
				const rawW = parseFloat(inpW.value);
				zone.width = rawW > 1 ? rawW : 100;
				if (zone.width !== rawW) inpW.value = zone.width;

				const rawH = parseFloat(inpH.value);
				zone.height = rawH > 1 ? rawH : 100;
				if (zone.height !== rawH) inpH.value = zone.height;

				zone.viscosity = parseFloat(inpVis.value) || 0;
			};
			
			[inpX, inpY, inpW, inpH, inpVis].forEach(inp => {
				addMathParsing(inp);
				inp.addEventListener('change', updateZone);
				inp.addEventListener('input', updateZone);
			});
			
			div.querySelector('.btn-delete').addEventListener('click', (e) => {
				e.stopPropagation();
				Sim.removeViscosityZone(zone.id);
				if (Render.selectedViscosityZoneId === zone.id) Render.selectedViscosityZoneId = null;
				refreshViscosityZoneList();
			});

			viscosityZonesListContainer.appendChild(div);
		});
	}
	
	function refreshSolidBarrierList() {
		if (!barriersListContainer) return;
		barriersListContainer.innerHTML = '';
		Sim.solidBarriers.forEach((barrier) => {
			const div = document.createElement('div');
			div.className = 'zone-card';
			if (Render.selectedBarrierId === barrier.id) {
				div.classList.add('active');
			}
			
			div.addEventListener('click', (e) => {
				if (e.target.tagName !== 'INPUT' && !e.target.closest('button') && !e.target.classList.contains('toggle-switch')) {
					Render.selectedBarrierId = barrier.id;
					refreshSolidBarrierList();
				}
			});

			div.innerHTML = `
				<div class="zone-header">
					<div style="display: flex; align-items: center; gap: 5px;">
						<input type="color" class="barrier-color" value="${barrier.color || '#8e44ad'}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
						<input type="text" class="barrier-name" value="${barrier.name}" style="width: 80px;">
					</div>
					<div style="display:flex; align-items:center; gap:8px;">
						<label class="toggle-row" style="margin:0;">
							<input type="checkbox" class="inp-barrier-enabled" ${barrier.enabled ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.8);"></div>
						</label>
						<button class="btn-delete" title="Remove Barrier"><i class="fa-solid fa-trash"></i></button>
					</div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr;">
					<div class="mini-input-group"><label>X1</label><input type="number" class="inp-bx1" value="${barrier.x1.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Y1</label><input type="number" class="inp-by1" value="${barrier.y1.toFixed(1)}"></div>
					<div class="mini-input-group"><label>X2</label><input type="number" class="inp-bx2" value="${barrier.x2.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Y2</label><input type="number" class="inp-by2" value="${barrier.y2.toFixed(1)}"></div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr; margin-top:4px;">
					<div class="mini-input-group"><label>Restitution</label><input type="number" class="inp-brest" value="${barrier.restitution.toFixed(2)}" step="0.05" min="0" max="2"></div>
					<div class="mini-input-group"><label>Friction</label><input type="number" class="inp-bfric" value="${(barrier.friction !== undefined ? barrier.friction : 0.5).toFixed(2)}" step="0.05" min="0" max="2"></div>
				</div>
			`;
			
			div.querySelector('.inp-barrier-enabled').addEventListener('change', (e) => { barrier.enabled = e.target.checked; });
			div.querySelector('.barrier-color').addEventListener('input', (e) => { barrier.color = e.target.value; });
			div.querySelector('.barrier-name').addEventListener('change', (e) => { barrier.name = e.target.value; });
			
			const inpX1 = div.querySelector('.inp-bx1');
			const inpY1 = div.querySelector('.inp-by1');
			const inpX2 = div.querySelector('.inp-bx2');
			const inpY2 = div.querySelector('.inp-by2');
			const inpRest = div.querySelector('.inp-brest');
			const inpFric = div.querySelector('.inp-bfric');
			
			const updateBarrier = () => {
				barrier.x1 = parseFloat(inpX1.value) || 0;
				barrier.y1 = parseFloat(inpY1.value) || 0;
				barrier.x2 = parseFloat(inpX2.value) || 0;
				barrier.y2 = parseFloat(inpY2.value) || 0;
				
				const rawRest = parseFloat(inpRest.value);
				barrier.restitution = rawRest >= 0 ? rawRest : 0.8;
				if (barrier.restitution !== rawRest) inpRest.value = barrier.restitution;

				const rawFric = parseFloat(inpFric.value);
				barrier.friction = rawFric >= 0 ? rawFric : 0.5;
				if (barrier.friction !== rawFric) inpFric.value = barrier.friction;
			};
			
			[inpX1, inpY1, inpX2, inpY2, inpRest, inpFric].forEach(inp => {
				addMathParsing(inp);
				inp.addEventListener('change', updateBarrier);
				inp.addEventListener('input', updateBarrier);
			});
			
			div.querySelector('.btn-delete').addEventListener('click', (e) => {
				e.stopPropagation();
				Sim.removeSolidBarrier(barrier.id);
				if (Render.selectedBarrierId === barrier.id) Render.selectedBarrierId = null;
				refreshSolidBarrierList();
			});

			barriersListContainer.appendChild(div);
		});
	}
	
	function refreshElasticBondList() {
		if (!bondsListContainer) return;
		bondsListContainer.innerHTML = '';
		Sim.elasticBonds.forEach((bond) => {
			const div = document.createElement('div');
			div.className = 'zone-card';
			if (Render.selectedBondId === bond.id) {
				div.classList.add('active');
			}
			
			const b1Name = Sim.bodies[bond.body1] ? Sim.bodies[bond.body1].name : `#${bond.body1}`;
			const b2Name = Sim.bodies[bond.body2] ? Sim.bodies[bond.body2].name : `#${bond.body2}`;
			
			div.addEventListener('click', (e) => {
				if (e.target.tagName !== 'INPUT' && !e.target.closest('button') && !e.target.classList.contains('toggle-switch') && e.target.tagName !== 'SELECT') {
					Render.selectedBondId = bond.id;
					refreshElasticBondList();
				}
			});

			div.innerHTML = `
				<div class="zone-header">
					<div style="display: flex; align-items: center; gap: 5px;">
						<input type="color" class="bond-color" value="${bond.color || '#ffffff'}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
						<input type="text" class="bond-name" value="${bond.name}" style="width: 80px;">
					</div>
					<div style="display:flex; align-items:center; gap:8px;">
						<label class="toggle-row" style="margin:0;">
							<input type="checkbox" class="inp-bond-enabled" ${bond.enabled ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.8);"></div>
						</label>
						<button class="btn-delete" title="Remove Bond"><i class="fa-solid fa-trash"></i></button>
					</div>
				</div>
				<div style="font-size:9px; color:var(--text-secondary); margin-bottom:4px;">
					${b1Name} <i class="fa-solid fa-link"></i> ${b2Name}
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr;">
					<div class="mini-input-group"><label>Stiffness (k)</label><input type="number" class="inp-bstiff" value="${bond.stiffness.toFixed(2)}" step="0.01"></div>
					<div class="mini-input-group"><label>Damping</label><input type="number" class="inp-bdamp" value="${bond.damping.toFixed(2)}" step="0.01"></div>
					<div class="mini-input-group"><label>Length</label><input type="number" class="inp-blen" value="${bond.length.toFixed(1)}" step="1"></div>
					<div class="mini-input-group"><label>Type</label>
						<select class="inp-btype" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid #3a3a3a; color:#e0e0e0; font-size:10px; border-radius:2px;">
							<option value="spring" ${bond.type === 'spring' ? 'selected' : ''}>Spring</option>
							<option value="rope" ${bond.type === 'rope' ? 'selected' : ''}>Rope</option>
							<option value="chain" ${bond.type === 'chain' ? 'selected' : ''}>Chain</option>
						</select>
					</div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr; margin-top:4px;">
					<div class="mini-input-group"><label>Non-Linearity</label><input type="number" class="inp-bnonlin" value="${(bond.nonLinearity || 1).toFixed(2)}" step="0.1"></div>
					<div class="mini-input-group"><label>Break Tension</label><input type="number" class="inp-bbreak" value="${(bond.breakTension || -1)}" step="1"></div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr; margin-top:4px;">
					<div class="mini-input-group"><label>Active Amp</label><input type="number" class="inp-bactivea" value="${(bond.activeAmp || 0).toFixed(2)}" step="0.05"></div>
					<div class="mini-input-group"><label>Active Freq</label><input type="number" class="inp-bactivef" value="${(bond.activeFreq || 0).toFixed(2)}" step="0.1"></div>
				</div>
			`;
			
			div.querySelector('.inp-bond-enabled').addEventListener('change', (e) => { bond.enabled = e.target.checked; });
			div.querySelector('.bond-color').addEventListener('input', (e) => { bond.color = e.target.value; });
			div.querySelector('.bond-name').addEventListener('change', (e) => { bond.name = e.target.value; });
			div.querySelector('.inp-btype').addEventListener('change', (e) => { bond.type = e.target.value; });
			
			const inpStiff = div.querySelector('.inp-bstiff');
			const inpDamp = div.querySelector('.inp-bdamp');
			const inpLen = div.querySelector('.inp-blen');
			const inpNonLin = div.querySelector('.inp-bnonlin');
			const inpBreak = div.querySelector('.inp-bbreak');
			const inpAmp = div.querySelector('.inp-bactivea');
			const inpFreq = div.querySelector('.inp-bactivef');
			
			const updateBond = () => {
				bond.stiffness = parseFloat(inpStiff.value) || 0;
				bond.damping = parseFloat(inpDamp.value) || 0;
				bond.length = parseFloat(inpLen.value) || 0;
				bond.nonLinearity = parseFloat(inpNonLin.value) || 1;
				bond.breakTension = parseFloat(inpBreak.value) || -1;
				bond.activeAmp = parseFloat(inpAmp.value) || 0;
				bond.activeFreq = parseFloat(inpFreq.value) || 0;
			};
			
			[inpStiff, inpDamp, inpLen, inpNonLin, inpBreak, inpAmp, inpFreq].forEach(inp => {
				addMathParsing(inp);
				inp.addEventListener('change', updateBond);
				inp.addEventListener('input', updateBond);
			});
			
			div.querySelector('.btn-delete').addEventListener('click', (e) => {
				e.stopPropagation();
				Sim.removeElasticBond(bond.id);
				if (Render.selectedBondId === bond.id) Render.selectedBondId = null;
				refreshElasticBondList();
			});

			bondsListContainer.appendChild(div);
		});
	}
	
	function refreshFieldZoneList() {
		if (!fieldZonesListContainer) return;
		fieldZonesListContainer.innerHTML = '';
		Sim.fieldZones.forEach((zone) => {
			const div = document.createElement('div');
			div.className = 'zone-card';
			if (Render.selectedFieldZoneId === zone.id) {
				div.classList.add('active');
			}
			
			div.addEventListener('click', (e) => {
				if (e.target.tagName !== 'INPUT' && !e.target.closest('button') && !e.target.classList.contains('toggle-switch')) {
					Render.selectedFieldZoneId = zone.id;
					refreshFieldZoneList();
				}
			});

			div.innerHTML = `
				<div class="zone-header">
					<div style="display: flex; align-items: center; gap: 5px;">
						<input type="color" class="zone-color" value="${zone.color || '#27ae60'}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
						<input type="text" class="zone-name" value="${zone.name}" style="width: 80px;">
					</div>
					<div style="display:flex; align-items:center; gap:8px;">
						<label class="toggle-row" style="margin:0;">
							<input type="checkbox" class="inp-zone-enabled" ${zone.enabled ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.8);"></div>
						</label>
						<button class="btn-delete" title="Remove Field"><i class="fa-solid fa-trash"></i></button>
					</div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr;">
					<div class="mini-input-group"><label>Pos X</label><input type="number" class="inp-zx" value="${zone.x.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Pos Y</label><input type="number" class="inp-zy" value="${zone.y.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Width</label><input type="number" class="inp-zw" value="${zone.width.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Height</label><input type="number" class="inp-zh" value="${zone.height.toFixed(1)}"></div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr; margin-top:4px;">
					<div class="mini-input-group"><label>Acc X</label><input type="number" class="inp-zfx" value="${zone.fx.toFixed(3)}" step="0.01"></div>
					<div class="mini-input-group"><label>Acc Y</label><input type="number" class="inp-zfy" value="${zone.fy.toFixed(3)}" step="0.01"></div>
				</div>
			`;
			
			div.querySelector('.inp-zone-enabled').addEventListener('change', (e) => { zone.enabled = e.target.checked; });
			div.querySelector('.zone-color').addEventListener('input', (e) => { zone.color = e.target.value; });
			div.querySelector('.zone-name').addEventListener('change', (e) => { zone.name = e.target.value; });
			
			const inpX = div.querySelector('.inp-zx');
			const inpY = div.querySelector('.inp-zy');
			const inpW = div.querySelector('.inp-zw');
			const inpH = div.querySelector('.inp-zh');
			const inpFx = div.querySelector('.inp-zfx');
			const inpFy = div.querySelector('.inp-zfy');
			
			const updateZone = () => {
				zone.x = parseFloat(inpX.value) || 0;
				zone.y = parseFloat(inpY.value) || 0;
				
				const rawW = parseFloat(inpW.value);
				zone.width = rawW > 1 ? rawW : 100;
				if (zone.width !== rawW) inpW.value = zone.width;

				const rawH = parseFloat(inpH.value);
				zone.height = rawH > 1 ? rawH : 100;
				if (zone.height !== rawH) inpH.value = zone.height;

				zone.fx = parseFloat(inpFx.value) || 0;
				zone.fy = parseFloat(inpFy.value) || 0;
			};
			
			[inpX, inpY, inpW, inpH, inpFx, inpFy].forEach(inp => {
				inp.addEventListener('change', updateZone);
				inp.addEventListener('input', updateZone);
			});
			
			div.querySelector('.btn-delete').addEventListener('click', (e) => {
				e.stopPropagation();
				Sim.removeFieldZone(zone.id);
				if (Render.selectedFieldZoneId === zone.id) Render.selectedFieldZoneId = null;
				refreshFieldZoneList();
			});

			fieldZonesListContainer.appendChild(div);
		});
	}

	function refreshZoneList() {
		zonesListContainer.innerHTML = '';
		Sim.periodicZones.forEach((zone) => {
			const div = document.createElement('div');
			div.className = 'zone-card';
			if (Render.selectedZoneId === zone.id) {
				div.classList.add('active');
			}
			
			div.addEventListener('click', (e) => {
				if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && !e.target.closest('button') && !e.target.classList.contains('toggle-switch')) {
					Render.selectedZoneId = zone.id;
					refreshZoneList();
				}
			});

			div.innerHTML = `
				<div class="zone-header">
					<div style="display: flex; align-items: center; gap: 5px;">
						<input type="color" class="zone-color" value="${zone.color || '#e67e22'}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
						<input type="text" class="zone-name" value="${zone.name}">
					</div>
					<div style="display:flex; align-items:center; gap:8px;">
						<label class="toggle-row" style="margin:0;">
							<input type="checkbox" class="inp-zone-enabled" ${zone.enabled ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.8);"></div>
						</label>
						<button class="btn-delete" title="Remove Zone"><i class="fa-solid fa-trash"></i></button>
					</div>
				</div>
				<div class="card-grid" style="grid-template-columns: 1fr 1fr;">
					<div class="mini-input-group"><label>Position X</label><input type="number" class="inp-zx" value="${zone.x.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Position Y</label><input type="number" class="inp-zy" value="${zone.y.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Width</label><input type="number" class="inp-zw" value="${zone.width.toFixed(1)}"></div>
					<div class="mini-input-group"><label>Height</label><input type="number" class="inp-zh" value="${zone.height.toFixed(1)}"></div>
				</div>
				<div class="mini-input-group" style="margin-top:4px;">
					<label>Trigger Mode</label>
					<select class="inp-ztype" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid #3a3a3a; color:#e0e0e0; font-size:10px; border-radius:2px;">
						<option value="center" ${zone.type === 'center' ? 'selected' : ''}>Center (Default)</option>
						<option value="radius" ${zone.type === 'radius' ? 'selected' : ''}>Radius (Edges)</option>
					</select>
				</div>
			`;
			
			const enabledInput = div.querySelector('.inp-zone-enabled');
			enabledInput.addEventListener('change', (e) => { zone.enabled = e.target.checked; });

			const colorInput = div.querySelector('.zone-color');
			colorInput.addEventListener('input', (e) => { zone.color = e.target.value; });

			const nameInput = div.querySelector('.zone-name');
			nameInput.addEventListener('change', (e) => { zone.name = e.target.value; });
			
			const typeSelect = div.querySelector('.inp-ztype');
			typeSelect.addEventListener('change', (e) => { zone.type = e.target.value; });
			
			const inpX = div.querySelector('.inp-zx');
			const inpY = div.querySelector('.inp-zy');
			const inpW = div.querySelector('.inp-zw');
			const inpH = div.querySelector('.inp-zh');
			
			const updateZone = () => {
				zone.x = parseFloat(inpX.value) || 0;
				zone.y = parseFloat(inpY.value) || 0;
				
				const rawW = parseFloat(inpW.value);
				zone.width = rawW > 1 ? rawW : 100;
				if (zone.width !== rawW) inpW.value = zone.width;

				const rawH = parseFloat(inpH.value);
				zone.height = rawH > 1 ? rawH : 100;
				if (zone.height !== rawH) inpH.value = zone.height;
			};
			
			[inpX, inpY, inpW, inpH].forEach(inp => {
				inp.addEventListener('change', updateZone);
				inp.addEventListener('input', updateZone);
			});
			
			div.querySelector('.btn-delete').addEventListener('click', (e) => {
				e.stopPropagation();
				Sim.removePeriodicZone(zone.id);
				if (Render.selectedZoneId === zone.id) Render.selectedZoneId = null;
				refreshZoneList();
			});

			zonesListContainer.appendChild(div);
		});
	}
	
	Sim.addBody = function(...args) {
		originalAddBody(...args);
		refreshBodyList();
	};
	
	Sim.removeBody = function(index) {
		originalRemoveBody(index);
		refreshBodyList();
		refreshElasticBondList();
	};

	Sim.reset = function() {
		originalReset();
		refreshBodyList();
		refreshZoneList();
		refreshViscosityZoneList();
		refreshElasticBondList();
		refreshSolidBarrierList();
		refreshFieldZoneList();
		refreshFieldList();
	};
	
	window.App.ui = {
		syncInputs: function() {
			const cards = bodiesContainer.children;
			for (let i = 0; i < cards.length; i++) {
				const index = parseInt(cards[i].dataset.index);
				const body = Sim.bodies[index];
				if (!body) continue;

				const inpX = cards[i].querySelector('.inp-x');
				const inpY = cards[i].querySelector('.inp-y');
				const inpVX = cards[i].querySelector('.inp-vx');
				const inpVY = cards[i].querySelector('.inp-vy');
				const inpAX = cards[i].querySelector('.inp-start-ax'); 
				const inpAY = cards[i].querySelector('.inp-start-ay'); 
				const inpRadius = cards[i].querySelector('.inp-radius');

				const inpCharge = cards[i].querySelector('.inp-charge');
				const inpMagMoment = cards[i].querySelector('.inp-magMoment');
				const inpRestitution = cards[i].querySelector('.inp-restitution');
				const inpLifetime = cards[i].querySelector('.inp-lifetime');
				const inpTemp = cards[i].querySelector('.inp-temp');
				const inpRotSpeed = cards[i].querySelector('.inp-rotSpeed');
				const inpYoungMod = cards[i].querySelector('.inp-youngMod');
				const inpFriction = cards[i].querySelector('.inp-friction');

				if (document.activeElement !== inpX) inpX.value = formatVal(body.x, 2);
				if (document.activeElement !== inpY) inpY.value = formatVal(body.y, 2);
				if (document.activeElement !== inpVX) inpVX.value = formatVal(body.vx, 3);
				if (document.activeElement !== inpVY) inpVY.value = formatVal(body.vy, 3);
				if (document.activeElement !== inpAX) inpAX.value = formatVal(body.startAx, 3);
				if (document.activeElement !== inpAY) inpAY.value = formatVal(body.startAy, 3);
				if (document.activeElement !== inpRadius) inpRadius.value = formatVal(body.radius, 2);

				if (document.activeElement !== inpCharge) inpCharge.value = formatVal(body.charge, 2);
				if (document.activeElement !== inpMagMoment) inpMagMoment.value = formatVal(body.magMoment, 2);
				if (document.activeElement !== inpRestitution) inpRestitution.value = formatVal(body.restitution, 2);
				if (document.activeElement !== inpLifetime) inpLifetime.value = body.lifetime;
				if (document.activeElement !== inpTemp) inpTemp.value = formatVal(body.temperature, 0);
				if (document.activeElement !== inpRotSpeed) inpRotSpeed.value = formatVal(body.rotationSpeed, 3);
				if (document.activeElement !== inpYoungMod) inpYoungMod.value = formatVal(body.youngModulus, 0);
				if (document.activeElement !== inpFriction) inpFriction.value = formatVal(body.friction, 2);
			}
		},
		
		highlightBody: function(index) {
			const cards = document.querySelectorAll('.body-card');
			cards.forEach(c => c.classList.remove('selected'));
			
			const card = document.querySelector(`.body-card[data-index="${index}"]`);
			if (card) {
				card.classList.add('selected');
				card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				
				const container = document.getElementById('bodiesListContainer');
				if (container.classList.contains('hidden-content')) {
					document.getElementById('toggleBodiesBtn').click();
				}
			}
		},
	};
	
	window.App.ui.refreshFieldZones = refreshFieldZoneList;
	
	window.App.ui.refreshSolidBarrierList = refreshSolidBarrierList;
	
	window.App.ui.refreshElasticBondList = refreshElasticBondList;
	
	window.App.ui.refreshViscosityZones = refreshViscosityZoneList;
	
	window.App.ui.refreshZones = refreshZoneList;
	
	window.App.ui.getBondConfig = function() {
		const select = document.getElementById('bondPresetSelect');
		if (select && bondPresets[select.value]) {
			return bondPresets[select.value];
		}
		return {};
	};
	
	bindRange('dtSlider', 'dtVal', Sim, 'dt', true, 2);
	bindRange('trailLenSlider', 'trailLenVal', Sim, 'trailLength');
	bindRange('trailPrecSlider', 'trailPrecVal', Sim, 'trailStep');
	
	bindRange('gridPrecSlider', 'gridPrecVal', Render, 'gridDetail');
	bindRange('gridDistSlider', 'gridDistVal', Render, 'gridDistortion', true, 2);
	bindRange('gridMinDistSlider', 'gridMinDistVal', Render, 'gridMinDist');

	bindToggle('showTrailsBox', Sim, 'showTrails');
	bindToggle('camTrackingBox', Render, 'enableTracking');
	bindToggle('camAutoZoomBox', Render, 'enableAutoZoom', (checked) => {
		if (checked) Render.userZoomFactor = 1.0;
	});
	
	bindToggle('gravBox', Sim, 'enableGravity');
	bindToggle('elecBox', Sim, 'enableElectricity');
	bindToggle('magBox', Sim, 'enableMagnetism');
	bindToggle('colBox', Sim, 'enableCollision');
	
	bindToggle('showGravFieldBox', Render, 'showGravField');
	bindToggle('showElecFieldBox', Render, 'showElecField');
	bindToggle('showMagFieldBox', Render, 'showMagField');
	bindToggle('showFormulaFieldBox', Render, 'showFormulaField');
	
	bindRange('fieldPrecSlider', 'fieldPrecVal', Render, 'fieldPrecision');
	bindRange('fieldScaleSlider', 'fieldScaleVal', Render, 'fieldScale');
	
	bindRange('trailPrecSlider', 'trailPrecVal', Sim, 'trailStep');
	bindRange('predictionLenSlider', 'predictionLenVal', Render, 'predictionLength', false, 0);

	inputsToParse.forEach(id => {
		const el = document.getElementById(id);
		if (el) {
			addMathParsing(el);
		}
	});

	initBodySorting();
	initPresets();
	initSimPresets();
	setupInjectionPreview();
	
	Render.init();
	refreshFieldList(); 
	
	Sim.reset();
	Sim.paused = true;
	
	playBtn.innerHTML = '<i class="fa-solid fa-play"></i> RESUME';
	playBtn.classList.remove('primary');
	playBtn.style.color = "#aaa";

	generateRandomParameters(true);
	injectCurrentBody();
	generateRandomParameters(false);
	Render.draw();
});