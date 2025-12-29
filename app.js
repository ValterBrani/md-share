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

// Variable pour stocker le lien de partage actuel
let currentShareLink = '';

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Vérifier si un contenu est partagé via l'URL
    loadFromUrl();
    
    // Configurer les événements
    setupEventListeners();
});

// Configuration des événements
function setupEventListeners() {
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
        markdownPreview.innerHTML = '<p class="placeholder-text">La prévisualisation apparaîtra ici...</p>';
        return;
    }
    
    try {
        const html = marked.parse(markdown);
        markdownPreview.innerHTML = html;
        
        // Appliquer la coloration syntaxique aux blocs de code
        markdownPreview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } catch (error) {
        console.error('Erreur de parsing Markdown:', error);
        markdownPreview.innerHTML = '<p class="placeholder-text">Erreur lors du rendu du Markdown</p>';
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
        showToast(`Fichier "${file.name}" chargé avec succès`);
    };
    
    reader.onerror = () => {
        showToast('Erreur lors de la lecture du fichier', 'error');
    };
    
    reader.readAsText(file);
    
    // Reset l'input pour permettre de charger le même fichier
    event.target.value = '';
}

// Effacer le contenu
function clearContent() {
    if (markdownInput.value && !confirm('Êtes-vous sûr de vouloir effacer tout le contenu ?')) {
        return;
    }
    
    markdownInput.value = '';
    updatePreview();
    currentShareLink = '';
    btnCopyLink.disabled = true;
    showToast('Contenu effacé');
}

// Générer un lien de partage
// mode: false = éditeur, 'preview' = preview même page, 'readonly' = view.html
function generateShareLink(mode = false) {
    const markdown = markdownInput.value;
    
    if (!markdown.trim()) {
        showToast('Aucun contenu à partager', 'warning');
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
        
        // Vérifier la longueur de l'URL
        if (currentShareLink.length > 32000) {
            showToast('Le contenu est trop long pour être partagé via URL', 'error');
            return;
        }
        
        // Afficher le modal
        shareLink.value = currentShareLink;
        shareModal.classList.remove('hidden');
        btnCopyLink.disabled = false;
        
    } catch (error) {
        console.error('Erreur lors de la génération du lien:', error);
        showToast('Erreur lors de la génération du lien', 'error');
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
                // Activer le mode preview-only
                document.body.classList.add('preview-mode');
                showToast('Mode prévisualisation');
            } else {
                showToast('Contenu chargé depuis le lien partagé');
                // Nettoyer l'URL sans recharger la page
                history.replaceState(null, '', window.location.pathname);
            }
        } else {
            showToast('Impossible de charger le contenu partagé', 'error');
        }
    }
}

// Basculer vers le mode éditeur
function switchToEditorMode() {
    document.body.classList.remove('preview-mode');
    // Nettoyer l'URL
    history.replaceState(null, '', window.location.pathname);
    showToast('Mode éditeur activé');
}

// Télécharger le markdown
function downloadMarkdown() {
    const content = markdownInput.value;
    
    if (!content.trim()) {
        showToast('Aucun contenu à télécharger', 'warning');
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
    showToast('Fichier téléchargé');
}

// Copier dans le presse-papier
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Lien copié dans le presse-papier');
    } catch (error) {
        // Fallback pour les navigateurs plus anciens
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showToast('Lien copié dans le presse-papier');
        } catch (e) {
            showToast('Impossible de copier le lien', 'error');
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
