const Rendering = {
	canvas: null,
	ctx: null,
	width: 0,
	height: 0,
	
	camX: 0,
	camY: 0,
	zoom: 1,
	
	isDragging: false,
	lastMouseX: 0,
	lastMouseY: 0,
	lastTouchDist: null,
	pinchCenter: null,
	
	currentMouseX: 0,
	currentMouseY: 0,
	currentWorldX: 0,
	currentWorldY: 0,
	showCoords: false,
	
	enableTracking: false,
	enableAutoZoom: false,
	userZoomFactor: 1.0, 

	gridDetail: 5,
	gridDistortion: 2,
	gridMinDist: 45,
	
	showGravField: false,
	showElecField: false,
	showMagField: false,
	showFormulaField: false,
	fieldPrecision: 15,
	fieldScale: 50,
	
	selectedBodyIdx: -1,
	hoveredBodyIdx: -1,
	dragMode: null, 
	originalDragState: null,
	vectorScale: 15,
	
	predictionLength: 300,

	drawMode: 'none', 
	drawShapes: { periodic: 'rectangle', viscosity: 'rectangle', field: 'rectangle', thermal: 'rectangle', annihilation: 'rectangle', chaos: 'rectangle', null: 'rectangle' },
	selectedZoneId: null,
	selectedViscosityZoneId: null,
	selectedThermalZoneId: null,
	selectedFieldZoneId: null,
	selectedAnnihilationZoneId: null,
	selectedChaosZoneId: null,
	selectedVortexZoneId: null,
	selectedNullZoneId: null,
	selectedBondId: null,
	selectedBarrierId: null,
	
	tempZoneStart: null,
	tempZoneCurrent: null,
	tempBondStart: null,
	tempBarrierStart: null,
	
	showInjectionPreview: false,
	previewBody: null,

	hoveredIndicator: null,
	offScreenMassThresholdFactor: 1.5,
	
	cursorHideTimeout: null,

	init: function() {
		this.selectedFormulaFieldIdx = -1;
		this.canvas = document.getElementById('simCanvas');
		this.ctx = this.canvas.getContext('2d');
		
		this.fps = 0;
		this.lastFrameTime = performance.now();
		this.frameCount = 0;
		this.lastFpsUpdateTime = 0;
		this.timeAccumulator = 0;
		this.distortionResult = { x: 0, y: 0 };
		
		window.addEventListener('resize', () => this.resize());
		this.resize();
		
		this.setupInputs();
		this.loop();
	},

	resize: function() {
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.canvas.width = this.width;
		this.canvas.height = this.height;
	},
	
	resetCursorTimeout: function() {
		if (this.canvas.style.cursor === 'none') {
			this.canvas.style.cursor = this.drawMode !== 'none' ? 'crosshair' : 'default';
		}
		clearTimeout(this.cursorHideTimeout);
		this.cursorHideTimeout = setTimeout(() => {
			this.canvas.style.cursor = 'none';
		}, 3000);
	},
	
	setupInputs: function() {
		const getMouseWorldPos = (clientX, clientY) => {
			const rect = this.canvas.getBoundingClientRect();
			const mx = clientX - rect.left;
			const my = clientY - rect.top;
			const wx = (mx - this.width/2 - this.camX) / this.zoom;
			const wy = (my - this.height/2 - this.camY) / this.zoom;
			return { x: wx, y: wy, mx: mx, my: my };
		};

		this.canvas.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			e.stopPropagation();
			return false;
		});

		this.canvas.addEventListener('wheel', (e) => {
			e.preventDefault();
			const zoomIntensity = 0.1;
			const delta = e.deltaY < 0 ? 1 : -1;
			const factor = Math.exp(delta * zoomIntensity);
			this.handleZoom(factor, e.clientX, e.clientY);
		}, { passive: false });

		const handleStart = (clientX, clientY, e) => {
			let m = getMouseWorldPos(clientX, clientY);
			const bodies = window.App.sim.bodies;
			
			const isDrawing = this.drawMode === 'periodic' || this.drawMode === 'viscosity' || this.drawMode === 'field' || this.drawMode === 'thermal' || this.drawMode === 'barrier' || this.drawMode === 'annihilation' || this.drawMode === 'chaos' || this.drawMode === 'vortex' || this.drawMode === 'null';
			if (isDrawing) {
				const shiftPressed = e && e.shiftKey;
				if (!shiftPressed && this.gridStep > 0) {
					const snapped = this.snapCoords(m.x, m.y);
					m.x = snapped.x;
					m.y = snapped.y;
				}
			}

			if (this.drawMode === 'periodic' || this.drawMode === 'viscosity' || this.drawMode === 'field' || this.drawMode === 'thermal' || this.drawMode === 'annihilation' || this.drawMode === 'chaos' || this.drawMode === 'vortex' || this.drawMode === 'null') {
				this.tempZoneStart = { x: m.x, y: m.y };
				this.tempZoneCurrent = { x: m.x, y: m.y };
				this.isDragging = true;
				this.showCoords = true;
				return;
			}
			
			if (this.drawMode === 'barrier') {
				this.tempBarrierStart = { x: m.x, y: m.y };
				this.tempZoneCurrent = { x: m.x, y: m.y };
				this.isDragging = true;
				this.showCoords = true;
				return;
			}
			
			if (this.drawMode === 'bond') {
				for (let i = 0; i < bodies.length; i++) {
					const b = bodies[i];
					const dist = Math.sqrt((m.x - b.x)**2 + (m.y - b.y)**2);
					if (dist < Math.max(b.radius, 15 / this.zoom)) { 
						this.tempBondStart = i;
						this.isDragging = true;
						this.showCoords = true;
						return;
					}
				}
				return;
			}

			this.wasPaused = window.App.sim.paused;

			if (this.selectedBodyIdx !== -1 && bodies[this.selectedBodyIdx]) {
				const b = bodies[this.selectedBodyIdx];
				const tipX = b.x + b.vx * this.vectorScale;
				const tipY = b.y + b.vy * this.vectorScale;
				const distToTip = Math.sqrt((m.x - tipX)**2 + (m.y - tipY)**2);
				
				if (distToTip < 20 / this.zoom) { 
					this.dragMode = 'vector';
					this.isDragging = true;
					this.showCoords = true;
					this.originalDragState = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
					window.App.sim.paused = true;
					return;
				}
			}

			let clickedIdx = -1;
			for (let i = bodies.length - 1; i >= 0; i--) {
				const b = bodies[i];
				const dist = Math.sqrt((m.x - b.x)**2 + (m.y - b.y)**2);
				if (dist < Math.max(b.radius, 15 / this.zoom)) { 
					clickedIdx = i;
					break;
				}
			}

			if (clickedIdx !== -1) {
				if (this.selectedBodyIdx !== clickedIdx) {
					this.selectedBodyIdx = clickedIdx;
					this.selectedZoneId = null;
					this.selectedViscosityZoneId = null;
					this.selectedFieldZoneId = null;
					this.selectedThermalZoneId = null;
					this.selectedAnnihilationZoneId = null;
					this.selectedBondId = null;
					this.selectedBarrierId = null;
					if (window.App.ui) {
						if (window.App.ui.highlightBody) window.App.ui.highlightBody(clickedIdx);
						if (window.App.ui.refreshZones) window.App.ui.refreshZones();
						if (window.App.ui.refreshViscosityZones) window.App.ui.refreshViscosityZones();
						if (window.App.ui.refreshFieldZones) window.App.ui.refreshFieldZones();
						if (window.App.ui.refreshThermalZones) window.App.ui.refreshThermalZones();
						if (window.App.ui.refreshAnnihilationZones) window.App.ui.refreshAnnihilationZones();
						if (window.App.ui.refreshElasticBondList) window.App.ui.refreshElasticBondList();
						if (window.App.ui.refreshSolidBarrierList) window.App.ui.refreshSolidBarrierList();
					}
				}
				
				const b = bodies[clickedIdx];
				this.dragMode = 'body';
				this.isDragging = true;
				this.showCoords = true;
				this.originalDragState = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
				window.App.sim.paused = true; 
				
			} else {
				this.selectedBodyIdx = -1;
				this.selectedZoneId = null;
				this.selectedViscosityZoneId = null;
				this.selectedFieldZoneId = null;
				this.selectedThermalZoneId = null;
				this.selectedAnnihilationZoneId = null;
				this.selectedBondId = null;
				this.selectedBarrierId = null;
				
				if (window.App.ui) {
					if (window.App.ui.highlightBody) window.App.ui.highlightBody(-1);
					if (window.App.ui.refreshZones) window.App.ui.refreshZones();
					if (window.App.ui.refreshViscosityZones) window.App.ui.refreshViscosityZones();
					if (window.App.ui.refreshFieldZones) window.App.ui.refreshFieldZones();
					if (window.App.ui.refreshThermalZones) window.App.ui.refreshThermalZones();
					if (window.App.ui.refreshAnnihilationZones) window.App.ui.refreshAnnihilationZones();
					if (window.App.ui.refreshElasticBondList) window.App.ui.refreshElasticBondList();
					if (window.App.ui.refreshSolidBarrierList) window.App.ui.refreshSolidBarrierList();
				}

				if (!this.enableTracking) {
					this.dragMode = 'cam';
					this.lastMouseX = clientX;
					this.lastMouseY = clientY;
					this.canvas.style.cursor = 'grabbing';
				}
				this.isDragging = true;
			}
		};
		
		const handleMove = (clientX, clientY, e) => {
			const bodies = window.App.sim.bodies;
			let m = getMouseWorldPos(clientX, clientY);
			this.currentWorldX = m.x;
			this.currentWorldY = m.y;
			this.currentMouseX = clientX;
			this.currentMouseY = clientY;

			let foundHover = false;
			if (!this.isDragging && this.drawMode === 'none') {
				for (let i = bodies.length - 1; i >= 0; i--) {
					const b = bodies[i];
					const dist = Math.sqrt((m.x - b.x)**2 + (m.y - b.y)**2);
					if (dist < Math.max(b.radius, 15 / this.zoom)) {
						this.hoveredBodyIdx = i;
						this.canvas.style.cursor = 'pointer';
						foundHover = true;
						break;
					}
				}
			}
			if (!foundHover) {
				this.hoveredBodyIdx = -1;
				if (!this.isDragging) {
					this.canvas.style.cursor = this.drawMode !== 'none' ? 'crosshair' : 'default';
				}
			}
			
			if (!this.isDragging) return;

			const isDrawing = (this.drawMode === 'periodic' || this.drawMode === 'viscosity' || this.drawMode === 'field' || this.drawMode === 'thermal' || this.drawMode === 'barrier' || this.drawMode === 'annihilation' || this.drawMode === 'chaos' || this.drawMode === 'vortex' || this.drawMode === 'null');
			if (isDrawing) {
				const shiftPressed = e && e.shiftKey;
				if (!shiftPressed && this.gridStep > 0) {
					const snapped = this.snapCoords(m.x, m.y);
					m.x = snapped.x;
					m.y = snapped.y;
				}
			}

			if ((this.drawMode === 'periodic' || this.drawMode === 'viscosity' || this.drawMode === 'field' || this.drawMode === 'thermal' || this.drawMode === 'annihilation' || this.drawMode === 'chaos' || this.drawMode === 'vortex' || this.drawMode === 'null') && this.tempZoneStart) {
				this.tempZoneCurrent = { x: m.x, y: m.y };
			} else if (this.drawMode === 'barrier' && this.tempBarrierStart) {
				this.tempZoneCurrent = { x: m.x, y: m.y };
			} else if (this.drawMode === 'bond' && this.tempBondStart !== null) {
				this.tempZoneCurrent = { x: m.x, y: m.y };
			} else if (this.dragMode === 'body' && this.selectedBodyIdx !== -1) {
				const b = bodies[this.selectedBodyIdx];
				if (b) {
					let finalX = m.x;
					let finalY = m.y;
					
					if (e && !e.shiftKey) {
						const snapThreshold = 10 / this.zoom;
						if (Math.abs(m.x) < snapThreshold) {
							finalX = 0;
						}
						if (Math.abs(m.y) < snapThreshold) {
							finalY = 0;
						}
					}
					
					b.x = finalX;
					b.y = finalY;
					b.path = []; 
				}
			} else if (this.dragMode === 'vector' && this.selectedBodyIdx !== -1) {
				const b = bodies[this.selectedBodyIdx];
				if (b) {
					b.vx = (m.x - b.x) / this.vectorScale;
					b.vy = (m.y - b.y) / this.vectorScale;
				}
			} else if (this.dragMode === 'cam' && !this.enableTracking) {
				const dx = clientX - this.lastMouseX;
				const dy = clientY - this.lastMouseY;
				this.camX += dx;
				this.camY += dy;
				this.lastMouseX = clientX;
				this.lastMouseY = clientY;
			}
		};

		const handleEnd = (clientX, clientY) => {
			this.showCoords = false;
			if ((this.drawMode === 'periodic' || this.drawMode === 'viscosity' || this.drawMode === 'field' || this.drawMode === 'thermal' || this.drawMode === 'annihilation' || this.drawMode === 'chaos' || this.drawMode === 'vortex' || this.drawMode === 'null') && this.tempZoneStart && this.tempZoneCurrent) {
				if (this.drawMode === 'vortex' || (this.drawShapes[this.drawMode] === 'circle')) {
					const cx = this.tempZoneStart.x;
					const cy = this.tempZoneStart.y;
					const dx = this.tempZoneCurrent.x - cx;
					const dy = this.tempZoneCurrent.y - cy;
					const radius = Math.sqrt(dx * dx + dy * dy);

					if (radius > 2) {
						if (this.drawMode === 'periodic') {
							window.App.sim.addPeriodicZone(cx, cy, radius, 0, null, null, 'circle');
							if (window.App.ui && window.App.ui.refreshZones) window.App.ui.refreshZones();
						} else if (this.drawMode === 'viscosity') {
							window.App.sim.addViscosityZone(cx, cy, radius, 0, null, null, 'circle');
							if (window.App.ui && window.App.ui.refreshViscosityZones) window.App.ui.refreshViscosityZones();
						} else if (this.drawMode === 'field') {
							window.App.sim.addFieldZone(cx, cy, radius, 0, null, null, null, null, 'circle');
							if (window.App.ui && window.App.ui.refreshFieldZones) window.App.ui.refreshFieldZones();
						} else if (this.drawMode === 'thermal') {
							window.App.sim.addThermalZone(cx, cy, radius, 0, null, null, null, 'circle');
							if (window.App.ui && window.App.ui.refreshThermalZones) window.App.ui.refreshThermalZones();
						} else if (this.drawMode === 'annihilation') {
							window.App.sim.addAnnihilationZone(cx, cy, radius, 0, false, null, 'circle');
							if (window.App.ui && window.App.ui.refreshAnnihilationZones) window.App.ui.refreshAnnihilationZones();
						} else if (this.drawMode === 'chaos') {
							window.App.sim.addChaosZone(cx, cy, radius, 0, null, null, null, 'circle');
							if (window.App.ui && window.App.ui.refreshChaosZones) window.App.ui.refreshChaosZones();
						} else if (this.drawMode === 'vortex') {
							window.App.sim.addVortexZone(cx, cy, radius, null, null);
							if (window.App.ui && window.App.ui.refreshVortexZones) window.App.ui.refreshVortexZones();
						} else if (this.drawMode === 'null') {
							window.App.sim.addNullZone(cx, cy, radius, 0, null, null, 'circle');
							if (window.App.ui && window.App.ui.refreshNullZones) window.App.ui.refreshNullZones();
						}
					}
				} else {
					const x = Math.min(this.tempZoneStart.x, this.tempZoneCurrent.x);
					const y = Math.min(this.tempZoneStart.y, this.tempZoneCurrent.y);
					const w = Math.abs(this.tempZoneCurrent.x - this.tempZoneStart.x);
					const h = Math.abs(this.tempZoneCurrent.y - this.tempZoneStart.y);
					
					if (w > 5 && h > 5) {
						if (this.drawMode === 'periodic') {
							window.App.sim.addPeriodicZone(x, y, w, h);
							if (window.App.ui && window.App.ui.refreshZones) window.App.ui.refreshZones();
						} else if (this.drawMode === 'viscosity') {
							window.App.sim.addViscosityZone(x, y, w, h);
							if (window.App.ui && window.App.ui.refreshViscosityZones) window.App.ui.refreshViscosityZones();
						} else if (this.drawMode === 'field') {
							window.App.sim.addFieldZone(x, y, w, h);
							if (window.App.ui && window.App.ui.refreshFieldZones) window.App.ui.refreshFieldZones();
						} else if (this.drawMode === 'thermal') {
							window.App.sim.addThermalZone(x, y, w, h);
							if (window.App.ui && window.App.ui.refreshThermalZones) window.App.ui.refreshThermalZones();
						} else if (this.drawMode === 'annihilation') {
							window.App.sim.addAnnihilationZone(x, y, w, h);
							if (window.App.ui && window.App.ui.refreshAnnihilationZones) window.App.ui.refreshAnnihilationZones();
						} else if (this.drawMode === 'chaos') {
							window.App.sim.addChaosZone(x, y, w, h);
							if (window.App.ui && window.App.ui.refreshChaosZones) window.App.ui.refreshChaosZones();
						} else if (this.drawMode === 'null') {
							window.App.sim.addNullZone(x, y, w, h);
							if (window.App.ui && window.App.ui.refreshNullZones) window.App.ui.refreshNullZones();
						}
					}
				}
				this.tempZoneStart = null;
				this.tempZoneCurrent = null;
				this.isDragging = false;
				return;
			}
			
			if (this.drawMode === 'barrier' && this.tempBarrierStart && this.tempZoneCurrent) {
				window.App.sim.addSolidBarrier(this.tempBarrierStart.x, this.tempBarrierStart.y, this.tempZoneCurrent.x, this.tempZoneCurrent.y);
				if (window.App.ui && window.App.ui.refreshSolidBarrierList) {
					window.App.ui.refreshSolidBarrierList();
				}
				this.tempBarrierStart = null;
				this.tempZoneCurrent = null;
				this.isDragging = false;
				return;
			}
			
			if (this.drawMode === 'bond' && this.tempBondStart !== null) {
				const m = getMouseWorldPos(clientX, clientY);
				const bodies = window.App.sim.bodies;
				let targetIdx = -1;
				
				for (let i = 0; i < bodies.length; i++) {
					const b = bodies[i];
					const dist = Math.sqrt((m.x - b.x)**2 + (m.y - b.y)**2);
					if (dist < Math.max(b.radius, 15 / this.zoom)) {
						targetIdx = i;
						break;
					}
				}

				if (targetIdx !== -1 && targetIdx !== this.tempBondStart) {
					const config = window.App.ui && window.App.ui.getBondConfig ? window.App.ui.getBondConfig() : {};
					window.App.sim.addElasticBond(this.tempBondStart, targetIdx, config);
					if (window.App.ui && window.App.ui.refreshElasticBondList) {
						window.App.ui.refreshElasticBondList();
					}
				}
				
				this.tempBondStart = null;
				this.tempZoneCurrent = null;
				this.isDragging = false;
				return;
			}

			if ((this.dragMode === 'body' || this.dragMode === 'vector') && this.isDragging) {
				const body = window.App.sim.bodies[this.selectedBodyIdx];
				if (body && this.originalDragState) {
					const oldState = this.originalDragState;
					const newState = { x: body.x, y: body.y, vx: body.vx, vy: body.vy };
					const selectedBodyIdx = this.selectedBodyIdx;

					const changed = (this.dragMode === 'body' && (oldState.x !== newState.x || oldState.y !== newState.y)) ||
									(this.dragMode === 'vector' && (oldState.vx !== newState.vx || oldState.vy !== newState.vy));

					if (changed) {
						const action = {
							execute: function() {
								const b = window.App.sim.bodies[selectedBodyIdx];
								if (b) {
									b.x = newState.x; b.y = newState.y;
									b.vx = newState.vx; b.vy = newState.vy;
								}
							},
							undo: function() {
								const b = window.App.sim.bodies[selectedBodyIdx];
								if (b) {
									b.x = oldState.x; b.y = oldState.y;
									b.vx = oldState.vx; b.vy = oldState.vy;
								}
							}
						};
						window.App.ActionHistory.execute(action);
					}
				}
				this.originalDragState = null;
				window.App.sim.paused = this.wasPaused;
			}

			this.isDragging = false;
			this.dragMode = null;
			this.canvas.style.cursor = this.drawMode !== 'none' ? 'crosshair' : 'default';
		};
		
		this.canvas.addEventListener('mousedown', (e) => handleStart(e.clientX, e.clientY, e));
		
		window.addEventListener('mousemove', (e) => {
			this.resetCursorTimeout();
			handleMove(e.clientX, e.clientY, e);
		});
		
		window.addEventListener('mouseup', (e) => handleEnd(e.clientX, e.clientY));

		this.canvas.addEventListener('touchstart', (e) => {
			e.preventDefault();
			if (e.touches.length === 1) {
				handleStart(e.touches[0].clientX, e.touches[0].clientY, e);
			} else if (e.touches.length === 2) {
				this.isDragging = false; 
				const dist = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);
				this.lastTouchDist = dist;
				this.pinchCenter = {
					x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
					y: (e.touches[0].clientY + e.touches[1].clientY) / 2
				};
			}
		}, { passive: false });

		this.canvas.addEventListener('touchmove', (e) => {
			e.preventDefault();
			
			if (e.touches.length === 1) {
				handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
			} else if (e.touches.length === 2 && this.lastTouchDist > 0) {
				const dist = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);
				
				const newCenter = {
					x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
					y: (e.touches[0].clientY + e.touches[1].clientY) / 2
				};

				const factor = dist / this.lastTouchDist;
				this.handleZoom(factor, newCenter.x, newCenter.y);
				
				if (!this.enableTracking) {
					const dx = newCenter.x - this.pinchCenter.x;
					const dy = newCenter.y - this.pinchCenter.y;
					this.camX += dx;
					this.camY += dy;
				}

				this.lastTouchDist = dist;
				this.pinchCenter = newCenter;
			}
		}, { passive: false });

		this.canvas.addEventListener('touchend', (e) => {
			e.preventDefault();
			if (e.touches.length === 0 && e.changedTouches.length > 0) {
				handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
			}
			if (e.touches.length < 2) {
				this.lastTouchDist = null;
				this.pinchCenter = null;
			}
		}, { passive: false });

		this.resetCursorTimeout();
	},
	
	snapCoords: function(x, y) {
		if (this.gridStep > 0) {
			const step = this.gridStep / 8;
			return {
				x: Math.round(x / step) * step,
				y: Math.round(y / step) * step
			};
		}
		return { x, y };
	},
	
	handleZoom: function(factor, centerX, centerY) {
		const getMouseWorldPos = (clientX, clientY) => {
			const rect = this.canvas.getBoundingClientRect();
			const mx = clientX - rect.left;
			const my = clientY - rect.top;
			const wx = (mx - this.width/2 - this.camX) / this.zoom;
			const wy = (my - this.height/2 - this.camY) / this.zoom;
			return { x: wx, y: wy };
		};

		if (this.enableAutoZoom) {
			this.userZoomFactor *= factor;
		} else {
			let zoomCenterX = centerX;
			let zoomCenterY = centerY;

			if (this.enableTracking || this.trackedBodyIdx > -1) {
				zoomCenterX = this.width / 2;
				zoomCenterY = this.height / 2;
			}
			
			const m = getMouseWorldPos(zoomCenterX, zoomCenterY);
			this.zoom *= factor;
			
			this.camX = zoomCenterX - this.width/2 - m.x * this.zoom;
			this.camY = zoomCenterY - this.height/2 - m.y * this.zoom;
		}
	},
	
	updateAutoCam: function(bodies) {
		if (!bodies.length) return;

		let doTracking = this.trackedBodyIdx > -1 || this.enableTracking;
		
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		let totalMass = 0;
		let comX = 0; 
		let comY = 0;

		bodies.forEach(b => {
			if (b.x < minX) minX = b.x;
			if (b.x > maxX) maxX = b.x;
			if (b.y < minY) minY = b.y;
			if (b.y > maxY) maxY = b.y;
			
			if (this.enableTracking) {
				comX += b.x * b.mass;
				comY += b.y * b.mass;
				totalMass += b.mass;
			}
		});

		if (doTracking) {
			let targetX, targetY;
			
			if (this.trackedBodyIdx > -1 && bodies[this.trackedBodyIdx]) {
				const trackedBody = bodies[this.trackedBodyIdx];
				targetX = -trackedBody.x * this.zoom;
				targetY = -trackedBody.y * this.zoom;
			} else if (this.enableTracking && totalMass > 0) {
				targetX = -(comX / totalMass) * this.zoom;
				targetY = -(comY / totalMass) * this.zoom;
			}

			if (targetX !== undefined) {
				const posSmooth = 0.1;
				this.camX += (targetX - this.camX) * posSmooth;
				this.camY += (targetY - this.camY) * posSmooth;
			}
		}

		if (this.enableAutoZoom) {
			const sceneW = Math.max(maxX - minX, 100);
			const sceneH = Math.max(maxY - minY, 100);
			const margin = 0.6;
			
			const scaleX = (this.width * margin) / sceneW;
			const scaleY = (this.height * margin) / sceneH;
			
			let fitZoom = Math.min(scaleX, scaleY);
			
			const targetZoom = fitZoom * this.userZoomFactor;

			let zoomSmooth = 0.02; 
			if (targetZoom < this.zoom) {
				zoomSmooth = 0.1;
			}

			this.zoom += (targetZoom - this.zoom) * zoomSmooth;
			
			if (Math.abs(targetZoom - this.zoom) < 0.0001) {
				this.zoom = targetZoom;
			}
		}
	},
	
	calculateField: function(x, y, bodies) {
		let totalFx = 0;
		let totalFy = 0;
		let gravFx = 0;
		let gravFy = 0;
		let elecFx = 0;
		let elecFy = 0;
		let magFx = 0;
		let magFy = 0;
		let formulaFx = 0;
		let formulaFy = 0;

		const Sim = window.App.sim;

		for (let b of bodies) {
			const dx = b.x - x;
			const dy = b.y - y;
			const distSq = dx * dx + dy * dy;
			if (distSq === 0) continue;
			const dist = Math.sqrt(distSq);
			
			const nx = dx / dist;
			const ny = dy / dist;

			if (this.showGravField && Sim.enableGravity) {
				const g_strength = (Sim.G * b.mass) / distSq;
				gravFx += nx * g_strength;
				gravFy += ny * g_strength;
			}
			
			if (this.showElecField && Sim.enableElectricity && b.charge !== 0) {
				const E_strength = (Sim.Ke * b.charge) / distSq;
				elecFx += nx * E_strength;
				elecFy += ny * E_strength;
			}
			
			if (this.showMagField && Sim.enableMagnetism && b.magMoment !== 0) {
				const B_strength = (Sim.Km * b.magMoment) / (distSq * dist);
				magFx += nx * B_strength;
				magFy += ny * B_strength;
			}
		}
		
		if (this.showFormulaField) {
			const formulaField = Sim.calculateFormulaField(x, y);
			formulaFx = formulaField.Ex;
			formulaFy = formulaField.Ey;
		}

		totalFx = gravFx + elecFx + magFx + formulaFx;
		totalFy = gravFy + elecFy + magFy + formulaFy;

		return {
			fx: totalFx, fy: totalFy,
			g_fx: gravFx, g_fy: gravFy,
			e_fx: elecFx, e_fy: elecFy,
			m_fx: magFx, m_fy: magFy,
			f_fx: formulaFx, f_fy: formulaFy
		};
	},
	
	drawElasticBonds: function(bonds) {
		const bodies = window.App.sim.bodies;
		this.ctx.lineCap = 'round';

		for (const bond of bonds) {
			const b1 = bodies[bond.body1];
			const b2 = bodies[bond.body2];
			if (!b1 || !b2) continue;

			const isSelected = (bond.id === this.selectedBondId);
			
			this.ctx.beginPath();
			this.ctx.moveTo(b1.x, b1.y);
			this.ctx.lineTo(b2.x, b2.y);
			
			this.ctx.lineWidth = (isSelected ? 3 : 1.5) / this.zoom;
			this.ctx.strokeStyle = bond.color || '#ffffff';
			this.ctx.globalAlpha = bond.enabled ? 0.8 : 0.2;
			
			this.ctx.stroke();
			this.ctx.globalAlpha = 1.0;
		}

		if (this.drawMode === 'bond' && this.tempBondStart !== null && this.tempZoneCurrent) {
			const b1 = bodies[this.tempBondStart];
			if (b1) {
				this.ctx.beginPath();
				this.ctx.moveTo(b1.x, b1.y);
				this.ctx.lineTo(this.tempZoneCurrent.x, this.tempZoneCurrent.y);
				this.ctx.lineWidth = 1 / this.zoom;
				this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
				this.ctx.strokeStyle = '#fff';
				this.ctx.stroke();
				this.ctx.setLineDash([]);
			}
		}
	},
	
	drawFields: function(bodies) {
		const Sim = window.App.sim;
		if (!this.showGravField && !this.showElecField && !this.showMagField && !this.showFormulaField) return;

		let contributingBodies = bodies;
		const fieldBodyLimit = 50;
		if (bodies.length > fieldBodyLimit) {
			contributingBodies = [...bodies]
				.sort((a, b) => Math.abs(b.mass) - Math.abs(a.mass))
				.slice(0, fieldBodyLimit);
		}

		const screenStep = Math.max(0, this.fieldPrecision * 2);
		const worldStep = screenStep / this.zoom;

		const worldLeft = -(this.width / 2 + this.camX) / this.zoom;
		const worldTop = -(this.height / 2 + this.camY) / this.zoom;
		const worldRight = worldLeft + (this.width / this.zoom);
		const worldBottom = worldTop + (this.height / this.zoom);

		const startX = Math.floor(worldLeft / worldStep) * worldStep;
		const startY = Math.floor(worldTop / worldStep) * worldStep;

		const scaleFactor = this.fieldScale;
		const maxLen = worldStep * 0.85;
		this.ctx.lineWidth = 1.5 / this.zoom;

		for (let x = startX; x < worldRight + worldStep; x += worldStep) {
			for (let y = startY; y < worldBottom + worldStep; y += worldStep) {
				const field = this.calculateField(x, y, contributingBodies);
				
				if (this.showGravField) {
					this.drawFieldVector(x, y, field.g_fx, field.g_fy, scaleFactor, maxLen, '#2ecc71');
				}
				if (this.showElecField) {
					this.drawFieldVector(x, y, field.e_fx, field.e_fy, scaleFactor, maxLen, '#3498db');
				}
				if (this.showMagField) {
					this.drawFieldVector(x, y, field.m_fx, field.m_fy, scaleFactor, maxLen, '#e74c3c');
				}
				if (this.showFormulaField) {
					const totalFormulaX = field.f_fx;
					const totalFormulaY = field.f_fy;
					this.drawFieldVector(x, y, totalFormulaX, totalFormulaY, scaleFactor, maxLen, '#f1c40f');
				}
			}
		}
	},
	
	drawFieldVector: function(x, y, fx, fy, scale, maxLen, color) {
		const magSq = fx*fx + fy*fy;
		if (magSq < 1e-10) return; // Trop petit pour être dessiné

		const mag = Math.sqrt(magSq);
		
		// Calcul de la longueur visuelle : logarithmique pour gérer les grandes différences d'échelle
		// On multiplie par scale pour la sensibilité
		let drawLen = Math.log(1 + mag * scale) * (maxLen * 0.4);
		
		// Cap à la taille de la cellule pour éviter le chevauchement
		if (drawLen > maxLen) drawLen = maxLen;
		if (drawLen < 2 / this.zoom) return; // Trop petit en pixels

		const nx = fx / mag;
		const ny = fy / mag;

		const endX = x + nx * drawLen;
		const endY = y + ny * drawLen;

		this.ctx.strokeStyle = color;
		this.ctx.beginPath();
		this.ctx.moveTo(x, y);
		this.ctx.lineTo(endX, endY);
		this.ctx.stroke();

		// Taille de la tête adaptée au zoom
		const headSize = Math.min(drawLen * 0.3, 6 / this.zoom);
		const angle = Math.atan2(ny, nx);

		this.ctx.beginPath();
		this.ctx.moveTo(endX, endY);
		this.ctx.lineTo(
			endX - headSize * Math.cos(angle - Math.PI / 6),
			endY - headSize * Math.sin(angle - Math.PI / 6)
		);
		this.ctx.moveTo(endX, endY);
		this.ctx.lineTo(
			endX - headSize * Math.cos(angle + Math.PI / 6),
			endY - headSize * Math.sin(angle + Math.PI / 6)
		);
		this.ctx.stroke();
	},
	
	drawBarycenter: function(bodies) {
		if (!bodies.length) return;
		
		let totalMass = 0;
		let comX = 0; 
		let comY = 0;

		for (let b of bodies) {
			comX += b.x * b.mass;
			comY += b.y * b.mass;
			totalMass += b.mass;
		}

		if (totalMass === 0) return;

		const x = comX / totalMass;
		const y = comY / totalMass;
		
		const size = 6 / this.zoom;

		this.ctx.fillStyle = 'rgba(120, 120, 120, 0.8)';
		
		this.ctx.beginPath();
		this.ctx.moveTo(x, y - size);
		this.ctx.lineTo(x + size, y);
		this.ctx.lineTo(x, y + size);
		this.ctx.lineTo(x - size, y);
		this.ctx.closePath();
		this.ctx.fill();
	},
	
	drawTrails: function(bodies) {
		if (!window.App.sim.showTrails) return;

		this.ctx.lineWidth = 1 / this.zoom;
		this.ctx.lineCap = 'round';
		this.ctx.lineJoin = 'round';

		for (let b of bodies) {
			if (b.path.length < 2) continue;

			this.ctx.strokeStyle = b.color;
			
			for (let i = 0; i < b.path.length - 1; i++) {
				const p1 = b.path[i];
				const p2 = b.path[i+1];
				
				this.ctx.beginPath();
				this.ctx.globalAlpha = (i / b.path.length); 
				this.ctx.moveTo(p1.x, p1.y);
				this.ctx.lineTo(p2.x, p2.y);
				this.ctx.stroke();
			}
		}
		this.ctx.globalAlpha = 1.0;
	},
	
	drawPredictionLine: function(path) {
		if (path.length < 2) return;

		this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		this.ctx.lineWidth = 1 / this.zoom;
		this.ctx.beginPath();
		this.ctx.moveTo(path[0].x, path[0].y);

		for (let i = 1; i < path.length; i++) {
			if (path[i].jump) {
				this.ctx.moveTo(path[i].x, path[i].y);
			} else {
				this.ctx.lineTo(path[i].x, path[i].y);
			}
		}
		this.ctx.stroke();
	},
	
	drawGenericZone: function(zones, config) {
		const worldLeft = (-this.width / 2 - this.camX) / this.zoom;
		const worldRight = worldLeft + this.width / this.zoom;
		const worldTop = (-this.height / 2 - this.camY) / this.zoom;
		const worldBottom = worldTop + this.height / this.zoom;

		for (const z of zones) {
			const isSelected = (z.id === config.selectedId);
			const color = z.color || config.defaultColor;

			this.ctx.save();
			if (!z.enabled) {
				this.ctx.globalAlpha = 0.3;
			}

			this.ctx.strokeStyle = color;
			this.ctx.lineWidth = isSelected ? 3 / this.zoom : 1 / this.zoom;
			
			if (config.strokeDash && !isSelected) {
				this.ctx.setLineDash(config.strokeDash);
			}

			let { x, y, width, height } = z;
			if (z.shape !== 'circle') {
				if (width === 'inf') { x = worldLeft; width = worldRight - worldLeft; }
				if (height === 'inf') { y = worldTop; height = worldBottom - worldTop; }
			}

			this.ctx.beginPath();
			if (z.shape === 'circle') {
				this.ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
			} else {
				this.ctx.rect(x, y, width, height);
			}
			this.ctx.stroke();

			if (config.strokeDash && !isSelected) {
				this.ctx.setLineDash([]);
			}

			const fillAlpha = z.enabled ? (config.fillAlpha !== undefined ? config.fillAlpha : 0.2) : 0.05;

			if (config.fillFn) {
				config.fillFn.call(this, z, color, fillAlpha);
			} else if (config.fillAlpha !== undefined) {
				this.ctx.fillStyle = color;
				this.ctx.globalAlpha = fillAlpha;
				this.ctx.fill();
			}

			this.ctx.globalAlpha = z.enabled ? 1.0 : 0.5;
			this.ctx.fillStyle = color;

			if (config.textFn) {
				const text = config.textFn(z);
				if (z.shape === 'circle') {
					this.drawArcText(text, z.x, z.y, z.radius, color);
				} else {
					this.ctx.font = `${10 / this.zoom}px sans-serif`;
					this.ctx.textAlign = 'left';
					const textX = (z.width === 'inf') ? worldLeft + 4 / this.zoom : x + 2 / this.zoom;
					const textY = (z.height === 'inf') ? worldTop + 12 / this.zoom : y - 4 / this.zoom;
					this.ctx.fillText(text, textX, textY);
				}
			}
			
			if (config.extraDrawFn) {
				config.extraDrawFn.call(this, z, { x, y, width, height });
			}

			this.ctx.restore();
		}
	},

	drawTempZone: function() {
		if (!this.tempZoneStart || !this.tempZoneCurrent) return;

		const config = {
			'periodic': { color: '#fff', fill: false, dash: [5 / this.zoom, 5 / this.zoom] },
			'viscosity': { color: '#3498db', fill: true, fillAlpha: 0.3 },
			'field': { color: '#27ae60', fill: true, fillAlpha: 0.3 },
			'thermal': { color: '#e74c3c', fill: true, fillAlpha: 0.3 },
			'annihilation': { color: '#9b59b6', fill: true, fillAlpha: 0.3 },
			'chaos': { color: '#f39c12', fill: true, fillAlpha: 0.3 },
			'vortex': { color: '#1abc9c', fill: false },
			'null': { color: '#7f8c8d', fill: true, fillAlpha: 0.3 }
		};

		const drawModeKey = this.drawMode;
		if (!config[drawModeKey]) return;

		const style = config[drawModeKey];
		this.ctx.strokeStyle = style.color;
		this.ctx.lineWidth = 1 / this.zoom;
		
		if (style.dash) {
			this.ctx.setLineDash(style.dash);
		}

		const isCircle = drawModeKey === 'vortex' || (this.drawShapes[drawModeKey] && this.drawShapes[drawModeKey] === 'circle');

		this.ctx.beginPath();
		if (isCircle) {
			const dx = this.tempZoneCurrent.x - this.tempZoneStart.x;
			const dy = this.tempZoneCurrent.y - this.tempZoneStart.y;
			const radius = Math.sqrt(dx * dx + dy * dy);
			this.ctx.arc(this.tempZoneStart.x, this.tempZoneStart.y, radius, 0, Math.PI * 2);
		} else {
			const x = Math.min(this.tempZoneStart.x, this.tempZoneCurrent.x);
			const y = Math.min(this.tempZoneStart.y, this.tempZoneCurrent.y);
			const w = Math.abs(this.tempZoneCurrent.x - this.tempZoneStart.x);
			const h = Math.abs(this.tempZoneCurrent.y - this.tempZoneStart.y);
			this.ctx.rect(x, y, w, h);
		}
		this.ctx.stroke();

		if (style.fill) {
			this.ctx.fillStyle = style.color;
			this.ctx.globalAlpha = style.fillAlpha;
			this.ctx.fill();
			this.ctx.globalAlpha = 1.0;
		}
		
		if (style.dash) {
			this.ctx.setLineDash([]);
		}
	},
	
	drawSolidBarriers: function(barriers) {
		this.ctx.lineCap = 'round';
		for (const b of barriers) {
			const isSelected = (b.id === this.selectedBarrierId);
			this.ctx.lineWidth = (isSelected ? 5 : 3) / this.zoom;
			this.ctx.strokeStyle = b.color || '#8e44ad';
			this.ctx.globalAlpha = b.enabled ? 1.0 : 0.3;
			
			this.ctx.beginPath();
			this.ctx.moveTo(b.x1, b.y1);
			this.ctx.lineTo(b.x2, b.y2);
			this.ctx.stroke();
			
			this.ctx.globalAlpha = 1.0;
		}

		if (this.drawMode === 'barrier' && this.tempBarrierStart && this.tempZoneCurrent) {
			this.ctx.lineWidth = 3 / this.zoom;
			this.ctx.strokeStyle = '#8e44ad';
			this.ctx.beginPath();
			this.ctx.moveTo(this.tempBarrierStart.x, this.tempBarrierStart.y);
			this.ctx.lineTo(this.tempZoneCurrent.x, this.tempZoneCurrent.y);
			this.ctx.stroke();
		}
	},
	
	drawInfos: function() {
		if (!this.showCoords) return;

		let text = `${this.currentWorldX.toFixed(1)}, ${this.currentWorldY.toFixed(1)}`;
		
		if (this.dragMode === 'vector' && this.selectedBodyIdx !== -1) {
			const b = window.App.sim.bodies[this.selectedBodyIdx];
			if (b) {
				const speed = Math.sqrt(b.vx**2 + b.vy**2);
				text += `\nSpeed: ${speed.toFixed(2)}`;
			}
		} else if ((this.drawMode === 'periodic' || this.drawMode === 'viscosity' || this.drawMode === 'field' || this.drawMode === 'thermal') && this.tempZoneStart && this.tempZoneCurrent) {
			const w = Math.abs(this.tempZoneCurrent.x - this.tempZoneStart.x);
			const h = Math.abs(this.tempZoneCurrent.y - this.tempZoneStart.y);
			text += `\nSize: ${w.toFixed(0)} x ${h.toFixed(0)}`;
		}
		
		const lines = text.split('\n');
		const padding = 5;
		let maxWidth = 0;

		this.ctx.font = '12px "Roboto", sans-serif';
		lines.forEach(line => {
			const metrics = this.ctx.measureText(line);
			if (metrics.width > maxWidth) {
				maxWidth = metrics.width;
			}
		});

		const textHeight = 11;
		const boxWidth = maxWidth + padding * 2;
		const boxHeight = lines.length * textHeight + padding * 2 + (lines.length - 1) * 4;

		const mx = this.currentMouseX;
		const my = this.currentMouseY;
		let x = mx + 20;
		let y = my - boxHeight - 10;

		if (x + boxWidth > this.width) {
			x = mx - boxWidth - 20;
		}
		if (y < 0) {
			y = my + 20;
		}

		const controlPanel = document.getElementById('controlPanel');
		const toolsPanel = document.getElementById('toolsPanel');
		const cpRect = controlPanel.getBoundingClientRect();
		const tpRect = toolsPanel.getBoundingClientRect();

		const overlaps = (rect) => {
			return (x < rect.right && x + boxWidth > rect.left && y < rect.bottom && y + boxHeight > rect.top);
		};
		
		if (overlaps(cpRect) || overlaps(tpRect)) {
			y = my + 20;
			if (overlaps(cpRect) || overlaps(tpRect)) {
				x = mx - boxWidth - 20;
				y = my - boxHeight - 10;
				if (overlaps(cpRect) || overlaps(tpRect)) {
					x = mx - boxWidth - 20;
					y = my + 20;
				}
			}
		}

		this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
		this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		this.ctx.lineWidth = 1;
		
		this.ctx.beginPath();
		this.ctx.roundRect(x, y, boxWidth, boxHeight, 5);
		this.ctx.fill();
		this.ctx.stroke();
		
		this.ctx.fillStyle = '#fff';
		this.ctx.textAlign = 'left';
		this.ctx.textBaseline = 'top';
		
		lines.forEach((line, i) => {
			this.ctx.fillText(line, x + padding, y + padding + i * (textHeight + 4));
		});
	},
	
	drawOffScreenIndicators: function() {
		const bodies = window.App.sim.bodies;
		if (bodies.length === 0) return;
		
		const worldLeft = (-this.width / 2 - this.camX) / this.zoom;
		const worldRight = worldLeft + this.width / this.zoom;
		const worldTop = (-this.height / 2 - this.camY) / this.zoom;
		const worldBottom = worldTop + this.height / this.zoom;
		
		const indicators = [];
		const worldCenterX = (worldLeft + worldRight) / 2;
		const worldCenterY = (worldTop + worldBottom) / 2;
		
		for (const body of bodies) {
			if (body.x < worldLeft || body.x > worldRight || body.y < worldTop || body.y > worldBottom) {
				const angle = Math.atan2(body.y - worldCenterY, body.x - worldCenterX);
				
				const margin = 20;
				const boundX = this.width / 2 - margin;
				const boundY = this.height / 2 - margin;
				
				let screenX, screenY;
				const tanAngle = Math.tan(angle);
				
				if (Math.abs(tanAngle * boundX) > boundY) {
					screenY = this.height / 2 + boundY * Math.sign(Math.sin(angle));
					screenX = this.width / 2 + (boundY / tanAngle) * Math.sign(Math.sin(angle));
				} else {
					screenX = this.width / 2 + boundX * Math.sign(Math.cos(angle));
					screenY = this.height / 2 + (boundX * tanAngle) * Math.sign(Math.cos(angle));
				}

				indicators.push({ body, screenX, screenY, angle });
			}
		}
		
		const hoveredIndicators = [];
		for (const indicator of indicators) {
			const dx = this.currentMouseX - indicator.screenX;
			const dy = this.currentMouseY - indicator.screenY;
			if (dx * dx + dy * dy < 225) {
				hoveredIndicators.push(indicator);
			}
		}
		this.hoveredIndicator = hoveredIndicators.length > 0 ? hoveredIndicators : null;

		for (const indicator of indicators) {
			this.ctx.save();
			this.ctx.translate(indicator.screenX, indicator.screenY);
			this.ctx.rotate(indicator.angle);
			
			this.ctx.fillStyle = indicator.body.color;
			this.ctx.globalAlpha = 0.6;
			
			this.ctx.beginPath();
			this.ctx.moveTo(8, 0);
			this.ctx.lineTo(-4, -5);
			this.ctx.lineTo(-4, 5);
			this.ctx.closePath();
			this.ctx.fill();
			
			this.ctx.restore();
		}
		this.ctx.globalAlpha = 1.0;

		if (this.hoveredIndicator) {
			const text = this.hoveredIndicator.map(ind => ind.body.name).join(', ');
			
			const avgScreenX = this.hoveredIndicator.reduce((sum, ind) => sum + ind.screenX, 0) / this.hoveredIndicator.length;
			const avgScreenY = this.hoveredIndicator.reduce((sum, ind) => sum + ind.screenY, 0) / this.hoveredIndicator.length;
			
			this.ctx.font = '12px "Roboto", sans-serif';
			const metrics = this.ctx.measureText(text);
			const padding = 5;
			const boxWidth = metrics.width + padding * 2;
			const boxHeight = 12 + padding * 2;
			
			let x = avgScreenX + 15;
			let y = avgScreenY - boxHeight/2;

			if (x + boxWidth > this.width - 5) x = avgScreenX - boxWidth - 15;
			if (y < 5) y = 5;
			if (y + boxHeight > this.height - 5) y = this.height - 5 - boxHeight;

			this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
			this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
			this.ctx.lineWidth = 1;
			this.ctx.beginPath();
			this.ctx.roundRect(x, y, boxWidth, boxHeight, 5);
			this.ctx.fill();
			this.ctx.stroke();
			
			this.ctx.fillStyle = '#fff';
			this.ctx.textAlign = 'left';
			this.ctx.textBaseline = 'middle';
			this.ctx.fillText(text, x + padding, y + boxHeight / 2);
		}
	},
	
	drawPreviewBody: function() {
		if (!this.showInjectionPreview || !this.previewBody) return;

		this.ctx.globalAlpha = 0.5;
		this.ctx.fillStyle = this.previewBody.color || 'rgba(255, 255, 255, 0.5)';
		this.ctx.beginPath();
		this.ctx.arc(this.previewBody.x, this.previewBody.y, this.previewBody.radius, 0, Math.PI * 2);
		this.ctx.fill();
		
		this.ctx.strokeStyle = '#fff';
		this.ctx.lineWidth = 1 / this.zoom;
		this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
		this.ctx.stroke();
		
		this.ctx.globalAlpha = 1.0;
		this.ctx.setLineDash([]);
	},
	
	drawRulers: function() {
		const margin = 0;
		const majorTickSize = 10;
		const minorTickSize = 5;
		const ctx = this.ctx;

		ctx.save();
		ctx.font = '10px "Roboto Mono", monospace';
		ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
		ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
		ctx.lineWidth = 0.7;
		ctx.textBaseline = 'middle';
		
		const worldToScreenX = (worldX) => (worldX * this.zoom) + this.width / 2 + this.camX;
		const worldToScreenY = (worldY) => (worldY * this.zoom) + this.height / 2 + this.camY;

		const screenToWorldX = (screenX) => (screenX - this.width / 2 - this.camX) / this.zoom;
		const screenToWorldY = (screenY) => (screenY - this.height / 2 - this.camY) / this.zoom;

		const getNiceStep = (rawStep) => {
			const exponent = Math.floor(Math.log10(rawStep));
			const magnitude = Math.pow(10, exponent);
			const residual = rawStep / magnitude;
			if (residual > 5) return 10 * magnitude;
			if (residual > 2) return 5 * magnitude;
			if (residual > 1) return 2 * magnitude;
			return magnitude;
		};

		const targetPixelStep = 80;
		const majorWorldStep = getNiceStep(targetPixelStep / this.zoom);
		const minorWorldStep = majorWorldStep / 5;

		ctx.beginPath();
		
		const worldLeft = screenToWorldX(0);
		const worldRight = screenToWorldX(this.width);
		let currentWorldX = Math.floor(worldLeft / minorWorldStep) * minorWorldStep;

		while (currentWorldX < worldRight) {
			const screenX = worldToScreenX(currentWorldX);
			if (screenX >= margin) {
				const isMajor = Math.abs(currentWorldX % majorWorldStep) < 1e-9 || Math.abs(currentWorldX % majorWorldStep - majorWorldStep) < 1e-9;
				const tickSize = isMajor ? majorTickSize : minorTickSize;
				ctx.moveTo(screenX, margin);
				ctx.lineTo(screenX, margin + tickSize);

				if (isMajor) {
					ctx.textAlign = 'center';
					ctx.fillText(currentWorldX.toFixed(currentWorldX < 1 ? 2 : 0), screenX, margin + tickSize + 8);
				}
			}
			currentWorldX += minorWorldStep;
		}

		const worldTop = screenToWorldY(0);
		const worldBottom = screenToWorldY(this.height);
		let currentWorldY = Math.floor(worldTop / minorWorldStep) * minorWorldStep;

		while (currentWorldY < worldBottom) {
			const screenY = worldToScreenY(currentWorldY);
			if (screenY >= margin) {
				const isMajor = Math.abs(currentWorldY % majorWorldStep) < 1e-9 || Math.abs(currentWorldY % majorWorldStep - majorWorldStep) < 1e-9;
				const tickSize = isMajor ? majorTickSize : minorTickSize;
				ctx.moveTo(margin, screenY);
				ctx.lineTo(margin + tickSize, screenY);
				
				if (isMajor) {
					ctx.textAlign = 'left';
					ctx.fillText(currentWorldY.toFixed(currentWorldY < 1 ? 2 : 0), margin + tickSize + 4, screenY);
				}
			}
			currentWorldY += minorWorldStep;
		}
		
		ctx.stroke();
		ctx.restore();
	},
	
	drawGrid: function() {
		const vpW = this.width / this.zoom;
		const vpH = this.height / this.zoom;
		
		const viewSize = Math.max(vpW, vpH);
		const margin = viewSize * 2.5;

		const left = -this.camX - vpW / 2 - margin;
		const right = -this.camX + vpW / 2 + margin;
		const top = -this.camY - vpH / 2 - margin;
		const bottom = -this.camY + vpH / 2 + margin;

		const targetPx = 310;
		const rawStep = targetPx / this.zoom;
		const exponent = Math.floor(Math.log10(rawStep));
		let step = Math.pow(10, exponent);
		
		const ratio = rawStep / step;
		if (ratio > 5) step *= 5;
		else if (ratio > 2) step *= 2;

		this.gridStep = step;

		const segments = Math.max(5, Math.floor(this.gridDetail)); 
		const subStep = step / segments;

		const allBodies = window.App.sim.bodies;
		const distortionBodyLimit = 25;
		if (window.App.sim.enableGravity && this.gridDistortion > 0 && allBodies.length > distortionBodyLimit) {
			this.distortingBodies = [...allBodies]
				.sort((a, b) => Math.abs(b.mass) - Math.abs(a.mass))
				.slice(0, distortionBodyLimit);
		} else {
			this.distortingBodies = allBodies;
		}

		this.ctx.lineWidth = 0.8 / this.zoom; 
		this.ctx.strokeStyle = '#323332';
		this.ctx.beginPath();

		const startX = Math.floor(left / step) * step;
		const endX = Math.ceil(right / step) * step;
		const startY = Math.floor(top / step) * step;
		const endY = Math.ceil(bottom / step) * step;

		for (let x = startX; x <= endX; x += step) {
			let first = true;
			for (let y = top; y <= bottom + subStep; y += subStep) {
				const p = this.applyDistortion(x, Math.min(y, bottom));
				if (first) { this.ctx.moveTo(p.x, p.y); first = false; }
				else { this.ctx.lineTo(p.x, p.y); }
			}
		}

		for (let y = startY; y <= endY; y += step) {
			let first = true;
			for (let x = left; x <= right + subStep; x += subStep) {
				const p = this.applyDistortion(Math.min(x, right), y);
				if (first) { this.ctx.moveTo(p.x, p.y); first = false; }
				else { this.ctx.lineTo(p.x, p.y); }
			}
		}

		this.ctx.stroke();
	},
	
	drawPerformanceIndicator: function() {
		const bodyCount = window.App.sim.bodies.length;
		const text = `${this.fps} FPS | ${bodyCount} Bodies`;
		
		this.ctx.font = '12px "Roboto Mono", monospace';
		this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
		this.ctx.textAlign = 'right';
		this.ctx.textBaseline = 'bottom';
		this.ctx.fillText(text, this.width - 10, this.height - 10);
	},
	
	drawArcText: function(text, centerX, centerY, radius, color) {
		const ctx = this.ctx;
		ctx.save();
		ctx.fillStyle = color;
		const fontSize = Math.max(5, 12 / this.zoom);
		ctx.font = `${fontSize}px sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'bottom';

		const effectiveRadius = radius + 5 / this.zoom;
		
		const textMetrics = ctx.measureText(text);
		const textWidth = textMetrics.width;

		const totalAngle = textWidth / effectiveRadius;
		let startAngle = -Math.PI / 2 - totalAngle / 2;

		if (isNaN(startAngle)) startAngle = -Math.PI / 2;

		ctx.translate(centerX, centerY);

		for (let i = 0; i < text.length; i++) {
			const char = text[i];
			const charMetrics = ctx.measureText(char);
			const charWidth = charMetrics.width;
			const angleForChar = charWidth / effectiveRadius;

			const rotation = startAngle + angleForChar / 2;
			
			if (isNaN(rotation)) continue;

			ctx.save();
			ctx.rotate(rotation);
			
			ctx.fillText(char, 0, -effectiveRadius);
			
			ctx.restore();
			
			startAngle += angleForChar;
		}

		ctx.restore();
	},
	
	draw: function() {
		if (this.enableTracking || this.enableAutoZoom || this.trackedBodyIdx !== -1) {
			this.updateAutoCam(window.App.sim.bodies);
		}
		
		this.ctx.fillStyle = 'black';
		this.ctx.fillRect(0, 0, this.width, this.height);

		this.ctx.save();

		this.ctx.translate(this.width / 2 + this.camX, this.height / 2 + this.camY);
		this.ctx.scale(this.zoom, this.zoom);

		this.drawGrid();

		this.drawGenericZone(window.App.sim.periodicZones, {
			selectedId: this.selectedZoneId, defaultColor: '#e67e22', fillAlpha: 0.1,
			strokeDash: [5 / this.zoom, 5 / this.zoom],
			textFn: (z) => z.name + (z.enabled ? '' : ' (Off)')
		});
		this.drawGenericZone(window.App.sim.viscosityZones, {
			selectedId: this.selectedViscosityZoneId, defaultColor: '#3498db', fillAlpha: 0.2,
			textFn: (z) => z.name + (z.enabled ? ` (v:${z.viscosity})` : ' (Off)')
		});
		this.drawGenericZone(window.App.sim.thermalZones, {
			selectedId: this.selectedThermalZoneId, defaultColor: '#e74c3c', fillAlpha: 0.2,
			textFn: (z) => z.name + (z.enabled ? ` (${z.temperature}K)` : ' (Off)')
		});
		this.drawGenericZone(window.App.sim.annihilationZones, {
			selectedId: this.selectedAnnihilationZoneId, defaultColor: '#9b59b6', fillAlpha: 0.2,
			textFn: (z) => z.name + (z.enabled ? (z.particleBurst ? ' (Burst)' : '') : ' (Off)')
		});
		this.drawGenericZone(window.App.sim.chaosZones, {
			selectedId: this.selectedChaosZoneId, defaultColor: '#f39c12', fillAlpha: 0.15,
			textFn: (z) => z.name + (z.enabled ? ` (S:${z.strength})` : ' (Off)')
		});
		this.drawGenericZone(window.App.sim.vortexZones, {
			selectedId: this.selectedVortexZoneId, defaultColor: '#1abc9c',
			textFn: (z) => z.name + (z.enabled ? ` (S:${z.strength})` : ' (Off)'),
			fillFn: function(z, color, alpha) {
				const gradient = this.ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.radius);
				gradient.addColorStop(0, 'rgba(0,0,0,0)');
				gradient.addColorStop(1, color);
				this.ctx.fillStyle = gradient;
				this.ctx.globalAlpha = alpha;
				this.ctx.fill();
			}
		});
		this.drawGenericZone(window.App.sim.nullZones, {
			selectedId: this.selectedNullZoneId, defaultColor: '#7f8c8d', fillAlpha: 0.2,
			textFn: (z) => z.name + (z.enabled ? '' : ' (Off)')
		});
		this.drawGenericZone(window.App.sim.fieldZones, {
			selectedId: this.selectedFieldZoneId, defaultColor: '#27ae60', fillAlpha: 0.15,
			textFn: (z) => z.name + (z.enabled ? '' : ' (Off)'),
			extraDrawFn: function(z, bounds) {
				let cx, cy;
				if (z.shape === 'circle') {
					cx = z.x; cy = z.y;
				} else {
					cx = bounds.x + bounds.width / 2;
					cy = bounds.y + bounds.height / 2;
				}
				const mag = Math.sqrt(z.fx*z.fx + z.fy*z.fy);
				if (mag > 0.0001) {
					let arrowLen;
					if (z.shape === 'circle') {
						arrowLen = z.radius * 0.8;
					} else {
						arrowLen = Math.min(Math.min(bounds.width, bounds.height) * 0.4, mag * 200);
					}
					const nx = z.fx / mag; const ny = z.fy / mag;
					const endX = cx + nx * arrowLen; const endY = cy + ny * arrowLen;
					
					this.ctx.beginPath(); this.ctx.moveTo(cx, cy); this.ctx.lineTo(endX, endY); this.ctx.stroke();
					
					const headSize = 5 / this.zoom; const angle = Math.atan2(ny, nx);
					this.ctx.beginPath(); this.ctx.moveTo(endX, endY);
					this.ctx.lineTo(endX - headSize * Math.cos(angle - Math.PI/6), endY - headSize * Math.sin(angle - Math.PI/6));
					this.ctx.moveTo(endX, endY);
					this.ctx.lineTo(endX - headSize * Math.cos(angle + Math.PI/6), endY - headSize * Math.sin(angle + Math.PI/6));
					this.ctx.stroke();
				}
			}
		});

		this.drawTempZone();
		
		this.drawSolidBarriers(window.App.sim.solidBarriers);
		this.drawElasticBonds(window.App.sim.elasticBonds);
		this.drawFields(window.App.sim.bodies);
		this.drawBarycenter(window.App.sim.bodies);
		this.drawTrails(window.App.sim.bodies);

		const bodies = window.App.sim.bodies;
		const worldLeft = (-this.width / 2 - this.camX) / this.zoom;
		const worldRight = worldLeft + this.width / this.zoom;
		const worldTop = (-this.height / 2 - this.camY) / this.zoom;
		const worldBottom = worldTop + this.height / this.zoom;

		for (let i = 0; i < bodies.length; i++) {
			const b = bodies[i];
			
			if (b.x + b.radius < worldLeft || 
				b.x - b.radius > worldRight || 
				b.y + b.radius < worldTop || 
				b.y - b.radius > worldBottom) {
				continue;
			}

			this.ctx.beginPath();
			this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
			this.ctx.fillStyle = b.color;
			
			if (bodies.length > 50) {
				this.ctx.fill();
				
			} else {
				this.ctx.shadowBlur = 10;
				this.ctx.shadowColor = b.color;
				this.ctx.fill();
				this.ctx.shadowBlur = 0;
			}
			
			if (typeof b.angle !== 'undefined') {
				this.ctx.beginPath();
				this.ctx.moveTo(b.x, b.y);
				this.ctx.lineTo(
					b.x + Math.cos(b.angle) * b.radius, 
					b.y + Math.sin(b.angle) * b.radius
				);
				this.ctx.lineWidth = 1 / this.zoom;
				this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
				this.ctx.stroke();
			}

			if (i === this.hoveredBodyIdx && i !== this.selectedBodyIdx) {
				this.ctx.beginPath();
				this.ctx.arc(b.x, b.y, b.radius + (4 / this.zoom), 0, Math.PI * 2);
				this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
				this.ctx.lineWidth = 1 / this.zoom;
				this.ctx.stroke();
			}

			if (i === this.selectedBodyIdx) {
				this.ctx.beginPath();
				this.ctx.arc(b.x, b.y, b.radius + (8 / this.zoom), 0, Math.PI * 2);
				this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
				this.ctx.lineWidth = 2 / this.zoom;
				this.ctx.stroke();

				const tipX = b.x + b.vx * this.vectorScale;
				const tipY = b.y + b.vy * this.vectorScale;

				this.ctx.beginPath();
				this.ctx.moveTo(b.x, b.y);
				this.ctx.lineTo(tipX, tipY);
				this.ctx.strokeStyle = '#fff';
				this.ctx.lineWidth = 1.5 / this.zoom;
				this.ctx.stroke();

				this.ctx.beginPath();
				this.ctx.arc(tipX, tipY, 4 / this.zoom, 0, Math.PI * 2);
				this.ctx.fillStyle = '#fff';
				this.ctx.fill();

				const predictionPath = window.App.sim.predictPath(i, this.predictionLength, window.App.sim.dt);
				this.drawPredictionLine(predictionPath);
			}
		}

		if (this.showInjectionPreview && this.previewBody) {
			this.drawPreviewBody();
		}

		this.ctx.restore();
		this.drawRulers();
		this.drawOffScreenIndicators();
		this.drawInfos();
		this.drawPerformanceIndicator();
	},
	
	applyDistortion: function(x, y) {
		if (!window.App.sim.enableGravity || this.gridDistortion <= 0) {
			this.distortionResult.x = x;
			this.distortionResult.y = y;
			return this.distortionResult;
		}

		let totalDx = 0;
		let totalDy = 0;
		
		const bodies = (window.App.sim.bodies.length > 50) ? this.distortingBodies : window.App.sim.bodies;
		const count = bodies.length;
		const limit = 0.85;
		const minDistSq = this.gridMinDist * this.gridMinDist;
		const distortionCoeff = this.gridDistortion;

		for (let i = 0; i < count; i++) {
			const b = bodies[i];
			const bx = b.x;
			const by = b.y;
			const bmass = b.mass;
			
			if (bmass < 1) continue;

			const dx = bx - x;
			const dy = by - y;
			const distSq = dx*dx + dy*dy;
			
			const effectiveDistSq = distSq + minDistSq;
			const strength = (bmass * distortionCoeff) / effectiveDistSq;
			const factor = strength / (1 + strength);
			const pull = factor * limit;

			totalDx += dx * pull;
			totalDy += dy * pull;
		}

		this.distortionResult.x = x + totalDx;
		this.distortionResult.y = y + totalDy;
		return this.distortionResult;
	},

	loop: function() {
		const now = performance.now();
		const deltaTime = now - this.lastFrameTime;
		this.lastFrameTime = now;

		this.frameCount++;
		if (now - this.lastFpsUpdateTime > 1000) {
			this.fps = this.frameCount;
			this.frameCount = 0;
			this.lastFpsUpdateTime = now;
		}

		const sim = window.App.sim;
		if (!sim.paused) {
			const maxFrameTime = 250;
			this.timeAccumulator += Math.min(deltaTime, maxFrameTime);
			
			const physicsTimeStep = 1000 / 60;

			while (this.timeAccumulator >= physicsTimeStep) {
				sim.update();
				this.timeAccumulator -= physicsTimeStep;
			}
		}
		
		this.draw();
		requestAnimationFrame(() => this.loop());
	}
};

window.App.render = Rendering;