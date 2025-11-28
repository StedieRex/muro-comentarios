// ==================== IMPORTACIONES ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  signInWithRedirect, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==================== CONFIGURACIÓN ====================

// 1. DATOS DE CLOUDINARY (Usa los mismos que en prueba.html)
const CLOUDINARY_CLOUD_NAME = 'diolfdye1';  // <--- VERIFICA ESTO
const CLOUDINARY_UPLOAD_PRESET = 'red_social_preset'; // <--- VERIFICA ESTO

// 2. DATOS DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAiJfMGqPMz3wdyXYeCE-Y95Z_HyQEzK70",
  authDomain: "panelcomentarios.firebaseapp.com",
  projectId: "panelcomentarios",
  storageBucket: "panelcomentarios.firebasestorage.app",
  messagingSenderId: "559260028515",
  appId: "1:559260028515:web:95cf384ac64ade0539b256"
};

// Inicializar Apps
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Referencias DOM
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userInfo = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const commentForm = document.getElementById('comment-form');
const newCommentForm = document.getElementById('new-comment-form');
const commentText = document.getElementById('comment-text');
const commentImageInput = document.getElementById('comment-image');
const commentsList = document.getElementById('comments-list');
const submitBtn = document.getElementById('submit-btn');

// ==================== FUNCIÓN DE SUBIDA ====================
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    console.log("☁️ Subiendo imagen a Cloudinary...");

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error.message);
    }

    const data = await response.json();
    console.log("✅ Imagen lista:", data.secure_url);
    return data.secure_url;
}

// ==================== EVENTOS ====================

// Auth
loginBtn.addEventListener('click', () => signInWithRedirect(auth, provider));
logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginBtn.classList.add('hidden');
        userInfo.classList.remove('hidden');
        commentForm.classList.remove('hidden');
        userAvatar.src = user.photoURL;
        userName.textContent = user.displayName;
    } else {
        loginBtn.classList.remove('hidden');
        userInfo.classList.add('hidden');
        commentForm.classList.add('hidden');
        commentsList.innerHTML = '<p class="text-center">Inicia sesión para ver los comentarios.</p>';
    }
});

// SUBMIT (Aquí ocurre la magia)
newCommentForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // EVITA QUE LA PÁGINA SE RECARGUE
    console.log("🔘 BOTÓN PRESIONADO: Iniciando proceso...");

    const text = commentText.value.trim();
    const file = commentImageInput.files[0];

    // Validación
    if (!text && !file) {
        alert("El post está vacío.");
        return;
    }
    if (!auth.currentUser) return;

    // UI Carga
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Publicando...";

    try {
        let imageUrl = null;

        // 1. Subir imagen (Si hay archivo)
        if (file) {
            imageUrl = await uploadToCloudinary(file);
        }

        // 2. Guardar en Firestore
        console.log("📝 Guardando en Firebase...");
        await addDoc(collection(db, "comments"), {
            text: text,
            imageUrl: imageUrl, 
            user: {
                name: auth.currentUser.displayName,
                photoURL: auth.currentUser.photoURL,
                email: auth.currentUser.email,
                uid: auth.currentUser.uid
            },
            timestamp: serverTimestamp()
        });

        // 3. Limpiar
        commentText.value = '';
        commentImageInput.value = '';
        console.log("🎉 Post publicado con éxito");

    } catch (error) {
        console.error("🔥 Error:", error);
        alert("Hubo un error: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "📤 Publicar";
    }
});

// Renderizar Comentarios
onSnapshot(query(collection(db, "comments"), orderBy("timestamp", "desc")), (snapshot) => {
    commentsList.innerHTML = '';
    
    if (snapshot.empty) {
        commentsList.innerHTML = '<p class="text-center">No hay comentarios aún.</p>';
        return;
    }

    snapshot.forEach((doc) => {
        const comment = doc.data();
        const div = document.createElement('div');
        div.className = 'comment new-comment';
        
        // HTML Condicional de Imagen
        const imgHtml = comment.imageUrl 
            ? `<div class="post-image-container"><img src="${comment.imageUrl}" alt="imagen" loading="lazy"></div>` 
            : '';

        const time = comment.timestamp ? comment.timestamp.toDate().toLocaleString() : '...';

        div.innerHTML = `
            <div class="comment-header">
                <img class="comment-avatar" src="${comment.user.photoURL}">
                <div>
                    <div class="comment-author">${comment.user.name}</div>
                    <div class="comment-time">${time}</div>
                </div>
            </div>
            <div class="comment-content">${comment.text}</div>
            ${imgHtml}
        `;
        
        commentsList.appendChild(div);
        setTimeout(() => div.classList.remove('new-comment'), 1000);
    });
});