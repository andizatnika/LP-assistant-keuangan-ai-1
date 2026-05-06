import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// State & DOM
let orderData: any = {};
let uniquePrice = 99000 + Math.floor(Math.random() * 999) + 1; // 99.001 to 99.999
const formattedPriceStr = 'Rp ' + uniquePrice.toLocaleString('id-ID');

const steps = [
  document.getElementById('step-1') as HTMLElement,
  document.getElementById('step-2') as HTMLElement,
  document.getElementById('step-3') as HTMLElement
];

// Display Dynamic Price
document.querySelectorAll('.dynamic-price').forEach(el => {
  el.textContent = formattedPriceStr;
});

// Update exact price warning
document.getElementById('exact-price-warning')!.innerHTML = `⚠️ Transfer TEPAT <strong>${formattedPriceStr}</strong> (tidak kurang/lebih) agar mudah diverifikasi dan otomatis aktif.`;

// Page 1 Elements
const iNama = document.getElementById('nama') as HTMLInputElement;
const iEmail = document.getElementById('email') as HTMLInputElement;
const iPass = document.getElementById('password') as HTMLInputElement;
const iConfPass = document.getElementById('confirm-password') as HTMLInputElement;
const iWa = document.getElementById('whatsapp') as HTMLInputElement;
const btnNext = document.getElementById('btn-next') as HTMLButtonElement;

// Password Elements
const togglePass = document.getElementById('toggle-password') as HTMLButtonElement;
const eyeIcon = document.getElementById('eye-icon') as HTMLElement;
const matchIcon = document.getElementById('match-icon') as HTMLElement;
const [str1, str2, str3] = [
  document.getElementById('strength-1') as HTMLElement, 
  document.getElementById('strength-2') as HTMLElement, 
  document.getElementById('strength-3') as HTMLElement
];
const strText = document.getElementById('strength-text') as HTMLElement;

// Utility Functions
const showStep = (stepIndex: number) => {
  steps.forEach((el, idx) => {
    if (idx === stepIndex) {
      el.classList.remove('hidden-step');
      el.classList.add('visible-step');
    } else {
      el.classList.remove('visible-step');
      el.classList.add('hidden-step');
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Validation Logic (Page 1)
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (pass: string) => {
  return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass);
};

const updateStrength = (pass: string) => {
  let score = 0;
  if(pass.length >= 6) score += 1;
  if(pass.length >= 8 && /[0-9]/.test(pass)) score += 1;
  if(/[A-Z]/.test(pass) && /[^a-zA-Z0-9]/.test(pass)) score += 1;

  [str1, str2, str3].forEach(el => { el.style.width = '0%'; el.className = 'h-full w-0 transition-all duration-300'; });
  
  if(pass.length === 0) {
    strText.textContent = 'Lemah';
    return;
  }
  
  if(score === 1) {
    str1.style.width = '100%'; str1.classList.add('bg-red-500');
    strText.textContent = 'Lemah'; strText.classList.replace('text-amber','text-red-500'); strText.classList.replace('text-emerald','text-red-500');
  } else if (score === 2) {
    str1.style.width = '100%'; str1.classList.add('bg-amber');
    str2.style.width = '100%'; str2.classList.add('bg-amber');
    strText.textContent = 'Sedang'; strText.classList.replace('text-red-500','text-amber'); strText.classList.replace('text-emerald','text-amber');
  } else if (score >= 3) {
    str1.style.width = '100%'; str1.classList.add('bg-emerald');
    str2.style.width = '100%'; str2.classList.add('bg-emerald');
    str3.style.width = '100%'; str3.classList.add('bg-emerald');
    strText.textContent = 'Kuat'; strText.classList.replace('text-red-500','text-emerald'); strText.classList.replace('text-amber','text-emerald');
  }
};

const checkFormValidity = () => {
  const isNamaValid = iNama.value.trim() !== '';
  const isEmailValid = validateEmail(iEmail.value);
  const isPassValid = validatePassword(iPass.value);
  const isConfValid = iPass.value !== '' && iPass.value === iConfPass.value;
  const isWaValid = iWa.value.trim().length >= 10;
  const bankRadio = document.querySelector('input[name="bank"]:checked');
  const bankSelected = bankRadio !== null;

  if(iConfPass.value !== '') {
    matchIcon.classList.remove('hidden');
    if(isConfValid) {
      matchIcon.innerHTML = `<svg class="w-5 h-5 text-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    } else {
      matchIcon.innerHTML = `<svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    }
  } else {
    matchIcon.classList.add('hidden');
  }

  if(isNamaValid && isEmailValid && isPassValid && isConfValid && isWaValid && bankSelected) {
    btnNext.disabled = false;
    btnNext.className = "w-full bg-amber hover:bg-yellow-500 text-darkgreen font-heading font-bold text-lg py-4 rounded-full transition flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(245,158,11,0.2)]";
  } else {
    btnNext.disabled = true;
    btnNext.className = "w-full bg-gray-500 text-gray-300 font-heading font-bold text-lg py-4 rounded-full transition flex items-center justify-center gap-2 cursor-not-allowed";
  }
};

[iNama, iEmail, iPass, iConfPass, iWa].forEach(el => {
  el.addEventListener('input', checkFormValidity);
});
document.querySelectorAll('.bank-radio').forEach(radio => {
  radio.addEventListener('change', checkFormValidity);
});

iPass.addEventListener('input', (e) => updateStrength((e.target as HTMLInputElement).value));

togglePass.addEventListener('click', () => {
  if(iPass.type === 'password') {
    iPass.type = 'text';
    eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>`;
  } else {
    iPass.type = 'password';
    eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
  }
});

btnNext.addEventListener('click', async () => {
  btnNext.disabled = true;
  btnNext.innerHTML = '<div class="loader-spinner"></div> Memproses...';
  
  try {
    // 1. Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, iEmail.value.trim(), iPass.value);
    const user = userCredential.user;

    orderData = {
      uid: user.uid,
      name: iNama.value.trim(),
      email: iEmail.value.trim(),
      wa: iWa.value.trim(),
      bank: (document.querySelector('input[name="bank"]:checked') as HTMLInputElement).value
    };

    // 2. Create unverified Firestore profile
    await setDoc(doc(db, "users", user.uid), {
      name: orderData.name,
      email: orderData.email,
      whatsapp: orderData.wa,
      role: 'user',
      isVerified: false, 
      createdAt: serverTimestamp()
    });

    document.getElementById('display-name')!.textContent = orderData.name;
    const rekCard = document.getElementById('rek-card') as HTMLElement;
    
    if(orderData.bank === 'bri') {
      rekCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="font-heading text-lg font-bold text-white mb-2">🏦 Bank BRI</p>
            <p class="text-sm text-gray-400 mb-0.5">No. Rekening:</p>
            <p class="font-mono text-2xl font-bold tracking-widest text-emerald" id="rek-num">009201001828567</p>
          </div>
        </div>
        <p class="text-sm text-gray-300 mb-1">Atas Nama: <strong class="text-white">ANDI ZATNIKA</strong></p>
        <p class="text-sm text-gray-300 mb-4">Jumlah Transfer: <strong class="text-white dynamic-price">${formattedPriceStr}</strong></p>
        <button type="button" class="btn-copy text-sm bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition" data-copy="009201001828567">
          Salin Nomor Rekening
        </button>
      `;
    } else if (orderData.bank === 'mandiri') {
      rekCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="font-heading text-lg font-bold text-white mb-2">🏦 Bank Mandiri</p>
            <p class="text-sm text-gray-400 mb-0.5">No. Rekening:</p>
            <p class="font-mono text-xl md:text-2xl font-bold tracking-widest text-emerald" id="rek-num">1820004264586</p>
          </div>
        </div>
        <p class="text-sm text-gray-300 mb-1">Atas Nama: <strong class="text-white">ANDI ZATNIKA</strong></p>
        <p class="text-sm text-gray-300 mb-4">Jumlah Transfer: <strong class="text-white dynamic-price">${formattedPriceStr}</strong></p>
        <button type="button" class="btn-copy text-sm bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition" data-copy="1820004264586">
          Salin Nomor Rekening
        </button>
      `;
    } else if (orderData.bank === 'bca') {
      rekCard.innerHTML = `
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="font-heading text-lg font-bold text-white mb-2">🏦 Bank BCA</p>
            <p class="text-sm text-gray-400 mb-0.5">No. Rekening:</p>
            <p class="font-mono text-2xl font-bold tracking-widest text-emerald" id="rek-num">0383175779</p>
          </div>
        </div>
        <p class="text-sm text-gray-300 mb-1">Atas Nama: <strong class="text-white">HANA SUNDARI PUTRI</strong></p>
        <p class="text-sm text-gray-300 mb-4">Jumlah Transfer: <strong class="text-white dynamic-price">${formattedPriceStr}</strong></p>
        <button type="button" class="btn-copy text-sm bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition" data-copy="0383175779">
          Salin Nomor Rekening
        </button>
      `;
    }

    document.querySelectorAll('.btn-copy').forEach(btn => {
      btn.addEventListener('click', function() {
        const num = this.getAttribute('data-copy');
        navigator.clipboard.writeText(num!);
        const originalText = this.innerHTML;
        this.innerHTML = `✓ Tersalin!`;
        this.classList.add('text-emerald');
        setTimeout(() => {
          this.innerHTML = originalText;
          this.classList.remove('text-emerald');
        }, 2000);
      });
    });

    showStep(1);
    
  } catch(err: any) {
    alert("Error: " + err.message);
    btnNext.disabled = false;
    btnNext.innerHTML = 'Lanjut ke Pembayaran';
  }
});

// File Upload Logic
const dropArea = document.getElementById('drop-area') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const uploadPrompt = document.getElementById('upload-prompt') as HTMLElement;
const uploadPreview = document.getElementById('upload-preview') as HTMLElement;
const previewImage = document.getElementById('preview-image') as HTMLImageElement;
const fileName = document.getElementById('file-name') as HTMLElement;
const fileSize = document.getElementById('file-size') as HTMLElement;
const removeBtn = document.getElementById('remove-file') as HTMLButtonElement;
const btnConfirm = document.getElementById('btn-confirm') as HTMLButtonElement;

let uploadedImageBase64: string | null = null;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
});
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
});
['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
});

dropArea.addEventListener('drop', (e) => {
  let dt = e.dataTransfer;
  let files = dt!.files;
  handleFiles(files);
});

fileInput.addEventListener('change', function() {
  handleFiles(this.files!);
});

function handleFiles(files: FileList) {
  if(files.length === 0) return;
  const file = files[0];
  
  if(file.size > 5 * 1024 * 1024) {
    alert("Ukuran file maksimal 5MB");
    resetUpload();
    return;
  }
  if(!file.type.match('image.*')) {
    alert("Hanya format gambar yang diperbolehkan");
    resetUpload();
    return;
  }

  let reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = function() {
    uploadedImageBase64 = reader.result as string;
    previewImage.src = uploadedImageBase64;
    fileName.textContent = file.name;
    const mb = file.size / (1024*1024);
    if(mb >= 1) fileSize.textContent = mb.toFixed(2) + ' MB';
    else fileSize.textContent = (file.size / 1024).toFixed(0) + ' KB';

    uploadPrompt.classList.add('hidden');
    uploadPreview.classList.remove('hidden');
    uploadPreview.classList.add('flex');
    fileInput.classList.add('hidden');

    btnConfirm.disabled = false;
    btnConfirm.className = "w-full bg-emerald hover:bg-green-500 text-white font-heading font-bold text-lg py-4 rounded-full transition flex items-center justify-center gap-2 shadow-[0_5px_15px_rgba(16,185,129,0.3)] mt-4";
  }
}

function resetUpload() {
  fileInput.value = '';
  previewImage.src = '';
  uploadedImageBase64 = null;
  uploadPrompt.classList.remove('hidden');
  uploadPreview.classList.add('hidden');
  uploadPreview.classList.remove('flex');
  fileInput.classList.remove('hidden');

  btnConfirm.disabled = true;
  btnConfirm.className = "w-full bg-gray-500 text-gray-300 font-heading font-bold text-lg py-4 rounded-full transition flex items-center justify-center gap-2 cursor-not-allowed mt-4";
}

removeBtn.addEventListener('click', (e) => {
  e.stopPropagation(); e.preventDefault(); resetUpload();
});

// Final Submit
const btnConfirmText = document.getElementById('btn-confirm-text') as HTMLElement;
const btnSpinner = document.getElementById('btn-spinner') as HTMLElement;
const verifyMessage = document.getElementById('verify-message') as HTMLElement;

btnConfirm.addEventListener('click', async () => {
  btnConfirm.disabled = true;
  btnConfirmText.classList.add('hidden');
  btnSpinner.classList.remove('hidden');
  verifyMessage.classList.remove('hidden');
  
  try {
    // Call Gemini Verification API
    const res = await fetch("/api/verify-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: uploadedImageBase64,
        expectedPrice: uniquePrice.toLocaleString('id-ID'),
        expectedBank: orderData.bank.toUpperCase()
      })
    });
    
    if (!res.ok) throw new Error("Terjadi kesalahan sistem, silakan coba lagi atau hubungi CS.");
    const checkResult = await res.json();
    
    if (!checkResult.isValid) {
      alert("⚠️ Verifikasi Gagal:\n" + checkResult.reason + "\n\nPastikan bukti transfer jelas, bukan editan, dan nominal sesuai " + formattedPriceStr);
      btnConfirm.disabled = false;
      btnConfirmText.classList.remove('hidden');
      btnSpinner.classList.add('hidden');
      verifyMessage.classList.add('hidden');
      return; // Stop right here! Don't proceed.
    }

    // Since it's valid, update user doc to verified and set expiresAt 1 year from now
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await setDoc(doc(db, "users", orderData.uid), { 
      isVerified: true,
      expiresAt: expiresAt
    }, { merge: true });

    document.getElementById('success-name')!.textContent = orderData.name;
    document.getElementById('success-email')!.textContent = orderData.email;

    // Send to Google Sheets
    const sheetData = {
      nama: orderData.name,
      email: orderData.email,
      whatsapp: orderData.wa,
      bank: orderData.bank.toUpperCase(),
      timestamp: new Date().toISOString()
    };
    fetch('https://script.google.com/macros/s/AKfycbxD29eqPOOhXWBlsDQ5CXI1rMVYPUBpskr8T0Ak6B7MrXptHuuQpD5VLlR1ov_z4zzhTw/exec', {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sheetData)
    }).catch(err => console.error(err));

    // Send WA
    const waNumber = "6283892802483"; 
    const tanggalFormat = new Date().toLocaleString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const waMsg = `🔔 *ORDER BARU & TERVERIFIKASI AI*
👤 Nama: ${orderData.name}
📧 Email: ${orderData.email}  
📱 WhatsApp: ${orderData.wa}
🏦 Bank Transfer: ${orderData.bank.toUpperCase()}
💰 Jumlah: ${formattedPriceStr}
🕐 Waktu: ${tanggalFormat}`;
    const encodedMsg = encodeURIComponent(waMsg);
    const waUrl = `https://wa.me/${waNumber}?text=${encodedMsg}`;
    (document.getElementById('btn-wa') as HTMLAnchorElement).href = waUrl;
    
    // Facebook Pixel Purchase Event
    if (typeof (window as any).fbq === 'function') {
      (window as any).fbq('track', 'Purchase', { currency: 'IDR', value: uniquePrice });
    }
    
    window.open(waUrl, '_blank');

    showStep(2);
  } catch (error: any) {
    alert(error.message);
    btnConfirm.disabled = false;
    btnConfirmText.classList.remove('hidden');
    btnSpinner.classList.add('hidden');
    verifyMessage.classList.add('hidden');
  }
});
