document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("waitlistForm");
    const formMessage = document.getElementById("formMessage");
    
    if (form) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            
            const submitButton = form.querySelector("button[type='submit']");
            const originalButtonText = submitButton.textContent;
            
            // Disable button and show loading state
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
            formMessage.textContent = "";
            formMessage.className = "form-message";
            
            // Get form data
            const formData = new FormData(form);
            const data = {
                name: formData.get("name"),
                email: formData.get("email"),
                _to: formData.get("_to"),
                _subject: formData.get("_subject"),
                _replyto: formData.get("_replyto")
            };
            
            try {
                // Send to Vercel serverless function
                const response = await fetch("/api/waitlist", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                });
                
                let result;
                try {
                    result = await response.json();
                } catch (jsonError) {
                    // If response is not JSON, get text
                    const text = await response.text();
                    throw new Error(text || `Server error: ${response.status}`);
                }
                
                if (response.ok) {
                    // Success
                    formMessage.textContent = `Thanks${data.name ? `, ${data.name}` : ""}! We'll reach you at ${data.email}.`;
                    formMessage.className = "form-message success";
                    form.reset();
                } else {
                    throw new Error(result.error || `Server error: ${response.status}`);
                }
            } catch (error) {
                // Error - show specific error message
                console.error("Error:", error);
                let errorMessage = "Something went wrong. Please try again or email us directly at info@smutsail.com";
                
                // Try to get more specific error message
                if (error.message) {
                    errorMessage = error.message;
                } else if (error instanceof TypeError && error.message.includes('fetch')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                }
                
                formMessage.textContent = errorMessage;
                formMessage.className = "form-message error";
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        });
    }

    // Value Carousel - Horizontal Scrolling
    const carousel = document.querySelector(".value-carousel");
    const carouselWrapper = document.querySelector(".value-carousel-wrapper");
    if (carousel && carouselWrapper) {
        const cards = carousel.querySelectorAll(".value-card");
        const indicators = document.querySelectorAll(".indicator");
        const prevBtn = document.querySelector(".prev-btn");
        const nextBtn = document.querySelector(".next-btn");
        let currentIndex = 0;
        let autoRotateInterval;
        let cardsPerView = 3;

        // Calculate cards per view based on screen size
        function updateCardsPerView() {
            if (window.innerWidth <= 640) {
                cardsPerView = 1;
            } else if (window.innerWidth <= 968) {
                cardsPerView = 2;
            } else {
                cardsPerView = 3;
            }
        }

        function updateCarousel() {
            const cardWidth = cards[0]?.offsetWidth || 0;
            const gap = 24; // 1.5rem in pixels
            const translateX = -(currentIndex * (cardWidth + gap));
            carousel.style.transform = `translateX(${translateX}px)`;

            // Update indicators
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle("active", index === currentIndex);
            });
        }

        function nextSlide() {
            updateCardsPerView();
            const maxIndex = Math.max(0, cards.length - cardsPerView);
            currentIndex = (currentIndex + 1) % (maxIndex + 1);
            updateCarousel();
        }

        function prevSlide() {
            updateCardsPerView();
            const maxIndex = Math.max(0, cards.length - cardsPerView);
            currentIndex = currentIndex === 0 ? maxIndex : currentIndex - 1;
            updateCarousel();
        }

        function goToSlide(index) {
            updateCardsPerView();
            const maxIndex = Math.max(0, cards.length - cardsPerView);
            currentIndex = Math.min(index, maxIndex);
            updateCarousel();
            resetAutoRotate();
        }

        function startAutoRotate() {
            autoRotateInterval = setInterval(nextSlide, 4000);
        }

        function resetAutoRotate() {
            clearInterval(autoRotateInterval);
            startAutoRotate();
        }

        // Button handlers
        if (nextBtn) {
            nextBtn.addEventListener("click", () => {
                nextSlide();
                resetAutoRotate();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener("click", () => {
                prevSlide();
                resetAutoRotate();
            });
        }

        // Indicator click handlers
        indicators.forEach((indicator, index) => {
            indicator.addEventListener("click", () => goToSlide(index));
        });

        // Pause on hover
        const carouselContainer = document.querySelector(".value-carousel-container");
        if (carouselContainer) {
            carouselContainer.addEventListener("mouseenter", () => {
                clearInterval(autoRotateInterval);
            });
            carouselContainer.addEventListener("mouseleave", () => {
                startAutoRotate();
            });
        }

        // Handle window resize
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateCardsPerView();
                updateCarousel();
            }, 250);
        });

        // Initialize
        updateCardsPerView();
        updateCarousel();
        startAutoRotate();
    }
});

