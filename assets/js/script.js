document.addEventListener('DOMContentLoaded', () => {
  const clientCodeInput = document.getElementById('client-code');
  const capturePhotoButton = document.getElementById('capture-photo');
  const restartProcessButton = document.getElementById('restart-process');
  const photoPreview = document.getElementById('photo-preview');
  const info = document.getElementById('info');
  const shareButton = document.getElementById('share-data');
  const mapContainer = document.getElementById('map');
  const mapTitle = document.getElementById('map-title');
  const phoneInput = document.getElementById('phone');
  const emailInput = document.getElementById('email');

  let clientCode = '';
  let photoBlob = null;
  let locationData = {};
  let map = null;

  // Validação do Código do Cliente
  const validateClientCode = (code) => /^C\d{6,7}$/.test(code);
  const sanitizeClientCode = (code) => code.toUpperCase().replace(/[^C0-9]/g, '');

  // Validação do telefone
  const validatePhone = (phone) => /^\(\d{2}\)\s?\d{5}-\d{4}$/.test(phone);
  const sanitizePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  // Validação de e-mail
  const validateEmail = (email) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email);

  // Função para capturar a foto
  const capturePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      const canvas = document.createElement('canvas');
      const capture = new Promise((resolve) => {
        video.addEventListener('loadedmetadata', () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          stream.getTracks().forEach(track => track.stop());
          resolve(canvas.toDataURL('image/jpeg'));
        });
      });

      const photoDataURL = await capture;
      photoBlob = await (await fetch(photoDataURL)).blob();
      photoPreview.src = photoDataURL;
      photoPreview.style.display = 'block';
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      alert('Erro ao acessar a câmera!\n\nPermita que o APP acesse a câmera do dispositivo!');
    }
  };

  const getUserLocation = () =>
    new Promise((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject)
    );

  // Capturar foto e localização
  capturePhotoButton.addEventListener('click', async () => {
    clientCode = sanitizeClientCode(clientCodeInput.value);
    const phone = sanitizePhone(phoneInput.value);
    const email = emailInput.value;

    if (!validateClientCode(clientCode)) {
      alert('Código Cliente inválido!\n\nExemplo: C000001');
      return;
    }

    if (phone && !validatePhone(phone)) {
      alert('Telefone inválido!\n\nExemplo: (85) 91234-4321');
      return;
    }

    if (email && !validateEmail(email)) {
      alert('E-mail inválido!\n\nExemplo: exemplo@dominio.com');
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
        <strong>Tel.:</strong> ${phone || 'Não fornecido'}<br>
        <strong>E-mail:</strong> ${email || 'Não fornecido'}<br>
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
          attribution: '© OpenStreetMap contributors',
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
      console.error('Erro ao acessar a localização:', error);
      alert('Erro ao acessar a localização!\n\nVerifique se o GPS do dispositivo está ativo!');
    }
  });

  // Reiniciar
  restartProcessButton.addEventListener('click', () => {
    location.reload();
  });

  // Compartilhar

 // Compartilhar (abrir Outlook e copiar dados)
shareButton.addEventListener('click', async () => {
  const textData = 
`Código Cliente: ${clientCode}
Tel.: ${phoneInput.value}
E-mail: ${emailInput.value}
Latitude: ${locationData.latitude.toFixed(6)}
Longitude: ${locationData.longitude.toFixed(6)}`;

  try {
    // 1️⃣ Copia os dados para a área de transferência
    await navigator.clipboard.writeText(textData);

    // 2️⃣ Mostra mensagem de confirmação
    alert('✅ Informações copiadas para a área de transferência!\n\nO Outlook será aberto. Basta colar as informações no corpo do e-mail.');

    // 3️⃣ Abre o Outlook (ou app de e-mail padrão)
    const destinatario = "idepsocial@gmail.com"; // pode alterar
    const assunto = `Cadastro de Cliente - ${clientCode}`;
    const mailtoLink = `mailto:${destinatario}?subject=${encodeURIComponent(assunto)}`;

    window.location.href = mailtoLink;
    
  } catch (error) {
    console.error('Erro ao copiar os dados:', error);
    alert('❌ Não foi possível copiar as informações. Verifique as permissões do navegador.');
  }
});


  // Sanitize inputs em tempo real
  clientCodeInput.addEventListener('input', () => {
    clientCodeInput.value = sanitizeClientCode(clientCodeInput.value);
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = sanitizePhone(phoneInput.value);
  });
});