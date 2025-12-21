/* =========================================
   script.js - FINAL COMPLETE VERSION
   Includes: Firebase Auth/DB, Map, Calendar, PDF
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 0. FIREBASE CONFIGURATION (Your Keys)
    // =========================================================
    const firebaseConfig = {
        apiKey: "AIzaSyAz5jt1yefwtZC0W2WvCMD7YHh31U7ZL0g",
        authDomain: "saferent-car.firebaseapp.com",
        projectId: "saferent-car",
        storageBucket: "saferent-car.firebasestorage.app",
        messagingSenderId: "992172726560",
        appId: "1:992172726560:web:402e9bed24fd38d90e9f45"
    };

    // Initialize Firebase (Compat)
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    // =========================================================
    // 1. HELPER FUNCTIONS
    // =========================================================
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

    function generateDetailedPDF(booking, diffDays, rentalFee, insurance, taxes, phone) {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) return;
        const doc = new jsPDF();

        // Header
        doc.setFillColor(200, 78, 8); doc.rect(0, 0, 210, 40, 'F'); 
        doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text("SafeRent Car", 20, 25);
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text("Booking Confirmation", 190, 25, { align: "right" });

        // Details
        doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text("Rental Details", 20, 60);
        doc.setFontSize(10);
        doc.text("Car Model:", 20, 70); doc.text(booking.carName, 90, 70);
        doc.text("Location:", 20, 80); doc.text(booking.location, 90, 80);
        doc.text("Pick-up / Drop-off:", 20, 90); doc.text(`${booking.dateRange} (${diffDays} days)`, 90, 90);
        doc.text("Contact Number:", 20, 100); doc.text(phone || "N/A", 90, 100);
        
        doc.setLineWidth(0.5); doc.line(20, 110, 190, 110);
        
        // Summary
        doc.setFontSize(14); doc.text("Payment Summary", 20, 130);
        doc.setFontSize(10);
        doc.text(`Rental Fee (${diffDays} days):`, 20, 140); doc.text(`$${rentalFee.toFixed(2)}`, 190, 140, { align: "right" });
        doc.text("Insurance:", 20, 150); doc.text(`$${insurance.toFixed(2)}`, 190, 150, { align: "right" });
        doc.text("Taxes & Fees:", 20, 160); doc.text(`$${taxes.toFixed(2)}`, 190, 160, { align: "right" });
        
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("TOTAL PAID:", 20, 180);
        doc.setTextColor(200, 78, 8); doc.text(`$${booking.totalPrice}`, 190, 180, { align: "right" });

        // Footer
        doc.setTextColor(150, 150, 150); doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text("Thank you for choosing SafeRent Car!", 105, 280, { align: "center" });

        doc.save(`SafeRent_${booking.id}.pdf`);
    }

    // =========================================================
    // 2. MAP LOGIC (LIGHT MODE)
    // =========================================================
    const mapElement = document.getElementById('dashboard-map');
    
    if (mapElement) {
        // Initialize Map
        const map = L.map('dashboard-map').setView([4.2105, 101.9758], 6);

        // Light Tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        const airports = [
            { name: "KLIA (KUL)", lat: 2.7456, lng: 101.7099 },
            { name: "Subang (SZB)", lat: 3.1306, lng: 101.5490 },
            { name: "Penang (PEN)", lat: 5.2971, lng: 100.2769 },
            { name: "Langkawi (LGK)", lat: 6.3333, lng: 99.7333 },
            { name: "Senai (JHB)", lat: 1.6413, lng: 103.6700 },
            { name: "Kota Bharu (KBR)", lat: 6.1681, lng: 102.2936 },
            { name: "Terengganu (TGG)", lat: 5.3826, lng: 103.1030 },
            { name: "Ipoh (IPH)", lat: 4.5680, lng: 101.0920 },
            { name: "Kuantan (KUA)", lat: 3.7697, lng: 103.2094 },
            { name: "Alor Setar (AOR)", lat: 6.1944, lng: 100.4008 }
        ];

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
                L.marker([pos.coords.latitude, pos.coords.longitude], { icon: userIcon }).addTo(map).bindPopup("<b>You</b>").openPopup();
            });
        }
    }

    // =========================================================
    // 3. CUSTOM CALENDAR (FLATPICKR)
    // =========================================================
    if (document.getElementById("pickup-date")) {
        const datePickerConfig = {
            enableTime: true,
            dateFormat: "d/m/Y h:i K",
            time_24hr: false,
            defaultHour: 10,
            onReady: function(selectedDates, dateStr, instance) {
                const footer = document.createElement("div");
                footer.classList.add("flatpickr-footer");
                
                const clearBtn = document.createElement("button");
                clearBtn.innerText = "Clear";
                clearBtn.classList.add("flatpickr-btn");
                clearBtn.addEventListener("click", () => { instance.clear(); instance.close(); });

                const todayBtn = document.createElement("button");
                todayBtn.innerText = "Today";
                todayBtn.classList.add("flatpickr-btn");
                todayBtn.addEventListener("click", () => { instance.setDate(new Date()); });

                footer.appendChild(clearBtn);
                footer.appendChild(todayBtn);
                instance.calendarContainer.appendChild(footer);
            }
        };
        flatpickr("#pickup-date", datePickerConfig);
        flatpickr("#dropoff-date", datePickerConfig);
    }

    // =========================================================
    // 4. AUTH LOGIC (Login, Signup, Logout)
    // =========================================================

    // Sign Up
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
                    .then(() => {
                        alert(`Account created! A verification email has been sent to ${email}.`);
                        window.location.href = 'login.html';
                    })
                    .catch((error) => { alert("Error: " + error.message); });
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
                            alert("Please verify your email first.");
                        }
                    })
                    .catch((error) => { alert("Login Failed: " + error.message); });
            } else { alert("Enter username and password."); }
        });
    }

    // Logout
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => { window.location.href = 'login.html'; });
        });
    });

    // Auth State Listener (Protect Pages)
    auth.onAuthStateChanged((user) => {
        const path = window.location.pathname;
        const isPublic = path.includes('login') || path.includes('signup') || path.includes('verify');

        if (user) {
            if (path.includes('login')) window.location.href = 'index.html';
        } else {
            if (!isPublic && (path.includes('booking') || path.includes('my-bookings'))) {
                window.location.href = 'login.html';
            }
        }
    });

    // =========================================================
    // 5. BOOKING FLOW (DB + PDF)
    // =========================================================

    // Search
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

    // Select Car
    document.querySelectorAll('.btn-select').forEach(button => {
        button.addEventListener('click', function() {
            sessionStorage.setItem('selectedCarName', this.getAttribute('data-name'));
            sessionStorage.setItem('selectedCarPrice', this.getAttribute('data-price'));
            window.location.href = 'booking.html';
        });
    });

    // Confirm & Pay (Save to DB)
    const bookingSummary = document.querySelector('.booking-card');
    if (bookingSummary) {
        const location = sessionStorage.getItem('rentalLocation') || "KUL";
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
        document.getElementById('display-rental-fee').textContent = `$${rentalFee.toFixed(2)}`;
        document.getElementById('display-total').textContent = `$${total.toFixed(2)}`;
        
        const payBtn = document.getElementById('btn-pay-text');
        payBtn.textContent = `Confirm & Pay $${total.toFixed(2)}`;

        payBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (!user) { alert("Please login first."); return; }

            const phoneInput = document.querySelector('.payment-form-box input[placeholder="123 456 7890"]');
            const newBooking = {
                carName: carName, location: location, dateRange: `${formatD(date1)} to ${formatD(date2)}`,
                totalPrice: total.toFixed(2), phone: phoneInput ? phoneInput.value : "",
                status: "Active", createdAt: new Date()
            };

            // Save to Firestore
            db.collection("users").doc(user.uid).collection("bookings").add(newBooking)
            .then((docRef) => {
                newBooking.id = docRef.id.substring(0, 8).toUpperCase();
                generateDetailedPDF(newBooking, diffDays, rentalFee, insurance, taxes, newBooking.phone);
                setTimeout(() => { window.location.href = 'my-bookings.html'; }, 1000);
            })
            .catch((err) => alert("Booking failed: " + err.message));
        });
    }

    // =========================================================
    // 6. MY BOOKINGS (Read from DB)
    // =========================================================
    const bookingsListContainer = document.getElementById('bookings-list');
    if (bookingsListContainer) {
        auth.onAuthStateChanged((user) => {
            if (user) {
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
            } else {
                bookingsListContainer.innerHTML = '<p style="color:white;">Please log in.</p>';
            }
        });

        function renderBookings(bookings) {
            document.getElementById('bookings-title').textContent = `MY BOOKINGS (${bookings.length} Total)`;
            bookingsListContainer.innerHTML = ''; 
            
            if(bookings.length === 0) {
                 bookingsListContainer.innerHTML = '<p style="color:gray;">No bookings found.</p>';
                 return;
            }

            bookings.forEach(booking => {
                const badgeClass = booking.status === "Active" ? "active" : "completed";
                const btnHtml = booking.status === "Active" 
                    ? `<button class="btn-cancel" data-doc-id="${booking.realDocId}">Cancel</button>` 
                    : `<button class="btn-receipt">Download Receipt</button>`;
                
                const cardHtml = `
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
                            <div class="price-info"><p>Total: $${booking.totalPrice}</p></div>
                        </div>
                        <div class="card-actions"><a href="#">View Details</a>${btnHtml}</div>
                    </div>`;
                bookingsListContainer.innerHTML += cardHtml;
            });

            document.querySelectorAll('.btn-cancel').forEach(btn => {
                btn.addEventListener('click', function() {
                    if(confirm("Cancel this booking?")) {
                        const docId = this.getAttribute('data-doc-id');
                        db.collection("users").doc(auth.currentUser.uid).collection("bookings").doc(docId).delete()
                        .then(() => location.reload());
                    }
                });
            });
        }
    }
});
