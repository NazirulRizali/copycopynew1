/* =========================================
   script.js - Final Complete Logic
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================
    // 1. HELPER FUNCTIONS (Used Globally)
    // =========================================================

    // Format Date: 2025-12-05
    const formatD = (d) => {
        if(!d || isNaN(d)) return "Invalid Date";
        return d.toISOString().split('T')[0];
    };

    // Parse Date String: "05/12/2025 10:00 AM" -> Date Object
    function parseDate(str) {
        if(!str) return new Date();
        const [datePart, timePart, ampm] = str.split(' ');
        const [day, month, year] = datePart.split('/');
        let [hours, minutes] = timePart.split(':');
        if (ampm === 'PM' && hours !== '12') hours = parseInt(hours) + 12;
        if (ampm === 'AM' && hours === '12') hours = 0;
        return new Date(year, month - 1, day, hours, minutes);
    }

    // PDF Generator (Now a standalone function so we can use it everywhere)
    function generateDetailedPDF(booking, diffDays, rentalFee, insurance, taxes, phone) {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            alert("PDF Library error. Please refresh.");
            return;
        }

        const doc = new jsPDF();

        // --- HEADER (Orange) ---
        doc.setFillColor(200, 78, 8); 
        doc.rect(0, 0, 210, 40, 'F'); 

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("SafeRent Car", 20, 25);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Booking Confirmation", 190, 25, { align: "right" });

        // --- RENTAL DETAILS ---
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Rental Details", 20, 60);
        
        doc.setFontSize(10);
        const labelX = 20;
        const valueX = 90;

        doc.text("Car Model:", labelX, 70);
        doc.text(booking.carName, valueX, 70);

        doc.text("Location:", labelX, 80);
        doc.text(booking.location, valueX, 80);

        doc.text("Pick-up / Drop-off:", labelX, 90);
        // Handle date range format "YYYY-MM-DD to YYYY-MM-DD"
        doc.text(`${booking.dateRange} (${diffDays} days)`, valueX, 90);

        doc.text("Contact Number:", labelX, 100);
        doc.text(phone || "N/A", valueX, 100);

        doc.setLineWidth(0.5);
        doc.line(20, 110, 190, 110);

        // --- PAYMENT SUMMARY ---
        doc.setFontSize(14);
        doc.text("Payment Summary", 20, 130);

        doc.setFontSize(10);
        const priceX = 190;

        doc.text(`Rental Fee (${diffDays} days):`, labelX, 140);
        doc.text(`$${rentalFee.toFixed(2)}`, priceX, 140, { align: "right" });

        doc.text("Insurance:", labelX, 150);
        doc.text(`$${insurance.toFixed(2)}`, priceX, 150, { align: "right" });

        doc.text("Taxes & Fees:", labelX, 160);
        doc.text(`$${taxes.toFixed(2)}`, priceX, 160, { align: "right" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL PAID:", labelX, 180);
        doc.setTextColor(200, 78, 8);
        doc.text(`$${booking.totalPrice}`, priceX, 180, { align: "right" });

        // --- FOOTER ---
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Thank you for choosing SafeRent Car!", 105, 280, { align: "center" });

        doc.save(`SafeRent_${booking.id}.pdf`);
    }

    // =========================================================
    // 2. AUTH PAGES (Signup, Verify, Login, Logout)
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
            } else {
                alert("Please fill in all fields.");
            }
        });
    }

    // Verify
    const verifyBtn = document.getElementById('btn-verify-action');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
            sessionStorage.setItem('isVerified', 'true');
            alert("Account Verified! Login now.");
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

            if(hasInput) {
                window.location.href = 'index.html'; 
            } else {
                alert("Enter username/password.");
            }
        });
    }

    // Logout
    const logoutButtons = document.querySelectorAll('.btn-logout');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    });

    // =========================================================
    // 3. BOOKING FLOW (Dashboard -> List -> Booking)
    // =========================================================

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

    // Car List Selection
    const selectButtons = document.querySelectorAll('.btn-select');
    selectButtons.forEach(button => {
        button.addEventListener('click', function() {
            const carName = this.getAttribute('data-name');
            const carPrice = this.getAttribute('data-price');
            
            sessionStorage.setItem('selectedCarName', carName);
            sessionStorage.setItem('selectedCarPrice', carPrice);
            
            window.location.href = 'booking.html';
        });
    });

    // Booking Page (Confirm & Pay)
    const bookingSummary = document.querySelector('.booking-card');
    if (bookingSummary) {
        // Retrieve
        const location = sessionStorage.getItem('rentalLocation') || "San Francisco Airport (SFO)";
        const pickupStr = sessionStorage.getItem('pickupDate') || "05/12/2025 10:00 AM";
        const dropoffStr = sessionStorage.getItem('dropoffDate') || "10/12/2025 11:00 AM";
        const carName = sessionStorage.getItem('selectedCarName') || "Toyota Vios";
        const carPrice = parseFloat(sessionStorage.getItem('selectedCarPrice')) || 35;

        // Calc
        const date1 = parseDate(pickupStr);
        const date2 = parseDate(dropoffStr);
        let diffDays = Math.ceil(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24)) || 1;
        if(diffDays < 1) diffDays = 1;
        
        const rentalFee = carPrice * diffDays;
        const insurance = 25.00;
        const taxes = 15.50;
        const total = rentalFee + insurance + taxes;

        // Display
        document.getElementById('display-car').textContent = carName;
        document.getElementById('display-location').textContent = location;
        document.getElementById('display-dates').textContent = `${formatD(date1)} to ${formatD(date2)}`;
        document.getElementById('label-days').textContent = `Rental Fee (${diffDays} days):`;
        document.getElementById('display-rental-fee').textContent = `$${rentalFee.toFixed(2)}`;
        document.getElementById('display-total').textContent = `$${total.toFixed(2)}`;
        
        const payBtn = document.getElementById('btn-pay-text');
        payBtn.textContent = `Confirm & Pay $${total.toFixed(2)}`;

        // Button Action
        payBtn.addEventListener('click', () => {
            const phoneInput = document.querySelector('.payment-form-box input[placeholder="123 456 7890"]');
            const phoneNumber = phoneInput ? phoneInput.value : "";

            const newBooking = {
                id: "SR" + Math.floor(100000 + Math.random() * 900000),
                carName: carName,
                location: location,
                dateRange: `${formatD(date1)} to ${formatD(date2)}`,
                totalPrice: total.toFixed(2),
                phone: phoneNumber, // Saved for later receipts
                status: "Active", 
                isPast: false
            };

            // Save to Storage
            let bookings = JSON.parse(sessionStorage.getItem('myBookings')) || [];
            bookings.push(newBooking);
            sessionStorage.setItem('myBookings', JSON.stringify(bookings));

            // Generate PDF
            generateDetailedPDF(newBooking, diffDays, rentalFee, insurance, taxes, phoneNumber);

            // Redirect
            setTimeout(() => {
                window.location.href = 'my-bookings.html';
            }, 1000); 
        });
    }

    // =========================================================
    // 4. MY BOOKINGS PAGE (List, Cancel, Download Receipt)
    // =========================================================
    const bookingsListContainer = document.getElementById('bookings-list');
    
    if (bookingsListContainer) {
        let bookings = JSON.parse(sessionStorage.getItem('myBookings')) || [];

        // Dummy Data if empty
        if (bookings.length === 0) {
            bookings = [{
                id: "SR123456",
                carName: "Toyota Vios (Past Example)",
                location: "SFO",
                dateRange: "2024-01-01 to 2024-01-05",
                totalPrice: "215.50",
                phone: "123 456 7890",
                status: "Completed",
                isPast: true
            }];
            sessionStorage.setItem('myBookings', JSON.stringify(bookings));
        }

        document.getElementById('bookings-title').textContent = `MY BOOKINGS (${bookings.length} Total)`;
        bookingsListContainer.innerHTML = ''; 
        
        // Render List (Newest first)
        bookings.slice().reverse().forEach(booking => {
            const badgeClass = booking.status === "Active" ? "active" : "completed";
            const titleText = booking.status === "Active" ? "Upcoming Rental" : "Past Rental";
            
            // Note: Added data-id to buttons
            const btnHtml = booking.status === "Active" 
                ? `<button class="btn-cancel" data-id="${booking.id}">Cancel</button>` 
                : `<button class="btn-receipt" data-id="${booking.id}">Download Receipt</button>`;

            const cardHtml = `
                <div class="booking-card">
                    <div class="card-top">
                        <h3>${titleText}</h3>
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
                            <p>Total: $${booking.totalPrice}</p>
                        </div>
                    </div>
                    <div class="card-actions">
                        <a href="#">View Details</a>
                        ${btnHtml}
                    </div>
                </div>
            `;
            bookingsListContainer.innerHTML += cardHtml;
        });

        // --- NEW: EVENT LISTENERS FOR CANCEL & RECEIPT ---
        
        // 1. Cancel Buttons
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', function() {
                const idToRemove = this.getAttribute('data-id');
                
                if(confirm("Are you sure you want to cancel booking " + idToRemove + "?")) {
                    // Filter out the booking
                    bookings = bookings.filter(b => b.id !== idToRemove);
                    // Update Storage
                    sessionStorage.setItem('myBookings', JSON.stringify(bookings));
                    // Reload Page
                    location.reload();
                }
            });
        });

        // 2. Receipt Buttons
        document.querySelectorAll('.btn-receipt').forEach(btn => {
            btn.addEventListener('click', function() {
                const idToFind = this.getAttribute('data-id');
                const booking = bookings.find(b => b.id === idToFind);

                if (booking) {
                    // Re-calculate costs to generate PDF
                    // We know Total = RentalFee + 25 + 15.50
                    // So RentalFee = Total - 40.50
                    const insurance = 25.00;
                    const taxes = 15.50;
                    const total = parseFloat(booking.totalPrice);
                    const rentalFee = total - insurance - taxes;

                    // Calculate Days from dateRange string "YYYY-MM-DD to YYYY-MM-DD"
                    const dates = booking.dateRange.split(' to ');
                    let diffDays = 1;
                    if(dates.length === 2) {
                        const d1 = new Date(dates[0]);
                        const d2 = new Date(dates[1]);
                        diffDays = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
                    }

                    // Generate
                    generateDetailedPDF(booking, diffDays, rentalFee, insurance, taxes, booking.phone);
                }
            });
        });
    }

});
