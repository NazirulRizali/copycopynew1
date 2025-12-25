/* =========================================
   script.js - COMPLETE (Auth, Booking, Support, Location, Validation, PDF, Profile, Vendor)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // ---------------------------------------------------------
    // 0. FIREBASE CONFIGURATION
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

    // PDF GENERATOR
    function generateDetailedPDF(booking, diffDays, rentalFee, insurance, taxes, phone, method) {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("PDF Library not loaded. Please refresh the page.");
            return;
        }
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

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const userIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                });
                L.marker([pos.coords.latitude, pos.coords.longitude], { icon: userIcon }).addTo(map).bindPopup("<b>You</b>");
            }, () => console.log("Geo denied"));
        }
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

    // ============================================
    // UPDATED SIGNUP LOGIC (Saves Role)
    // ============================================
    const signupBtn = document.getElementById('btn-signup-action');
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const pass = document.getElementById('signup-pass').value;
            const name = document.getElementById('signup-name').value;
            const age = document.getElementById('signup-age').value;
            const country = document.getElementById('signup-country').value;
            const countryCode = document.getElementById('signup-country-code').value;
            const phoneNum = document.getElementById('signup-phone').value;
            const terms = document.getElementById('signup-terms').checked;
            
            // Get Role from Dropdown
            const role = document.getElementById('signup-role').value;

            if (!terms) {
                alert("You must agree to the Terms and Conditions.");
                return;
            }

            if (email && pass && name && phoneNum && age && country) {
                auth.createUserWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        user.sendEmailVerification();
                        
                        // SAVE ROLE TO DATABASE
                        return db.collection("users").doc(user.uid).set({
                            fullName: name, 
                            email: email, 
                            age: age, 
                            country: country, 
                            phone: `${countryCode} ${phoneNum}`,
                            role: role, // Saves "customer" or "vendor"
                            createdAt: new Date()
                        });
                    })
                    .then(() => auth.signOut())
                    .then(() => {
                        alert("Account created! Please verify your email before logging in.");
                        window.location.href = 'login.html';
                    })
                    .catch((error) => alert(error.message));
            } else { 
                alert("Please fill in all fields."); 
            }
        });
    }

    // ============================================
    // UPDATED LOGIN LOGIC (Checks Role)
    // ============================================
    const loginBtn = document.getElementById('btn-login-action');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            
            // The role the user claims to be right now
            const selectedRole = document.getElementById('login-role').value; 

            if (email && pass) {
                auth.signInWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        const user = userCredential.user;

                        if (!user.emailVerified) {
                            auth.signOut();
                            alert("Email not verified. Please check your inbox.");
                            return;
                        }

                        // CHECK DATABASE FOR REAL ROLE
                        db.collection("users").doc(user.uid).get().then((doc) => {
                            if (doc.exists) {
                                const registeredRole = doc.data().role || 'customer'; // Default to customer if missing

                                if (registeredRole === selectedRole) {
                                    // MATCH: Access Granted
                                    if (registeredRole === 'vendor') {
                                        window.location.href = 'vendor.html';
                                    } else {
                                        window.location.href = 'index.html';
                                    }
                                } else {
                                    // MISMATCH: Access Denied
                                    auth.signOut();
                                    alert(`Login Failed: You are registered as a '${registeredRole.toUpperCase()}', but you tried to login as a '${selectedRole.toUpperCase()}'. Please change your selection.`);
                                }
                            } else {
                                // Fallback if user doc deleted
                                auth.signOut();
                                alert("User record not found.");
                            }
                        });
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

    // ============================================
    // UPDATED PAGE PROTECTION (Role-Based)
    // ============================================
    auth.onAuthStateChanged((user) => {
        const path = window.location.pathname;
        const page = path.split("/").pop();
        
        // Define which pages belong to who
        const publicPages = ['login.html', 'signup.html', 'verify.html'];
        const customerPages = ['index.html', 'my-bookings.html', 'profile.html', 'car-list.html', 'booking.html', 'support.html'];
        const vendorPages = ['vendor.html'];

        if (user) {
            // User is logged in
            if (!user.emailVerified && !publicPages.some(p => path.includes(p))) {
                // If email not verified, kick to login
                auth.signOut().then(() => window.location.href = 'login.html');
                return;
            }

            // CHECK ROLE PERMISSION
            db.collection("users").doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const role = doc.data().role || 'customer';

                    // 1. If Vendor tries to access Customer pages -> Redirect to Vendor Dashboard
                    if (role === 'vendor' && customerPages.some(p => path.includes(p))) {
                        window.location.href = 'vendor.html';
                    }

                    // 2. If Customer tries to access Vendor pages -> Redirect to Home
                    if (role === 'customer' && vendorPages.some(p => path.includes(p))) {
                        alert("Access Denied: Vendors Only.");
                        window.location.href = 'index.html';
                    }
                }
            });

            // Prevent logged-in users from seeing Login/Signup
            if (publicPages.some(p => path.includes(p))) {
                if (!path.includes('verify.html')) window.location.href = 'index.html';
            }

        } else {
            // User is NOT logged in
            // If they try to access ANY private page (Customer OR Vendor), kick to login
            if (customerPages.some(p => path.includes(p)) || vendorPages.some(p => path.includes(p))) {
                window.location.href = 'login.html';
            }
        }
    });

    // ---------------------------------------------------------
    // 4. BOOKING & PAYMENT LOGIC (UPDATED WITH RESTRICTION)
    // ---------------------------------------------------------
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Get Values
            const locationVal = document.getElementById('pickup-location').value;
            const pickupVal = document.getElementById('pickup-date').value;
            const dropoffVal = document.getElementById('dropoff-date').value;

            // 2. CHECK: RESTRICTION
            // If any value is missing, Alert and Stop.
            if (!locationVal || !pickupVal || !dropoffVal) {
                alert("Please select a Pick-up Location, Pick-up Date, and Drop-off Date to continue.");
                return; // Stop execution here
            }

            // 3. Save & Redirect (Only happens if check passes)
            sessionStorage.setItem('rentalLocation', locationVal);
            sessionStorage.setItem('pickupDate', pickupVal);
            sessionStorage.setItem('dropoffDate', dropoffVal);
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
                finalPayBtn.textContent = "Processing..."; finalPayBtn.disabled = true;

                // 1. Fetch User Profile to get the Phone Number (Since we deleted inputs)
                db.collection("users").doc(user.uid).get().then((doc) => {
                    let userPhone = "N/A";
                    if (doc.exists) {
                        userPhone = doc.data().phone || "N/A";
                    }

                    const newBooking = {
                        carName, 
                        location, 
                        dateRange: `${formatD(date1)} to ${formatD(date2)}`,
                        totalPrice: total.toFixed(2), 
                        phone: userPhone, // Uses stored phone
                        status: "Active", 
                        paymentMethod: selectedMethod, 
                        createdAt: new Date()
                    };

                    // 2. Save Booking
                    return db.collection("users").doc(user.uid).collection("bookings").add(newBooking)
                        .then((docRef) => {
                            newBooking.id = docRef.id.substring(0, 8).toUpperCase();
                            
                            // 3. Generate PDF Download
                            generateDetailedPDF(newBooking, diffDays, rentalFee, insurance, taxes, newBooking.phone, selectedMethod);
                            
                            modal.style.display = 'none';
                            setTimeout(() => { window.location.href = 'my-bookings.html'; }, 2000);
                        });
                })
                .catch((err) => { 
                    alert("Error: " + err.message); 
                    finalPayBtn.disabled = false; 
                    finalPayBtn.textContent = "Pay Now";
                });
            });
        }
    }

    // ---------------------------------------------------------
    // 5. MY BOOKINGS (UPDATED WITH PDF GENERATOR)
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
                        const d = doc.data(); 
                        d.id = doc.id.substring(0, 8).toUpperCase(); 
                        d.realDocId = doc.id; 
                        bookings.push(d);
                    });
                    renderBookings(bookings);
                });
            } else { bookingsListContainer.innerHTML = '<p style="color:white;">Please log in.</p>'; }
        });

        function renderBookings(bookings) {
            document.getElementById('bookings-title').textContent = `MY BOOKINGS (${bookings.length} Total)`;
            bookingsListContainer.innerHTML = ''; 
            
            if(bookings.length === 0) { 
                bookingsListContainer.innerHTML = '<p style="color:gray;">No bookings found.</p>'; 
                return; 
            }

            // Loop through bookings with index
            bookings.forEach((booking, index) => {
                const badgeClass = booking.status === "Active" ? "active" : "completed";
                const btnHtml = booking.status === "Active" 
                    ? `<button class="btn-cancel" data-doc-id="${booking.realDocId}">Cancel</button>` 
                    : `<button class="btn-receipt">Download Receipt</button>`;
                
                // Added data-index to View Details button
                bookingsListContainer.innerHTML += `
                    <div class="booking-card">
                        <div class="card-top">
                            <h3>${booking.status === "Active" ? "Upcoming" : "Past"} Rental</h3>
                            <span class="status-badge ${badgeClass}">${booking.status}</span>
                        </div>
                        <div class="card-body">
                            <div class="car-info">
                                <h4>${booking.carName}</h4>
                                <p class="detail-text">ID: ${booking.id}</p>
                                <p class="detail-text">Dates: ${booking.dateRange}</p>
                                <p class="detail-text">Location: ${booking.location}</p>
                            </div>
                            <div class="price-info">
                                <p>Total: RM${booking.totalPrice}</p>
                            </div>
                        </div>
                        <div class="card-actions">
                            <a href="#" class="btn-view-details" data-index="${index}">View Details</a>
                            ${btnHtml}
                        </div>
                    </div>`;
            });

            // LOGIC FOR VIEW DETAILS PDF
            document.querySelectorAll('.btn-view-details').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault(); // Stop page jump
                    const index = this.getAttribute('data-index');
                    const booking = bookings[index];

                    // 1. Recalculate Days
                    const dates = booking.dateRange.split(' to ');
                    const d1 = new Date(dates[0]);
                    const d2 = new Date(dates[1]);
                    const diffTime = Math.abs(d2 - d1);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

                    // 2. Recalculate Costs
                    const insurance = 25.00;
                    const taxes = 15.50;
                    const total = parseFloat(booking.totalPrice);
                    const rentalFee = total - insurance - taxes;

                    // 3. Generate PDF
                    generateDetailedPDF(booking, diffDays, rentalFee, insurance, taxes, booking.phone, booking.paymentMethod);
                });
            });
            
            // CANCEL LOGIC
            document.querySelectorAll('.btn-cancel').forEach(btn => {
                btn.addEventListener('click', function() {
                    if(confirm("Cancel this booking?")) {
                        db.collection("users").doc(auth.currentUser.uid)
                          .collection("bookings").doc(this.getAttribute('data-doc-id'))
                          .delete().then(() => location.reload());
                    }
                });
            });
            
            // DOWNLOAD RECEIPT LOGIC (Optional reuse)
            document.querySelectorAll('.btn-receipt').forEach(btn => btn.addEventListener('click', () => alert("Click 'View Details' to download receipt.")));
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

    // ---------------------------------------------------------
    // 7. PROFILE PAGE LOGIC (NEW)
    // ---------------------------------------------------------
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        // A. Load User Data
        auth.onAuthStateChanged(user => {
            if (user) {
                // Fill Email (Auth Data)
                document.getElementById('pro-email').value = user.email;

                // Fill Other Details (Firestore Data)
                db.collection("users").doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        document.getElementById('pro-name').value = data.fullName || "";
                        document.getElementById('pro-phone').value = data.phone || "";
                        document.getElementById('pro-age').value = data.age || "";
                        document.getElementById('pro-country').value = data.country || "MY";
                    }
                }).catch(err => console.error("Error fetching profile:", err));
            } else {
                // If not logged in, kick them out
                window.location.href = 'login.html';
            }
        });

        // B. Save Changes
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = "Saving...";
            btn.disabled = true;

            const user = auth.currentUser;
            if (user) {
                db.collection("users").doc(user.uid).update({
                    fullName: document.getElementById('pro-name').value,
                    phone: document.getElementById('pro-phone').value,
                    age: document.getElementById('pro-age').value,
                    country: document.getElementById('pro-country').value
                }).then(() => {
                    alert("Profile updated successfully!");
                    btn.textContent = originalText;
                    btn.disabled = false;
                }).catch((err) => {
                    alert("Error updating profile: " + err.message);
                    btn.textContent = originalText;
                    btn.disabled = false;
                });
            }
        });

        // C. Trigger Password Reset Email
        const resetPassBtn = document.getElementById('btn-reset-pass-profile');
        if (resetPassBtn) {
            resetPassBtn.addEventListener('click', () => {
                const user = auth.currentUser;
                if (user && user.email) {
                    if(confirm("Send a password reset link to " + user.email + "?")) {
                        auth.sendPasswordResetEmail(user.email)
                            .then(() => alert("Reset link sent! Check your email."))
                            .catch(err => alert(err.message));
                    }
                }
            });
        }
    }

    // ---------------------------------------------------------
    // 8. VENDOR & DYNAMIC CAR LIST LOGIC (NEW)
    // ---------------------------------------------------------

    // A. Handle Vendor Adding a Car
    const vendorForm = document.getElementById('vendor-form');
    if (vendorForm) {
        vendorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = vendorForm.querySelector('button');
            btn.textContent = "Publishing...";
            btn.disabled = true;

            const newCar = {
                name: document.getElementById('v-name').value,
                price: parseFloat(document.getElementById('v-price').value),
                category: document.getElementById('v-category').value,
                image: document.getElementById('v-image').value,
                description: document.getElementById('v-desc').value,
                createdAt: new Date()
            };

            db.collection("cars").add(newCar).then(() => {
                alert("Car Published Successfully!");
                vendorForm.reset();
                btn.textContent = "Publish Car";
                btn.disabled = false;
            }).catch((error) => {
                alert("Error: " + error.message);
                btn.textContent = "Publish Car";
                btn.disabled = false;
            });
        });
    }

    // B. Handle Displaying Cars on car-list.html
    const economyGrid = document.getElementById('grid-Economy');
    const suvGrid = document.getElementById('grid-SUV');
    const sportsGrid = document.getElementById('grid-Sports');

    if (economyGrid || suvGrid || sportsGrid) {
        console.log("Loading cars...");
        
        db.collection("cars").get().then((querySnapshot) => {
            if (querySnapshot.empty) {
                // If DB is empty, maybe show default hardcoded ones or a message?
                console.log("No cars found in database.");
            }

            querySnapshot.forEach((doc) => {
                const car = doc.data();
                const carHTML = `
                <div class="car-card">
                    <div class="car-image-box">
                        <img src="${car.image}" alt="${car.name}" class="car-img" onerror="this.src='images/Vios.jpg'">
                    </div>
                    <div class="car-details">
                        <h4>${car.name}</h4>
                        <p class="price">RM${car.price} <span class="per-day">/ day</span></p>
                        <p class="description">${car.description}</p>
                        <button class="btn-select" data-name="${car.name}" data-price="${car.price}">Select</button>
                    </div>
                </div>`;

                // Inject into correct category
                if (car.category === "Economy" && economyGrid) {
                    document.getElementById('section-Economy').style.display = 'block';
                    economyGrid.innerHTML += carHTML;
                } else if (car.category === "SUV" && suvGrid) {
                    document.getElementById('section-SUV').style.display = 'block';
                    suvGrid.innerHTML += carHTML;
                } else if (car.category === "Sports" && sportsGrid) {
                    document.getElementById('section-Sports').style.display = 'block';
                    sportsGrid.innerHTML += carHTML;
                }
            });

            // Re-attach Event Listeners for the "Select" buttons (because we just added them dynamically)
            document.querySelectorAll('.btn-select').forEach(button => {
                button.addEventListener('click', function() {
                    sessionStorage.setItem('selectedCarName', this.getAttribute('data-name'));
                    sessionStorage.setItem('selectedCarPrice', this.getAttribute('data-price'));
                    window.location.href = 'booking.html';
                });
            });
        });
    }

// CLOSING BRACKET FOR DOMContentLoaded
});
