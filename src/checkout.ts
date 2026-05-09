import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import emailjs from '@emailjs/browser';

/**
 * CHECKOUT SCRIPT - Refactored for Cloudflare Pages & Anthropic
 * No frontend API keys. All verification happens via /api/verify-receipt
 */

// --- CONFIGURATION ---
const CONFIG = {
  EMAILJS: {
    SERVICE_ID: 'service_euvp1wfa',
    TEMPLATE_ID: 'template_f0vdyjr',
    PUBLIC_KEY: 'IjIwx_pBHLVTEbyrr'
  },
  ADMIN: {
    WA: '6283892802483'
  },
  URLS: {
    CHECKOUT: 'https://jagokeuangan.com/checkout?step=2',
    GSHEETS: 'https://script.google.com/macros/s/AKfycbxD29eqPOOhXWBlsDQ5CXI1rMVYPUBpskr8T0Ak6B7MrXptHuuQpD5VLlR1ov_z4zzhTw/exec',
    VERIFY_API: '/api/verify-receipt'
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
let orderData: any = {
  name: '',
  email: '',
  pass: '',
  wa: '',
  bank: 'bri'
};
let uploadedImageBase64: string | null = null;
const uniquePrice = 99000 + Math.floor(Math.random() * 999) + 1;
const priceStr = 'Rp ' + uniquePrice.toLocaleString('id-ID');

// --- HELPERS ---

function showStep(idx: number) {
  const steps = ['step-1', 'step-2', 'step-3'];
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (i === idx) {
      el.classList.remove('hidden-step');
      el.classList.add('visible-step');
    } else {
      el.classList.add('hidden-step');
      el.classList.remove('visible-step');
    }
  });

  const progressBar = document.getElementById('progress-bar');
  const stepCount = document.getElementById('step-count-text');

  if (idx < 2) {
    if (progressBar) progressBar.style.width = idx === 0 ? '50%' : '100%';
    if (stepCount) stepCount.textContent = `Langkah ${idx + 1} dari 2`;
  } else {
    progressBar?.parentElement?.classList.add('hidden');
    stepCount?.parentElement?.classList.add('hidden');
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const renderBankInfo = () => {
  const rekCard = document.getElementById('rek-card');
  const displayPrice = document.getElementById('display-price');
  if (!rekCard || !displayPrice) return;

  const bank = BANK_ACCOUNTS[orderData.bank] || BANK_ACCOUNTS['bri'];
  displayPrice.textContent = priceStr;
  rekCard.innerHTML = `
    <div class="bg-black/30 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
      <div class="flex items-center justify-between mb-4">
        <span class="text-[10px] font-bold uppercase tracking-widest text-gray-500">Nomor Rekening</span>
        <span class="text-[10px] font-extrabold uppercase bg-white/10 px-3 py-1 rounded-full text-emerald">${bank.name}</span>
      </div>
      <div class="flex items-center justify-between gap-4 mb-4">
        <span class="text-2xl md:text-3xl font-mono font-bold tracking-tighter text-white">${bank.rek}</span>
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

  rekCard.querySelector('.btn-copy')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const text = btn.getAttribute('data-copy') || '';
    navigator.clipboard.writeText(text).then(() => {
      const original = btn.innerHTML;
      btn.innerHTML = '<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>';
      setTimeout(() => btn.innerHTML = original, 2000);
    });
  });
};

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
    const previewImage = document.getElementById('preview-image') as HTMLImageElement;
    const fileName = document.getElementById('file-name');
    const uploadPrompt = document.getElementById('upload-prompt');
    const uploadPreview = document.getElementById('upload-preview');
    const btnConfirm = document.getElementById('btn-confirm') as HTMLButtonElement;

    if (previewImage) previewImage.src = uploadedImageBase64;
    if (fileName) fileName.textContent = file.name;
    if (uploadPrompt) uploadPrompt.classList.add('hidden');
    if (uploadPreview) uploadPreview.classList.remove('hidden');
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.classList.remove('bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
      btnConfirm.classList.add('bg-emerald', 'text-white', 'hover:bg-green-500');
    }
  };
  reader.readAsDataURL(file);
};

// --- CORE APP ---

/**
 * Calls our server-side API to verify the receipt using Claude
 */
const verifyReceiptAI = async (imageBase64: string, expectedPrice: string, expectedBank: string) => {
  try {
    const response = await fetch(CONFIG.URLS.VERIFY_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageBase64,
        expectedPrice,
        expectedBank
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.reason || "Terjadi kesalahan pada server verifikasi AI.");
    }

    return await response.json();
  } catch (err: any) {
    console.error("Verification Request Error:", err);
    throw err;
  }
};

const init = () => {
  console.log("Checkout script initializing...");

  // Toggle Password
  const togglePass = document.getElementById('toggle-password');
  const iPass = document.getElementById('password') as HTMLInputElement;
  const eyeIcon = document.getElementById('eye-icon');
  
  togglePass?.addEventListener('click', () => {
    if (!iPass) return;
    const isPass = iPass.type === 'password';
    iPass.type = isPass ? 'text' : 'password';
    if (eyeIcon) {
      eyeIcon.innerHTML = isPass 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
    }
  });

  // Step 1 -> Step 2
  const btnNext = document.getElementById('btn-next');
  btnNext?.addEventListener('click', () => {
    const iNama = document.getElementById('nama') as HTMLInputElement;
    const iEmail = document.getElementById('email') as HTMLInputElement;
    const iPass = document.getElementById('password') as HTMLInputElement;
    const iConfPass = document.getElementById('confirm-password') as HTMLInputElement;
    const iWa = document.getElementById('whatsapp') as HTMLInputElement;
    const bankRadio = document.querySelector('input[name="bank"]:checked') as HTMLInputElement;

    if (!iNama || !iEmail || !iPass || !iConfPass || !iWa || !bankRadio) {
      console.error("Missing form elements");
      return;
    }

    const name = iNama.value.trim();
    const email = iEmail.value.trim();
    const pass = iPass.value;
    const confPass = iConfPass.value;
    const wa = iWa.value.trim();

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
    
    renderBankInfo();
    
    // Optional: EmailJS
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
    ).catch(err => console.error("EmailJS error", err));

    showStep(1);
  });

  // File Upload
  const fileInput = document.getElementById('file-input');
  fileInput?.addEventListener('change', (e: any) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
  });

  const dropArea = document.getElementById('drop-area');
  dropArea?.addEventListener('dragover', (e: any) => {
    e.preventDefault();
    if (dropArea) dropArea.classList.add('dragover');
  });
  dropArea?.addEventListener('dragleave', () => dropArea?.classList.remove('dragover'));
  dropArea?.addEventListener('drop', (e: any) => {
    e.preventDefault();
    dropArea?.classList.remove('dragover');
    if (e.dataTransfer?.files.length) handleFile(e.dataTransfer.files[0]);
  });

  const removeFile = document.getElementById('remove-file');
  removeFile?.addEventListener('click', (e: any) => {
    e.stopPropagation();
    uploadedImageBase64 = null;
    const input = document.getElementById('file-input') as HTMLInputElement;
    if (input) input.value = '';
    
    document.getElementById('upload-prompt')?.classList.remove('hidden');
    document.getElementById('upload-preview')?.classList.add('hidden');
    
    const btnConfirm = document.getElementById('btn-confirm') as HTMLButtonElement;
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.classList.add('bg-gray-700', 'text-gray-400', 'cursor-not-allowed');
      btnConfirm.classList.remove('bg-emerald', 'text-white', 'hover:bg-green-500');
    }
  });

  // Confirm Payment
  const btnConfirm = document.getElementById('btn-confirm') as HTMLButtonElement;
  btnConfirm?.addEventListener('click', async () => {
    if (!uploadedImageBase64) return;
    
    btnConfirm.disabled = true;
    document.getElementById('btn-confirm-text')?.classList.add('hidden');
    document.getElementById('btn-spinner')?.classList.remove('hidden');
    document.getElementById('verify-message')?.classList.remove('hidden');

    try {
      const result = await verifyReceiptAI(
        uploadedImageBase64,
        uniquePrice.toLocaleString('id-ID'),
        BANK_ACCOUNTS[orderData.bank].name
      );
      
      if (result.isValid) {
        // Create Firebase User
        const { user } = await createUserWithEmailAndPassword(auth, orderData.email, orderData.pass);
        
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

        // GSheets log (fire and forget)
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
        }).catch(e => console.error("Sheets log error", e));

        const sName = document.getElementById('success-name');
        const sEmail = document.getElementById('success-email');
        if (sName) sName.textContent = orderData.name;
        if (sEmail) sEmail.textContent = orderData.email;

        showStep(2);

      } else {
        alert(`Verifikasi Gagal: ${result.reason}\n\nPastikan foto jelas dan nominal sesuai Rp ${uniquePrice.toLocaleString('id-ID')}. Jika AI masih menolak, silakan gunakan konfirmasi manual WhatsApp.`);
        btnConfirm.disabled = false;
        document.getElementById('btn-confirm-text')?.classList.remove('hidden');
        document.getElementById('btn-spinner')?.classList.add('hidden');
        document.getElementById('verify-message')?.classList.add('hidden');
      }
    } catch (err: any) {
      console.error(err);
      alert(`Terjadi gangguan: ${err.message || "Sistem verifikasi sedang tidak tersedia. Silakan gunakan konfirmasi manual WhatsApp."}`);
      btnConfirm.disabled = false;
      document.getElementById('btn-confirm-text')?.classList.remove('hidden');
      document.getElementById('btn-spinner')?.classList.add('hidden');
      document.getElementById('verify-message')?.classList.add('hidden');
    }
  });

  // Manual WA
  const btnManualWA = document.getElementById('btn-manual-wa');
  btnManualWA?.addEventListener('click', () => {
    const msg = encodeURIComponent(`Halo Admin, Saya ingin konfirmasi pembayaran *Assistant Keuangan AI*.\n\n👤 Nama: ${orderData.name}\n📧 Email: ${orderData.email}\n💰 Nominal: ${priceStr}\n🏦 Bank: ${orderData.bank.toUpperCase()}\n\nMohon bantuannya untuk aktifkan akun saya.`);
    window.open(`https://wa.me/${CONFIG.ADMIN.WA}?text=${msg}`, '_blank');
  });

  // Check if returning from a refresh on step 2
  const params = new URLSearchParams(window.location.search);
  const saved = sessionStorage.getItem('order_cache');
  if (params.get('step') === '2' && saved) {
    orderData = JSON.parse(saved);
    renderBankInfo();
    showStep(1);
  }
};

// Start initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
