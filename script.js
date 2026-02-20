// ===============================
// SUPABASE INITIALIZATION
// ===============================
const SUPABASE_URL = 'https://pnmbukndwvsjxlidtyjy.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_S2HcIii2kVuZ59G191GhRg_hwL-vlnL';
const supabase = window.supabase.createClient('https://pnmbukndwvsjxlidtyjy.supabase.co', 'sb_publishable_S2HcIii2kVuZ59G191GhRg_hwL-vlnL');

let currentUser = null;
let currentOTP = null;
let tempRegisterData = {};
let newCourseFiles = [];
let activeCourseId = null;

// Hardcoded Admin
const ADMIN_EMAILS = [
    'princesmile8510@gmail.com',
    'ashwinirpachi9@gmail.com'
];
const ADMIN_PASS = 'Pax-Learnify-Admin';

// ===============================
// REAL SUPABASE LOGIN
// ===============================
async function handleLogin() {
    const input = document.getElementById('lUser').value.trim().toLowerCase();
    const pass = document.getElementById('lPass').value.trim();

    if (!input || !pass) {
        return showAlert("Error", "Please enter Username and Password");
    }

    // Admin Login Check
    if (ADMIN_EMAILS.includes(input)) {
        if (pass === ADMIN_PASS) {
            currentUser = { name: "Administrator", role: "admin", email: input };
            loginSuccess();
            return;
        } else {
            return showAlert("Login Failed", "Invalid Admin Password");
        }
    }

    // Supabase Database Query (Checking username & password)
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', input)
        .eq('password', pass);

    if (error) {
        console.error("Login Error:", error);
        return showAlert("Database Error", "Something went wrong. Check console.");
    }

    // Agar user database mein mil gaya
    if (data && data.length > 0) {
        currentUser = data[0]; // Real User data load ho gaya
        loginSuccess();
    } else {
        showAlert("Login Failed", "Invalid Username or Password");
    }
}

function loginSuccess() {
    localStorage.setItem('activeUser', JSON.stringify(currentUser));
    document.getElementById('authScreen').classList.add('hidden');
    navigate('dashboard');
   
}

function logout() {
    localStorage.removeItem('activeUser');
    localStorage.removeItem('lastPage');
    currentUser = null;
    navigate('auth');
}

// ===============================
// APP INITIALIZATION & AUTO-LOGIN
// ===============================

// DOM load hote hi app initialize karega (Fast & Reliable)
document.addEventListener("DOMContentLoaded", initApp);
// Backup trigger in case DOMContentLoaded miss ho jaye
window.onload = initApp; 


// ===============================
// SAFE DASHBOARD LOADER
// ===============================
function loadDashboard() {
    try {
        document.getElementById('userNameDisplay').innerText = currentUser.name;

        if (currentUser.role === 'admin') {
            document.getElementById('adminMenu').classList.remove('hidden');
            document.getElementById('adminDash').classList.remove('hidden');
            
            // Function exist karta hai tabhi call karo (Taki app crash na ho)
            if (typeof renderDashboard === "function") renderDashboard();
            
        } else {
            document.getElementById('userMenu').classList.remove('hidden');
            document.getElementById('userDash').classList.remove('hidden');
            
            // Normal user ke functions safe-call kiye hain
            if (typeof renderUserCourses === "function") renderUserCourses();
            if (typeof renderCoursesForDashboard === "function") renderCoursesForDashboard();   
        }
    } catch (error) {
        console.error("Dashboard Load Error: ", error);
    }
}

function renderDashboard() {
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const slider = document.getElementById('verticalCourseSlider');
    slider.innerHTML = '';

    if (courses.length === 0) {
        slider.innerHTML = '<div style="color:#aaa; padding:10px;">No courses found. Create one!</div>';
        return;
    }

    courses.reverse().forEach(c => {
        const isFree = (c.type === 'free');
        const badgeClass = isFree ? 'free' : 'paid'; 
        const badgeText = isFree ? 'Free' : 'Paid';

        let hasDoc = false;
        let hasVideo = false;
        
        if (c.files && c.files.length > 0) {
            c.files.forEach(f => {
                if (f.type.includes('pdf')) hasDoc = true;
                else if (f.type.includes('video')) hasVideo = true;
            });
        }

        // Generating Links
        let filesHTML = '';
        if (hasVideo) filesHTML += '<div class="nac-file-link">Video File</div>';
        if (hasDoc) filesHTML += '<div class="nac-file-link">Document File</div>';
        if (!hasVideo && !hasDoc) filesHTML += '<div class="nac-file-link" style="color:#666; text-decoration:none;">No Files</div>';

        // Price formatting
        let priceHTML = isFree ? '<div class="nac-price"></div>' : `<div class="nac-price">Price ₹${c.price}</div>`;

        
        slider.innerHTML += `
        <div class="new-admin-card" onclick="openCoursePlayer(${c.id})">
            <div class="nac-img-wrapper"><img src="${c.thumb}" alt="Course Cover"></div>
            <div class="nac-content">
                <div class="nac-top-row">
                    <h3 class="nac-title">${c.title}</h3>
                    <div class="nac-badge ${badgeClass}">${badgeText}</div>
                </div>
                
                <div class="nac-mid-row">
                    <div class="nac-files">${filesHTML}</div>
                    
                    <div style="text-align: right;">
                        ${getRatingHTML(c)}
                        ${priceHTML}
                    </div>
                </div>

                <div class="nac-bottom-row">
                    <span class="nac-active-btn">Active</span>
                </div>
            </div>
        </div>`;
    });
}

// ===============================
// MOCK PAYMENT
// ===============================
function initiateRazorpayPayment() {
    if (confirm("Simulate ₹499 Payment Success?")) {
        recordPayment();
        finalizeUserCreation('user');
    }
}

function recordPayment() {
    const payments = JSON.parse(localStorage.getItem('payments'));
    payments.push({
        email: tempRegisterData.email,
        amount: 499,
        date: new Date().toISOString()
    });
    localStorage.setItem('payments', JSON.stringify(payments));
}

function renderEarnings() {
    const payments = JSON.parse(localStorage.getItem('payments'));
    const tbody = document.querySelector('#txnTable tbody');
    const totalSpan = document.getElementById('adEarnings');

    tbody.innerHTML = '';
    let total = 0;

    payments.forEach(p => {
        total += p.amount;
        tbody.innerHTML += `
            <tr>
                <td>${p.email}</td>
                <td>Registration</td>
                <td>₹${p.amount}</td>
            </tr>`;
    });

    totalSpan.innerText = total;
}

// ===============================
// OTP, UPI & REGISTRATION SYSTEM
// ===============================

// Form fields check aur REAL OTP generate via Supabase
async function sendOTP(flow) {
    let nameId = flow === 'admin' ? 'amName' : 'refName';
    let emailId = flow === 'admin' ? 'amEmail' : 'refEmail';

    const name = document.getElementById(nameId).value.trim();
    const email = document.getElementById(emailId).value.trim();

    if (!name || !email) return alert("Error: Full Name and Email are mandatory fields!");
    if (!email.includes("@") || !email.includes(".")) return alert("Error: Please enter a valid email address.");

    // Supabase OTP Send Request
    const { data, error } = await supabase.auth.signInWithOtp({
        email: email,
        options: { shouldCreateUser: true }
    });

    if (error) {
        return alert("Failed to send OTP: " + error.message);
    }

    tempRegisterData = { full_name: name, email: email, role: 'user' };
    alert(`OTP successfully sent to ${email}!`);

    if (flow === 'admin') {
        document.getElementById('amStep1').classList.add('hidden');
        document.getElementById('amStep2').classList.remove('hidden');
    } else {
        document.getElementById('refStep1').classList.add('hidden');
        document.getElementById('refStep2').classList.remove('hidden');
    }
}

// REAL OTP Verify karna via Supabase
async function verifyOTP(flow) {
    let otpId = flow === 'admin' ? 'amOTP' : 'refOTP';
    const inputOTP = document.getElementById(otpId).value.trim();

    // Supabase OTP Verification
    const { data: { session }, error } = await supabase.auth.verifyOtp({
        email: tempRegisterData.email,
        token: inputOTP,
        type: 'email'
    });

    if (error) {
        return alert("Invalid OTP: " + error.message);
    }

    if (flow === 'admin') {
        // Admin flow: Direct Create Account
        finalizeUserCreation('admin');
    } else {
        // User flow: Payment screen par bhejo
        document.getElementById('refStep2').classList.add('hidden');
        document.getElementById('refStep3').classList.remove('hidden');
    }
}

// 🚀 UPI PAYMENT LOGIC 🚀
// 🚀 REAL RAZORPAY PAYMENT LOGIC 🚀
function payWithUPI() {
    var options = {
        "key": "YOUR_RAZORPAY_KEY_ID", // Yaha apna Razorpay Key ID dalein
        "amount": "49900", // Amount paise mein hota hai (49900 = ₹499)
        "currency": "INR",
        "name": "Pax Learnify",
        "description": "Premium Course Access",
        "image": "https://uploads.onecompiler.io/4444s4cvz/44d69n6eu/1000014528.png",
        "handler": function (response) {
            // Payment successful hone par ye chalega
            recordPayment(response.razorpay_payment_id);
            finalizeUserCreation('user');
        },
        "prefill": {
            "name": tempRegisterData.full_name,
            "email": tempRegisterData.email
        },
        "theme": {
            "color": "#8e2de2" // Apni theme ka neon purple color
        }
    };
    
    var rzp1 = new Razorpay(options);
    
    rzp1.on('payment.failed', function (response){
        alert("Payment Failed! Reason: " + response.error.description);
    });
    
    rzp1.open(); // Razorpay popup open karega
}

// Payment record in Supabase (Optional but recommended)
async function recordPayment(paymentId) {
    const { data, error } = await supabase
        .from('payments')
        .insert([
            { email: tempRegisterData.email, amount: 499, payment_id: paymentId, date: new Date().toISOString() }
        ]);
        
    if(error) console.error("Error saving payment record:", error);
}

// User create karna aur Supabase Database mein save karna
async function finalizeUserCreation(flow) {
    // Generate username and password
    const username = tempRegisterData.full_name.split(' ')[0].toLowerCase() + Math.floor(100 + Math.random() * 900);
    const password = Math.random().toString(36).slice(-8);

    // Save user data to Supabase 'users' table
    const { data, error } = await supabase
        .from('users')
        .insert([
            { 
                name: tempRegisterData.full_name, 
                email: tempRegisterData.email, 
                username: username, 
                password: password, // Note: In production, passwords should ideally be hashed
                role: 'user', 
                purchased: [] 
            }
        ]);

    if (error) {
        return alert("Database Error: Could not save user details. " + error.message);
    }

    // Show Success Result on UI
    if (flow === 'admin') {
        document.getElementById('amStep2').classList.add('hidden');
        document.getElementById('amSuccess').classList.remove('hidden');
        document.getElementById('genUser').innerText = username;
        document.getElementById('genPass').innerText = password;
    } else {
        document.getElementById('refStep3').classList.add('hidden');
        document.getElementById('refSuccess').classList.remove('hidden');
        document.getElementById('refGenUser').innerText = username;
        document.getElementById('refGenPass').innerText = password;
    }
}

// ===============================
// FETCH USERS FROM SUPABASE (ADMIN)
// ===============================
async function fetchAndRenderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    const totalUsersCount = document.getElementById('totalUsersCount');
    
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading users...</td></tr>';

    // Supabase se saare users fetch karein
    const { data: users, error } = await supabase
        .from('users')
        .select('*');

    if (error) {
        console.error("Error fetching users:", error);
        tbody.innerHTML = '<tr><td colspan="3" style="color:red; text-align:center;">Failed to load users</td></tr>';
        return;
    }

    tbody.innerHTML = ''; // Loading text hata dein
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No users found.</td></tr>';
        if (totalUsersCount) totalUsersCount.innerText = "0";
        return;
    }

    if (totalUsersCount) totalUsersCount.innerText = users.length;

    users.forEach(u => {
        // Date formatting agar jarurat ho toh
        const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A';
        
        tbody.innerHTML += `
        <tr>
            <td>${u.name}</td>
            <td>${u.username}</td>
            <td>${joinedDate}</td>
        </tr>`;
    });
}

// ===============================
// COURSES (LOCAL)
// ===============================


function renderCourseTable() {

    const container = document.getElementById('manageCourseList');
    container.innerHTML = '';

    const courses = JSON.parse(localStorage.getItem('courses')) || [];

    if (courses.length === 0) {
        container.innerHTML = '<p>No courses available.</p>';
        return;
    }

    courses.reverse().forEach(c => {
        container.innerHTML += `
        <div class="course-wide-card" onclick="openCoursePlayer(${c.id})">
            <img src="${c.thumb}" class="bg-img">
            <div class="overlay">
                <div class="wide-card-row">
                    <h3 class="wide-card-title">${c.title}</h3>
                    <div class="wide-card-meta">
                        <span class="wide-price">
                            ${c.type === 'free' ? 'Free' : '₹' + c.price}
                        </span>
                        <span class="wide-arrow">›</span>
                    </div>
                </div>
            </div>
        </div>`;
    });
}

function previewFiles(type){
    if(type !== "thumb") return;

    const file = document.getElementById("cThumb").files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = function(e){
        // Direct preview without crop
        document.getElementById("thumbPreviewText").innerHTML =
            `<img src="${e.target.result}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;">`;
    };
    reader.readAsDataURL(file);
}

function createCourse() {
    const title = document.getElementById('cTitle').value;
    if(!title) return showAlert("Error","Title Required");

    const thumbInput = document.getElementById("cThumb");
    const thumbFile = thumbInput.files[0];

    const newCourse = {
        id: Date.now(),
        title: title,
        desc: document.getElementById('cDesc').value,
        type: document.getElementById('cType').value,
        price: document.getElementById('cPrice').value,
        thumb: "",
        files: []
    };

    if(thumbFile){
        const reader = new FileReader();
        reader.onload = function(e){
            newCourse.thumb = e.target.result;
            saveCourseWithFiles(newCourse);
        };
        reader.readAsDataURL(thumbFile);
    } else {
        newCourse.thumb = "https://via.placeholder.com/800x450?text=Course";
        saveCourseWithFiles(newCourse);
    }
}

function togglePriceInput() {
    const type = document.getElementById("cType").value;
    const priceBox = document.getElementById("priceInputContainer");

    if(type === "free") {
        priceBox.style.display = "none";
    } else {
        priceBox.style.display = "block";
    }
}
window.addEventListener("DOMContentLoaded", togglePriceInput);

function addFilesToDraft() {

    const input = document.getElementById("cFiles");
    const list = document.getElementById("draftFileList");

    list.innerHTML = "";

    if(!input.files.length) return;

    for(let i=0; i<input.files.length; i++) {

        const file = input.files[i];

        list.innerHTML += `
            <div class="file-item-row">
                <div class="file-info">
                    <span class="file-name">${file.name}</span>
                    <span class="file-type">${file.type}</span>
                </div>
            </div>
        `;
    }
}

function saveCourseWithFiles(course){

    const fileInput = document.getElementById("cFiles");
    const files = fileInput.files;

    let fileReadCount = 0;

    const courses = JSON.parse(localStorage.getItem("courses") || "[]");

    if(files.length === 0){
        courses.push(course);
        localStorage.setItem("courses", JSON.stringify(courses));
        navigate("manage-courses");
        return;
    }

    for(let i = 0; i < files.length; i++){

        const reader = new FileReader();

        reader.onload = function(e){

            course.files.push({
                name: files[i].name,
                type: files[i].type,
                url: e.target.result
            });

            fileReadCount++;

            if(fileReadCount === files.length){
                courses.push(course);
                localStorage.setItem("courses", JSON.stringify(courses));
                navigate("manage-courses");
            }
        };

        reader.readAsDataURL(files[i]);
    }
}

function openCoursePlayer(courseId) {
    activeCourseId = courseId;
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const course = courses.find(c => c.id === courseId);
    
    if (!course) return;

    // Sab views hide
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));

    // Player show
    document.getElementById('coursePlayerView').classList.remove('hidden');

    // Title & Description set
    document.getElementById('playerTitle').innerText = course.title;
    document.getElementById('playerDesc').innerText = course.desc;

    // Banner image
    document.getElementById('mainMediaContainer').innerHTML =
        `<img src="${course.thumb}" style="width:100%;height:100%;object-fit:cover;">`;

    renderFiles(course);

    // 🔥 ROLE BASED CONTROL
    document.getElementById('adminToolbar').classList.add('hidden'); // Pehle humesha hide rakho

    if (currentUser.role === 'admin') {
        document.getElementById('editToggleSection').classList.remove('hidden');
        document.getElementById('editModeToggle').checked = false; // Toggle by default OFF
        document.getElementById("playerDesc").contentEditable = false; // Editing OFF
        document.getElementById("playerDesc").style.border = "none";
    } else {
        document.getElementById('editToggleSection').classList.add('hidden');
    }
}

function renderFiles(course) {
    const list = document.getElementById("playerFileList");
    list.innerHTML = "";

    course.files.forEach((file, index) => {
        // Icon logic: PDF hai ya Video
        const iconClass = file.type.includes('pdf') ? 'fa-file-pdf' : 'fa-play-circle';
        
        list.innerHTML += `
        <div class="file-item">
            <span onclick="openFile('${file.url}','${file.type}', '${file.name}')" style="cursor:pointer; color: var(--neon-purple); display: flex; align-items: center; gap: 10px;">
                <i class="fas ${iconClass}" style="font-size: 1.2rem;"></i> ${file.name}
            </span>
            <button class="file-delete-btn hidden" 
                id="del-${index}"
                onclick="deleteFile(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>`;
    });
}

async function openFile(url, type, fileName = "Document Viewer") {

    if(type.includes("pdf")) {
        // PDF Reader screen on karo
        document.getElementById('documentReaderView').classList.remove('hidden');
        document.getElementById('readerDocTitle').innerText = fileName;
        
        const container = document.getElementById('pdfRenderer');
        container.innerHTML = '<div style="padding: 30px; text-align: center; color: #333; font-size: 1.2rem;">Loading Document... <i class="fas fa-spinner fa-spin"></i></div>';

        try {
            let pdf;
            // Agar file offline system se upload hui hai (base64 string)
            if (url.startsWith('data:application/pdf;base64,')) {
                const base64 = url.split(',')[1];
                const binary = atob(base64);
                const array = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) {
                    array[i] = binary.charCodeAt(i);
                }
                pdf = await pdfjsLib.getDocument({ data: array }).promise;
            } else {
                // Agar direct URL hai
                pdf = await pdfjsLib.getDocument(url).promise;
            }

            container.innerHTML = ''; // Loading text hatao

            // Har ek page ko canvas par render karo
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Screen size ke hisaab se PDF ko fit karna
                const unscaledViewport = page.getViewport({ scale: 1.0 });
                const scale = (container.clientWidth - 20) / unscaledViewport.width;
                const finalScale = scale > 1.5 ? 1.5 : scale; // Max zoom limit
                
                const viewport = page.getViewport({ scale: finalScale });

                // 🔥 HD CRISP TEXT FIX (Isse text blur nahi hoga) 🔥
                const outputScale = window.devicePixelRatio || 1;

                // Canvas ki internal resolution (quality) ko phone ki screen k hisaab se double/triple karo
                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                
                // CSS visual size utni hi rakho jitni screen par chahiye
                canvas.style.width = Math.floor(viewport.width) + "px";
                canvas.style.height = Math.floor(viewport.height) + "px";
                
                // Styling
                canvas.style.display = "block";
                canvas.style.margin = "15px auto";
                canvas.style.boxShadow = "0 4px 15px rgba(0,0,0,0.2)";
                canvas.style.backgroundColor = "#fff";

                container.appendChild(canvas);

                const renderContext = {
                    canvasContext: ctx,
                    transform: [outputScale, 0, 0, outputScale, 0, 0], // HD scaling apply karo
                    viewport: viewport
                };
                await page.render(renderContext).promise;
            }
        } catch (error) {
            console.error("PDF Render Error: ", error);
            container.innerHTML = '<div style="padding: 20px; color: red; text-align: center;">Error loading document. Invalid File.</div>';
        }
    }
    else if(type.includes("video")) {
        // Video play logic
        document.getElementById("mainMediaContainer").innerHTML = `
            <video src="${url}" controls autoplay controlsList="nodownload"
            style="width:100%; height:100%; object-fit:contain; background:#000;">
            </video>`;
    }
}

function closeDocumentReader() {
    document.getElementById('documentReaderView').classList.add('hidden');
    document.getElementById('pdfRenderer').innerHTML = ''; // Memory clean karo
}

// ===============================
// ALERT
// ===============================
function showAlert(title, msg) {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    document.getElementById('customAlert').classList.remove('hidden');
}

function closeAlert() {
    document.getElementById('customAlert').classList.add('hidden');
}
// ===============================
// Side Menu bar Function 
// ===============================
function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const overlay = document.getElementById("sidebarOverlay");

    const isOpen = sidebar.classList.contains("active");

    if (isOpen) {
        sidebar.classList.remove("active");
        overlay.style.display = "none";
        document.body.style.overflow = "auto";
    } else {
        sidebar.classList.add("active");
        overlay.style.display = "block";
        document.body.style.overflow = "hidden";
    }
}

function closeSidebar() {
    document.getElementById("mySidebar").classList.remove("active");
    document.getElementById("sidebarOverlay").style.display = "none";
    document.body.style.overflow = "auto";
}

// ===============================
// NAVIGATION SYSTEM
// ===============================
function navigate(viewName) {

    if(viewName === 'manage-courses'){
    renderCourseTable();
}
    // Agar user login nahi hai toh sirf auth screen dikhao
    if (!currentUser && viewName !== 'auth') {
        document.querySelectorAll('.view-section')
            .forEach(v => v.classList.add('hidden'));

        document.getElementById('authScreen').classList.remove('hidden');
        return;
    }
    if (viewName !== 'auth') {
        localStorage.setItem('lastPage', viewName);
    }
    // Sab views hide karo
    document.querySelectorAll('.view-section')
        .forEach(v => v.classList.add('hidden'));

    closeSidebar();

    switch(viewName) {

        case 'auth':
            document.getElementById('authScreen').classList.remove('hidden');
            break;

        case 'dashboard':
            if (!currentUser) return navigate('auth');
            if (currentUser.role === 'admin') {
                document.getElementById('adminDash').classList.remove('hidden');
                renderDashboard(); // 🔥 Yahan par bhi missing thi
            } else {
                document.getElementById('userDash').classList.remove('hidden');
                renderUserCourses();
            }
            break;

        case 'users-list':
            if (currentUser.role !== 'admin') return;
            document.getElementById('usersListView').classList.remove('hidden');
            fetchAndRenderUsers();
            break;

        case 'manage-courses':
            if (currentUser.role !== 'admin') return;
            document.getElementById('manageCoursesView').classList.remove('hidden');
            renderCourseTable();
            break;

        case 'add-course':
            if (currentUser.role !== 'admin') return;
            document.getElementById('addCourseView').classList.remove('hidden');
            break;

        case 'add-member':
            if (currentUser.role !== 'admin') return;
            document.getElementById('addMemberView').classList.remove('hidden');
            break;

        case 'earnings':
            if (currentUser.role !== 'admin') return;
            document.getElementById('earningsView').classList.remove('hidden');
            renderEarnings();
            break;

        case 'referrals':
            document.getElementById('userReferralsView').classList.remove('hidden');
            break;

        case 'store':
            document.getElementById('userStoreView').classList.remove('hidden');
            if (typeof renderStoreCourses === "function") renderStoreCourses(); // Ye line add karni hai
            break;
            
        case 'settings':
            document.getElementById('userSettingsView').classList.remove('hidden');
            document.getElementById('editDisplayName').value = currentUser.name;
            break;
        
        case 'about':
    document.getElementById('aboutView').classList.remove('hidden');
    break;
    
    }
}

//================
// Viewpage Edit
//================
function toggleEditMode() {
    const isOn = document.getElementById("editModeToggle").checked;
    const toolbar = document.getElementById("adminToolbar");
    const fileDeletes = document.querySelectorAll(".file-delete-btn");
    const descElem = document.getElementById("playerDesc");

    if (isOn) {
        // Edit Mode ON: Toolbar aur delete button dikhao
        toolbar.classList.remove("hidden");
        fileDeletes.forEach(btn => btn.classList.remove("hidden"));

        // Description Editing ON karo
        descElem.contentEditable = true;
        descElem.focus();
        descElem.style.border = "2px dashed var(--neon-purple)";
        descElem.style.padding = "10px";
        descElem.style.borderRadius = "8px";
        descElem.style.background = "#f4f4f4"; // Thoda highlight
        descElem.style.outline = "none";

    } else {
        // Edit Mode OFF: Toolbar aur delete button chhupao
        toolbar.classList.add("hidden");
        fileDeletes.forEach(btn => btn.classList.add("hidden"));

        // Description Editing OFF karo
        descElem.contentEditable = false;
        descElem.style.border = "none";
        descElem.style.padding = "0";
        descElem.style.background = "transparent";

        // Save description to local storage
        saveEditedDescription(descElem.innerText);
    }
}

// Ye function edited description ko memory me save karega
function saveEditedDescription(newText) {
    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const courseIndex = courses.findIndex(c => c.id === activeCourseId);
    
    if (courseIndex !== -1) {
        courses[courseIndex].desc = newText;
        localStorage.setItem('courses', JSON.stringify(courses));
    }
}

async function deleteFile(index) {
    const isConf = await showPremiumModal("Delete File", "Are you sure you want to delete this file?", "confirm");
    if(!isConf) return;

    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const courseIndex = courses.findIndex(c => c.id === activeCourseId);

    if (courseIndex !== -1) {
        courses[courseIndex].files.splice(index, 1);
        localStorage.setItem("courses", JSON.stringify(courses));
        renderFiles(courses[courseIndex]);
        if (document.getElementById("editModeToggle").checked) {
            document.querySelectorAll(".file-delete-btn").forEach(btn => btn.classList.remove("hidden"));
        }
    }
}

function adminAddFiles() {
    const fileInput = document.getElementById('addFileInput');
    const files = fileInput.files;
    
    if (!files || files.length === 0) return;

    const courses = JSON.parse(localStorage.getItem('courses')) || [];
    const courseIndex = courses.findIndex(c => c.id === activeCourseId);
    
    if (courseIndex === -1) return;

    let count = 0;

    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            courses[courseIndex].files.push({
                name: files[i].name,
                type: files[i].type,
                url: e.target.result
            });
            count++;
            
            if (count === files.length) {
                localStorage.setItem("courses", JSON.stringify(courses));
                renderFiles(courses[courseIndex]); // UI me nayi file dikhao
                
                // Agar edit mode ON hai, toh naye aane wale trash icons dikhao
                if (document.getElementById("editModeToggle").checked) {
                    document.querySelectorAll(".file-delete-btn").forEach(btn => btn.classList.remove("hidden"));
                }
                
                // Input clear karo taaki baad me same file dobara upload ho sake
                fileInput.value = ""; 
            }
        };
        reader.readAsDataURL(files[i]);
    }
}

function adminChangeBanner() {
    const fileInput = document.getElementById('bannerInput');
    const file = fileInput.files[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const courses = JSON.parse(localStorage.getItem('courses')) || [];
        const courseIndex = courses.findIndex(c => c.id === activeCourseId);

        if(courseIndex !== -1) {
            courses[courseIndex].thumb = e.target.result;
            localStorage.setItem("courses", JSON.stringify(courses));
            
            // Screen par banner image instantly update karo
            document.querySelector("#mainMediaContainer img").src = e.target.result;
            
            // Input clear karo
            fileInput.value = "";
        }
    };
    reader.readAsDataURL(file);
}

async function deleteCurrentCourse() {
    const isConf = await showPremiumModal("Delete Course", "Are you sure you want to permanently delete this course?", "confirm");
    if(!isConf) return;

    let courses = JSON.parse(localStorage.getItem('courses')) || [];
    courses = courses.filter(c => c.id !== activeCourseId);
    localStorage.setItem("courses", JSON.stringify(courses));
    navigate("dashboard");
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
    });

    document.getElementById(pageId).style.display = 'block';
}
// --- PUBLISH BUTTON & STORAGE LIMIT FIX ---
function saveCourseWithFiles(course) {
    const fileInput = document.getElementById("cFiles");
    const files = fileInput.files;

    let fileReadCount = 0;
    const courses = JSON.parse(localStorage.getItem("courses") || "[]");

    if(files.length === 0){
        try {
            courses.push(course);
            localStorage.setItem("courses", JSON.stringify(courses));
            clearCourseForm(); 
            navigate("manage-courses");
        } catch(e) {
            showAlert("Storage Error", "Browser storage is full! Delete old courses.");
        }
        return;
    }

    for(let i = 0; i < files.length; i++){
        const reader = new FileReader();

        reader.onload = function(e){
            course.files.push({
                name: files[i].name,
                type: files[i].type,
                url: e.target.result
            });

            fileReadCount++;

            if(fileReadCount === files.length){
                try {
                    courses.push(course);
                    localStorage.setItem("courses", JSON.stringify(courses));
                    clearCourseForm(); 
                    navigate("manage-courses");
                } catch(e) {
                    // Agar limit 5MB se jyada ho jaye
                    showAlert("Storage Full ⚠️", "No-Backend mode me tum LocalStorage me badi Video ya PDF save nahi kar sakte (Limit 5MB). Kripya sirf Image upload karein ya choti file lagayein.");
                }
            }
        };
        reader.readAsDataURL(files[i]);
    }
}

// Publish hone ke baad form wapas naya jaisa karne k liye
function clearCourseForm() {
    document.getElementById('cTitle').value = "";
    document.getElementById('cDesc').value = "";
    document.getElementById('cPrice').value = "";
    document.getElementById("thumbPreviewText").innerHTML = "Tap to select image";
    document.getElementById("cThumb").dataset.cropped = "";
    document.getElementById("draftFileList").innerHTML = "";
    document.getElementById("cFiles").value = "";
    document.getElementById("cThumb").value = "";
}

// ===============================
// USER DASHBOARD RENDER LOGIC
// ===============================
function renderUserCourses() {
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const unlockedContainer = document.getElementById('userUnlockedCourses');
    const lockedContainer = document.getElementById('userLockedCourses');
    
    unlockedContainer.innerHTML = '';
    lockedContainer.innerHTML = '';

    if (courses.length === 0) {
        unlockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">No courses available yet.</div>';
        lockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">No courses available yet.</div>';
        return;
    }

    let hasUnlocked = false;
    let hasLocked = false;

    // User ke kharide hue courses ki list (No-backend me data save karne k liye)
    const purchased = currentUser.purchased || [];

    courses.reverse().forEach(c => {
        const isFree = (c.type === 'free');
        
        // Agar course free hai YA user ne already kharida hai, toh usko Owned manenge
        const isOwned = isFree || purchased.includes(c.id);
        
        const badgeClass = isFree ? 'free' : 'paid'; 
        const badgeText = isFree ? 'Free' : 'Paid';

        let hasDoc = false;
        let hasVideo = false;
        
        if (c.files && c.files.length > 0) {
            c.files.forEach(f => {
                if (f.type.includes('pdf')) hasDoc = true;
                else if (f.type.includes('video')) hasVideo = true;
            });
        }

        let filesHTML = '';
        if (hasVideo) filesHTML += '<div class="nac-file-link">Video File</div>';
        if (hasDoc) filesHTML += '<div class="nac-file-link">Document File</div>';
        if (!hasVideo && !hasDoc) filesHTML += '<div class="nac-file-link" style="color:#666; text-decoration:none;">No Files</div>';

        let priceHTML = isFree ? '<div class="nac-price"></div>' : `<div class="nac-price">Price ₹${c.price}</div>`;

        // 🔥 Owned aur Locked UI Logic 🔥
        let bottomBtnHTML = '';
        let onClickAction = '';

        if (isOwned) {
            bottomBtnHTML = `<span class="nac-active-btn" style="color: #00e600; border-color: rgba(0, 230, 0, 0.3); background: rgba(0, 230, 0, 0.1);"><i class="fas fa-check-circle"></i> Owned</span>`;
            onClickAction = `onclick="openCoursePlayer(${c.id})"`; // Video Player kholega
        } else {
            bottomBtnHTML = `<span class="nac-active-btn" style="color: #ff4757; border-color: rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.1);"><i class="fas fa-lock"></i> Locked</span>`;
            onClickAction = `onclick="showAlert('Course Locked', 'This is a paid course. In a real app, clicking here will open the payment page to buy this course.')"`; // Payment Gateway prompt
        }

        
        const cardHTML = `
        <div class="new-admin-card" ${onClickAction}>
            <div class="nac-img-wrapper"><img src="${c.thumb}" alt="Course Cover"></div>
            <div class="nac-content">
                <div class="nac-top-row">
                    <h3 class="nac-title">${c.title}</h3>
                    <div class="nac-badge ${badgeClass}">${badgeText}</div>
                </div>
                
                <div class="nac-mid-row">
                    <div class="nac-files">${filesHTML}</div>
                    
                    <div style="text-align: right;">
                        ${getRatingHTML(c)}
                        ${priceHTML}
                    </div>
                </div>

                <div class="nac-bottom-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    ${bottomBtnHTML}
                    ${(c.isOwned || isOwned) ? `<span onclick="openRatingModal(event, ${c.id}, '${c.title.replace(/'/g, "\\'")}')" style="color: #FFD700; font-size: 0.85rem; font-weight: 600; background: rgba(255, 215, 0, 0.1); padding: 5px 12px; border-radius: 20px; cursor: pointer; border: 1px solid rgba(255, 215, 0, 0.3); transition: 0.3s;"><i class="fas fa-star"></i> Rate</span>` : ''}
                </div>
            </div>
        </div>`;

        if (isOwned) {
            unlockedContainer.innerHTML += cardHTML;
            hasUnlocked = true;
        } else {
            lockedContainer.innerHTML += cardHTML;
            hasLocked = true;
        }
    });

    // Agar list khali hai toh ek text show karega
    if (!hasUnlocked) unlockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">You haven\'t unlocked any courses yet.</div>';
    if (!hasLocked) lockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">No more courses to explore!</div>';
}

// ===============================
// COURSE STORE RENDER LOGIC
// ===============================
function renderStoreCourses() {
    const courses = JSON.parse(localStorage.getItem('courses') || '[]');
    const storeContainer = document.getElementById('storeAllCourses');
    
    // Class ko update karke hamari nawi 2-column grid lagana
    storeContainer.className = 'store-grid';
    storeContainer.innerHTML = '';

    if (courses.length === 0) {
        storeContainer.innerHTML = '<div style="color:#aaa; grid-column: span 2; text-align:center;">No courses available in store.</div>';
        return;
    }

    const purchased = currentUser.purchased || [];

    // Pehle map karte hain ki kon sa Owned hai aur kon sa Locked
    let storeList = courses.map(c => {
        const isFree = (c.type === 'free');
        c.isOwned = isFree || purchased.includes(c.id);
        return c;
    });

    // 🔥 MAGIC FIX: Sorting -> Owned wale top par, Locked wale niche 🔥
    storeList.sort((a, b) => {
        if (a.isOwned === b.isOwned) {
            return b.id - a.id; // Agar dono same hain toh naya wala pehle
        }
        return a.isOwned ? -1 : 1; // Owned (true) wale ko oopar (top) bhej do
    });

    // Ab Sorted list ko render karna
    storeList.forEach(c => {
        const badgeClass = c.type === 'free' ? 'free' : 'paid'; 
        const badgeText = c.type === 'free' ? 'Free' : 'Paid';

        let hasDoc = false;
        let hasVideo = false;
        
        if (c.files && c.files.length > 0) {
            c.files.forEach(f => {
                if (f.type.includes('pdf')) hasDoc = true;
                else if (f.type.includes('video')) hasVideo = true;
            });
        }

        // Text chote kiye gaye hain taaki card mein fit ho jayein
        let filesHTML = '';
        if (hasVideo) filesHTML += '<div class="nac-file-link">Video</div>';
        if (hasDoc) filesHTML += '<div class="nac-file-link">Document</div>';
        if (!hasVideo && !hasDoc) filesHTML += '<div class="nac-file-link" style="color:#666; text-decoration:none;">No Files</div>';

        let priceHTML = c.type === 'free' ? '<div class="nac-price"></div>' : `<div class="nac-price">₹${c.price}</div>`;

        let bottomBtnHTML = '';
        let onClickAction = '';

        if (c.isOwned) {
            bottomBtnHTML = `<span class="nac-active-btn" style="color: #00e600; border-color: rgba(0, 230, 0, 0.3); background: rgba(0, 230, 0, 0.1);"><i class="fas fa-check-circle"></i> Owned</span>`;
            onClickAction = `onclick="openCoursePlayer(${c.id})"`;
        } else {
            bottomBtnHTML = `<span class="nac-active-btn" style="color: #ff4757; border-color: rgba(255, 71, 87, 0.3); background: rgba(255, 71, 87, 0.1);"><i class="fas fa-lock"></i> Locked</span>`;
            onClickAction = `onclick="showAlert('Course Locked', 'Buy this course to unlock.')"`; 
        }

        storeContainer.innerHTML += `
        <div class="new-admin-card" ${onClickAction}>
            <div class="nac-img-wrapper">
                <img src="${c.thumb}" alt="Course Cover">
            </div>
            
            <div class="nac-content">
                <div class="nac-top-row">
                    <h3 class="nac-title">${c.title}</h3>
                    <div class="nac-badge ${badgeClass}">${badgeText}</div>
                </div>
                
                <div class="nac-mid-row">
                    <div class="nac-files">
                        ${filesHTML}
                    </div>
                    ${priceHTML}
                </div>

                <div class="nac-bottom-row">
                    ${bottomBtnHTML}
                </div>
            </div>
        </div>`;
        
        // ... (Upar ka code same rahega) ...
        const cardHTML = `
        <div class="new-admin-card" ${onClickAction}>
            <div class="nac-img-wrapper"><img src="${c.thumb}" alt="Course Cover"></div>
            <div class="nac-content">
                <div class="nac-top-row">
                    <h3 class="nac-title">${c.title}</h3>
                    <div class="nac-badge ${badgeClass}">${badgeText}</div>
                </div>
                
                <div class="nac-mid-row">
                    <div class="nac-files">${filesHTML}</div>
                    
                    <div style="text-align: right;">
                        ${getRatingHTML(c)}
                        ${priceHTML}
                    </div>
                </div>

                <div class="nac-bottom-row" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    ${bottomBtnHTML}
                    ${(c.isOwned || isOwned) ? `<span onclick="openRatingModal(event, ${c.id}, '${c.title.replace(/'/g, "\\'")}')" style="color: #FFD700; font-size: 0.85rem; font-weight: 600; background: rgba(255, 215, 0, 0.1); padding: 5px 12px; border-radius: 20px; cursor: pointer; border: 1px solid rgba(255, 215, 0, 0.3); transition: 0.3s;"><i class="fas fa-star"></i> Rate</span>` : ''}
                </div>
            </div>
        </div>`;
        
    });
}

// ===============================
// RATING SYSTEM LOGIC
// ===============================

// Average rating calculate karne ka helper function
function getRatingHTML(course) {
    return "";
}

// ===============================
// DELETE ACCOUNT LOGIC
// ===============================
async function deleteUserAccount() {
    const warningMessage = "⚠️ WARNING: Are you sure you want to delete your account?\n\n" +
                           "- All your purchased courses will be PERMANENTLY LOST.\n" +
                           "- NO REFUNDS will be provided.\n" +
                           "- This action cannot be undone!\n\n" +
                           "Type 'DELETE' below to confirm:";
    
    const confirmation = await showPremiumModal("Danger Zone", warningMessage, "prompt");
    
    if (confirmation === "DELETE") {
        try {
            let users = JSON.parse(localStorage.getItem('users') || '[]');
            users = users.filter(u => u.username !== currentUser.username);
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.removeItem('activeUser');
            currentUser = null;
            
            await showPremiumModal("Success", "Your account has been permanently deleted.", "alert");
            window.location.reload(); 
        } catch (error) {
            alert("Something went wrong while deleting your account.");
        }
    } else if (confirmation !== null) {
        alert("Account deletion cancelled. You didn't type 'DELETE' correctly.");
    }
}

// ===============================
// PROFILE SETTINGS LOGIC (Updated: Only Name)
// ===============================
function saveProfileSettings() {
    const newNameInput = document.getElementById('editDisplayName');
    const newName = newNameInput.value.trim();

    if (newName === "") {
        alert("Display name cannot be empty.");
        return;
    }

    if (newName && currentUser) {
        // 1. Current user object mein naam update karo
        currentUser.name = newName;

        // 2. LocalStorage ke main 'users' list mein bhi update karo
        let users = JSON.parse(localStorage.getItem('users') || '[]');
        let userIndex = users.findIndex(u => u.username === currentUser.username);

        if (userIndex > -1) {
            users[userIndex].name = newName; // Sirf naam update kiya
            localStorage.setItem('users', JSON.stringify(users));
        }

        // 3. Active session ko bhi update karo
        localStorage.setItem('activeUser', JSON.stringify(currentUser));

        alert("Display Name Updated Successfully!");

        // 4. Top nav bar mein turant naya naam dikhao
        document.getElementById('userNameDisplay').innerText = currentUser.name;
    }
}
// ===============================
// PREMIUM CUSTOM MODAL ENGINE
// ===============================
let modalPromiseResolve = null;

function showPremiumModal(title, message, type = 'alert') {
    return new Promise((resolve) => {
        const modal = document.getElementById('premiumModal');
        const modalBox = document.getElementById('pmBox');
        
        document.getElementById('pmTitle').innerText = title;
        document.getElementById('pmMessage').innerText = message;
        
        const inputField = document.getElementById('pmInput');
        const cancelBtn = document.getElementById('pmCancelBtn');
        
        inputField.value = ''; // Reset input
        
        if (type === 'prompt') {
            inputField.classList.remove('hidden');
            cancelBtn.classList.remove('hidden');
            inputField.focus();
        } else if (type === 'confirm') {
            inputField.classList.add('hidden');
            cancelBtn.classList.remove('hidden');
        } else { // Alert
            inputField.classList.add('hidden');
            cancelBtn.classList.add('hidden');
        }
        
        modal.classList.remove('hidden');
        setTimeout(() => modalBox.style.transform = 'scale(1)', 10); // Pop-up animation
        
        modalPromiseResolve = resolve;
    });
}

function closePremiumModal(isConfirm) {
    const modal = document.getElementById('premiumModal');
    const modalBox = document.getElementById('pmBox');
    const inputField = document.getElementById('pmInput');
    const isPrompt = !inputField.classList.contains('hidden');
    
    modalBox.style.transform = 'scale(0.9)'; // Pop-out animation
    setTimeout(() => modal.classList.add('hidden'), 200);
    
    if (modalPromiseResolve) {
        if (isConfirm) {
            modalPromiseResolve(isPrompt ? inputField.value.trim() : true);
        } else {
            modalPromiseResolve(isPrompt ? null : false);
        }
        modalPromiseResolve = null;
    }
}

// 🚀 MAGIC: Override default system alert 🚀
window.alert = function(msg) {
    showPremiumModal("Notification", msg, "alert");
};
