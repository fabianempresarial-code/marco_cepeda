// Configuración de los recursos de marcos locales
const LISTA_DE_MARCOS = [
    { id: "marco1", nombre: "Diseño 1 Neon", archivo: "marco1.webm" },
    { id: "marco2", nombre: "Diseño 2 Fuego", archivo: "marco2.webm" },
    { id: "marco3", nombre: "Diseño 3 Cyber", archivo: "marco3.webm" }
];

// Elementos de la interfaz y Canvas
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('frameVideo');
const fileUpload = document.getElementById('file-upload');
const galleryContainer = document.getElementById('gallery-container');

const zoomPhotoRange = document.getElementById('zoom-photo-range');
const zoomPhotoValue = document.getElementById('zoom-photo-value');
const zoomFrameRange = document.getElementById('zoom-frame-range');
const zoomFrameValue = document.getElementById('zoom-frame-value');

const zoomPhotoCont = document.getElementById('zoom-photo-container');
const zoomFrameCont = document.getElementById('zoom-frame-container');
const container = document.getElementById('canvas-container');
const btnCamera = document.getElementById('btn-camera');
const btnGenVideo = document.getElementById('btn-generate-video');
const statusLoading = document.getElementById('status-loading');
const resultBox = document.getElementById('result-box');
const btnDownload = document.getElementById('btn-download');
const btnShare = document.getElementById('btn-share');
const resultTitle = document.getElementById('result-title');

const modePhotoBtn = document.getElementById('mode-photo');
const modeFrameBtn = document.getElementById('mode-frame');

// Variables de estado lógicas
let userImg = new Image();
let imgLoaded = false;

let zoomPhoto = 1;
let photoPos = { x: 0, y: 0 };
let photoRenderSize = { w: 0, h: 0 };

let zoomFrame = 1;
let framePos = { x: 0, y: 0 };
let frameRenderSize = { w: 0, h: 0 };

let currentMode = 'photo'; 
let activosPointers = [];
let centroInicialDrag = { x: 0, y: 0 };
let recordedChunks = [];

// Inicializador dinámico de galería de marcos
function inicializarGaleria() {
    galleryContainer.innerHTML = "";
    LISTA_DE_MARCOS.forEach((marco, index) => {
        const boton = document.createElement('button');
        boton.innerText = marco.nombre;
        boton.className = `p-2 text-[11px] font-bold rounded-lg border transition ${
            index === 0 
            ? 'bg-[#F2B705] border-[#F2B705] text-[#0D214F] font-black' 
            : 'bg-[#081430] border-slate-700 text-slate-400 hover:text-slate-200'
        }`;
        
        boton.addEventListener('click', () => {
            Array.from(galleryContainer.children).forEach(b => {
                b.className = "p-2 text-[11px] font-bold rounded-lg border bg-[#081430] border-slate-700 text-slate-400 hover:text-slate-200";
            });
            boton.className = "p-2 text-[11px] font-black rounded-lg border bg-[#F2B705] border-[#F2B705] text-[#0D214F]";
            
            video.removeAttribute('src');
            video.load();
            video.setAttribute('crossOrigin', 'anonymous');
            video.src = marco.archivo;
            video.load();
        });
        galleryContainer.appendChild(boton);
    });
}
inicializarGaleria();

// Control de relación de aspecto proporcional del Marco (Video)
video.addEventListener('loadedmetadata', () => {
    const canvasRatio = canvas.width / canvas.height;
    const videoRatio = video.videoWidth / video.videoHeight;

    if (videoRatio > canvasRatio) {
        frameRenderSize.h = canvas.height;
        frameRenderSize.w = canvas.height * videoRatio;
    } else {
        frameRenderSize.w = canvas.width;
        frameRenderSize.h = canvas.width / videoRatio;
    }
    video.play().catch(() => {});
});

// Control de relación de aspecto proporcional de la Foto (Usuario)
fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            userImg = new Image();
            userImg.crossOrigin = "anonymous"; 
            userImg.onload = () => { 
                imgLoaded = true; 
                photoPos = { x: 0, y: 0 }; 
                zoomPhoto = 1; 
                
                const imgRatio = userImg.width / userImg.height;
                const canvasRatio = canvas.width / canvas.height;

                if (imgRatio > canvasRatio) {
                    photoRenderSize.w = canvas.width;
                    photoRenderSize.h = canvas.width / imgRatio;
                } else {
                    photoRenderSize.h = canvas.height;
                    photoRenderSize.w = canvas.height * imgRatio;
                }

                zoomPhotoRange.value = 1;
                zoomPhotoValue.innerText = "100%";
            };
            userImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Conmutadores de Capas Manuales (Foto vs Marco)
modePhotoBtn.addEventListener('click', () => {
    currentMode = 'photo';
    modePhotoBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition bg-[#F2B705] text-[#0D214F] uppercase tracking-wider";
    modeFrameBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition text-slate-400 hover:text-slate-200 uppercase tracking-wider";
    zoomPhotoCont.classList.remove('opacity-40', 'pointer-events-none');
    zoomFrameCont.classList.add('opacity-40', 'pointer-events-none');
});

modeFrameBtn.addEventListener('click', () => {
    currentMode = 'frame';
    modeFrameBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition bg-[#F2B705] text-[#0D214F] uppercase tracking-wider";
    modePhotoBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition text-slate-400 hover:text-slate-200 uppercase tracking-wider";
    zoomFrameCont.classList.remove('opacity-40', 'pointer-events-none');
    zoomPhotoCont.classList.add('opacity-40', 'pointer-events-none');
});

// Vinculación de Sliders de Control
zoomPhotoRange.addEventListener('input', (e) => {
    zoomPhoto = parseFloat(e.target.value);
    zoomPhotoValue.innerText = Math.round(zoomPhoto * 100) + "%";
});

zoomFrameRange.addEventListener('input', (e) => {
    zoomFrame = parseFloat(e.target.value);
    zoomFrameValue.innerText = Math.round(zoomFrame * 100) + "%";
});

// Sistema unificado de arrastre táctil/mouse con SELECCIÓN DIRECTA POR TOQUE
container.addEventListener('pointerdown', (e) => {
    container.setPointerCapture(e.pointerId);
    activosPointers.push(e);

    if (activosPointers.length === 1) {
        // 1. Calcular posición del toque relativa al contenedor del Canvas
        const rect = container.getBoundingClientRect();
        const touchX = e.clientX - rect.left;
        const touchY = e.clientY - rect.top;

        // 2. Medir la distancia respecto al centro geométrico del área
        const centroX = rect.width / 2;
        const centroY = rect.height / 2;
        const distanciaAlCentro = Math.sqrt(Math.pow(touchX - centroX, 2) + Math.pow(touchY - centroY, 2));

        // 3. Selección automática inteligente por colisión
        // Si tocan cerca del centro (< 65% del radio), se asume que editan la FOTO.
        // Si tocan la periferia o bordes exteriores, se asume que editan el MARCO.
        const radioLimite = Math.min(centroX, centroY) * 0.65;

        if (distanciaAlCentro < radioLimite) {
            currentMode = 'photo';
            modePhotoBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition bg-[#F2B705] text-[#0D214F] uppercase tracking-wider";
            modeFrameBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition text-slate-400 hover:text-slate-200 uppercase tracking-wider";
            zoomPhotoCont.classList.remove('opacity-40', 'pointer-events-none');
            zoomFrameCont.classList.add('opacity-40', 'pointer-events-none');
        } else {
            currentMode = 'frame';
            modeFrameBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition bg-[#F2B705] text-[#0D214F] uppercase tracking-wider";
            modePhotoBtn.className = "py-1.5 px-3 rounded-lg text-[11px] font-bold transition text-slate-400 hover:text-slate-200 uppercase tracking-wider";
            zoomFrameCont.classList.remove('opacity-40', 'pointer-events-none');
            zoomPhotoCont.classList.add('opacity-40', 'pointer-events-none');
        }

        // 4. Configurar el arrastre inmediato sin interrupciones
        const posActual = currentMode === 'photo' ? photoPos : framePos;
        centroInicialDrag = { x: e.clientX - posActual.x, y: e.clientY - posActual.y };
    }
});

container.addEventListener('pointermove', (e) => {
    const index = activosPointers.findIndex(p => p.pointerId === e.pointerId);
    if (index === -1) return;
    activosPointers[index] = e;

    if (activosPointers.length === 1) {
        if (currentMode === 'photo') {
            photoPos = { x: e.clientX - centroInicialDrag.x, y: e.clientY - centroInicialDrag.y };
        } else {
            framePos = { x: e.clientX - centroInicialDrag.x, y: e.clientY - centroInicialDrag.y };
        }
    }
});

const finalizarPuntero = (e) => { activosPointers = activosPointers.filter(p => p.pointerId !== e.pointerId); };
container.addEventListener('pointerup', finalizarPuntero);
container.addEventListener('pointercancel', finalizarPuntero);

// Captura directa desde cámara web/móvil
btnCamera.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 450, height: 450 } });
        const videoTrack = document.createElement('video');
        videoTrack.srcObject = stream;
        videoTrack.play();
        setTimeout(() => {
            ctx.fillStyle = '#081430';
            ctx.fillRect(0, 0, 450, 450);
            ctx.drawImage(videoTrack, 0, 0, 450, 450);
            userImg.src = canvas.toDataURL('image/jpeg');
            userImg.onload = () => { 
                imgLoaded = true; 
                photoRenderSize = { w: canvas.width, h: canvas.height };
            };
            stream.getTracks().forEach(track => track.stop());
        }, 1200);
    } catch (err) { alert("Cámara no disponible o denegada."); }
});

// FUNCIÓN MAESTRA DE ESTAMPADO GRÁFICO (Fuerza fondo opaco sin transparencias)
function procesarEstampaFrame(targetCtx, targetWidth, targetHeight) {
    targetCtx.fillStyle = '#081430';
    targetCtx.fillRect(0, 0, targetWidth, targetHeight);
    
    const scaleX = targetWidth / canvas.width;
    const scaleY = targetHeight / canvas.height;

    if (imgLoaded) {
        targetCtx.save();
        targetCtx.translate(targetWidth / 2 + (photoPos.x * scaleX), targetHeight / 2 + (photoPos.y * scaleY));
        targetCtx.scale(zoomPhoto * scaleX, zoomPhoto * scaleY);
        targetCtx.drawImage(userImg, -photoRenderSize.w / 2, -photoRenderSize.h / 2, photoRenderSize.w, photoRenderSize.h);
        targetCtx.restore();
    }
    
    if (video.readyState >= 2 && frameRenderSize.w > 0) {
        targetCtx.save();
        targetCtx.translate(targetWidth / 2 + (framePos.x * scaleX), targetHeight / 2 + (framePos.y * scaleY));
        targetCtx.scale(zoomFrame * scaleX, zoomFrame * scaleY);
        try {
            targetCtx.drawImage(video, -frameRenderSize.w / 2, -frameRenderSize.h / 2, frameRenderSize.w, frameRenderSize.h);
        } catch(e) { console.log("Prevención activa de excepción CORS."); }
        targetCtx.restore();
    }
}

// Bucle continuo del canvas en pantalla a 60fps
function draw() {
    procesarEstampaFrame(ctx, canvas.width, canvas.height);
    requestAnimationFrame(draw);
}
document.body.addEventListener('click', () => { video.play().catch(()=>{}); }, { once: true });
requestAnimationFrame(draw);


// COMPILADOR EXCLUSIVO DE VIDEO MP4 (Fluido, veloz y altamente compatible)
btnGenVideo.addEventListener('click', () => {
    setLoadingState(true);
    recordedChunks = [];
    
    // Captura un flujo constante y fluido del canvas a 30 fotogramas por segundo
    const stream = canvas.captureStream(30);
    
    // Lista de formatos soportados en orden de preferencia estricto
    let opciones = { mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' };
    
    if (!MediaRecorder.isTypeSupported(opciones.mimeType)) {
        opciones = { mimeType: 'video/webm; codecs=h264' }; 
    }
    if (!MediaRecorder.isTypeSupported(opciones.mimeType)) {
        opciones = { mimeType: 'video/webm; codecs=vp9' };
    }
    if (!MediaRecorder.isTypeSupported(opciones.mimeType)) {
        opciones = { mimeType: 'video/webm' };
    }

    const mediaRecorder = new MediaRecorder(stream, opciones);
    
    mediaRecorder.ondataavailable = (e) => { 
        if (e.data.size > 0) recordedChunks.push(e.data); 
    };
    
    mediaRecorder.onstop = () => {
        // Empaquetamos los fragmentos capturados forzando la salida a formato .mp4
        const blob = new Blob(recordedChunks, { type: 'video/mp4' });
        showResult(URL.createObjectURL(blob), 'mi-foto-animada.mp4');
    };
    
    mediaRecorder.start();
    
    // Grabación ágil de 4 segundos para un bucle perfecto del marco
    setTimeout(() => { 
        mediaRecorder.stop(); 
    }, 4000); 
});

function setLoadingState(loading) {
    if (loading) {
        statusLoading.classList.remove('hidden');
        resultBox.classList.add('hidden'); // Corregido el .classList
        btnGenVideo.disabled = true;
    } else {
        statusLoading.classList.add('hidden');
        btnGenVideo.disabled = false;
    }
}

function showResult(url, filename) {
    setLoadingState(false);
    btnDownload.href = url;
    btnDownload.download = filename;
    resultTitle.innerText = "✓ ¡Video MP4 Listo!";
    resultBox.classList.remove('hidden');
}

btnShare.addEventListener('click', async () => {
    try {
        const response = await fetch(btnDownload.href);
        const blob = await response.blob(); 
        const file = new File([blob], btnDownload.download, { type: "video/mp4" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: '¡Mira mi foto animada!' });
        } else { 
            alert("Tu navegador no soporta compartir archivos directamente. Usa el botón Descargar."); 
        }
    } catch(e) { console.log(e); }
});