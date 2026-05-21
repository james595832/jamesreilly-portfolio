// ===== STATE MANAGEMENT =====
const STATE = {
    theme: localStorage.getItem('theme') || 'light',
    currentSection: 'work',
    activeFilters: new Set(['all']),
    activeExpFilters: new Set(['all']),
    isAuthenticated: localStorage.getItem('adminAuth') === 'true',
    projects: [],
    experiments: []
};

// ===== SAMPLE DATA =====
const SAMPLE_PROJECTS = [
    {
        id: 'finding-hope',
        slug: 'finding-hope',
        title: 'Finding Hope',
        description: 'A generative, AI-driven 3D data visualization of the world\'s daily emotional heartbeat.',
        image: 'img/finding-hope.png',
        tags: ['ai', 'ui', 'ux'],
        industry: ['data-vis'],
        featured: true,
        year: '2026',
        order: 0
    },
    {
        id: '2',
        slug: 'healthcare-dashboard',
        title: 'Healthcare Dashboard',
        description: 'Patient management system for medical professionals.',
        image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=533&fit=crop',
        tags: ['ui', 'ia'],
        industry: ['health'],
        featured: false,
        year: '2023',
        order: 2
    },
    {
        id: '3',
        slug: 'fashion-ecommerce',
        title: 'Fashion E-commerce',
        description: 'Mobile-first shopping experience for luxury fashion brand.',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=533&fit=crop',
        tags: ['ui', 'ux'],
        industry: ['fashion'],
        featured: false,
        year: '2023',
        order: 3
    },
    {
        id: '4',
        slug: 'ai-investment',
        title: 'AI Investment Advisor',
        description: 'Conversational interface for automated investment recommendations.',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=533&fit=crop',
        tags: ['ai', 'ux'],
        industry: ['finance'],
        featured: false,
        year: '2024',
        order: 4
    },
    {
        id: '5',
        slug: 'payment-flow',
        title: 'Payment Flow Optimization',
        description: 'Redesigned checkout experience reducing abandonment by 34%.',
        image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=533&fit=crop',
        tags: ['ux', 'ia'],
        industry: ['finance'],
        featured: false,
        year: '2023',
        order: 5
    }
];

const SAMPLE_EXPERIMENTS = [
    {
        id: '1',
        title: 'Building a Design System with AI',
        excerpt: 'Exploring how AI can help generate and maintain design tokens, component documentation, and accessibility guidelines.',
        category: 'design-systems',
        date: '2024-12-15',
        image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&h=600&fit=crop',
        published: true,
        featured: true
    },
    {
        id: '2',
        title: 'Rapid Prototyping with LLMs',
        excerpt: 'Testing the limits of using large language models to go from concept to working prototype in hours instead of days.',
        category: 'prototypes',
        date: '2024-12-01',
        image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&h=600&fit=crop',
        published: true,
        featured: false
    },
    {
        id: '3',
        title: 'AI-Assisted User Research Analysis',
        excerpt: 'Building tools to help synthesize interview transcripts and identify patterns across hundreds of user conversations.',
        category: 'tools',
        date: '2024-11-20',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=600&fit=crop',
        published: true,
        featured: false
    },
    {
        id: '4',
        title: 'Automating Design QA',
        excerpt: 'Creating AI workflows to catch accessibility issues, design inconsistencies, and component misuse before code review.',
        category: 'tools',
        date: '2024-11-05',
        image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop',
        published: true,
        featured: false
    },
    {
        id: '5',
        title: 'Generative UI Experiments',
        excerpt: 'Pushing boundaries of AI-generated interfaces while maintaining design system constraints and accessibility standards.',
        category: 'prototypes',
        date: '2024-10-22',
        image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop',
        published: true,
        featured: false
    },
    {
        id: '6',
        title: 'Token Architecture for AI Systems',
        excerpt: 'Developing semantic design token structures that both humans and AI can understand and manipulate effectively.',
        category: 'design-systems',
        date: '2024-10-10',
        image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=800&h=600&fit=crop',
        published: true,
        featured: false
    }
];

// ===== INITIALIZATION =====
function init() {
    // Load data from localStorage or use sample data
    STATE.projects = JSON.parse(localStorage.getItem('projects')) || SAMPLE_PROJECTS;
    STATE.experiments = JSON.parse(localStorage.getItem('experiments')) || SAMPLE_EXPERIMENTS;
    
    // Force update projects to include slugs
    localStorage.setItem('projects', JSON.stringify(SAMPLE_PROJECTS));
    STATE.projects = SAMPLE_PROJECTS;
    
    // Update experiments to include new fields
    localStorage.setItem('experiments', JSON.stringify(SAMPLE_EXPERIMENTS));
    STATE.experiments = SAMPLE_EXPERIMENTS;

    // Set initial theme
    document.documentElement.setAttribute('data-theme', STATE.theme);
    
    // Render content
    renderProjects();
    renderExperiments();
    
    // Set up event listeners
    setupEventListeners();
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Navigation
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Mobile menu
    document.getElementById('menuToggle').addEventListener('click', toggleMobileMenu);
    
    // Project filters
    document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', handleProjectFilter);
    });
    
    // Experiment filters
    document.querySelectorAll('[data-filter-exp]').forEach(btn => {
        btn.addEventListener('click', handleExperimentFilter);
    });
    
    // Admin panel
    document.getElementById('adminToggle').addEventListener('click', toggleAdminPanel);
    document.getElementById('closeAdmin').addEventListener('click', closeAdminPanel);
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Check if already authenticated
    if (STATE.isAuthenticated) {
        showAdminContent();
    }
}

// ===== THEME =====
function toggleTheme() {
    STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', STATE.theme);
    localStorage.setItem('theme', STATE.theme);
}

// ===== NAVIGATION =====
function handleNavigation(e) {
    e.preventDefault();
    const sectionName = e.target.dataset.section;
    
    if (!sectionName) return;
    
    // Check if project page is open
    const projectPage = document.getElementById('projectPage');
    const isProjectPageOpen = projectPage && !projectPage.classList.contains('hidden');
    
    // Close project page if open
    if (isProjectPageOpen) {
        projectPage.classList.add('hidden');
        currentProject = null;
        isDetailViewActive = false;
        
        // If navigating to work, just show it (no transition needed)
        if (sectionName === 'work') {
            const workSection = document.getElementById('work');
            if (workSection) {
                workSection.classList.remove('hidden');
            }
            STATE.currentSection = 'work';
            return;
        }
    }
    
    // Don't transition if already on this section
    if (STATE.currentSection === sectionName) {
        return;
    }
    
    const currentSection = document.getElementById(STATE.currentSection);
    const nextSection = document.getElementById(sectionName);
    
    if (!currentSection || !nextSection) return;
    
    // Fade out current section
    currentSection.style.opacity = '0';
    currentSection.style.transform = 'translateY(-20px)';
    
    // After transition, swap sections
    setTimeout(() => {
        // Hide current section
        currentSection.classList.add('hidden');
        currentSection.style.opacity = '';
        currentSection.style.transform = '';
        
        // Prepare next section for entrance
        nextSection.classList.remove('hidden');
        nextSection.classList.add('section--entering');
        
        // Trigger reflow
        nextSection.offsetHeight;
        
        // Animate in
        requestAnimationFrame(() => {
            nextSection.classList.remove('section--entering');
            nextSection.classList.add('section--active');
        });
        
        // Clean up after animation
        setTimeout(() => {
            nextSection.classList.remove('section--active');
        }, 400);
        
    }, 400);
    
    // Update active nav link
    document.querySelectorAll('.nav__link').forEach(link => {
        link.classList.remove('nav__link--active');
    });
    e.target.classList.add('nav__link--active');
    
    // Close mobile menu
    document.getElementById('navMenu').classList.remove('nav__menu--open');
    
    // Smooth scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Update state
    STATE.currentSection = sectionName;
}

function toggleMobileMenu() {
    const menu = document.getElementById('navMenu');
    const toggle = document.getElementById('menuToggle');
    const isOpen = menu.classList.toggle('nav__menu--open');
    toggle.setAttribute('aria-expanded', isOpen);
}

// ===== FILTERS =====
function handleProjectFilter(e) {
    const filter = e.target.dataset.filter;
    
    // Clear all filters and set only the clicked one (radio button behavior)
    STATE.activeFilters.clear();
    STATE.activeFilters.add(filter);
    
    // Update button states
    document.querySelectorAll('[data-filter]').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.classList.add('filter-btn--active');
        } else {
            btn.classList.remove('filter-btn--active');
        }
    });
    
    renderProjects();
}

function handleExperimentFilter(e) {
    const filter = e.target.dataset.filterExp;
    
    // Clear all filters and set new one
    STATE.activeExpFilters.clear();
    STATE.activeExpFilters.add(filter);
    
    // Update button states
    document.querySelectorAll('[data-filter-exp]').forEach(btn => {
        if (btn.dataset.filterExp === filter) {
            btn.classList.add('filter-btn--active');
        } else {
            btn.classList.remove('filter-btn--active');
        }
    });
    
    renderExperiments();
}

// ===== RENDERING =====
function renderProjects() {
    const grid = document.getElementById('projectsGrid');
    
    let filteredProjects = STATE.projects;
    
    // Apply filters
    if (!STATE.activeFilters.has('all')) {
        filteredProjects = STATE.projects.filter(project => {
            const projectFilters = [...project.tags, ...project.industry];
            return Array.from(STATE.activeFilters).some(filter => 
                projectFilters.includes(filter)
            );
        });
    }
    
    if (filteredProjects.length === 0) {
        grid.innerHTML = '<div class="empty-state">No projects match your filters.</div>';
        return;
    }
    
    grid.innerHTML = filteredProjects
        .sort((a, b) => a.order - b.order)
        .map(project => `
            <article class="project ${project.featured ? 'project--featured' : ''}" data-slug="${project.slug}" tabindex="0">
                <div class="project__image-container">
                    <img 
                        src="${project.image}" 
                        alt="${project.title}"
                        class="project__image"
                        loading="lazy"
                    >
                </div>
                <h3 class="project__title">${project.title}</h3>
                <p class="project__description">${project.description}</p>
                <div class="project__meta">
                    ${[...project.tags, ...project.industry].map(tag => 
                        `<span class="project__tag">${tag}</span>`
                    ).join('')}
                    <span class="project__tag">${project.year}</span>
                </div>
            </article>
        `).join('');
    
    // Re-initialize project showcase after rendering (if function exists)
    if (typeof initProjectShowcaseCards === 'function') {
        initProjectShowcaseCards();
    }
}

function renderExperiments() {
    const grid = document.getElementById('experimentsGrid');
    
    let filteredExperiments = STATE.experiments.filter(exp => exp.published);
    
    // Apply filters
    if (!STATE.activeExpFilters.has('all')) {
        filteredExperiments = filteredExperiments.filter(exp =>
            STATE.activeExpFilters.has(exp.category)
        );
    }
    
    // Sort by date (newest first)
    filteredExperiments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (filteredExperiments.length === 0) {
        grid.innerHTML = '<div class="empty-state">No experiments match your filters.</div>';
        return;
    }
    
    grid.innerHTML = filteredExperiments.map((exp, index) => {
        const date = new Date(exp.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // First item is featured (newest)
        const isFeatured = index === 0;
        // Create some visual variety - make some items taller
        const isLarge = !isFeatured && index % 3 === 0;
        
        return `
            <article class="experiment ${isFeatured ? 'experiment--featured' : ''} ${isLarge ? 'experiment--large' : ''}" tabindex="0">
                <div class="experiment__image-container">
                    <img 
                        src="${exp.image}" 
                        alt="${exp.title}"
                        class="experiment__image"
                        loading="lazy"
                    >
                </div>
                <div class="experiment__meta">
                    <span class="experiment__category">${exp.category.replace('-', ' ')}</span>
                    <time class="experiment__date" datetime="${exp.date}">${date}</time>
                </div>
                <h3 class="experiment__title">${exp.title}</h3>
                <p class="experiment__excerpt">${exp.excerpt}</p>
            </article>
        `;
    }).join('');
}

// ===== ADMIN PANEL =====
function toggleAdminPanel() {
    document.getElementById('adminPanel').classList.add('admin-panel--open');
}

function closeAdminPanel() {
    document.getElementById('adminPanel').classList.remove('admin-panel--open');
}

function handleLogin(e) {
    e.preventDefault();
    const password = document.getElementById('password').value;
    
    // Simple password check (in production, use proper authentication)
    if (password === 'admin') {
        STATE.isAuthenticated = true;
        localStorage.setItem('adminAuth', 'true');
        showAdminContent();
    } else {
        alert('Incorrect password');
    }
}

function showAdminContent() {
    document.getElementById('adminAuth').classList.add('hidden');
    document.getElementById('adminContent').classList.remove('hidden');
}

// ===== FOOTER CLOCK =====
function updateFooterTime() {
    const timeEl = document.getElementById('footerTime');
    if (timeEl) {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }
}

function initFooter() {
    // Set current year
    const yearEl = document.getElementById('footerYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
    
    // Update time immediately and then every second
    updateFooterTime();
    setInterval(updateFooterTime, 1000);
}

// ===== FAQ ACCORDION =====
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq__item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq__question');
        const answer = item.querySelector('.faq__answer');
        const answerContent = item.querySelector('.faq__answer-content');
        
        if (!question || !answer || !answerContent) return;
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    const otherAnswer = otherItem.querySelector('.faq__answer');
                    const otherQuestion = otherItem.querySelector('.faq__question');
                    if (otherAnswer) otherAnswer.style.maxHeight = null;
                    if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
                }
            });
            
            // Toggle current item
            if (isActive) {
                item.classList.remove('active');
                answer.style.maxHeight = null;
                question.setAttribute('aria-expanded', 'false');
            } else {
                item.classList.add('active');
                answer.style.maxHeight = answerContent.scrollHeight + 'px';
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

function initContactObfuscation() {
    // Handle email obfuscation
    const emailLinks = document.querySelectorAll('[data-contact="email"]');
    emailLinks.forEach(link => {
        const span = link.querySelector('[data-email]');
        if (span) {
            const email = span.dataset.email;
            const domain = span.dataset.domain;
            
            // Show actual email on click
            link.addEventListener('click', (e) => {
                e.preventDefault();
                span.textContent = `${email}@${domain}`;
                link.href = `mailto:${email}@${domain}`;
                // Redirect after showing
                setTimeout(() => {
                    window.location.href = link.href;
                }, 100);
            });
            
            // Show on hover
            link.addEventListener('mouseenter', () => {
                span.textContent = `${email}@${domain}`;
            });
            
            link.addEventListener('mouseleave', () => {
                if (!link.hasAttribute('data-revealed')) {
                    span.textContent = 'Email';
                }
            });
        }
    });

    // Handle phone obfuscation
    const phoneLinks = document.querySelectorAll('[data-contact="phone"]');
    phoneLinks.forEach(link => {
        const span = link.querySelector('[data-phone]');
        if (span) {
            const phone = span.dataset.phone;
            const code = span.dataset.code;
            const fullNumber = `${code} ${phone}`;
            
            // Show actual phone on click
            link.addEventListener('click', (e) => {
                e.preventDefault();
                span.textContent = fullNumber;
                link.href = `tel:${code}${phone}`;
                // Redirect after showing
                setTimeout(() => {
                    window.location.href = link.href;
                }, 100);
            });
            
            // Show on hover
            link.addEventListener('mouseenter', () => {
                span.textContent = fullNumber;
            });
            
            link.addEventListener('mouseleave', () => {
                if (!link.hasAttribute('data-revealed')) {
                    span.textContent = 'Phone';
                }
            });
        }
    });
}

function initScrollShadow() {
    const nav = document.querySelector('.nav');
    
    function handleScroll() {
        if (window.scrollY > 10) {
            nav.classList.add('nav--scrolled');
        } else {
            nav.classList.remove('nav--scrolled');
        }
    }
    
    // Check on load
    handleScroll();
    
    // Check on scroll
    window.addEventListener('scroll', handleScroll, { passive: true });
}

// ===== CAROUSEL =====
function initCarousel(viewportId, prevBtnId, nextBtnId, progressId, sectionId) {
    const container = document.getElementById(viewportId);
    const prevBtn = document.getElementById(prevBtnId);
    const nextBtn = document.getElementById(nextBtnId);
    const progressContainer = document.getElementById(progressId);
    
    if (!container) return;
    
    const slides = container.querySelectorAll('.carousel__slide');
    
    if (!slides.length) return;
    
    // Generate progress dots
    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'carousel__progress-dot';
        if (index === 0) dot.classList.add('carousel__progress-dot--active');
        dot.setAttribute('data-index', index);
        dot.setAttribute('aria-label', `Go to chapter ${index + 1}`);
        progressContainer.appendChild(dot);
    });
    
    const progressDots = progressContainer.querySelectorAll('.carousel__progress-dot');
    let currentIndex = 0;
    
    function scrollToSlide(index) {
        if (index < 0 || index >= slides.length) return;
        
        currentIndex = index;
        const slideWidth = slides[0].offsetWidth + 32; // slide width + gap
        container.scrollTo({
            left: slideWidth * index,
            behavior: 'smooth'
        });
        
        updateProgress();
        updateButtons();
    }
    
    function updateProgress() {
        progressDots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('carousel__progress-dot--active');
            } else {
                dot.classList.remove('carousel__progress-dot--active');
            }
        });
    }
    
    function updateButtons() {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === slides.length - 1;
    }
    
    // Navigation buttons
    prevBtn.addEventListener('click', () => scrollToSlide(currentIndex - 1));
    nextBtn.addEventListener('click', () => scrollToSlide(currentIndex + 1));
    
    // Progress dots
    progressDots.forEach(dot => {
        dot.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            scrollToSlide(index);
        });
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Only handle if the respective section is visible
        const section = document.getElementById(sectionId);
        if (section && !section.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                scrollToSlide(currentIndex - 1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                scrollToSlide(currentIndex + 1);
            }
        }
    });
    
    // Update current index on scroll (for touch/swipe)
    let scrollTimeout;
    container.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const slideWidth = slides[0].offsetWidth + 32;
            const newIndex = Math.round(container.scrollLeft / slideWidth);
            if (newIndex !== currentIndex) {
                currentIndex = newIndex;
                updateProgress();
                updateButtons();
            }
        }, 100);
    });
    
    // Initialize
    updateButtons();
}

// ===== PROJECT SHOWCASE =====
const PROJECTS_DATA = {
    'finding-hope': {
        slug: 'finding-hope',
        title: 'Finding Hope',
        subtitle: "Finding Hope is a real-time editorial canvas mapping the world's emotional temperature. Live news RSS headlines are parsed via secure Gemini AI onto a 3D WebGL globe. Framed in a brutalist layout, the piece pairs tactile data viz with an evolving, responsive analogue synthesiser soundtrack.",
        tags: ['AI', 'WebGL', 'WebAudio'],
        heroImage: 'img/finding-hope.png',
        images: [
            'img/finding-hope.mov',
            'img/finding-hope-1.jpg',
            'img/finding-hope-2.jpg'
        ],
        client: 'Personal Project',
        sector: 'Generative Art & Data Vis',
        year: '2026',
        team: ['James Reilly'],
        content: `
            <h2>Mapping the World's Emotional Pulse in Real-Time</h2>
            <p>Finding Hope is an interactive, real-time editorial data canvas that registers and visualises the emotional temperature of the world. The experience acts as a digital mirror to global events, translating current headlines into high-fidelity tactile feedback. Juxtaposing the raw reality of global news with procedural golden spikes representing each country's 'Hope Reserves,' the piece invites users to explore the delicate balance of contemporary civic sentiment.</p>
            <p>Built on a strict, high-contrast brutalist grid, the visual layout rejects generic data visualisation templates in favour of a premium design canvas. It features dense masonry word clouds, ultra-thin 3D data needles, and country labels wrapped flush with the sphere’s terrain.</p>
            <p>Technically, a Vercel server-less proxy scrapes global RSS feeds on-the-fly, securely calling Gemini to map sentiment without exposing API keys. This drives a spatial WebAudio context with responsive Blade Runner-style synth chords and tactile hover clicks.</p>
        `
    },
    'healthcare-dashboard': {
        slug: 'healthcare-dashboard',
        title: 'Healthcare Dashboard',
        subtitle: 'Patient management system for medical professionals',
        tags: ['UI', 'IA'],
        heroImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1600&h=900&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&h=800&fit=crop',
        ],
        client: 'Healthcare Provider',
        sector: 'Healthcare',
        year: '2023',
        team: ['James Reilly'],
        content: `
            <h2>The Challenge</h2>
            <p>Healthcare providers needed a unified dashboard to manage patient information across multiple systems while maintaining HIPAA compliance.</p>
            
            <h2>The Solution</h2>
            <p>A comprehensive patient management interface that consolidates data from multiple sources into a single, intuitive view. The system improved patient care coordination and reduced administrative overhead by 30%.</p>
        `
    },
    'fashion-ecommerce': {
        slug: 'fashion-ecommerce',
        title: 'Fashion E-commerce',
        subtitle: 'Mobile-first shopping experience for luxury fashion brand',
        tags: ['UI', 'UX'],
        heroImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&h=900&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1445205170230-053b83016050?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&h=800&fit=crop',
        ],
        client: 'Luxury Fashion Brand',
        sector: 'Fashion & Retail',
        year: '2023',
        team: ['James Reilly', 'Product Team'],
        content: `
            <h2>The Challenge</h2>
            <p>Creating a premium mobile shopping experience that reflects the brand's luxury positioning while ensuring seamless checkout and personalization.</p>
            
            <h2>The Approach</h2>
            <p>Focused on immersive product photography, intuitive navigation, and a streamlined checkout process optimized for mobile devices.</p>
            
            <h2>The Results</h2>
            <p>Mobile conversion rates increased by 45% and average order value grew by 28% within the first quarter of launch.</p>
        `
    },
    'ai-investment': {
        slug: 'ai-investment',
        title: 'AI Investment Advisor',
        subtitle: 'Conversational interface for automated investment recommendations',
        tags: ['AI', 'UX'],
        heroImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&h=900&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&h=800&fit=crop',
        ],
        client: 'FinTech Startup',
        sector: 'Financial Technology',
        year: '2024',
        team: ['James Reilly', 'AI Team'],
        content: `
            <h2>The Challenge</h2>
            <p>Making sophisticated investment advice accessible through natural language interactions while maintaining regulatory compliance and transparency.</p>
            
            <h2>The Solution</h2>
            <p>A conversational AI interface that guides users through investment decisions with clear explanations, risk disclosures, and personalized recommendations based on their goals and risk tolerance.</p>
        `
    },
    'payment-flow': {
        slug: 'payment-flow',
        title: 'Payment Flow Optimization',
        subtitle: 'Redesigned checkout experience reducing abandonment by 34%',
        tags: ['UX', 'IA'],
        heroImage: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1600&h=900&fit=crop',
        images: [
            'https://images.unsplash.com/photo-1556742400-b5a6f032b7c9?w=1200&h=800&fit=crop',
            'https://images.unsplash.com/photo-1556742111-a301076d9d18?w=1200&h=800&fit=crop',
        ],
        client: 'E-commerce Platform',
        sector: 'Payments',
        year: '2023',
        team: ['James Reilly'],
        content: `
            <h2>The Challenge</h2>
            <p>High cart abandonment rates and customer complaints about complex checkout processes were impacting revenue.</p>
            
            <h2>The Approach</h2>
            <p>Through user testing and analytics, we identified key friction points in the payment flow and redesigned the experience to be more intuitive and trustworthy.</p>
            
            <h2>The Impact</h2>
            <p>Cart abandonment decreased by 34%, checkout completion time improved by 42%, and customer satisfaction scores increased significantly.</p>
        `
    }
};

let currentProject = null;
let isDetailViewActive = false;

function openProjectPage(projectSlug) {
    console.log('openProjectPage called with slug:', projectSlug);
    const project = PROJECTS_DATA[projectSlug];
    if (!project) {
        console.error('Project not found:', projectSlug);
        return;
    }

    currentProject = project;
    isDetailViewActive = false;

    // Populate project page
    document.getElementById('projectTitle').textContent = project.title;
    document.getElementById('projectSubtitle').textContent = project.subtitle;
    
    const tagsHTML = project.tags.map(tag => `<span class="project__tag">${tag}</span>`).join('');
    document.getElementById('projectTags').innerHTML = tagsHTML;

    // Populate all images
    const imagesHTML = [project.heroImage, ...project.images].map(media => {
        if (media.endsWith('.mov') || media.endsWith('.mp4')) {
            return `<div>
                <video src="${media}" autoplay loop muted playsinline aria-label="${project.title}"></video>
            </div>`;
        }
        return `<div>
            <img src="${media}" alt="${project.title}" loading="lazy">
        </div>`;
    }).join('');
    document.getElementById('projectImages').innerHTML = imagesHTML;

    // Populate text content
    const metadataHTML = `
        <div class="project__metadata">
            <div class="project__metadata-item">
                <div class="project__metadata-label">Client</div>
                <div class="project__metadata-value">${project.client}</div>
            </div>
            <div class="project__metadata-item">
                <div class="project__metadata-label">Sector</div>
                <div class="project__metadata-value">${project.sector}</div>
            </div>
            <div class="project__metadata-item">
                <div class="project__metadata-label">Year</div>
                <div class="project__metadata-value">${project.year}</div>
            </div>
            <div class="project__metadata-item">
                <div class="project__metadata-label">Team</div>
                <div class="project__metadata-value">${project.team.join(', ')}</div>
            </div>
        </div>
    `;
    document.getElementById('projectText').innerHTML = project.content + metadataHTML;

    // Reset expanded state
    document.querySelector('.project-container').classList.remove('expanded');
    document.getElementById('projectToggle').textContent = 'About the project +';
    document.getElementById('projectText').classList.add('hidden');

    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });

    // Show project page with transition
    const projectPage = document.getElementById('projectPage');
    projectPage.classList.remove('hidden');
    projectPage.classList.add('section--entering');
    
    // Trigger reflow
    projectPage.offsetHeight;
    
    // Animate in
    requestAnimationFrame(() => {
        projectPage.classList.remove('section--entering');
        projectPage.classList.add('section--active');
    });
    
    // Clean up after animation
    setTimeout(() => {
        projectPage.classList.remove('section--active');
    }, 400);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Update URL hash
    window.location.hash = `project/${projectSlug}`;
}

function closeProjectPage() {
    console.log('closeProjectPage called');
    
    const projectPage = document.getElementById('projectPage');
    const workSection = document.getElementById('work');
    
    // Fade out project page
    projectPage.style.opacity = '0';
    projectPage.style.transform = 'translateY(-20px)';
    
    // After transition, swap sections
    setTimeout(() => {
        projectPage.classList.add('hidden');
        projectPage.style.opacity = '';
        projectPage.style.transform = '';
        
        // Show work section with transition
        workSection.classList.remove('hidden');
        workSection.classList.add('section--entering');
        
        // Trigger reflow
        workSection.offsetHeight;
        
        // Animate in
        requestAnimationFrame(() => {
            workSection.classList.remove('section--entering');
            workSection.classList.add('section--active');
        });
        
        // Clean up after animation
        setTimeout(() => {
            workSection.classList.remove('section--active');
        }, 400);
        
    }, 400);
    
    currentProject = null;
    isDetailViewActive = false;
    STATE.currentSection = 'work';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Clear URL hash
    history.pushState('', document.title, window.location.pathname + window.location.search);
}

function toggleProjectDetail() {
    console.log('toggleProjectDetail called');
    if (!currentProject) {
        console.error('No current project');
        return;
    }

    const container = document.querySelector('.project-container');
    const toggleBtn = document.getElementById('projectToggle');
    const textElement = document.getElementById('projectText');
    const isExpanded = container.classList.contains('expanded');
    console.log('isExpanded:', isExpanded);

    if (isExpanded) {
        // Collapse
        container.classList.remove('expanded');
        toggleBtn.textContent = 'About the project +';
        // Let CSS transition happen before hiding
        setTimeout(() => {
            textElement.classList.add('hidden');
        }, 800); // Increased to match transition duration + delay
        isDetailViewActive = false;

        // Update URL
        const slug = Object.keys(PROJECTS_DATA).find(key => PROJECTS_DATA[key] === currentProject);
        if (slug) {
            window.location.hash = `project/${slug}`;
        }
    } else {
        // Expand
        textElement.classList.remove('hidden');
        // Small delay to ensure display change happens before animation
        setTimeout(() => {
            container.classList.add('expanded');
        }, 10);
        toggleBtn.textContent = 'About the project ×';
        isDetailViewActive = true;

        // Update URL
        const slug = Object.keys(PROJECTS_DATA).find(key => PROJECTS_DATA[key] === currentProject);
        if (slug) {
            window.location.hash = `project/${slug}/detail`;
        }
    }
}

function initProjectShowcaseCards() {
    const cards = document.querySelectorAll('.project[data-slug]');
    
    // Make project cards clickable
    cards.forEach((card) => {
        const slug = card.dataset.slug;
        
        if (!slug) return;
        
        // Mark as initialized to avoid double-binding
        if (card.dataset.initialized === 'true') return;
        
        card.style.cursor = 'pointer';
        card.dataset.initialized = 'true';
        
        // Add click listener
        card.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (PROJECTS_DATA[slug]) {
                openProjectPage(slug);
            }
        });
    });
}

function initProjectShowcase() {
    console.log('initProjectShowcase called');
    
    // Close button
    const closeBtn = document.getElementById('projectClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeProjectPage);
        console.log('Close button listener attached');
    } else {
        console.error('projectClose button not found');
    }

    // Toggle button
    const toggleBtn = document.getElementById('projectToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleProjectDetail);
        console.log('Toggle button listener attached');
    } else {
        console.error('projectToggle button not found');
    }

    // Initialize cards
    initProjectShowcaseCards();

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (isDetailViewActive) {
                toggleProjectDetail();
            } else if (currentProject) {
                closeProjectPage();
            }
        }
    });

    // Handle hash on load
    const hash = window.location.hash;
    if (hash.startsWith('#project/')) {
        const slug = hash.replace('#project/', '').split('/')[0];
        if (PROJECTS_DATA[slug]) {
            openProjectPage(slug);
            // If hash includes /detail, expand the project
            if (hash.includes('/detail')) {
                setTimeout(() => {
                    toggleProjectDetail();
                }, 500);
            }
        }
    }
}

// ===== START APPLICATION =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        initFooter();
        // Initialize both carousels
        initCarousel('carouselViewportAbout', 'carouselPrevAbout', 'carouselNextAbout', 'carouselProgressAbout', 'about');
        initCarousel('carouselViewport', 'carouselPrev', 'carouselNext', 'carouselProgress', 'contact');
        initProjectShowcase();
        initFAQ();
        initContactObfuscation();
        initScrollShadow();
    });
} else {
    init();
    initFooter();
    // Initialize both carousels
    initCarousel('carouselViewportAbout', 'carouselPrevAbout', 'carouselNextAbout', 'carouselProgressAbout', 'about');
    initCarousel('carouselViewport', 'carouselPrev', 'carouselNext', 'carouselProgress', 'contact');
    initProjectShowcase();
    initFAQ();
    initContactObfuscation();
    initScrollShadow();
}
