document.addEventListener('DOMContentLoaded', () => {
	let maxZIndex = 100;
	let draggedItemIndex = null;
	let isBatchLoading = false;
	
	const Sim = window.App.sim;
	const Render = window.App.render;
	
	const toggleBtn = document.getElementById('togglePanelBtn');
	const panel = document.getElementById('controlPanel');
	const header = document.getElementById('panelHeader');
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
	const dtSlider = document.getElementById('dtSlider');
	const dtDisplay = document.getElementById('dtVal');
	const thermoBox = document.getElementById('thermoBox');
	const thermoParams = document.getElementById('thermoParams');
	const ambientTempInput = document.getElementById('ambientTempInput');
	const toggleThermalZoneBtn = document.getElementById('toggleThermalZoneBtn');
	const thermalZonesListContainer = document.getElementById('thermalZonesListContainer');
	const injHeader = document.querySelector('#injectionSection .section-header');
	const fragParams = document.getElementById('fragParams');
	const fragLifetimeInput = document.getElementById('fragLifetimeInput');
	
	const Schema = window.App.BodySchema;
	
	const getInputId = (key) => {
		if (Schema[key].inputId) return Schema[key].inputId;
		const capKey = key.charAt(0).toUpperCase() + key.slice(1);
		return `new${capKey}`;
	};

	const initTabs = () => {
		const tabBtns = document.querySelectorAll('.tab-btn');
		const tabPanes = document.querySelectorAll('.tab-pane');
		const TAB_STORAGE_KEY = 'nbody_active_tab';

		const switchTab = (tabId) => {
			tabBtns.forEach(btn => {
				const wasActive = btn.classList.contains('active');
				const isActive = btn.dataset.tab === tabId;
				btn.classList.toggle('active', isActive);

				const icon = btn.querySelector('i');
				if (icon && btn.dataset.inactiveClass && btn.dataset.activeClass) {
					const inactiveClasses = btn.dataset.inactiveClass.split(' ');
					const activeClasses = btn.dataset.activeClass.split(' ');

					icon.classList.remove(...inactiveClasses, ...activeClasses);

					if (isActive) {
						icon.classList.add(...activeClasses);
						if (!wasActive) {
							icon.classList.add('icon-pop-in');
							icon.onanimationend = () => icon.classList.remove('icon-pop-in');
						}
					} else {
						icon.classList.add(...inactiveClasses);
					}
				}
			});
			tabPanes.forEach(pane => {
				pane.classList.toggle('active', pane.id === `tab-${tabId}`);
			});
			localStorage.setItem(TAB_STORAGE_KEY, tabId);
			
			if (Render.drawMode !== 'none') {
				Render.drawMode = 'none';
				updateDrawToolButtons();
			}
		};

		tabBtns.forEach(btn => {
			btn.addEventListener('click', () => {
				const tabId = btn.dataset.tab;
				switchTab(tabId);
			});
		});

		const savedTab = localStorage.getItem(TAB_STORAGE_KEY);
		if (savedTab && document.getElementById(`tab-${savedTab}`)) {
			switchTab(savedTab);
		} else {
			const defaultActive = document.querySelector('.tab-btn.active');
			if (defaultActive) {
				switchTab(defaultActive.dataset.tab);
			}
		}
	};
	
	const inputsToParse = Object.keys(Schema).filter(k => Schema[k].type === 'number').map(k => getInputId(k));
	
	const bodyProperties = Object.keys(Schema).filter(k => Schema[k].type === 'number').map(k => ({
		label: Schema[k].label, key: Schema[k].internal || k, cls: `inp-${k.replace('_', '-')}`,
		tip: Schema[k].tip, constraint: Schema[k].constraint || 'default', prec: Schema[k].prec
	}));
	
	const evaluateMathExpression = (expr) => {
		if (typeof expr !== 'string' || expr.trim() === '') return expr;

		try {
			let sanitizedExpr = expr.toLowerCase()
				.replace(/,/g, '.')
				.replace(/\^/g, '**');

			sanitizedExpr = sanitizedExpr.replace(/\bpi\b/g, Math.PI.toString());
			sanitizedExpr = sanitizedExpr.replace(/\be\b/g, Math.E.toString());

			if (/[^0-9.+\-*/%^()e\s]/.test(sanitizedExpr)) {
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

	const mkZoneCfg = (listId, colId, cntId, arr, rm, col, actId, setActId, flds, xtra, setup) => ({
		listContainer: document.getElementById(listId),
		collapsible: document.getElementById(colId),
		countSpan: document.getElementById(cntId),
		zones: () => Sim[arr],
		removeFunc: Sim[rm].bind(Sim),
		cardConfig: { defaultColor: col, activeId: () => Render[actId], setActiveId: (id) => { Render[actId] = id; }, fields: flds, extra: xtra, setupExtra: setup }
	});

	const zoneConfigs = {
		periodicZone: mkZoneCfg('zonesListContainer', 'periodicZonesCollapsible', 'periodicZoneListCount', 'periodicZones', 'removePeriodicZone', '#e67e22', 'selectedZoneId', 'selectedZoneId', 
			[{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' }, { label: 'Width', key: 'width', min: 1, tooltip: `Set 'inf' for infinite.` }, { label: 'Height', key: 'height', min: 1, tooltip: `Set 'inf' for infinite.` }],
			(z) => `<div class="mini-input-group" style="margin-top:4px;"><label>Trigger Mode</label><select class="inp-ztype"><option value="center" ${z.type === 'center' ? 'selected' : ''}>Center</option><option value="radius" ${z.type === 'radius' ? 'selected' : ''}>Radius</option></select></div>`,
			(d, z) => d.querySelector('.inp-ztype').addEventListener('change', e => z.type = e.target.value)
		),
		viscosityZone: mkZoneCfg('viscosityZonesListContainer', 'viscosityZonesCollapsible', 'viscosityZoneListCount', 'viscosityZones', 'removeViscosityZone', '#3498db', 'selectedViscosityZoneId', 'selectedViscosityZoneId',
			[{ label: 'Position X', key: 'x' }, { label: 'Position Y', key: 'y' }, { label: 'Width', key: 'width', min: 1 }, { label: 'Height', key: 'height', min: 1 }],
			(z) => `<div class="mini-input-group" style="margin-top:4px;"><label>Viscosity</label><input type="number" class="inp-viscosity" value="${z.viscosity.toFixed(2)}" step="0.01"></div>`,
			(d, z) => { const i = d.querySelector('.inp-viscosity'); const h = () => z.viscosity = parseFloat(i.value)||0; i.addEventListener('change', h); i.addEventListener('input', h); setupInteractiveLabel(i.previousElementSibling, i); }
		),
		fieldZone: mkZoneCfg('fieldZonesListContainer', 'fieldZonesCollapsible', 'fieldZoneListCount', 'fieldZones', 'removeFieldZone', '#27ae60', 'selectedFieldZoneId', 'selectedFieldZoneId',
			[{ label: 'Pos X', key: 'x' }, { label: 'Pos Y', key: 'y' }, { label: 'W', key: 'width', min: 1 }, { label: 'H', key: 'height', min: 1 }, { label: 'Acc X', key: 'fx', prec: 3, step: 0.01 }, { label: 'Acc Y', key: 'fy', prec: 3, step: 0.01 }]
		),
		thermalZone: mkZoneCfg('thermalZonesListContainer', 'thermalZonesCollapsible', 'thermalZoneListCount', 'thermalZones', 'removeThermalZone', '#e74c3c', 'selectedThermalZoneId', 'selectedThermalZoneId',
			[{ label: 'Pos X', key: 'x' }, { label: 'Pos Y', key: 'y' }, { label: 'W', key: 'width', min: 1 }, { label: 'H', key: 'height', min: 1 }],
			(z) => `<div class="card-grid" style="grid-template-columns: 1fr 1fr; margin-top:4px;"><div class="mini-input-group"><label>Temp (K)</label><input type="number" class="inp-temperature" value="${z.temperature.toFixed(0)}"></div><div class="mini-input-group"><label>Heat Trans.</label><input type="number" class="inp-htc" value="${z.heatTransferCoefficient.toFixed(2)}" step="0.01"></div></div>`,
			(d, z) => {
				const t = d.querySelector('.inp-temperature'), h = d.querySelector('.inp-htc');
				const fn = () => { z.temperature = Math.max(0, parseFloat(t.value)||0); z.heatTransferCoefficient = parseFloat(h.value)||0; };
				[t, h].forEach(e => { e.addEventListener('change', fn); e.addEventListener('input', fn); setupInteractiveLabel(e.previousElementSibling, e); });
			}
		),
		annihilationZone: mkZoneCfg('annihilationZonesListContainer', 'annihilationZonesCollapsible', 'annihilationZoneListCount', 'annihilationZones', 'removeAnnihilationZone', '#9b59b6', 'selectedAnnihilationZoneId', 'selectedAnnihilationZoneId',
			[{ label: 'Pos X', key: 'x' }, { label: 'Pos Y', key: 'y' }, { label: 'W', key: 'width', min: 1 }, { label: 'H', key: 'height', min: 1 }],
			(z) => `<div class="mini-input-group" style="margin-top:4px; grid-column: span 2;"><label class="toggle-row" style="margin:0; justify-content: flex-start;"><input type="checkbox" class="inp-particle-burst" ${z.particleBurst ? 'checked' : ''}><div class="toggle-switch" style="transform:scale(0.8);"></div><span>Particle Burst</span></label></div>`,
			(d, z) => d.querySelector('.inp-particle-burst').addEventListener('change', e => z.particleBurst = e.target.checked)
		),
		chaosZone: mkZoneCfg('chaosZonesListContainer', 'chaosZonesCollapsible', 'chaosZoneListCount', 'chaosZones', 'removeChaosZone', '#f39c12', 'selectedChaosZoneId', 'selectedChaosZoneId',
			[{ label: 'Pos X', key: 'x' }, { label: 'Pos Y', key: 'y' }, { label: 'W', key: 'width', min: 1 }, { label: 'H', key: 'height', min: 1 }],
			(z) => `<div class="card-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-top:4px;"><div class="mini-input-group"><label>Strength</label><input type="number" class="inp-strength" value="${z.strength.toFixed(2)}" step="0.01"></div><div class="mini-input-group"><label>Freq</label><input type="number" class="inp-frequency" value="${z.frequency.toFixed(2)}" step="0.01"></div><div class="mini-input-group"><label>Scale</label><input type="number" class="inp-scale" value="${(z.scale||20).toFixed(1)}" step="1"></div></div>`,
			(d, z) => {
				const s=d.querySelector('.inp-strength'), f=d.querySelector('.inp-frequency'), sc=d.querySelector('.inp-scale');
				const h = () => { z.strength = parseFloat(s.value)||0; z.frequency = parseFloat(f.value)||0; z.scale = parseFloat(sc.value)||20; };
				[s,f,sc].forEach(e => { e.addEventListener('change', h); e.addEventListener('input', h); setupInteractiveLabel(e.previousElementSibling, e); });
			}
		),
		vortexZone: mkZoneCfg('vortexZonesListContainer', 'vortexZonesCollapsible', 'vortexZoneListCount', 'vortexZones', 'removeVortexZone', '#1abc9c', 'selectedVortexZoneId', 'selectedVortexZoneId',
			[{ label: 'Center X', key: 'x' }, { label: 'Center Y', key: 'y' }, { label: 'Radius', key: 'radius', min: 1 }],
			(z) => `<div class="mini-input-group" style="margin-top:4px;"><label>Strength</label><input type="number" class="inp-strength" value="${z.strength.toFixed(2)}" step="0.1"></div>`,
			(d, z) => { const i = d.querySelector('.inp-strength'); const h = () => z.strength = parseFloat(i.value)||0; i.addEventListener('change', h); i.addEventListener('input', h); setupInteractiveLabel(i.previousElementSibling, i); }
		),
		nullZone: mkZoneCfg('nullZonesListContainer', 'nullZonesCollapsible', 'nullZoneListCount', 'nullZones', 'removeNullZone', '#7f8c8d', 'selectedNullZoneId', 'selectedNullZoneId',
			[{ label: 'Pos X', key: 'x' }, { label: 'Pos Y', key: 'y' }, { label: 'W', key: 'width', min: 1 }, { label: 'H', key: 'height', min: 1 }],
			(z) => `<div class="card-grid" style="grid-template-columns: 1fr 1fr 1fr; margin-top:4px; font-size: 10px; gap: 4px;">` + 
				['Gravity', 'Electricity', 'Magnetism'].map(t => `<label class="toggle-row" style="margin:0; justify-content: flex-start;"><input type="checkbox" class="inp-null-${t[0].toLowerCase()}" ${z[`nullify${t}`] ? 'checked' : ''}><div class="toggle-switch" style="transform:scale(0.7);"></div><span>${t.slice(0,4)}</span></label>`).join('') + `</div>`,
			(d, z) => {
				d.querySelector('.inp-null-g').addEventListener('change', e => z.nullifyGravity = e.target.checked);
				d.querySelector('.inp-null-e').addEventListener('change', e => z.nullifyElectricity = e.target.checked);
				d.querySelector('.inp-null-m').addEventListener('change', e => z.nullifyMagnetism = e.target.checked);
			}
		),
		solidBarrier: mkZoneCfg('barriersListContainer', 'barriersCollapsible', 'barrierListCount', 'solidBarriers', 'removeSolidBarrier', '#8e44ad', 'selectedBarrierId', 'selectedBarrierId',
			[{ label: 'X1', key: 'x1', prec: 1 }, { label: 'Y1', key: 'y1', prec: 1 }, { label: 'X2', key: 'x2', prec: 1 }, { label: 'Y2', key: 'y2', prec: 1 }, { label: 'Restitution', key: 'restitution', prec: 2, step: 0.05, min: 0, max: 2 }, { label: 'Friction', key: 'friction', prec: 2, step: 0.05, min: 0, max: 2 }]
		),
		elasticBond: mkZoneCfg('bondsListContainer', 'bondsCollapsible', 'bondListCount', 'elasticBonds', 'removeElasticBond', '#ffffff', 'selectedBondId', 'selectedBondId',
			[{ label: 'Stiffness (k)', key: 'stiffness', prec: 2, step: 0.01, constraint: 'non-negative' }, { label: 'Damping', key: 'damping', prec: 2, step: 0.01, constraint: 'non-negative' }, { label: 'Length', key: 'length', prec: 1, step: 1, constraint: 'positive' }, { label: 'Non-Linearity', key: 'nonLinearity', prec: 2, step: 0.1, constraint: 'positive' }, { label: 'Break Tension', key: 'breakTension', prec: 0, step: 1, constraint: 'breakable' }, { label: 'Active Amp', key: 'activeAmp', prec: 2, step: 0.05, constraint: 'non-negative' }, { label: 'Active Freq', key: 'activeFreq', prec: 2, step: 0.1, constraint: 'non-negative' }],
			(b) => {
				const b1Name = Sim.bodies[b.body1] ? Sim.bodies[b.body1].name : `#${b.body1}`;
				const b2Name = Sim.bodies[b.body2] ? Sim.bodies[b.body2].name : `#${b.body2}`;
				let presetOptions = `<option value="" disabled ${!Object.values(bondPresets).some(p => b.type === p.type && Math.abs(b.stiffness - p.stiffness) < 0.001) ? 'selected' : ''} style="display:none;">Custom</option>`;
				Object.keys(bondPresets).forEach(key => {
					const p = bondPresets[key];
					const isMatch = b.type === p.type && Math.abs(b.stiffness - p.stiffness) < 0.001;
					presetOptions += `<option value="${key}" ${isMatch ? 'selected' : ''}>${p.name}</option>`;
				});
				return `<div style="font-size:9px; color:var(--text-secondary); margin-bottom:4px;">${b1Name} <i class="fa-solid fa-link"></i> ${b2Name}</div><div class="mini-input-group"><label>Preset</label><select class="inp-btype">${presetOptions}</select></div>`;
			},
			(d, b, updateInputs) => {
				d.querySelector('.inp-btype').addEventListener('change', (e) => {
					const key = e.target.value;
					if (bondPresets[key]) {
						const p = bondPresets[key];
						Object.assign(b, { type: p.type, stiffness: p.stiffness, damping: p.damping, nonLinearity: p.nonLinearity, breakTension: p.breakTension, activeAmp: p.activeAmp, activeFreq: p.activeFreq });
						updateInputs();
					}
				});
			}
		)
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
	
	const withProgressBar = (task, onComplete) => {
		const progressBarContainer = document.getElementById('loading-progress-bar-container');
		const progressBar = document.getElementById('loading-progress-bar');

		if (!progressBarContainer || !progressBar) {
			try {
				task();
			} catch (e) {
				console.error(e);
			}
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
				} catch (e) {
					console.error("Error during loading task:", e);
				} finally {
					isBatchLoading = false;
					
					progressBar.style.width = '100%';

					setTimeout(() => {
						progressBarContainer.style.display = 'none';
						progressBar.style.transition = '';
						if (onComplete) onComplete();
					}, 250);
				}
			}, 210);
		}, 20);
	};
	
	const generateRandomParameters = (setDefault = false, onlyKinematics = false) => {
		const bodyArray = Object.values(Sim.bodies);
		let totalMass = 0;
		let comX = 0;
		let comY = 0;

		if (bodyArray.length > 0) {
			bodyArray.forEach(b => {
				const m = b.mass === -1 ? 1 : b.mass;
				if (m > 0) {
					totalMass += m;
					comX += b.x * m;
					comY += b.y * m;
				}
			});

			if (totalMass > 0) {
				comX /= totalMass;
				comY /= totalMass;
			} else if (bodyArray.length > 0) {
				bodyArray.forEach(b => {
					comX += b.x;
					comY += b.y;
				});
				comX /= bodyArray.length;
				comY /= bodyArray.length;
			}
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
					const v = Math.sqrt((Sim.units.sim.G * totalMass) / dist);
					
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
			const integrity = setDefault ? 10000 : Math.floor(Math.random() * 15000) + 5000;

			document.getElementById('newMass').value = formatVal(mass, 2);
			document.getElementById('newRadius').value = formatVal(radius, 2);
			document.getElementById('newCharge').value = formatVal(charge, 2);
			document.getElementById('newMagMoment').value = formatVal(magMoment, 2);
			document.getElementById('newLifetime').value = -1;
			document.getElementById('newRotationSpeed').value = formatVal(rotationSpeed, 3);
			document.getElementById('newFriction').value = formatVal(friction, 2);
			document.getElementById('newIntegrity').value = formatVal(integrity, 0);
			
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
				document.getElementById('newIntegrity').value = formatVal(params.integrity || 10000, 0);
				
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

		const Schema = window.App.BodySchema;
		const sortParams = [{ label: 'ID', key: 'id' }];

		Object.keys(Schema).forEach(key => {
			const def = Schema[key];
			sortParams.push({ 
				label: def.label, 
				key: def.internal || key 
			});
		});

		let optionsHtml = sortParams.map(p => `<option value="${p.key}">${p.label}</option>`).join('');
		sortContainer.innerHTML = `
			<select id="bodySortSelect" class="sort-select"><option value="">Default Order</option>${optionsHtml}</select>
			<button id="bodySortDirBtn" class="btn secondary" style="width: 30px; padding: 4px;" title="Reverse Order">
				<i class="fa-solid fa-arrow-down-a-z"></i>
			</button>
		`;

		const sortSelect = document.getElementById('bodySortSelect');
		const sortDirBtn = document.getElementById('bodySortDirBtn');
		let sortAsc = true;

		const applySort = () => {
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
	
	const setupDraggable = (panelEl, headerEl, neighbors = []) => {
		let isMouseDown = false;
		let isDragging = false;
		let startX = 0, startY = 0;
		let offsetX = 0, offsetY = 0;

		const clampPosition = () => {
			const rect = panelEl.getBoundingClientRect();
			const winW = window.innerWidth;
			const winH = window.innerHeight;
			
			let newX = rect.left;
			let newY = rect.top;
			let clamped = false;

			if (newX + rect.width > winW) { newX = winW - rect.width - 5; clamped = true; }
			if (newX < 0) { newX = 5; clamped = true; }
			if (newY + rect.height > winH) { newY = winH - rect.height - 5; clamped = true; }
			if (newY < 0) { newY = 5; clamped = true; }

			if (clamped) {
				panelEl.style.left = newX + 'px';
				panelEl.style.top = newY + 'px';
				panelEl.style.right = 'auto';
				panelEl.style.bottom = 'auto';
			}
		};

		window.addEventListener('resize', clampPosition);

		const startDrag = (clientX, clientY) => {
			isMouseDown = true;
			startX = clientX;
			startY = clientY;
			
			const rect = panelEl.getBoundingClientRect();
			offsetX = clientX - rect.left;
			offsetY = clientY - rect.top;
			
			panelEl.style.transition = 'none';
		};

		const moveDrag = (clientX, clientY) => {
			if (!isMouseDown) return;

			if (!isDragging) {
				const dx = clientX - startX;
				const dy = clientY - startY;
				if (dx * dx + dy * dy < 25) return;

				isDragging = true;
				maxZIndex++;
				panelEl.style.zIndex = maxZIndex;
				headerEl.style.cursor = 'grabbing';
				
				const rect = panelEl.getBoundingClientRect();
				panelEl.style.right = 'auto';
				panelEl.style.left = rect.left + 'px';
				panelEl.style.top = rect.top + 'px';
			}

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

				newX = Math.max(0, Math.min(winW - pW, newX));
				newY = Math.max(0, Math.min(winH - pH, newY));

				panelEl.style.left = newX + 'px';
				panelEl.style.top = newY + 'px';
			}
		};

		const endDrag = () => {
			isMouseDown = false;
			if (isDragging) {
				isDragging = false;
				headerEl.style.cursor = 'grab';
				panelEl.style.transition = '';
			}
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
			
			if (!panelEl.classList.contains('collapsed')) {
				setTimeout(clampPosition, 300);
			}
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
			if(isMouseDown) {
				if (isDragging) e.preventDefault();
				const touch = e.touches[0];
				moveDrag(touch.clientX, touch.clientY);
			}
		}, {passive: false});

		window.addEventListener('touchend', endDrag);
	};
	
	const setupInjectionPreview = () => {
		const injInputs = [
			'newMass', 'newRadius', 'newX', 'newY', 'newVX', 'newVY', 'newAX', 'newAY',
			'newCharge', 'newMagMoment', 'newRotationSpeed', 'newFriction', 'newIntegrity',
			'newTemperature', 'newSpecificHeat', 'newAbsorptionFactor', 'newCriticalTemp',
			'newTransitionFactor', 'newE_base', 'newE_min', 'newY_base', 'newY_min', 'newLifetime'
		];
		const addBtn = document.getElementById('addBodyBtn');
		
		const getVal = (id) => {
			const el = document.getElementById(id);
			return el ? (parseFloat(el.value) || 0) : 0;
		};

		const updatePreview = () => {
			const m = getVal('newMass');
			const radEl = document.getElementById('newRadius');
			let r = radEl ? parseFloat(radEl.value) : 0;
			
			if (isNaN(r) || r <= 0) {
				r = m > 1 ? Math.max(2, Math.log(m) * 2) : 2;
			}
			
			const x = getVal('newX');
			const y = getVal('newY');
			const vx = getVal('newVX');
			const vy = getVal('newVY');
			
			const presetSelect = document.getElementById('presetSelect');
			const color = (presetSelect && presetSelect.dataset.color) ? presetSelect.dataset.color : null;
			
			Render.previewBody = { x, y, vx, vy, radius: r, color };
			Render.showInjectionPreview = true;
		};
		
		const hidePreview = () => {
			const active = document.activeElement;
			const isResizing = document.body.style.cursor === 'ew-resize';
			
			if (isResizing) return;

			let isHovering = false;
			injInputs.forEach(id => {
				const el = document.getElementById(id);
				if (el) {
					const group = el.closest('.mini-input-group') || el.closest('.input-wrapper');
					if (group && group.matches(':hover')) isHovering = true;
					if (el === active) isHovering = true;
				}
			});
			if (addBtn && addBtn.matches(':hover')) isHovering = true;
			
			if (!isHovering) {
				Render.showInjectionPreview = false;
			}
		};
		
		if (window.App.ui) {
			window.App.ui.updateInjectionPreview = updatePreview;
		}

		injInputs.forEach(id => {
			const el = document.getElementById(id);
			if (el) {
				const group = el.closest('.mini-input-group') || el.closest('.input-wrapper');
				
				el.addEventListener('focus', updatePreview);
				el.addEventListener('input', updatePreview);
				el.addEventListener('blur', () => setTimeout(hidePreview, 10)); 
				
				if (group) {
					group.addEventListener('mouseenter', updatePreview);
					group.addEventListener('mouseleave', () => setTimeout(hidePreview, 10));
				}
			}
		});

		if (addBtn) {
			addBtn.addEventListener('mouseenter', updatePreview);
			addBtn.addEventListener('mouseleave', () => setTimeout(hidePreview, 10));
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

		const onMouseMove = (moveEvent) => {
			if (!isDragging) return;

			let currentValue = parseFloat(input.value);
			if (isNaN(currentValue)) {
				currentValue = 0;
			}
			
			const dx = moveEvent.clientX - lastX;
			lastX = moveEvent.clientX;

			const absCurrent = Math.abs(currentValue);
			let effectiveSensitivity;
			
			if (absCurrent === 0) {
				effectiveSensitivity = 0.01;
			} else {
				// Dynamic sensitivity: ~2% of the current magnitude per pixel
				effectiveSensitivity = Math.pow(10, Math.floor(Math.log10(absCurrent))) * 0.02;
			}

			if (moveEvent.shiftKey) effectiveSensitivity /= 10;
			if (moveEvent.ctrlKey || moveEvent.metaKey) effectiveSensitivity *= 10;
			if (moveEvent.altKey) effectiveSensitivity *= 100;

			let newValue = currentValue + dx * effectiveSensitivity;
			
			// Lower limit for constants to allow values up to 1e-100
			const minPositive = 1e-100; 
			
			const allowsNegativeOne = constraintType === 'mass' || constraintType === 'lifetime' || constraintType === 'breakable';

			if (allowsNegativeOne) {
				if (currentValue >= minPositive && newValue <= 0) {
					newValue = -1;
				} else if (currentValue === -1 && dx > 0) {
					newValue = 1.0; 
				} else if (currentValue === -1 && dx <= 0) {
					newValue = -1;
				}
			}

			if (constraintType === 'positive') {
				newValue = Math.max(minPositive, newValue);
			} else if (constraintType === 'non-negative') {
				newValue = Math.max(0, newValue);
			}

			if (newValue > 0 && newValue < minPositive && constraintType !== 'default') {
				newValue = minPositive;
			}
			
			const precision = 4;
			
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
	
	const setupBodyDragAndDrop = () => {
		let isDragging = false;
		let dragIndex = -1;
		let startY = 0;
		let dragEl = null;
		
		bodiesContainer.addEventListener('mousedown', (e) => {
			if (e.target.tagName === 'INPUT' || e.target.closest('button') || e.target.classList.contains('body-name-input')) return;
			if (e.offsetX > bodiesContainer.clientWidth) return;

			const card = e.target.closest('.body-card');
			if (!card) return;

			const sortSelect = document.getElementById('bodySortSelect');
			if (sortSelect && sortSelect.value !== "") return;

			e.preventDefault();
			
			dragIndex = parseInt(card.dataset.index, 10);
			if (isNaN(dragIndex)) return;

			isDragging = true;
			startY = e.clientY;

			const rect = card.getBoundingClientRect();
			dragEl = card.cloneNode(true);
			dragEl.classList.add('dragging');
			Object.assign(dragEl.style, {
				position: 'fixed',
				zIndex: '9999',
				width: rect.width + 'px',
				height: rect.height + 'px',
				left: rect.left + 'px',
				top: rect.top + 'px',
				pointerEvents: 'none',
				opacity: '0.9'
			});
			document.body.appendChild(dragEl);
			
			card.style.opacity = '0.3';
			document.body.style.cursor = 'grabbing';
		});

		window.addEventListener('mousemove', (e) => {
			if (!isDragging || !dragEl) return;
			e.preventDefault();
			
			const dy = e.clientY - startY;
			dragEl.style.transform = `translateY(${dy}px)`;
		});

		window.addEventListener('mouseup', (e) => {
			if (!isDragging) return;
			
			isDragging = false;
			document.body.style.cursor = '';
			
			if (dragEl) {
				dragEl.remove();
				dragEl = null;
			}
			
			const state = bodiesContainer.state;
			if (!state) return;

			const containerRect = bodiesContainer.getBoundingClientRect();
			const relativeY = e.clientY - containerRect.top + bodiesContainer.scrollTop;
			
			let targetIndex = Math.floor(relativeY / state.itemHeight);
			targetIndex = Math.max(0, Math.min(state.sortedBodyArray.length - 1, targetIndex));
			
			if (dragIndex !== -1 && dragIndex !== targetIndex) {
				const body = state.sortedBodyArray[dragIndex];
				state.sortedBodyArray.splice(dragIndex, 1);
				state.sortedBodyArray.splice(targetIndex, 0, body);
				
				state.sortedBodyArray.forEach((b, i) => {
					b.sortIndex = i;
				});
			}
			
			renderVirtualVisible(true);
			dragIndex = -1;
		});
	};
	
	const setupConstantsPanel = () => {
		const header = document.getElementById('constantsHeader');
		const content = document.getElementById('constantsContent');
		const btn = document.getElementById('toggleConstantsBtn');
		const scalingDiv = document.getElementById('scalingFactorsGrid');

		if (!header || !content || !btn) return;

		const toggleConstants = () => {
			content.classList.toggle('hidden-content');
			btn.innerHTML = content.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
		};

		header.addEventListener('click', toggleConstants);
		
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			toggleConstants();
		});

		const updateScalingInfo = () => {
			if (!scalingDiv) return;

			const u = Sim.units;
			const factors = [
				{ k: '\\( T_0 \\) (Time)', v: u.T0, unit: 's' },
				{ k: '\\( L_0 \\) (Length)', v: u.L0, unit: 'm' },
				{ k: '\\( M_0 \\) (Mass)', v: u.M0, unit: 'kg' },
				{ k: '\\( Q_0 \\) (Charge)', v: u.Q0, unit: 'C' },
				{ k: '\\( K_0 \\) (Temp.)', v: u.K0, unit: 'K' },
				{ k: '\\( N_0 \\) (Amt)', v: u.N0, unit: 'mol' },
				{ k: '\\( I_0 \\) (Int)', v: u.I0, unit: 'cd' },
				{ k: '\\( A_0 \\) (Curr)', v: u.A0, unit: 'A' }
			];
			
			scalingDiv.innerHTML = '';
			factors.forEach(f => {
				const div = document.createElement('div');
				div.innerHTML = `<span style="color:var(--text-secondary);">${f.k}:</span> <span style="color:var(--text-primary);">${f.v.toExponential(2)} ${f.unit}</span>`;
				scalingDiv.appendChild(div);
			});

			if (window.renderMathInElement) {
				renderMathInElement(scalingDiv, {
					delimiters: [{left: '\\(', right: '\\)', display: false}]
				});
			}
		};

		const configs = [
			{ prop: 'c', id: 'const-c', min: 1e-60, max: 1e60 },
			{ prop: 'G', id: 'const-G', min: 1e-60, max: 1e60 },
			{ prop: 'h', id: 'const-h', min: 1e-60, max: 1e60 },
			{ prop: 'Ke', id: 'const-Ke', min: 1e-60, max: 1e60 },
			{ prop: 'kB', id: 'const-kB', min: 1e-60, max: 1e60 },
			{ prop: 'NA', id: 'const-NA', min: 1, max: 1e60 },
			{ prop: 'Kcd', id: 'const-Kcd', min: 1e-60, max: 1e60 }
		];

		const toSlider = (v, min, max) => {
			if (v <= 0) return 0;
			return (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min));
		};
		const fromSlider = (s, min, max) => Math.pow(10, Math.log10(min) + parseFloat(s) * (Math.log10(max) - Math.log10(min)));
		
		const setDisplay = (textEl, v) => {
			textEl.value = formatVal(v, 4);
		};

		configs.forEach(cfg => {
			const slider = document.getElementById(`${cfg.id}-slider`);
			const text = document.getElementById(`${cfg.id}-text`);
			if (!slider || !text) return;

			slider.min = 0;
			slider.max = 1;
			slider.step = 'any';

			const obj = Sim.units.sim;
			const initialVal = obj[cfg.prop];

			slider.value = toSlider(initialVal, cfg.min, cfg.max);
			setDisplay(text, initialVal);
			
			const updateState = (val, source) => {
				if (val <= 0 && source !== 'slider') val = Number.EPSILON; 
				obj[cfg.prop] = val;
				
				if (source !== 'slider') {
					slider.value = toSlider(val, cfg.min, cfg.max);
				}
				if (source !== 'text') {
					setDisplay(text, val);
				}
				updateScalingInfo();
			};

			slider.addEventListener('input', () => {
				const v = fromSlider(slider.value, cfg.min, cfg.max);
				updateState(v, 'slider');
			});

			text.addEventListener('change', () => {
				let v = parseFloat(text.value);
				if (isNaN(v)) v = obj[cfg.prop];
				updateState(v, 'text');
			});
			
			// Handles drag from interactive label (which triggers 'input') and typing
			text.addEventListener('input', () => {
				const v = parseFloat(text.value);
				if (!isNaN(v)) {
					// Directly update model and slider without reformatting the text to avoid cursor jumps
					obj[cfg.prop] = v;
					slider.value = toSlider(v, cfg.min, cfg.max);
					updateScalingInfo();
				}
			});

			const label = slider.parentElement.previousElementSibling;
			if (label && typeof setupInteractiveLabel === 'function') {
				setupInteractiveLabel(label, text, 'positive');
			}
		});

		updateScalingInfo();
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
		
		const toolsContent = document.getElementById('toolsContent');
		if (toolsContent) {
			toolsContent.appendChild(historyHeader);
			toolsContent.appendChild(historyContent);
		}

		const undoBtn = document.getElementById('undoBtn');
		const redoBtn = document.getElementById('redoBtn');

		const refreshAllLists = () => {
			refreshBodyList();
			Object.keys(zoneConfigs).forEach(refreshZoneList);
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
		
		if (window.App.ui && window.App.ui.updateInjectionPreview) {
			window.App.ui.updateInjectionPreview();
		}
	});
	
	bodiesContainer.addEventListener('click', (e) => {
		const card = e.target.closest('.body-card');
		if (!card) return;
		const id = parseInt(card.dataset.id, 10);
		const body = Sim.bodies[id];
		if (!body) return;

		if (e.target.closest('.btn-delete')) {
			e.stopPropagation();
			Sim.removeBody(id);
			return;
		}

		if (e.target.closest('.btn-active')) {
			e.stopPropagation();
			body.active = !body.active;
			refreshBodyList();
			return;
		}

		if (e.target.closest('.btn-track')) {
			e.stopPropagation();
			if (Render.trackedBodyId === id) {
				Render.trackedBodyId = null;
			} else {
				Render.trackedBodyId = id;
				Render.enableTracking = false;
				document.getElementById('camTrackingBox').checked = false;
			}
			refreshBodyList();
			return;
		}
		
		if (e.target.tagName !== 'INPUT' && !e.target.closest('button')) {
			Render.selectedBodyId = id;
			window.App.ui.highlightBody(id);
		}
	});
	
	bodiesContainer.addEventListener('input', (e) => {
		const input = e.target;
		const card = input.closest('.body-card');
		if (!card) return;
		const id = parseInt(card.dataset.id, 10);
		const body = Sim.bodies[id];
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
		const id = parseInt(card.dataset.id, 10);
		const body = Sim.bodies[id];
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
		if (e.code === 'F11') {
			e.preventDefault();
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
			} else {
				if (document.exitFullscreen) {
					document.exitFullscreen();
				}
			}
			return;
		}
		
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
	
	toggleInjBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleInjection(); });
	
	playBtn.addEventListener('click', () => {
		Sim.paused = !Sim.paused;
		if(Sim.paused) {
			playBtn.innerHTML = '<i class="fa-solid fa-play"></i> RESUME';
			playBtn.classList.remove('primary');
			playBtn.style.color = "#aaa";
		} else {
			Sim.tickCount = 0;
			Sim.simTime = 0;
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
	
	if (ambientTempInput) {
		ambientTempInput.value = Sim.T_ambient;
		ambientTempInput.addEventListener('change', () => {
			let val = parseFloat(ambientTempInput.value);
			if (isNaN(val)) val = -1;
			Sim.T_ambient = val;
		});
		addMathParsing(ambientTempInput);
	}
	
	if (thermoParams) {
		thermoParams.classList.toggle('hidden-content', !Sim.enableThermodynamics);
	}

	if (fragLifetimeInput) {
		fragLifetimeInput.value = Sim.fragmentLifetime;
		fragLifetimeInput.addEventListener('change', () => {
			let val = parseFloat(fragLifetimeInput.value);
			if (isNaN(val)) val = -1;
			Sim.fragmentLifetime = val;
		});
		addMathParsing(fragLifetimeInput);
	}
	
	if (fragParams) {
		fragParams.classList.toggle('hidden-content', !Sim.enableFragmentation);
	}
	
	function createBodyCard(body) {
		const div = document.createElement('div');
		div.className = 'body-card';
		if (!body.active) {
			div.classList.add('inactive');
		}
		div.style.borderLeftColor = body.color;
		div.dataset.id = body.id;
		
		const isTracked = Render.trackedBodyId === body.id;
		const trackBtnClass = isTracked ? 'active' : '';
		const trackIconClass = isTracked ? 'fa-solid fa-eye' : 'fa-regular fa-eye';

		const isActive = body.active;
		const activeBtnClass = isActive ? '' : 'inactive-btn';
		const activeIconClass = isActive ? 'fa-toggle-on' : 'fa-toggle-off';

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
					<button class="btn-active btn-icon ${activeBtnClass}" title="Toggle Active State"><i class="fa-solid ${activeIconClass}"></i></button>
					<button class="btn-track btn-icon ${trackBtnClass}" title="Track Body"><i class="${trackIconClass}"></i></button>
				</span>
				<button class="btn-delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
			</div>
			<div class="card-grid">${gridHtml}</div>
		`;
		
		const colorInput = div.querySelector('.color-input-hidden');
		const colorDot = div.querySelector('.body-color-dot');
		if (colorInput) {
			colorInput.addEventListener('input', (e) => {
				const c = e.target.value;
				if (colorDot) {
					colorDot.style.backgroundColor = c;
					colorDot.style.boxShadow = `0 0 5px ${c}`;
				}
				div.style.borderLeftColor = c;
			});
			colorInput.addEventListener('click', (e) => e.stopPropagation());
		}

		if (!('ontouchstart' in window)) {
			div.querySelectorAll('.mini-input-group label').forEach(label => {
				label.style.cursor = 'ew-resize';
				label.title = "Click and drag to change value. Hold Shift for precision, Ctrl for speed.";
			});
		}
		
		return div;
	}
	
	function refreshBodyList() {
		let bodyArray = Object.values(Sim.bodies);
		const total = bodyArray.length;
		bodyCountLabel.textContent = total;
		
		const sortSelect = document.getElementById('bodySortSelect');
		const sortDirBtn = document.getElementById('bodySortDirBtn');
		const key = sortSelect ? sortSelect.value : '';
		const sortAsc = sortDirBtn ? sortDirBtn.innerHTML.includes('a-z') : true;

		if (key) {
			bodyArray.sort((a, b) => {
				let valA = a[key];
				let valB = b[key];
				
				if (valA === undefined || valA === null) valA = (typeof valB === 'string' ? '' : 0);
				if (valB === undefined || valB === null) valB = (typeof valA === 'string' ? '' : 0);

				if (typeof valA === 'string' || typeof valB === 'string') {
					const strA = String(valA).toLowerCase();
					const strB = String(valB).toLowerCase();
					return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
				}
				
				return sortAsc ? (valA - valB) : (valB - valA);
			});
		} else {
			bodyArray.sort((a,b) => {
				const ia = a.sortIndex !== undefined ? a.sortIndex : Number.MAX_SAFE_INTEGER;
				const ib = b.sortIndex !== undefined ? b.sortIndex : Number.MAX_SAFE_INTEGER;
				if (ia !== ib) return ia - ib;
				return a.id - b.id;
			});
		}
		
		if (!bodiesContainer.state) {
			bodiesContainer.innerHTML = '';
			bodiesContainer.state = {
				itemHeight: 280, 
				ticking: false,
				spacer: document.createElement('div'),
				sortedBodyArray: []
			};
			bodiesContainer.state.spacer.className = 'virtual-spacer';
			Object.assign(bodiesContainer.state.spacer.style, {
				position: 'relative', width: '100%', overflow: 'hidden', height: '0px'
			});
			bodiesContainer.appendChild(bodiesContainer.state.spacer);
			
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
		
		bodiesContainer.state.sortedBodyArray = bodyArray;
		renderVirtualVisible(true);
		
		if (Render.selectedBodyId !== null) {
			window.App.ui.highlightBody(Render.selectedBodyId);
		}
	}
	
	function refreshBodyListAsync(onComplete) {
		const totalBodies = Object.keys(Sim.bodies).length;

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

		const shapeIcon = zone.shape ? (zone.shape === 'circle' ? 'fa-circle' : 'fa-square') : 'fa-vector-square';
		const shapeTitle = zone.shape ? `Shape: ${zone.shape}` : 'Object';
		
		div.innerHTML = `
			<div class="zone-header">
				<div style="display: flex; align-items: center; gap: 5px;">
					<input type="color" class="zone-color" value="${zone.color || config.defaultColor}" style="width:20px; height:20px; border:none; background:none; padding:0; cursor:pointer;">
					<i class="fa-solid ${shapeIcon}" style="color: var(--text-secondary); font-size: 10px;" title="${shapeTitle}"></i>
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
			${config.subtitle ? config.subtitle(zone) : ''}
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
			config.setupExtra(div, zone, updateZone);
		}

		div.querySelector('.btn-delete').addEventListener('click', (e) => {
			e.stopPropagation();
			removeFunc(zone.id);
			if (config.activeId === zone.id) config.setActiveId(null);
			refreshFunc();
		});
		
		div.querySelectorAll('.mini-input-group').forEach((group, idx) => {
			const label = group.querySelector('label');
			const input = group.querySelector('input');
			if (input && input.type === 'number') {
				const fieldConfig = fieldsToShow[idx]; 
				// Find matching field config by class if index method is unreliable due to extra html
				const key = input.className.replace('inp-', '');
				const fc = fieldsToShow.find(f => f.key === key);
				setupInteractiveLabel(label, input, fc ? fc.constraint : 'default');
			}
		});

		return div;
	}
	
	function renderVirtualVisible(force = false) {
		const spacer = bodiesContainer.querySelector('.virtual-spacer');
		if (!spacer || !bodiesContainer.state) return;
	
		const state = bodiesContainer.state;
		const bodies = state.sortedBodyArray;
		const total = bodies.length;
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
					const card = createBodyCard(body);
					card.dataset.index = i;
					Object.assign(card.style, {
						position: 'absolute',
						top: (i * state.itemHeight) + 'px',
						left: '0',
						right: '0',
						boxSizing: 'border-box'
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
	
	Sim.addBody = function(...args) {
		originalAddBody(...args);
		if (!isBatchLoading) {
			refreshBodyList();
		}
	};
	
	Sim.removeBody = function(id) {
		originalRemoveBody(id);
		refreshBodyList();
		refreshZoneList('elasticBond');
	};

	Sim.reset = function() {
		originalReset();
		if (!isBatchLoading) {
			refreshBodyList();
			Object.keys(zoneConfigs).forEach(refreshZoneList);
			refreshFieldList();
		}
	};
	
	window.App.ui = {
		syncInputs: function(syncAll = false) {
			if (bodiesContainer.classList.contains('hidden-content') || !bodiesContainer.state) return;

			const spacer = bodiesContainer.state.spacer;
			if (!spacer) return;

			const syncCard = (card) => {
				if (!card) return;
				const id = parseInt(card.dataset.id);
				const body = Sim.bodies[id];
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
			} else if (Render.selectedBodyId !== null) {
				const card = spacer.querySelector(`.body-card[data-id="${Render.selectedBodyId}"]`);
				if (card) syncCard(card);
			}
		},
		
		highlightBody: function(id) {
			if (!bodiesContainer.state) return;
			const { spacer, sortedBodyArray, itemHeight } = bodiesContainer.state;
			if (!spacer) return;
			
			const cards = spacer.querySelectorAll('.body-card');
			cards.forEach(c => c.classList.remove('selected'));
			
			const card = spacer.querySelector(`.body-card[data-id="${id}"]`);
			if (card) {
				card.classList.add('selected');
			}
			
			const indexInSorted = sortedBodyArray.findIndex(b => b.id === id);
			if (indexInSorted > -1) {
				const itemTop = indexInSorted * itemHeight;
				const itemBottom = itemTop + itemHeight;
				const scrollTop = bodiesContainer.scrollTop;
				const height = bodiesContainer.clientHeight;
				
				if (itemTop < scrollTop || itemBottom > scrollTop + height) {
					bodiesContainer.scrollTop = itemTop - height / 2 + itemHeight / 2;
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
	window.App.ui.refreshSolidBarrierList = () => refreshZoneList('solidBarrier');
	window.App.ui.refreshElasticBondList = () => refreshZoneList('elasticBond');
	window.App.ui.getBondConfig = function() { const s = document.getElementById('bondPresetSelect'); return (s && bondPresets[s.value]) ? bondPresets[s.value] : {}; };

	[
		['periodicZonesListHeader', 'zonesListContainer', 'togglePeriodicZonesListBtn'], ['viscosityZonesListHeader', 'viscosityZonesListContainer', 'toggleViscosityZonesListBtn'],
		['bondsListHeader', 'bondsListContainer', 'toggleBondsListBtn'], ['barriersListHeader', 'barriersListContainer', 'toggleBarriersListBtn'],
		['fieldDefHeader', 'fieldDefContent', 'toggleFieldDefBtn'], ['fieldDefListHeader', 'fieldsListContainer', 'toggleFieldDefListBtn'],
		['thermalZonesListHeader', 'thermalZonesListContainer', 'toggleThermalZonesListBtn'], ['annihilationZonesListHeader', 'annihilationZonesListContainer', 'toggleAnnihilationZonesListBtn'],
		['chaosZonesListHeader', 'chaosZonesListContainer', 'toggleChaosZonesListBtn'], ['vortexZonesListHeader', 'vortexZonesListContainer', 'toggleVortexZonesListBtn'],
		['nullZonesListHeader', 'nullZonesListContainer', 'toggleNullZonesListBtn'],
		['advancedDisplayHeader', 'displayAdevancedContent', 'toggleAdvancedDisplayBtn']
	].forEach(args => setupCollapsibleList(...args));

	const bindCfgs = [
		['trailLenSlider', 'trailLenVal', Sim, 'trailLength'], ['trailPrecSlider', 'trailPrecVal', Sim, 'trailStep'],
		['gridPrecSlider', 'gridPrecVal', Render, 'gridDetail'], ['gridDistSlider', 'gridDistVal', Render, 'gridDistortion', true, 2],
		['gridMinDistSlider', 'gridMinDistVal', Render, 'gridMinDist'], ['fieldPrecSlider', 'fieldPrecVal', Render, 'fieldPrecision'],
		['fieldScaleSlider', 'fieldScaleVal', Render, 'fieldScale'], ['predictionLenSlider', 'predictionLenVal', Render, 'predictionLength', false, 0]
	];
	bindCfgs.forEach(args => bindRange(...args));

	const toggleCfgs = [
		['showTrailsBox', Sim, 'showTrails'], ['showGravFieldBox', Render, 'showGravField'], ['showElecFieldBox', Render, 'showElecField'],
		['showMagFieldBox', Render, 'showMagField'], ['showFormulaFieldBox', Render, 'showFormulaField'], ['physicalColorBox', Sim, 'enablePhysicalColors'],
		['gravBox', Sim, 'enableGravity'], ['elecBox', Sim, 'enableElectricity'], ['magBox', Sim, 'enableMagnetism'], ['colBox', Sim, 'enableCollision'],
		['camTrackingBox', Render, 'enableTracking', (c) => { if (c) { Render.trackedBodyId = null; refreshBodyList(); } }],
		['camAutoZoomBox', Render, 'enableAutoZoom', (c) => { if (c) Render.userZoomFactor = 1.0; }],
		['thermoBox', Sim, 'enableThermodynamics', (c) => { if (thermoParams) thermoParams.classList.toggle('hidden-content', !c); }],
		['fragBox', Sim, 'enableFragmentation', (c) => { if (fragParams) fragParams.classList.toggle('hidden-content', !c); }]
	];
	toggleCfgs.forEach(args => bindToggle(...args));
	
	setupBodyDragAndDrop();
	setupDraggable(panel, header, []);
	initTabs();
	
	initTooltips();
	initBodySorting();
	initPresets();
	initSimPresets();
	setupInjectionPreview();
	initHistoryControls();
	
	setupConstantsPanel();
	
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
		if (!Sim.paused && Render.selectedBodyId !== null) {
			window.App.ui.syncInputs();
		}
	}, 150);
});