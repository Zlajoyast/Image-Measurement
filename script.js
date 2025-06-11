const dropArea = document.getElementById('drop-area');
const preview = document.getElementById('preview');
const imageContainer = document.getElementById('image-container');
const distanceLabel = document.getElementById('distance-label');

const pdfsettings = document.getElementById("pdf-settings")

const btnmeasureTool = document.getElementById("measure-tool");
const btnpanTool = document.getElementById("pan-tool");
const btnclear = document.getElementById("clear");

const btnpreviouspage = document.getElementById("previous-page");
const btnnextpage = document.getElementById("next-page");
const btncreateScale = document.getElementById("create-scale");

const initialScale = document.getElementById("initial-scale");
const finalScale = document.getElementById("final-scale");
const pageindex = document.getElementById("pageindex");
const pdfScale = document.getElementById("pdf-scale");
const rotateLeft = document.getElementById("rotate-left");
const rotateRight = document.getElementById("rotate-right");

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

var pdf
var pdfcache = {}
let angle = 0;
let scale = 1;
let markers = [];
let ismeasure = true;
let createScale = true;

let isPanning = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

let timeMarkers;

const chooseMeasure = () => {
    btnmeasureTool.style["background-color"] = "green";
    btnpanTool.style["background-color"] = "";
    ismeasure = true;
    clearTimeout(timeMarkers)
    clearMarkers();
}
const choosePan = () => {
    btnmeasureTool.style["background-color"] = "";
    btnpanTool.style["background-color"] = "green";
    ismeasure = false;
}
const chooseClear = () => {
    initialScale.value = "";
    finalScale.value = "";
    createScale = true;
    btncreateScale.style["background-color"] = "green";
}
document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "q") {
        chooseMeasure()
    } else if (event.key.toLowerCase() === "r") {
        chooseClear();
    } else if (event.key.toLowerCase() === "e") {
        choosePan();
    }
})
btnmeasureTool.onclick = () => {
    chooseMeasure()
}
btnpanTool.onclick = () => {
    choosePan();
}
btnclear.onclick = () => {
    chooseClear();
}
btncreateScale.onclick = () => {
    if (createScale) {
        btncreateScale.style["background-color"] = "";
        createScale = false;
    } else {
        btncreateScale.style["background-color"] = "green";
        createScale = true;
    }

}
rotateLeft.onclick = ()=>{
    angle+=90
    document.querySelector(":root").style.setProperty("--rotationimage", angle+"deg")
}
rotateRight.onclick = ()=>{
    angle-=90;
    document.querySelector(":root").style.setProperty("--rotationimage", angle+"deg")
}
btnpreviouspage.onclick = () => {
    pageindex.value--;
    LoadPagePDF(pageindex.value,pdfScale.value)
}
btnnextpage.onclick = () => {
    pageindex.value++;
    LoadPagePDF(pageindex.value,pdfScale.value)
}
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
    dropArea.addEventListener(event, e => {
        e.preventDefault();
        e.stopPropagation();
    });
});

['dragenter', 'dragover'].forEach(() => dropArea.classList.add('hover'));
['dragleave', 'drop'].forEach(() => dropArea.classList.remove('hover'));

dropArea.addEventListener('drop', e => {
    const file = e.dataTransfer.files[0];
    if (file) showImage(file);
});

// 👇 Ctrl+V (colar imagem)
document.addEventListener('paste', e => {
    const items = e.clipboardData.items;
    for (const item of items) {
        if (item.type.startsWith('image/') || item.type.includes("pdf")) {
            const file = item.getAsFile();
            if (file) {
                showImage(file);
                break;
            }
        }
    }
});

async function LoadPagePDF(index, scale = 2) {
    if (pdf != undefined) {
        if (pdfcache[index] != undefined && pdfcache[index].scale == scale) {
            console.log("Carregado do cache")
            preview.src = pdfcache[index].data
        } else {
            const page = await pdf.getPage(parseInt(index));
            const viewport = page.getViewport({ scale: scale });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;
            const dataURL = canvas.toDataURL();
            pdfcache[index] = {
                data:dataURL,
                scale:scale
            }
            preview.src = dataURL;
        }

    }

}
function showImage(file) {
    if (!file) {
        alert('Selecione uma imagem válida.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async e => {
        const result = e.target.result
        const typedarray = new Uint8Array(result);
        if (result.includes("application/pdf")) {
            pdfcache = {};
            pdf = await pdfjsLib.getDocument({ data: atob(result.split(",")[1]) }).promise;
            LoadPagePDF(1)
            pdfsettings.classList.remove("hidden")
        } else {
            preview.src = result;
            pdfsettings.classList.add("hidden")
        }
        preview.hidden = false;
        dropArea.querySelector('p').style.display = 'none';
        scale = 1;
        imageContainer.style.transform = `scale(${scale})`;
        clearMarkers();


    };
    reader.readAsDataURL(file);
}

// Zoom com scroll
dropArea.addEventListener('wheel', e => {
    e.preventDefault();

    const rect = dropArea.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const offsetX = (mouseX - translateX) / scale;
    const offsetY = (mouseY - translateY) / scale;

    const delta = Math.sign(e.deltaY) * -0.1;
    const newScale = Math.min(Math.max(0.1, scale + delta), 10);

    translateX = mouseX - offsetX * newScale;
    translateY = mouseY - offsetY * newScale;

    scale = newScale;
    updateTransform();
});



// Medição
imageContainer.addEventListener('click', e => {
    if (!ismeasure) {
        e.preventDefault();
        return;
    }
    const rect = imageContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const marker = document.createElement('div');
    marker.className = 'marker';
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    marker.dataset.x = x;
    marker.dataset.y = y;
    imageContainer.appendChild(marker);
    markers.push(marker);

    if (markers.length === 2) {
        const [m1, m2] = markers;
        const dx = m2.dataset.x - m1.dataset.x;
        const dy = m2.dataset.y - m1.dataset.y;
        const distance = Math.sqrt(dx * dx + dy * dy).toFixed(2);

        const midX = (parseFloat(m1.dataset.x) + parseFloat(m2.dataset.x)) / 2;
        const midY = (parseFloat(m1.dataset.y) + parseFloat(m2.dataset.y)) / 2;

        const scale = (initialScale.value / finalScale.value) || 1;

        distanceLabel.textContent = `${(distance / scale).toFixed(2)}`;
        distanceLabel.style.left = `${midX}px`;
        distanceLabel.style.top = `${midY}px`;
        distanceLabel.style.display = 'block';

        if (createScale == true) {
            initialScale.value = distance;
            btncreateScale.style["background-color"] = "";
            createScale = false;
        }
        timeMarkers = setTimeout(clearMarkers, 3000);
    }

});

function clearMarkers() {
    markers.forEach(m => m.remove());
    markers = [];
    distanceLabel.style.display = 'none';
}

imageContainer.addEventListener('mousedown', e => {
    if (ismeasure) {
        e.preventDefault();
        return;
    }
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    imageContainer.style.cursor = 'grabbing';
});

document.addEventListener('mouseup', () => {
    isPanning = false;
    imageContainer.style.cursor = 'crosshair';
});

document.addEventListener('mousemove', e => {
    if (!isPanning) return;

    translateX = e.clientX - startX;
    translateY = e.clientY - startY;

    updateTransform();
});

function updateTransform() {
    imageContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}