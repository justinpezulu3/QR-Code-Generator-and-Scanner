// Global variables
let qrcode = null;
let html5QrcodeScanner = null;
let history = JSON.parse(localStorage.getItem('qrHistory') || '[]');

// Input templates for different QR types
const inputTemplates = {
    text: `
        <div class="input-group">
            <label for="textInput">Enter Text</label>
            <textarea id="textInput" rows="4"></textarea>
        </div>
    `,
    url: `
        <div class="input-group">
            <label for="urlInput">Enter URL</label>
            <input type="url" id="urlInput" placeholder="https://example.com">
        </div>
    `,
    wifi: `
        <div class="input-group">
            <label for="ssidInput">Network Name (SSID)</label>
            <input type="text" id="ssidInput">
        </div>
        <div class="input-group">
            <label for="passwordInput">Password</label>
            <input type="password" id="passwordInput">
        </div>
        <div class="input-group">
            <label for="encryptionType">Encryption</label>
            <select id="encryptionType">
                <option value="WPA">WPA/WPA2</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No Password</option>
            </select>
        </div>
    `,
    location: `
        <div class="input-group">
            <label for="latitudeInput">Latitude</label>
            <input type="number" step="any" id="latitudeInput">
        </div>
        <div class="input-group">
            <label for="longitudeInput">Longitude</label>
            <input type="number" step="any" id="longitudeInput">
        </div>
    `,
    contact: `
        <div class="input-group">
            <label for="nameInput">Name</label>
            <input type="text" id="nameInput">
        </div>
        <div class="input-group">
            <label for="phoneInput">Phone</label>
            <input type="tel" id="phoneInput">
        </div>
        <div class="input-group">
            <label for="emailInput">Email</label>
            <input type="email" id="emailInput">
        </div>
    `
};

// Initialize the QR code generator
function initQRCode() {
    if (qrcode) {
        qrcode.clear();
        document.getElementById('qrcode').innerHTML = '';
    }
    qrcode = new QRCode(document.getElementById('qrcode'), {
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

// Generate QR code content based on type
function generateQRContent() {
    const type = document.getElementById('qrType').value;
    let content = '';

    switch (type) {
        case 'wifi':
            const ssid = document.getElementById('ssidInput').value;
            const password = document.getElementById('passwordInput').value;
            const encryption = document.getElementById('encryptionType').value;
            content = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
            break;
        case 'url':
            content = document.getElementById('urlInput').value;
            break;
        case 'location':
            const lat = document.getElementById('latitudeInput').value;
            const lon = document.getElementById('longitudeInput').value;
            content = `geo:${lat},${lon}`;
            break;
        case 'contact':
            const name = document.getElementById('nameInput').value;
            const phone = document.getElementById('phoneInput').value;
            const email = document.getElementById('emailInput').value;
            content = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL:${phone}\nEMAIL:${email}\nEND:VCARD`;
            break;
        default:
            content = document.getElementById('textInput').value;
    }

    return content;
}

// Add to history
function addToHistory(content, type, mode) {
    const timestamp = new Date().toISOString();
    const id = `qr-${Date.now()}`;
    history.unshift({ id, content, type, mode, timestamp });
    if (history.length > 20) history.pop(); // Keep only last 20 items
    localStorage.setItem('qrHistory', JSON.stringify(history));
    updateHistoryView();
}

// Delete history item
function deleteHistoryItem(id) {
    history = history.filter(item => item.id !== id);
    localStorage.setItem('qrHistory', JSON.stringify(history));
    updateHistoryView();
}

// Copy content to clipboard
function copyToClipboard(content) {
    navigator.clipboard.writeText(content)
        .then(() => alert('Content copied to clipboard!'))
        .catch(err => alert('Failed to copy content'));
}

// Edit history item
function editHistoryItem(id) {
    const item = history.find(item => item.id === id);
    if (!item) return;

    // Switch to generate tab
    document.querySelector('[data-tab="generate"]').click();
    
    // Set the type and fill in the form
    document.getElementById('qrType').value = item.type;
    document.getElementById('qrType').dispatchEvent(new Event('change'));

    // Fill in the appropriate fields based on type
    setTimeout(() => {
        switch (item.type) {
            case 'text':
                document.getElementById('textInput').value = item.content;
                break;
            case 'url':
                document.getElementById('urlInput').value = item.content;
                break;
            case 'wifi':
                const wifiMatch = item.content.match(/WIFI:T:(.*?);S:(.*?);P:(.*?);;/);
                if (wifiMatch) {
                    document.getElementById('encryptionType').value = wifiMatch[1];
                    document.getElementById('ssidInput').value = wifiMatch[2];
                    document.getElementById('passwordInput').value = wifiMatch[3];
                }
                break;
            case 'location':
                const geoMatch = item.content.match(/geo:(.*?),(.*)/);
                if (geoMatch) {
                    document.getElementById('latitudeInput').value = geoMatch[1];
                    document.getElementById('longitudeInput').value = geoMatch[2];
                }
                break;
            case 'contact':
                const nameMatch = item.content.match(/FN:(.*?)\n/);
                const phoneMatch = item.content.match(/TEL:(.*?)\n/);
                const emailMatch = item.content.match(/EMAIL:(.*?)\n/);
                if (nameMatch) document.getElementById('nameInput').value = nameMatch[1];
                if (phoneMatch) document.getElementById('phoneInput').value = phoneMatch[1];
                if (emailMatch) document.getElementById('emailInput').value = emailMatch[1];
                break;
        }
    }, 0);
}

// Update history view
function updateHistoryView() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <p><strong>${item.mode === 'generated' ? '📤 Generated' : '📥 Scanned'}</strong></p>
            <p><strong>Type:</strong> ${item.type}</p>
            <p><strong>Content:</strong> ${item.content}</p>
            <p><strong>Date:</strong> ${new Date(item.timestamp).toLocaleString()}</p>
            <div class="history-actions">
                <button class="copy-btn" onclick="copyToClipboard('${item.content.replace(/'/g, "\\'")}')">Copy</button>
                <button class="edit-btn" onclick="editHistoryItem('${item.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteHistoryItem('${item.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

// Event Listeners
document.getElementById('qrType').addEventListener('change', function() {
    const type = this.value;
    document.getElementById('dynamicInputs').innerHTML = inputTemplates[type];
});

document.getElementById('generateBtn').addEventListener('click', function() {
    const content = generateQRContent();
    if (!content) {
        alert('Please fill in all required fields');
        return;
    }
    
    initQRCode();
    qrcode.makeCode(content);
    document.getElementById('downloadBtn').classList.remove('hidden');
    addToHistory(content, document.getElementById('qrType').value, 'generated');
});

document.getElementById('downloadBtn').addEventListener('click', function() {
    const canvas = document.querySelector('#qrcode canvas');
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', function() {
        const tab = this.dataset.tab;
        
        // Update active button
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        
        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(section => section.classList.add('hidden'));
        document.getElementById(`${tab}Section`).classList.remove('hidden');

        // Handle scanner initialization/disposal
        if (tab === 'scan') {
            if (!html5QrcodeScanner) {
                html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
                html5QrcodeScanner.render((decodedText) => {
                    document.getElementById('scanResult').innerHTML = `
                        <div class="history-item">
                            <p><strong>Scanned Content:</strong></p>
                            <p>${decodedText}</p>
                        </div>
                    `;
                    addToHistory(decodedText, 'unknown', 'scanned');
                }, (error) => {
                    // Handle scan error silently
                });
            }
        } else {
            if (html5QrcodeScanner) {
                try {
                    html5QrcodeScanner.clear();
                } catch (error) {
                    console.error('Error clearing scanner:', error);
                }
                html5QrcodeScanner = null;
            }
        }
    });
});

// Initialize with text input and history view
document.getElementById('dynamicInputs').innerHTML = inputTemplates.text;
updateHistoryView();

// Add error handling for scanner
window.addEventListener('unload', () => {
    if (html5QrcodeScanner) {
        try {
            html5QrcodeScanner.clear();
        } catch (error) {
            console.error('Error clearing scanner:', error);
        }
    }
});