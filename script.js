/* =========================================
   script.js - COMPLETE (Auth, Booking, Support, Location, PDF, Vendor Fleet, Returns, Ratings)
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
        if (!jsPDF) { alert("PDF Library not loaded. Please refresh."); return; }
        const doc = new jsPDF();

        doc.setFillColor(200, 78, 8); doc.rect(0, 0, 210, 40, 'F'); 
        doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont("helvetica", "bold");
        doc.text("SafeRent Car", 20, 25);
        doc.setFontSize(12); doc.text("Booking Confirmation", 190, 25, { align: "right" });

        doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text("Rental Details", 20, 60);
        doc.setFontSize(10);
        doc.text("Car Model:", 20, 70); doc.text(booking.carName, 90, 70);
        doc.text("Location:", 20, 80); doc.text(booking.location, 90, 80);
        doc.text("Pick-up / Drop-off:", 20, 90); doc.text(`${booking.dateRange} (${diffDays} days)`, 90, 90);
        doc.text("Contact:", 20, 100); doc.text(phone || "N/A", 90, 100);
        doc.text("Payment:", 20, 110); doc.text(method || "Credit Card", 90, 110);
        
        doc.line(20, 120, 190, 120);
        
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

    if (document.getElementById("pickup-date")) {
        flatpickr("#pickup-date", { enableTime: true, dateFormat: "d/m/Y h:i K", defaultHour: 10 });
        flatpickr("#dropoff-date", { enableTime: true, dateFormat: "d/m/Y h:i K", defaultHour: 10 });
    }

    // ---------------------------------------------------------
    // 3. AUTH LOGIC
    // ---------------------------------------------------------
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

    // SIGNUP
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
            const role = document.getElementById('signup-role').value;

            if (!terms) { alert("You must agree to the Terms and Conditions."); return; }
            if (email && pass && name && phoneNum && age && country) {
                auth.createUserWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        user.sendEmailVerification();
                        return db.collection("users").doc(user.uid).set({
                            fullName: name, email: email, age: age, country: country, 
                            phone: `${countryCode} ${phoneNum}`, role: role, createdAt: new Date()
                        });
                    })
                    .then(() => auth.signOut())
                    .then(() => { alert("Account created! Verify email."); window.location.href = 'login.html'; })
                    .catch((error) => alert(error.message));
            } else { alert("Please fill in all fields."); }
        });
    }

    // LOGIN
    const loginBtn = document.getElementById('btn-login-action');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const pass = document.getElementById('login-pass').value;
            const selectedRole = document.getElementById('login-role').value; 

            if (email && pass) {
                auth.signInWithEmailAndPassword(email, pass)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        if (!user.emailVerified) { auth.signOut(); alert("Email not verified."); return; }
                        
                        db.collection("users").doc(user.uid).get().then((doc) => {
                            if (doc.exists) {
                                const registeredRole = doc.data().role || 'customer';
                                if (registeredRole === selectedRole) {
                                    if (registeredRole === 'vendor') window.location.href = 'vendor.html';
                                    else window.location.href = 'index.html';
                                } else {
                                    auth.signOut();
                                    alert(`Login Failed: You are a '${registeredRole.toUpperCase()}', not a '${selectedRole.toUpperCase()}'.`);
                                }
                            } else { auth.signOut(); alert("User record not found."); }
                        });
                    })
                    .catch((error) => alert("Login Failed: " + error.message));
            } else { alert("Enter email and password."); }
        });
    }

    // LOGOUT
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => { window.location.href = 'login.html'; });
        });
    });

    // PAGE PROTECTION
    auth.onAuthStateChanged((user) => {
        const path = window.location.pathname;
        const publicPages = ['login.html', 'signup.html', 'verify.html'];
        const customerPages = ['index.html', 'my-bookings.html', 'profile.html', 'car-list.html', 'booking.html', 'support.html'];
        const vendorPages = ['vendor.html'];

        if (user) {
            if (!user.emailVerified && !publicPages.some(p => path.includes(p))) {
                auth.signOut().then(() => window.location.href = 'login.html');
                return;
            }
            db.collection("users").doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const role = doc.data().role || 'customer';
                    if (role === 'vendor' && customerPages.some(p => path.includes(p))) { window.location.href = 'vendor.html'; return; }
                    if (role === 'customer' && vendorPages.some(p => path.includes(p))) { window.location.href = 'index.html'; return; }
                    if (publicPages.some(p => path.includes(p)) && !path.includes('verify.html')) {
                        if (role === 'vendor') window.location.href = 'vendor.html';
                        else window.location.href = 'index.html';
                    }
                    
                    // LOAD VENDOR DASHBOARD
                    if (role === 'vendor' && path.includes('vendor.html')) {
                        loadVendorFleet(user.uid);
                    }
                }
            });
        } else {
            if (customerPages.some(p => path.includes(p)) || vendorPages.some(p => path.includes(p))) {
                window.location.href = 'login.html';
            }
        }
    });

    // ---------------------------------------------------------
    // 4. BOOKING LOGIC (UPDATED WITH AUTO-HIDE)
    // ---------------------------------------------------------
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const locationVal = document.getElementById('pickup-location').value;
            const pickupVal = document.getElementById('pickup-date').value;
            const dropoffVal = document.getElementById('dropoff-date').value;
            if (!locationVal || !pickupVal || !dropoffVal) { alert("Please complete all fields."); return; }
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
            sessionStorage.setItem('selectedCarId', this.getAttribute('data-id')); 
            window.location.href = 'booking.html';
        });
    });

    const bookingSummary = document.querySelector('.booking-card');
    if (bookingSummary) {
        const location = sessionStorage.getItem('rentalLocation') || "KLIA (KUL)";
        const pickupStr = sessionStorage.getItem('pickupDate') || "05/12/2025 10:00 AM";
        const dropoffStr = sessionStorage.getItem('dropoffDate') || "10/12/2025 11:00 AM";
        const carName = sessionStorage.getItem('selectedCarName') || "Toyota Vios";
        const carPrice = parseFloat(sessionStorage.getItem('selectedCarPrice')) || 35;
        const carId = sessionStorage.getItem('selectedCarId'); 

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
             if (!auth.currentUser) { alert("Please login."); return; }
             if (!auth.currentUser.emailVerified) { alert("Verify email."); return; }
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

                db.collection("users").doc(user.uid).get().then((doc) => {
                    let userPhone = "N/A";
                    let userName = "Valued Customer";
                    if (doc.exists) {
                        userPhone = doc.data().phone || "N/A";
                        userName = doc.data().fullName || "Valued Customer";
                    }

                    const newBooking = {
                        carName, location, 
                        dateRange: `${formatD(date1)} to ${formatD(date2)}`,
                        totalPrice: total.toFixed(2), 
                        phone: userPhone, 
                        customerName: userName, 
                        status: "Active", 
                        paymentMethod: selectedMethod, 
                        createdAt: new Date(),
                        isRated: false // NEW: Track if rated
                    };

                    return db.collection("users").doc(user.uid).collection("bookings").add(newBooking)
                        .then((docRef) => {
                            newBooking.id = docRef.id.substring(0, 8).toUpperCase();
                            
                            // MARK CAR AS RENTED
                            if (carId) {
                                db.collection("cars").doc(carId).update({ status: "Rented" })
                                .catch(err => console.log("Error updating car status", err));
                            }

                            generateDetailedPDF(newBooking, diffDays, rentalFee, insurance, taxes, newBooking.phone, selectedMethod);
                            modal.style.display = 'none';
                            setTimeout(() => { window.location.href = 'my-bookings.html'; }, 2000);
                        });
                })
                .catch((err) => { alert("Error: " + err.message); finalPayBtn.disabled = false; });
            });
        }
    }

    // ---------------------------------------------------------
    // 5. VENDOR LOGIC (UPDATED WITH RETURNS)
    // ---------------------------------------------------------
    
    // TAB SWITCHING LOGIC
    const tabAddCar = document.getElementById('tab-add-car');
    const tabFleet = document.getElementById('tab-fleet');
    const tabOrders = document.getElementById('tab-orders');

    const viewAddCar = document.getElementById('view-add-car');
    const viewFleet = document.getElementById('view-fleet');
    const viewOrders = document.getElementById('view-orders');

    if (tabAddCar && tabFleet && tabOrders) {
        tabAddCar.addEventListener('click', () => {
            setActiveTab(tabAddCar, viewAddCar);
        });
        tabFleet.addEventListener('click', () => {
            setActiveTab(tabFleet, viewFleet);
            if(auth.currentUser) loadVendorFleet(auth.currentUser.uid);
        });
        tabOrders.addEventListener('click', () => {
            setActiveTab(tabOrders, viewOrders);
            if(auth.currentUser) loadVendorOrders(auth.currentUser.uid);
        });
    }

    function setActiveTab(activeTab, activeView) {
        [tabAddCar, tabFleet, tabOrders].forEach(t => t.classList.remove('active'));
        [viewAddCar, viewFleet, viewOrders].forEach(v => v.style.display = 'none');
        activeTab.classList.add('active');
        activeView.style.display = 'block';
    }

    // SUBMIT NEW CAR
    const vendorForm = document.getElementById('vendor-form');
    if (vendorForm) {
        vendorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = vendorForm.querySelector('button');
            btn.textContent = "Publishing..."; btn.disabled = true;

            const newCar = {
                name: document.getElementById('v-name').value,
                price: parseFloat(document.getElementById('v-price').value),
                category: document.getElementById('v-category').value,
                image: document.getElementById('v-image').value,
                description: document.getElementById('v-desc').value,
                vendorId: auth.currentUser.uid, 
                status: "Available",
                ratingCount: 0,   // NEW
                averageRating: 0, // NEW
                createdAt: new Date()
            };

            db.collection("cars").add(newCar).then(() => {
                alert("Car Published Successfully!");
                vendorForm.reset();
                btn.textContent = "Publish Car"; btn.disabled = false;
            }).catch((error) => { alert("Error: " + error.message); btn.disabled = false; });
        });
    }

    // LOAD FLEET (WITH MARK RETURNED BUTTON)
    function loadVendorFleet(vendorUid) {
        const listDiv = document.getElementById('vendor-fleet-list');
        if (!listDiv) return;
        
        listDiv.innerHTML = '<p style="text-align:center; color:gray;">Loading fleet...</p>';

        db.collection("cars").where("vendorId", "==", vendorUid).get()
        .then(async (carSnaps) => {
            if (carSnaps.empty) {
                listDiv.innerHTML = '<p style="text-align:center; color:gray;">You haven\'t added any cars yet.</p>';
                return;
            }

            // Get active bookings
            let activeBookings = [];
            try {
                const bookingsSnap = await db.collectionGroup('bookings').get();
                bookingsSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'Active') {
                        // STORE DOC PATH TO UPDATE IT LATER
                        data.docPath = doc.ref.path; 
                        activeBookings.push(data);
                    }
                });
            } catch (err) { console.log("Error fetching bookings:", err); }

            let html = '';
            carSnaps.forEach(doc => {
                const car = doc.data();
                const statusClass = car.status === 'Rented' ? 'status-rented' : 'status-avail';
                
                let customerInfo = '';
                if (car.status === 'Rented') {
                    const booking = activeBookings.find(b => b.carName === car.name);
                    if (booking) {
                        customerInfo = `
                            <div style="margin-top:0.8rem; padding:0.8rem; background:#2d3748; border-radius:6px; border:1px solid #4a5568;">
                                <p style="color:#c84e08; font-size:0.85rem; font-weight:bold; margin-bottom:0.4rem; text-transform:uppercase;">
                                    <i class="fa-solid fa-user"></i> Renter Details
                                </p>
                                <p style="color:#e2e8f0; font-size:0.9rem; margin-bottom:0.2rem;"><strong>Name:</strong> ${booking.customerName || 'N/A'}</p>
                                <p style="color:#e2e8f0; font-size:0.9rem; margin-bottom:0.2rem;"><strong>Phone:</strong> ${booking.phone || 'N/A'}</p>
                                <p style="color:#9ca3af; font-size:0.8rem; margin-bottom: 0.8rem;"><strong>Return Date:</strong> ${booking.dateRange.split(' to ')[1] || 'N/A'}</p>
                                
                                <button class="btn-return" 
                                    style="width:100%; background:#28a745; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;"
                                    data-car-id="${doc.id}" 
                                    data-booking-path="${booking.docPath}">
                                    Mark as Returned
                                </button>
                            </div>
                        `;
                    } else {
                        customerInfo = `<p style="color:#9ca3af; font-size:0.8rem; margin-top:0.5rem;"><em>Rented, but details unavailable.</em></p>`;
                        // Fallback button just to free the car
                        customerInfo += `<button class="btn-return" style="width:100%; margin-top:5px; background:#444; color:white; border:none; padding:5px; cursor:pointer;" data-car-id="${doc.id}" data-booking-path="">Force Available</button>`;
                    }
                }

                html += `
                <div style="background:#1a202c; padding:1.2rem; border-radius:8px; border:1px solid #2d3748; margin-bottom: 1rem;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.5rem;">
                        <div>
                            <h4 style="color:white; font-size:1.1rem; font-weight:700; margin-bottom:0.2rem;">${car.name}</h4>
                            <p style="color:#a0aec0; font-size:0.85rem;">RM${car.price} / day</p>
                        </div>
                        <span class="${statusClass}" style="padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">
                            ${car.status || 'Available'}
                        </span>
                    </div>
                    ${customerInfo}
                </div>`;
            });

            listDiv.innerHTML = html;

            // ATTACH EVENT LISTENERS FOR RETURNS
            document.querySelectorAll('.btn-return').forEach(btn => {
                btn.addEventListener('click', function() {
                    const carId = this.getAttribute('data-car-id');
                    const bookingPath = this.getAttribute('data-booking-path');

                    if(confirm("Confirm this car has been returned?")) {
                        // 1. Update Car to Available
                        db.collection("cars").doc(carId).update({ status: "Available" })
                        .then(() => {
                            // 2. Update Booking to Completed (if we found it)
                            if (bookingPath) {
                                db.doc(bookingPath).update({ status: "Completed" });
                            }
                            alert("Car marked as returned!");
                            loadVendorFleet(vendorUid); // Refresh
                        });
                    }
                });
            });
        })
        .catch(err => {
            console.error(err);
            listDiv.innerHTML = '<p style="text-align:center; color:#ef4444;">Error loading fleet.</p>';
        });
    }

    // FETCH ORDERS HISTORY (Existing)
    function loadVendorOrders(vendorUid) {
        const listDiv = document.getElementById('vendor-orders-list');
        if (!listDiv) return;
        listDiv.innerHTML = '<p style="text-align:center; color:gray;">Loading...</p>';

        db.collection("cars").where("vendorId", "==", vendorUid).get().then((carSnaps) => {
            if (carSnaps.empty) { listDiv.innerHTML = '<p style="text-align:center; color:gray;">No cars listed.</p>'; return; }
            const myCarNames = [];
            carSnaps.forEach(doc => myCarNames.push(doc.data().name));

            db.collectionGroup('bookings').get().then((bookingSnaps) => {
                let html = '';
                let count = 0;
                bookingSnaps.forEach(doc => {
                    const booking = doc.data();
                    if (myCarNames.includes(booking.carName)) {
                        count++;
                        html += `
                        <div style="background:#222; padding:1rem; border-radius:8px; border:1px solid #444; display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <h4 style="color:#c84e08; margin-bottom:0.2rem;">${booking.carName}</h4>
                                <p style="color:#ddd; font-size:0.9rem;"><strong>Customer:</strong> ${booking.customerName || 'N/A'}</p>
                                <p style="color:#ddd; font-size:0.9rem;"><strong>Phone:</strong> ${booking.phone || 'N/A'}</p>
                                <p style="color:#ddd; font-size:0.9rem;"><strong>Location:</strong> ${booking.location || 'N/A'}</p> 
                                <p style="color:#888; font-size:0.8rem;">${booking.dateRange}</p>
                            </div>
                            <div style="text-align:right;">
                                <p style="color:white; font-weight:bold;">RM${booking.totalPrice}</p>
                                <span style="background:green; color:white; font-size:0.7rem; padding:2px 8px; border-radius:10px;">${booking.status}</span>
                            </div>
                        </div>`;
                    }
                });
                if (count === 0) listDiv.innerHTML = '<p style="text-align:center; color:gray;">No orders yet.</p>';
                else listDiv.innerHTML = html;
            });
        }).catch(err => console.error(err));
    }

    // ---------------------------------------------------------
    // 6. CAR LIST DISPLAY (UPDATED WITH STARS)
    // ---------------------------------------------------------
    const economyGrid = document.getElementById('grid-Economy');
    const suvGrid = document.getElementById('grid-SUV');
    const sportsGrid = document.getElementById('grid-Sports');

    if (economyGrid || suvGrid || sportsGrid) {
        db.collection("cars").get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const car = doc.data();
                if (car.status === "Rented") return;

                // STAR RATING LOGIC
                let starsHTML = '';
                if (!car.ratingCount || car.ratingCount === 0) {
                    starsHTML = '<span style="color:#fbbf24; font-size:0.85rem;">New Car</span>';
                } else {
                    const rating = car.averageRating.toFixed(1);
                    starsHTML = `<span style="color:#fbbf24; font-size:0.9rem;">★ ${rating}</span> <span style="color:#666; font-size:0.8rem;">(${car.ratingCount})</span>`;
                }

                const carHTML = `
                <div class="car-card">
                    <div class="car-image-box">
                        <img src="${car.image}" alt="${car.name}" class="car-img" onerror="this.src='images/Vios.jpg'">
                    </div>
                    <div class="car-details">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <h4>${car.name}</h4>
                            <div style="text-align:right;">${starsHTML}</div>
                        </div>
                        <p class="price">RM${car.price} <span class="per-day">/ day</span></p>
                        <p class="description">${car.description}</p>
                        <button class="btn-select" data-id="${doc.id}" data-name="${car.name}" data-price="${car.price}">Select</button>
                    </div>
                </div>`;
                if (car.category === "Economy" && economyGrid) { document.getElementById('section-Economy').style.display = 'block'; economyGrid.innerHTML += carHTML; }
                else if (car.category === "SUV" && suvGrid) { document.getElementById('section-SUV').style.display = 'block'; suvGrid.innerHTML += carHTML; }
                else if (car.category === "Sports" && sportsGrid) { document.getElementById('section-Sports').style.display = 'block'; sportsGrid.innerHTML += carHTML; }
            });
            document.querySelectorAll('.btn-select').forEach(button => {
                button.addEventListener('click', function() {
                    sessionStorage.setItem('selectedCarName', this.getAttribute('data-name'));
                    sessionStorage.setItem('selectedCarPrice', this.getAttribute('data-price'));
                    sessionStorage.setItem('selectedCarId', this.getAttribute('data-id'));
                    window.location.href = 'booking.html';
                });
            });
        });
    }

    // ---------------------------------------------------------
    // 7. OTHER PAGE LOGIC (Support, Profile, My Bookings UPDATED)
    // ---------------------------------------------------------
    const bookingsListContainer = document.getElementById('bookings-list');
    if (bookingsListContainer) {
        auth.onAuthStateChanged((user) => {
            if (user && user.emailVerified) {
                bookingsListContainer.innerHTML = '<p style="color:white;">Loading...</p>';
                db.collection("users").doc(user.uid).collection("bookings").orderBy("createdAt", "desc").get()
                .then((snap) => {
                    const bookings = [];
                    snap.forEach(doc => { const d = doc.data(); d.id = doc.id.substring(0, 8).toUpperCase(); d.realDocId = doc.id; bookings.push(d); });
                    renderBookings(bookings);
                });
            } else { bookingsListContainer.innerHTML = '<p style="color:white;">Please log in.</p>'; }
        });
        
        function renderBookings(bookings) {
            document.getElementById('bookings-title').textContent = `MY BOOKINGS (${bookings.length} Total)`;
            bookingsListContainer.innerHTML = ''; 
            if(bookings.length === 0) { bookingsListContainer.innerHTML = '<p style="color:gray;">No bookings found.</p>'; return; }
            
            bookings.forEach((booking, index) => {
                let badgeClass = "active";
                let btnHtml = "";

                if (booking.status === "Active") {
                    badgeClass = "active";
                    btnHtml = `<button class="btn-cancel" data-doc-id="${booking.realDocId}">Cancel</button>`;
                } else if (booking.status === "Completed") {
                    badgeClass = "completed";
                    // If not rated yet, show Rate button
                    if (!booking.isRated) {
                        btnHtml = `<button class="btn-rate" data-doc-id="${booking.realDocId}" data-car-name="${booking.carName}">Rate Car</button>`;
                    } else {
                        btnHtml = `<span style="color:#28a745; font-size:0.9rem;">Thanks for rating!</span>`;
                    }
                    // Also download receipt for past
                    btnHtml += ` <button class="btn-receipt" style="margin-left:10px;">Receipt</button>`;
                }

                bookingsListContainer.innerHTML += `
                    <div class="booking-card">
                        <div class="card-top"><h3>${booking.status === "Active" ? "Upcoming" : "Past"} Rental</h3><span class="status-badge ${badgeClass}">${booking.status}</span></div>
                        <div class="card-body">
                            <div class="car-info"><h4>${booking.carName}</h4><p class="detail-text">ID: ${booking.id}</p><p class="detail-text">Dates: ${booking.dateRange}</p><p class="detail-text">Location: ${booking.location}</p></div>
                            <div class="price-info"><p>Total: RM${booking.totalPrice}</p></div>
                        </div>
                        <div class="card-actions"><a href="#" class="btn-view-details" data-index="${index}">View Details</a>${btnHtml}</div>
                    </div>`;
            });

            // LOGIC FOR RATING
            document.querySelectorAll('.btn-rate').forEach(btn => {
                btn.addEventListener('click', async function() {
                    const carName = this.getAttribute('data-car-name');
                    const bookingId = this.getAttribute('data-doc-id');
                    
                    const rating = prompt(`How many stars (1-5) for your ${carName}?`);
                    if (rating && rating >= 1 && rating <= 5) {
                        const numRating = parseInt(rating);
                        
                        // 1. Find the car document to update average
                        const carsSnap = await db.collection("cars").where("name", "==", carName).limit(1).get();
                        if (!carsSnap.empty) {
                            const carDoc = carsSnap.docs[0];
                            const carData = carDoc.data();
                            
                            // Math: New Average
                            const oldAvg = carData.averageRating || 0;
                            const oldCount = carData.ratingCount || 0;
                            const newCount = oldCount + 1;
                            const newAvg = ((oldAvg * oldCount) + numRating) / newCount;

                            await db.collection("cars").doc(carDoc.id).update({
                                averageRating: newAvg,
                                ratingCount: newCount
                            });
                        }

                        // 2. Mark booking as rated
                        await db.collection("users").doc(auth.currentUser.uid).collection("bookings").doc(bookingId).update({
                            isRated: true
                        });

                        alert("Thank you for your feedback!");
                        location.reload();
                    } else {
                        alert("Please enter a number between 1 and 5.");
                    }
                });
            });

            document.querySelectorAll('.btn-view-details').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const index = this.getAttribute('data-index');
                    const booking = bookings[index];
                    const dates = booking.dateRange.split(' to ');
                    const diffDays = Math.ceil(Math.abs(new Date(dates[1]) - new Date(dates[0])) / (1000 * 60 * 60 * 24)) || 1;
                    const total = parseFloat(booking.totalPrice);
                    generateDetailedPDF(booking, diffDays, total - 40.5, 25.00, 15.50, booking.phone, booking.paymentMethod);
                });
            });
            document.querySelectorAll('.btn-cancel').forEach(btn => {
                btn.addEventListener('click', function() {
                    if(confirm("Cancel?")) { db.collection("users").doc(auth.currentUser.uid).collection("bookings").doc(this.getAttribute('data-doc-id')).delete().then(() => location.reload()); }
                });
            });
        }
    }

    const supportForm = document.getElementById('support-form');
    if (supportForm) {
        auth.onAuthStateChanged(user => {
            if (user) {
                const emailField = document.getElementById('sup-email'); if(emailField) emailField.value = user.email;
                db.collection("users").doc(user.uid).get().then((doc) => { if (doc.exists) { const nameField = document.getElementById('sup-name'); if (nameField) nameField.value = doc.data().fullName; } });
            }
        });
        supportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = document.querySelector('.btn-submit');
            btn.textContent = "Sending..."; btn.disabled = true;
            db.collection("messages").add({
                name: document.getElementById('sup-name').value, email: document.getElementById('sup-email').value,
                subject: document.getElementById('sup-subject').value, message: document.getElementById('sup-message').value, createdAt: new Date()
            })
            .then(() => { alert("Message sent!"); supportForm.reset(); btn.textContent = "Send Message"; btn.disabled = false; })
            .catch((err) => { alert(err.message); btn.disabled = false; });
        });
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        auth.onAuthStateChanged(user => {
            if (user) {
                document.getElementById('pro-email').value = user.email;
                db.collection("users").doc(user.uid).get().then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        document.getElementById('pro-name').value = data.fullName || "";
                        document.getElementById('pro-phone').value = data.phone || "";
                        document.getElementById('pro-age').value = data.age || "";
                        document.getElementById('pro-country').value = data.country || "MY";
                    }
                });
            } else { window.location.href = 'login.html'; }
        });
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = profileForm.querySelector('button[type="submit"]');
            btn.textContent = "Saving..."; btn.disabled = true;
            const user = auth.currentUser;
            if (user) {
                db.collection("users").doc(user.uid).update({
                    fullName: document.getElementById('pro-name').value,
                    phone: document.getElementById('pro-phone').value,
                    age: document.getElementById('pro-age').value,
                    country: document.getElementById('pro-country').value
                }).then(() => { alert("Updated!"); btn.textContent = "Save Changes"; btn.disabled = false; })
                .catch((err) => { alert(err.message); btn.disabled = false; });
            }
        });
        const resetPassBtn = document.getElementById('btn-reset-pass-profile');
        if (resetPassBtn) {
            resetPassBtn.addEventListener('click', () => {
                const user = auth.currentUser;
                if (user && confirm("Send reset link?")) auth.sendPasswordResetEmail(user.email).then(() => alert("Link sent!"));
            });
        }
    }

});
