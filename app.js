import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCW8MCp8VdBtCJwSZGACIHfx-c_LZrluwo",
    authDomain: "control-de-gastos-525cb.firebaseapp.com",
    projectId: "control-de-gastos-525cb",
    storageBucket: "control-de-gastos-525cb.firebasestorage.app",
    messagingSenderId: "129358446387",
    appId: "1:129358446387:web:d1bec41a07339c5c074846"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias del DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

const displayPresupuesto = document.getElementById('display-presupuesto');
const displayGastado = document.getElementById('display-gastado');
const displayDisponible = document.getElementById('display-disponible');

const configForm = document.getElementById('config-form');
const inputPresupuestoPesos = document.getElementById('input-presupuesto-pesos');
const btnEditarPresupuesto = document.getElementById('btn-editar-presupuesto');
const configBox = document.getElementById('config-presupuesto-box');

const expenseForm = document.getElementById('expense-form');
const expenseDesc = document.getElementById('expense-desc');
const expenseAmountPesos = document.getElementById('expense-amount-pesos');
const expenseTasa = document.getElementById('expense-tasa');
const expenseList = document.getElementById('expense-list');

const VALID_USER = "DRPEREYRA";
const VALID_PASS = "235689";

let presupuestoPesos = 0;

window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        mostrarApp();
    }
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (user === VALID_USER && pass === VALID_PASS) {
        localStorage.setItem('isLoggedIn', 'true');
        loginError.classList.add('hidden');
        mostrarApp();
    } else {
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginForm.reset();
});

function mostrarApp() {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    sincronizarDatos();
}

btnEditarPresupuesto.addEventListener('click', () => {
    configBox.classList.toggle('hidden');
});

// Guardar Presupuesto Inicial en Pesos Argentinos en Firestore
configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!inputPresupuestoPesos) return;
    const nuevoPresupuestoPesos = parseFloat(inputPresupuestoPesos.value);

    if (!isNaN(nuevoPresupuestoPesos)) {
        try {
            await setDoc(doc(db, "configuracion", "general"), {
                presupuestoPesos: nuevoPresupuestoPesos
            });
            configBox.classList.add('hidden');
            alert("Presupuesto inicial en pesos actualizado con éxito.");
        } catch (error) {
            console.error("Error al guardar presupuesto:", error);
            alert("No se pudo guardar el presupuesto.");
        }
    }
});

// Agregar Gasto ingresando el monto original en Pesos y la Tasa PIX
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descripcion = expenseDesc.value.trim();
    const montoPesos = parseFloat(expenseAmountPesos.value);
    const tasaPix = parseFloat(expenseTasa.value);

    if (descripcion && !isNaN(montoPesos) && !isNaN(tasaPix) && tasaPix > 0) {
        try {
            const montoReales = montoPesos / tasaPix; 
            await addDoc(collection(db, "gastos"), {
                descripcion: descripcion,
                montoPesos: montoPesos,
                tasaPix: tasaPix,
                montoReales: montoReales,
                fecha: new Date()
            });
            expenseForm.reset();
        } catch (error) {
            console.error("Error al registrar gasto:", error);
            alert("Error al registrar el gasto.");
        }
    } else {
        alert("Por favor, verifica que los montos y la tasa sean válidos y mayores a cero.");
    }
});

// Sincronización en tiempo real
function sincronizarDatos() {
    onSnapshot(doc(db, "configuracion", "general"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            presupuestoPesos = Number(data.presupuestoPesos) || 0;
            if (inputPresupuestoPesos) {
                inputPresupuestoPesos.value = presupuestoPesos;
            }
            configBox.classList.add('hidden');
        } else {
            configBox.classList.remove('hidden');
        }
    });

    onSnapshot(collection(db, "gastos"), (snapshot) => {
        let gastos = [];
        snapshot.forEach((docItem) => {
            gastos.push({ id: docItem.id, ...docItem.data() });
        });
        actualizarPantallaGastos(gastos);
    });
}

function actualizarPantallaGastos(gastos) {
    expenseList.innerHTML = "";
    let totalGastadoPesos = 0;

    if (gastos.length === 0) {
        expenseList.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">No hay gastos registrados todavía.</td></tr>`;
    }

    gastos.forEach((gasto) => {
        const pesos = gasto.montoPesos !== undefined ? Number(gasto.montoPesos) : (Number(gasto.totalPesos) || 0);
        const tasa = Number(gasto.tasaPix) || 1;
        const reales = gasto.montoReales !== undefined ? Number(gasto.montoReales) : (pesos / tasa);

        totalGastadoPesos += pesos;

        const fila = document.createElement('tr');
        fila.className = "border-b border-slate-200 hover:bg-white/40 transition";
        fila.innerHTML = `
            <td class="py-3 px-4 text-slate-700">${gasto.descripcion}</td>
            <td class="py-3 px-4 text-slate-700 font-medium">$ ${pesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} ARS</td>
            <td class="py-3 px-4 text-slate-600">$ ${tasa.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            <td class="py-3 px-4 text-slate-700 font-medium">R$ ${reales.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            <td class="py-3 px-4 text-center">
                <button data-id="${gasto.id}" class="btn-eliminar px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded transition">
                    Eliminar
                </button>
            </td>
        `;
        expenseList.appendChild(fila);
    });

    const disponiblePesos = presupuestoPesos - totalGastadoPesos;

    // Renderizar panel superior (balance prioritario inalterable en pesos)
    displayPresupuesto.textContent = `$ ${presupuestoPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} ARS`;
    displayGastado.textContent = `$ ${totalGastadoPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} ARS`;
    displayDisponible.textContent = `$ ${disponiblePesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} ARS`;

    if (disponiblePesos < 0) {
        displayDisponible.className = "text-2xl font-bold text-rose-600 mt-1";
    } else {
        displayDisponible.className = "text-2xl font-bold text-teal-800 mt-1";
    }

    // Botones eliminar
    document.querySelectorAll('.btn-eliminar').forEach(boton => {
        boton.addEventListener('click', async (e) => {
            const idGasto = e.target.getAttribute('data-id');
            if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
                try {
                    await deleteDoc(doc(db, "gastos", idGasto));
                } catch (error) {
                    console.error("Error al eliminar:", error);
                    alert("No se pudo eliminar el gasto.");
                }
            }
        });
    });
}
