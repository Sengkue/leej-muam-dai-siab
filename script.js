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
const modalImageLoader = document.getElementById('modalImageLoader');
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

// Image caching and preloading
const imageCache = new Map();
const preloadQueue = [];
let isPreloading = false;

// Intersection Observer for lazy loading
let imageObserver;

// Initialize Intersection Observer
function initImageObserver() {
    const options = {
        root: null,
        rootMargin: '50px',
        threshold: 0.01
    };

    imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const container = entry.target;
                const imageUrl = container.dataset.imageUrl;
                
                if (imageUrl && !imageCache.has(imageUrl)) {
                    loadImageProgressive(imageUrl, container);
                    observer.unobserve(container);
                }
            }
        });
    }, options);
}

// Progressive image loading with blur-up technique
function loadImageProgressive(imageUrl, container) {
    if (imageCache.has(imageUrl)) {
        container.style.backgroundImage = `url('${imageUrl}')`;
        container.classList.remove('loading');
        container.classList.add('image-loaded');
        return;
    }

    container.classList.add('loading');
    
    const img = new Image();
    
    img.onload = () => {
        // Cache the image
        imageCache.set(imageUrl, true);
        
        // Apply the image
        container.style.backgroundImage = `url('${imageUrl}')`;
        container.classList.remove('loading');
        container.classList.add('image-loaded');
        
        // Preload next images in queue
        preloadNextImages();
    };
    
    img.onerror = () => {
        container.classList.remove('loading');
        container.style.backgroundImage = 'none';
    };
    
    img.src = imageUrl;
}

// Preload images for faster modal viewing
function preloadNextImages() {
    if (isPreloading || preloadQueue.length === 0) return;
    
    isPreloading = true;
    const nextImage = preloadQueue.shift();
    
    if (nextImage && !imageCache.has(nextImage)) {
        const img = new Image();
        img.onload = () => {
            imageCache.set(nextImage, true);
            isPreloading = false;
            preloadNextImages();
        };
        img.onerror = () => {
            isPreloading = false;
            preloadNextImages();
        };
        img.src = nextImage;
    } else {
        isPreloading = false;
        preloadNextImages();
    }
}

// Add images to preload queue
function queueImagesForPreload(images) {
    images.forEach(imagePath => {
        const fullUrl = getFullImageUrl(imagePath);
        if (!imageCache.has(fullUrl) && !preloadQueue.includes(fullUrl)) {
            preloadQueue.push(fullUrl);
        }
    });
    
    // Start preloading if not already running
    if (!isPreloading) {
        preloadNextImages();
    }
}

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

// Get image URL from API response
function getImageUrl(imagePath) {
    if (!imagePath) return null;
    return `${IMAGE_BASE_URL}${imagePath}`;
}

// Get full size image URL
function getFullImageUrl(imagePath) {
    if (!imagePath) return null;
    const baseUrl = "https://filesduab.tojsiab.com/full/1080/";
    return `${baseUrl}${imagePath}`;
}

// Create carousel for multiple images with lazy loading
function createImageCarousel(images, postId, description) {
    const escapedDescription = description ? 
        description.replace(/'/g, "\\'").replace(/\n/g, "\\n") : '';
    
    if (!images || images.length === 0) {
        return `
            <div class="max-h-96 h-96 overflow-hidden w-full cursor-pointer image-placeholder" 
                 onclick="openImageModal('', '${escapedDescription}')">
                <div class="text-center">
                    <i class="fas fa-image text-4xl mb-2"></i>
                    <p>ບໍ່ມີຮູບພາບ</p>
                </div>
            </div>
        `;
    }
    
    if (images.length === 1) {
        const imageUrl = getImageUrl(images[0]);
        return `
            <div class="max-h-96 h-96 overflow-hidden w-full cursor-pointer image-container loading" 
                 data-image-url="${imageUrl}"
                 data-post-id="${postId}"
                 data-image-index="0"
                 onclick="openImageModal('${imageUrl}', '${escapedDescription}', '${postId}', 0)">
                 <div class="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm z-10">
                    <i class="fas fa-images mr-1"></i> ${images.length}
                </div>
            </div>
        `;
    }
    
    return `
        <div class="carousel max-h-96 h-96 overflow-hidden w-full relative" id="carousel-${postId}">
            <div class="carousel-inner h-full">
                ${images.map((image, index) => {
                    const imageUrl = getImageUrl(image);
                    return `
                        <div class="carousel-item h-full ${index === 0 ? 'active' : ''}">
                            <div class="max-h-96 h-96 overflow-hidden w-full cursor-pointer image-container loading" 
                                 data-image-url="${imageUrl}"
                                 data-post-id="${postId}"
                                 data-image-index="${index}"
                                 onclick="openImageModal('${imageUrl}', '${escapedDescription}', '${postId}', ${index})">
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="absolute bottom-2 left-0 right-0 flex justify-center space-x-1 z-10">
                ${images.map((_, index) => `
                    <button class="w-2 h-2 rounded-full ${index === 0 ? 'bg-white' : 'bg-gray-400'}" 
                            onclick="goToSlide('${postId}', ${index})"></button>
                `).join('')}
            </div>
            <div class="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm z-10">
                <i class="fas fa-images mr-1"></i> ${images.length}
            </div>
        </div>
    `;
}

// Carousel navigation
function goToSlide(carouselId, index) {
    const post = allPosts.find(p => `carousel-${p._id}` === `carousel-${carouselId}`);
    if (post && post.images && post.images.length > index) {
        const imageUrl = getImageUrl(post.images[index]);
        openImageModal(imageUrl, post.description || 'ບໍ່ມີຄຳອະທິບາຍ', post._id, index);
    }
}

// Open image modal with optimized loading
function openImageModal(imageUrl, description, postId, imageIndex = 0) {
    if (postId && imageIndex !== undefined) {
        currentPostIndex = allPosts.findIndex(post => post._id === postId);
        currentImageIndex = imageIndex;
    }
    
    let fullImageUrl = imageUrl;
    if (imageUrl && imageUrl.includes('/square/')) {
        fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    }
    
    // Show modal immediately
    imageModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Show loader and hide image initially
    modalImageLoader.classList.remove('hidden');
    modalImage.classList.add('hidden');
    
    // Set description
    modalDescription.textContent = description || 'ບໍ່ມີຄຳອະທິບາຍ';
    
    // Load image with progress
    if (fullImageUrl) {
        // Check if image is cached
        if (imageCache.has(fullImageUrl)) {
            // Image is cached, show immediately
            modalImage.src = fullImageUrl;
            modalImage.alt = description || 'ຮູບພາບ';
            modalImageLoader.classList.add('hidden');
            modalImage.classList.remove('hidden');
        } else {
            // Load image with progress indicator
            const img = new Image();
            
            img.onload = () => {
                imageCache.set(fullImageUrl, true);
                modalImage.src = fullImageUrl;
                modalImage.alt = description || 'ຮູບພາບ';
                modalImageLoader.classList.add('hidden');
                modalImage.classList.remove('hidden');
                
                // Preload adjacent images
                preloadAdjacentImages();
            };
            
            img.onerror = () => {
                modalImageLoader.classList.add('hidden');
                modalImage.classList.remove('hidden');
                modalImage.src = '';
                modalImage.alt = 'ບໍ່ສາມາດໂຫຼດຮູບພາບ';
            };
            
            img.src = fullImageUrl;
        }
    } else {
        modalImageLoader.classList.add('hidden');
        modalImage.classList.remove('hidden');
        modalImage.src = '';
        modalImage.alt = 'ບໍ່ມີຮູບພາບ';
    }
    
    // Show/hide navigation buttons
    const prevButton = document.getElementById('prevImage');
    const nextButton = document.getElementById('nextImage');
    const modalCounter = document.getElementById('modalCounter');
    
    if (currentPostIndex >= 0 && currentPostIndex < allPosts.length) {
        const post = allPosts[currentPostIndex];
        if (post.images && post.images.length > 1) {
            prevButton.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            modalCounter.textContent = `${currentImageIndex + 1} / ${post.images.length}`;
        } else {
            prevButton.classList.add('hidden');
            nextButton.classList.add('hidden');
            modalCounter.textContent = '';
        }
    } else {
        prevButton.classList.add('hidden');
        nextButton.classList.add('hidden');
        modalCounter.textContent = '';
    }
}

// Preload adjacent images in modal for faster navigation
function preloadAdjacentImages() {
    if (currentPostIndex < 0 || currentPostIndex >= allPosts.length) return;
    
    const post = allPosts[currentPostIndex];
    if (!post.images || post.images.length <= 1) return;
    
    // Preload next and previous images
    const nextIndex = (currentImageIndex + 1) % post.images.length;
    const prevIndex = (currentImageIndex - 1 + post.images.length) % post.images.length;
    
    const imagesToPreload = [
        post.images[nextIndex],
        post.images[prevIndex]
    ];
    
    queueImagesForPreload(imagesToPreload);
}

// Navigate to next image
function nextImage() {
    if (currentPostIndex < 0 || currentPostIndex >= allPosts.length) return;
    
    const post = allPosts[currentPostIndex];
    if (!post.images || post.images.length <= 1) return;
    
    currentImageIndex = (currentImageIndex + 1) % post.images.length;
    
    const imagePath = post.images[currentImageIndex];
    const imageUrl = getImageUrl(imagePath);
    const fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    
    // Show loader
    modalImageLoader.classList.remove('hidden');
    modalImage.classList.add('hidden');
    
    // Load image
    if (imageCache.has(fullImageUrl)) {
        modalImage.src = fullImageUrl;
        modalImageLoader.classList.add('hidden');
        modalImage.classList.remove('hidden');
    } else {
        const img = new Image();
        img.onload = () => {
            imageCache.set(fullImageUrl, true);
            modalImage.src = fullImageUrl;
            modalImageLoader.classList.add('hidden');
            modalImage.classList.remove('hidden');
            preloadAdjacentImages();
        };
        img.onerror = () => {
            modalImageLoader.classList.add('hidden');
            modalImage.classList.remove('hidden');
        };
        img.src = fullImageUrl;
    }
    
    modalDescription.textContent = post.description || 'ບໍ່ມີຄຳອະທິບາຍ';
    document.getElementById('modalCounter').textContent = `${currentImageIndex + 1} / ${post.images.length}`;
}

// Navigate to previous image
function prevImage() {
    if (currentPostIndex < 0 || currentPostIndex >= allPosts.length) return;
    
    const post = allPosts[currentPostIndex];
    if (!post.images || post.images.length <= 1) return;
    
    currentImageIndex = (currentImageIndex - 1 + post.images.length) % post.images.length;
    
    const imagePath = post.images[currentImageIndex];
    const imageUrl = getImageUrl(imagePath);
    const fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    
    // Show loader
    modalImageLoader.classList.remove('hidden');
    modalImage.classList.add('hidden');
    
    // Load image
    if (imageCache.has(fullImageUrl)) {
        modalImage.src = fullImageUrl;
        modalImageLoader.classList.add('hidden');
        modalImage.classList.remove('hidden');
    } else {
        const img = new Image();
        img.onload = () => {
            imageCache.set(fullImageUrl, true);
            modalImage.src = fullImageUrl;
            modalImageLoader.classList.add('hidden');
            modalImage.classList.remove('hidden');
            preloadAdjacentImages();
        };
        img.onerror = () => {
            modalImageLoader.classList.add('hidden');
            modalImage.classList.remove('hidden');
        };
        img.src = fullImageUrl;
    }
    
    modalDescription.textContent = post.description || 'ບໍ່ມີຄຳອະທິບາຍ';
    document.getElementById('modalCounter').textContent = `${currentImageIndex + 1} / ${post.images.length}`;
}

// Close image modal
function closeImageModal() {
    imageModal.classList.add('hidden');
    document.body.style.overflow = '';
    currentPostIndex = -1;
    currentImageIndex = 0;
}

// Fetch data from API with timeout
async function fetchData(page = 0, append = false) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        if (append) {
            showLoadingMore();
        } else {
            showLoading();
        }
        
        // Add timeout to fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(`${API_BASE_URL}/${page}/0`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const newPosts = data.items || [];
        
        if (append) {
            allPosts = [...allPosts, ...newPosts];
        } else {
            allPosts = newPosts;
            currentPage = 0;
        }
        
        renderPosts();
        
        if (newPosts.length > 0) {
            loadMoreContainer.classList.remove('hidden');
            currentPage = page;
            
            // Queue first few images for preloading
            const firstImages = newPosts.slice(0, 5).flatMap(post => post.images || []);
            queueImagesForPreload(firstImages);
        } else {
            loadMoreContainer.classList.add('hidden');
        }
        
        hideLoading();
        hideLoadingMore();
        isLoading = false;
        
    } catch (error) {
        console.error('Error fetching data:', error);
        hideLoading();
        hideLoadingMore();
        
        if (error.name === 'AbortError') {
            showError('ການເຊື່ອມຕໍ່ໝົດເວລາ. ກະລຸນາກວດເຊັກການເຊື່ອມຕໍ່ອິນເຕີເນັດຂອງທ່ານ.');
        } else {
            showError('ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.');
        }
        isLoading = false;
    }
}

// Load more data
function loadMore() {
    fetchData(currentPage + 1, true);
}

// Show loading indicator
function showLoading() {
    loadingIndicator.classList.remove('hidden');
    if (currentPage === 0) {
        postsContainer.innerHTML = '';
    }
    noResultsMessage.classList.add('hidden');
    
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        if (loadingIndicator.classList.contains('hidden') === false) {
            const loadingText = loadingIndicator.querySelector('span');
            if (loadingText) {
                loadingText.textContent = 'ກຳລັງໂຫຼດຂໍ້ມູນ... (ການເຊື່ອມຕໍ່ຊ້າ)';
            }
        }
    }, 5000);
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.classList.add('hidden');
    clearTimeout(loadingTimeout);
    
    const loadingText = loadingIndicator.querySelector('span');
    if (loadingText) {
        loadingText.textContent = 'ກຳລັງໂຫຼດຂໍ້ມູນ...';
    }
}

// Show loading more indicator
function showLoadingMore() {
    loadingMoreIndicator.classList.remove('hidden');
    loadMoreContainer.classList.add('hidden');
    
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        if (loadingMoreIndicator.classList.contains('hidden') === false) {
            const loadingText = loadingMoreIndicator.querySelector('span');
            if (loadingText) {
                loadingText.textContent = 'ກຳລັງໂຫຼດຂໍ້ມູນເພີ່ມເຕີມ... (ການເຊື່ອມຕໍ່ຊ້າ)';
            }
        }
    }, 5000);
}

// Hide loading more indicator
function hideLoadingMore() {
    loadingMoreIndicator.classList.add('hidden');
    clearTimeout(loadingTimeout);
    
    const loadingText = loadingMoreIndicator.querySelector('span');
    if (loadingText) {
        loadingText.textContent = 'ກຳລັງໂຫຼດຂໍ້ມູນເພີ່ມເຕີມ...';
    }
}

// Show error message
function showError(message) {
    postsContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
            <i class="fas fa-exclamation-triangle text-5xl text-red-400 mb-4"></i>
            <h3 class="text-xl text-red-600">ຜິດພາດ</h3>
            <p class="text-gray-600 mt-2">${message}</p>
        </div>
    `;
}

// Render posts to the DOM
function renderPosts() {
    if (allPosts.length === 0) {
        noResultsMessage.classList.remove('hidden');
        if (!hasRenderedInitialPosts) {
            postsContainer.innerHTML = '';
        }
        return;
    }
    
    noResultsMessage.classList.add('hidden');
    
    if (!hasRenderedInitialPosts || currentPage === 0) {
        postsContainer.innerHTML = '';
        hasRenderedInitialPosts = true;
    }
    
    const newPostsHTML = allPosts.slice(postsContainer.children.length).map((post, index) => {
        const globalIndex = postsContainer.children.length + index;
        
        return `
            <div class="bg-white rounded-2xl shadow-lg overflow-hidden card-hover fade-in border border-gray-100">
                ${createImageCarousel(post.images, post._id, post.description || 'ບໍ່ມີຄຳອະທິບາຍ')}
                
                <div class="p-6">
                    <p class="text-gray-700 mb-4 line-clamp-2 text-base leading-relaxed">${post.description || 'ບໍ່ມີຄຳອະທິບາຍ'}</p>
                    
                    <div class="flex justify-between items-center text-sm text-gray-600 mb-3">
                        <div class="flex items-center cursor-pointer hover:text-purple-600 transition-colors group" onclick="openLocationInGoogleMaps('${post.location ? post.location.replace(/'/g, "\\'") : 'ບໍ່ຮູ້ສະຖານທີ່'}', ${post.geo ? JSON.stringify(post.geo) : 'null'})" title="Click to view on Google Maps">
                            <i class="fas fa-map-marker-alt mr-2 group-hover:scale-110 transition-transform"></i>
                            <span class="font-medium">${post.location || 'ບໍ່ຮູ້ສະຖານທີ່'}</span>
                            <i class="fas fa-external-link-alt ml-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
                        </div>
                        
                        <div class="flex items-center bg-purple-50 px-3 py-1 rounded-full">
                            <i class="fas fa-eye mr-2 text-purple-600"></i>
                            <span class="font-semibold text-purple-700">${post.view || 0}</span>
                        </div>
                    </div>
                    
                    <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center">
                        <i class="far fa-clock mr-2 text-purple-600"></i>
                        <span>${formatDate(post.createDate)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    postsContainer.insertAdjacentHTML('beforeend', newPostsHTML);
    
    // Observe newly added images for lazy loading
    requestAnimationFrame(() => {
        const newImages = postsContainer.querySelectorAll('.image-container[data-image-url]:not(.observed)');
        newImages.forEach(img => {
            img.classList.add('observed');
            imageObserver.observe(img);
        });
    });
}

// Open location in Google Maps
function openLocationInGoogleMaps(locationName, geoCoordinates) {
    try {
        let mapsUrl;
        
        if (geoCoordinates && Array.isArray(geoCoordinates) && geoCoordinates.length === 2) {
            const [longitude, latitude] = geoCoordinates;
            mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        } else if (locationName && locationName !== 'ບໍ່ຮູ້ສະຖານທີ່') {
            const encodedLocation = encodeURIComponent(locationName);
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
        } else {
            mapsUrl = 'https://www.google.com/maps/place/Laos';
        }
        
        window.open(mapsUrl, '_blank');
    } catch (error) {
        console.error('Error opening Google Maps:', error);
        window.open('https://www.google.com/maps', '_blank');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize intersection observer
    initImageObserver();
    
    // Event listeners
    refreshBtn.addEventListener('click', () => {
        imageCache.clear();
        fetchData(0, false);
    });
    
    loadMoreBtn.addEventListener('click', loadMore);
    closeModal.addEventListener('click', closeImageModal);
    
    document.getElementById('prevImage').addEventListener('click', prevImage);
    document.getElementById('nextImage').addEventListener('click', nextImage);
    
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            closeImageModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (!imageModal.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                prevImage();
            } else if (e.key === 'ArrowRight') {
                nextImage();
            } else if (e.key === 'Escape') {
                closeImageModal();
            }
        }
    });

    // Initialize the app
    fetchData(0, false);
});