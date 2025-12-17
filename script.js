/* =========================================
   script.js - With Map Integration
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // Helper: Format Date
    const formatD = (d) => d && !isNaN(d) ? d.toISOString().split('T')[0] : "Invalid Date";
    
    // Helper: Parse Date
    function parseDate(str) {
        if(!str) return new Date();
        const [datePart, timePart, ampm] = str.split(' ');
        const [day, month, year] = datePart.split('/');
        let [hours, minutes] = timePart.split(':');
        if (ampm === 'PM' && hours !== '12') hours = parseInt(hours) + 12;
        if (ampm === 'AM' && hours === '12') hours = 0;
        return new Date(year, month - 1, day, hours, minutes);
    }

    // PDF Generator
    function generateDetailedPDF(booking, diffDays, rentalFee, insurance, taxes, phone) {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) return;
        const doc = new jsPDF();

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
    // 1. MAP LOGIC (NEW SECTION)
    // =========================================================
    const mapElement = document.getElementById('dashboard-map');
    
    if (mapElement) {
        // Initialize Map centered on Peninsular Malaysia
        const map = L.map('dashboard-map').setView([4.2105, 101.9758], 6);

        // LIGHT MODE TILES
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Define Airport Locations
        const airports = [
            { name: "KLIA (KUL)", lat: 2.7456, lng: 101.7099 },
            { name: "Subang Airport (SZB)", lat: 3.1306, lng: 101.5490 },
            { name: "Penang Airport (PEN)", lat: 5.2971, lng: 100.2769 },
            { name: "Langkawi Airport (LGK)", lat: 6.3333, lng: 99.7333 },
            { name: "Senai Airport (JHB)", lat: 1.6413, lng: 103.6700 },
            { name: "Kota Bharu Airport (KBR)", lat: 6.1681, lng: 102.2936 },
            { name: "Kuala Terengganu Airport (TGG)", lat: 5.3826, lng: 103.1030 },
            { name: "Ipoh Airport (IPH)", lat: 4.5680, lng: 101.0920 },
            { name: "Kuantan Airport (KUA)", lat: 3.7697, lng: 103.2094 },
            { name: "Alor Setar Airport (AOR)", lat: 6.1944, lng: 100.4008 },
            { name: "Malacca Airport (MKZ)", lat: 2.2656, lng: 102.2528 }
        ];

        // Custom Icon for Car Rental Locations (Orange)
        const carIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        // Add Airport Markers
        airports.forEach(airport => {
            L.marker([airport.lat, airport.lng], { icon: carIcon })
             .addTo(map)
             .bindPopup(`<b>${airport.name}</b><br>Available for Rent`);
        });

        // Get User Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                const userIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                L.marker([lat, lng], { icon: userIcon })
                 .addTo(map)
                 .bindPopup("<b>You are here</b>")
                 .openPopup();

            }, error => {
                console.log("Geolocation access denied or error.");
            });
        }
    }

    // =========================================================
    // 2. AUTH & PAGE LOGIC (EXISTING)
    // =========================================================

    // Signup
    const signupBtn = document.getElementById('btn-signup-action');
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const pass = document.getElementById('signup-pass').value;
            if (email && pass) {
                sessionStorage.setItem('userEmail', email);
                sessionStorage.setItem('isVerified', 'false');
                alert(`Verification email sent to ${email}.`);
                window.location.href = 'verify.html';
            } else { alert("Please fill in all fields."); }
        });
    }

    // Verify
    const verifyBtn = document.getElementById('btn-verify-action');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
            sessionStorage.setItem('isVerified', 'true');
            alert("Verified! Login now.");
            window.location.href = 'login.html';
        });
    }

    // Login
    const loginBtn = document.getElementById('btn-login-action');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const inputs = document.querySelectorAll('input');
            let hasInput = true; 
            inputs.forEach(i => { if(!i.value) hasInput = false; });
            if(hasInput) { window.location.href = 'index.html'; }
            else { alert("Enter username/password."); }
        });
    }

    // Logout
    document.querySelectorAll('.btn-logout').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    });

    // Dashboard Search
    const searchBtn = document.getElementById('search-btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const loc = document.getElementById('pickup-location').value;
            const pDate = document.getElementById('pickup-date').value;
            const dDate = document.getElementById('dropoff-date').value;
            sessionStorage.setItem('rentalLocation', loc);
            sessionStorage.setItem('pickupDate', pDate);
            sessionStorage.setItem('dropoffDate', dDate);
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

    // Booking Confirm
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
            const phoneInput = document.querySelector('.payment-form-box input[placeholder="123 456 7890"]');
            const phoneNumber = phoneInput ? phoneInput.value : "";
            const newBooking = {
                id: "SR" + Math.floor(100000 + Math.random() * 900000),
                carName: carName, location: location, dateRange: `${formatD(date1)} to ${formatD(date2)}`,
                totalPrice: total.toFixed(2), phone: phoneNumber, status: "Active", isPast: false
            };
            let bookings = JSON.parse(sessionStorage.getItem('myBookings')) || [];
            bookings.push(newBooking);
            sessionStorage.setItem('myBookings', JSON.stringify(bookings));
            generateDetailedPDF(newBooking, diffDays, rentalFee, insurance, taxes, phoneNumber);
            setTimeout(() => { window.location.href = 'my-bookings.html'; }, 1000); 
        });
    }

    // My Bookings
    const bookingsListContainer = document.getElementById('bookings-list');
    if (bookingsListContainer) {
        let bookings = JSON.parse(sessionStorage.getItem('myBookings')) || [];
        if (bookings.length === 0) {
            bookings = [{ id: "SR123456", carName: "Toyota Vios (Past Example)", location: "SFO", dateRange: "2024-01-01 to 2024-01-05", totalPrice: "215.50", phone: "123", status: "Completed", isPast: true }];
            sessionStorage.setItem('myBookings', JSON.stringify(bookings));
        }

        document.getElementById('bookings-title').textContent = `MY BOOKINGS (${bookings.length} Total)`;
        bookingsListContainer.innerHTML = ''; 
        
        bookings.slice().reverse().forEach(booking => {
            const badgeClass = booking.status === "Active" ? "active" : "completed";
            const btnHtml = booking.status === "Active" ? `<button class="btn-cancel" data-id="${booking.id}">Cancel</button>` : `<button class="btn-receipt" data-id="${booking.id}">Download Receipt</button>`;
            
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
                const id = this.getAttribute('data-id');
                if(confirm("Cancel booking " + id + "?")) {
                    bookings = bookings.filter(b => b.id !== id);
                    sessionStorage.setItem('myBookings', JSON.stringify(bookings));
                    location.reload();
                }
            });
        });

        document.querySelectorAll('.btn-receipt').forEach(btn => {
            btn.addEventListener('click', function() {
                const booking = bookings.find(b => b.id === this.getAttribute('data-id'));
                if (booking) {
                    const ins = 25.00, tax = 15.50, total = parseFloat(booking.totalPrice);
                    const rental = total - ins - tax;
                    const dates = booking.dateRange.split(' to ');
                    const diff = dates.length === 2 ? Math.ceil(Math.abs(new Date(dates[1]) - new Date(dates[0]))/(1000*60*60*24)) : 1;
                    generateDetailedPDF(booking, diff, rental, ins, tax, booking.phone);
                }
            });
        });
    }
});
