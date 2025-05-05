const dropArea = document.getElementById('drop-area');
        const preview = document.getElementById('preview');
        const imageContainer = document.getElementById('image-container');
        const distanceLabel = document.getElementById('distance-label');

        const btnmeasureTool = document.getElementById("measure-tool");
        const btnpanTool = document.getElementById("pan-tool");
        const btnclear = document.getElementById("clear");

        const btncreateScale = document.getElementById("create-scale");

        const initialScale = document.getElementById("initial-scale");
        const finalScale = document.getElementById("final-scale");

        let scale = 1;
        let markers = [];
        let ismeasure = true;
        let createScale = true;

        let isPanning = false;
        let startX = 0;
        let startY = 0;
        let translateX = 0;
        let translateY = 0;

        btnmeasureTool.onclick = () => {
            btnmeasureTool.style.color = "green";
            btnpanTool.style.color = "";
            ismeasure = true;
            clearMarkers();
        }
        btnpanTool.onclick = () => {
            btnmeasureTool.style.color = "";
            btnpanTool.style.color = "green";
            ismeasure = false;
        }
        btnclear.onclick = () => {
            initialScale.value = "";
            finalScale.value = "";
            createScale = true;
            btncreateScale.style.color = "green";
        }
        btncreateScale.onclick = () => {
            if (createScale) {
                btncreateScale.style.color = "";
                createScale = false;
            } else {
                btncreateScale.style.color = "green";
                createScale = true;
            }

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
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        showImage(file);
                        break;
                    }
                }
            }
        });

        function showImage(file) {
            if (!file.type.startsWith('image/')) {
                alert('Selecione uma imagem válida.');
                return;
            }

            const reader = new FileReader();
            reader.onload = e => {
                preview.src = e.target.result;
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
                    btncreateScale.style.color = "";
                    createScale = false;
                }
                setTimeout(clearMarkers, 3000);
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