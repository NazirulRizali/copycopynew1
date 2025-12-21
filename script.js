/* =========================================
   script.js - connected to GOOGLE FIREBASE
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 0. FIREBASE CONFIGURATION (PASTE YOUR KEYS HERE)
    // =========================================================
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY_HERE",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    // Initialize Firebase
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

        // (PDF Code same as before - omitted for brevity, keeping existing logic)
        doc.setFillColor(200, 78, 8); doc.rect(0, 0, 210, 40, 'F'); 
        doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text("SafeRent Car", 20, 25);
        doc.setFontSize(12); doc.setFont("helvetica", "normal");
        doc.text("Booking Confirmation", 190, 25, { align: "right" });

        doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text("Rental Details", 20, 60);
        doc.setFontSize(10);
        doc.text("Car Model:", 20, 70); doc.text(booking.carName, 90, 70);
        doc.text("Location:", 20, 80); doc.text(booking.location, 90, 80);
        doc.text("Pick-up / Drop-off:", 20, 90); doc.text(`${booking.dateRange} (${diffDays} days)`, 90, 90);
        doc.text("Contact Number:", 20, 100); doc.text(phone || "N/A", 90, 100);
        
        doc.setLineWidth(0.5); doc.line(20, 110, 190, 110);
        
        doc.setFontSize(14); doc.text("Payment Summary", 20, 130);
        doc.setFontSize(10);
        doc.text(`Rental Fee (${diffDays} days):`, 20, 140); doc.text(`$${rentalFee.toFixed(2)}`, 190, 140, { align: "right" });
        doc.text("Insurance:", 20, 150); doc.text(`$${insurance.toFixed(2)}`, 190, 150, { align: "right" });
        doc.text("Taxes & Fees:", 20, 160); doc.text(`$${taxes.toFixed(2)}`, 190, 160, { align: "right" });
        
        doc.setFontSize(12); doc.setFont("helvetica", "bold");
        doc.text("TOTAL PAID:", 20, 180);
        doc.setTextColor(200, 78, 8); doc.text(`$${booking.totalPrice}`, 190, 180, { align: "right" });

        doc.setTextColor(150, 150, 150); doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text("Thank you for choosing SafeRent Car!", 105, 280, { align: "center" });

        doc.save(`SafeRent_${booking.id}.pdf`);
    }

    // =========================================================
    // 2. AUTH LOGIC (SIGN UP & LOGIN)
    // =========================================================

    // A. SIGN UP
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
                // 1. Create User in Auth
                auth.createUserWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        
                        // 2. Send Email Verification
                        user.sendEmailVerification();

                        // 3. Save Extra Details to Firestore Database
                        return db.collection("users").doc(user.uid).set({
                            fullName: name,
                            email: email,
                            age: age,
                            country: country,
                            createdAt: new Date()
                        });
                    })
                    .then(() => {
                        alert(`Account created! A verification email has been sent to ${email}. Please check your inbox.`);
                        window.location.href = 'login.html';
                    })
                    .catch((error) => {
                        alert("Error: " + error.message);
                    });
            } else {
                alert("Please fill in all fields.");
            }
        });
    }

    // B. LOGIN
    const loginBtn = document.getElementById('btn-login-action');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.querySelector('input[type="text"]').value || document.querySelector('input[type="email"]').value;
            const pass = document.querySelector('input[type="password"]').value;

            if (email && pass) {
                auth.signInWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        if (user.emailVerified) {
                            window.location.href = 'index.html';
                        } else {
                            alert("Please verify your email address before logging in. Check your inbox.");
                            // Optional: Allow login anyway if you want to skip verification strictly
                            // window.location.href = 'index.html'; 
                        }
                    })
                    .catch((error) => {
                        alert("Login Failed: " + error.message);
                    });
            } else {
                alert("Enter username and password.");
            }
        });
    }

    // C. LOGOUT
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.href = 'login.html';
            });
        });
    });

    // D. AUTH STATE LISTENER (Protect Pages)
    auth.onAuthStateChanged((user) => {
        const path = window.location.pathname;
        const isPublicPage = path.includes('login.html') || path.includes('signup.html') || path.includes('verify.html');

        if (user) {
            // User is signed in
            console.log("User ID:", user.uid);
            // If on login page, redirect to dashboard
            if (path.includes('login.html')) {
                 window.location.href = 'index.html';
            }
        } else {
            // No user is signed in. Redirect to login if on a private page.
            if (!isPublicPage && path !== '/' && !path.endsWith('index.html')) {
                // Note: For development 'file://', path logic can be tricky.
                // Simpler check: if we are trying to book or view bookings
                if(path.includes('booking') || path.includes('my-bookings')) {
                    window.location.href = 'login.html';
                }
            }
        }
    });

    // =========================================================
    // 3. MAP & DASHBOARD LOGIC
    // =========================================================
    // (Your existing Map Code - no changes needed, just copy paste previous map section)
    const mapElement = document.getElementById('dashboard-map');
    if (mapElement) {
        const map = L.map('dashboard-map').setView([4.2105, 101.9758], 6);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO', maxZoom: 19
        }).addTo(map);
        // ... (Include your airport markers and car icons logic here) ...
    }
    
    // (Your Custom Date Picker logic)
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

    // Dashboard Search Button
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

    // Car List Select
    document.querySelectorAll('.btn-select').forEach(button => {
        button.addEventListener('click', function() {
            sessionStorage.setItem('selectedCarName', this.getAttribute('data-name'));
            sessionStorage.setItem('selectedCarPrice', this.getAttribute('data-price'));
            window.location.href = 'booking.html';
        });
    });

    // =========================================================
    // 4. BOOKING & MY BOOKINGS (SAVING TO FIRESTORE)
    // =========================================================
    
    // CONFIRM & PAY
    const bookingSummary = document.querySelector('.booking-card');
    if (bookingSummary) {
        // (Existing Calculation Logic...)
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
            if (!user) {
                alert("You must be logged in to book.");
                return;
            }

            const phoneInput = document.querySelector('.payment-form-box input[placeholder="123 456 7890"]');
            const newBooking = {
                carName: carName, location: location, dateRange: `${formatD(date1)} to ${formatD(date2)}`,
                totalPrice: total.toFixed(2), phone: phoneInput ? phoneInput.value : "", 
                status: "Active", createdAt: new Date()
            };

            // SAVE TO FIREBASE SUB-COLLECTION
            db.collection("users").doc(user.uid).collection("bookings").add(newBooking)
            .then((docRef) => {
                // Add ID to object for PDF
                newBooking.id = docRef.id.substring(0, 8).toUpperCase(); 
                generateDetailedPDF(newBooking, diffDays, rentalFee, insurance, taxes, newBooking.phone);
                setTimeout(() => { window.location.href = 'my-bookings.html'; }, 1000); 
            })
            .catch((error) => {
                alert("Booking failed: " + error.message);
            });
        });
    }

    // MY BOOKINGS PAGE (LOAD FROM FIRESTORE)
    const bookingsListContainer = document.getElementById('bookings-list');
    if (bookingsListContainer) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                bookingsListContainer.innerHTML = '<p style="color:white;">Loading bookings...</p>';
                
                db.collection("users").doc(user.uid).collection("bookings")
                .orderBy("createdAt", "desc")
                .get()
                .then((querySnapshot) => {
                    const bookings = [];
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        data.id = doc.id.substring(0, 8).toUpperCase(); // Fake short ID
                        data.realDocId = doc.id; // Keep real ID for deleting
                        bookings.push(data);
                    });
                    renderBookings(bookings);
                });
            } else {
                bookingsListContainer.innerHTML = '<p style="color:white;">Please log in to view bookings.</p>';
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

            // CANCEL LISTENER
            document.querySelectorAll('.btn-cancel').forEach(btn => {
                btn.addEventListener('click', function() {
                    const docId = this.getAttribute('data-doc-id');
                    if(confirm("Cancel this booking?")) {
                        const user = auth.currentUser;
                        db.collection("users").doc(user.uid).collection("bookings").doc(docId).delete()
                        .then(() => {
                             location.reload();
                        });
                    }
                });
            });
        }
    }
});
