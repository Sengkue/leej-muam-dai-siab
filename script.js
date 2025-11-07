// API Configuration
const API_BASE_URL = "https://apiv2.duabhmoobtojsiab.com/page";
const IMAGE_BASE_URL = "https://filesduab.tojsiab.com/square/450/";

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const loadingIndicator = document.getElementById('loading');
const loadingMoreIndicator = document.getElementById('loadingMore');
const noResultsMessage = document.getElementById('noResults');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const refreshBtn = document.getElementById('refreshBtn');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalDescription = document.getElementById('modalDescription');
const closeModal = document.getElementById('closeModal');

// Global data storage
let allPosts = [];
let filteredPosts = [];
let currentPage = 0;
let isLoading = false;
let currentPostIndex = -1;
let currentImageIndex = 0;
let hasRenderedInitialPosts = false;
let carouselStates = {};
let loadingTimeout = null;

// Format date function
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('lo-LA', options);
}

// Get image URL from API response - FIXED VERSION
function getImageUrl(imagePath) {
    if (!imagePath) return null;
    return `${IMAGE_BASE_URL}${imagePath}`;
}

// Spinner for modal loading
function showModalSpinner(show = true) {
    const spinner = document.getElementById('modal-image-spinner');
    if (spinner) spinner.style.display = show ? 'block' : 'none';
}

// Progressive modal image preview
function loadModalImageProgressive(imageUrl, fullImageUrl, description) {
    showModalSpinner(true);
    modalImage.src = imageUrl;
    modalImage.srcset = '';
    modalImage.alt = description || 'ຮູບພາບ';

    const highResImage = new window.Image();
    highResImage.onload = () => {
        modalImage.src = fullImageUrl;
        modalImage.srcset = `${fullImageUrl} 1x, ${fullImageUrl} 2x`;
        showModalSpinner(false);
    };
    highResImage.onerror = () => {
        showModalSpinner(false);
    };
    highResImage.src = fullImageUrl;
}

function openImageModal(imageUrl, description, postId, imageIndex = 0) {
    if (postId && imageIndex !== undefined) {
        currentPostIndex = allPosts.findIndex(post => post._id === postId);
        currentImageIndex = imageIndex;
    }
    showModalSpinner(true);
    const fullImageUrl = imageUrl && imageUrl.includes('/square/')
        ? imageUrl.replace('/square/450/', '/full/1080/')
        : imageUrl;
    loadModalImageProgressive(imageUrl, fullImageUrl, description);
    modalDescription.textContent = description || 'ບໍ່ມີຄຳອະທິບາຍ';

    // Carousel controls
    const prevButton = document.getElementById('prevImage');
    const nextButton = document.getElementById('nextImage');
    if (currentPostIndex >= 0 && currentPostIndex < allPosts.length) {
        const post = allPosts[currentPostIndex];
        if (post.images && post.images.length > 1) {
            prevButton.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            document.getElementById('modalCounter').textContent = `${currentImageIndex + 1} / ${post.images.length}`;
        } else {
            prevButton.classList.add('hidden');
            nextButton.classList.add('hidden');
            document.getElementById('modalCounter').textContent = '';
        }
    } else {
        prevButton.classList.add('hidden');
        nextButton.classList.add('hidden');
        document.getElementById('modalCounter').textContent = '';
    }
    imageModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function nextImage() {
    if (currentPostIndex < 0 || currentPostIndex >= allPosts.length) return;
    const post = allPosts[currentPostIndex];
    if (!post.images || post.images.length <= 1) return;
    currentImageIndex = (currentImageIndex + 1) % post.images.length;
    const imagePath = post.images[currentImageIndex];
    const imageUrl = getImageUrl(imagePath);
    const fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    loadModalImageProgressive(imageUrl, fullImageUrl, post.description || 'ຮູບພາບ');
    modalDescription.textContent = post.description || 'ບໍ່ມີຄຳອະທິບາຍ';
    document.getElementById('modalCounter').textContent = `${currentImageIndex + 1} / ${post.images.length}`;
}

function prevImage() {
    if (currentPostIndex < 0 || currentPostIndex >= allPosts.length) return;
    const post = allPosts[currentPostIndex];
    if (!post.images || post.images.length <= 1) return;
    currentImageIndex = (currentImageIndex - 1 + post.images.length) % post.images.length;
    const imagePath = post.images[currentImageIndex];
    const imageUrl = getImageUrl(imagePath);
    const fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    loadModalImageProgressive(imageUrl, fullImageUrl, post.description || 'ຮູບພາບ');
    modalDescription.textContent = post.description || 'ບໍ່ມີຄຳອະທິບາຍ';
    document.getElementById('modalCounter').textContent = `${currentImageIndex + 1} / ${post.images.length}`;
}

// other code below this line preserved as before...