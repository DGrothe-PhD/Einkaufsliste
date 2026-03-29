//javascript
// --- localStorage Engine (kein Firebase) ---
// Ersetzt Firebase durch localStorage + manuellen JSON-Export/Import

const STORAGE_KEY = 'einkaufsliste';

let products = [];
let history = {};
let nextId = 1;

// --- Persistenz ---
function loadFromStorage() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const data = JSON.parse(raw);
			products = data.products || [];
			history  = data.history  || {};
			nextId   = data.nextId   || (products.length + 1);
		}
	} catch(e) {
		console.warn('Fehler beim Laden aus localStorage:', e);
	}
}

function saveToStorage() {
	const data = { products, history, nextId };
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- Export / Import ---
function exportJSON() {
	const data = { products, history, nextId };
	const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement('a');
	a.href     = url;
	a.download = 'einkaufsliste.json';
	a.click();
	URL.revokeObjectURL(url);
}

function importJSON() {
	const input = document.createElement('input');
	input.type  = 'file';
	input.accept = '.json,application/json';
	input.onchange = e => {
		const file = e.target.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = ev => {
			try {
				const data = JSON.parse(ev.target.result);
				products = data.products || [];
				history  = data.history  || {};
				nextId   = data.nextId   || (products.length + 1);
				saveToStorage();
				renderList();
			} catch(err) {
				alert('Ungültige JSON-Datei.');
			}
		};
		reader.readAsText(file);
	};
	input.click();
}

// --- Toggle and design ---
const showLessBtn = document.getElementById('showLess');
const listToToggle = document.getElementById('productList');

showLessBtn.addEventListener('click', () => {
  const isCollapsed = listToToggle.style.display === 'none';
  listToToggle.style.display = isCollapsed ? '' : 'none';
  showLessBtn.textContent = isCollapsed ? 'Weniger zeigen' : 'Mehr zeigen';
});

// --- Funktionen ---
function generateId() {
	return String(nextId++);
}

function addProduct() {
	const input = document.getElementById('addProductInput');
	const name  = input.value.trim();
	if (!name) return;
	products.push({ id: generateId(), name, count: 1, done: false });
	updateHistory(name);
	saveToStorage();
	renderList();
	input.value = '';
}

function addDone() {
	const input = document.getElementById('addDoneInput');
	const name  = input.value.trim();
	if (!name) return;
	products.push({ id: generateId(), name, count: 0, done: false });
	updateHistory(name);
	saveToStorage();
	renderList();
	input.value = '';
}

// Update count in-place without re-rendering the full list.
// This preserves keyboard focus so the user can keep incrementing
// the same product with the arrow buttons or Tab away normally.
function setCount(id, delta) {
	const p = products.find(p => p.id === id);
	if (!p) return;
	p.count = Math.max(0, p.count + delta);
	saveToStorage();

	// Update the count input in-place
	const countInput = document.querySelector(`input.count[data-id="${id}"]`);
	if (countInput) {
		countInput.value = p.count;
		// Keep aria-label current so screen readers re-announce the new value
		countInput.setAttribute('aria-label', `${p.name}: Anzahl ${p.count}`);
	}

	// Sync the "Einkaufen bitte" panel (full re-render is fine there,
	// focus lives in the product list on the left)
	renderDoneList();
}

function setCountFromInput(id, value) {
	const p = products.find(p => p.id === id);
	if (!p) return;
	const parsed = parseInt(value, 10);
	p.count = isNaN(parsed) ? 0 : Math.max(0, Math.min(99, parsed));
	saveToStorage();
	// Normalise the field in case the user typed something out-of-range
	const countInput = document.querySelector(`input.count[data-id="${id}"]`);
	if (countInput) {
		countInput.value = p.count;
		countInput.setAttribute('aria-label', `${p.name}: Anzahl ${p.count}`);
	}
	renderDoneList();
}

function toggleDone(id) {
	const p = products.find(p => p.id === id);
	if (!p) return;
	p.done = !p.done;
	saveToStorage();
	renderList();
}

function deleteProduct(id) {
	products = products.filter(p => p.id !== id);
	saveToStorage();
	renderList();
}

function updateHistory(name) {
	history[name] = (history[name] || 0) + 1;
}

function addProductByName(name) {
	products.push({ id: generateId(), name, count: 1, done: false });
	updateHistory(name);
	saveToStorage();
	renderList();
}

// --- Render helpers ---

// Renders only the "Einkaufen bitte" done-panel and history chips.
// Called by setCount so focus in the product list is never disturbed.
function renderDoneList() {
	const done     = document.getElementById('doneList');
	const histList = document.getElementById('historyList');
	done.innerHTML = '';

	products.forEach(prod => {
		if (prod.count <= 0) return;

		const doneItem = document.createElement('div'); doneItem.className = 'done-item';
		const left = document.createElement('div'); left.style.display = 'flex'; left.style.alignItems = 'center';

		const doneCheckbox = document.createElement('input');
		doneCheckbox.type = 'checkbox';
		doneCheckbox.className = 'done-checkbox';
		doneCheckbox.setAttribute('aria-label', `${prod.name} als erledigt markieren`);
		doneCheckbox.checked = prod.done;
		doneCheckbox.onchange = () => toggleDone(prod.id);

		const doneLabel = document.createElement('span'); doneLabel.textContent = prod.name;

		const amount = document.createElement('span');
		amount.className = 'amount';
		amount.textContent = `(${prod.count}x)`;

		left.append(doneCheckbox, doneLabel, amount);

		const deleteCurrentBtn = document.createElement('button');
		deleteCurrentBtn.className = 'delete-btn';
		deleteCurrentBtn.innerHTML = '−';
		deleteCurrentBtn.setAttribute('aria-label', `${prod.name} entfernen`);
		deleteCurrentBtn.onclick = () => deleteProduct(prod.id);

		doneItem.append(left, deleteCurrentBtn);
		done.appendChild(doneItem);
	});

	const hist = Object.entries(history)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 5)
		.filter(([name]) => !products.find(p => p.name.toLowerCase() === name.toLowerCase() && p.count > 0));

	histList.innerHTML = hist.length ? 'Häufig benutzt: ' : '';
	hist.forEach(([name, count]) => {
		const el = document.createElement('span'); el.className = 'history-item';
		el.textContent = `${name} (${count})`;
		el.onclick = () => addProductByName(name);
		histList.appendChild(el);
	});
}

// Full render — rebuilds the product list AND the done panel.
// Only called when the list structure changes (add / delete / import).
function renderList() {
	const list = document.getElementById('productList');
	list.innerHTML = '';

	products.forEach(prod => {
		const label = document.createElement('span'); label.textContent = prod.name;

		const controls = document.createElement('div'); controls.className = 'controls';

		const upBtn = document.createElement('button');
		upBtn.className = 'arrow-btn';
		upBtn.innerHTML = '▲';
		upBtn.setAttribute('aria-label', `${prod.name} erhöhen`);
		upBtn.onclick = () => setCount(prod.id, +1);

		const count = document.createElement('input');
		count.setAttribute('type', 'number');
		count.setAttribute('pattern', '[0-9]+');
		count.setAttribute('inputmode', 'numeric');
		count.setAttribute('min', '0');
		count.setAttribute('max', '99');
		// aria-label lets screen readers announce product name + current value
		count.setAttribute('aria-label', `${prod.name}: Anzahl ${prod.count}`);
		// data-id lets setCount find this input without a full re-render
		count.setAttribute('data-id', prod.id);
		count.addEventListener('keypress', (e) => {
			if (e.charCode < 48 || e.charCode > 57) e.preventDefault();
		});
		count.addEventListener('input', () => {
			count.value = count.value.replace(/[^0-9]/g, '');
		});
		// Commit manually typed number to the model on blur or Enter
		count.addEventListener('change', () => setCountFromInput(prod.id, count.value));
		count.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') setCountFromInput(prod.id, count.value);
		});
		count.required = true;
		count.className = 'count';
		count.value = prod.count;

		const downBtn = document.createElement('button');
		downBtn.className = 'arrow-btn';
		downBtn.innerHTML = '▼';
		downBtn.setAttribute('aria-label', `${prod.name} verringern`);
		downBtn.onclick = () => setCount(prod.id, -1);

		controls.append(upBtn, count, downBtn);

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'delete-btn';
		deleteBtn.innerHTML = '−';
		deleteBtn.setAttribute('aria-label', `${prod.name} aus der Liste entfernen`);
		deleteBtn.onclick = () => deleteProduct(prod.id);

		list.append(label, controls, deleteBtn);
	});

	// Render the right-hand panel too
	renderDoneList();
}

// --- Event Listener ---
document.getElementById('addProductInput').addEventListener('keydown', e => { if (e.key === 'Enter') addProduct(); });
document.getElementById('addProductBtn').addEventListener('click', () => addProduct());
document.getElementById('addDoneInput').addEventListener('keydown', e => { if (e.key === 'Enter') addDone(); });
document.getElementById('addDoneBtn').addEventListener('click', () => addDone());

document.getElementById('exportJSON').addEventListener('click', () => exportJSON());
document.getElementById('importJSON').addEventListener('click', () => importJSON());

// make exportJSON/importJSON globally accessible:
window.exportJSON = exportJSON;
window.importJSON = importJSON;

// --- Init ---
loadFromStorage();
renderList();
