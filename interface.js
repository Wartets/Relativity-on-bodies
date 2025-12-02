document.addEventListener('DOMContentLoaded', () => {
	let maxZIndex = 100;
	let draggedItemIndex = null;
	let isBatchLoading = false;
	
	const Sim = window.App.sim;
	const Render = window.App.render;
	
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
	const dtSlider = document.getElementById('dtSlider');
	const dtDisplay = document.getElementById('dtVal');
	const thermoBox = document.getElementById('thermoBox');
	const thermoParams = document.getElementById('thermoParams');
	const ambientTempInput = document.getElementById('ambientTempInput');
	const toggleThermalZoneBtn = document.getElementById('toggleThermalZoneBtn');
	const thermalZonesListContainer = document.getElementById('thermalZonesListContainer');
	const injHeader = document.querySelector('#injectionSection .section-header');
	
	const Schema = window.App.BodySchema;
	
	const getInputId = (key) => {
		if (Schema[key].inputId) return Schema[key].inputId;
		const capKey = key.charAt(0).toUpperCase() + key.slice(1);
		return `new${capKey}`;
	};

	const inputsToParse = Object.keys(Schema)
		.filter(k => Schema[k].type === 'number')
		.map(k => getInputId(k));
	
	const bodyProperties = Object.keys(Schema).filter(k => Schema[k].type === 'number').map(k => ({
		label: Schema[k].label, key: Schema[k].internal || k, cls: `inp-${k.replace('_', '-')}`,
		tip: Schema[k].tip, constraint: Schema[k].constraint || 'default', prec: Schema[k].prec
	}));
	
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

		headerEl.addEventListener('dblclick', (e) => {
			if (e.target.closest('button')) return;

			panelEl.classList.toggle('collapsed');
			const toggleBtn = headerEl.querySelector('button');

			if (toggleBtn) {
				const isCollapsed = panelEl.classList.contains('collapsed');
				toggleBtn.innerHTML = isCollapsed ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-minus"></i>';
			}
			
			panelEl.style.removeProperty('top');
			panelEl.style.removeProperty('left');
			panelEl.style.removeProperty('right');
		});

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
	
	const zoneConfigs = {
		periodicZone: {
			listContainer: zonesListContainer,
			collapsible: document.getElementById('periodicZonesCollapsible'),
			countSpan: document.getElementById('periodicZoneListCount'),
			zones: () => Sim.periodicZones,
			removeFunc: Sim.removePeriodicZone.bind(Sim),
			cardConfig: {
				defaultColor: '#e67e22',
				activeId: () => Render.selectedZoneId,
				setActiveId: (id) => { Render.selectedZoneId = id; },
				fields: [
					{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' },
					{ label: 'Width', key: 'width', min: 1, tooltip: `Width of the zone. Set to 'inf' for infinite.` }, 
					{ label: 'Height', key: 'height', min: 1, tooltip: `Height of the zone. Set to 'inf' for infinite.` }
				],
				extra: (zone) => `
					<div class="mini-input-group" style="margin-top:4px;">
						<label>Trigger Mode</label>
						<select class="inp-ztype" style="width:100%; background:rgba(0,0,0,0.3); border:1px solid #3a3a3a; color:#e0e0e0; font-size:10px; border-radius:2px;">
							<option value="center" ${zone.type === 'center' ? 'selected' : ''}>Center (Default)</option>
							<option value="radius" ${zone.type === 'radius' ? 'selected' : ''}>Radius (Edges)</option>
						</select>
					</div>`,
				setupExtra: (div, zone) => {
					div.querySelector('.inp-ztype').addEventListener('change', (e) => { zone.type = e.target.value; });
				}
			}
		},
		viscosityZone: {
			listContainer: viscosityZonesListContainer,
			collapsible: document.getElementById('viscosityZonesCollapsible'),
			countSpan: document.getElementById('viscosityZoneListCount'),
			zones: () => Sim.viscosityZones,
			removeFunc: Sim.removeViscosityZone.bind(Sim),
			cardConfig: {
				defaultColor: '#3498db',
				activeId: () => Render.selectedViscosityZoneId,
				setActiveId: (id) => { Render.selectedViscosityZoneId = id; },
				fields: [
					{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' },
					{ label: 'Width', key: 'width', min: 1, tooltip: `Width of the zone. Set to 'inf' for infinite.` }, 
					{ label: 'Height', key: 'height', min: 1, tooltip: `Height of the zone. Set to 'inf' for infinite.` }
				],
				extra: (zone) => `
					<div class="mini-input-group" style="margin-top:4px;">
						<label>Viscosity Coeff.</label>
						<input type="number" class="inp-viscosity" value="${zone.viscosity.toFixed(2)}" step="0.01">
					</div>`,
				setupExtra: (div, zone) => {
					const inp = div.querySelector('.inp-viscosity');
					const handler = () => { zone.viscosity = parseFloat(inp.value) || 0; };
					inp.addEventListener('change', handler);
					inp.addEventListener('input', handler);
					setupInteractiveLabel(inp.previousElementSibling, inp);
				},
			}
		},
		fieldZone: {
			listContainer: fieldZonesListContainer,
			collapsible: document.getElementById('fieldZonesCollapsible'),
			countSpan: document.getElementById('fieldZoneListCount'),
			zones: () => Sim.fieldZones,
			removeFunc: Sim.removeFieldZone.bind(Sim),
			cardConfig: {
				defaultColor: '#27ae60',
				activeId: () => Render.selectedFieldZoneId,
				setActiveId: (id) => { Render.selectedFieldZoneId = id; },
				fields: [
					{ label: 'Pos X', key: 'x' }, { label: 'Pos Y', key: 'y' },
					{ label: 'Width', key: 'width', min: 1, tooltip: `Width of the zone. Set to 'inf' for infinite.` }, 
					{ label: 'Height', key: 'height', min: 1, tooltip: `Height of the zone. Set to 'inf' for infinite.` },
					{ label: 'Acc X', key: 'fx', prec: 3, step: 0.01 }, { label: 'Acc Y', key: 'fy', prec: 3, step: 0.01 }
				]
			}
		},
		thermalZone: {
			listContainer: thermalZonesListContainer,
			collapsible: document.getElementById('thermalZonesCollapsible'),
			countSpan: document.getElementById('thermalZoneListCount'),
			zones: () => Sim.thermalZones,
			removeFunc: Sim.removeThermalZone.bind(Sim),
			cardConfig: {
				defaultColor: '#e74c3c',
				activeId: () => Render.selectedThermalZoneId,
				setActiveId: (id) => { Render.selectedThermalZoneId = id; },
				fields: [
					{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' },
					{ label: 'Width', key: 'width', min: 1, tooltip: `Width of the zone. Set to 'inf' for infinite.` }, 
					{ label: 'Height', key: 'height', min: 1, tooltip: `Height of the zone. Set to 'inf' for infinite.` }
				],
				extra: (zone) => `
					<div class="card-grid" style="grid-template-columns: 1fr 1fr; margin-top:4px;">
						<div class="mini-input-group">
							<label>Temperature (K)</label>
							<input type="number" class="inp-temperature" value="${zone.temperature.toFixed(0)}">
						</div>
						<div class="mini-input-group">
							<label>Heat Transfer</label>
							<input type="number" class="inp-htc" value="${zone.heatTransferCoefficient.toFixed(2)}" step="0.01">
						</div>
					</div>`,
				setupExtra: (div, zone) => {
					const tempInp = div.querySelector('.inp-temperature');
					const htcInp = div.querySelector('.inp-htc');
					
					const handler = () => {
						let tempVal = parseFloat(tempInp.value);
						if (isNaN(tempVal) || tempVal < 0) {
							tempVal = 0;
							tempInp.value = tempVal.toFixed(0);
						}
						zone.temperature = tempVal;
						zone.heatTransferCoefficient = parseFloat(htcInp.value) || 0;
					};
					
					tempInp.addEventListener('change', handler); tempInp.addEventListener('input', handler);
					htcInp.addEventListener('change', handler); htcInp.addEventListener('input', handler);
					
					setupInteractiveLabel(tempInp.previousElementSibling, tempInp);
					setupInteractiveLabel(htcInp.previousElementSibling, htcInp);
				},
			}
		},
		annihilationZone: {
			listContainer: document.getElementById('annihilationZonesListContainer'),
			collapsible: document.getElementById('annihilationZonesCollapsible'),
			countSpan: document.getElementById('annihilationZoneListCount'),
			zones: () => Sim.annihilationZones,
			removeFunc: Sim.removeAnnihilationZone.bind(Sim),
			cardConfig: {
				defaultColor: '#9b59b6',
				activeId: () => Render.selectedAnnihilationZoneId,
				setActiveId: (id) => { Render.selectedAnnihilationZoneId = id; },
				fields: [
					{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' },
					{ label: 'Width', key: 'width', min: 1, tooltip: `Width of the zone. Set to 'inf' for infinite.` }, 
					{ label: 'Height', key: 'height', min: 1, tooltip: `Height of the zone. Set to 'inf' for infinite.` }
				],
				extra: (zone) => `
					<div class="mini-input-group" style="margin-top:4px; grid-column: span 2;">
						<label class="toggle-row" style="margin:0; justify-content: flex-start;">
							<input type="checkbox" class="inp-particle-burst" ${zone.particleBurst ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.8);"></div>
							<span>Particle Burst on Annihilation</span>
						</label>
					</div>`,
				setupExtra: (div, zone) => {
					const burstCheckbox = div.querySelector('.inp-particle-burst');
					burstCheckbox.addEventListener('change', (e) => { zone.particleBurst = e.target.checked; });
				}
			}
		},
		chaosZone: {
			listContainer: document.getElementById('chaosZonesListContainer'),
			collapsible: document.getElementById('chaosZonesCollapsible'),
			countSpan: document.getElementById('chaosZoneListCount'),
			zones: () => Sim.chaosZones,
			removeFunc: Sim.removeChaosZone.bind(Sim),
			cardConfig: {
				defaultColor: '#f39c12',
				activeId: () => Render.selectedChaosZoneId,
				setActiveId: (id) => { Render.selectedChaosZoneId = id; },
				fields: [
					{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' },
					{ label: 'Width', key: 'width', min: 1, tooltip: `Width of the zone. Set to 'inf' for infinite.` }, 
					{ label: 'Height', key: 'height', min: 1, tooltip: `Height of the zone. Set to 'inf' for infinite.` }
				],
				extra: (zone) => `
					<div class="card-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-top:4px;">
						<div class="mini-input-group">
							<label>Strength</label>
							<input type="number" class="inp-strength" value="${zone.strength.toFixed(2)}" step="0.01">
						</div>
						<div class="mini-input-group">
							<label>Frequency</label>
							<input type="number" class="inp-frequency" value="${zone.frequency.toFixed(2)}" step="0.01">
						</div>
						<div class="mini-input-group">
							<label>Scale</label>
							<input type="number" class="inp-scale" value="${(zone.scale || 20.0).toFixed(1)}" step="1">
						</div>
					</div>`,
				setupExtra: (div, zone) => {
					const strengthInp = div.querySelector('.inp-strength'); const freqInp = div.querySelector('.inp-frequency'); const scaleInp = div.querySelector('.inp-scale');
					const handler = () => {
						zone.strength = parseFloat(strengthInp.value) || 0;
						zone.frequency = parseFloat(freqInp.value) || 0;
						zone.scale = parseFloat(scaleInp.value) || 20.0;
					};
					strengthInp.addEventListener('change', handler); strengthInp.addEventListener('input', handler);
					freqInp.addEventListener('change', handler); freqInp.addEventListener('input', handler);
					scaleInp.addEventListener('change', handler); scaleInp.addEventListener('input', handler);
					setupInteractiveLabel(strengthInp.previousElementSibling, strengthInp);
					setupInteractiveLabel(freqInp.previousElementSibling, freqInp);
					setupInteractiveLabel(scaleInp.previousElementSibling, scaleInp);
				},
			}
		},
		vortexZone: {
			listContainer: document.getElementById('vortexZonesListContainer'),
			collapsible: document.getElementById('vortexZonesCollapsible'),
			countSpan: document.getElementById('vortexZoneListCount'),
			zones: () => Sim.vortexZones,
			removeFunc: Sim.removeVortexZone.bind(Sim),
			cardConfig: {
				defaultColor: '#1abc9c',
				activeId: () => Render.selectedVortexZoneId,
				setActiveId: (id) => { Render.selectedVortexZoneId = id; },
				fields: [
					{ label: 'Center X', key: 'x' }, { label: 'Center Y', key: 'y' },
					{ label: 'Radius', key: 'radius', min: 1 }
				],
				extra: (zone) => `
					<div class="mini-input-group" style="margin-top:4px;">
						<label>Strength</label>
						<input type="number" class="inp-strength" value="${zone.strength.toFixed(2)}" step="0.1">
					</div>`,
				setupExtra: (div, zone) => {
					const strengthInp = div.querySelector('.inp-strength');
					const handler = () => { zone.strength = parseFloat(strengthInp.value) || 0; };
					strengthInp.addEventListener('change', handler);
					strengthInp.addEventListener('input', handler);
					setupInteractiveLabel(strengthInp.previousElementSibling, strengthInp);
				},
			}
		},
		nullZone: {
			listContainer: document.getElementById('nullZonesListContainer'),
			collapsible: document.getElementById('nullZonesCollapsible'),
			countSpan: document.getElementById('nullZoneListCount'),
			zones: () => Sim.nullZones,
			removeFunc: Sim.removeNullZone.bind(Sim),
			cardConfig: {
				defaultColor: '#7f8c8d',
				activeId: () => Render.selectedNullZoneId,
				setActiveId: (id) => { Render.selectedNullZoneId = id; },
				fields: [
					{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' },
					{ label: 'Width', key: 'width', min: 1, tooltip: `Width of the zone. Set to 'inf' for infinite.` }, 
					{ label: 'Height', key: 'height', min: 1, tooltip: `Height of the zone. Set to 'inf' for infinite.` }
				],
				extra: (zone) => `
					<div class="card-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-top:4px; font-size: 10px; gap: 4px;">
						<label class="toggle-row" style="margin:0; justify-content: flex-start;">
							<input type="checkbox" class="inp-null-g" ${zone.nullifyGravity ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.7);"></div><span>Gravity</span>
						</label>
						<label class="toggle-row" style="margin:0; justify-content: flex-start;">
							<input type="checkbox" class="inp-null-e" ${zone.nullifyElectricity ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.7);"></div><span>Electric</span>
						</label>
						<label class="toggle-row" style="margin:0; justify-content: flex-start;">
							<input type="checkbox" class="inp-null-m" ${zone.nullifyMagnetism ? 'checked' : ''}>
							<div class="toggle-switch" style="transform:scale(0.7);"></div><span>Magnetic</span>
						</label>
					</div>`,
				setupExtra: (div, zone) => {
					div.querySelector('.inp-null-g').addEventListener('change', (e) => { zone.nullifyGravity = e.target.checked; });
					div.querySelector('.inp-null-e').addEventListener('change', (e) => { zone.nullifyElectricity = e.target.checked; });
					div.querySelector('.inp-null-m').addEventListener('change', (e) => { zone.nullifyMagnetism = e.target.checked; });
				}
			}
		}
	};
	
	const toolButtons = [
		{
			id: 'zeroVelBtn',
			action: () => {
				Sim.zeroVelocities();
				if (window.App.ui && window.App.ui.syncInputs) {
					window.App.ui.syncInputs(true);
				}
			}
		},
		{
			id: 'reverseVelBtn',
			action: () => {
				Sim.reverseTime();
				if (window.App.ui && window.App.ui.syncInputs) {
					window.App.ui.syncInputs(true);
				}
			}
		},
		{
			id: 'cullBtn',
			action: () => {
				const z = Render.zoom;
				const w = Render.width;
				const h = Render.height;
				const minX = (-w / 2 - Render.camX) / z;
				const maxX = (w / 2 - Render.camX) / z;
				const minY = (-h / 2 - Render.camY) / z;
				const maxY = (h / 2 - Render.camY) / z;
				Sim.cullDistant(minX, maxX, minY, maxY);
				refreshBodyList();
			}
		},
		{
			id: 'snapBtn',
			action: () => {
				Sim.snapToGrid(50);
				if (window.App.ui && window.App.ui.syncInputs) window.App.ui.syncInputs(true);
			}
		},
		{
			id: 'killRotBtn',
			action: () => {
				Sim.killRotation();
				if (window.App.ui && window.App.ui.syncInputs) window.App.ui.syncInputs(true);
			}
		},
		{
			id: 'scatterBtn',
			action: () => {
				const zoom = Render.zoom;
				const w = Render.width / zoom;
				const h = Render.height / zoom;
				const x = -Render.camX / zoom - w/2;
				const y = -Render.camY / zoom - h/2;
				Sim.scatterPositions(x + w*0.1, y + h*0.1, w*0.8, h*0.8);
				if (window.App.ui && window.App.ui.syncInputs) window.App.ui.syncInputs(true);
			}
		},
		{
			id: 'equalMassBtn',
			action: () => {
				Sim.equalizeMasses();
				refreshBodyList();
			}
		}
	];
	
	const drawTools = [
		{ id: 'toggleZoneDrawBtn', mode: 'periodic', text: 'Draw Zone', icon: 'fa-pen-ruler', shapeSelectorId: 'periodicZoneShapeSelector' },
		{ id: 'toggleViscosityZoneBtn', mode: 'viscosity', text: 'Draw Viscosity', icon: 'fa-water', shapeSelectorId: 'viscosityZoneShapeSelector' },
		{ id: 'toggleFieldZoneToolBtn', mode: 'field', text: 'Draw Field', icon: 'fa-arrow-down', shapeSelectorId: 'fieldZoneShapeSelector' },
		{ id: 'toggleThermalZoneBtn', mode: 'thermal', text: 'Draw Thermal', icon: 'fa-temperature-high', shapeSelectorId: 'thermalZoneShapeSelector' },
		{ id: 'toggleAnnihilationZoneBtn', mode: 'annihilation', text: 'Draw Annihilation', icon: 'fa-skull-crossbones', shapeSelectorId: 'annihilationZoneShapeSelector' },
		{ id: 'toggleChaosZoneBtn', mode: 'chaos', text: 'Draw Chaos', icon: 'fa-hurricane', shapeSelectorId: 'chaosZoneShapeSelector' },
		{ id: 'toggleVortexZoneBtn', mode: 'vortex', text: 'Draw Vortex', icon: 'fa-fan' },
		{ id: 'toggleNullZoneBtn', mode: 'null', text: 'Draw Null Zone', icon: 'fa-ban', shapeSelectorId: 'nullZoneShapeSelector' },
		{ id: 'toggleBarrierToolBtn', mode: 'barrier', text: 'Draw Barrier', icon: 'fa-road' },
		{ id: 'toggleBondToolBtn', mode: 'bond', text: 'Link Bodies', icon: 'fa-link' }
	];
	
	const bondPresets = {
		"spring": { stiffness: 0.8, damping: 0.05, type: 'spring', name: 'Spring', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"rope": { stiffness: 8.0, damping: 0.8, type: 'rope', name: 'Rope', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"rod": { stiffness: 50.0, damping: 1.0, type: 'spring', name: 'Rod', nonLinearity: 1, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"chain": { stiffness: 15.0, damping: 0.5, type: 'rope', name: 'Chain', nonLinearity: 1.2, breakTension: -1, activeAmp: 0, activeFreq: 0 },
		"muscle": { stiffness: 2.0, damping: 0.2, type: 'spring', name: 'Muscle', nonLinearity: 1, breakTension: -1, activeAmp: 0.3, activeFreq: 2.0 },
		"weak": { stiffness: 1.0, damping: 0.1, type: 'spring', name: 'Weak Link', nonLinearity: 1, breakTension: 30, activeAmp: 0, activeFreq: 0 }
	};
	
	const withProgressBar = (task, onComplete) => {
		const progressBarContainer = document.getElementById('loading-progress-bar-container');
		const progressBar = document.getElementById('loading-progress-bar');

		if (!progressBarContainer || !progressBar) {
			task();
			if (onComplete) onComplete();
			return;
		}

		progressBarContainer.style.display = 'block';
		progressBar.style.width = '0%';
		progressBar.style.transition = 'width 0.2s ease-in-out';

		setTimeout(() => {
			progressBar.style.width = '50%';

			setTimeout(() => {
				isBatchLoading = true;
				try {
					task();
				} finally {
					isBatchLoading = false;
				}
				
				progressBar.style.width = '100%';

				setTimeout(() => {
					progressBarContainer.style.display = 'none';
					progressBar.style.transition = '';
					if (onComplete) onComplete();
				}, 250);
			}, 210);
		}, 20);
	};	
	
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
			x = 0; 
			y = 0;
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
			const restitution_base = parseFloat((Math.random() * 0.2).toFixed(3));
			const temperature = Math.floor(Math.random() * 100) + 273;
			const rotationSpeed = (Math.random() - 0.5) * 0.2;
			const young_base = Math.floor(Math.random() * 1000) + 100;
			const friction = setDefault ? 0.5 : parseFloat((Math.random() * 0.8 + 0.1).toFixed(2));

			document.getElementById('newMass').value = formatVal(mass, 2);
			document.getElementById('newRadius').value = formatVal(radius, 2);
			document.getElementById('newCharge').value = formatVal(charge, 2);
			document.getElementById('newMagMoment').value = formatVal(magMoment, 2);
			document.getElementById('newLifetime').value = -1;
			document.getElementById('newRotationSpeed').value = formatVal(rotationSpeed, 3);
			document.getElementById('newFriction').value = formatVal(friction, 2);
			
			document.getElementById('newTemperature').value = formatVal(temperature, 0);
			document.getElementById('newSpecificHeat').value = 1000;
			document.getElementById('newAbsorptionFactor').value = 0.5;
			document.getElementById('newCriticalTemp').value = 1200;
			document.getElementById('newTransitionFactor').value = 0.01;
			document.getElementById('newE_base').value = formatVal(restitution_base, 2);
			document.getElementById('newE_min').value = 0.05;
			document.getElementById('newY_base').value = formatVal(young_base, 0);
			document.getElementById('newY_min').value = 10;
			
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
		
		const presets = window.App.objectPresets || {};

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
				document.getElementById('newE_base').value = formatVal(params.restitution, 2);
				document.getElementById('newTemperature').value = formatVal(params.temperature, 0);
				document.getElementById('newRotationSpeed').value = formatVal(params.rotationSpeed, 3);
				document.getElementById('newY_base').value = formatVal(params.youngModulus, 0);
				document.getElementById('newFriction').value = formatVal(params.friction, 2);
				
				if (params.color) {
					presetSelect.dataset.color = params.color;
				} else {
					delete presetSelect.dataset.color;
				}
			}
		});

		const inputIds = Object.keys(Schema)
			.filter(k => Schema[k].type === 'number')
			.map(k => getInputId(k));
		
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
		
		const presets = window.App.presets;
		
		if (!presets || presets.length === 0 || !select) return;
		
		select.innerHTML = '';
		presets.forEach((preset, index) => {
			const opt = document.createElement('option');
			opt.value = index;
			opt.textContent = preset.name;
			select.appendChild(opt);
		});
		
		loadBtn.addEventListener('click', () => {
			const idx = parseInt(select.value, 10);
			if (presets[idx]) {
				const task = () => {
					Sim.reset();
					presets[idx].init(Sim);
					
					const updateCheck = (id, val) => {
						const el = document.getElementById(id);
						if(el) el.checked = val;
					};

					Object.keys(zoneConfigs).forEach(refreshZoneList);
					refreshElasticBondList();
					refreshSolidBarrierList();
					refreshFieldList();

					updateCheck('gravBox', Sim.enableGravity);
					updateCheck('elecBox', Sim.enableElectricity);
					updateCheck('magBox', Sim.enableMagnetism);
					updateCheck('colBox', Sim.enableCollision);
					
					refreshBodyList();
				};
				
				withProgressBar(task, () => {
					Render.draw();
				});
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
	
	const initTooltips = () => {
		const tooltip = document.createElement('div');
		tooltip.id = 'tooltip';
		tooltip.style.position = 'absolute';
		tooltip.style.display = 'none';
		tooltip.style.padding = '5px 8px';
		tooltip.style.backgroundColor = 'rgba(10, 10, 10, 0.85)';
		tooltip.style.color = '#e0e0e0';
		tooltip.style.border = '1px solid #444';
		tooltip.style.borderRadius = '4px';
		tooltip.style.fontSize = '11px';
		tooltip.style.maxWidth = '200px';
		tooltip.style.pointerEvents = 'none';
		tooltip.style.zIndex = '10000';
		tooltip.style.backdropFilter = 'blur(5px)';
		document.body.appendChild(tooltip);

		document.body.addEventListener('mouseover', (e) => {
			const target = e.target.closest('.help-icon');
			if (target) {
				const text = target.dataset.tooltip;
				if (!text) return;

				tooltip.innerHTML = text.replace(/\n/g, '<br>');
				tooltip.style.visibility = 'hidden';
				tooltip.style.display = 'block';
				
				const rect = target.getBoundingClientRect();
				const tooltipRect = tooltip.getBoundingClientRect();
				const panel = target.closest('#controlPanel, #toolsPanel');
				const margin = 5;

				const boundary = panel ? panel.getBoundingClientRect() : {
					top: margin, left: margin,
					right: window.innerWidth - margin,
					bottom: window.innerHeight - margin
				};

				let top = rect.top - tooltipRect.height - margin;
				if (top < boundary.top) {
					top = rect.bottom + margin;
				}
				if (top + tooltipRect.height > boundary.bottom) {
					top = Math.max(boundary.top, boundary.bottom - tooltipRect.height);
				}

				let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
				if (left < boundary.left) {
					left = boundary.left;
				}
				if (left + tooltipRect.width > boundary.right) {
					left = boundary.right - tooltipRect.width;
				}

				tooltip.style.top = `${top + window.scrollY}px`;
				tooltip.style.left = `${left + window.scrollX}px`;
				tooltip.style.visibility = 'visible';
			}
		});

		document.body.addEventListener('mouseout', (e) => {
			const target = e.target.closest('.help-icon');
			if (target) {
				tooltip.style.display = 'none';
			}
		});
	};
	
	const injectCurrentBody = () => {
		const config = {};
		
		Object.keys(Schema).forEach(key => {
			const def = Schema[key];
			if (def.type === 'number') {
				const id = getInputId(key);
				const el = document.getElementById(id);
				if (el) {
					const val = parseFloat(el.value);
					if (!isNaN(val)) {
						config[key] = val;
					} else {
						config[key] = def.default;
					}
				}
			}
		});

		const presetSelect = document.getElementById('presetSelect');
		const presetColor = (presetSelect && presetSelect.dataset.color) ? presetSelect.dataset.color : null;
		if (presetColor) config.color = presetColor;

		Sim.addBody(config);
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
	
	const toggleBodiesList = () => {
		const wasHidden = bodiesContainer.classList.contains('hidden-content');
		bodiesContainer.classList.toggle('hidden-content');
		const sortContainer = document.getElementById('bodySortContainer');
		if (sortContainer) {
			sortContainer.classList.toggle('hidden-content');
		}
		if (toggleBodiesBtn) {
			toggleBodiesBtn.innerHTML = bodiesContainer.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
		}
		if (wasHidden && !bodiesContainer.classList.contains('hidden-content')) {
			refreshBodyList();
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
	
	const setupCollapsibleList = (headerId, listContainerId, buttonId) => {
		const header = document.getElementById(headerId);
		const list = document.getElementById(listContainerId);
		const button = document.getElementById(buttonId);

		if (header && list && button) {
			const toggle = () => {
				const isHidden = list.classList.toggle('hidden-content');
				button.innerHTML = isHidden ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
			};
			header.addEventListener('click', toggle);
		}
	};
	
	const setupInteractiveLabel = (label, input, constraintType = 'default') => {
		if (!label || !input || 'ontouchstart' in window) return;

		let isDragging = false;
		let lastX = 0;

		label.style.cursor = 'ew-resize';
		label.title = "Click and drag to change value. Hold Shift for precision, Ctrl for speed.";

		const onMouseMove = (e) => {
			if (!isDragging) return;

			let currentValue = parseFloat(input.value);
			if (isNaN(currentValue)) {
				currentValue = 0;
			}
			
			const dx = e.clientX - lastX;
			lastX = e.clientX;

			let effectiveSensitivity;
			const absCurrent = Math.abs(currentValue);

			if (absCurrent > 1000) effectiveSensitivity = 10;
			else if (absCurrent > 100) effectiveSensitivity = 1;
			else if (absCurrent > 10) effectiveSensitivity = 0.1;
			else if (absCurrent >= 1 || currentValue === 0) effectiveSensitivity = 0.05;
			else if (absCurrent > 0.1) effectiveSensitivity = 0.005;
			else if (absCurrent > 0.01) effectiveSensitivity = 0.0005;
			else if (absCurrent > 0.001) effectiveSensitivity = 0.00005;
			else effectiveSensitivity = 1e-7;

			if (e.shiftKey) effectiveSensitivity /= 10;
			if (e.ctrlKey || e.metaKey) effectiveSensitivity *= 10;
			if (e.altKey) effectiveSensitivity *= 100;

			let newValue = currentValue + dx * effectiveSensitivity;
			const minPositive = 1e-6;
			
			const allowsNegativeOne = constraintType === 'mass' || constraintType === 'lifetime' || constraintType === 'breakable';

			if (allowsNegativeOne) {
				if (currentValue >= minPositive && newValue <= 0) {
					newValue = -1;
				} else if (currentValue === -1 && dx > 0) {
					newValue = minPositive;
				} else if (currentValue === -1 && dx <= 0) {
					newValue = -1;
				}
			}

			if (constraintType === 'positive') {
				newValue = Math.max(minPositive, newValue);
			} else if (constraintType === 'non-negative') {
				newValue = Math.max(0, newValue);
			}

			if (newValue > 0 && newValue < minPositive) {
				newValue = minPositive;
			}
			
			const absNew = Math.abs(newValue);
			let precision;
			if (newValue === -1 || absNew === 0 || absNew >= 1) {
				precision = 2;
			} else if (absNew > 0.001) {
				precision = 4;
			} else {
				precision = 6;
			}
			
			input.value = (newValue === -1) ? -1 : formatVal(newValue, precision);
			input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
		};

		const onMouseUp = () => {
			isDragging = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		};

		label.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;
			isDragging = true;
			lastX = e.clientX;
			
			document.body.style.cursor = 'ew-resize';
			document.body.style.userSelect = 'none';
			e.preventDefault();

			window.addEventListener('mousemove', onMouseMove);
			window.addEventListener('mouseup', onMouseUp);
		});
	};
	
	const constraintMap = {};
	
	const originalReset = Sim.reset.bind(Sim);
	const originalAddBody = Sim.addBody.bind(Sim);
	const originalRemoveBody = Sim.removeBody.bind(Sim);
	
	const toggleInjection = () => {
		injContent.classList.toggle('hidden-content');
		toggleInjBtn.innerHTML = injContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
	};
	
	const initHistoryControls = () => {
		const historyHeader = document.createElement('div');
		historyHeader.className = 'section-header hidden-content';
		historyHeader.innerHTML = '<h4>History</h4>';
		
		const historyContent = document.createElement('div');
		historyContent.className = 'tool-group';
		historyContent.innerHTML = `
			<button id="undoBtn" class="btn secondary wide-btn hidden-content" title="Undo (Ctrl+Z)"><i class="fa-solid fa-undo"></i> Undo</button>
			<button id="redoBtn" class="btn secondary wide-btn hidden-content" title="Redo (Ctrl+Y, Ctrl+Shift+Z)"><i class="fa-solid fa-redo"></i> Redo</button>
		`;
		
		toolsPanel.querySelector('#toolsContent').appendChild(historyHeader);
		toolsPanel.querySelector('#toolsContent').appendChild(historyContent);

		const undoBtn = document.getElementById('undoBtn');
		const redoBtn = document.getElementById('redoBtn');

		const refreshAllLists = () => {
			refreshBodyList();
			Object.keys(zoneConfigs).forEach(refreshZoneList);
			refreshElasticBondList();
			refreshSolidBarrierList();
			refreshFieldList();
		};

		const updateHistoryButtons = () => {
			const history = window.App.ActionHistory;
			if (undoBtn) undoBtn.disabled = history.history.length === 0;
			if (redoBtn) redoBtn.disabled = history.redoStack.length === 0;
		};

		window.App.ActionHistory.onChange = updateHistoryButtons;

		undoBtn.addEventListener('click', () => {
			window.App.ActionHistory.undo();
			refreshAllLists();
			Render.draw();
		});

		redoBtn.addEventListener('click', () => {
			window.App.ActionHistory.redo();
			refreshAllLists();
			Render.draw();
		});

		document.addEventListener('keydown', (e) => {
			const activeEl = document.activeElement;
			if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA') {
				return;
			}
	
			if (e.ctrlKey || e.metaKey) {
				let handled = false;
				const key = e.key.toLowerCase();

				if (key === 'z') {
					if (e.shiftKey) {
						redoBtn.click();
					} else {
						undoBtn.click();
					}
					handled = true;
				} else if (key === 'y') {
					if (e.shiftKey) {
						undoBtn.click();
					} else {
						redoBtn.click();
					}
					handled = true;
				}
		
				if (handled) {
					e.preventDefault();
				}
			}
		});

		updateHistoryButtons();
	};
	
	const updateDrawToolButtons = () => {
		const activeMode = Render.drawMode;
		drawTools.forEach(tool => {
			const btn = document.getElementById(tool.id);
			if (btn) {
				const isActive = tool.mode === activeMode;
				btn.innerHTML = `<i class="fa-solid ${tool.icon}"></i> ${tool.text} (${isActive ? 'On' : 'Off'})`;
				btn.classList.toggle('primary', isActive);
				btn.classList.toggle('secondary', !isActive);
				
				const parentGroup = btn.parentElement;
				if(parentGroup && parentGroup.classList.contains('tool-group')) {
					const shapeSelector = parentGroup.querySelector('.btn-group');
					if(shapeSelector) {
						shapeSelector.style.display = isActive ? 'flex' : 'none';
					}
				}
			}
		});
		Render.canvas.style.cursor = activeMode === 'none' ? 'default' : 'crosshair';
	};
	
	const progressBarContainer = document.createElement('div');
	progressBarContainer.id = 'loading-progress-bar-container';
	Object.assign(progressBarContainer.style, {
		display: 'none',
		position: 'fixed',
		bottom: '0',
		left: '0',
		width: '100%',
		height: '2px',
		zIndex: '10001',
		opacity: '0.5',
		pointerEvents: 'none'
	});
	const progressBar = document.createElement('div');
	progressBar.id = 'loading-progress-bar';
	Object.assign(progressBar.style, {
		height: '100%',
		width: '0%',
		background: 'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8b00ff)'
	});
	progressBarContainer.appendChild(progressBar);
	
	setupDraggable(panel, header, [toolsPanel]);
	setupDraggable(toolsPanel, toolsHeader, [panel]);
	
	Object.keys(Schema).forEach(key => {
		const def = Schema[key];
		if (def.type === 'number') {
			constraintMap[getInputId(key)] = def.constraint || 'default';
		}
	});
	
	toolButtons.forEach(button => {
		const element = document.getElementById(button.id);
		if (element) {
			element.addEventListener('click', () => {
				withProgressBar(button.action);
			});
		}
	});

	drawTools.forEach(tool => {
		const btn = document.getElementById(tool.id);
		if (btn) {
			btn.addEventListener('click', () => {
				const newMode = Render.drawMode === tool.mode ? 'none' : tool.mode;
				Render.drawMode = newMode;
				updateDrawToolButtons();
			});

			if (tool.shapeSelectorId) {
				const shapeSelector = document.getElementById(tool.shapeSelectorId);
				if (shapeSelector) {
					const shapeButtons = shapeSelector.querySelectorAll('button[data-shape]');
					
					const updateButtons = () => {
						shapeButtons.forEach(b => {
							const isActive = b.dataset.shape === Render.drawShapes[tool.mode];
							b.classList.toggle('active', isActive);
							b.classList.toggle('primary', isActive);
							b.classList.toggle('secondary', !isActive);
						});
					};

					shapeButtons.forEach(shapeBtn => {
						shapeBtn.addEventListener('click', () => {
							Render.drawShapes[tool.mode] = shapeBtn.dataset.shape;
							updateButtons();
						});
					});
					
					updateButtons();
				}
			}
		}
	});
	
	inputsToParse.forEach(id => {
		const input = document.getElementById(id);
		if (input) {
			const wrapper = input.closest('.input-wrapper');
			if (wrapper) {
				const label = wrapper.querySelector('label');
				if (label) {
					setupInteractiveLabel(label, input, constraintMap[id]);
				}
			}
		}
	});
	
	document.body.appendChild(progressBarContainer);

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
		
		const listContainer = document.getElementById('fieldsListContainer');
		const toggleBtn = document.getElementById('toggleFieldDefListBtn');
		if (listContainer && listContainer.classList.contains('hidden-content') && toggleBtn) {
			toggleBtn.click();
		}
	});
	
	document.getElementById('randomizeBtn').addEventListener('click', () => generateRandomParameters(false));

	document.getElementById('resetBtn').addEventListener('click', () => {
		const task = () => {
			Sim.reset();
			Sim.paused = true;
			
			playBtn.innerHTML = '<i class="fa-solid fa-play"></i> RESUME';
			playBtn.classList.remove('primary');
			playBtn.style.color = "#aaa";
			
			generateRandomParameters(true);
			injectCurrentBody();
			generateRandomParameters(false);
			
			refreshBodyList();
			Object.keys(zoneConfigs).forEach(refreshZoneList);
			refreshElasticBondList();
			refreshSolidBarrierList();
			refreshFieldList();
		};
		
		withProgressBar(task, () => {
			Render.draw();
		});
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
	
	bodiesContainer.addEventListener('click', (e) => {
		const card = e.target.closest('.body-card');
		if (!card) return;
		const index = parseInt(card.dataset.index, 10);
		const body = Sim.bodies[index];
		if (!body) return;

		if (e.target.closest('.btn-delete')) {
			e.stopPropagation();
			Sim.removeBody(index);
			return;
		}

		if (e.target.closest('.btn-track')) {
			e.stopPropagation();
			if (Render.trackedBodyIdx === index) {
				Render.trackedBodyIdx = -1;
			} else {
				Render.trackedBodyIdx = index;
				Render.enableTracking = false;
				document.getElementById('camTrackingBox').checked = false;
			}
			refreshBodyList();
			return;
		}
		
		if (e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
			Render.selectedBodyIdx = index;
			window.App.ui.highlightBody(index);
		}
	});
	
	bodiesContainer.addEventListener('input', (e) => {
		const input = e.target;
		const card = input.closest('.body-card');
		if (!card) return;
		const index = parseInt(card.dataset.index, 10);
		const body = Sim.bodies[index];
		if (!body) return;

		const key = input.dataset.key;
		if (key) {
			const propInfo = bodyProperties.find(p => p.key === key);
			const constraint = propInfo ? propInfo.constraint : 'default';
			const val = parseFloat(input.value);
			if (!isNaN(val)) {
				if (constraint === 'mass' && val < 1e-6 && val !== -1) body[key] = 1e-6;
				else if (constraint === 'positive' && val < 1e-6) body[key] = 1e-6;
				else if (constraint === 'non-negative' && val < 0) body[key] = 0;
				else body[key] = val;

				if (key === 'mass') {
					body.invMass = (body.mass === -1) ? 0 : 1 / body.mass;
				}
			}
		}
	});
	
	bodiesContainer.addEventListener('focusin', (e) => {
		const input = e.target;
		if (input.tagName === 'INPUT' && input.closest('.body-card')) {
			input.dataset.originalValue = input.value;
		}
	});

	bodiesContainer.addEventListener('change', (e) => {
		const input = e.target;
		const card = input.closest('.body-card');
		if (!card) return;
		const index = parseInt(card.dataset.index, 10);
		const body = Sim.bodies[index];
		if (!body) return;

		const originalValueStr = input.dataset.originalValue;
		if (originalValueStr === undefined || input.value === originalValueStr) {
			delete input.dataset.originalValue;
			return;
		}

		if (input.classList.contains('color-input-hidden')) {
			const oldValue = originalValueStr;
			const newValue = input.value;
			const colorDot = card.querySelector('.body-color-dot');
			const applyColor = (color) => {
				body.color = color;
				if (colorDot) {
					colorDot.style.backgroundColor = color;
					colorDot.style.boxShadow = `0 0 5px ${color}`;
				}
				card.style.borderLeftColor = color;
			};
			const action = {
				execute: () => applyColor(newValue),
				undo: () => applyColor(oldValue)
			};
			window.App.ActionHistory.execute(action);
			return;
		}

		if (input.classList.contains('body-name-input')) {
			const oldValue = originalValueStr;
			const newValue = input.value;
			const action = {
				execute: () => { body.name = newValue; },
				undo: () => { body.name = oldValue; }
			};
			window.App.ActionHistory.execute(action);
			return;
		}

		const key = input.dataset.key;
		if (key) {
			const oldValue = parseFloat(originalValueStr);
			
			const result = evaluateMathExpression(input.value);
			if (typeof result === 'number') {
				input.value = formatVal(result, 4);
				input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
			}
			
			const newValue = body[key];
			
			if (isNaN(oldValue) || isNaN(newValue) || oldValue === newValue) return;

			const action = {
				execute: () => {
					body[key] = newValue;
					if (key === 'mass') body.invMass = (newValue === -1) ? 0 : 1 / newValue;
				},
				undo: () => {
					body[key] = oldValue;
					if (key === 'mass') body.invMass = (oldValue === -1) ? 0 : 1 / oldValue;
				}
			};
			window.App.ActionHistory.execute(action);
		}
	});
	
	bodiesContainer.addEventListener('change', (e) => {
		const input = e.target;
		const card = input.closest('.body-card');
		if (!card) return;
		const index = parseInt(card.dataset.index, 10);
		const body = Sim.bodies[index];
		if (!body) return;

		if (input.classList.contains('body-name-input')) {
			body.name = input.value;
			return;
		}

		const key = input.dataset.key;
		if (key) {
			const result = evaluateMathExpression(input.value);
			if (typeof result === 'number' && parseFloat(input.value) !== result) {
				input.value = formatVal(result, 4);
				input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
			} else {
				const val = parseFloat(input.value);
				if (!isNaN(val)) {
					if (body[key] !== val && !(key === 'mass' && val === -1)) {
						input.value = body[key];
					}
				}
			}
		}
	});
	
	bodiesContainer.addEventListener('mousedown', (e) => {
		const label = e.target.closest('label');
		const card = e.target.closest('.body-card');
		if (!label || !card || 'ontouchstart' in window || e.button !== 0) {
			if (e.target.tagName === 'INPUT') {
				e.stopPropagation();
			}
			return;
		}

		const input = label.nextElementSibling;
		if (!input || input.tagName !== 'INPUT') return;

		let isDragging = true;
		let lastX = e.clientX;
		const constraintType = label.dataset.constraint || 'default';

		document.body.style.cursor = 'ew-resize';
		document.body.style.userSelect = 'none';
		e.preventDefault();
		e.stopPropagation();

		const onMouseMove = (moveEvent) => {
			if (!isDragging) return;

			let currentValue = parseFloat(input.value);
			if (isNaN(currentValue)) currentValue = 0;
			
			const dx = moveEvent.clientX - lastX;
			lastX = moveEvent.clientX;

			let effectiveSensitivity;
			const absCurrent = Math.abs(currentValue);

			if (absCurrent > 1000) effectiveSensitivity = 10;
			else if (absCurrent > 100) effectiveSensitivity = 1;
			else if (absCurrent > 10) effectiveSensitivity = 0.1;
			else if (absCurrent >= 1 || currentValue === 0) effectiveSensitivity = 0.05;
			else if (absCurrent > 0.1) effectiveSensitivity = 0.005;
			else if (absCurrent > 0.01) effectiveSensitivity = 0.0005;
			else if (absCurrent > 0.001) effectiveSensitivity = 0.00005;
			else effectiveSensitivity = 1e-7;

			if (moveEvent.shiftKey) effectiveSensitivity /= 10;
			if (moveEvent.ctrlKey || moveEvent.metaKey) effectiveSensitivity *= 10;
			if (moveEvent.altKey) effectiveSensitivity *= 100;

			let newValue = currentValue + dx * effectiveSensitivity;
			const minPositive = 1e-6;
			const allowsNegativeOne = constraintType === 'mass' || constraintType === 'lifetime' || constraintType === 'breakable';

			if (allowsNegativeOne) {
				if (currentValue >= minPositive && newValue <= 0) newValue = -1;
				else if (currentValue === -1 && dx > 0) newValue = minPositive;
				else if (currentValue === -1 && dx <= 0) newValue = -1;
			}

			if (constraintType === 'positive') newValue = Math.max(minPositive, newValue);
			else if (constraintType === 'non-negative') newValue = Math.max(0, newValue);
			if (newValue > 0 && newValue < minPositive) newValue = minPositive;
			
			const absNew = Math.abs(newValue);
			let precision;
			if (newValue === -1 || absNew === 0 || absNew >= 1) precision = 2;
			else if (absNew > 0.001) precision = 4;
			else precision = 6;
			
			input.value = (newValue === -1) ? -1 : formatVal(newValue, precision);
			input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
		};

		const onMouseUp = () => {
			isDragging = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
		};

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	});
	
	document.addEventListener('dblclick', (e) => {
		e.preventDefault();
	}, { passive: false });
	
	document.addEventListener('keydown', (e) => {
		if (e.code === 'Space') {
			const activeEl = document.activeElement;
			if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA') {
				return;
			}
			e.preventDefault();
			playBtn.click();
		} else if ((e.code === 'ArrowRight' || e.code === 'ArrowLeft') && Sim.paused) {
			const activeEl = document.activeElement;
			if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA') {
				return;
			}
			e.preventDefault();
			const steps = e.shiftKey ? 10 : 1;
			
			if (e.code === 'ArrowRight') {
				for(let i = 0; i < steps; i++) {
					Sim.update(true);
				}
			} else {
				Sim.reverseTime();
				for(let i = 0; i < steps; i++) {
					Sim.update(true);
				}
				Sim.reverseTime();
			}
			Render.draw();
		}
	});
	
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

	toggleInjBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleInjection(); });
	
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
	
	if (dtSlider && dtDisplay) {
		const minLog = Math.log10(0.000001);
		const maxLog = Math.log10(100);
		const scale = (maxLog - minLog) / 1000;
		
		const updateDtDisplay = (val) => {
			dtDisplay.textContent = Math.abs(val) < 0.01 || Math.abs(val) >= 1000 ? val.toExponential(3) : val.toPrecision(3);
		};
		
		dtSlider.value = (Math.log10(Sim.dt) - minLog) / scale;
		updateDtDisplay(Sim.dt);
		
		dtSlider.addEventListener('input', () => {
			const val = Math.pow(10, minLog + parseFloat(dtSlider.value) * scale);
			Sim.dt = val;
			updateDtDisplay(val);
		});
	}
	
	if (injHeader) injHeader.addEventListener('click', toggleInjection);
	
	if (toggleDisplayBtn) {
		const toggleDisplay = () => {
			displayContent.classList.toggle('hidden-content');
			toggleDisplayBtn.innerHTML = displayContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
		};
		toggleDisplayBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleDisplay(); });
		const displayHeader = document.querySelector('#displaySection .section-header');
		if (displayHeader) displayHeader.addEventListener('click', toggleDisplay);
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
	
	if (thermoParams) {
		thermoParams.classList.toggle('hidden-content', !Sim.enableThermodynamics);
	}

	if (ambientTempInput) {
		ambientTempInput.value = Sim.T_ambient;
		ambientTempInput.addEventListener('change', () => {
			let val = parseFloat(ambientTempInput.value);
			if (isNaN(val)) val = -1;
			Sim.T_ambient = val;
		});
		addMathParsing(ambientTempInput);
	}
	
	function createBodyCard(body, index) {
		const div = document.createElement('div');
		div.className = 'body-card';
		div.style.borderLeftColor = body.color;
		div.dataset.index = index;
		div.setAttribute('draggable', 'true');
		
		const isTracked = Render.trackedBodyIdx === index;
		const trackBtnClass = isTracked ? 'active' : '';
		const trackIconClass = isTracked ? 'fa-solid fa-eye' : 'fa-regular fa-eye';

		let gridHtml = '';
		bodyProperties.forEach(field => {
			let val = body[field.key];
			if (typeof val === 'number') {
				val = formatVal(val, field.prec !== undefined ? field.prec : 2);
			}
			gridHtml += `<div class="mini-input-group"><label data-constraint="${field.constraint || 'default'}">${field.label} <i class="fa-solid fa-circle-question help-icon" data-tooltip="${field.tip}"></i></label><input type="text" class="${field.cls}" data-key="${field.key}" value="${val}"></div>`;
		});

		div.innerHTML = `
			<div class="card-header">
				<span class="body-id">
					<div class="body-color-wrapper">
						<span class="body-color-dot" style="background-color: ${body.color}; box-shadow: 0 0 5px ${body.color}"></span>
						<input type="color" class="color-input-hidden" value="${body.color.startsWith('#') ? body.color : '#ffffff'}">
					</div>
					<input type="text" class="body-name-input" value="${body.name}">
					<button class="btn-track btn-icon ${trackBtnClass}" title="Track Body"><i class="${trackIconClass}"></i></button>
				</span>
				<button class="btn-delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
			</div>
			<div class="card-grid">${gridHtml}</div>
		`;

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
			
			if (Render.selectedBodyIdx === draggedItemIndex) Render.selectedBodyIdx = targetIndex;
			else if (draggedItemIndex < targetIndex && Render.selectedBodyIdx > draggedItemIndex && Render.selectedBodyIdx <= targetIndex) Render.selectedBodyIdx--;
			else if (draggedItemIndex > targetIndex && Render.selectedBodyIdx < draggedItemIndex && Render.selectedBodyIdx >= targetIndex) Render.selectedBodyIdx++;
			
			if (Render.trackedBodyIdx === draggedItemIndex) Render.trackedBodyIdx = targetIndex;
			else if (draggedItemIndex < targetIndex && Render.trackedBodyIdx > draggedItemIndex && Render.trackedBodyIdx <= targetIndex) Render.trackedBodyIdx--;
			else if (draggedItemIndex > targetIndex && Render.trackedBodyIdx < draggedItemIndex && Render.trackedBodyIdx >= targetIndex) Render.trackedBodyIdx++;

			refreshBodyList();
		});

		return div;
	}
	
	function refreshBodyList() {
		const bodies = Sim.bodies;
		const total = bodies.length;
		bodyCountLabel.textContent = total;

		let spacer = bodiesContainer.querySelector('.virtual-spacer');
		if (!spacer) {
			bodiesContainer.innerHTML = '';
			spacer = document.createElement('div');
			spacer.className = 'virtual-spacer';
			Object.assign(spacer.style, {
				position: 'relative',
				width: '100%',
				overflow: 'hidden',
				height: '0px'
			});
			bodiesContainer.appendChild(spacer);
			
			bodiesContainer.state = {
				itemHeight: 280, 
				ticking: false
			};

			bodiesContainer.addEventListener('scroll', () => {
				if (!bodiesContainer.state.ticking) {
					window.requestAnimationFrame(() => {
						renderVirtualVisible();
						bodiesContainer.state.ticking = false;
					});
					bodiesContainer.state.ticking = true;
				}
			}, { passive: true });
		}
		
		renderVirtualVisible(true);
		
		if (Render.selectedBodyIdx !== -1) {
			window.App.ui.highlightBody(Render.selectedBodyIdx);
		}
	}
	
	function refreshBodyListAsync(onComplete) {
		const bodies = Sim.bodies;
		const totalBodies = bodies.length;

		bodyCountLabel.textContent = totalBodies;
		
		const progressBarContainer = document.getElementById('loading-progress-bar-container');
		const progressBar = document.getElementById('loading-progress-bar');
		
		if (progressBarContainer) {
			progressBarContainer.style.display = 'block';
			progressBar.style.width = '0%';
		}
		
		setTimeout(() => {
			if (progressBar) progressBar.style.width = '50%';
			
			refreshBodyList();
			
			if (progressBar) progressBar.style.width = '100%';

			setTimeout(() => {
				if (progressBarContainer) {
					progressBarContainer.style.display = 'none';
				}
				if (onComplete) onComplete();
			}, 100);
		}, 10);
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
	
	function createZoneCard(zone, config, removeFunc, refreshFunc) {
		const div = document.createElement('div');
		div.className = 'zone-card';
		if (config.activeId === zone.id) {
			div.classList.add('active');
		}

		div.addEventListener('click', (e) => {
			if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && !e.target.closest('button') && !e.target.classList.contains('toggle-switch')) {
				config.setActiveId(zone.id);
				refreshFunc();
			}
		});

		const isCircle = zone.shape === 'circle';
		let fieldsToShow;

		if (isCircle) {
			const otherFields = config.fields.filter(f => !['x', 'y', 'width', 'height'].includes(f.key));
			fieldsToShow = [
				{ label: 'Center X', key: 'x', prec: 1 },
				{ label: 'Center Y', key: 'y', prec: 1 },
				{ label: 'Radius', key: 'radius', prec: 1, min: 1 },
				...otherFields
			];
			if (zone.radius === undefined) {
				zone.radius = zone.width || 50;
			}
		} else {
			fieldsToShow = config.fields.filter(f => f.key !== 'radius');
		}
		
		let gridHtml = '';
		fieldsToShow.forEach(field => {
			let value = zone[field.key];
			if (value === undefined) value = 0;
			
			const isDim = field.key === 'width' || field.key === 'height';
			const fieldType = isDim ? 'text' : 'number';
			const valueAttr = (typeof value === 'number' && fieldType === 'number') ? value.toFixed(field.prec || 1) : value;
			const tooltipHtml = field.tooltip ? `<i class="fa-solid fa-circle-question help-icon" data-tooltip="${field.tooltip}"></i>` : '';
			
			gridHtml += `<div class="mini-input-group"><label>${field.label} ${tooltipHtml}</label><input type="${fieldType}" class="inp-${field.key}" value="${valueAttr}" ${field.step ? `step="${field.step}"` : ''}></div>`;
		});

		let extraHtml = '';
		if (config.extra) {
			extraHtml = config.extra(zone);
		}

		const shapeIcon = zone.shape === 'circle' ? 'fa-circle' : 'fa-square';
		div.innerHTML = `
			<div class="zone-header">
				<div style="display: flex; align-items: center; gap: 5px;">
					<input type="color" class="zone-color" value="${zone.color || config.defaultColor}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
					<i class="fa-solid ${shapeIcon}" style="color: var(--text-secondary); font-size: 10px;" title="Shape: ${zone.shape}"></i>
					<input type="text" class="zone-name" value="${zone.name}">
				</div>
				<div style="display:flex; align-items:center; gap:8px;">
					<label class="toggle-row" style="margin:0;">
						<input type="checkbox" class="inp-zone-enabled" ${zone.enabled ? 'checked' : ''}>
						<div class="toggle-switch" style="transform:scale(0.8);"></div>
					</label>
					<button class="btn-delete" title="Remove"><i class="fa-solid fa-trash"></i></button>
				</div>
			</div>
			<div class="card-grid" style="grid-template-columns: 1fr 1fr;">${gridHtml}</div>
			${extraHtml}
		`;

		const updateZone = () => {
			fieldsToShow.forEach(field => {
				const input = div.querySelector(`.inp-${field.key}`);
				if (input) {
					if (field.key === 'width' || field.key === 'height') {
						if (input.value.toLowerCase().startsWith('inf')) {
							zone[field.key] = 'inf';
						} else {
							let val = parseFloat(input.value) || 0;
							if (field.min !== undefined && val < field.min) val = field.min;
							zone[field.key] = val;
						}
					} else {
						let val = parseFloat(input.value) || 0;
						if (field.min !== undefined && val < field.min) {
							val = field.min;
							input.value = val;
						}
						zone[field.key] = val;
					}
				}
			});
			if (config.onUpdate) config.onUpdate(zone);
		};

		div.querySelector('.inp-zone-enabled').addEventListener('change', (e) => { zone.enabled = e.target.checked; });
		div.querySelector('.zone-color').addEventListener('input', (e) => { zone.color = e.target.value; });
		div.querySelector('.zone-name').addEventListener('change', (e) => { zone.name = e.target.value; });

		fieldsToShow.forEach(field => {
			const input = div.querySelector(`.inp-${field.key}`);
			input.addEventListener('change', updateZone);
			input.addEventListener('input', updateZone);
		});

		if (config.setupExtra) {
			config.setupExtra(div, zone);
		}

		div.querySelector('.btn-delete').addEventListener('click', (e) => {
			e.stopPropagation();
			removeFunc(zone.id);
			if (config.activeId === zone.id) config.setActiveId(null);
			refreshFunc();
		});
		
		div.querySelectorAll('.mini-input-group').forEach(group => {
			const label = group.querySelector('label');
			const input = group.querySelector('input');
			if (input && input.type === 'number') setupInteractiveLabel(label, input);
		});

		return div;
	}
	
	function renderVirtualVisible(force = false) {
		const bodies = Sim.bodies;
		const total = bodies.length;
		const spacer = bodiesContainer.querySelector('.virtual-spacer');
		if (!spacer || !bodiesContainer.state) return;

		const state = bodiesContainer.state;
		const viewportHeight = bodiesContainer.clientHeight || 600;
		const scrollTop = bodiesContainer.scrollTop;
		
		spacer.style.height = (total * state.itemHeight) + 'px';
		
		const startIndex = Math.floor(scrollTop / state.itemHeight);
		const visibleCount = Math.ceil(viewportHeight / state.itemHeight);
		const buffer = 3;
		
		const start = Math.max(0, startIndex - buffer);
		const end = Math.min(total, startIndex + visibleCount + buffer);
		
		const rendered = new Map();
		Array.from(spacer.children).forEach(child => {
			const idx = parseInt(child.dataset.index);
			if (force || idx < start || idx >= end) {
				child.remove();
			} else {
				rendered.set(idx, child);
			}
		});

		const fragment = document.createDocumentFragment();
		let measureItem = null;

		for (let i = start; i < end; i++) {
			if (!rendered.has(i)) {
				const body = bodies[i];
				if (body) {
					const card = createBodyCard(body, i);
					Object.assign(card.style, {
						position: 'absolute',
						top: (i * state.itemHeight) + 'px',
						left: '0',
						right: '0',
						boxSizing: 'border-box'
					});
					
					card.addEventListener('click', (e) => {
						if (e.target.tagName !== 'INPUT' && !e.target.closest('.btn-delete') && !e.target.closest('.btn-track')) {
							Render.selectedBodyIdx = i;
							window.App.ui.highlightBody(i);
						}
					});
					
					fragment.appendChild(card);
					if (!measureItem) measureItem = card;
				}
			}
		}
		
		spacer.appendChild(fragment);

		if (measureItem && state.itemHeight === 280) { 
			requestAnimationFrame(() => {
				if(measureItem.isConnected) {
					const rect = measureItem.getBoundingClientRect();
					if (rect.height > 50 && Math.abs(rect.height - state.itemHeight) > 5) {
						state.itemHeight = rect.height + 4;
						renderVirtualVisible(true);
					}
				}
			});
		}
	}
	
	function refreshGenericZoneList(config) {
		const { listContainer, collapsible, countSpan, zones, createCardFunc, removeFunc, refreshFunc } = config;
		
		if (!listContainer) return;
		listContainer.innerHTML = '';
		const zoneCount = zones.length;

		if (countSpan) countSpan.textContent = zoneCount;

		if (zoneCount > 0) {
			if (collapsible) collapsible.style.display = 'block';
		} else {
			if (collapsible) collapsible.style.display = 'none';
			return;
		}

		zones.forEach(zone => {
			const card = createCardFunc(zone, config.cardConfig, removeFunc, refreshFunc);
			listContainer.appendChild(card);
		});
	}
	
	const refreshZoneList = (zoneType) => {
		const config = zoneConfigs[zoneType];
		if (!config) return;
		
		const cardConfig = { ...config.cardConfig };
		cardConfig.activeId = cardConfig.activeId();

		refreshGenericZoneList({
			listContainer: config.listContainer,
			collapsible: config.collapsible,
			countSpan: config.countSpan,
			zones: config.zones(),
			createCardFunc: createZoneCard,
			removeFunc: config.removeFunc,
			refreshFunc: () => refreshZoneList(zoneType),
			cardConfig: cardConfig
		});
	};
	
	function refreshFieldList() {
		const collapsible = document.getElementById('fieldDefCollapsible');
		const countSpan = document.getElementById('fieldListCount');
		
		fieldsListContainer.innerHTML = '';
		const count = Sim.formulaFields.length;

		if (countSpan) countSpan.textContent = count;

		if (count > 0) {
			if (collapsible) collapsible.style.display = 'block';
		} else {
			if (collapsible) collapsible.style.display = 'none';
			return;
		}

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
	
	function refreshSolidBarrierList() {
		const collapsible = document.getElementById('barriersCollapsible');
		const countSpan = document.getElementById('barrierListCount');

		if (!barriersListContainer) return;
		barriersListContainer.innerHTML = '';

		const barrierCount = Sim.solidBarriers.length;
		if (countSpan) countSpan.textContent = barrierCount;

		if (barrierCount > 0) {
			if (collapsible) collapsible.style.display = 'block';
		} else {
			if (collapsible) collapsible.style.display = 'none';
			return;
		}

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
			
			div.querySelectorAll('.mini-input-group').forEach(group => {
				const label = group.querySelector('label');
				const input = group.querySelector('input');
				if (input) {
					setupInteractiveLabel(label, input);
				}
			});
		});
	}
	
	function refreshElasticBondList() {
		const collapsible = document.getElementById('bondsCollapsible');
		const countSpan = document.getElementById('bondListCount');

		if (!bondsListContainer) return;
		bondsListContainer.innerHTML = '';

		const bondCount = Sim.elasticBonds.length;
		if (countSpan) countSpan.textContent = bondCount;
		
		if (bondCount > 0) {
			if (collapsible) collapsible.style.display = 'block';
		} else {
			if (collapsible) collapsible.style.display = 'none';
			return;
		}
		
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
				bond.stiffness = Math.max(0, parseFloat(inpStiff.value) || 0);
				bond.damping = Math.max(0, parseFloat(inpDamp.value) || 0);
				bond.length = Math.max(1e-6, parseFloat(inpLen.value) || 0);
				bond.nonLinearity = Math.max(1e-6, parseFloat(inpNonLin.value) || 1);
				bond.breakTension = parseFloat(inpBreak.value) || -1;
				bond.activeAmp = Math.max(0, parseFloat(inpAmp.value) || 0);
				bond.activeFreq = Math.max(0, parseFloat(inpFreq.value) || 0);
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
			
			const bondConstraintMap = {
				'.inp-bstiff': 'non-negative', '.inp-bdamp': 'non-negative', '.inp-blen': 'positive',
				'.inp-bnonlin': 'positive', '.inp-bbreak': 'breakable', '.inp-bactivea': 'non-negative',
				'.inp-bactivef': 'non-negative'
			};

			div.querySelectorAll('.mini-input-group').forEach(group => {
				const label = group.querySelector('label');
				const input = group.querySelector('input, select');
				if (input.tagName === 'INPUT') {
					let constraint = 'default';
					for (const selector in bondConstraintMap) {
						if (input.matches(selector)) {
							constraint = bondConstraintMap[selector];
							break;
						}
					}
					setupInteractiveLabel(label, input, constraint);
				}
			});
		});
	}
	
	Sim.addBody = function(...args) {
		originalAddBody(...args);
		if (!isBatchLoading) {
			refreshBodyList();
		}
	};
	
	Sim.removeBody = function(index) {
		originalRemoveBody(index);
		refreshBodyList();
		refreshElasticBondList();
	};

	Sim.reset = function() {
		originalReset();
		if (!isBatchLoading) {
			refreshBodyList();
			Object.keys(zoneConfigs).forEach(refreshZoneList);
			refreshElasticBondList();
			refreshSolidBarrierList();
			refreshFieldList();
		}
	};
	
	window.App.ui = {
		syncInputs: function(syncAll = false) {
			if (bodiesContainer.classList.contains('hidden-content')) return;

			const spacer = bodiesContainer.querySelector('.virtual-spacer');
			if (!spacer) return;

			const syncCard = (card) => {
				if (!card) return;
				const index = parseInt(card.dataset.index);
				const body = Sim.bodies[index];
				if (!body) return;

				bodyProperties.forEach(prop => {
					const input = card.querySelector(`.${prop.cls}`);
					if (input && document.activeElement !== input) {
						let val = body[prop.key];
						if (typeof val === 'number') {
							input.value = formatVal(val, prop.prec !== undefined ? prop.prec : 2);
						}
					}
				});
			};

			if (syncAll) {
				const cards = spacer.children;
				for (let i = 0; i < cards.length; i++) {
					syncCard(cards[i]);
				}
			} else if (Render.selectedBodyIdx !== -1) {
				const card = spacer.querySelector(`.body-card[data-index="${Render.selectedBodyIdx}"]`);
				if (card) syncCard(card);
			}
		},
		
		highlightBody: function(index) {
			const spacer = bodiesContainer.querySelector('.virtual-spacer');
			if (!spacer) return;
			
			const cards = spacer.querySelectorAll('.body-card');
			cards.forEach(c => c.classList.remove('selected'));
			
			const card = spacer.querySelector(`.body-card[data-index="${index}"]`);
			if (card) {
				card.classList.add('selected');
			}
			
			if (bodiesContainer.state) {
				const itemTop = index * bodiesContainer.state.itemHeight;
				const itemBottom = itemTop + bodiesContainer.state.itemHeight;
				const scrollTop = bodiesContainer.scrollTop;
				const height = bodiesContainer.clientHeight;
				
				if (itemTop < scrollTop || itemBottom > scrollTop + height) {
					bodiesContainer.scrollTop = itemTop - height / 2 + bodiesContainer.state.itemHeight / 2;
				}
			}
		}
	};
	
	window.App.ui.refreshZones = () => refreshZoneList('periodicZone');
	window.App.ui.refreshViscosityZones = () => refreshZoneList('viscosityZone');
	window.App.ui.refreshFieldZones = () => refreshZoneList('fieldZone');
	window.App.ui.refreshThermalZones = () => refreshZoneList('thermalZone');
	window.App.ui.refreshAnnihilationZones = () => refreshZoneList('annihilationZone');
	window.App.ui.refreshChaosZones = () => refreshZoneList('chaosZone');
	window.App.ui.refreshVortexZones = () => refreshZoneList('vortexZone');
	window.App.ui.refreshNullZones = () => refreshZoneList('nullZone');
	window.App.ui.refreshSolidBarrierList = refreshSolidBarrierList;
	window.App.ui.refreshElasticBondList = refreshElasticBondList;
	
	window.App.ui.getBondConfig = function() {
		const select = document.getElementById('bondPresetSelect');
		if (select && bondPresets[select.value]) {
			return bondPresets[select.value];
		}
		return {};
	};
	
	setupCollapsibleList('periodicZonesListHeader', 'zonesListContainer', 'togglePeriodicZonesListBtn');
	setupCollapsibleList('viscosityZonesListHeader', 'viscosityZonesListContainer', 'toggleViscosityZonesListBtn');
	setupCollapsibleList('bondsListHeader', 'bondsListContainer', 'toggleBondsListBtn');
	setupCollapsibleList('barriersListHeader', 'barriersListContainer', 'toggleBarriersListBtn');
	setupCollapsibleList('fieldDefHeader', 'fieldDefContent', 'toggleFieldDefBtn');
	setupCollapsibleList('fieldDefListHeader', 'fieldsListContainer', 'toggleFieldDefListBtn');
	setupCollapsibleList('thermalZonesListHeader', 'thermalZonesListContainer', 'toggleThermalZonesListBtn');
	setupCollapsibleList('annihilationZonesListHeader', 'annihilationZonesListContainer', 'toggleAnnihilationZonesListBtn');
	setupCollapsibleList('chaosZonesListHeader', 'chaosZonesListContainer', 'toggleChaosZonesListBtn');
	setupCollapsibleList('vortexZonesListHeader', 'vortexZonesListContainer', 'toggleVortexZonesListBtn');
	setupCollapsibleList('nullZonesListHeader', 'nullZonesListContainer', 'toggleNullZonesListBtn');
	
	bindRange('trailLenSlider', 'trailLenVal', Sim, 'trailLength');
	bindRange('trailPrecSlider', 'trailPrecVal', Sim, 'trailStep');
	bindRange('gridPrecSlider', 'gridPrecVal', Render, 'gridDetail');
	bindRange('gridDistSlider', 'gridDistVal', Render, 'gridDistortion', true, 2);
	bindRange('gridMinDistSlider', 'gridMinDistVal', Render, 'gridMinDist');
	bindToggle('showTrailsBox', Sim, 'showTrails');
	bindToggle('camTrackingBox', Render, 'enableTracking', (checked) => {if (checked) {Render.trackedBodyIdx = -1;refreshBodyList();}});
	bindToggle('camAutoZoomBox', Render, 'enableAutoZoom', (checked) => {if (checked) Render.userZoomFactor = 1.0;});
	bindToggle('gravBox', Sim, 'enableGravity');
	bindToggle('elecBox', Sim, 'enableElectricity');
	bindToggle('magBox', Sim, 'enableMagnetism');
	bindToggle('colBox', Sim, 'enableCollision');
	bindToggle('thermoBox', Sim, 'enableThermodynamics', (checked) => {if (thermoParams) thermoParams.classList.toggle('hidden-content', !checked);});
	bindToggle('showGravFieldBox', Render, 'showGravField');
	bindToggle('showElecFieldBox', Render, 'showElecField');
	bindToggle('showMagFieldBox', Render, 'showMagField');
	bindToggle('showFormulaFieldBox', Render, 'showFormulaField');
	bindRange('fieldPrecSlider', 'fieldPrecVal', Render, 'fieldPrecision');
	bindRange('fieldScaleSlider', 'fieldScaleVal', Render, 'fieldScale');
	bindRange('trailPrecSlider', 'trailPrecVal', Sim, 'trailStep');
	bindRange('predictionLenSlider', 'predictionLenVal', Render, 'predictionLength', false, 0);
	
	initTooltips();
	initBodySorting();
	initPresets();
	initSimPresets();
	setupInjectionPreview();
	initHistoryControls();
	
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

	setInterval(() => {
		if (!Sim.paused && Render.selectedBodyIdx !== -1) {
			window.App.ui.syncInputs();
		}
	}, 150);
});