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
const inputPresupuestoReales = document.getElementById('input-presupuesto-reales');
const btnEditarPresupuesto = document.getElementById('btn-editar-presupuesto');
const configBox = document.getElementById('config-presupuesto-box');

const expenseForm = document.getElementById('expense-form');
const expenseDesc = document.getElementById('expense-desc');
const expenseAmount = document.getElementById('expense-amount');
const expenseTasa = document.getElementById('expense-tasa');
const expenseList = document.getElementById('expense-list');

const VALID_USER = "DRPEREYRA";
const VALID_PASS = "235689";

let presupuestoReales = 0;

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

// Guardar Presupuesto Inicial en Firestore
configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nuevoPresupuesto = parseFloat(inputPresupuestoReales.value);

    if (!isNaN(nuevoPresupuesto)) {
        try {
            await setDoc(doc(db, "configuracion", "general"), {
                presupuestoReales: nuevoPresupuesto
            });
            configBox.classList.add('hidden');
            alert("Presupuesto inicial actualizado con éxito.");
        } catch (error) {
            console.error("Error al guardar presupuesto:", error);
            alert("No se pudo guardar el presupuesto.");
        }
    }
});

// Agregar Gasto con su propia Tasa PIX fija
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descripcion = expenseDesc.value.trim();
    const montoReales = parseFloat(expenseAmount.value);
    const tasaPix = parseFloat(expenseTasa.value);

    if (descripcion && !isNaN(montoReales) && !isNaN(tasaPix)) {
        try {
            await addDoc(collection(db, "gastos"), {
                descripcion: descripcion,
                montoReales: montoReales,
                tasaPix: tasaPix,
                totalPesos: montoReales * tasaPix, // Se congela el valor histórico calculado
                fecha: new Date()
            });
            expenseForm.reset();
        } catch (error) {
            console.error("Error al registrar gasto:", error);
            alert("Error al registrar el gasto.");
        }
    }
});

// Sincronización en tiempo real
function sincronizarDatos() {
    // Escuchar cambios en la configuración (solo presupuesto)
    onSnapshot(doc(db, "configuracion", "general"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            presupuestoReales = Number(data.presupuestoReales) || 0;
            inputPresupuestoReales.value = presupuestoReales;
            configBox.classList.add('hidden');
        } else {
            configBox.classList.remove('hidden');
        }
    });

    // Escuchar cambios en la lista de gastos
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
    let totalGastadoReales = 0;
    let totalGastadoPesos = 0;

    if (gastos.length === 0) {
        expenseList.innerHTML = `<tr><td colspan="5" class="py-4 text-center text-slate-500">No hay gastos registrados todavía.</td></tr>`;
    }

    gastos.forEach((gasto) => {
        const reales = Number(gasto.montoReales) || 0;
        const tasa = Number(gasto.tasaPix) || 0;
        // Usa el totalPesos congelado histórico, o lo calcula si es un registro antiguo
        const pesos = gasto.totalPesos !== undefined ? Number(gasto.totalPesos) : (reales * tasa);

        totalGastadoReales += reales;
        totalGastadoPesos += pesos;

        const fila = document.createElement('tr');
        fila.className = "border-b border-slate-200 hover:bg-white/40 transition";
        fila.innerHTML = `
            <td class="py-3 px-4 text-slate-700">${gasto.descripcion}</td>
            <td class="py-3 px-4 text-slate-700 font-medium">R$ ${reales.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            <td class="py-3 px-4 text-slate-600">$ ${tasa.toLocaleString('es-AR', {minimumFractionDigits: 2})} ARS</td>
            <td class="py-3 px-4 text-slate-700 font-medium">$ ${pesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} ARS</td>
            <td class="py-3 px-4 text-center">
                <button data-id="${gasto.id}" class="btn-eliminar px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded transition">
                    Eliminar
                </button>
            </td>
        `;
        expenseList.appendChild(fila);
    });

    const disponibleReales = presupuestoReales - totalGastadoReales;

    // Renderizar panel superior (balance prioritario)
    displayPresupuesto.textContent = `R$ ${presupuestoReales.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    displayGastado.textContent = `R$ ${totalGastadoReales.toLocaleString('es-AR', {minimumFractionDigits: 2})} ($ ${totalGastadoPesos.toLocaleString('es-AR', {minimumFractionDigits: 2})} ARS)`;
    displayDisponible.textContent = `R$ ${disponibleReales.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    if (disponibleReales < 0) {
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
