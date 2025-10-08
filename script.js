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
let carouselStates = {}; // Track carousel states
let loadingTimeout = null; // Timeout for long loading

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
    
    // The image path from API is like: "dc07811cf3218ba16c4886c9ffa6fb29/1iexsd7hvnr369qm2bytfjcu0.jpg"
    // We need to construct: "https://duabhmoobtojsiab.com/dc07811cf3218ba16c4886c9ffa6fb29/1iexsd7hvnr369qm2bytfjcu0.jpg"
    return `${IMAGE_BASE_URL}${imagePath}`;
}

// Create carousel for multiple images
function createImageCarousel(images, postId, description) {
    // Escape single quotes and newlines for use in onclick attributes
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
            <div class="max-h-96 h-96 overflow-hidden w-full cursor-pointer image-container" 
                 style="background-image: url('${imageUrl}')"
                 onclick="openImageModal('${imageUrl}', '${escapedDescription}', '${postId}', 0)">
                 <div class="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    <i class="fas fa-images mr-1"></i> ${images.length}
                </div>
            </div>
        `;
    }
    
    // For multiple images, create a carousel (without navigation buttons)
    return `
        <div class="carousel max-h-96 h-96 overflow-hidden w-full relative" id="carousel-${postId}">
            <div class="carousel-inner h-full">
                ${images.map((image, index) => {
                    const imageUrl = getImageUrl(image);
                    return `
                        <div class="carousel-item h-full ${index === 0 ? 'active' : ''}">
                            <div class="max-h-96 h-96 overflow-hidden w-full cursor-pointer image-container" 
                                 style="background-image: url('${imageUrl}')"
                                 onclick="openImageModal('${imageUrl}', '${escapedDescription}', '${postId}', ${index})">
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
                ${images.map((_, index) => `
                    <button class="w-2 h-2 rounded-full ${index === 0 ? 'bg-white' : 'bg-gray-400'}" 
                            onclick="goToSlide('${postId}', ${index})"></button>
                `).join('')}
            </div>
            <div class="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                <i class="fas fa-images mr-1"></i> ${images.length}
            </div>
        </div>
    `;
}

// Carousel navigation (handled in modal only)
function goToSlide(carouselId, index) {
    // Find the post by carousel ID
    const post = allPosts.find(p => `carousel-${p._id}` === `carousel-${carouselId}`);
    if (post && post.images && post.images.length > index) {
        // Open the modal with the specific image
        const imageUrl = getImageUrl(post.images[index]);
        openImageModal(imageUrl, post.description || 'ບໍ່ມີຄຳອະທິບາຍ', post._id, index);
    }
}

// Open image modal with carousel support
function openImageModal(imageUrl, description, postId, imageIndex = 0) {
    // If we have a postId and imageIndex, it's from a carousel
    if (postId && imageIndex !== undefined) {
        currentPostIndex = allPosts.findIndex(post => post._id === postId);
        currentImageIndex = imageIndex;
    }
    
    // Get full size image URL
    let fullImageUrl = imageUrl;
    if (imageUrl && imageUrl.includes('/square/')) {
        // Convert square image URL to full size
        fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    }
    
    // Set image source with srcset for responsive images
    const modalImage = document.getElementById('modalImage');
    if (fullImageUrl) {
        modalImage.src = fullImageUrl;
        modalImage.srcset = `${fullImageUrl} 1x, ${fullImageUrl} 2x`;
        modalImage.alt = description || 'ຮູບພາບ';
    } else {
        modalImage.src = '';
        modalImage.srcset = '';
        modalImage.alt = 'ບໍ່ມີຮູບພາບ';
    }
    
    // Set description
    const modalDescription = document.getElementById('modalDescription');
    modalDescription.textContent = description || 'ບໍ່ມີຄຳອະທິບາຍ';
    
    // Show/hide navigation buttons for carousel
    const prevButton = document.getElementById('prevImage');
    const nextButton = document.getElementById('nextImage');
    
    // Check if this is from a post with multiple images
    if (currentPostIndex >= 0 && currentPostIndex < allPosts.length) {
        const post = allPosts[currentPostIndex];
        if (post.images && post.images.length > 1) {
            prevButton.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            
            // Update counter
            const modalCounter = document.getElementById('modalCounter');
            modalCounter.textContent = `${currentImageIndex + 1} / ${post.images.length}`;
        } else {
            prevButton.classList.add('hidden');
            nextButton.classList.add('hidden');
            
            // Clear counter
            const modalCounter = document.getElementById('modalCounter');
            modalCounter.textContent = '';
        }
    } else {
        prevButton.classList.add('hidden');
        nextButton.classList.add('hidden');
        
        // Clear counter
        const modalCounter = document.getElementById('modalCounter');
        modalCounter.textContent = '';
    }
    
    // Show modal
    document.getElementById('imageModal').classList.remove('hidden');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Navigate to next image in modal
function nextImage() {
    if (currentPostIndex < 0 || currentPostIndex >= allPosts.length) return;
    
    const post = allPosts[currentPostIndex];
    if (!post.images || post.images.length <= 1) return;
    
    currentImageIndex = (currentImageIndex + 1) % post.images.length;
    
    // Get the image URL
    const imagePath = post.images[currentImageIndex];
    const imageUrl = getImageUrl(imagePath);
    const fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    
    // Update modal
    const modalImage = document.getElementById('modalImage');
    modalImage.src = fullImageUrl;
    modalImage.srcset = `${fullImageUrl} 1x, ${fullImageUrl} 2x`;
    modalImage.alt = post.description || 'ຮູບພາບ';
    
    const modalDescription = document.getElementById('modalDescription');
    modalDescription.textContent = post.description || 'ບໍ່ມີຄຳອະທິບາຍ';
    
    // Update counter
    const modalCounter = document.getElementById('modalCounter');
    modalCounter.textContent = `${currentImageIndex + 1} / ${post.images.length}`;
}

// Navigate to previous image in modal
function prevImage() {
    if (currentPostIndex < 0 || currentPostIndex >= allPosts.length) return;
    
    const post = allPosts[currentPostIndex];
    if (!post.images || post.images.length <= 1) return;
    
    currentImageIndex = (currentImageIndex - 1 + post.images.length) % post.images.length;
    
    // Get the image URL
    const imagePath = post.images[currentImageIndex];
    const imageUrl = getImageUrl(imagePath);
    const fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    
    // Update modal
    const modalImage = document.getElementById('modalImage');
    modalImage.src = fullImageUrl;
    modalImage.srcset = `${fullImageUrl} 1x, ${fullImageUrl} 2x`;
    modalImage.alt = post.description || 'ຮູບພາບ';
    
    const modalDescription = document.getElementById('modalDescription');
    modalDescription.textContent = post.description || 'ບໍ່ມີຄຳອະທິບາຍ';
    
    // Update counter
    const modalCounter = document.getElementById('modalCounter');
    modalCounter.textContent = `${currentImageIndex + 1} / ${post.images.length}`;
}

// Close image modal
function closeImageModal() {
    document.getElementById('imageModal').classList.add('hidden');
    // Restore body scroll
    document.body.style.overflow = 'auto';
    // Reset indices
    currentPostIndex = -1;
    currentImageIndex = 0;
}

// Fetch data from API
async function fetchData(page = 0, append = false) {
    if (isLoading) return;
    
    try {
        isLoading = true;
        
        if (append) {
            showLoadingMore();
        } else {
            showLoading();
        }
        
        const response = await fetch(`${API_BASE_URL}/${page}/0`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const newPosts = data.items || [];
        
        if (append) {
            // Append new posts to existing ones
            allPosts = [...allPosts, ...newPosts];
        } else {
            // Replace posts with new ones
            allPosts = newPosts;
            currentPage = 0;
        }
        
        // Update posts display
        renderPosts();
        
        // Show/hide load more button
        if (newPosts.length > 0) {
            loadMoreContainer.classList.remove('hidden');
            currentPage = page;
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
        showError('ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.');
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
    
    // Set a timeout to show a slow connection message
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        if (loadingIndicator.classList.contains('hidden') === false) {
            const loadingText = loadingIndicator.querySelector('span');
            if (loadingText) {
                loadingText.textContent = 'ກຳລັງໂຫຼດຂໍ້ມູນ... (ການເຊື່ອມຕໍ່ຊ້າ)';
            }
        }
    }, 5000); // Show slow connection message after 5 seconds
}

// Hide loading indicator
function hideLoading() {
    loadingIndicator.classList.add('hidden');
    clearTimeout(loadingTimeout);
    
    // Reset loading text
    const loadingText = loadingIndicator.querySelector('span');
    if (loadingText) {
        loadingText.textContent = 'ກຳລັງໂຫຼດຂໍ້ມູນ...';
    }
}

// Show loading more indicator
function showLoadingMore() {
    loadingMoreIndicator.classList.remove('hidden');
    loadMoreContainer.classList.add('hidden');
    
    // Set a timeout to show a slow connection message
    clearTimeout(loadingTimeout);
    loadingTimeout = setTimeout(() => {
        if (loadingMoreIndicator.classList.contains('hidden') === false) {
            const loadingText = loadingMoreIndicator.querySelector('span');
            if (loadingText) {
                loadingText.textContent = 'ກຳລັງໂຫຼດຂໍ້ມູນເພີ່ມເຕີມ... (ການເຊື່ອມຕໍ່ຊ້າ)';
            }
        }
    }, 5000); // Show slow connection message after 5 seconds
}

// Hide loading more indicator
function hideLoadingMore() {
    loadingMoreIndicator.classList.add('hidden');
    clearTimeout(loadingTimeout);
    
    // Reset loading text
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
    
    // If this is the first render or we're refreshing, clear the container
    if (!hasRenderedInitialPosts || currentPage === 0) {
        postsContainer.innerHTML = '';
        hasRenderedInitialPosts = true;
    }
    
    // Create HTML for new posts only
    const newPostsHTML = allPosts.slice(postsContainer.children.length).map((post, index) => {
        // Adjust index to match the global allPosts array
        const globalIndex = postsContainer.children.length + index;
        
        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden card-hover fade-in">
                ${createImageCarousel(post.images, post._id, post.description || 'ບໍ່ມີຄຳອະທິບາຍ')}
                
                <div class="p-4">
                    <p class="text-gray-700 mb-3 line-clamp-2">${post.description || 'ບໍ່ມີຄຳອະທິບາຍ'}</p>
                    
                    <div class="flex justify-between items-center text-sm text-gray-500">
                        <div class="flex items-center cursor-pointer hover:text-blue-600" onclick="openLocationInGoogleMaps('${post.location ? post.location.replace(/'/g, "\\'") : 'ບໍ່ຮູ້ສະຖານທີ່'}', ${post.geo ? JSON.stringify(post.geo) : 'null'})" title="Click to view on Google Maps">
                            <i class="fas fa-map-marker-alt mr-1"></i>
                            <span>${post.location || 'ບໍ່ຮູ້ສະຖານທີ່'}</span>
                            <i class="fas fa-external-link-alt ml-1 text-xs"></i>
                        </div>
                        
                        <div class="flex items-center">
                            <i class="fas fa-eye mr-1"></i>
                            <span>${post.view || 0}</span>
                        </div>
                    </div>
                    
                    <div class="mt-2 text-xs text-gray-400">
                        <i class="far fa-clock mr-1"></i>
                        ${formatDate(post.createDate)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Append new posts to the container
    postsContainer.insertAdjacentHTML('beforeend', newPostsHTML);
}

// Open image modal (backward compatibility)
function openImageModal(imageUrl, description, postId, imageIndex = 0) {
    // If we have a postId and imageIndex, it's from a carousel
    if (postId && imageIndex !== undefined) {
        currentPostIndex = allPosts.findIndex(post => post._id === postId);
        currentImageIndex = imageIndex;
    }
    
    // Get full size image URL
    let fullImageUrl = imageUrl;
    if (imageUrl && imageUrl.includes('/square/')) {
        // Convert square image URL to full size
        fullImageUrl = imageUrl.replace('/square/450/', '/full/1080/');
    }
    
    // Set image source with srcset for responsive images
    const modalImage = document.getElementById('modalImage');
    if (fullImageUrl) {
        modalImage.src = fullImageUrl;
        modalImage.srcset = `${fullImageUrl} 1x, ${fullImageUrl} 2x`;
        modalImage.alt = description || 'ຮູບພາບ';
    } else {
        modalImage.src = '';
        modalImage.srcset = '';
        modalImage.alt = 'ບໍ່ມີຮູບພາບ';
    }
    
    // Set description
    const modalDescription = document.getElementById('modalDescription');
    modalDescription.textContent = description || 'ບໍ່ມີຄຳອະທິບາຍ';
    
    // Show/hide navigation buttons for carousel
    const prevButton = document.getElementById('prevImage');
    const nextButton = document.getElementById('nextImage');
    
    // Check if this is from a post with multiple images
    if (currentPostIndex >= 0 && currentPostIndex < allPosts.length) {
        const post = allPosts[currentPostIndex];
        if (post.images && post.images.length > 1) {
            prevButton.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            
            // Update counter
            const modalCounter = document.getElementById('modalCounter');
            modalCounter.textContent = `${currentImageIndex + 1} / ${post.images.length}`;
        } else {
            prevButton.classList.add('hidden');
            nextButton.classList.add('hidden');
            
            // Clear counter
            const modalCounter = document.getElementById('modalCounter');
            modalCounter.textContent = '';
        }
    } else {
        prevButton.classList.add('hidden');
        nextButton.classList.add('hidden');
        
        // Clear counter
        const modalCounter = document.getElementById('modalCounter');
        modalCounter.textContent = '';
    }
    
    // Show modal
    document.getElementById('imageModal').classList.remove('hidden');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Close image modal
function closeImageModal() {
    imageModal.classList.add('hidden');
    
    // Allow body scroll
    document.body.style.overflow = '';
}

// Open location in Google Maps
function openLocationInGoogleMaps(locationName, geoCoordinates) {
    try {
        let mapsUrl;
        
        // If we have geo coordinates, use them for more precise location
        if (geoCoordinates && Array.isArray(geoCoordinates) && geoCoordinates.length === 2) {
            const [longitude, latitude] = geoCoordinates;
            // Google Maps URL with coordinates
            mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        } else if (locationName && locationName !== 'ບໍ່ຮູ້ສະຖານທີ່') {
            // Fallback to location name if coordinates aren't available
            // Encode the location name for URL
            const encodedLocation = encodeURIComponent(locationName);
            mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
        } else {
            // Default to Laos if no location info
            mapsUrl = 'https://www.google.com/maps/place/Laos';
        }
        
        // Open in a new tab
        window.open(mapsUrl, '_blank');
    } catch (error) {
        console.error('Error opening Google Maps:', error);
        // Fallback to generic Google Maps
        window.open('https://www.google.com/maps', '_blank');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    refreshBtn.addEventListener('click', () => fetchData(0, false));
    loadMoreBtn.addEventListener('click', loadMore);
    closeModal.addEventListener('click', closeImageModal);
    
    // Modal navigation
    document.getElementById('prevImage').addEventListener('click', prevImage);
    document.getElementById('nextImage').addEventListener('click', nextImage);
    
    // Close modal when clicking outside the image
    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal) {
            closeImageModal();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('imageModal').classList.contains('hidden')) {
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