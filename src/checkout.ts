import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import emailjs from '@emailjs/browser';

// --- CONFIGURATION ---
const CONFIG = {
  EMAILJS: {
    SERVICE_ID: 'service_euvp1wfa',
    TEMPLATE_ID: 'template_f0vdyjr',
    PUBLIC_KEY: 'IjIwx_pBHLVTEbyrr'
  },
  ADMIN: {
    WA: '6283892802483',
    TELEGRAM_BOT: 'https://t.me/KeuanganAI_Bot' // Placeholder if not provided
  },
  URLS: {
    CHECKOUT: 'https://jagokeuangan.com/checkout?step=2',
    GSHEETS: 'https://script.google.com/macros/s/AKfycbxD29eqPOOhXWBlsDQ5CXI1rMVYPUBpskr8T0Ak6B7MrXptHuuQpD5VLlR1ov_z4zzhTw/exec'
  }
};

const BANK_ACCOUNTS: Record<string, { name: string, rek: string, an: string }> = {
  bri: { name: 'Bank BRI', rek: '009201001828567', an: 'ANDI ZATNIKA' },
  mandiri: { name: 'Bank Mandiri', rek: '1820004264586', an: 'ANDI ZATNIKA' },
  bca: { name: 'Bank BCA', rek: '0383175779', an: 'HANA SUNDARI PUTRI' }
};

// --- INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// --- GLOBAL STATE ---
let orderData: any = {};
let uploadedImageBase64: string | null = null;
const uniquePrice = 99000 + Math.floor(Math.random() * 999) + 1;
const priceStr = 'Rp ' + uniquePrice.toLocaleString('id-ID');

// --- DOM ELEMENTS ---
const elements = {
  step1: document.getElementById('step-1') as HTMLElement,
  step2: document.getElementById('step-2') as HTMLElement,
  step3: document.getElementById('step-3') as HTMLElement,
  progressBar: document.getElementById('progress-bar') as HTMLElement,
  stepCount: document.getElementById('step-count-text') as HTMLElement,
  
  // Step 1 Form
  form: document.getElementById('checkout-form') as HTMLFormElement,
  iNama: document.getElementById('nama') as HTMLInputElement,
  iEmail: document.getElementById('email') as HTMLInputElement,
  iPass: document.getElementById('password') as HTMLInputElement,
  iConfPass: document.getElementById('confirm-password') as HTMLInputElement,
  iWa: document.getElementById('whatsapp') as HTMLInputElement,
  btnNext: document.getElementById('btn-next') as HTMLButtonElement,
  togglePass: document.getElementById('toggle-password') as HTMLButtonElement,
  eyeIcon: document.getElementById('eye-icon') as HTMLElement,

  // Step 2 Form
  displayPrice: document.getElementById('display-price') as HTMLElement,
  rekCard: document.getElementById('rek-card') as HTMLElement,
  dropArea: document.getElementById('drop-area') as HTMLElement,
  fileInput: document.getElementById('file-input') as HTMLInputElement,
  uploadPrompt: document.getElementById('upload-prompt') as HTMLElement,
  uploadPreview: document.getElementById('upload-preview') as HTMLElement,
  previewImage: document.getElementById('preview-image') as HTMLImageElement,
  fileName: document.getElementById('file-name') as HTMLElement,
  removeFile: document.getElementById('remove-file') as HTMLButtonElement,
  btnConfirm: document.getElementById('btn-confirm') as HTMLButtonElement,
  btnConfirmText: document.getElementById('btn-confirm-text') as HTMLElement,
  btnSpinner: document.getElementById('btn-spinner') as HTMLElement,
  verifyMsg: document.getElementById('verify-message') as HTMLElement,
  btnManual: document.getElementById('btn-manual-wa') as HTMLButtonElement,

  // Step 3
  successName: document.getElementById('success-name') as HTMLElement,
  successEmail: document.getElementById('success-email') as HTMLElement
};

// --- CORE FUNCTIONS ---

function showStep(idx: number) {
  const steps = [elements.step1, elements.step2, elements.step3];
  steps.forEach((s, i) => {
    if (i === idx) {
      s.classList.remove('hidden-step');
      s.classList.add('visible-step');
    } else {
      s.classList.add('hidden-step');
      s.classList.remove('visible-step');
    }
  });

  // Progress update
  if (idx < 2) {
    elements.progressBar.style.width = idx === 0 ? '50%' : '100%';
    elements.stepCount.textContent = `Langkah ${idx + 1} dari 2`;
  } else {
    elements.progressBar.parentElement?.classList.add('hidden');
    elements.stepCount.parentElement?.classList.add('hidden');
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const checkAuth = () => {
  const params = new URLSearchParams(window.location.search);
  const saved = sessionStorage.getItem('order_cache');
  if (params.get('step') === '2' && saved) {
    orderData = JSON.parse(saved);
    renderBankInfo();
    showStep(1);
  }
};

const renderBankInfo = () => {
  const bank = BANK_ACCOUNTS[orderData.bank] || BANK_ACCOUNTS['bri'];
  elements.displayPrice.textContent = priceStr;
  elements.rekCard.innerHTML = `
    <div class="bg-black/30 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
      <div class="flex items-center justify-between mb-4">
        <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nomor Rekening</span>
        <span class="text-[10px] font-extrabold uppercase bg-white/10 px-3 py-1 rounded-full text-emerald">${bank.name}</span>
      </div>
      <div class="flex items-center justify-between gap-4 mb-4">
        <span class="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-white" id="rek-num">${bank.rek}</span>
        <button type="button" class="btn-copy p-2 bg-white/5 rounded-xl hover:bg-emerald transition" data-copy="${bank.rek}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
        </button>
      </div>
      <div class="pt-4 border-t border-white/5 flex justify-between items-center">
        <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Atas Nama</span>
        <span class="text-sm font-bold text-white">${bank.an}</span>
      </div>
    </div>
  `;

  elements.rekCard.querySelector('.btn-copy')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const text = btn.getAttribute('data-copy') || '';
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
      setTimeout(() => btn.innerHTML = original, 2000);
    });
  });
};

// --- EVENT HANDLERS ---

// Toggle Password
elements.togglePass.addEventListener('click', () => {
  const isPass = elements.iPass.type === 'password';
  elements.iPass.type = isPass ? 'text' : 'password';
  elements.eyeIcon.innerHTML = isPass 
    ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>'
    : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
});

// Step 1: Next
elements.btnNext.addEventListener('click', () => {
  const name = elements.iNama.value.trim();
  const email = elements.iEmail.value.trim();
  const pass = elements.iPass.value;
  const confPass = elements.iConfPass.value;
  const wa = elements.iWa.value.trim();
  const bankRadio = document.querySelector('input[name="bank"]:checked') as HTMLInputElement;

  // Simple validation
  if (!name || !email || !pass || !wa || !bankRadio) {
    alert("Harap lengkapi semua data pendaftaran.");
    return;
  }
  if (pass !== confPass) {
    alert("Konfirmasi password tidak sesuai.");
    return;
  }
  if (pass.length < 8) {
    alert("Password minimal harus 8 karakter demi keamanan.");
    return;
  }

  orderData = { name, email, pass, wa, bank: bankRadio.value };
  sessionStorage.setItem('order_cache', JSON.stringify(orderData));
  
  // Transition
  renderBankInfo();
  
  // Send Email (Async)
  try {
    emailjs.send(
      CONFIG.EMAILJS.SERVICE_ID,
      CONFIG.EMAILJS.TEMPLATE_ID,
      {
        to_name: name,
        to_email: email,
        amount: priceStr,
        bank_name: BANK_ACCOUNTS[orderData.bank].name,
        rek_num: BANK_ACCOUNTS[orderData.bank].rek,
        rek_an: BANK_ACCOUNTS[orderData.bank].an,
        checkout_url: CONFIG.URLS.CHECKOUT
      },
      CONFIG.EMAILJS.PUBLIC_KEY
    );
  } catch (err) {
    console.error("EmailJS Error:", err);
  }

  showStep(1);
});

// File Management
const handleFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    alert("Hanya file gambar (JPG, PNG, WEBP) yang diperbolehkan.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert("Ukuran file terlalu besar (Maks 5MB).");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageBase64 = e.target?.result as string;
    elements.previewImage.src = uploadedImageBase64;
    elements.fileName.textContent = file.name;
    elements.uploadPrompt.classList.add('hidden');
    elements.uploadPreview.classList.remove('hidden');
    elements.btnConfirm.disabled = false;
    elements.btnConfirm.classList.remove('bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
    elements.btnConfirm.classList.add('bg-emerald', 'text-white', 'hover:bg-green-500');
  };
  reader.readAsDataURL(file);
};

elements.fileInput.addEventListener('change', (e: any) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});

elements.dropArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  elements.dropArea.classList.add('dragover');
});
elements.dropArea.addEventListener('dragleave', () => elements.dropArea.classList.remove('dragover'));
elements.dropArea.addEventListener('drop', (e) => {
  e.preventDefault();
  elements.dropArea.classList.remove('dragover');
  if (e.dataTransfer?.files.length) handleFile(e.dataTransfer.files[0]);
});

elements.removeFile.addEventListener('click', (e) => {
  e.stopPropagation();
  uploadedImageBase64 = null;
  elements.fileInput.value = '';
  elements.uploadPrompt.classList.remove('hidden');
  elements.uploadPreview.classList.add('hidden');
  elements.btnConfirm.disabled = true;
  elements.btnConfirm.classList.add('bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
  elements.btnConfirm.classList.remove('bg-emerald', 'text-white', 'hover:bg-green-500');
});

// Confirm Payment (AI Verification)
elements.btnConfirm.addEventListener('click', async () => {
  elements.btnConfirm.disabled = true;
  elements.btnConfirmText.classList.add('hidden');
  elements.btnSpinner.classList.remove('hidden');
  elements.verifyMsg.classList.remove('hidden');

  try {
    const res = await fetch('/api/verify-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: uploadedImageBase64,
        expectedPrice: uniquePrice.toLocaleString('id-ID'),
        expectedBank: BANK_ACCOUNTS[orderData.bank].name
      })
    });

    const result = await res.json();
    if (result.isValid) {
      await finalizeSignup();
    } else {
      alert(`Verifikasi Gagal: ${result.reason}\n\nPastikan foto jelas dan nominal sesuai Rp ${uniquePrice.toLocaleString('id-ID')}.`);
      resetVerifUI();
    }
  } catch (err) {
    console.error(err);
    alert("Terjadi gangguan koneksi. Harap coba beberapa saat lagi atau gunakan konfirmasi manual.");
    resetVerifUI();
  }
});

const resetVerifUI = () => {
  elements.btnConfirm.disabled = false;
  elements.btnConfirmText.classList.remove('hidden');
  elements.btnSpinner.classList.add('hidden');
  elements.verifyMsg.classList.add('hidden');
};

// Finalize Signup (Firebase)
async function finalizeSignup() {
  try {
    // 1. Create Auth
    const { user } = await createUserWithEmailAndPassword(auth, orderData.email, orderData.pass);
    
    // 2. Set Firestore Profile
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await setDoc(doc(db, 'users', user.uid), {
      name: orderData.name,
      email: orderData.email,
      whatsapp: orderData.wa,
      role: 'user',
      isVerified: true,
      expiresAt,
      createdAt: serverTimestamp()
    });

    // 3. Log to Sheets (Async)
    fetch(CONFIG.URLS.GSHEETS, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({
        name: orderData.name,
        email: orderData.email,
        wa: orderData.wa,
        bank: orderData.bank.toUpperCase(),
        amount: uniquePrice,
        status: 'AUTO_VERIFIED'
      })
    }).catch(e => console.error("Sheets log failed", e));

    // 4. Success UI
    elements.successName.textContent = orderData.name;
    elements.successEmail.textContent = orderData.email;
    showStep(2);

  } catch (err: any) {
    console.error(err);
    alert("Error: " + err.message);
    resetVerifUI();
  }
}

// Manual WA
elements.btnManual.addEventListener('click', () => {
  const msg = encodeURIComponent(`Halo Admin, Saya ingin konfirmasi pembayaran *Assistant Keuangan AI*.\n\n👤 Nama: ${orderData.name}\n📧 Email: ${orderData.email}\n💰 Nominal: ${priceStr}\n🏦 Bank: ${orderData.bank.toUpperCase()}\n\nMohon bantuannya untuk aktifkan akun saya.`);
  window.open(`https://wa.me/${CONFIG.ADMIN.WA}?text=${msg}`, '_blank');
});

// --- INIT ---
checkAuth();
