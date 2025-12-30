// Configuration de Marked.js
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (e) {
                console.error('Erreur de coloration syntaxique:', e);
            }
        }
        return hljs.highlightAuto(code).value;
    }
});

// Éléments DOM
const markdownInput = document.getElementById('markdown-input');
const markdownPreview = document.getElementById('markdown-preview');
const fileInput = document.getElementById('file-input');
const btnClear = document.getElementById('btn-clear');
const btnPdf = document.getElementById('btn-pdf');
const btnShare = document.getElementById('btn-share');
const btnDownload = document.getElementById('btn-download');
const shareModal = document.getElementById('share-modal');
const modalClose = document.getElementById('modal-close');
const shareLink = document.getElementById('share-link');
const btnCopyModal = document.getElementById('btn-copy-modal');
const btnGenerateLink = document.getElementById('btn-generate-link');
const linkResult = document.getElementById('link-result');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const btnBack = document.getElementById('btn-back');
const backToEditor = document.getElementById('back-to-editor');
const themeToggle = document.getElementById('theme-toggle');

// Variable pour stocker le lien de partage actuel
let currentShareLink = '';

// Theme management
function initTheme() {
    const savedTheme = localStorage.getItem('md-share-theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('md-share-theme', theme);
    
    // Update toggle button
    const icon = themeToggle.querySelector('.icon');
    const label = themeToggle.querySelector('.label');
    
    if (theme === 'dark') {
        icon.textContent = '🌙';
        label.textContent = 'Dark';
    } else {
        icon.textContent = '☀️';
        label.textContent = 'Light';
    }
    
    // Update highlight.js theme
    const hljsTheme = document.getElementById('hljs-theme');
    if (hljsTheme) {
        hljsTheme.href = theme === 'dark' 
            ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
            : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    }
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// PDF generation
function generatePDF() {
    const btn = btnPdf;
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        // Clone content to avoid modifying original
        const content = markdownPreview.cloneNode(true);
        
        // Clean h1-h6 styles (remove gradient backgrounds)
        content.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
            heading.style.background = 'none';
            heading.style.color = '#000';
        });
        
        // Clean blockquote and code styles for print
        content.querySelectorAll('blockquote, pre').forEach(element => {
            element.style.background = '#f5f5f5';
            element.style.borderColor = '#ddd';
        });

        const opt = {
            margin: [10, 10, 10, 10],
            filename: 'document.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(content).save().then(() => {
            btn.classList.remove('loading');
            btn.disabled = false;
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> ✅`;
            setTimeout(() => {
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> PDF`;
            }, 2000);
        }).catch(error => {
            btn.classList.remove('loading');
            btn.disabled = false;
            console.error('PDF generation error:', error);
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> ❌`;
            setTimeout(() => {
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg> PDF`;
            }, 2000);
        });
    } catch (error) {
        btn.classList.remove('loading');
        btn.disabled = false;
        console.error('PDF error:', error);
        showToast('Error generating PDF', 'error');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();
    
    // Vérifier si un contenu est partagé via l'URL
    loadFromUrl();
    
    // Configurer les événements
    setupEventListeners();
});

// Configuration des événements
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Mise à jour de la prévisualisation en temps réel
    markdownInput.addEventListener('input', debounce(updatePreview, 150));
    
    // Chargement de fichier
    fileInput.addEventListener('change', handleFileLoad);
    
    // Bouton effacer
    btnClear.addEventListener('click', clearContent);
    
    // Bouton PDF
    btnPdf.addEventListener('click', generatePDF);
    
    // Bouton partager - ouvre la modal
    btnShare.addEventListener('click', openShareModal);
    
    // Bouton générer le lien dans la modal
    btnGenerateLink.addEventListener('click', generateShareLink);
    
    // Bouton retour à l'éditeur
    btnBack.addEventListener('click', switchToEditorMode);
    
    // Bouton télécharger
    btnDownload.addEventListener('click', downloadMarkdown);
    
    // Modal - fermeture
    modalClose.addEventListener('click', closeModal);
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) closeModal();
    });
    
    // Modal - copier
    btnCopyModal.addEventListener('click', () => {
        copyToClipboard(shareLink.value);
    });
    
    // Échapper pour fermer le modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !shareModal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

// Open share modal
function openShareModal() {
    const markdown = markdownInput.value;
    
    if (!markdown.trim()) {
        showToast('No content to share', 'warning');
        return;
    }
    
    // Reset modal state
    linkResult.classList.add('hidden');
    document.getElementById('expiration-info').classList.add('hidden');
    
    // Show modal
    shareModal.classList.remove('hidden');
}

// Mettre à jour la prévisualisation
function updatePreview() {
    const markdown = markdownInput.value;
    
    if (!markdown.trim()) {
        markdownPreview.innerHTML = '<p class="placeholder-text">Preview will appear here...</p>';
        return;
    }
    
    try {
        const html = marked.parse(markdown);
        markdownPreview.innerHTML = html;
        
        // Apply syntax highlighting to code blocks
        markdownPreview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } catch (error) {
        console.error('Markdown parsing error:', error);
        markdownPreview.innerHTML = '<p class="placeholder-text">Error rendering Markdown</p>';
    }
}

// Charger un fichier
function handleFileLoad(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        markdownInput.value = e.target.result;
        updatePreview();
        showToast(`File "${file.name}" loaded successfully`);
    };
    
    reader.onerror = () => {
        showToast('Error reading file', 'error');
    };
    
    reader.readAsText(file);
    
    // Reset l'input pour permettre de charger le même fichier
    event.target.value = '';
}

// Effacer le contenu
function clearContent() {
    if (markdownInput.value && !confirm('Are you sure you want to clear all content?')) {
        return;
    }
    
    markdownInput.value = '';
    updatePreview();
    currentShareLink = '';
    btnCopyLink.disabled = true;
    showToast('Content cleared');
}

// Generate a share link
// mode: false = editor, 'preview' = preview same page, 'readonly' = view.html
function generateShareLink() {
    const markdown = markdownInput.value;
    
    if (!markdown.trim()) {
        showToast('No content to share', 'warning');
        return;
    }
    
    // Get selected mode
    const modeRadio = document.querySelector('input[name="share-mode"]:checked');
    const mode = modeRadio ? modeRadio.value : 'editor';
    
    try {
        // Compresser et encoder le contenu en base64
        const encoded = encodeContent(markdown);
        
        // Get expiration setting
        const expirationSelect = document.getElementById('expiration-select');
        const expirationHours = parseInt(expirationSelect.value);
        let expirationParam = '';
        let expirationDate = null;
        
        if (expirationHours > 0) {
            expirationDate = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
            expirationParam = `&exp=${expirationDate.getTime()}`;
        }
        
        // Construire l'URL selon le mode
        const basePath = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        
        if (mode === 'readonly') {
            // Page épurée view.html
            currentShareLink = `${basePath}view.html#md=${encoded}${expirationParam}`;
        } else if (mode === 'preview') {
            // Même page avec mode preview
            currentShareLink = `${basePath}index.html#md=${encoded}&mode=preview${expirationParam}`;
        } else {
            // Mode éditeur normal
            currentShareLink = `${basePath}index.html#md=${encoded}${expirationParam}`;
        }
        
        // Check URL length
        if (currentShareLink.length > 32000) {
            showToast('Content is too long to share via URL', 'error');
            return;
        }
        
        // Show link result
        shareLink.value = currentShareLink;
        linkResult.classList.remove('hidden');
        
        // Update expiration info
        const expirationInfo = document.getElementById('expiration-info');
        if (expirationDate) {
            expirationInfo.textContent = `⏰ This link expires on ${formatDate(expirationDate)}`;
            expirationInfo.classList.remove('hidden');
        } else {
            expirationInfo.textContent = '♾️ This link never expires';
            expirationInfo.classList.remove('hidden');
        }
        
        showToast('Link generated!');
        
    } catch (error) {
        console.error('Error generating link:', error);
        showToast('Error generating link', 'error');
    }
}

// Format date for display
function formatDate(date) {
    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Encoder le contenu pour l'URL
function encodeContent(content) {
    // Utiliser TextEncoder pour gérer correctement l'UTF-8
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    
    // Convertir en base64
    let binary = '';
    data.forEach(byte => binary += String.fromCharCode(byte));
    return btoa(binary);
}

// Décoder le contenu de l'URL
function decodeContent(encoded) {
    try {
        // Décoder le base64
        const binary = atob(encoded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        
        // Décoder l'UTF-8
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    } catch (error) {
        console.error('Erreur de décodage:', error);
        return null;
    }
}

// Charger le contenu depuis l'URL
function loadFromUrl() {
    const hash = window.location.hash;
    
    if (hash.startsWith('#md=')) {
        // Parse hash parameters
        const hashContent = hash.slice(4);
        const params = parseHashParams(hashContent);
        
        // Check expiration first
        if (params.exp) {
            const expirationTime = parseInt(params.exp);
            if (Date.now() > expirationTime) {
                showExpiredMessage(new Date(expirationTime));
                return;
            }
        }
        
        const isPreviewMode = params.mode === 'preview';
        const content = decodeContent(params.md);
        
        if (content) {
            markdownInput.value = content;
            updatePreview();
            
            if (isPreviewMode) {
                // Activate preview-only mode
                document.body.classList.add('preview-mode');
                showToast('Preview mode');
            } else {
                showToast('Content loaded from shared link');
                // Clean URL without reloading
                history.replaceState(null, '', window.location.pathname);
            }
        } else {
            showToast('Unable to load shared content', 'error');
        }
    }
}

// Parse hash parameters
function parseHashParams(hashContent) {
    const result = { md: '' };
    const parts = hashContent.split('&');
    
    // First part is always the md content
    result.md = parts[0];
    
    // Parse other parameters
    for (let i = 1; i < parts.length; i++) {
        const [key, value] = parts[i].split('=');
        if (key && value !== undefined) {
            result[key] = value;
        } else if (key) {
            result[key] = true;
        }
    }
    
    return result;
}

// Show expired message
function showExpiredMessage(expirationDate) {
    const container = document.querySelector('.container');
    container.innerHTML = `
        <div class="expired-message">
            <h1>⏰</h1>
            <h2>Link Expired</h2>
            <p>This shared link has expired and is no longer available.</p>
            <p class="expired-date">Expired on: ${formatDate(expirationDate)}</p>
            <a href="index.html">Create a new document</a>
        </div>
    `;
    
    // Hide toolbar
    document.querySelector('.toolbar').style.display = 'none';
}

// Switch to editor mode
function switchToEditorMode() {
    document.body.classList.remove('preview-mode');
    // Clean URL
    history.replaceState(null, '', window.location.pathname);
    showToast('Editor mode activated');
}

// Download markdown
function downloadMarkdown() {
    const content = markdownInput.value;
    
    if (!content.trim()) {
        showToast('No content to download', 'warning');
        return;
    }
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'document.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    showToast('File downloaded');
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Link copied to clipboard');
    } catch (error) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showToast('Link copied to clipboard');
        } catch (e) {
            showToast('Unable to copy link', 'error');
        }
        
        document.body.removeChild(textArea);
    }
}

// Fermer le modal
function closeModal() {
    shareModal.classList.add('hidden');
}

// Afficher un toast
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    // Style selon le type
    toast.style.background = type === 'error' ? '#dc3545' : 
                             type === 'warning' ? '#ffc107' : '#333';
    toast.style.color = type === 'warning' ? '#333' : 'white';
    
    // Masquer après 3 secondes
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Fonction debounce pour optimiser les performances
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Écouter les changements d'URL (navigation)
window.addEventListener('hashchange', loadFromUrl);
