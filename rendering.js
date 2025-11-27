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
	fieldScale: 10,
	
	selectedBodyIdx: -1,
	dragMode: null, 
	vectorScale: 15,

	drawMode: 'none', 
	selectedZoneId: null,
	selectedViscosityZoneId: null,
	tempZoneStart: null,
	tempZoneCurrent: null,

	init: function() {
		this.canvas = document.getElementById('simCanvas');
		this.ctx = this.canvas.getContext('2d');
		
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

	setupInputs: function() {
		const getMouseWorldPos = (clientX, clientY) => {
			const rect = this.canvas.getBoundingClientRect();
			const mx = clientX - rect.left;
			const my = clientY - rect.top;
			const wx = (mx - this.width/2 - this.camX) / this.zoom;
			const wy = (my - this.height/2 - this.camY) / this.zoom;
			return { x: wx, y: wy, mx: mx, my: my };
		};

		this.canvas.addEventListener('wheel', (e) => {
			e.preventDefault();
			const zoomIntensity = 0.1;
			const delta = e.deltaY < 0 ? 1 : -1;
			const factor = Math.exp(delta * zoomIntensity);

			if (this.enableAutoZoom) {
				this.userZoomFactor *= factor;
			} else {
				const m = getMouseWorldPos(e.clientX, e.clientY);
				this.zoom *= factor;
				
				if (!this.enableTracking) {
					this.camX = e.clientX - this.width/2 - m.x * this.zoom;
					this.camY = e.clientY - this.height/2 - m.y * this.zoom;
				}
			}
		});

		this.canvas.addEventListener('mousedown', (e) => {
			const m = getMouseWorldPos(e.clientX, e.clientY);
			
			if (this.drawMode === 'periodic' || this.drawMode === 'viscosity') {
				this.tempZoneStart = { x: m.x, y: m.y };
				this.tempZoneCurrent = { x: m.x, y: m.y };
				this.isDragging = true;
				return;
			}

			const bodies = window.App.sim.bodies;
			this.wasPaused = window.App.sim.paused;

			if (this.selectedBodyIdx !== -1 && bodies[this.selectedBodyIdx]) {
				const b = bodies[this.selectedBodyIdx];
				const tipX = b.x + b.vx * this.vectorScale;
				const tipY = b.y + b.vy * this.vectorScale;
				const distToTip = Math.sqrt((m.x - tipX)**2 + (m.y - tipY)**2);
				
				if (distToTip < 15 / this.zoom) {
					this.dragMode = 'vector';
					this.isDragging = true;
					window.App.sim.paused = true;
					return;
				}
			}

			let clickedIdx = -1;
			for (let i = bodies.length - 1; i >= 0; i--) {
				const b = bodies[i];
				const dist = Math.sqrt((m.x - b.x)**2 + (m.y - b.y)**2);
				if (dist < Math.max(b.radius, 5 / this.zoom)) {
					clickedIdx = i;
					break;
				}
			}

			if (clickedIdx !== -1) {
				if (this.selectedBodyIdx !== clickedIdx) {
					this.selectedBodyIdx = clickedIdx;
					if (window.App.ui && window.App.ui.highlightBody) {
						window.App.ui.highlightBody(clickedIdx);
					}
				}
				
				const b = bodies[clickedIdx];
				this.dragMode = 'body';
				this.isDragging = true;
				window.App.sim.paused = true; 
				
			} else {
				this.selectedBodyIdx = -1;
				this.selectedZoneId = null;
				this.selectedViscosityZoneId = null;
				
				if (window.App.ui) {
					if (window.App.ui.highlightBody) window.App.ui.highlightBody(-1);
					if (window.App.ui.refreshZones) window.App.ui.refreshZones();
					if (window.App.ui.refreshViscosityZones) window.App.ui.refreshViscosityZones();
				}

				if (!this.enableTracking) {
					this.dragMode = 'cam';
					this.lastMouseX = e.clientX;
					this.lastMouseY = e.clientY;
					this.canvas.style.cursor = 'grabbing';
				}
				this.isDragging = true;
			}
		});

		window.addEventListener('mousemove', (e) => {
			if (!this.isDragging) return;
			const m = getMouseWorldPos(e.clientX, e.clientY);
			const bodies = window.App.sim.bodies;

			if ((this.drawMode === 'periodic' || this.drawMode === 'viscosity') && this.tempZoneStart) {
				this.tempZoneCurrent = { x: m.x, y: m.y };
			} else if (this.dragMode === 'body' && this.selectedBodyIdx !== -1) {
				const b = bodies[this.selectedBodyIdx];
				if (b) {
					b.x = m.x;
					b.y = m.y;
					b.path = []; 
				}
			} else if (this.dragMode === 'vector' && this.selectedBodyIdx !== -1) {
				const b = bodies[this.selectedBodyIdx];
				if (b) {
					b.vx = (m.x - b.x) / this.vectorScale;
					b.vy = (m.y - b.y) / this.vectorScale;
				}
			} else if (this.dragMode === 'cam' && !this.enableTracking) {
				const dx = e.clientX - this.lastMouseX;
				const dy = e.clientY - this.lastMouseY;
				this.camX += dx;
				this.camY += dy;
				this.lastMouseX = e.clientX;
				this.lastMouseY = e.clientY;
			}
		});

		window.addEventListener('mouseup', () => {
			if ((this.drawMode === 'periodic' || this.drawMode === 'viscosity') && this.tempZoneStart && this.tempZoneCurrent) {
				const x = Math.min(this.tempZoneStart.x, this.tempZoneCurrent.x);
				const y = Math.min(this.tempZoneStart.y, this.tempZoneCurrent.y);
				const w = Math.abs(this.tempZoneCurrent.x - this.tempZoneStart.x);
				const h = Math.abs(this.tempZoneCurrent.y - this.tempZoneStart.y);
				
				if (w > 5 && h > 5) {
					if (this.drawMode === 'periodic') {
						window.App.sim.addPeriodicZone(x, y, w, h);
						if (window.App.ui && window.App.ui.refreshZones) {
							window.App.ui.refreshZones();
						}
					} else if (this.drawMode === 'viscosity') {
						window.App.sim.addViscosityZone(x, y, w, h);
						if (window.App.ui && window.App.ui.refreshViscosityZones) {
							window.App.ui.refreshViscosityZones();
						}
					}
				}
				this.tempZoneStart = null;
				this.tempZoneCurrent = null;
				this.isDragging = false;
				return;
			}

			if ((this.dragMode === 'body' || this.dragMode === 'vector') && this.isDragging) {
				window.App.sim.paused = this.wasPaused;
			}
			this.isDragging = false;
			this.dragMode = null;
			this.canvas.style.cursor = 'default';
		});
	},

	drawViscosityZones: function(zones) {
		this.ctx.lineWidth = 1 / this.zoom;
		
		for (const z of zones) {
			const isSelected = (z.id === this.selectedViscosityZoneId);
			const color = z.color || '#3498db';

			this.ctx.save();
			if (!z.enabled) {
				this.ctx.globalAlpha = 0.3;
			}

			this.ctx.strokeStyle = color;
			
			if (isSelected) {
				this.ctx.lineWidth = 3 / this.zoom;
				this.ctx.strokeRect(z.x, z.y, z.width, z.height);
				this.ctx.lineWidth = 1 / this.zoom;
			} else {
				this.ctx.strokeRect(z.x, z.y, z.width, z.height);
			}
			
			this.ctx.fillStyle = color; 
			this.ctx.globalAlpha = z.enabled ? 0.2 : 0.05;
			this.ctx.fillRect(z.x, z.y, z.width, z.height);
			
			this.ctx.globalAlpha = z.enabled ? 1.0 : 0.5;
			this.ctx.font = `${10 / this.zoom}px sans-serif`;
			this.ctx.fillStyle = color;
			this.ctx.fillText(z.name + (z.enabled ? ` (v:${z.viscosity})` : ' (Off)'), z.x + 2 / this.zoom, z.y - 4 / this.zoom);

			this.ctx.restore();
		}
		
		if (this.drawMode === 'viscosity' && this.tempZoneStart && this.tempZoneCurrent) {
			const x = Math.min(this.tempZoneStart.x, this.tempZoneCurrent.x);
			const y = Math.min(this.tempZoneStart.y, this.tempZoneCurrent.y);
			const w = Math.abs(this.tempZoneCurrent.x - this.tempZoneStart.x);
			const h = Math.abs(this.tempZoneCurrent.y - this.tempZoneStart.y);
			
			this.ctx.strokeStyle = '#3498db';
			this.ctx.strokeRect(x, y, w, h);
			this.ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
			this.ctx.fillRect(x, y, w, h);
		}
	},

	updateAutoCam: function(bodies) {
		if (!bodies.length) return;

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

		if (this.enableTracking && totalMass > 0) {
			const targetX = -(comX / totalMass) * this.zoom;
			const targetY = -(comY / totalMass) * this.zoom;
			
			const posSmooth = 0.1;
			this.camX += (targetX - this.camX) * posSmooth;
			this.camY += (targetY - this.camY) * posSmooth;
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

	drawFields: function(bodies) {
		if (!this.showGravField && !this.showElecField && !this.showMagField && !this.showFormulaField) return

		const step = this.fieldPrecision;
		const scale = this.fieldScale / this.zoom;
		const arrowSize = 3;
		
		const minIntensityThreshold = 0.05; 

		const vpW = this.width / this.zoom;
		const vpH = this.height / this.zoom;

		const left = (-this.camX / this.zoom) - vpW / 2;
		const top = (-this.camY / this.zoom) - vpH / 2;

		const startX = Math.floor(left / step) * step;
		const startY = Math.floor(top / step) * step;
		
		this.ctx.lineWidth = 1 / this.zoom;

		for (let x = startX; x <= left + vpW; x += step) {
			for (let y = startY; y <= top + vpH; y += step) {
				const field = this.calculateField(x, y, bodies);
				
				if (this.showGravField) {
					const magSq = field.g_fx * field.g_fx + field.g_fy * field.g_fy;
					const mag = Math.sqrt(magSq);
					if (mag * scale > minIntensityThreshold) {
						this.drawFieldVector(x, y, field.g_fx, field.g_fy, scale, arrowSize, '#2ecc71', mag);
					}
				}
				
				if (this.showElecField) {
					const magSq = field.e_fx * field.e_fx + field.e_fy * field.e_fy;
					const mag = Math.sqrt(magSq);
					if (mag * scale > minIntensityThreshold) {
						this.drawFieldVector(x, y, field.e_fx, field.e_fy, scale, arrowSize, '#3498db', mag);
					}
				}
				
				if (this.showMagField) {
					const magSq = field.m_fx * field.m_fx + field.m_fy * field.m_fy;
					const mag = Math.sqrt(magSq);
					if (mag * scale > minIntensityThreshold) {
						this.drawFieldVector(x, y, field.m_fx, field.m_fy, scale, arrowSize, '#e74c3c', mag);
					}
				}
				
				if (this.showFormulaField) {
					const magSq = field.f_fx * field.f_fx + field.f_fy * field.f_fy;
					const mag = Math.sqrt(magSq);
					if (mag * scale > minIntensityThreshold) {
						this.drawFieldVector(x, y, field.f_fx, field.f_fy, scale, arrowSize, '#f1c40f', mag);
					}
				}
			}
		}
	},
	
	drawFieldVector: function(x, y, fx, fy, scale, arrowSize, color, mag) {
		if (mag === 0) return;
		
		let scaledFx = fx * scale;
		let scaledFy = fy * scale;
		
		const maxLen = this.fieldPrecision * 0.4;
		const lenSq = scaledFx * scaledFx + scaledFy * scaledFy;
		
		if (lenSq > maxLen * maxLen) {
			const ratio = maxLen / Math.sqrt(lenSq);
			scaledFx *= ratio;
			scaledFy *= ratio;
		}

		const endX = x + scaledFx;
		const endY = y + scaledFy;
		
		this.ctx.strokeStyle = color;
		this.ctx.globalAlpha = Math.min(1.0, mag * 0.5 * scale); 

		this.ctx.beginPath();
		this.ctx.moveTo(x, y);
		this.ctx.lineTo(endX, endY);
		this.ctx.stroke();

		const angle = Math.atan2(scaledFy, scaledFx);
		const size = arrowSize / this.zoom;

		this.ctx.beginPath();
		this.ctx.moveTo(endX, endY);
		this.ctx.lineTo(
			endX - size * Math.cos(angle - Math.PI / 6),
			endY - size * Math.sin(angle - Math.PI / 6)
		);
		this.ctx.moveTo(endX, endY);
		this.ctx.lineTo(
			endX - size * Math.cos(angle + Math.PI / 6),
			endY - size * Math.sin(angle + Math.PI / 6)
		);
		this.ctx.stroke();
		this.ctx.globalAlpha = 1.0;
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
	
	drawPeriodicZones: function(zones) {
		this.ctx.lineWidth = 1 / this.zoom;
		this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
		
		for (const z of zones) {
			const isSelected = (z.id === this.selectedZoneId);
			const color = z.color || '#e67e22';

			this.ctx.save();
			if (!z.enabled) {
				this.ctx.globalAlpha = 0.3;
			}

			this.ctx.strokeStyle = color;
			
			if (isSelected) {
				this.ctx.lineWidth = 3 / this.zoom;
				this.ctx.setLineDash([]);
				this.ctx.strokeRect(z.x, z.y, z.width, z.height);
				this.ctx.lineWidth = 1 / this.zoom;
				this.ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
			} else {
				this.ctx.strokeRect(z.x, z.y, z.width, z.height);
			}
			
			this.ctx.fillStyle = color; 
			this.ctx.globalAlpha = z.enabled ? 0.1 : 0.05;
			this.ctx.fillRect(z.x, z.y, z.width, z.height);
			
			this.ctx.globalAlpha = z.enabled ? 1.0 : 0.5;
			this.ctx.font = `${10 / this.zoom}px sans-serif`;
			this.ctx.fillStyle = color;
			this.ctx.fillText(z.name + (z.enabled ? '' : ' (Off)'), z.x + 2 / this.zoom, z.y - 4 / this.zoom);

			this.ctx.restore();
		}
		
		if (this.drawMode === 'periodic' && this.tempZoneStart && this.tempZoneCurrent) {
			const x = Math.min(this.tempZoneStart.x, this.tempZoneCurrent.x);
			const y = Math.min(this.tempZoneStart.y, this.tempZoneCurrent.y);
			const w = Math.abs(this.tempZoneCurrent.x - this.tempZoneStart.x);
			const h = Math.abs(this.tempZoneCurrent.y - this.tempZoneStart.y);
			
			this.ctx.strokeStyle = '#fff';
			this.ctx.strokeRect(x, y, w, h);
		}
		
		this.ctx.setLineDash([]);
	},

	draw: function() {
		window.App.sim.update();

		if (this.enableTracking || this.enableAutoZoom) {
			this.updateAutoCam(window.App.sim.bodies);
		}

		if (window.App.ui && window.App.ui.syncInputs) {
			window.App.ui.syncInputs();
		}
		
		this.ctx.fillStyle = 'black';
		this.ctx.fillRect(0, 0, this.width, this.height);

		this.ctx.save();

		this.ctx.translate(this.width / 2 + this.camX, this.height / 2 + this.camY);
		this.ctx.scale(this.zoom, this.zoom);

		this.drawGrid();
		this.drawPeriodicZones(window.App.sim.periodicZones);
		this.drawViscosityZones(window.App.sim.viscosityZones);
		this.drawFields(window.App.sim.bodies);
		this.drawBarycenter(window.App.sim.bodies);
		this.drawTrails(window.App.sim.bodies);

		const bodies = window.App.sim.bodies;
		for (let i = 0; i < bodies.length; i++) {
			const b = bodies[i];
			this.ctx.beginPath();
			this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
			this.ctx.fillStyle = b.color;
			
			this.ctx.shadowBlur = 10;
			this.ctx.shadowColor = b.color;
			this.ctx.fill();
			this.ctx.shadowBlur = 0;
			
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

				const predictionPath = window.App.sim.predictPath(i, 300, window.App.sim.dt);
				this.drawPredictionLine(predictionPath);
			}
		}

		this.ctx.restore();
	},
	
	applyDistortion: function(x, y) {
		if (this.gridDistortion <= 0.01) return {x, y};

		let totalDx = 0;
		let totalDy = 0;
		const bodies = window.App.sim.bodies;
		const limit = 0.85;

		for (let b of bodies) {
			if (b.mass < 1) continue;

			const dx = b.x - x;
			const dy = b.y - y;
			const distSq = dx*dx + dy*dy;
			
			const effectiveDistSq = distSq + (this.gridMinDist * this.gridMinDist);
			const strength = (b.mass * this.gridDistortion) / effectiveDistSq;
			const factor = strength / (1 + strength);
			const pull = factor * limit;

			totalDx += dx * pull;
			totalDy += dy * pull;
		}

		return { x: x + totalDx, y: y + totalDy };
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

		const segments = Math.max(5, Math.floor(this.gridDetail)); 
		const subStep = step / segments;

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
	
	loop: function() {
		this.draw();
		requestAnimationFrame(() => this.loop());
	}
};

window.App.render = Rendering;