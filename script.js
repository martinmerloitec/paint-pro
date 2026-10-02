const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });

// Estado de la aplicación
let currentTool = 'brush';
let currentEngine = 'hard';
let currentColor = '#3daee9';
let brushSize = 10;
let brushOpacity = 1.0;

let isDrawing = false;
let startX = 0;
let startY = 0;
let snapshot = null;

// Sistema de Historial (Undo/Redo)
let history = [];
let historyStep = -1;

// Inicializar lienzos con fondo blanco puro o gris Krita
function initStudio() {
    bgCtx.fillStyle = '#ffffff';
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    // Limpiar capa de dibujo principal transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
}

function saveState() {
    // Combinamos temporalmente fondo y dibujo para el historial de etapas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(bgCanvas, 0, 0);
    tCtx.drawImage(canvas, 0, 0);

    historyStep++;
    if (historyStep < history.length) {
        history.length = historyStep;
    }
    history.push(tempCanvas.toDataURL());
}

// Selector de Herramientas (Toolbox)
document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTool = btn.dataset.tool;
        
        if (currentTool === 'eyedropper') {
            canvas.style.cursor = 'copy';
        } else if (currentTool === 'eraser') {
            canvas.style.cursor = 'grab';
        } else {
            canvas.style.cursor = 'crosshair';
        }
    });
});

// Motores de Pincel Avanzados
document.querySelectorAll('.engine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.engine-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentEngine = btn.dataset.engine;
    });
});

// Controles de Tamaño y Opacidad
const sizeSlider = document.getElementById('brushSize');
const sizeVal = document.getElementById('sizeVal');
sizeSlider.addEventListener('input', (e) => {
    brushSize = e.target.value;
    sizeVal.textContent = brushSize + 'px';
});

const opacitySlider = document.getElementById('brushOpacity');
const opacityVal = document.getElementById('opacityVal');
opacitySlider.addEventListener('input', (e) => {
    brushOpacity = e.target.value / 100;
    opacityVal.textContent = e.target.value + '%';
});

// Selector de Color
const colorPicker = document.getElementById('colorPicker');
const colorPreview = document.getElementById('colorPreview');

colorPicker.addEventListener('input', (e) => {
    currentColor = e.target.value;
    colorPreview.style.background = currentColor;
});

document.querySelectorAll('.swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
        currentColor = swatch.dataset.color;
        colorPicker.value = currentColor;
        colorPreview.style.background = currentColor;
    });
});

// Eventos del Mouse en el Lienzo
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;

    if (currentTool === 'fill') {
        floodFill(Math.floor(startX), Math.floor(startY), hexToRgb(currentColor));
        saveState();
        return;
    }

    if (currentTool === 'eyedropper') {
        pickColor(Math.floor(startX), Math.floor(startY));
        return;
    }

    isDrawing = true;
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    document.getElementById('coords').textContent = `X: ${Math.floor(x)}, Y: ${Math.floor(y)}`;

    if (!isDrawing) return;

    ctx.globalAlpha = brushOpacity;

    if (currentTool === 'brush' || currentTool === 'eraser') {
        drawEngineStroke(x, y);
    } else if (currentTool === 'line') {
        ctx.putImageData(snapshot, 0, 0);
        drawLine(startX, startY, x, y);
    } else if (currentTool === 'rect') {
        ctx.putImageData(snapshot, 0, 0);
        drawRect(startX, startY, x, y);
    } else if (currentTool === 'circle') {
        ctx.putImageData(snapshot, 0, 0);
        drawCircle(startX, startY, x, y);
    }
});

window.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        saveState();
    }
});

// Lógica de Motores de Pincel Avanzados estilo Krita
function drawEngineStroke(x, y) {
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.shadowBlur = 0;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = currentColor;

        if (currentEngine === 'hard') {
            ctx.shadowBlur = 0;
        } else if (currentEngine === 'soft') {
            ctx.shadowColor = currentColor;
            ctx.shadowBlur = brushSize * 0.8;
        } else if (currentEngine === 'ink') {
            ctx.shadowBlur = 0;
            // Variación dinámica basada en la velocidad simulada
            ctx.lineWidth = Math.max(2, brushSize * (Math.random() * 0.4 + 0.8));
        } else if (currentEngine === 'airbrush') {
            ctx.shadowBlur = 0;
            ctx.fillStyle = currentColor;
            for (let i = 0; i < brushSize * 1.5; i++) {
                let angle = Math.random() * Math.PI * 2;
                let radius = Math.random() * brushSize;
                ctx.fillRect(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 1.5, 1.5);
            }
            return;
        } else if (currentEngine === 'marker') {
            ctx.shadowBlur = 0;
            ctx.lineCap = 'square';
            ctx.lineWidth = brushSize * 1.5;
            ctx.globalAlpha = brushOpacity * 0.3; // Efecto marcador transparente que acumula tinta
        } else if (currentEngine === 'texture') {
            ctx.shadowBlur = 0;
            ctx.fillStyle = currentColor;
            for (let i = 0; i < brushSize; i++) {
                let ox = (Math.random() - 0.5) * brushSize;
                let oy = (Math.random() - 0.5) * brushSize;
                if (ox * ox + oy * oy < (brushSize/2)**2) {
                    ctx.fillRect(x + ox, y + oy, 2, 2);
                }
            }
            return;
        } else if (currentEngine === 'neon') {
            ctx.shadowColor = currentColor;
            ctx.shadowBlur = brushSize * 1.8;
            ctx.strokeStyle = '#ffffff'; // Núcleo blanco brillante de neón
        }
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function drawLine(x1, y1, x2, y2) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
    ctx.lineCap = 'round';
    ctx.shadowBlur = (currentEngine === 'neon') ? brushSize : 0;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawRect(x1, y1, x2, y2) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
    ctx.shadowBlur = (currentEngine === 'neon') ? brushSize : 0;
    ctx.shadowColor = currentColor;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
}

function drawCircle(x1, y1, x2, y2) {
    ctx.globalCompositeOperation = 'source-over';
    let radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
    ctx.shadowBlur = (currentEngine === 'neon') ? brushSize : 0;
    ctx.shadowColor = currentColor;
    ctx.beginPath();
    ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
    ctx.stroke();
}

// Cuentagotas (Eyedropper)
function pickColor(x, y) {
    // Tomar datos combinados del fondo y del canvas de dibujo
    const pData = ctx.getImageData(x, y, 1, 1).data;
    const bData = bgCtx.getImageData(x, y, 1, 1).data;
    
    let r = pData[3] > 0 ? pData[0] : bData[0];
    let g = pData[3] > 0 ? pData[1] : bData[1];
    let b = pData[3] > 0 ? pData[2] : bData[2];

    let hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    currentColor = hex;
    colorPicker.value = hex;
    colorPreview.style.background = hex;
    
    // Regresar automáticamente a la herramienta pincel
    document.querySelector('[data-tool="brush"]').click();
}

// Cubo de Relleno (Flood Fill)
function hexToRgb(hex) {
    let bigint = parseInt(hex.replace('#', ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, 255];
}

function floodFill(startX, startY, fillColor) {
    ctx.globalCompositeOperation = 'source-over';
    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let pixels = imgData.data;
    let targetColor = [pixels[(startY * canvas.width + startX) * 4], pixels[(startY * canvas.width + startX) * 4 + 1], pixels[(startY * canvas.width + startX) * 4 + 2], pixels[(startY * canvas.width + startX) * 4 + 3]];

    if (targetColor[0] === fillColor[0] && targetColor[1] === fillColor[1] && targetColor[2] === fillColor[2]) return;

    let queue = [[startX, startY]];
    let width = canvas.width;
    let height = canvas.height;

    while (queue.length > 0) {
        let [x, y] = queue.pop();
        let idx = (y * width + x) * 4;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        if (pixels[idx] === targetColor[0] && pixels[idx+1] === targetColor[1] && pixels[idx+2] === targetColor[2] && pixels[idx+3] === targetColor[3]) {
            pixels[idx] = fillColor[0];
            pixels[idx+1] = fillColor[1];
            pixels[idx+2] = fillColor[2];
            pixels[idx+3] = fillColor[3];

            queue.push([x + 1, y]);
            queue.push([x - 1, y]);
            queue.push([x, y + 1]);
            queue.push([x, y - 1]);
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// Botones de Acción (Undo, Redo, Limpiar, Guardar)
document.getElementById('clearBtn').addEventListener('click', () => {
    initStudio();
});

document.getElementById('undoBtn').addEventListener('click', () => {
    if (historyStep > 0) {
        historyStep--;
        let img = new Image();
        img.src = history[historyStep];
        img.onload = () => {
            bgCtx.fillStyle = '#ffffff';
            bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
            bgCtx.drawImage(img, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
});

document.getElementById('redoBtn').addEventListener('click', () => {
    if (historyStep < history.length - 1) {
        historyStep++;
        let img = new Image();
        img.src = history[historyStep];
        img.onload = () => {
            bgCtx.fillStyle = '#ffffff';
            bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
            bgCtx.drawImage(img, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
});

document.getElementById('saveBtn').addEventListener('click', () => {
    // Fusionar fondo y dibujo en un lienzo temporal para exportar PNG limpio
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const eCtx = exportCanvas.getContext('2d');
    eCtx.drawImage(bgCanvas, 0, 0);
    eCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'krita-studio-art.png';
    link.href = exportCanvas.toDataURL();
    link.dispatchEvent(new MouseEvent('click'));
});

// Iniciar app al cargar
initStudio();