const firebaseConfig = {
    apiKey: "AIzaSyDGFp1cwAm49vDXk34MFHmxNRegR9ck8W4",
    authDomain: "pax-learnify.firebaseapp.com",
    projectId: "pax-learnify",
    storageBucket: "pax-learnify.firebasestorage.app",
    messagingSenderId: "178172493463",
    appId: "1:178172493463:web:48c3d2f18587075a8133d2"
};  

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();

// Global State
let currentUser = null;
let currentOTP = null;
let tempRegisterData = {};
let activeCourseId = null;
let currentCaptchaAnswer = 0;

// Mock Admin Data
const ADMIN_EMAILS = ['paxlearnify@gmail.com'];
const ADMIN_PASS = 'Pax-Learnify';

// ===============================
// MISSING FUNCTION PLACEHOLDERS (To prevent ReferenceErrors)
// ===============================
function toggleEditMode() { console.log("Edit mode toggled"); }
function deleteFile(courseId, index) { console.log("Delete file clicked", courseId, index); }
function adminAddFiles() { console.log("Admin add files clicked"); }
function adminChangeBanner() { console.log("Admin change banner clicked"); }
function deleteCurrentCourse() { console.log("Delete course clicked"); }

// Expose modules to window
window.toggleSidebar = toggleSidebar;
window.navigate = navigate;
window.logout = logout;
window.handleLogin = handleLogin;
window.payWithRazorpay = payWithRazorpay;
window.saveProfileSettings = saveProfileSettings;
window.deleteUserAccount = deleteUserAccount;
window.closeDocumentReader = closeDocumentReader;
window.createCourse = createCourse;
window.togglePriceInput = togglePriceInput;
window.previewFiles = previewFiles;
window.addFilesToDraft = addFilesToDraft;
window.openCoursePlayer = openCoursePlayer;
window.toggleEditMode = toggleEditMode;
window.deleteFile = deleteFile;
window.adminAddFiles = adminAddFiles;
window.adminChangeBanner = adminChangeBanner;
window.deleteCurrentCourse = deleteCurrentCourse;
window.closePremiumModal = closePremiumModal;
window.verifyCaptchaAndCreate = verifyCaptchaAndCreate;
window.buyCourse = buyCourse;
window.renderUserDashboard = renderUserDashboard;
window.renderEarnings = renderEarnings;
window.updateAdminEarningsWidget = updateAdminEarningsWidget;

// ===============================
// INIT & AUTO-LOGIN 
// ===============================
document.addEventListener("DOMContentLoaded", () => {
    const savedUser = localStorage.getItem('activeUser');
    
    // Check agar user data exist karta hai aur valid hai
    if (savedUser && savedUser !== "undefined") {
        try {
            currentUser = JSON.parse(savedUser);
            document.getElementById('authScreen').classList.add('hidden');
            loadDashboard();
            
            // Last page redirect ya default dashboard
            const lastPage = localStorage.getItem('lastPage') || 'dashboard';
            navigate(lastPage);
        } catch (e) {
            console.error("Session fetch failed:", e);
            logout(); // Agar data corrupt ho toh safe logout
        }
    } else {
        document.getElementById('publicMenu').classList.remove('hidden');
        navigate('auth');
    }
});

// ===============================
// FIRESTORE LOGIN (FIXED)
// ===============================
async function handleLogin() {
    const input = document.getElementById('lUser').value.trim().toLowerCase();
    const pass = document.getElementById('lPass').value.trim();

    if (!input || !pass) {
        return showPremiumModal("Error", "Please enter both Username and Password", "alert");
    }

    if (ADMIN_EMAILS.includes(input) && pass === ADMIN_PASS) {
        currentUser = { name: "Administrator", role: "admin", email: input };
        loginSuccess();
        return;
    }

    try {
        const querySnapshot = await db.collection("users")
            .where("username", "==", input)
            .where("password", "==", pass)
            .get();

        if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            currentUser = { id: userDoc.id, ...userDoc.data() };
            loginSuccess();
        } else {
            showPremiumModal("Login Failed", "Invalid Username or Password", "alert");
        }
    } catch (error) {
        console.error("Login Error: ", error);
        showPremiumModal("Error", "Database Connection Error.", "alert");
    }
}

function loginSuccess() {
    localStorage.setItem('activeUser', JSON.stringify(currentUser));
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('publicMenu').classList.add('hidden'); // Menu Fix
    loadDashboard();
    navigate('dashboard');
}

function logout() {
    localStorage.removeItem('activeUser');
    localStorage.removeItem('lastPage');
    currentUser = null;
    loadPublicMenu();
    navigate('auth');
}

function loadDashboard() {
    document.getElementById('userNameDisplay').innerText = currentUser.name;
    document.getElementById('publicMenu').classList.add('hidden'); // Menu Fix
    
    if (currentUser.role === 'admin') {
        document.getElementById('adminMenu').classList.remove('hidden');
        document.getElementById('adminDash').classList.remove('hidden');
    } else {
        document.getElementById('userMenu').classList.remove('hidden');
        document.getElementById('userDash').classList.remove('hidden');
    }
}

function loadPublicMenu() {
    document.getElementById('publicMenu').classList.remove('hidden');
    document.getElementById('adminMenu').classList.add('hidden');
    document.getElementById('userMenu').classList.add('hidden');
}

// ===============================
// FIRESTORE COURSES
// ===============================
async function fetchCourses() {
    try {
        const querySnapshot = await db.collection("courses").get();
        let courses = [];
        querySnapshot.forEach((doc) => courses.push({ id: doc.id, ...doc.data() }));
        return courses;
    } catch (error) {
        console.error("Error fetching courses: ", error);
        return [];
    }
}

async function renderDashboard() {
    const slider = document.getElementById('verticalCourseSlider');
    slider.innerHTML = '<div style="color:#aaa; padding:10px;">Loading courses...</div>';
    
    const courses = await fetchCourses();
    slider.innerHTML = '';

    if (courses.length === 0) {
        slider.innerHTML = '<div style="color:#aaa; padding:10px;">No courses found. Create one!</div>';
        return;
    }

    courses.forEach(c => {
        const isFree = (c.type === 'free');
        const badgeClass = isFree ? 'free' : 'paid'; 
        const badgeText = isFree ? 'Free' : 'Paid';
        let filesHTML = c.files ? c.files.map(f => `<div class="nac-file-link">${f.type.includes('pdf') ? 'Doc' : 'Video'}</div>`).join('') : '';
        
        slider.innerHTML += `
        <div class="new-admin-card" onclick="openCoursePlayer('${c.id}')">
            <div class="nac-img-wrapper"><img src="${c.thumb}"></div>
            <div class="nac-content">
                <div class="nac-top-row">
                    <h3 class="nac-title">${c.title}</h3>
                    <div class="nac-badge ${badgeClass}">${badgeText}</div>
                </div>
                <div class="nac-mid-row"><div class="nac-files">${filesHTML}</div></div>
            </div>
        </div>`;
    });
}
async function renderManageCourses() {
    const list = document.getElementById('manageCourseList');
    list.innerHTML = '<div style="color:#aaa; padding:10px;">Loading Active Courses...</div>';
    const courses = await fetchCourses();
    
    if (courses.length === 0) {
        list.innerHTML = '<div style="color:#aaa; padding:10px; text-align:center;">No active courses found. Click "Create New Course" above to add one.</div>';
        return;
    }
    
    list.innerHTML = '';
    courses.forEach(c => {
        list.innerHTML += `
        <div class="wide-action-card" style="cursor:default; display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.03);">
            <div style="display:flex; align-items:center;">
                <img src="${c.thumb}" style="width:65px; height:65px; object-fit:cover; border-radius:12px; border: 1px solid var(--neon-blue); margin-right:15px;">
                <div>
                    <h3 style="margin:0; font-size:1.1rem; color:#fff;">${c.title}</h3>
                    <p style="margin:5px 0 0; font-size:0.85rem; color:#aaa;">₹${c.price} • ${c.type.toUpperCase()}</p>
                </div>
            </div>
            <div>
                <button onclick="deleteCourse('${c.id}')" style="background:rgba(255, 71, 87, 0.1); color:#ff4757; border:1px solid #ff4757; padding:10px 15px; border-radius:10px; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:8px;">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>`;
    });
}

async function deleteCourse(courseId) {
    const conf = await showPremiumModal("Confirm Action", "Are you sure you want to delete this course?", "confirm");
    if (conf) {
        showPremiumModal("Deleting...", "Removing course...", "alert");
        try {
            await db.collection("courses").doc(courseId).delete();
            closePremiumModal();
            renderManageCourses(); 
            showPremiumModal("Success", "Course deleted.", "alert");
        } catch (e) { 
            showPremiumModal("Error", "Failed to delete course.", "alert"); 
        }
    }
}

// ===============================
// FIRESTORE UPLOAD
// ===============================
function previewFiles(type) {
    if(type !== "thumb") return;
    const file = document.getElementById("cThumb").files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = e => document.getElementById("thumbPreviewText").innerHTML = `<img src="${e.target.result}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;">`;
    reader.readAsDataURL(file);
}

function addFilesToDraft() {
    const input = document.getElementById("cFiles");
    Array.from(input.files).forEach(f => {
        pendingCourseFiles.push(f);
    });
    renderDraftFiles();
    input.value = ""; 
    }

function renderDraftFiles() {
    const list = document.getElementById("draftFileList");
    list.innerHTML = "";
    pendingCourseFiles.forEach((f, index) => {
        list.innerHTML += `
        <div class="file-item-row" style="display:flex; justify-content:space-between; align-items:center;">
            <div class="file-info">
                <span class="file-name">${f.name}</span>
                <span class="file-type">${f.type}</span>
            </div>
            <button onclick="removeDraftFile(${index})" style="background:#ff4757; border:none; color:white; border-radius:50%; width:30px; height:30px; cursor:pointer;"><i class="fas fa-times"></i></button>
        </div>`;
    });
}

function removeDraftFile(index) {
    pendingCourseFiles.splice(index, 1);
    renderDraftFiles();
}

async function createCourse() {
    const title = document.getElementById('cTitle').value;
    if(!title) return showPremiumModal("Error","Title Required", "alert");

    if(pendingCourseFiles.length === 0 && !document.getElementById("cThumb").files[0]) {
        return showPremiumModal("Error","Please add at least one file or cover image.", "alert");
    }

    let totalCourseBytes = 0;
    for (let f of pendingCourseFiles) {
        totalCourseBytes += f.size;
    }
    const totalSizeFormatted = formatBytes(totalCourseBytes);

    showPremiumModal("Preparing Upload", "Connecting to server...", "progress");

    const thumbFile = document.getElementById("cThumb").files[0];
    let thumbUrl = "https://via.placeholder.com/800x450?text=Course";

    try {
        // 1. THUMBNAIL UPLOAD (Ab cover image ka bhi live progress aayega)
        if(thumbFile){
            await new Promise((resolve, reject) => {
                const thumbRef = storage.ref('thumbnails/' + Date.now() + '_' + thumbFile.name);
                const thumbTask = thumbRef.put(thumbFile);
                
                thumbTask.on('state_changed', 
                    (snapshot) => {
                        const prog = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        updateUploadProgress(prog * 0.1, `
                            <div style="display:flex; justify-content:space-between; margin-bottom: 8px; color:#fff;">
                                <span>Uploading Cover Image...</span>
                                <span>${prog}%</span>
                            </div>
                        `); 
                    },
                    (error) => reject(error),
                    async () => {
                        thumbUrl = await thumbTask.snapshot.ref.getDownloadURL();
                        resolve();
                    }
                );
            });
        }

        const newCourse = {
            title: title,
            desc: document.getElementById('cDesc').value,
            type: document.getElementById('cType').value,
            price: document.getElementById('cPrice').value || 0,
            thumb: thumbUrl,
            files: [],
            timestamp: Date.now()
        };

        let previousFilesBytes = 0;
        let startTime = Date.now();

        // 2. MAIN FILES UPLOAD (Video/PDF)
        for (let i = 0; i < pendingCourseFiles.length; i++) {
            let file = pendingCourseFiles[i];
            const fileRef = storage.ref('course_materials/' + Date.now() + '_' + file.name);

            await new Promise((resolve, reject) => {
                const uploadTask = fileRef.put(file);
                
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const currentFileTransferred = snapshot.bytesTransferred;
                        const totalTransferredSoFar = previousFilesBytes + currentFileTransferred;
                        
                        let overallPercent = 0;
                        if (totalCourseBytes > 0) {
                            overallPercent = Math.min(100, Math.round((totalTransferredSoFar / totalCourseBytes) * 100));
                        }

                        const elapsedTime = (Date.now() - startTime) / 1000;
                        const uploadSpeed = elapsedTime > 0 ? (totalTransferredSoFar / elapsedTime) : 0;
                        const remainingBytes = totalCourseBytes - totalTransferredSoFar;
                        const etaSeconds = uploadSpeed > 0 ? (remainingBytes / uploadSpeed) : 0;

                        const statusText = `
                            <div style="display:flex; justify-content:space-between; margin-bottom: 8px; color:#fff;">
                                <span>Uploading File ${i + 1} of ${pendingCourseFiles.length}</span>
                                <span>${overallPercent}%</span>
                            </div>
                            <div style="font-size: 0.8rem; color: #aaa; font-weight: 400; line-height: 1.5; text-align: left; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 8px;">
                                <i class="fas fa-file-alt" style="color:var(--neon-blue);"></i> ${file.name}<br>
                                <i class="fas fa-cloud-upload-alt" style="color:var(--neon-green);"></i> Size: ${formatBytes(totalTransferredSoFar)} / ${totalSizeFormatted} <br>
                                <i class="fas fa-clock" style="color:var(--neon-purple);"></i> Time Left: ~${formatTime(etaSeconds)}
                            </div>
                        `;
                        
                        updateUploadProgress(overallPercent, statusText);
                    },
                    (error) => reject(error),
                    async () => {
                        const fileUrl = await uploadTask.snapshot.ref.getDownloadURL();
                        newCourse.files.push({ name: file.name, type: file.type, url: fileUrl });
                        previousFilesBytes += file.size; 
                        resolve();
                    }
                );
            });
        }

        updateUploadProgress(100, "Finalizing & Saving... <i class='fas fa-spinner fa-spin'></i>");
        
        await db.collection("courses").add(newCourse);
        
        document.getElementById('cTitle').value = "";
        document.getElementById('cDesc').value = "";
        document.getElementById('cFiles').value = "";
        document.getElementById('cThumb').value = "";
        document.getElementById('thumbPreviewText').innerHTML = "Tap to select image";
        pendingCourseFiles = [];
        renderDraftFiles();
        
        closePremiumModal();
        navigate("manage-courses");
        showPremiumModal("Success 🎉", "Course has been published successfully!", "alert");

    } catch (error) {
        console.error("Upload Error Details: ", error);
        let errorMsg = "Upload failed. Check your internet connection.";
        // Yeh line Firebase error ko pakad kar bata degi ki problem kya hai
        if(error.code === 'storage/unauthorized') {
            errorMsg = "Firebase Rules block kar rahe hain. Please Step 1 follow karke rules change karein.";
        }
        closePremiumModal();
        showPremiumModal("Upload Failed ❌", errorMsg, "alert");
    }
}

function togglePriceInput() {
    const type = document.getElementById("cType").value;
    document.getElementById("priceInputContainer").style.display = type === "free" ? "none" : "block";
}

// ===============================
// FIRESTORE REAL USERS & REGISTRATION
// ===============================
async function fetchAndRenderUsers() {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    
    try {
        const querySnapshot = await db.collection("users").get();
        tbody.innerHTML = '';
        
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3">No users found.</td></tr>';
            return;
        }

        querySnapshot.forEach(doc => {
            const u = doc.data();
            const joinDate = u.timestamp ? new Date(u.timestamp).toLocaleDateString('en-IN') : 'N/A';
            tbody.innerHTML += `<tr><td>${u.name}</td><td>${u.username}</td><td>${u.role}</td></tr>`;
        });
        
        document.getElementById('totalUsersCount').innerText = querySnapshot.size;
    } catch(error) {
        console.error("Error fetching users: ", error);
        tbody.innerHTML = '<tr><td colspan="3">Error loading users.</td></tr>';
    }
}

function generateCaptcha(elementId) {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    currentCaptchaAnswer = num1 + num2;
    document.getElementById(elementId).innerText = `${num1} + ${num2} = ?`;
}

function verifyCaptchaAndCreate(flow) {
    const nameId = flow === 'admin' ? 'amName' : 'refName';
    const emailId = flow === 'admin' ? 'amEmail' : 'refEmail';
    const captchaId = flow === 'admin' ? 'amCaptchaInput' : 'refCaptchaInput';

    let name = document.getElementById(nameId).value.trim();
    let email = document.getElementById(emailId).value.trim();
    let userCaptcha = parseInt(document.getElementById(captchaId).value);

    if (!name || !email) return showPremiumModal("Error", "Name and Email are mandatory!", "alert");
    
    // Captcha Validation
    if (isNaN(userCaptcha) || userCaptcha !== currentCaptchaAnswer) {
        generateCaptcha(flow === 'admin' ? 'amCaptchaText' : 'refCaptchaText');
        document.getElementById(captchaId).value = ""; 
        return showPremiumModal("Security Check Failed", "Incorrect math answer. Please try again.", "alert");
    }

    tempRegisterData = { 
        name: name, 
        email: email, 
        role: 'user', 
        purchased: [],
        timestamp: Date.now()
    };

    if (flow === 'admin') {
        finalizeUserCreation('admin');
    } else {
        document.getElementById('refStep1').classList.add('hidden');
        document.getElementById('refStep3').classList.remove('hidden');
    }
}




function payWithRazorpay() {
    // Razorpay Integration Options
    var options = {
        "key": "rzp_test_YOUR_KEY_HERE", // Dhyan de: Yahan apna Razorpay Test ya Live Key daalein
        "amount": "49900", // Amount hamesha paise me hota hai (49900 paise = ₹499)
        "currency": "INR",
        "name": "Pax Learnify",
        "description": "Course Unlock Fee",
        "image": "https://uploads.onecompiler.io/4444s4cvz/44d69n6eu/1000014528.png", // Aapka logo
        "handler": async function (response) {
            // Yeh function TABHI chalega jab payment 100% SUCCESSFUL hogi
            showPremiumModal("Processing...", "Payment verified! Creating account...", "alert");
            
            try {
                // 1. Transaction ko database me real Payment ID ke sath save karein
                await db.collection("transactions").add({
                    email: tempRegisterData.email,
                    amount: 499,
                    paymentId: response.razorpay_payment_id,
                    status: "Success",
                    timestamp: Date.now()
                });
                
                // 2. Payment pakki ho gayi, ab account create kar do
                finalizeUserCreation('user');

            } catch (error) {
                console.error("Transaction Error: ", error);
                showPremiumModal("Error", "Payment successful, but failed to save record.", "alert");
            }
        },
        "prefill": {
            "name": tempRegisterData.name, // User ka naam auto-fill
            "email": tempRegisterData.email // User ka email auto-fill
        },
        "theme": {
            "color": "#8e2de2" // Modal ka color aapke theme ke hisaab se
        }
    };
    
    // Razorpay Modal Open karna
    var rzp1 = new Razorpay(options);
    
    // Agar user payment cancel kar de ya fail ho jaye
    rzp1.on('payment.failed', function (response){
        showPremiumModal("Payment Failed", "Reason: " + response.error.description, "alert");
    });
    
    rzp1.open();
}

async function finalizeUserCreation(flow) {
    const cleanName = tempRegisterData.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const genUser = cleanName + Math.floor(100 + Math.random() * 900);
    const genPass = Math.random().toString(36).slice(-8);

    tempRegisterData.username = genUser;
    tempRegisterData.password = genPass;

    showPremiumModal("Processing...", "Creating user profile...", "alert");

    try {
        await db.collection("users").add(tempRegisterData); 
        closePremiumModal();

        if (flow === 'admin') {
            document.getElementById('amStep1').classList.add('hidden');
            document.getElementById('amSuccess').classList.remove('hidden');
            document.getElementById('genUser').innerText = genUser;
            document.getElementById('genPass').innerText = genPass;
            
            document.getElementById('amName').value = ""; document.getElementById('amEmail').value = ""; document.getElementById('amCaptchaInput').value = "";
        } else {
            document.getElementById('refStep3').classList.add('hidden');
            document.getElementById('refSuccess').classList.remove('hidden');
            document.getElementById('refGenUser').innerText = genUser;
            document.getElementById('refGenPass').innerText = genPass;
        }
    } catch (e) {
        console.error("Firestore Write Error:", e);
        showPremiumModal("System Error", "Could not create user account. \nDetail: " + e.message, "alert");
    }
}

// ===============================
// PLAYER & RENDER LOGIC
// ===============================
async function openCoursePlayer(courseId) {
    activeCourseId = courseId;
    const courses = await fetchCourses();
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    // Security Check 
    if (!currentUser.purchased) currentUser.purchased = [];
    const isFree = course.type === 'free';
    const isPurchased = currentUser.purchased.includes(courseId);
    const isAdmin = currentUser.role === 'admin';

    if (!isFree && !isPurchased && !isAdmin) {
        // Agar course kharida nahi hai toh Razorpay Prompt kholo
        const wantToBuy = await showPremiumModal(
            "Course Locked 🔒", 
            `This is a Premium Course.\nYou need to purchase it for ₹${course.price} to unlock videos and PDFs.`, 
            "confirm"
        );
        if(wantToBuy) {
            buyCourse(course.id, course.price, course.title); // Trigger Razorpay
        }
        return; // Yahan se code ruk jayega, player nahi khulega
    }

    // --- Agar user ke paas access hai toh niche ka code chalega (Player Open) ---
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    document.getElementById('coursePlayerView').classList.remove('hidden');

    document.getElementById('playerTitle').innerText = course.title;
    document.getElementById('playerDesc').innerText = course.desc;
    document.getElementById('mainMediaContainer').innerHTML = `<img src="${course.thumb}" style="width:100%;height:100%;object-fit:cover;">`;

    renderFiles(course);

    document.getElementById('adminToolbar').classList.add('hidden');
    if (currentUser && currentUser.role === 'admin') {
        document.getElementById('editToggleSection').classList.remove('hidden');
        document.getElementById('editModeToggle').checked = false;
        document.getElementById("playerDesc").contentEditable = false;
    } else {
        document.getElementById('editToggleSection').classList.add('hidden');
    }
}

function buyCourse(courseId, price, title) {
    var amountInPaise = parseInt(price) * 100; // ₹499 ko 49900 banata hai
    
    var options = {
        "key": "rzp_test_YOUR_KEY_HERE", // IMPORTANT: Yahan apna Razorpay Key daalein
        "amount": amountInPaise.toString(), 
        "currency": "INR",
        "name": "Pax Learnify",
        "description": "Unlock Course: " + title,
        "image": "https://uploads.onecompiler.io/4444s4cvz/44d69n6eu/1000014528.png",
        "handler": async function (response) {
            showPremiumModal("Processing...", "Payment verified! Unlocking your course...", "alert");
            
            try {
                // 1. Transaction Firebase me Save karna
                await db.collection("transactions").add({
                    userId: currentUser.id,
                    email: currentUser.email || 'N/A',
                    courseId: courseId,
                    courseTitle: title,
                    amount: price,
                    paymentId: response.razorpay_payment_id,
                    timestamp: Date.now()
                });

                // 2. User ki profile me Course thappa lagana
                if(!currentUser.purchased) currentUser.purchased = [];
                currentUser.purchased.push(courseId);

                await db.collection("users").doc(currentUser.id).update({
                    purchased: currentUser.purchased
                });

                // Local storage update
                localStorage.setItem('activeUser', JSON.stringify(currentUser));
                
                closePremiumModal();
                showPremiumModal("Success 🎉", "Course Unlocked! You can now access all contents.", "alert");
                
                // 3. Dashboard refresh aur course open karna
                renderUserDashboard();
                openCoursePlayer(courseId);

            } catch (error) {
                console.error("Purchase Error: ", error);
                showPremiumModal("Error", "Payment done but database error. Contact Support.", "alert");
            }
        },
        "prefill": {
            "name": currentUser.name,
            "email": currentUser.email || ""
        },
        "theme": {
            "color": "#8e2de2"
        }
    };
    
    var rzp1 = new Razorpay(options);
    rzp1.on('payment.failed', function (response){
        showPremiumModal("Payment Failed", "Reason: " + response.error.description, "alert");
    });
    rzp1.open();
}


function renderFiles(course) {
    const list = document.getElementById("playerFileList");
    list.innerHTML = "";
    if (course.files) {
        course.files.forEach((file, index) => {
            const iconClass = file.type.includes('pdf') ? 'fa-file-pdf' : 'fa-play-circle';
            list.innerHTML += `
            <div class="file-item">
                <span onclick="openFile('${file.url}','${file.type}', '${file.name}')" style="cursor:pointer; color: var(--neon-purple); display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${iconClass}"></i> ${file.name}
                </span>
                <button class="file-delete-btn hidden" onclick="deleteFile('${course.id}', ${index})"><i class="fas fa-trash"></i></button>
            </div>`;
        });
    }
}

async function openFile(url, type, fileName) {
    if(type.includes("pdf")) {
        document.getElementById('documentReaderView').classList.remove('hidden');
        document.getElementById('readerDocTitle').innerText = fileName;
        const container = document.getElementById('pdfRenderer');
        container.innerHTML = 'Loading Document...';
        
        try {
            let pdf = await pdfjsLib.getDocument(url).promise;
            container.innerHTML = '';
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const unscaledViewport = page.getViewport({ scale: 1.0 });
                const scale = (container.clientWidth - 20) / unscaledViewport.width;
                const finalScale = scale > 1.5 ? 1.5 : scale;
                const viewport = page.getViewport({ scale: finalScale });
                
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.style.display = "block";
                canvas.style.margin = "15px auto";
                container.appendChild(canvas);

                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            }
        } catch (e) {
            container.innerHTML = 'Error loading document.';
        }
    } else if(type.includes("video")) {
        document.getElementById("mainMediaContainer").innerHTML = `<video src="${url}" controls autoplay controlsList="nodownload" style="width:100%; height:100%; background:#000;"></video>`;
    }
}

function closeDocumentReader() {
    document.getElementById('documentReaderView').classList.add('hidden');
    document.getElementById('pdfRenderer').innerHTML = '';
}

// Settings & Delete Account
async function saveProfileSettings() {
    const newName = document.getElementById('editDisplayName').value.trim();
    if (!newName) return;

    if (currentUser && currentUser.id) {
        try {
            await db.collection("users").doc(currentUser.id).update({ name: newName });
            
            currentUser.name = newName;
            localStorage.setItem('activeUser', JSON.stringify(currentUser));
            document.getElementById('userNameDisplay').innerText = newName;
            showPremiumModal("Success", "Name Updated", "alert");
        } catch(error) {
             console.error("Update Error: ", error);
             showPremiumModal("Error", "Could not update profile.", "alert");
        }
    }
}

async function deleteUserAccount() {
    const isConf = await showPremiumModal("Danger Zone", "Type 'DELETE' to confirm Account Deletion", "prompt");
    if (isConf === "DELETE") {
        if(currentUser && currentUser.id) {
            try {
                await db.collection("users").doc(currentUser.id).delete();
                logout();
            } catch(error) {
                console.error("Delete Error: ", error);
                showPremiumModal("Error", "Could not delete account.", "alert");
            }
        } else {
             logout();
        }
    }
}

// Utility Navigation
function navigate(viewName) {
    if (!currentUser && viewName !== 'auth' && viewName !== 'about') {
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
        document.getElementById('authScreen').classList.remove('hidden');
        return;
    }
    if (viewName !== 'auth') localStorage.setItem('lastPage', viewName);
    
    document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
    closeSidebar();

    switch(viewName) {
        case 'auth': document.getElementById('authScreen').classList.remove('hidden'); break;
        case 'dashboard': 
            if (currentUser.role === 'admin') {
                document.getElementById('adminDash').classList.remove('hidden');
                renderDashboard();
            } else {
                document.getElementById('userDash').classList.remove('hidden');
                renderUserDashboard();
            }
            break;
                case 'manage-courses': 
            document.getElementById('manageCoursesView').classList.remove('hidden');
            renderManageCourses(); // Call this to load courses list
            break;
        case 'add-member': 
            document.getElementById('addMemberView').classList.remove('hidden'); 
            document.getElementById('amStep1').classList.remove('hidden');
            document.getElementById('amSuccess').classList.add('hidden');
            generateCaptcha('amCaptchaText'); // Generate math problem
            break;
        case 'referrals': 
            document.getElementById('userReferralsView').classList.remove('hidden'); 
            document.getElementById('refStep1').classList.remove('hidden');
            document.getElementById('refStep3').classList.add('hidden');
            document.getElementById('refSuccess').classList.add('hidden');
            generateCaptcha('refCaptchaText'); // Generate math problem
            break;

        case 'users-list': 
            document.getElementById('usersListView').classList.remove('hidden');
            fetchAndRenderUsers();
            break;
        case 'add-course': document.getElementById('addCourseView').classList.remove('hidden'); break;
        case 'add-member': document.getElementById('addMemberView').classList.remove('hidden'); break;
        case 'store': document.getElementById('userStoreView').classList.remove('hidden'); 
            renderUserDashboard();
            break;
        case 'settings': document.getElementById('userSettingsView').classList.remove('hidden'); break;
        case 'referrals': document.getElementById('userReferralsView').classList.remove('hidden'); break;
        case 'earnings': 
            document.getElementById('earningsView').classList.remove('hidden');
            renderEarnings();
            break;
        case 'about': document.getElementById('aboutView').classList.remove('hidden'); break;
    }
}

function toggleSidebar() {
    document.getElementById("mySidebar").classList.toggle("active");
    document.getElementById("sidebarOverlay").style.display = document.getElementById("mySidebar").classList.contains("active") ? "block" : "none";
}
function closeSidebar() {
    document.getElementById("mySidebar").classList.remove("active");
    document.getElementById("sidebarOverlay").style.display = "none";
}

// Modal handling
let pendingCourseFiles = []; 
window.removeDraftFile = removeDraftFile;

function showPremiumModal(title, message, type = 'alert') {
    return new Promise((resolve) => {
        document.getElementById('pmTitle').innerText = title;
        document.getElementById('pmMessage').innerText = message;
        
        const inputField = document.getElementById('pmInput');
        const cancelBtn = document.getElementById('pmCancelBtn');
        const confirmBtn = document.getElementById('pmConfirmBtn');
        const progContainer = document.getElementById('pmProgressContainer');
        const progText = document.getElementById('pmProgressText');
        
        inputField.value = ''; 
        inputField.classList.add('hidden');
        cancelBtn.classList.add('hidden');
        progContainer.classList.add('hidden');
        progText.classList.add('hidden');
        confirmBtn.classList.remove('hidden');
        
        if (type === 'prompt') { inputField.classList.remove('hidden'); cancelBtn.classList.remove('hidden'); }
        else if (type === 'confirm') { cancelBtn.classList.remove('hidden'); }
        else if (type === 'progress') { 
            confirmBtn.classList.add('hidden'); // OK button hide kardo taki upload cancel na ho sake
            progContainer.classList.remove('hidden');
            progText.classList.remove('hidden');
            document.getElementById('pmProgressBar').style.width = '0%';
            progText.innerText = '0%';
        }
        
        document.getElementById('premiumModal').classList.remove('hidden');
        modalPromiseResolve = resolve;
    });
}

// Bytes ko KB, MB, GB me convert karne ke liye
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Seconds ko Min aur Sec me convert karne ke liye
function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "Calculating...";
    if (seconds < 60) return Math.round(seconds) + " sec";
    const min = Math.floor(seconds / 60);
    const sec = Math.round(seconds % 60);
    return min + " min " + sec + " sec";
}

// Progress Text ko HTML ke sath update karne ke liye modified function
function updateUploadProgress(percent, htmlText) {
    document.getElementById('pmProgressBar').style.width = percent + '%';
    if(htmlText) {
        document.getElementById('pmProgressText').innerHTML = htmlText;
    }
}

function closePremiumModal(isConfirm) {
    document.getElementById('premiumModal').classList.add('hidden');
    if (modalPromiseResolve) {
        const inputField = document.getElementById('pmInput');
        const isPrompt = !inputField.classList.contains('hidden');
        modalPromiseResolve(isConfirm ? (isPrompt ? inputField.value.trim() : true) : (isPrompt ? null : false));
        modalPromiseResolve = null;
    }
}

// ===============================
// USER DASHBOARD & STORE RENDER
// ===============================
async function renderUserDashboard() {
    const unlockedContainer = document.getElementById('userUnlockedCourses');
    const lockedContainer = document.getElementById('userLockedCourses');
    const storeContainer = document.getElementById('storeAllCourses');
    
    unlockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">Loading...</div>';
    lockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">Loading...</div>';
    storeContainer.innerHTML = '<div style="color:#aaa; padding:10px;">Loading...</div>';

    const courses = await fetchCourses();
    unlockedContainer.innerHTML = '';
    lockedContainer.innerHTML = '';
    storeContainer.innerHTML = '';

    let hasUnlocked = false;
    let hasLocked = false;

        if (!currentUser.purchased) currentUser.purchased = [];

    courses.forEach(c => {
        const isFree = (c.type === 'free');
        const isPurchased = currentUser.purchased.includes(c.id);
        const hasAccess = isFree || isPurchased || currentUser.role === 'admin';
        
        const cardHTML = `
        <div class="new-admin-card" onclick="openCoursePlayer('${c.id}')">
            <div class="nac-img-wrapper"><img src="${c.thumb}"></div>
            <div class="nac-content">
                <div class="nac-top-row">
                    <h3 class="nac-title">${c.title}</h3>
                    <div class="nac-badge ${isFree ? 'free' : 'paid'}">${isFree ? 'Free' : '₹' + c.price}</div>
                </div>
                <div class="nac-bottom-row" style="margin-top: 15px;">
                    ${hasAccess 
                        ? `<button class="nac-active-btn" style="width:100%; border-radius:10px;">Play Course <i class="fas fa-play"></i></button>`
                        : `<button class="btn-glow" style="margin:0; padding:10px; font-size:0.9rem; border-radius:10px;">Buy to Unlock</button>`
                    }
                </div>
            </div>
        </div>`;

        if (hasAccess) {
            unlockedContainer.innerHTML += cardHTML;
            hasUnlocked = true;
        } else {
            lockedContainer.innerHTML += cardHTML;
            storeContainer.innerHTML += cardHTML; 
            hasLocked = true;
        }
    });

    if (!hasUnlocked) unlockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">No unlocked courses yet. Explore below!</div>';
    if (!hasLocked) {
        lockedContainer.innerHTML = '<div style="color:#aaa; padding:10px;">You have unlocked all available courses!</div>';
        storeContainer.innerHTML = '<div style="color:#aaa; padding:10px;">Store is empty. You own everything!</div>';
    }
}

// Function to show earnings inside the Admin Transactions Table
async function renderEarnings() {
    const tbody = document.querySelector('#txnTable tbody');
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#aaa;">Loading Transactions...</td></tr>';
    
    try {
        // Firebase se sari transactions fetch kar rahe hain
        const snapshot = await db.collection("transactions").orderBy("timestamp", "desc").get();
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#aaa;">No transactions yet.</td></tr>';
            return;
        }

        let totalEarnings = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            const amt = Number(data.amount || 0);
            totalEarnings += amt;
            
            const date = new Date(data.timestamp).toLocaleDateString();
            const userStr = data.email || 'User';
            const itemStr = data.courseTitle || 'Unlock / Reg';
            
            tbody.innerHTML += `<tr>
                <td><span style="font-size:0.85rem; color:#fff;">${userStr}</span><br><span style="font-size:0.7rem; color:#aaa;">${date}</span></td>
                <td><span style="font-size:0.85rem;">${itemStr}</span></td>
                <td style="color:#00ff41; font-weight:bold;">₹${amt}</td>
            </tr>`;
        });
        
        // Update the dashboard widget as well
        document.getElementById('adEarnings').innerText = totalEarnings;

    } catch (error) {
        console.error("Error fetching transactions: ", error);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#ff4757;">Error loading earnings.</td></tr>';
    }
}

// Function to update the number on the main Admin Dashboard
async function updateAdminEarningsWidget() {
    try {
        const snapshot = await db.collection("transactions").get();
        let total = 0;
        snapshot.forEach(doc => {
            total += Number(doc.data().amount || 0);
        });
        document.getElementById('adEarnings').innerText = total;
    } catch (error) {
        console.error("Error fetching total earnings:", error);
    }
}
