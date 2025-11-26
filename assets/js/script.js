document.addEventListener('DOMContentLoaded', () => {
  const clientCodeInput = document.getElementById('client-code');
  const capturePhotoButton = document.getElementById('capture-photo');
  const restartProcessButton = document.getElementById('restart-process');
  const photoPreview = document.getElementById('photo-preview');
  const info = document.getElementById('info');
  const shareButton = document.getElementById('share-data');
  const mapTitle = document.getElementById('map-title');
  const motivoSelect = document.getElementById('motivo');
  const outrosInput = document.getElementById('outros');

  const razaoInput = document.getElementById('razao-social');
  const vendedorInput = document.getElementById('vendedor');

  let clientCode = '';
  let photoBlob = null;
  let locationData = {};
  let map = null;
  let baseClientes = {};

  // Mostrar/esconder campo "Outro"
  motivoSelect.addEventListener('change', () => {
    const outro = motivoSelect.value === 'Outro';
    outrosInput.style.display = outro ? 'block' : 'none';
    outrosInput.required = outro;
    if (!outro) outrosInput.value = '';
  });

  // Validação do Código do Cliente
  const validateClientCode = (code) => /^C\d{6,7}$/.test(code);
  const sanitizeClientCode = (code) => code.toUpperCase().replace(/[^C0-9]/g, '');

  // Capturar foto
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      stream.getTracks().forEach(track => track.stop());

      const photoDataURL = canvas.toDataURL('image/jpeg');
      photoBlob = await (await fetch(photoDataURL)).blob();
      photoPreview.src = photoDataURL;
      photoPreview.style.display = 'block';
    } catch (error) {
      alert('Erro ao acessar a câmera! Permita acesso à câmera.');
    }
  };

  const getUserLocation = () =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );

  // Processar captura
  capturePhotoButton.addEventListener('click', async () => {
    clientCode = sanitizeClientCode(clientCodeInput.value);

    if (!validateClientCode(clientCode)) {
      alert('Código Cliente inválido!\n\nExemplo: C000001');
      return;
    }

    try {
      await capturePhoto();
      const position = await getUserLocation();

      locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      info.innerHTML = `
        <strong>Código Cliente:</strong> ${clientCode}<br>
        <strong>Razão Social:</strong> ${razaoInput.value}<br>
        <strong>Vendedor:</strong> ${vendedorInput.value}<br>
        <strong>Motivo:</strong> ${motivoSelect.value === 'Outro' ? `Outro: ${outrosInput.value}` : motivoSelect.value}<br>
        <strong>Latitude:</strong> ${locationData.latitude.toFixed(6)}<br>
        <strong>Longitude:</strong> ${locationData.longitude.toFixed(6)}<br>
      `;

      mapTitle.style.display = 'block';
      shareButton.style.display = 'block';
      restartProcessButton.style.display = 'block';

      if (!map) {
        map = L.map('map').setView([locationData.latitude, locationData.longitude], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);
      } else {
        map.setView([locationData.latitude, locationData.longitude], 15);
        map.eachLayer(layer => {
          if (layer instanceof L.Marker) map.removeLayer(layer);
        });
      }

      L.marker([locationData.latitude, locationData.longitude])
        .addTo(map)
        .bindPopup(`Você está aqui!<br>Lat: ${locationData.latitude.toFixed(6)}<br>Lng: ${locationData.longitude.toFixed(6)}`)
        .openPopup();

    } catch (error) {
      alert('Erro ao acessar a localização! Ative o GPS.');
    }
  });

  // Reiniciar
  restartProcessButton.addEventListener('click', () => location.reload());

  // Compartilhar
  shareButton.addEventListener('click', async () => {
    const textData = `
Código Cliente: ${clientCode}
Razão Social: ${razaoInput.value}
Vendedor: ${vendedorInput.value}
Motivo: ${motivoSelect.value === 'Outro' ? `Outro: ${outrosInput.value}` : motivoSelect.value}
Latitude: ${locationData.latitude.toFixed(6)}
Longitude: ${locationData.longitude.toFixed(6)}
`.trim();

    try {
      await navigator.clipboard.writeText(textData);
    } catch (e) {}

    const file = new File([photoBlob], `${clientCode}.jpg`, { type: 'image/jpeg' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Visita Registrada',
        text: textData,
        files: [file]
      });
    } else {
      await navigator.share({
        title: 'Visita Registrada',
        text: textData
      });
    }
  });

  // Sanitização
  clientCodeInput.addEventListener('input', () => {
    clientCodeInput.value = sanitizeClientCode(clientCodeInput.value);
  });

  // Carregar banco de clientes
  async function carregarClientes() {
    const resposta = await fetch('assets/data/clientes.txt');
    const texto = await resposta.text();

    const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);

    linhas.slice(1).forEach(linha => {
      const [codigo, razao, vendedor] = linha.split(';').map(v => v.trim());
      baseClientes[codigo.toUpperCase()] = { razao, vendedor };
    });
  }

  carregarClientes();

  // Autocomplete cliente
  clientCodeInput.addEventListener('input', () => {
    const codigo = clientCodeInput.value.toUpperCase();

    if (baseClientes[codigo]) {
      razaoInput.value = baseClientes[codigo].razao;
      vendedorInput.value = baseClientes[codigo].vendedor;
    } else {
      razaoInput.value = '';
      vendedorInput.value = '';
    }
  });

});
