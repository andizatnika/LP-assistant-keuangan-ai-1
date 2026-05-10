import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

const loginForm = document.getElementById('login-form') as HTMLFormElement;
const iEmail = document.getElementById('email') as HTMLInputElement;
const iPass = document.getElementById('password') as HTMLInputElement;
const btnLogin = document.getElementById('btn-login') as HTMLButtonElement;
const btnText = document.getElementById('btn-text') as HTMLElement;
const btnSpinner = document.getElementById('btn-spinner') as HTMLElement;
const notificationArea = document.getElementById('notification-area') as HTMLElement;

function showNotification(message: string, type: 'error' | 'warning' | 'success') {
  notificationArea.classList.remove('hidden', 'bg-red-500/10', 'border-red-500/20', 'text-red-400', 'bg-amber/10', 'border-amber/20', 'text-amber', 'bg-emerald/10', 'border-emerald/20', 'text-emerald');
  
  if (type === 'error') {
    notificationArea.classList.add('bg-red-500/10', 'border-red-500/20', 'text-red-400');
  } else if (type === 'warning') {
    notificationArea.classList.add('bg-amber/10', 'border-amber/20', 'text-amber');
  } else {
    notificationArea.classList.add('bg-emerald/10', 'border-emerald/20', 'text-emerald');
  }
  
  notificationArea.innerHTML = message;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  btnLogin.disabled = true;
  btnText.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  notificationArea.classList.add('hidden');

  try {
    const userCredential = await signInWithEmailAndPassword(auth, iEmail.value.trim(), iPass.value);
    const user = userCredential.user;

    // Fetch user profile from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      await signOut(auth);
      throw new Error("Profil pengguna tidak ditemukan.");
    }

    const userData = userDocSnap.data();

    // 1. Check status & Verification
    if (!userData.isVerified || userData.status === "pending_approval" || userData.status === "pending") {
      await signOut(auth);
      showNotification("⚠️ Akun Anda sedang dalam proses verifikasi (Pending). Silakan tunggu 1x24 jam.", "warning");
      return;
    }

    if (userData.status === "rejected") {
      await signOut(auth);
      showNotification("❌ Pembayaran Anda ditolak. Silakan hubungi admin di WhatsApp.", "error");
      return;
    }

    // 2. Check Expiration (only if not lifetime)
    if (!userData.isLifetime && userData.expiresAt) {
      let expiresAtDate: Date;
      if (typeof userData.expiresAt.toDate === 'function') {
        expiresAtDate = userData.expiresAt.toDate();
      } else {
        expiresAtDate = new Date(userData.expiresAt);
      }

      if (new Date() > expiresAtDate) {
        await signOut(auth);
        showNotification(
          `⛔ <strong>Masa Keanggotaan Habis</strong><br><br>
           Masa aktif akun AI Assistant Anda telah berakhir.<br><br>
           <a href="/subscribe" class="underline font-bold mt-2 inline-block">Klik di sini untuk Memperpanjang</a>`, 
          "error"
        );
        return;
      }
    }

    // Success login
    if ((window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration', { content_name: 'Login Success' });
    }
    showNotification("✅ Login berhasil! Mengalihkan ke dashboard...", "success");
    
    // In a real app we'd redirect to dashboard here.
    // For now we'll just redirect to the index or mock dashboard.
    setTimeout(() => {
      window.location.href = '/?logged_in=true';
    }, 1500);

  } catch (error: any) {
    let msg = "Terjadi kesalahan saat masuk.";
    if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      msg = "Email atau password salah.";
    } else if (error.message) {
      msg = error.message;
    }
    showNotification("❌ " + msg, "error");
  } finally {
    if (!btnLogin.disabled || notificationArea.classList.contains('bg-red-500/10') || notificationArea.classList.contains('bg-amber/10')) {
      btnLogin.disabled = false;
      btnText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
    }
  }
});
