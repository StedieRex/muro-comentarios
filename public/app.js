// Importaciones de Firebase
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut,
    onAuthStateChanged 
} from "firebase/auth";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    serverTimestamp, 
    query, 
    orderBy, 
    onSnapshot 
} from "firebase/firestore";

// Configuración de Firebase (REEMPLAZA con tus datos reales)
const firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "tu-app-id"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos del DOM
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const commentForm = document.getElementById('comment-form');
const newCommentForm = document.getElementById('new-comment-form');
const commentText = document.getElementById('comment-text');
const commentsList = document.getElementById('comments-list');

// Proveedor de Google
const provider = new GoogleAuthProvider();

// ==================== AUTENTICACIÓN ====================

// Iniciar sesión con Google
loginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al iniciar sesión. Intenta nuevamente.');
    }
});

// Cerrar sesión
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
});

// Observador de estado de autenticación
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario ha iniciado sesión
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        commentForm.classList.remove('hidden');
        
        userAvatar.src = user.photoURL;
        userName.textContent = user.displayName;
    } else {
        // Usuario ha cerrado sesión
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        commentForm.classList.add('hidden');
        commentsList.innerHTML = '<p>Inicia sesión para ver los comentarios...</p>';
    }
});

// ==================== COMENTARIOS ====================

// Enviar nuevo comentario
newCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const text = commentText.value.trim();
    if (!text) return;
    
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        await addDoc(collection(db, "comments"), {
            text: text,
            user: {
                name: user.displayName,
                photoURL: user.photoURL,
                email: user.email
            },
            timestamp: serverTimestamp()
        });
        
        commentText.value = ''; // Limpiar campo
    } catch (error) {
        console.error('Error al publicar comentario:', error);
        alert('Error al publicar el comentario. Intenta nuevamente.');
    }
});

// Escuchar comentarios en tiempo real
function setupCommentsListener() {
    const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));
    
    onSnapshot(q, (snapshot) => {
        commentsList.innerHTML = '';
        
        if (snapshot.empty) {
            commentsList.innerHTML = '<p>¡Sé el primero en comentar! 🎉</p>';
            return;
        }
        
        snapshot.forEach((doc) => {
            const comment = doc.data();
            const commentElement = createCommentElement(comment);
            commentsList.appendChild(commentElement);
        });
    });
}

// Crear elemento HTML para un comentario
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment new-comment';
    
    const time = comment.timestamp?.toDate 
        ? comment.timestamp.toDate().toLocaleString('es-ES')
        : 'Hace un momento';
    
    div.innerHTML = `
        <div class="comment-header">
            <img class="comment-avatar" src="${comment.user.photoURL}" alt="${comment.user.name}">
            <div>
                <div class="comment-author">${comment.user.name}</div>
                <div class="comment-time">${time}</div>
            </div>
        </div>
        <div class="comment-content">${comment.text}</div>
    `;
    
    // Remover animación después de un tiempo
    setTimeout(() => div.classList.remove('new-comment'), 1000);
    
    return div;
}

// Inicializar la aplicación
function init() {
    setupCommentsListener();
}

// Iniciar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', init);