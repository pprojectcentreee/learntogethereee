// ==================== FIREBASE SETUP ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    getDatabase,
    ref,
    set,
    get
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDAwMr6EuAAvHoz0Nb56y4c495lCtsxDlc",
    authDomain: "learn-together-66d0a.firebaseapp.com",
    databaseURL: "https://learn-together-66d0a-default-rtdb.firebaseio.com",
    projectId: "learn-together-66d0a",
    storageBucket: "learn-together-66d0a.firebasestorage.app",
    messagingSenderId: "573946117409",
    appId: "1:573946117409:web:ecaf05b4415c4f2471d260"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const provider = new GoogleAuthProvider();

// Add scopes for additional Google profile info
provider.addScope('profile');
provider.addScope('email');

// Force account selection each time
provider.setCustomParameters({
    prompt: 'select_account'
});

// ==================== GLOBAL STATE ====================
let currentUser = null;
let isSigningIn = false;

// ==================== DOM ELEMENTS ====================
const loadingScreen = document.getElementById('loading-screen');
const loginPage = document.getElementById('login-page');
const dashboardPage = document.getElementById('dashboard-page');
const googleSignInBtn = document.getElementById('google-signin-btn');

// ==================== UTILITY FUNCTIONS ====================

// Detect if on mobile device
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Show a specific page
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    page.classList.remove('hidden');
}

// Hide loading screen
function hideLoading() {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
        loadingScreen.classList.add('hidden');
    }, 500);
}

// Get time-based greeting
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 17) return 'Good Afternoon 🌤️';
    if (hour < 21) return 'Good Evening 🌅';
    return 'Good Night 🌙';
}

// ==================== TOAST NOTIFICATION ====================
window.showToast = function(message, duration = 2500) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden', 'fade-out');
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, duration);
};

// ==================== ERROR MODAL ====================
function showError(message) {
    const modal = document.getElementById('error-modal');
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message;
    modal.classList.remove('hidden');
}

window.closeErrorModal = function() {
    document.getElementById('error-modal').classList.add('hidden');
};

// ==================== AUTH STATE LISTENER ====================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        console.log('User signed in:', user.displayName);
        
        // Save user data to database
        await saveUserData(user);
        
        // Update dashboard UI
        updateDashboard(user);
        
        // Show dashboard
        showPage(dashboardPage);
        hideLoading();
    } else {
        currentUser = null;
        console.log('No user signed in');
        
        // Show login page
        showPage(loginPage);
        hideLoading();
    }
});

// Check for redirect result (for mobile sign-in)
getRedirectResult(auth)
    .then((result) => {
        if (result && result.user) {
            console.log('Redirect sign-in successful:', result.user.displayName);
            showToast(`Welcome, ${result.user.displayName}! 🎉`);
        }
    })
    .catch((error) => {
        console.error('Redirect result error:', error);
        if (error.code !== 'auth/null-user') {
            hideLoading();
            showPage(loginPage);
        }
    });

// ==================== GOOGLE SIGN IN ====================
window.signInWithGoogle = async function() {
    if (isSigningIn) return;
    isSigningIn = true;
    
    // Add loading state to button
    googleSignInBtn.classList.add('loading');
    googleSignInBtn.disabled = true;
    
    try {
        if (isMobile()) {
            // Use redirect for mobile (better UX on mobile browsers)
            await signInWithRedirect(auth, provider);
        } else {
            // Use popup for desktop
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            showToast(`Welcome, ${user.displayName}! 🎉`);
            console.log('Sign-in successful:', user);
        }
    } catch (error) {
        console.error('Sign-in error:', error);
        
        // Handle specific errors
        let errorMessage = 'Failed to sign in. Please try again.';
        
        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'Sign-in was cancelled. Please try again.';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'Pop-up was blocked. Please allow pop-ups or try again.';
                // Fallback to redirect
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (e) {
                    console.error('Redirect fallback failed:', e);
                }
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many attempts. Please wait and try again.';
                break;
            case 'auth/cancelled-popup-request':
                // User clicked button again while popup was open - ignore
                break;
            default:
                errorMessage = `Error: ${error.message}`;
        }
        
        if (error.code !== 'auth/cancelled-popup-request') {
            showError(errorMessage);
        }
    } finally {
        isSigningIn = false;
        googleSignInBtn.classList.remove('loading');
        googleSignInBtn.disabled = false;
    }
};

// ==================== CONTINUE AS GUEST ====================
window.continueAsGuest = function() {
    showToast('Guest mode - Limited features available');
    
    // Create a guest user object
    const guestUser = {
        displayName: 'Guest User',
        email: 'guest@learnlearn.app',
        photoURL: null,
        uid: 'guest-' + Date.now()
    };
    
    currentUser = guestUser;
    updateDashboard(guestUser);
    showPage(dashboardPage);
};

// ==================== SIGN OUT ====================
window.signOutUser = async function() {
    try {
        toggleProfileMenu(); // Close menu first
        
        if (currentUser && currentUser.uid && currentUser.uid.startsWith('guest-')) {
            // Guest user - just go back to login
            currentUser = null;
            showPage(loginPage);
            showToast('Signed out successfully');
            return;
        }
        
        await signOut(auth);
        showToast('Signed out successfully');
        console.log('User signed out');
    } catch (error) {
        console.error('Sign-out error:', error);
        showError('Failed to sign out. Please try again.');
    }
};

// ==================== SAVE USER DATA ====================
async function saveUserData(user) {
    try {
        const userRef = ref(database, 'users/' + user.uid);
        
        // Check if user already exists
        const snapshot = await get(userRef);
        
        const userData = {
            displayName: user.displayName || 'User',
            email: user.email || '',
            photoURL: user.photoURL || '',
            lastLogin: new Date().toISOString(),
            uid: user.uid
        };
        
        if (!snapshot.exists()) {
            // New user - set creation date
            userData.createdAt = new Date().toISOString();
            userData.stats = {
                streak: 0,
                studyHours: 0,
                completed: 0,
                xp: 0
            };
        }
        
        await set(userRef, {
            ...( snapshot.exists() ? snapshot.val() : {} ),
            ...userData
        });
        
        console.log('User data saved successfully');
    } catch (error) {
        console.error('Error saving user data:', error);
    }
}

// ==================== UPDATE DASHBOARD ====================
function updateDashboard(user) {
    // Greeting
    const greetingEl = document.getElementById('greeting-text');
    greetingEl.textContent = getGreeting();
    
    // User name
    const displayName = user.displayName || 'User';
    const firstName = displayName.split(' ')[0];
    document.getElementById('user-display-name').textContent = firstName;
    
    // Avatar
    const userPhoto = document.getElementById('user-photo');
    const avatarFallback = document.getElementById('avatar-fallback');
    const avatarInitial = document.getElementById('avatar-initial');
    
    if (user.photoURL) {
        userPhoto.src = user.photoURL;
        userPhoto.style.display = 'block';
        avatarFallback.style.display = 'none';
    } else {
        userPhoto.style.display = 'none';
        avatarFallback.style.display = 'flex';
        avatarInitial.textContent = displayName.charAt(0).toUpperCase();
    }
    
    // Profile menu
    const menuPhoto = document.getElementById('menu-photo');
    if (user.photoURL) {
        menuPhoto.src = user.photoURL;
        menuPhoto.style.display = 'block';
    } else {
        menuPhoto.style.display = 'none';
    }
    
    document.getElementById('menu-name').textContent = displayName;
    document.getElementById('menu-email').textContent = user.email || 'No email';
}

// ==================== PROFILE MENU ====================
window.toggleProfileMenu = function() {
    const menu = document.getElementById('profile-menu');
    const overlay = document.getElementById('profile-overlay');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        overlay.classList.remove('hidden');
    } else {
        menu.classList.add('hidden');
        overlay.classList.add('hidden');
    }
};

// ==================== PLACEHOLDER FUNCTIONS ====================
window.showNotifications = function() {
    showToast('No new notifications 📭');
};

window.showProfile = function() {
    const menu = document.getElementById('profile-menu');
    if (!menu.classList.contains('hidden')) {
        toggleProfileMenu();
    }
    showToast('Profile page coming soon! 👤');
};

window.showSettings = function() {
    toggleProfileMenu();
    showToast('Settings coming soon! ⚙️');
};

// ==================== HAPTIC FEEDBACK (Mobile) ====================
function haptic() {
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

// Add haptic feedback to all buttons
document.addEventListener('click', (e) => {
    if (e.target.closest('button')) {
        haptic();
    }
});

// ==================== SERVICE WORKER (PWA Ready) ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // You can register a service worker here for PWA support
        // navigator.serviceWorker.register('/sw.js');
    });
}

// ==================== PREVENT PULL TO REFRESH ====================
document.addEventListener('touchmove', function(e) {
    if (e.target.closest('.dash-content')) return;
}, { passive: true });

console.log('🚀 Learn Together App Initialized');
