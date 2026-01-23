document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".waitlist-form");
    if (form) {
        form.addEventListener("submit", (event) => {
            event.preventDefault();
            const [nameInput, emailInput] = form.querySelectorAll("input");
            const name = nameInput?.value ?? "";
            const email = emailInput?.value ?? "";
            nameInput.value = "";
            emailInput.value = "";
            const message = `Thanks${name ? `, ${name}` : ""}! We'll reach you at ${email}.`;
            alert(message);
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

