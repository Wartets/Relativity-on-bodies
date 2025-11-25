document.addEventListener('DOMContentLoaded', () => {
	const Sim = window.App.sim;
	const Render = window.App.render;

	const panel = document.getElementById('controlPanel');
	const header = document.getElementById('panelHeader');
	const toggleBtn = document.getElementById('togglePanelBtn');
	let isDraggingPanel = false;
	let panelOffsetX = 0, panelOffsetY = 0;
	
	const formatVal = (val, prec = 2) => {
		if (typeof val !== 'number' || isNaN(val)) return val;
		const abs = Math.abs(val);
		if (val !== 0 && (abs >= 10000 || abs < 0.0001)) {
			return val.toExponential(prec);
		}
		return parseFloat(val.toFixed(prec));
	};

	header.addEventListener('mousedown', (e) => {
		if(e.target.closest('button')) return; 
		isDraggingPanel = true;
		const rect = panel.getBoundingClientRect();
		panelOffsetX = e.clientX - rect.left;
		panelOffsetY = e.clientY - rect.top;
		header.style.cursor = 'grabbing';
	});

	window.addEventListener('mousemove', (e) => {
		if (isDraggingPanel) {
			let newX = e.clientX - panelOffsetX;
			let newY = e.clientY - panelOffsetY;
			
			const frameMargin = 20;
			const snapThreshold = 20;
			const winW = window.innerWidth;
			const winH = window.innerHeight;
			const pW = panel.offsetWidth;
			const pH = panel.offsetHeight;

			if (Math.abs(newX - frameMargin) < snapThreshold) {
				newX = frameMargin;
			} else if (Math.abs((newX + pW) - (winW - frameMargin)) < snapThreshold) {
				newX = winW - frameMargin - pW;
			}

			if (Math.abs(newY - frameMargin) < snapThreshold) {
				newY = frameMargin;
			} else if (Math.abs((newY + pH) - (winH - frameMargin)) < snapThreshold) {
				newY = winH - frameMargin - pH;
			}

			newX = Math.max(0, Math.min(winW - pW, newX));
			newY = Math.max(0, Math.min(winH - header.offsetHeight, newY));

			panel.style.left = newX + 'px';
			panel.style.top = newY + 'px';
		}
	});

	window.addEventListener('mouseup', () => { isDraggingPanel = false; header.style.cursor = 'grab'; });

	toggleBtn.addEventListener('click', () => {
		panel.classList.toggle('collapsed');
		toggleBtn.innerHTML = panel.classList.contains('collapsed') ? '<i class="fa-solid fa-plus"></i>' : '<i class="fa-solid fa-minus"></i>';
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
				<div class="mini-input-group"><label>Mass</label><input type="number" class="inp-mass" value="${formatVal(body.mass, 2)}" step="any"></div>
				<div class="mini-input-group"><label>Radius</label><input type="number" class="inp-radius" value="${formatVal(body.radius, 2)}" step="any"></div>
				<div class="mini-input-group"><label>Pos X</label><input type="number" class="inp-x" value="${formatVal(body.x, 2)}" step="any"></div>
				<div class="mini-input-group"><label>Pos Y</label><input type="number" class="inp-y" value="${formatVal(body.y, 2)}" step="any"></div>
				<div class="mini-input-group"><label>Vel X</label><input type="number" class="inp-vx" value="${formatVal(body.vx, 3)}" step="any"></div>
				<div class="mini-input-group"><label>Vel Y</label><input type="number" class="inp-vy" value="${formatVal(body.vy, 3)}" step="any"></div>
				<div class="mini-input-group"><label>Start Acc X</label><input type="number" class="inp-start-ax" value="${formatVal(body.startAx, 3)}" step="any"></div>
				<div class="mini-input-group"><label>Start Acc Y</label><input type="number" class="inp-start-ay" value="${formatVal(body.startAy, 3)}" step="any"></div>

				<div class="mini-input-group"><label>Charge (e)</label><input type="number" class="inp-charge" value="${formatVal(body.charge, 2)}" step="any"></div>
				<div class="mini-input-group"><label>Mag Moment</label><input type="number" class="inp-magMoment" value="${formatVal(body.magMoment, 2)}" step="any"></div>
				<div class="mini-input-group"><label>Restitution</label><input type="number" class="inp-restitution" value="${formatVal(body.restitution, 2)}" min="0" max="1" step="0.01"></div>
				<div class="mini-input-group"><label>Lifetime</label><input type="number" class="inp-lifetime" value="${body.lifetime}" min="-1" step="1"></div>
				<div class="mini-input-group"><label>Temp</label><input type="number" class="inp-temp" value="${formatVal(body.temperature, 0)}" step="any"></div>
				<div class="mini-input-group"><label>Rotation</label><input type="number" class="inp-rotSpeed" value="${formatVal(body.rotationSpeed, 3)}" step="any"></div>
				<div class="mini-input-group"><label>Young's Mod.</label><input type="number" class="inp-youngMod" value="${formatVal(body.youngModulus, 0)}" step="any"></div>
			</div>
		`;

		const nameInput = div.querySelector('.body-name-input');
		nameInput.addEventListener('change', (e) => { body.name = e.target.value; });
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
			if (e.target !== div) { e.preventDefault(); return; }
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
			
			const sortSel = document.getElementById('bodySortSelect');
			if(sortSel) sortSel.value = '';
			
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
	
	const originalAddBody = Sim.addBody.bind(Sim);
	Sim.addBody = function(...args) {
		originalAddBody(...args);
		refreshBodyList();
	};

	const originalReset = Sim.reset.bind(Sim);
	Sim.reset = function() {
		originalReset();
		refreshBodyList();
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

	const generateRandomParameters = (setDefault = false) => {
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

		const mass = setDefault ? 2000 : Math.floor(Math.random() * 800) + 100;
		const charge = parseFloat(((Math.random() - 0.5) * 10).toFixed(2));
		const magMoment = parseFloat(((Math.random() - 0.5) * 20).toFixed(2));
		const restitution = parseFloat((Math.random() * 0.2).toFixed(3));
		const temperature = Math.floor(Math.random() * 1000) + 100;
		const rotationSpeed = (Math.random() - 0.5) * 0.2;
		const youngModulus = Math.floor(Math.random() * 1000) + 100;

		document.getElementById('newMass').value = formatVal(mass, 2);
		document.getElementById('newX').value = formatVal(x, 2);
		document.getElementById('newY').value = formatVal(y, 2);
		document.getElementById('newVX').value = formatVal(vx, 3);
		document.getElementById('newVY').value = formatVal(vy, 3);
		document.getElementById('newAX').value = 0;
		document.getElementById('newAY').value = 0;
		
		document.getElementById('newCharge').value = formatVal(charge, 2);
		document.getElementById('newMagMoment').value = formatVal(magMoment, 2);
		document.getElementById('newRestitution').value = formatVal(restitution, 2);
		document.getElementById('newLifetime').value = -1;
		document.getElementById('newTemperature').value = formatVal(temperature, 0);
		document.getElementById('newRotationSpeed').value = formatVal(rotationSpeed, 3);
		document.getElementById('newYoungModulus').value = formatVal(youngModulus, 0);
	};

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
		
		Sim.addBody(m, x, y, vx, vy, null, null, ax, ay, 
					charge, magMoment, restitution, 
					lifetime, temperature, rotationSpeed, youngModulus);
	};
	document.getElementById('randomizeBtn').addEventListener('click', () => generateRandomParameters(false));

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
		generateRandomParameters(false);
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