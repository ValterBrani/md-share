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
const btnShare = document.getElementById('btn-share');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnDownload = document.getElementById('btn-download');
const shareModal = document.getElementById('share-modal');
const modalClose = document.getElementById('modal-close');
const shareLink = document.getElementById('share-link');
const btnCopyModal = document.getElementById('btn-copy-modal');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const btnSharePreview = document.getElementById('btn-share-preview');
const btnShareReadonly = document.getElementById('btn-share-readonly');
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
    
    // Bouton partager
    btnShare.addEventListener('click', () => generateShareLink(false));
    
    // Bouton partager preview only (même page)
    btnSharePreview.addEventListener('click', () => generateShareLink('preview'));
    
    // Bouton lecture seule (page view.html épurée)
    btnShareReadonly.addEventListener('click', () => generateShareLink('readonly'));
    
    // Bouton retour à l'éditeur
    btnBack.addEventListener('click', switchToEditorMode);
    
    // Bouton copier le lien (toolbar)
    btnCopyLink.addEventListener('click', () => {
        if (currentShareLink) {
            copyToClipboard(currentShareLink);
        }
    });
    
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
function generateShareLink(mode = false) {
    const markdown = markdownInput.value;
    
    if (!markdown.trim()) {
        showToast('No content to share', 'warning');
        return;
    }
    
    try {
        // Compresser et encoder le contenu en base64
        const encoded = encodeContent(markdown);
        
        // Construire l'URL selon le mode
        const basePath = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        
        if (mode === 'readonly') {
            // Page épurée view.html
            currentShareLink = `${basePath}view.html#md=${encoded}`;
        } else if (mode === 'preview') {
            // Même page avec mode preview
            currentShareLink = `${basePath}index.html#md=${encoded}&mode=preview`;
        } else {
            // Mode éditeur normal
            currentShareLink = `${basePath}index.html#md=${encoded}`;
        }
        
        // Check URL length
        if (currentShareLink.length > 32000) {
            showToast('Content is too long to share via URL', 'error');
            return;
        }
        
        // Afficher le modal
        shareLink.value = currentShareLink;
        shareModal.classList.remove('hidden');
        btnCopyLink.disabled = false;
        
    } catch (error) {
        console.error('Error generating link:', error);
        showToast('Error generating link', 'error');
    }
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
        // Extraire le contenu et vérifier le mode
        const hashContent = hash.slice(4);
        const isPreviewMode = hashContent.includes('&mode=preview');
        const encoded = hashContent.replace('&mode=preview', '');
        
        const content = decodeContent(encoded);
        
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
