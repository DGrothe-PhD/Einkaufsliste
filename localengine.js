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

function setCount(id, delta) {
	const p = products.find(p => p.id === id);
	if (!p) return;
	p.count = Math.max(0, p.count + delta);
	saveToStorage();
	renderList();
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

// --- Render ---
function renderList() {
	const list     = document.getElementById('productList');
	const done     = document.getElementById('doneList');
	const histList = document.getElementById('historyList');
	list.innerHTML = '';
	done.innerHTML = '';

	products.forEach(prod => {
		const item  = document.createElement('div'); item.className = 'product-item';
		const label = document.createElement('span'); label.textContent = prod.name;
		const controls = document.createElement('div'); controls.className = 'controls';
		const upBtn    = document.createElement('button'); upBtn.className = 'arrow-btn'; upBtn.innerHTML = '▲'; upBtn.onclick = () => setCount(prod.id, +1);
		const downBtn  = document.createElement('button'); downBtn.className = 'arrow-btn'; downBtn.innerHTML = '▼'; downBtn.onclick = () => setCount(prod.id, -1);
		const count    = document.createElement('input')
		count.setAttribute("type", "number");
		count.setAttribute("pattern", "[0-9]+");
		count.setAttribute("inputmode", "numeric");
		count.setAttribute("min","0");
		count.setAttribute("max","99");
		count.addEventListener('keypress', (e) => {
			if (e.charCode < 48 || e.charCode > 57) e.preventDefault();
		});
		count.addEventListener('input', () => {
			count.value = count.value.replace(/[^0-9]/g, '');
		});
		count.required = true;
		count.className = 'count'; count.value = prod.count;
		controls.append(upBtn, count, downBtn);

		const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.innerHTML = '−'; deleteBtn.onclick = () => deleteProduct(prod.id);

		item.append(label, controls, deleteBtn);
		list.appendChild(item);
		
		if(prod.count > 0){
			const doneItem = document.createElement('div'); doneItem.className = 'done-item';
			const left = document.createElement('div'); left.style.display = 'flex'; left.style.alignItems = 'center';

			const doneCheckbox   = document.createElement('input'); doneCheckbox.type = 'checkbox'; doneCheckbox.className = 'done-checkbox';
			doneCheckbox.checked = prod.done; doneCheckbox.onchange = () => toggleDone(prod.id);
			const doneLabel      = document.createElement('span'); doneLabel.textContent = prod.name;
			
			// Not ready of course.
			const amount      = document.createElement('span');
			amount.className = 'amount';
			amount.textContent = `(${prod.count}x)`;

			left.append(doneCheckbox, doneLabel, amount);

			const deleteCurrentBtn = document.createElement('button'); deleteCurrentBtn.className = 'delete-btn';
			deleteCurrentBtn.innerHTML = '−';
			deleteCurrentBtn.onclick = () => deleteProduct(prod.id);

			doneItem.append(left, deleteCurrentBtn);
			done.appendChild(doneItem);
		}
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