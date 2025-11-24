document.addEventListener('DOMContentLoaded', () => {
	const Sim = window.App.sim;
	const Render = window.App.render;

	const panel = document.getElementById('controlPanel');
	const header = document.getElementById('panelHeader');
	const toggleBtn = document.getElementById('togglePanelBtn');
	let isDraggingPanel = false;
	let panelOffsetX = 0, panelOffsetY = 0;

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
			newX = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, newX));
			newY = Math.max(0, Math.min(window.innerHeight - header.offsetHeight, newY));
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
				<div class="mini-input-group"><label>Acc X</label><input type="number" class="inp-ax" value="${body.ax.toFixed(3)}" step="0.01"></div>
				<div class="mini-input-group"><label>Acc Y</label><input type="number" class="inp-ay" value="${body.ay.toFixed(3)}" step="0.01"></div>

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
		nameInput.addEventListener('click', (e) => e.stopPropagation());

		const colorInput = div.querySelector('.color-input-hidden');
		const colorDot = div.querySelector('.body-color-dot');
		
		colorInput.addEventListener('input', (e) => {
			body.color = e.target.value;
			colorDot.style.backgroundColor = body.color;
			colorDot.style.boxShadow = `0 0 5px ${body.color}`;
			div.style.borderLeftColor = body.color;
		});
		colorInput.addEventListener('click', (e) => e.stopPropagation());

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
		const inpAX = div.querySelector('.inp-ax');
		const inpAY = div.querySelector('.inp-ay');
		
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
			body.ax = parseFloat(inpAX.value) || 0;
			body.ay = parseFloat(inpAY.value) || 0;
			
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
			inp.addEventListener('click', (e) => e.stopPropagation());
		});

		div.addEventListener('dragstart', (e) => {
			draggedItemIndex = index;
			div.classList.add('dragging');
			e.dataTransfer.effectAllowed = 'move';
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

			const movedBody = Sim.bodies[draggedItemIndex];
			Sim.bodies.splice(draggedItemIndex, 1);
			Sim.bodies.splice(index, 0, movedBody);
			
			if (Render.selectedBodyIdx === draggedItemIndex) {
				Render.selectedBodyIdx = index;
			} else if (Render.selectedBodyIdx === index && draggedItemIndex < index) {
				Render.selectedBodyIdx--;
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
				const inpAX = cards[i].querySelector('.inp-ax');
				const inpAY = cards[i].querySelector('.inp-ay');
				const inpRadius = cards[i].querySelector('.inp-radius');

				const inpCharge = cards[i].querySelector('.inp-charge');
				const inpMagMoment = cards[i].querySelector('.inp-magMoment');
				const inpRestitution = cards[i].querySelector('.inp-restitution');
				const inpLifetime = cards[i].querySelector('.inp-lifetime');
				const inpTemp = cards[i].querySelector('.inp-temp');
				const inpRotSpeed = cards[i].querySelector('.inp-rotSpeed');
				const inpYoungMod = cards[i].querySelector('.inp-youngMod');


				if (document.activeElement !== inpX) inpX.value = body.x.toFixed(1);
				if (document.activeElement !== inpY) inpY.value = body.y.toFixed(1);
				if (document.activeElement !== inpVX) inpVX.value = body.vx.toFixed(2);
				if (document.activeElement !== inpVY) inpVY.value = body.vy.toFixed(2);
				if (document.activeElement !== inpAX) inpAX.value = body.ax.toFixed(3);
				if (document.activeElement !== inpAY) inpAY.value = body.ay.toFixed(3);
				if (document.activeElement !== inpRadius) inpRadius.value = body.radius.toFixed(1);

				if (document.activeElement !== inpCharge) inpCharge.value = body.charge.toFixed(2);
				if (document.activeElement !== inpMagMoment) inpMagMoment.value = body.magMoment.toFixed(2);
				if (document.activeElement !== inpRestitution) inpRestitution.value = body.restitution.toFixed(2);
				if (document.activeElement !== inpLifetime) inpLifetime.value = body.lifetime;
				if (document.activeElement !== inpTemp) inpTemp.value = body.temperature.toFixed(0);
				if (document.activeElement !== inpRotSpeed) inpRotSpeed.value = body.rotationSpeed.toFixed(2);
				if (document.activeElement !== inpYoungMod) inpYoungMod.value = body.youngModulus.toFixed(0);
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

	const generateRandomParameters = () => {
		const bodies = Sim.bodies;
		let totalMass = 0;
		let comX = 0;
		let comY = 0;
		let maxR = 0;

		if (bodies.length > 0) {
			bodies.forEach(b => {
				totalMass += b.mass;
				comX += b.x * b.mass;
				comY += b.y * b.mass;
				const distSq = (b.x - Render.camX) ** 2 + (b.y - Render.camY) ** 2;
				const dist = Math.sqrt(distSq);
				if (dist > maxR) maxR = dist;
			});
			comX /= totalMass;
			comY /= totalMass;
		}

		const mass = Math.floor(Math.random() * 800) + 100;
		let x, y, vx, vy;

		if (totalMass > 0) {
			const r = Math.max(maxR, 150) * (0.6 + Math.random() * 0.6);
			const angle = Math.random() * Math.PI * 2;
			
			x = comX + Math.cos(angle) * r;
			y = comY + Math.sin(angle) * r;
			
			const vCircular = Math.sqrt((Sim.G * totalMass) / r);
			const direction = Math.random() > 0.5 ? 1 : -1;
			
			vx = -Math.sin(angle) * vCircular * direction;
			vy = Math.cos(angle) * vCircular * direction;
			
			vx += (Math.random() - 0.5) * (vCircular * 0.1);
			vy += (Math.random() - 0.5) * (vCircular * 0.1);
		} else {
			x = (Math.random() - 0.5) * 400;
			y = (Math.random() - 0.5) * 400;
			vx = (Math.random() - 0.5) * 2;
			vy = (Math.random() - 0.5) * 2;
		}

		const charge = parseFloat(((Math.random() - 0.5) * 10).toFixed(2));
		const magMoment = parseFloat(((Math.random() - 0.5) * 20).toFixed(2));
		const restitution = parseFloat((Math.random() * 0.4 + 0.6).toFixed(2));
		const temperature = Math.floor(Math.random() * 1000) + 100;
		const rotationSpeed = (Math.random() - 0.5) * 0.2;
		const youngModulus = Math.floor(Math.random() * 1000) + 100;

		document.getElementById('newMass').value = mass;
		document.getElementById('newX').value = x.toFixed(1);
		document.getElementById('newY').value = y.toFixed(1);
		document.getElementById('newVX').value = vx.toFixed(2);
		document.getElementById('newVY').value = vy.toFixed(2);
		document.getElementById('newAX').value = 0;
		document.getElementById('newAY').value = 0;
		
		document.getElementById('newCharge').value = charge;
		document.getElementById('newMagMoment').value = magMoment;
		document.getElementById('newRestitution').value = restitution;
		document.getElementById('newLifetime').value = -1;
		document.getElementById('newTemperature').value = temperature;
		document.getElementById('newRotationSpeed').value = rotationSpeed.toFixed(2);
		document.getElementById('newYoungModulus').value = youngModulus;
	};
	generateRandomParameters();
	generateRandomParameters();
	document.getElementById('randomizeBtn').addEventListener('click', generateRandomParameters);

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
		if(Sim.paused) Render.draw(); 
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
	});

	document.getElementById('addSolarSystemBtn').addEventListener('click', () => {
		Sim.createSolarSystem();
		refreshBodyList();
	});
	
	bindRange('dtSlider', 'dtVal', Sim, 'dt', true, 1);
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
	
	Render.init();
	refreshBodyList();
});