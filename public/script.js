// ==========================================
// CONFIGURATION & STATE
// ==========================================
const API_URL = window.location.origin; // Dynamically use the current host (localhost or Vercel)
// Retrieve user from LocalStorage if they logged in previously
let currentUser = JSON.parse(localStorage.getItem('timeswap_user'));

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateNav();
    // Redirect based on auth state
    if (currentUser) {
        showPage('slots');
    } else {
        showPage('home');
    }
});

// ==========================================
// NAVIGATION & UI LOGIC
// ==========================================

let allSlots = []; // Store slots for filtering

// Handles switching between virtual "pages"
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    // Show requested page
    document.getElementById(pageId).classList.add('active');

    // Trigger specific logic based on the page opened
    if (pageId === 'slots') fetchSlots();
    if (pageId === 'dashboard') loadDashboard();
    
    // Reset auth view to login if entering login page
    if (pageId === 'login') {
        toggleAuth('login');
    }

    // Auto-close sidebar on mobile
    const navLinks = document.getElementById('navLinks');
    const overlay = document.getElementById('navOverlay');
    if (navLinks.classList.contains('show')) {
        toggleMenu();
    }

    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Switches the mobile sidebar
function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    const overlay = document.getElementById('navOverlay');
    const menuToggle = document.getElementById('menuToggle');
    
    navLinks.classList.toggle('show');
    overlay.classList.toggle('show');
    
    // Change icon if open
    if (navLinks.classList.contains('show')) {
        menuToggle.innerText = '✕';
    } else {
        menuToggle.innerText = '☰';
    }
}

// Smooth scroll to element
function scrollToSection(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Switches between Login and Register boxes
function toggleAuth(mode) {
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');

    if (mode === 'register') {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
    } else {
        loginBox.style.display = 'block';
        registerBox.style.display = 'none';
    }
}

// Updates navbar to show/hide Login and Logout buttons
function updateNav() {
    if (currentUser) {
        document.getElementById('auth-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'block';
    } else {
        document.getElementById('auth-link').style.display = 'block';
        document.getElementById('logout-link').style.display = 'none';
    }
}

// ==========================================
// AUTHENTICATION LOGIC (Controllers via API)
// ==========================================

async function handleRegister(e) {
    e.preventDefault(); // Prevent page reload
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();

        if (res.ok) {
            alert('Registration successful! Please login.');
            toggleAuth('login');
        } else {
            alert(data.message || 'Error registering');
        }
    } catch (error) {
        console.error(error);
        alert('Server error during registration');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (res.ok) {
            // Save user in state and localStorage
            currentUser = data.user;
            localStorage.setItem('timeswap_user', JSON.stringify(currentUser));
            updateNav();
            document.getElementById('loginForm').reset();
            showPage('slots'); // Redirect to slots
        } else {
            alert(data.message || 'Invalid credentials');
        }
    } catch (error) {
        console.error(error);
        alert('Server error during login');
    }
}

function logout() {
    localStorage.removeItem('timeswap_user');
    currentUser = null;
    updateNav();
    showPage('home'); // Redirect to home
}

// ==========================================
// SLOT MANAGEMENT LOGIC
// ==========================================

// Fetch and display available/released slots
async function fetchSlots() {
    try {
        const res = await fetch(`${API_URL}/slots`);
        allSlots = await res.json();
        renderSlots(allSlots);
    } catch (error) {
        console.error('Error fetching slots:', error);
        document.getElementById('slots-container').innerHTML = '<p style="color:red">Failed to connect to server. Is Node.js running?</p>';
    }
}

// Filters slots based on search and status
function filterSlots() {
    const searchTerm = document.getElementById('slotSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    const filtered = allSlots.filter(slot => {
        const matchesSearch = slot.time.toLowerCase().includes(searchTerm);
        const matchesStatus = statusFilter === 'all' 
            ? (slot.status === 'available' || slot.status === 'released')
            : slot.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    renderSlots(filtered);
}

// Helper to render slots to the container
function renderSlots(slotsToRender) {
    const container = document.getElementById('slots-container');
    container.innerHTML = ''; 

    const bookableSlots = slotsToRender.filter(s => s.status === 'available' || s.status === 'released');

    if (bookableSlots.length === 0) {
        container.innerHTML = '<p class="no-results">No matching available slots found.</p>';
        return;
    }

    bookableSlots.forEach(slot => {
        const card = document.createElement('div');
        card.className = `card ${slot.status}`;

        const isReleased = slot.status === 'released';
        const message = isReleased
            ? 'Someone freed up this slot. Claim it quickly!'
            : 'Standard available time slot.';

        card.innerHTML = `
            <h3>🕒 ${slot.time}</h3>
            <span class="status-badge status-${slot.status}">${slot.status}</span>
            <p>${message}</p>
            <button class="btn primary" onclick="bookSlot('${slot._id}')">Book Now</button>
        `;
        container.appendChild(card);
    });
}

// Load user's booked slots into the dashboard
async function loadDashboard() {
    if (!currentUser) {
        alert('Please login to view your dashboard');
        showPage('login');
        return;
    }

    document.getElementById('userNameDisplay').innerText = currentUser.name;

    try {
        const res = await fetch(`${API_URL}/slots`);
        const slots = await res.json();
        const container = document.getElementById('my-slots-container');
        container.innerHTML = '';

        // Filter slots that belong to the current user and are booked
        const mySlots = slots.filter(slot =>
            slot.userId &&
            slot.userId._id === currentUser._id &&
            slot.status === 'booked'
        );

        // Update Stats
        document.getElementById('bookedCount').innerText = mySlots.length;
        // Community Impact: Total slots released in the entire system
        const communityShared = slots.filter(s => s.status === 'released').length;
        document.getElementById('historyCount').innerText = communityShared;

        if (mySlots.length === 0) {
            container.innerHTML = '<p class="no-results">You have no upcoming appointments booked.</p>';
            return;
        }

        mySlots.forEach(slot => {
            const card = document.createElement('div');
            card.className = 'card booked';
            card.innerHTML = `
                <h3>🕒 ${slot.time}</h3>
                <span class="status-badge status-booked">Booked by You</span>
                <p>If you cannot make it to this appointment, please release it so others can use it.</p>
                <button class="btn warning" onclick="releaseSlot('${slot._id}')">Release Slot</button>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Book a slot
async function bookSlot(slotId) {
    if (!currentUser) {
        alert('You must be logged in to book a slot.');
        showPage('login');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/book`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slotId, userId: currentUser._id })
        });
        const data = await res.json();

        if (res.ok) {
            alert('Slot booked successfully!');
            fetchSlots(); // Refresh UI
        } else {
            alert(data.message || 'Failed to book slot');
        }
    } catch (error) {
        console.error(error);
        alert('Server error while booking');
    }
}

// Release a booked slot
async function releaseSlot(slotId) {
    // Confirm action (optional but good for UX)
    if (!confirm("Are you sure you want to release this slot? You will lose this booking.")) return;

    try {
        const res = await fetch(`${API_URL}/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slotId, userId: currentUser._id })
        });
        const data = await res.json();

        if (res.ok) {
            alert('Slot released successfully! It is now available for others.');
            loadDashboard(); // Refresh UI
        } else {
            alert(data.message || 'Failed to release slot');
        }
    } catch (error) {
        console.error(error);
        alert('Server error while releasing');
    }
}

/*
// ==========================================
// ADMIN LOGIC (Commented out for now)
// ==========================================

// Call admin seed endpoint to create dummy data
async function seedDatabase() {
    const msgElement = document.getElementById('admin-message');
    msgElement.innerText = 'Seeding database...';
    msgElement.style.color = 'black';

    try {
        const res = await fetch(`${API_URL}/admin/seed`, { method: 'POST' });
        const data = await res.json();

        if (res.ok) {
            msgElement.innerText = '✅ ' + data.message;
            msgElement.style.color = 'green';
        } else {
            msgElement.innerText = '❌ Failed to seed database.';
            msgElement.style.color = 'red';
        }
    } catch (error) {
        console.error('Error seeding DB:', error);
        msgElement.innerText = '❌ Error: Could not connect to server.';
        msgElement.style.color = 'red';
    }
}
*/
