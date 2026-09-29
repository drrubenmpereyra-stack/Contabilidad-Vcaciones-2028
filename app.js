// Importación corregida de funciones de los SDK de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuración de Firebase provista
const firebaseConfig = {
    apiKey: "AIzaSyCW8MCp8VdBtCJwSZGACIHfx-c_LZrluwo",
    authDomain: "control-de-gastos-525cb.firebaseapp.com",
    projectId: "control-de-gastos-525cb",
    storageBucket: "control-de-gastos-525cb.firebasestorage.app",
    messagingSenderId: "129358446387",
    appId: "1:129358446387:web:d1bec41a07339c5c074846"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencias a elementos del DOM
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const expenseForm = document.getElementById('expense-form');
const expenseDesc = document.getElementById('expense-desc');
const expenseAmount = document.getElementById('expense-amount');
const expenseList = document.getElementById('expense-list');
const totalAmountEl = document.getElementById('total-amount');

// Credenciales requeridas
const VALID_USER = "DRPEREYRA";
const VALID_PASS = "235689";

// Control de sesión por almacenamiento local
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        mostrarApp();
    }
});

// Lógica de Inicio de Sesión
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

// Lógica de Cierre de Sesión
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('isLoggedIn');
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginForm.reset();
});

function mostrarApp() {
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    cargarGastosEnTiempoReal();
}

// Referencia a la colección en Firestore
const gastosCollection = collection(db, "gastos");

// Agregar un nuevo gasto
expenseForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const descripcion = expenseDesc.value.trim();
    const monto = parseFloat(expenseAmount.value);

    if (descripcion && !isNaN(monto)) {
        try {
            await addDoc(gastosCollection, {
                descripcion: descripcion,
                monto: monto,
                fecha: new Date()
            });
            expenseForm.reset();
        } catch (error) {
            console.error("Error al guardar el gasto:", error);
            alert("No se pudo guardar el gasto. Revisa tu conexión.");
        }
    }
});

// Leer y sincronizar gastos en tiempo real con Firestore
function cargarGastosEnTiempoReal() {
    onSnapshot(gastosCollection, (snapshot) => {
        expenseList.innerHTML = "";
        let totalGeneral = 0;

        if (snapshot.empty) {
            expenseList.innerHTML = `<tr><td colspan="3" class="py-4 text-center text-slate-500">No hay gastos registrados todavía.</td></tr>`;
            totalAmountEl.textContent = "$0.00";
            return;
        }

        snapshot.forEach((documento) => {
            const gasto = documento.data();
            const id = documento.id;
            totalGeneral += Number(gasto.monto);

            const fila = document.createElement('tr');
            fila.className = "border-b border-slate-200 hover:bg-white/40 transition";
            fila.innerHTML = `
                <td class="py-3 px-4 text-slate-700">${gasto.descripcion}</td>
                <td class="py-3 px-4 text-slate-700 font-medium">$${Number(gasto.monto).toFixed(2)}</td>
                <td class="py-3 px-4 text-center">
                    <button data-id="${id}" class="btn-eliminar px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded transition">
                        Eliminar
                    </button>
                </td>
            `;
            expenseList.appendChild(fila);
        });

        totalAmountEl.textContent = `$${totalGeneral.toFixed(2)}`;

        // Asignar eventos a los botones de eliminar
        document.querySelectorAll('.btn-eliminar').forEach(boton => {
            boton.addEventListener('click', async (e) => {
                const idGasto = e.target.getAttribute('data-id');
                if (confirm("¿Estás seguro de que deseas eliminar este gasto?")) {
                    try {
                        await deleteDoc(doc(db, "gastos", idGasto));
                    } catch (error) {
                        console.error("Error al eliminar el gasto:", error);
                        alert("No se pudo eliminar el registro.");
                    }
                }
            });
        });
    });
}
