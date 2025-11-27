document.addEventListener('DOMContentLoaded', () => {
	const Sim = window.App.sim;
	const Render = window.App.render;
	let maxZIndex = 100;

	const formatVal = (val, prec = 2) => {
		if (typeof val !== 'number' || isNaN(val)) return val;
		const abs = Math.abs(val);
		if (val !== 0 && (abs >= 10000 || abs < 0.0001)) {
			return val.toExponential(prec);
		}
		return parseFloat(val.toFixed(prec));
	};

	const setupDraggable = (panelEl, headerEl, neighbors = []) => {
		let isDragging = false;
		let offsetX = 0, offsetY = 0;

		panelEl.addEventListener('mousedown', () => {
			maxZIndex++;
			panelEl.style.zIndex = maxZIndex;
		});

		headerEl.addEventListener('mousedown', (e) => {
			if(e.target.closest('button')) return; 
			isDragging = true;
			const rect = panelEl.getBoundingClientRect();
			offsetX = e.clientX - rect.left;
			offsetY = e.clientY - rect.top;
			headerEl.style.cursor = 'grabbing';
			
			panelEl.style.right = 'auto';
			panelEl.style.left = rect.left + 'px';
		});

		window.addEventListener('mousemove', (e) => {
			if (isDragging) {
				let newX = e.clientX - offsetX;
				let newY = e.clientY - offsetY;
				
				const frameMargin = 20;
				const snapThreshold = 20;
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
		});

		window.addEventListener('mouseup', () => { 
			isDragging = false; 
			headerEl.style.cursor = 'grab'; 
		});
	};

	const toggleBtn = document.getElementById('togglePanelBtn');
	toggleBtn.addEventListener('click', () => {
		panel.classList.toggle('collapsed');
		toggleBtn.innerHTML = panel.classList.contains('collapsed') ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-minus"></i>';
	});

	const panel = document.getElementById('controlPanel');
	const header = document.getElementById('panelHeader');
	const toolsPanel = document.getElementById('toolsPanel');
	const toolsHeader = document.getElementById('toolsHeader');

	setupDraggable(panel, header, [toolsPanel]);
	setupDraggable(toolsPanel, toolsHeader, [panel]);

	const toggleToolsBtn = document.getElementById('toggleToolsBtn');
	toggleToolsBtn.addEventListener('click', () => {
		const willExpand = toolsPanel.classList.contains('collapsed');
		toolsPanel.classList.toggle('collapsed');
		
		if (willExpand) {
			toggleToolsBtn.innerHTML = '<i class="fa-solid fa-minus"></i>';
			
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
		} else {
			toggleToolsBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
		}
	});

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

	const toggleInjBtn = document.getElementById('toggleInjectionBtn');
	const injContent = document.getElementById('injectionContent');
	toggleInjBtn.addEventListener('click', () => {
		injContent.classList.toggle('hidden-content');
		toggleInjBtn.innerHTML = injContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
	});
	
	const toggleDisplayBtn = document.getElementById('toggleDisplayBtn');
	const displayContent = document.getElementById('displayContent');
	if (toggleDisplayBtn) {
		toggleDisplayBtn.addEventListener('click', () => {
			displayContent.classList.toggle('hidden-content');
			toggleDisplayBtn.innerHTML = displayContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
		});
	}
	
	const bodiesContainer = document.getElementById('bodiesListContainer');
	const bodyCountLabel = document.getElementById('bodyCount');

	const toggleBodiesBtn = document.getElementById('toggleBodiesBtn');
	const bodiesHeader = document.getElementById('bodiesHeader');

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

	if (toggleBodiesBtn) {
		toggleBodiesBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			toggleBodiesList();
		});
	}
	
	if (bodiesHeader) {
		bodiesHeader.addEventListener('click', toggleBodiesList);
	}

	let draggedItemIndex = null;

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
				<div class="mini-input-group"><label>Mass</label><input type="number" class="inp-mass" value="${Math.round(body.mass)}" step="10"></div>
				<div class="mini-input-group"><label>Radius</label><input type="number" class="inp-radius" value="${body.radius.toFixed(1)}" step="0.5"></div>
				<div class="mini-input-group"><label>Pos X</label><input type="number" class="inp-x" value="${body.x.toFixed(1)}"></div>
				<div class="mini-input-group"><label>Pos Y</label><input type="number" class="inp-y" value="${body.y.toFixed(1)}"></div>
				<div class="mini-input-group"><label>Vel X</label><input type="number" class="inp-vx" value="${body.vx.toFixed(2)}" step="0.1"></div>
				<div class="mini-input-group"><label>Vel Y</label><input type="number" class="inp-vy" value="${body.vy.toFixed(2)}" step="0.1"></div>
				<div class="mini-input-group"><label>Start Acc X</label><input type="number" class="inp-start-ax" value="${body.startAx.toFixed(3)}" step="0.01"></div>
				<div class="mini-input-group"><label>Start Acc Y</label><input type="number" class="inp-start-ay" value="${body.startAy.toFixed(3)}" step="0.01"></div>

				<div class="mini-input-group"><label>Charge (e)</label><input type="number" class="inp-charge" value="${body.charge.toFixed(2)}" step="0.1"></div>
				<div class="mini-input-group"><label>Mag Moment</label><input type="number" class="inp-magMoment" value="${body.magMoment.toFixed(2)}" step="0.1"></div>
				<div class="mini-input-group"><label>Restitution</label><input type="number" class="inp-restitution" value="${body.restitution.toFixed(2)}" min="0" max="1" step="0.01"></div>
				<div class="mini-input-group"><label>Lifetime</label><input type="number" class="inp-lifetime" value="${body.lifetime}" min="-1" step="1"></div>
				<div class="mini-input-group"><label>Temp</label><input type="number" class="inp-temp" value="${body.temperature.toFixed(0)}" step="1"></div>
				<div class="mini-input-group"><label>Rotation</label><input type="number" class="inp-rotSpeed" value="${body.rotationSpeed.toFixed(2)}" step="0.01"></div>
				<div class="mini-input-group"><label>Young's Mod.</label><input type="number" class="inp-youngMod" value="${body.youngModulus.toFixed(0)}" step="1"></div>
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


		const updatePhysics = () => {
			body.mass = parseFloat(inpMass.value) || 1;
			body.radius = parseFloat(inpRadius.value) || 2;
			body.x = parseFloat(inpX.value) || 0;
			body.y = parseFloat(inpY.value) || 0;
			body.vx = parseFloat(inpVX.value) || 0;
			body.vy = parseFloat(inpVY.value) || 0;
			body.startAx = parseFloat(inpAX.value) || 0;
			body.startAy = parseFloat(inpAY.value) || 0;
			
			body.charge = parseFloat(inpCharge.value) || 0;
			body.magMoment = parseFloat(inpMagMoment.value) || 0;
			body.restitution = parseFloat(inpRestitution.value) || 1.0;
			body.lifetime = parseFloat(inpLifetime.value) || -1;
			body.temperature = parseFloat(inpTemp.value) || 0;
			body.rotationSpeed = parseFloat(inpRotSpeed.value) || 0;
			body.youngModulus = parseFloat(inpYoungMod.value) || 0;
		};

		[inpMass, inpRadius, inpX, inpY, inpVX, inpVY, inpAX, inpAY,
		 inpCharge, inpMagMoment, inpRestitution, inpLifetime, inpTemp, inpRotSpeed, inpYoungMod].forEach(inp => {
			inp.addEventListener('change', updatePhysics);
			inp.addEventListener('input', updatePhysics);
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
	initBodySorting();
	
	function createFieldCard(field, index) {
		const div = document.createElement('div');
		div.className = 'field-card';

		const renderErrors = () => {
			const errorXEl = div.querySelector('.error-x');
			const errorYEl = div.querySelector('.error-y');
			
			errorXEl.textContent = field.errorX || '';
			errorYEl.textContent = field.errorY || '';
			
			errorXEl.style.display = field.errorX ? 'block' : 'none';
			errorYEl.style.display = field.errorY ? 'block' : 'none';
			
			div.style.border = field.errorX || field.errorY ? '1px solid #e74c3c' : '1px solid rgba(45, 140, 240, 0.3)';
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
				<label class="toggle-row" style="margin:0;">
					<span style="font-size:12px;">Field ${index + 1} (${field.name})</span>
					<input type="checkbox" class="inp-field-enabled" ${field.enabled ? 'checked' : ''}>
					<div class="toggle-switch"></div>
				</label>
				<button class="btn-delete" title="Remove Field"><i class="fa-solid fa-trash"></i></button>
			</div>
			
			<div class="field-input-group">
				<label>Name</label>
				<input type="text" class="inp-field-name" value="${field.name}">
			</div>
			<div class="field-input-group">
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

		div.querySelector('.inp-field-enabled').addEventListener('change', (e) => {
			field.enabled = e.target.checked;
		});

		div.querySelector('.inp-field-name').addEventListener('input', () => {
			updateField();
			refreshFieldList();
		});
		
		div.querySelector('.inp-formula-x').addEventListener('input', updateField);
		div.querySelector('.inp-formula-y').addEventListener('input', updateField);
		
		div.querySelector('.btn-delete').addEventListener('click', () => {
			Sim.formulaFields.splice(index, 1);
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
	
	document.getElementById('addFieldBtn').addEventListener('click', () => {
		const newField = {
			name: `Custom ${Sim.formulaFields.length + 1}`,
			formulaX: '0', 
			formulaY: '0', 
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
	
	const toggleViscosityZoneBtn = document.getElementById('toggleViscosityZoneBtn');
	const viscosityZonesListContainer = document.getElementById('viscosityZonesListContainer');
	
	const toggleZoneDrawBtn = document.getElementById('toggleZoneDrawBtn');
	const zonesListContainer = document.getElementById('zonesListContainer');

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

	if (toggleZoneDrawBtn) {
		toggleZoneDrawBtn.addEventListener('click', () => {
			if (Render.drawMode === 'viscosity') {
				toggleViscosityZoneBtn.innerHTML = '<i class="fa-solid fa-water"></i> Draw Viscosity (Off)';
				toggleViscosityZoneBtn.classList.remove('primary');
				toggleViscosityZoneBtn.classList.add('secondary');
			}
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
				zone.width = parseFloat(inpW.value) || 100;
				zone.height = parseFloat(inpH.value) || 100;
				zone.viscosity = parseFloat(inpVis.value) || 0;
			};
			
			[inpX, inpY, inpW, inpH, inpVis].forEach(inp => {
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
	};

	const originalAddBody = Sim.addBody.bind(Sim);
	Sim.addBody = function(...args) {
		originalAddBody(...args);
		refreshBodyList();
	};

	const originalReset = Sim.reset.bind(Sim);
	Sim.reset = function() {
		originalReset();
		refreshBodyList();
		refreshZoneList();
		refreshViscosityZoneList();
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

	window.App.ui.refreshViscosityZones = refreshViscosityZoneList;
	
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
		}

		document.getElementById('newX').value = formatVal(x, 2);
		document.getElementById('newY').value = formatVal(y, 2);
		document.getElementById('newVX').value = formatVal(vx, 3);
		document.getElementById('newVY').value = formatVal(vy, 3);
		document.getElementById('newAX').value = 0;
		document.getElementById('newAY').value = 0;

		if (!onlyKinematics) {
			const mass = setDefault ? 2000 : Math.floor(Math.random() * 800) + 100;
			const charge = parseFloat(((Math.random() - 0.5) * 10).toFixed(2));
			const magMoment = parseFloat(((Math.random() - 0.5) * 20).toFixed(2));
			const restitution = parseFloat((Math.random() * 0.2).toFixed(3));
			const temperature = Math.floor(Math.random() * 1000) + 100;
			const rotationSpeed = (Math.random() - 0.5) * 0.2;
			const youngModulus = Math.floor(Math.random() * 1000) + 100;

			document.getElementById('newMass').value = formatVal(mass, 2);
			document.getElementById('newCharge').value = formatVal(charge, 2);
			document.getElementById('newMagMoment').value = formatVal(magMoment, 2);
			document.getElementById('newRestitution').value = formatVal(restitution, 2);
			document.getElementById('newLifetime').value = -1;
			document.getElementById('newTemperature').value = formatVal(temperature, 0);
			document.getElementById('newRotationSpeed').value = formatVal(rotationSpeed, 3);
			document.getElementById('newYoungModulus').value = formatVal(youngModulus, 0);
			
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

		const presets = {
			"Star: Red Giant": (S) => ({
				mass: rnd(60000, 90000) / (S.G * 2),
				charge: rnd(-5, 5),
				magMoment: rnd(50, 150),
				restitution: 0.2,
				temperature: rndInt(3000, 4500),
				youngModulus: rnd(100, 500),
				rotationSpeed: rnd(0.001, 0.005),
				color: `hsl(${rndInt(0, 20)}, 100%, 60%)`
			}),
			"Star: Yellow Dwarf (Sun)": (S) => ({
				mass: rnd(20000, 30000) / (S.G * 2),
				charge: 0,
				magMoment: rnd(10, 50),
				restitution: 0.5,
				temperature: rndInt(5500, 6000),
				youngModulus: rnd(1000, 2000),
				rotationSpeed: rnd(0.01, 0.03),
				color: `hsl(${rndInt(45, 60)}, 100%, 70%)`
			}),
			"Star: White Dwarf": (S) => ({
				mass: rnd(15000, 25000) / (S.G * 2),
				charge: rnd(0, 10),
				magMoment: rnd(100, 300),
				restitution: 0.9,
				temperature: rndInt(15000, 30000),
				youngModulus: rnd(50000, 80000),
				rotationSpeed: rnd(0.1, 0.5),
				color: `hsl(${rndInt(190, 220)}, 50%, 90%)`
			}),
			"Star: Neutron": (S) => ({
				mass: rnd(35000, 50000) / (S.G * 2),
				charge: rnd(50, 100) / Math.sqrt(S.Ke),
				magMoment: rnd(2000, 5000) / Math.sqrt(S.Km),
				restitution: 0.95,
				temperature: rndInt(500000, 1000000),
				youngModulus: 200000,
				rotationSpeed: rnd(2.0, 5.0),
				color: '#ffffff'
			}),
			"Black Hole (Simulated)": (S) => ({
				mass: rnd(150000, 300000) / (S.G * 2),
				charge: 0,
				magMoment: 0,
				restitution: 0,
				temperature: 0,
				youngModulus: 1000000,
				rotationSpeed: rnd(1.0, 10.0),
				color: '#000000'
			}),
			"Planet: Gas Giant": (S) => ({
				mass: rnd(1000, 2500) / (S.G * 2),
				charge: rnd(-2, 2),
				magMoment: rnd(20, 80),
				restitution: 0.7,
				temperature: rndInt(100, 160),
				youngModulus: rnd(100, 300),
				rotationSpeed: rnd(0.05, 0.15),
				color: `hsl(${rndInt(25, 45)}, 80%, ${rndInt(50, 70)}%)`
			}),
			"Planet: Rocky (Habitable)": (S) => ({
				mass: rnd(80, 150) / (S.G * 2),
				charge: 0,
				magMoment: rnd(2, 10),
				restitution: 0.5,
				temperature: rndInt(250, 320),
				youngModulus: rnd(3000, 6000),
				rotationSpeed: rnd(0.1, 0.3),
				color: `hsl(${rndInt(100, 140)}, 60%, 50%)`
			}),
			"Planet: Molten": (S) => ({
				mass: rnd(60, 120) / (S.G * 2),
				charge: rnd(0, 5),
				magMoment: rnd(1, 5),
				restitution: 0.3,
				temperature: rndInt(800, 1500),
				youngModulus: rnd(1000, 2000),
				rotationSpeed: rnd(0.05, 0.1),
				color: `hsl(${rndInt(0, 20)}, 80%, 40%)`
			}),
			"Particle: Electron": (S) => ({
				mass: 0.5,
				charge: -20 / Math.sqrt(S.Ke),
				magMoment: 5 / Math.sqrt(S.Km),
				restitution: 1.0,
				temperature: 0,
				youngModulus: 0,
				rotationSpeed: 8.0,
				color: '#ffff00'
			}),
			"Particle: Proton": (S) => ({
				mass: 50,
				charge: 20 / Math.sqrt(S.Ke),
				magMoment: 2 / Math.sqrt(S.Km),
				restitution: 1.0,
				temperature: 0,
				youngModulus: 0,
				rotationSpeed: 1.0,
				color: '#ff3333'
			}),
			"Particle: Neutron": (S) => ({
				mass: 50.1,
				charge: 0,
				magMoment: -3 / Math.sqrt(S.Km),
				restitution: 1.0,
				temperature: 0,
				youngModulus: 0,
				rotationSpeed: 1.0,
				color: '#aaaaaa'
			}),
			"Ball: Billiard": (S) => ({
				mass: 10,
				charge: 0,
				magMoment: 0,
				restitution: 0.98,
				temperature: 20,
				youngModulus: 15000,
				rotationSpeed: 0,
				color: `hsl(${rndInt(0, 360)}, 80%, 50%)`
			}),
			"Ball: Pétanque": (S) => ({
				mass: 40,
				charge: 0,
				magMoment: rnd(0, 0.5),
				restitution: 0.25,
				temperature: 25,
				youngModulus: 50000,
				rotationSpeed: 0,
				color: '#71706e'
			}),
			"Ball: Tennis": (S) => ({
				mass: 3,
				charge: rnd(0, 2),
				magMoment: 0,
				restitution: 0.85,
				temperature: 20,
				youngModulus: 2000,
				rotationSpeed: 0,
				color: '#ccff00'
			}),
			"Object: Soap Bubble": (S) => ({
				mass: 0.1,
				charge: rnd(1, 3),
				magMoment: 0,
				restitution: 0.8,
				temperature: 15,
				youngModulus: 10,
				rotationSpeed: rnd(0.1, 0.5),
				color: 'rgba(200, 240, 255, 0.6)'
			}),
			"Object: Magnet": (S) => ({
				mass: 25,
				charge: 0,
				magMoment: rnd(80, 120) / Math.sqrt(S.Km),
				restitution: 0.5,
				temperature: 20,
				youngModulus: 10000,
				rotationSpeed: 0,
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
				document.getElementById('newCharge').value = formatVal(params.charge, 2);
				document.getElementById('newMagMoment').value = formatVal(params.magMoment, 2);
				document.getElementById('newRestitution').value = formatVal(params.restitution, 2);
				document.getElementById('newTemperature').value = formatVal(params.temperature, 0);
				document.getElementById('newRotationSpeed').value = formatVal(params.rotationSpeed, 3);
				document.getElementById('newYoungModulus').value = formatVal(params.youngModulus, 0);
				
				if (params.color) {
					presetSelect.dataset.color = params.color;
				} else {
					delete presetSelect.dataset.color;
				}
			}
		});

		const inputIds = ['newMass', 'newX', 'newY', 'newVX', 'newVY', 'newAX', 'newAY', 
			'newCharge', 'newMagMoment', 'newRestitution', 'newLifetime', 
			'newTemperature', 'newRotationSpeed', 'newYoungModulus'];
		
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
	
	initPresets();

	const injectCurrentBody = () => {
		const m = parseFloat(document.getElementById('newMass').value);
		const x = parseFloat(document.getElementById('newX').value);
		const y = parseFloat(document.getElementById('newY').value);
		const vx = parseFloat(document.getElementById('newVX').value);
		const vy = parseFloat(document.getElementById('newVY').value);
		const ax = parseFloat(document.getElementById('newAX').value) || 0;
		const ay = parseFloat(document.getElementById('newAY').value) || 0;
		
		const charge = parseFloat(document.getElementById('newCharge').value) || 0;
		const magMoment = parseFloat(document.getElementById('newMagMoment').value) || 0;
		const restitution = parseFloat(document.getElementById('newRestitution').value) || 1.0;
		const lifetime = parseFloat(document.getElementById('newLifetime').value) || -1;
		const temperature = parseFloat(document.getElementById('newTemperature').value) || 0;
		const rotationSpeed = parseFloat(document.getElementById('newRotationSpeed').value) || 0;
		const youngModulus = parseFloat(document.getElementById('newYoungModulus').value) || 0;
		
		const presetColor = document.getElementById('presetSelect').dataset.color || null;

		Sim.addBody(m, x, y, vx, vy, presetColor, null, ax, ay, 
					charge, magMoment, restitution, 
					lifetime, temperature, rotationSpeed, youngModulus);
	};
	document.getElementById('randomizeBtn').addEventListener('click', () => generateRandomParameters(false));
	
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
				zone.width = parseFloat(inpW.value) || 100;
				zone.height = parseFloat(inpH.value) || 100;
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

	window.App.ui.refreshZones = refreshZoneList;
	
	const playBtn = document.getElementById('playPauseBtn');
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

	document.getElementById('resetBtn').addEventListener('click', () => {
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
	
	document.getElementById('addBodyBtn').addEventListener('click', () => {
		injectCurrentBody();
		const presetSelect = document.getElementById('presetSelect');
		if (presetSelect && presetSelect.value) {
			generateRandomParameters(false, true);
		} else {
			generateRandomParameters(false, false);
		}
	});

	document.getElementById('addSolarSystemBtn').addEventListener('click', () => {
		Sim.createSolarSystem();
		refreshBodyList();
	});
	
	const toggleFieldDefBtn = document.getElementById('toggleFieldDefBtn');
	const fieldDefContent = document.getElementById('fieldDefContent');
	const fieldsListContainer = document.getElementById('fieldsListContainer');
	
	const toggleFieldDefinition = () => {
		fieldDefContent.classList.toggle('hidden-content');
		toggleFieldDefBtn.innerHTML = fieldDefContent.classList.contains('hidden-content') ? '<i class="fa-solid fa-chevron-left"></i>' : '<i class="fa-solid fa-chevron-down"></i>';
	};

	if (toggleFieldDefBtn) {
		toggleFieldDefBtn.addEventListener('click', toggleFieldDefinition);
	}
	
	if (fieldDefContent.classList.contains('hidden-content')) {
		toggleFieldDefBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
	} else {
		toggleFieldDefBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i>';
	}
	
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