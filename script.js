/* =========================================
   script.js - COMPLETE (Auth, Booking, Support)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ---------------------------------------------------------
    // 0. FIREBASE CONFIGURATION (Must be inside here!)
    // ---------------------------------------------------------
    const firebaseConfig = {
        apiKey: "AIzaSyAz5jt1yefwtZC0W2WvCMD7YHh31U7ZL0g",
        authDomain: "saferent-car.firebaseapp.com",
        projectId: "saferent-car",
        storageBucket: "saferent-car.firebasestorage.app",
        messagingSenderId: "992172726560",
        appId: "1:992172726560:web:402e9bed24fd38d90e9f45"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ---------------------------------------------------------
    // HELPER FUNCTIONS
    // ---------------------------------------------------------
    const formatD = (d) => d && !isNaN(d) ? d.toISOString().split('T')[0] : "Invalid Date";
    
    function parseDate(str) {
        if(!str) return new Date();
        const [datePart, timePart, ampm] = str.split(' ');
        const [day, month, year] = datePart.split('/');
        let [hours, minutes] = timePart.split(':');
        if (ampm === 'PM' && hours !== '12') hours = parseInt(hours) + 12;
        if (ampm === 'AM' && hours === '12') hours = 0;
        return new Date(year, month - 1, day, hours, minutes);
    }

    function generateDetailedPDF(booking, diffDays, rentalFee, insurance, taxes, phone, method) {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) return;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(200, 78, 8); doc.rect(0, 0, 210, 40, 'F'); 
        doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text("SafeRent Car", 20, 25);
        doc.setFontSize(12); doc.text("Booking Confirmation", 190, 25, { align: "right" });

        // Details
        doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text("Rental Details", 20, 60);
        doc.setFontSize(10);
        doc.text("Car Model:", 20, 70); doc.text(booking.carName, 90, 70);
        doc.text("Location:", 20, 80); doc.text(booking.location, 90, 80);
        doc.text("Pick-up / Drop-off:", 20, 90); doc.text(`${booking.dateRange} (${diffDays} days)`, 90, 90);
        doc.text("Contact:", 20, 100); doc.text(phone || "N/A", 90, 100);
        doc.text("Payment:", 20, 110); doc.text(method || "Credit Card", 90, 110);
        
        doc.line(20, 120, 190, 120);
        
        // Summary
        doc.setFontSize(14); doc.text("Payment Summary", 20, 140);
        doc.setFontSize(10);
        doc.text(`Rental Fee (${diffDays} days):`, 20, 150); doc.text(`RM${rentalFee.toFixed(2)}`, 190, 150, { align: "right" });
        doc.text("Insurance:", 20, 160); doc.text(`RM${insurance.toFixed(2)}`, 190, 160, { align: "right" });
        doc.text("Taxes & Fees:", 20, 170); doc.text(`RM${taxes.toFixed(2)}`, 190, 170, { align: "right" });
        
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("TOTAL PAID:", 20, 190);
        doc.setTextColor(200, 78, 8); 
        doc.text(`RM${booking.totalPrice}`, 190, 190, { align: "right" });

        doc.save(`SafeRent_${booking.id}.pdf`);
    }

    // ---------------------------------------------------------
    // 1. MAP & LOCATION LOGIC
    // ---------------------------------------------------------
    const mapElement = document.getElementById('dashboard-map');
    const locationSelect = document.getElementById('pickup-location');
    const airports = [
        { name: "Kuala Lumpur Intl Airport", code: "KUL", lat: 2.7456, lng: 101.7099 },
        { name: "Subang Airport", code: "SZB", lat: 3.1306, lng: 101.5490 },
        { name: "Penang Intl Airport", code: "PEN", lat: 5.2971, lng: 100.2769 },
        { name: "Langkawi Intl Airport", code: "LGK", lat: 6.3333, lng: 99.7333 },
        { name: "Senai Intl Airport", code: "JHB", lat: 1.6413, lng: 103.6700 },
        { name: "Kota Bharu Airport", code: "KBR", lat: 6.1681, lng: 102.2936 },
        { name: "Kuala Terengganu Airport", code: "TGG", lat: 5.3826, lng: 103.1030 },
        { name: "Ipoh Airport", code: "IPH", lat: 4.5680, lng: 101.0920 },
        { name: "Kuantan Airport", code: "KUA", lat: 3.7697, lng: 103.2094 },
        { name: "Alor Setar Airport", code: "AOR", lat: 6.1944, lng: 100.4008 },
        { name: "Malacca Intl Airport", code: "MKZ", lat: 2.2656, lng: 102.2528 }
    ];

    if (locationSelect) {
        locationSelect.innerHTML = '<option value="" disabled selected>Select Pick-up Location</option>';
        airports.forEach(ap => {
            const cleanName = `${ap.name} (${ap.code})`;
            const option = document.createElement('option');
            option.value = cleanName; option.text = cleanName;
            locationSelect.appendChild(option);
        });
    }

    if (mapElement) {
        const map = L.map('dashboard-map').setView([4.2105, 101.9758], 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CARTO' }).addTo(map);

        const carIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
        });

        airports.forEach(ap => {
            L.marker([ap.lat, ap.lng], { icon: carIcon }).addTo(map).bindPopup(`<b>${ap.name}</b><br>Available`);
        });
    }

    // ---------------------------------------------------------
    // 2. CALENDAR
    // ---------------------------------------------------------
    if (document.getElementById("pickup-date")) {
        flatpickr("#pickup-date", { enableTime: true, dateFormat: "d/m/Y h:i K", defaultHour: 10 });
        flatpickr("#dropoff-date", { enableTime: true, dateFormat: "d/m/Y h:i K", defaultHour: 10 });
    }

    // ---------------------------------------------------------
    // 3. AUTH LOGIC (Signup, Login, Reset, Protect)
    // ---------------------------------------------------------
    
    // Reset Password
    const forgotLink = document.getElementById('link-forgot-pass');
    const resetModal = document.getElementById('reset-modal');
    const closeResetBtn = document.getElementById('close-reset-modal');
    const sendResetBtn = document.getElementById('btn-send-reset');

    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            const loginEmail = document.getElementById('login-email');
            const resetInput = document.getElementById('reset-email-input');
            if(loginEmail && resetInput && loginEmail.value) resetInput.value = loginEmail.value;
            if(resetModal) resetModal.style.display = 'flex';
        });
    }
    if (closeResetBtn) closeResetBtn.addEventListener('click', () => { if(resetModal) resetModal.style.display = 'none'; });
    if (sendResetBtn) {
        sendResetBtn.addEventListener('click', () => {
            const email = document.getElementById('reset-email-input').value;
            if (!email) { alert("Enter email."); return; }
            auth.sendPasswordResetEmail(email)
                .then(() => { alert("Check your email!"); resetModal.style.display = 'none'; })
                .catch(err => alert(err.message));
        });
    }

    // Signup
    const signupBtn = document.getElementById('btn-signup-action');
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const pass = document.getElementById('signup-pass').value;
            const name = document.getElementById('signup-name').value;
            const age = document.getElementById('signup-age').value;
            const country = document.getElementById('signup-country').value;

            if (email && pass && name) {
                auth.createUserWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        user.sendEmailVerification();
                        return db.collection("users").doc(user.uid).set({
                            fullName: name, email: email, age: age, country: country, createdAt: new Date()
                        });
                    })
                    .then(() => auth.signOut())
                    .then(() => {
                        alert("Account created! Please verify your email before logging in.");
                        window.location.href = 'login.html';
                    })
                    .catch((error) => alert(error.message));
            } else { alert("Please fill in all fields."); }
        });
    }

    // Login
    const loginBtn = document.getElementById('btn-login-action');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.querySelector('input[type="text"]').value || document.querySelector('input[type="email"]').value;
            const pass = document.querySelector('input[type="password"]').value;

            if (email && pass) {
                auth.signInWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        if (userCredential.user.emailVerified) {
                            window.location.href = 'index.html';
                        } else {
                            auth.signOut();
                            alert("Email not verified. Please check your inbox.");
                        }
                    })
                    .catch((error) => alert("Login Failed: " + error.message));
            } else { alert("Enter email and password."); }
        });
    }

    // Logout
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => { window.location.href = 'login.html'; });
        });
    });

    // Page Protection
    auth.onAuthStateChanged((user) => {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        const isPublic = path.includes('login') || path.includes('signup') || path.includes('verify');
        const isPrivate = path.includes('index') || page === "" || path.includes('my-bookings');

        if (user) {
            if (!user.emailVerified && isPrivate) {
                auth.signOut().then(() => window.location.href = 'login.html');
            } else if (user.emailVerified && isPublic) {
                window.location.href = 'index.html';
            }
        } else {
            if (isPrivate) window.location.href = 'login.html';
        }
    });

    // ---------------------------------------------------------
    // 4. BOOKING & PAYMENT LOGIC
    // ---------------------------------------------------------
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.setItem('rentalLocation', document.getElementById('pickup-location').value);
            sessionStorage.setItem('pickupDate', document.getElementById('pickup-date').value);
            sessionStorage.setItem('dropoffDate', document.getElementById('dropoff-date').value);
            window.location.href = 'car-list.html';
        });
    }

    document.querySelectorAll('.btn-select').forEach(button => {
        button.addEventListener('click', function() {
            sessionStorage.setItem('selectedCarName', this.getAttribute('data-name'));
            sessionStorage.setItem('selectedCarPrice', this.getAttribute('data-price'));
            window.location.href = 'booking.html';
        });
    });

    // Booking Summary & Payment
    const bookingSummary = document.querySelector('.booking-card');
    if (bookingSummary) {
        const location = sessionStorage.getItem('rentalLocation') || "Kuala Lumpur Intl Airport (KUL)";
        const pickupStr = sessionStorage.getItem('pickupDate') || "05/12/2025 10:00 AM";
        const dropoffStr = sessionStorage.getItem('dropoffDate') || "10/12/2025 11:00 AM";
        const carName = sessionStorage.getItem('selectedCarName') || "Toyota Vios";
        const carPrice = parseFloat(sessionStorage.getItem('selectedCarPrice')) || 35;

        const date1 = parseDate(pickupStr);
        const date2 = parseDate(dropoffStr);
        let diffDays = Math.ceil(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24)) || 1;
        if(diffDays < 1) diffDays = 1;

        const rentalFee = carPrice * diffDays;
        const insurance = 25.00;
        const taxes = 15.50;
        const total = rentalFee + insurance + taxes;

        document.getElementById('display-car').textContent = carName;
        document.getElementById('display-location').textContent = location;
        document.getElementById('display-dates').textContent = `${formatD(date1)} to ${formatD(date2)}`;
        document.getElementById('label-days').textContent = `Rental Fee (${diffDays} days):`;
        document.getElementById('display-rental-fee').textContent = `RM${rentalFee.toFixed(2)}`;
        document.getElementById('display-total').textContent = `RM${total.toFixed(2)}`;
        
        const payBtn = document.getElementById('btn-pay-text');
        payBtn.textContent = `Confirm & Pay RM${total.toFixed(2)}`;

        const modal = document.getElementById('payment-modal');
        const closeModal = document.getElementById('close-modal');
        const finalPayBtn = document.getElementById('btn-final-pay');
        let selectedMethod = null;

        payBtn.addEventListener('click', () => {
             const user = auth.currentUser;
             if (!user) { alert("Please login first."); window.location.href = 'login.html'; return; }
             if (!user.emailVerified) { alert("Verify email first."); return; }
             modal.style.display = 'flex';
        });

        if (closeModal) closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
        window.addEventListener('click', (e) => { if (e.target == modal) modal.style.display = 'none'; });

        window.selectPayment = function(element, method) {
            document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');
            selectedMethod = method;
            finalPayBtn.disabled = false;
            finalPayBtn.textContent = `Pay RM${total.toFixed(2)}`;
            finalPayBtn.style.cursor = "pointer";
        };

        if (finalPayBtn) {
            finalPayBtn.addEventListener('click', () => {
                const user = auth.currentUser;
                const phoneInput = document.querySelector('.payment-form-box input[placeholder="123 456 7890"]');
                finalPayBtn.textContent = "Processing..."; finalPayBtn.disabled = true;

                const newBooking = {
                    carName, location, dateRange: `${formatD(date1)} to ${formatD(date2)}`,
                    totalPrice: total.toFixed(2), phone: phoneInput ? phoneInput.value : "",
                    status: "Active", paymentMethod: selectedMethod, createdAt: new Date()
                };

                db.collection("users").doc(user.uid).collection("bookings").add(newBooking)
                .then((docRef) => {
                    newBooking.id = docRef.id.substring(0, 8).toUpperCase();
                    generateDetailedPDF(newBooking, diffDays, rentalFee, insurance, taxes, newBooking.phone, selectedMethod);
                    modal.style.display = 'none';
                    setTimeout(() => { window.location.href = 'my-bookings.html'; }, 1000);
                })
                .catch((err) => { alert("Error: " + err.message); finalPayBtn.disabled = false; });
            });
        }
    }

    // ---------------------------------------------------------
    // 5. MY BOOKINGS
    // ---------------------------------------------------------
    const bookingsListContainer = document.getElementById('bookings-list');
    if (bookingsListContainer) {
        auth.onAuthStateChanged((user) => {
            if (user && user.emailVerified) {
                bookingsListContainer.innerHTML = '<p style="color:white;">Loading...</p>';
                db.collection("users").doc(user.uid).collection("bookings").orderBy("createdAt", "desc").get()
                .then((snap) => {
                    const bookings = [];
                    snap.forEach(doc => {
                        const d = doc.data(); d.id = doc.id.substring(0, 8).toUpperCase(); d.realDocId = doc.id; bookings.push(d);
                    });
                    renderBookings(bookings);
                });
            } else { bookingsListContainer.innerHTML = '<p style="color:white;">Please log in.</p>'; }
        });

        function renderBookings(bookings) {
            document.getElementById('bookings-title').textContent = `MY BOOKINGS (${bookings.length} Total)`;
            bookingsListContainer.innerHTML = ''; 
            if(bookings.length === 0) { bookingsListContainer.innerHTML = '<p style="color:gray;">No bookings found.</p>'; return; }

            bookings.forEach(booking => {
                const badgeClass = booking.status === "Active" ? "active" : "completed";
                const btnHtml = booking.status === "Active" 
                    ? `<button class="btn-cancel" data-doc-id="${booking.realDocId}">Cancel</button>` 
                    : `<button class="btn-receipt">Download Receipt</button>`;
                
                bookingsListContainer.innerHTML += `
                    <div class="booking-card">
                        <div class="card-top"><h3>${booking.status === "Active" ? "Upcoming" : "Past"} Rental</h3><span class="status-badge ${badgeClass}">${booking.status}</span></div>
                        <div class="card-body">
                            <div class="car-info"><h4>${booking.carName}</h4><p class="detail-text">ID: ${booking.id}</p><p class="detail-text">Dates: ${booking.dateRange}</p><p class="detail-text">Location: ${booking.location}</p></div>
                            <div class="price-info"><p>Total: RM${booking.totalPrice}</p></div>
                        </div>
                        <div class="card-actions"><a href="#">View Details</a>${btnHtml}</div>
                    </div>`;
            });
            
            document.querySelectorAll('.btn-cancel').forEach(btn => {
                btn.addEventListener('click', function() {
                    if(confirm("Cancel?")) {
                        db.collection("users").doc(auth.currentUser.uid).collection("bookings").doc(this.getAttribute('data-doc-id')).delete().then(() => location.reload());
                    }
                });
            });
            document.querySelectorAll('.btn-receipt').forEach(btn => btn.addEventListener('click', () => alert("Receipt download started...")));
        }
    }

    // ---------------------------------------------------------
    // 6. SUPPORT PAGE LOGIC (CORRECTLY PLACED INSIDE!)
    // ---------------------------------------------------------
    const supportForm = document.getElementById('support-form');
    if (supportForm) {
        
        // Auto-fill Logic
        auth.onAuthStateChanged(user => {
            if (user) {
                // Fill Email
                const emailField = document.getElementById('sup-email');
                if(emailField) emailField.value = user.email;

                // Fill Name from Firestore
                db.collection("users").doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const nameField = document.getElementById('sup-name');
                        if (nameField) nameField.value = doc.data().fullName;
                    }
                });
            }
        });

        // Send Logic
        supportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.querySelector('.btn-submit');
            btn.textContent = "Sending..."; btn.disabled = true;

            db.collection("messages").add({
                name: document.getElementById('sup-name').value,
                email: document.getElementById('sup-email').value,
                subject: document.getElementById('sup-subject').value,
                message: document.getElementById('sup-message').value,
                createdAt: new Date()
            })
            .then(() => {
                alert("Message sent!");
                supportForm.reset();
                if (auth.currentUser) { // Refill email
                    document.getElementById('sup-email').value = auth.currentUser.email;
                    db.collection("users").doc(auth.currentUser.uid).get().then(doc => { if(doc.exists) document.getElementById('sup-name').value = doc.data().fullName; });
                }
                btn.textContent = "Send Message"; btn.disabled = false;
            })
            .catch((err) => { alert(err.message); btn.disabled = false; });
        });
    }

// CLOSING BRACKET FOR DOMContentLoaded
});
